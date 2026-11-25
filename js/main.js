/* Galería Camila Pérez · recorrido, linterna, cursor y visor.
 * Requiere js/data.js (OBRAS, SALAS, WHATSAPP, INSTAGRAM).
 * GSAP + ScrollTrigger son opcionales: sin ellos la galería se ve en vertical.
 */
(function () {
  'use strict';

  const html = document.documentElement;
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finoMQ = window.matchMedia('(pointer: fine)');
  // Móvil y táctil estrecho (también apaisado): carrusel de scroll nativo, sin GSAP
  const movilMQ = window.matchMedia('(max-width: 799px), (pointer: coarse) and (max-height: 500px)');
  const movil = () => movilMQ.matches;
  // Horizontal (GSAP) solo en escritorio y con movimiento permitido
  const horizontalMQ = window.matchMedia('(min-width: 800px) and (prefers-reduced-motion: no-preference)');

  const tieneGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (tieneGSAP) gsap.registerPlugin(ScrollTrigger);

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const TOTAL = OBRAS.length;
  const pad = n => String(n).padStart(2, '0');
  const escapar = t => String(t ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);

  // Profundidad de cada cuadro: distinta velocidad en el recorrido horizontal.
  // Son fracciones pequeñas de la distancia total (miles de px), así que el desfase real es de decenas de px.
  // Altura de cada cuadro respecto al centro (-1 arriba, 1 abajo): colgado irregular
  const ALTURAS = [-.7, .8, -.1, -1, .45, 1, -.45, .15, .9, -.85, .6];
  const PROFUNDIDADES = [0, 0.0015, 0.003, 0.001];

  // Lee "40 × 30" de las medidas. El orden (alto o ancho) no está claro en el portafolio,
  // así que solo se usa la dimensión mayor para el tamaño; la proporción real sale de la imagen.
  // Sin medidas, cm es un tamaño medio.
  function dimensiones(medidas) {
    const m = /(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i.exec(medidas || '');
    if (!m) return { w: 1, h: 1, cm: 36 };
    const a = parseFloat(m[1].replace(',', '.'));
    const b = parseFloat(m[2].replace(',', '.'));
    return { w: a, h: b, cm: Math.max(a, b) };
  }

  const elObras = new Array(TOTAL);   // elemento .obra por índice de OBRAS
  let tlHorizontal = null;            // timeline con ScrollTrigger (modo horizontal)
  let tickerHorizontal = null;        // actualización por frame mientras dura el scrub
  let io = null;                      // IntersectionObserver (modo vertical)
  let pendiente = false;              // hay una actualización de estados en cola
  let centrado = -1;                  // índice de la obra centrada (la que ilumina la linterna)

  /* ---------------------------------------------------------------
     1. Render de salas y obras desde data.js
     --------------------------------------------------------------- */
  function construirSalas() {
    const pista = $('#pista');
    const contacto = $('#contacto');
    const frag = document.createDocumentFragment();

    SALAS.forEach((sala, si) => {
      const sec = document.createElement('section');
      sec.className = 'sala';
      sec.id = 'sala-' + sala.id;
      sec.dataset.sala = sala.id;
      sec.setAttribute('aria-labelledby', 'titulo-' + sala.id);
      sec.innerHTML = `
        <header class="sala-cabecera">
          <h2 class="sala-titulo" id="titulo-${sala.id}" tabindex="-1">${escapar(sala.nombre)}</h2>
          <p class="sala-sub">${escapar(sala.sub)}</p>
        </header>
        <div class="sala-obras"></div>`;
      const contenedor = $('.sala-obras', sec);

      OBRAS.forEach((obra, gi) => {
        if (obra.sala !== sala.id) return;
        const d = dimensiones(obra.medidas);
        const art = document.createElement('article');
        art.className = 'obra';
        art.dataset.depth = PROFUNDIDADES[gi % PROFUNDIDADES.length];
        art.style.setProperty('--alt', ALTURAS[gi % ALTURAS.length]);
        art.innerHTML = `
          <div class="obra-marco" style="--cm:${d.cm}">
            <button class="obra-btn" type="button" aria-label="Ver en grande: ${escapar(obra.titulo)}">
              <img src="${escapar(obra.img)}" alt="${escapar(obra.alt)}" loading="lazy" decoding="async"
                   width="${Math.round(d.w * 100)}" height="${Math.round(d.h * 100)}">
            </button>
          </div>
          <div class="cedula">
            <p class="cedula-num">${pad(gi + 1)}</p>
            <h3 class="cedula-titulo">${escapar(obra.titulo)}</h3>
            <p class="cedula-tecnica">${escapar(obra.tecnica)}</p>
            ${obra.medidas ? `<p class="cedula-medidas">${escapar(obra.medidas)}</p>` : ''}
            ${obra.nota ? `<p class="cedula-nota">${escapar(obra.nota)}</p>` : ''}
          </div>`;

        art.querySelector('.obra-btn').addEventListener('click', e => {
          abrirVisor(gi, e.currentTarget);
        });
        // Al cargar una imagen puede cambiar el ancho real: se recalcula el recorrido
        art.querySelector('img').addEventListener('load', refrescarDiferido);
        elObras[gi] = art;
        contenedor.appendChild(art);
      });

      // Easter egg: el escarabajo (logo) escondido en cada sala lleva al Instagram
      const bicho = document.createElement('a');
      bicho.className = 'bicho';
      bicho.href = INSTAGRAM;
      bicho.target = '_blank';
      bicho.rel = 'noopener';
      bicho.setAttribute('aria-label', '¡Encontraste el escarabajo! Visitar el Instagram de la artista');
      bicho.innerHTML = '<span class="bicho-cuerpo"></span><span class="bicho-aviso" aria-hidden="true">¡Me encontraste!</span>';
      sec.appendChild(bicho);
      pasear(bicho, sec);

      // Umbral (puerta) antes de cada sala, con su rótulo «Sala I», «Sala II»…
      const umbral = document.createElement('div');
      umbral.className = 'umbral';
      umbral.dataset.sala = sala.id;
      umbral.setAttribute('aria-hidden', 'true');
      umbral.innerHTML = `<span class="umbral-rotulo">Sala ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][si] || si + 1}</span>`;
      frag.appendChild(umbral);
      frag.appendChild(sec);
    });

    // Las salas van antes de la sala de contacto, que es la última del recorrido
    pista.insertBefore(frag, contacto);
  }

  let refrescoTimer = null;
  function refrescarDiferido() {
    if (!tieneGSAP || !tlHorizontal) return;
    clearTimeout(refrescoTimer);
    refrescoTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
  }

  /* El escarabajo corre por la pared entre puntos al azar de lo que se ve de su sala:
     alterna esconderse debajo de un cuadro (va por detrás) y salir a campo abierto. */
  const ESCARABAJO = { velMin: 180, velMax: 460, pausaMax: 900 };   // px/s y ms
  function pasear(bicho, sec) {
    const cuerpo = bicho.firstElementChild;
    const azar = (a, b) => a + Math.random() * Math.max(0, b - a);
    let esconder = true;
    let giro = 0;
    let quieto = false;
    let anim = null;
    // Al pillarlo (cursor, foco o dedo) se detiene para poder tocarlo
    const parar = v => () => { quieto = v; if (anim) { if (v) anim.pause(); else anim.play(); } };
    ['pointerenter', 'pointerdown', 'focus'].forEach(ev => bicho.addEventListener(ev, parar(true)));
    ['pointerleave', 'pointercancel', 'blur'].forEach(ev => bicho.addEventListener(ev, parar(false)));

    bicho.addEventListener('click', () => { parar(false)(); bicho.blur(); });

    const paso = () => {
      const s = sec.getBoundingClientRect();
      const x0 = Math.max(s.left, 0);
      const x1 = Math.min(s.right, window.innerWidth);
      // Fuera de pantalla, quieto o con movimiento reducido: se vuelve a mirar en un momento
      if (reduceMQ.matches || quieto || document.hidden || x1 - x0 < 120 || html.classList.contains('visor-abierto')) {
        setTimeout(paso, 500);
        return;
      }
      const tam = bicho.offsetWidth;
      const a = bicho.getBoundingClientRect();
      let destino = null;
      if (esconder) {
        const marcos = $$('.obra-marco', sec).map(m => m.getBoundingClientRect())
          .filter(r => r.left + r.width / 2 > x0 && r.left + r.width / 2 < x1);
        const r = marcos[Math.floor(Math.random() * marcos.length)];
        if (r) destino = { x: r.left + azar(r.width * .25, r.width * .75), y: r.top + azar(r.height * .3, r.height * .85) };
      }
      if (!destino) {
        // A campo abierto: casi siempre el suelo o la parte baja de la pared
        const alto = Math.min(s.bottom, window.innerHeight);
        destino = { x: azar(x0 + tam, x1 - tam), y: azar(s.top + (alto - s.top) * (Math.random() < .25 ? .15 : .78), alto - tam / 2) };
      }
      esconder = !esconder;
      const dx = destino.x - (a.left + a.width / 2);
      const dy = destino.y - (a.top + a.height / 2);
      const desde = { left: bicho.offsetLeft + 'px', top: bicho.offsetTop + 'px' };
      const hasta = { left: bicho.offsetLeft + dx + 'px', top: bicho.offsetTop + dy + 'px' };
      // La cabeza apunta hacia donde corre, girando por el camino corto
      const rumbo = Math.atan2(dy, dx) * 180 / Math.PI + 130;
      giro += ((rumbo - giro) % 360 + 540) % 360 - 180;
      cuerpo.style.rotate = giro + 'deg';
      const ms = Math.max(250, Math.hypot(dx, dy) / azar(ESCARABAJO.velMin, ESCARABAJO.velMax) * 1000);
      Object.assign(bicho.style, hasta, { bottom: 'auto' });
      anim = bicho.animate([desde, hasta], { duration: ms, easing: 'cubic-bezier(.45, .05, .35, 1)' });
      anim.onfinish = () => setTimeout(paso, azar(120, ESCARABAJO.pausaMax));
    };
    setTimeout(paso, azar(300, 1500));
  }

  function construirIndice() {
    const nav = $('#indice');
    const items = SALAS.map(s =>
      `<button class="indice-item" type="button" data-destino="sala-${escapar(s.id)}">${escapar(s.nombre)}</button>`
    );
    items.push('<button class="indice-item" type="button" data-destino="contacto">CONTACTO</button>');
    nav.innerHTML = items.join('');
    nav.addEventListener('click', e => {
      const b = e.target.closest('[data-destino]');
      if (b) irA(b.dataset.destino);
    });
    $('#contador').textContent = `00 / ${pad(TOTAL)}`;
  }

  /* ---------------------------------------------------------------
     2. Portada: la crema se abre como cortina hacia la sala oscura
     --------------------------------------------------------------- */
  function iniciarEntrada() {
    const entrada = $('#entrada');
    const btn = $('#btn-entrar');
    html.classList.add('entrada-activa');
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    const fin = () => {
      entrada.hidden = true;
      html.classList.remove('entrada-activa');
      programarActualizacion(); // quita en-portada sin esperar al primer deslizamiento
      if (tieneGSAP) ScrollTrigger.refresh();
      // La visita empieza siempre en la primera sala, aunque se haya recargado a medio recorrido
      window.scrollTo(0, 0);
      $('#pista').scrollLeft = 0;
      $('#galeria').focus({ preventScroll: true });
    };

    btn.addEventListener('click', () => {
      if (entrada.dataset.saliendo) return;
      entrada.dataset.saliendo = '1';
      if (!tieneGSAP || reduceMQ.matches) { fin(); return; }
      gsap.timeline({ onComplete: fin })
        .to(entrada.querySelector('.entrada-contenido'), { opacity: 0, y: -30, duration: 0.6, ease: 'power2.in' }, 0)
        // Dos mitades que se retiran hacia los costados: la cortina se abre
        .to(entrada, { clipPath: 'inset(0% 50% 0% 50%)', duration: 1.4, ease: 'power3.inOut' }, 0.1);
    });
  }

  /* ---------------------------------------------------------------
     3. Modos: horizontal (GSAP pin) o vertical (revelado al hacer scroll)
     --------------------------------------------------------------- */
  // offsetWidth (ancho de layout) y no scrollWidth: los transforms de parallax
  // cambian el scrollWidth mientras se recorre y desajustarían el final.
  const distanciaHorizontal = () => Math.max(0, $('#pista').offsetWidth - window.innerWidth);

  function montarHorizontal() {
    const galeria = $('#galeria');
    const pista = $('#pista');
    const capa = $('.capa-fondo');

    // El scrub de ScrollTrigger va con retraso: se actualiza estados por frame mientras dure
    tickerHorizontal = actualizarEstados;
    gsap.ticker.add(tickerHorizontal);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: galeria,
        start: 'top top',
        end: () => '+=' + distanciaHorizontal(),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefresh: programarActualizacion,
      },
    });

    // Scroll vertical -> desplazamiento horizontal de las salas
    tl.to(pista, { x: () => -distanciaHorizontal(), ease: 'none' }, 0);
    // Fondo con el escarabajo repetido: se desplaza más lento que las salas (parallax).
    // Se mueve la posición del fondo, así la textura se repite sin salirse de la pantalla.
    if (capa) tl.to(capa, { backgroundPositionX: () => (-distanciaHorizontal() * 0.35) + 'px', ease: 'none' }, 0);
    // Cuadros a distinta velocidad según su profundidad
    elObras.forEach(el => {
      const k = parseFloat(el.dataset.depth) || 0;
      if (k) tl.to(el, { x: () => -distanciaHorizontal() * k, ease: 'none' }, 0);
    });

    return tl;
  }

  function montarVertical() {
    html.classList.add('modo-vertical');
    // Sin IntersectionObserver o con movimiento reducido: todo visible de entrada
    if (reduceMQ.matches || !('IntersectionObserver' in window)) {
      elObras.forEach(el => el.classList.add('visible'));
      return;
    }
    io = new IntersectionObserver(entradas => {
      entradas.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('visible');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    elObras.forEach(el => io.observe(el));
  }

  function aplicarModo() {
    // Limpia el modo anterior
    if (tlHorizontal) { tlHorizontal.kill(); tlHorizontal = null; }
    if (tieneGSAP) ScrollTrigger.getAll().forEach(t => t.kill(true));
    if (tickerHorizontal) { gsap.ticker.remove(tickerHorizontal); tickerHorizontal = null; }
    if (io) { io.disconnect(); io = null; }
    html.classList.remove('modo-horizontal', 'modo-vertical', 'modo-carrusel');
    html.classList.toggle('modo-carrusel', movil());
    if (tieneGSAP) {
      gsap.set([$('#pista'), $('.capa-fondo'), ...elObras].filter(Boolean), { clearProps: 'transform,backgroundPosition' });
    }

    if (tieneGSAP && horizontalMQ.matches && !movil()) {
      html.classList.add('modo-horizontal');
      tlHorizontal = montarHorizontal();
      ScrollTrigger.refresh();
    } else {
      montarVertical();
    }
    programarActualizacion();
  }

  /* ---------------------------------------------------------------
     4. Estado por frame: cuadro centrado, contador, sala activa, progreso
     --------------------------------------------------------------- */
  function programarActualizacion() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      actualizarEstados();
    });
  }

  function actualizarEstados() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const carrusel = html.classList.contains('modo-carrusel');
    const esH = carrusel || html.classList.contains('modo-horizontal');
    let mejor = -1;
    let mejorC = Infinity;

    elObras.forEach((el, i) => {
      if (!el) return;
      const marco = el.querySelector('.obra-marco');
      const r = marco.getBoundingClientRect();
      // c: 0 en el centro de la pantalla, 1 en los bordes (solo eje horizontal en modo horizontal)
      const d = esH
        ? Math.abs(r.left + r.width / 2 - vw / 2) / (vw / 2)
        : Math.abs(r.top + r.height / 2 - vh / 2) / (vh / 2);
      if (esH) marco.style.setProperty('--c', Math.min(1, d).toFixed(3));
      // Sin recortar: en un rótulo de sala gana la obra más cercana, no la primera
      if (r.width > 0 && d < mejorC) { mejorC = d; mejor = i; }
    });

    if (mejor >= 0) {
      $('#contador').textContent = `${pad(mejor + 1)} / ${pad(TOTAL)}`;
      const salaId = elObras[mejor].closest('.sala').dataset.sala;
      $$('.indice-item').forEach(b => {
        if (b.dataset.destino === 'sala-' + salaId) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
    }

    // La linterna se apaga al llegar a la sala de contacto (crema)
    const rc = $('#contacto').getBoundingClientRect();
    html.classList.toggle('en-contacto', esH ? rc.left < vw * 0.5 : rc.top < vh * 0.5);
    html.classList.toggle('en-portada', $('#entrada').getBoundingClientRect().bottom > vh * 0.5);

    // Cabecera e índice cambian de color según la sala del cuadro centrado (no en contacto)
    centrado = mejor;
    const enContacto = html.classList.contains('en-contacto');
    let salaActual;
    if (carrusel) {
      // Carrusel: la sala es la que ocupa el centro de la pantalla (también en su rótulo)
      const pista = $('#pista');
      const sala = $$('.sala', pista).find(s => { const r = s.getBoundingClientRect(); return r.left <= vw / 2 && r.right > vw / 2; });
      salaActual = sala && !enContacto ? sala.dataset.sala : undefined;
      $$('.indice-item').forEach(b => {
        const activo = b.dataset.destino === 'sala-' + salaActual || (enContacto && b.dataset.destino === 'contacto');
        if (activo) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
    } else {
      salaActual = mejor >= 0 && !enContacto ? elObras[mejor].closest('.sala').dataset.sala : undefined;
    }
    if (salaActual) { if (html.dataset.salaActiva !== salaActual) html.dataset.salaActiva = salaActual; }
    else if ('salaActiva' in html.dataset) delete html.dataset.salaActiva;

    // Progreso: en el carrusel, el avance de la pista; en el resto, el scroll de la página
    const pistaEl = $('#pista');
    const recorrido = carrusel ? pistaEl.scrollWidth - pistaEl.clientWidth : document.documentElement.scrollHeight - vh;
    const avance = carrusel ? pistaEl.scrollLeft : window.scrollY;
    const p = recorrido > 0 ? Math.min(1, Math.max(0, avance / recorrido)) : 0;
    $('#progreso-barra').style.transform = `scaleX(${p})`;
  }

  // Navegación del índice: en el carrusel centra la sala (su rótulo) o el contacto; en escritorio, el recorrido horizontal
  function irA(destino) {
    const el = document.getElementById(destino);
    if (!el) return;
    const suave = reduceMQ.matches ? 'auto' : 'smooth';

    if (html.classList.contains('modo-carrusel')) {
      const pista = $('#pista');
      const objetivo = el.classList.contains('sala') ? el.querySelector('.sala-cabecera') : el;
      const pr = pista.getBoundingClientRect();
      const er = objetivo.getBoundingClientRect();
      const izq = er.left - pr.left + pista.scrollLeft - (pista.clientWidth - er.width) / 2;
      const max = pista.scrollWidth - pista.clientWidth;
      pista.scrollTo({ left: Math.min(max, Math.max(0, izq)), behavior: suave });
    } else if (tlHorizontal && tlHorizontal.scrollTrigger) {
      const st = tlHorizontal.scrollTrigger;
      const offset = el.getBoundingClientRect().left - $('#pista').getBoundingClientRect().left;
      const dist = distanciaHorizontal();
      const p = dist > 0 ? Math.min(1, offset / dist) : 0;
      window.scrollTo({ top: st.start + p * (st.end - st.start), behavior: suave });
    } else {
      el.scrollIntoView({ behavior: suave, block: 'start' });
    }
    const titulo = el.querySelector('h2');
    if (titulo) titulo.focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------------
     5. Linterna que sigue al cursor (escritorio) o al dedo (táctil)
     --------------------------------------------------------------- */
  function iniciarLinterna() {
    const l = $('#linterna');
    let tocando = false;

    // La luz sigue al cursor o al dedo en pantallas anchas. En móvil no hay linterna
    const mover = e => {
      if (movil()) return;
      if (e.pointerType === 'touch' && !tocando) return;
      l.style.setProperty('--x', e.clientX + 'px');
      l.style.setProperty('--y', e.clientY + 'px');
      l.classList.add('activa');
    };
    window.addEventListener('pointermove', mover, { passive: true });
    window.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') { tocando = true; mover(e); }
    }, { passive: true });
    const soltar = e => {
      if (e.pointerType !== 'touch') return;
      tocando = false;
      if (!movil()) l.classList.remove('activa');
    };
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    window.addEventListener('pointerout', e => {
      if (!e.relatedTarget && e.pointerType === 'mouse') l.classList.remove('activa');
    });

  }

  /* ---------------------------------------------------------------
     6. Cursor circular (solo puntero fino)
     --------------------------------------------------------------- */
  function iniciarCursor() {
    if (!finoMQ.matches) return;
    const c = $('#cursor');
    html.classList.add('cursor-custom');

    let x = 0, y = 0, cx = 0, cy = 0, visible = false;
    const suavizado = reduceMQ.matches ? 1 : 0.22;

    window.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      if (!visible) {
        visible = true;
        cx = x;
        cy = y;
        c.classList.add('visible');
      }
      c.classList.toggle('es-ver', !!e.target.closest('.obra-btn'));
    }, { passive: true });

    window.addEventListener('pointerout', e => {
      if (!e.relatedTarget && e.pointerType === 'mouse') {
        visible = false;
        c.classList.remove('visible');
      }
    });

    const frame = () => {
      cx += (x - cx) * suavizado;
      cy += (y - cy) * suavizado;
      c.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------
     7. Visor: FLIP desde la posición de la obra, zoom y arrastre
     --------------------------------------------------------------- */
  const visor = $('#visor');
  const vEscena = $('#visor-escena');
  const vZoom = $('#visor-zoom');
  const vImg = $('#visor-img');
  const vTitulo = $('#visor-titulo');
  const vFicha = $('#visor-ficha');
  const vNota = $('#visor-nota');
  const vArtista = $('#visor-artista');
  const vConsulta = $('#visor-consulta');
  const vCerrar = $('#visor-cerrar');

  let disparador = null;
  const zoom = { s: 1, x: 0, y: 0 };
  const punteros = new Map();
  let pinza = null;     // { d, s }: distancia y escala al empezar el pellizco
  let arrastre = null;  // { x, y }: ancla para arrastrar la imagen ampliada

  // WhatsApp si hay número en data.js; si no, Instagram
  function enlaceConsulta(obra) {
    const numero = String(typeof WHATSAPP === 'string' ? WHATSAPP : '').replace(/\D/g, '');
    if (!numero) return INSTAGRAM;
    const texto = `Hola Camila, me interesa la obra «${obra.titulo}»`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  function pintarObra(i) {
    const obra = OBRAS[i];
    const numero = String(typeof WHATSAPP === 'string' ? WHATSAPP : '').replace(/\D/g, '');
    vImg.src = obra.img;
    vImg.alt = obra.alt;
    vTitulo.textContent = obra.titulo;
    vFicha.textContent = [obra.tecnica, obra.medidas].filter(Boolean).join(' · ');
    vNota.textContent = obra.nota || '';
    vNota.hidden = !obra.nota;
    vArtista.textContent = obra.texto || '';
    vArtista.hidden = !obra.texto;
    vConsulta.href = enlaceConsulta(obra);
    vConsulta.textContent = numero ? 'Consultar por WhatsApp' : 'Consultar en Instagram';
    vConsulta.setAttribute('aria-label', `Consultar disponibilidad y precio de «${obra.titulo}»`);
    reiniciarZoom();
  }

  // Vuela la imagen desde su posición en la sala hasta el visor (FLIP)
  function volar(origen, destino) {
    if (!origen || !destino.animate || reduceMQ.matches) return;
    const a = origen.getBoundingClientRect();
    const b = destino.getBoundingClientRect();
    if (!a.width || !b.width) return;
    // Transform con origen en el centro: se compara el centro de ambos rectángulos
    const dx = (a.left + a.width / 2) - (b.left + b.width / 2);
    const dy = (a.top + a.height / 2) - (b.top + b.height / 2);
    const sx = a.width / b.width;
    const sy = a.height / b.height;
    destino.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transform: 'none' }],
      { duration: 700, easing: 'cubic-bezier(.2, .7, .1, 1)' }
    );
  }

  function mostrar(i, origenBtn) {
    pintarObra(i);
    const origen = origenBtn ? origenBtn.querySelector('img') : null;
    const listo = vImg.decode ? vImg.decode().catch(() => {}) : Promise.resolve();
    listo.then(() => {
      if (origen) volar(origen, vImg);
      else if (vImg.animate && !reduceMQ.matches) vImg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
    });
  }

  function abrirVisor(i, origenBtn) {
    disparador = origenBtn || null;
    visor.hidden = false;
    // Una entrada de historial para que Atrás cierre el visor en vez de salir de la página
    if (!(history.state && history.state.visor)) history.pushState({ visor: true }, '');
    html.classList.add('visor-abierto');
    mostrar(i, origenBtn);
    if (visor.animate && !reduceMQ.matches) visor.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
    vCerrar.focus({ preventScroll: true });
  }

  // desdeHistorial: el Atrás del navegador ya quitó la entrada; si no, la quitamos nosotros
  function cerrarVisor(desdeHistorial) {
    if (visor.hidden) return;
    visor.hidden = true;
    html.classList.remove('visor-abierto');
    if (desdeHistorial !== true && history.state && history.state.visor) history.back();
    if (disparador && document.contains(disparador)) disparador.focus({ preventScroll: true });
    disparador = null;
  }

  // Zoom: límites para no sacar la imagen de la escena
  function limitarZoom() {
    const mx = (zoom.s - 1) * vEscena.clientWidth / 2;
    const my = (zoom.s - 1) * vEscena.clientHeight / 2;
    zoom.x = Math.max(-mx, Math.min(mx, zoom.x));
    zoom.y = Math.max(-my, Math.min(my, zoom.y));
  }

  function aplicarZoom() {
    vZoom.style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`;
    vEscena.classList.toggle('ampliada', zoom.s > 1.01);
  }

  function fijarZoom(s) {
    zoom.s = Math.min(5, Math.max(1, s));
    if (zoom.s === 1) { zoom.x = 0; zoom.y = 0; }
    limitarZoom();
    aplicarZoom();
  }

  function reiniciarZoom() {
    zoom.s = 1;
    zoom.x = 0;
    zoom.y = 0;
    aplicarZoom();
  }

  const distanciaDedos = () => {
    const [a, b] = [...punteros.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  };

  function iniciarVisor() {
    vCerrar.addEventListener('click', () => cerrarVisor());
    window.addEventListener('popstate', () => { if (!visor.hidden) cerrarVisor(true); });

    // Rueda: zoom
    vEscena.addEventListener('wheel', e => {
      e.preventDefault();
      fijarZoom(zoom.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    }, { passive: false });

    // Doble clic: alterna zoom
    vEscena.addEventListener('dblclick', () => {
      if (zoom.s > 1) reiniciarZoom();
      else fijarZoom(2.5);
    });

    // Puntero: pellizco (dos dedos), arrastre (ampliada) y deslizar abajo o tocar el fondo para cerrar
    vEscena.addEventListener('pointerdown', e => {
      vEscena.setPointerCapture(e.pointerId);
      punteros.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
      if (punteros.size === 2) {
        pinza = { d: distanciaDedos(), s: zoom.s };
      } else if (punteros.size === 1) {
        arrastre = { x: e.clientX - zoom.x, y: e.clientY - zoom.y };
      }
    });

    vEscena.addEventListener('pointermove', e => {
      const p = punteros.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX;
      p.y = e.clientY;
      if (punteros.size >= 2 && pinza) {
        fijarZoom(pinza.s * distanciaDedos() / pinza.d);
      } else if (arrastre && zoom.s > 1) {
        zoom.x = e.clientX - arrastre.x;
        zoom.y = e.clientY - arrastre.y;
        limitarZoom();
        aplicarZoom();
      }
    });

    const fin = e => {
      const p = punteros.get(e.pointerId);
      if (!p) return;
      punteros.delete(e.pointerId);
      // Sin zoom: deslizar abajo o tocar el fondo cierra
      if (punteros.size === 0 && zoom.s <= 1.01 && arrastre && e.type !== 'pointercancel') {
        const dx = e.clientX - p.x0;
        const dy = e.clientY - p.y0;
        const r = vImg.getBoundingClientRect();
        const enImagen = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (dy > 100 && dy > Math.abs(dx) * 1.5) cerrarVisor();          // deslizar abajo cierra
        else if (Math.hypot(dx, dy) < 10 && !enImagen) cerrarVisor();         // toque o clic en el fondo
      }
      if (punteros.size === 0) {
        arrastre = null;
        pinza = null;
      } else if (punteros.size === 1) {
        const q = [...punteros.values()][0];
        arrastre = { x: q.x - zoom.x, y: q.y - zoom.y };
        pinza = null;
      }
    };
    vEscena.addEventListener('pointerup', fin);
    vEscena.addEventListener('pointercancel', fin);

    // Teclado: Esc cierra, +/- hacen zoom; el foco queda dentro del visor
    document.addEventListener('keydown', e => {
      if (visor.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); cerrarVisor(); }
      else if (e.key === '+' || e.key === '=') fijarZoom(zoom.s * 1.25);
      else if (e.key === '-') fijarZoom(zoom.s / 1.25);
      else if (e.key === '0') reiniciarZoom();
      else if (e.key === 'Tab') trampaFoco(e);
    });
  }

  function trampaFoco(e) {
    const f = $$('button, a[href]', visor);
    if (!f.length) return;
    const primero = f[0];
    const ultimo = f[f.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }

  /* ---------------------------------------------------------------
     8. Arranque
     --------------------------------------------------------------- */
  /* ---------------------------------------------------------------
     7b. Móvil: aviso «Desliza para caminar» y altura real de la cabecera
     --------------------------------------------------------------- */
  // Desaparece al primer deslizamiento o a los 6 s
  function iniciarAvisoDeslizar() {
    const aviso = $('#deslizar-aviso');
    if (!aviso) return;
    setTimeout(() => { aviso.hidden = true; }, 6000);
    $('#pista').addEventListener('scroll', () => { aviso.hidden = true; }, { once: true, passive: true });
  }

  // La cabecera puede ocupar una o dos filas: el carrusel empieza justo debajo
  function medirCabecera() {
    const c = $('.cabecera');
    if (c) html.style.setProperty('--cab-h', c.offsetHeight + 'px');
  }

  function onChange(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }

  function init() {
    construirSalas();
    construirIndice();
    medirCabecera();
    // El índice y las fuentes cambian la altura de la cabecera después de pintar
    if (window.ResizeObserver) new ResizeObserver(medirCabecera).observe($('.cabecera'));
    iniciarEntrada();
    iniciarVisor();
    iniciarLinterna();
    iniciarCursor();
    iniciarAvisoDeslizar();
    aplicarModo();

    onChange(horizontalMQ, aplicarModo);
    onChange(movilMQ, aplicarModo);
    onChange(reduceMQ, aplicarModo);
    window.addEventListener('scroll', programarActualizacion, { passive: true });
    $('#pista').addEventListener('scroll', programarActualizacion, { passive: true });
    window.addEventListener('resize', () => { medirCabecera(); programarActualizacion(); });
    programarActualizacion();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
