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
      sec.dataset.tema = sala.tema || sala.id;   // estilo visual: varias salas pueden compartirlo
      sec.setAttribute('aria-labelledby', 'titulo-' + sala.id);
      sec.innerHTML = `
        <header class="sala-cabecera">
          <h2 class="sala-titulo" id="titulo-${sala.id}" tabindex="-1">${escapar(sala.nombre)}</h2>
          <p class="sala-sub">${escapar(sala.sub)}</p>
          <p class="sala-info">Sala ${si + 1} de ${SALAS.length} · ${OBRAS.filter(o => o.sala === sala.id).length} ${OBRAS.filter(o => o.sala === sala.id).length === 1 ? 'obra' : 'obras'}</p>
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
      umbral.dataset.tema = sec.dataset.tema;
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
    // Nunca a media caminata: recalcular mientras se desplaza da un salto
    refrescoTimer = setTimeout(() => ScrollTrigger.isScrolling() ? refrescarDiferido() : ScrollTrigger.refresh(), 150);
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
      // La cabeza apunta hacia donde corre, girando por el camino corto
      const rumbo = Math.atan2(dy, dx) * 180 / Math.PI + 130;
      giro += ((rumbo - giro) % 360 + 540) % 360 - 180;
      cuerpo.style.rotate = giro + 'deg';
      const ms = Math.max(250, Math.hypot(dx, dy) / azar(ESCARABAJO.velMin, ESCARABAJO.velMax) * 1000);
      // Se coloca ya en el destino y se anima desde donde estaba
      Object.assign(bicho.style, { left: bicho.offsetLeft + dx + 'px', top: bicho.offsetTop + dy + 'px', bottom: 'auto' });
      anim = bicho.animate([{ translate: `${-dx}px ${-dy}px` }, { translate: '0px 0px' }], { duration: ms, easing: 'cubic-bezier(.45, .05, .35, 1)' });
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
      abrirIntro(fin);
    });
  }

  // Cada puerta deja ver su sala: copia la pared, el dibujo, el suelo y el marco ya definidos en CSS
  function vestirPuerta(puerta) {
    const sala = $$('.sala').find(s => s.dataset.sala === puerta.dataset.sala);
    if (!sala) return;
    const copiar = (destino, estilo) => ['backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat']
      .forEach(p => { $(destino, puerta).style[p] = estilo[p]; });
    copiar('.vano', getComputedStyle(sala));
    copiar('.vano-dibujo', getComputedStyle(sala, '::before'));
    const suelo = getComputedStyle(sala, '::after');
    copiar('.vano-suelo', suelo);
    $('.vano-suelo', puerta).style.borderTopColor = suelo.borderTopColor;
    const marco = $('.obra-marco', sala);
    if (marco) copiar('.vano-cuadro', getComputedStyle(marco));
    puerta.style.setProperty('--luz', getComputedStyle(sala).getPropertyValue('--sala-cartela'));
  }

  // Bienvenida con las salas como puertas; la galería queda lista detrás
  function abrirIntro(prepararGaleria) {
    const intro = $('#intro');
    if (!intro.showModal) { prepararGaleria(); mostrarGuia(); return; }
    const salas = SALAS.filter(s => OBRAS.some(o => o.sala === s.id));
    $('#intro-titulo').textContent = salas.length === 1 ? 'Una sala por recorrer' : `Un museo con ${salas.length} salas`;
    $('#intro-salas').innerHTML = salas.map((s, i) => {
      const obras = OBRAS.filter(o => o.sala === s.id);
      return `<li class="puerta" data-sala="${escapar(s.id)}" style="--i:${i}">
        <span class="puerta-arco" aria-hidden="true">
          <span class="vano"><span class="vano-dibujo"></span><span class="vano-suelo"></span>
            <span class="vano-cuadro"><img src="${escapar(obras[0].img)}" alt=""></span></span>
        </span>
        <span class="puerta-placa">
          <span class="puerta-numero">Sala ${i + 1}</span>
          <span class="puerta-nombre">${escapar(s.nombre)}</span>
          <span class="puerta-obras">${obras.length} ${obras.length === 1 ? 'obra' : 'obras'}</span>
        </span>
      </li>`;
    }).join('');
    $$('.puerta').forEach(vestirPuerta);
    intro.style.setProperty('--total', salas.length);
    $('#intro-guia').textContent = movil()
      ? '← Desliza hacia la izquierda para pasar de sala en sala'
      : 'Baja con la rueda o el trackpad ↓ para caminar de sala en sala';

    const salir = () => {
      if (intro.classList.contains('saliendo')) return;
      intro.classList.add('saliendo');
      setTimeout(() => {
        intro.close();
        $('#galeria').focus({ preventScroll: true });
        mostrarGuia();
      }, reduceMQ.matches ? 0 : 650);
    };
    $('#intro-comenzar').addEventListener('click', salir);
    intro.addEventListener('cancel', e => { e.preventDefault(); salir(); });

    intro.showModal();
    // La portada se retira cuando la bienvenida ya la cubre
    setTimeout(prepararGaleria, reduceMQ.matches ? 0 : 450);
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
    let ultimaX = null;
    tickerHorizontal = () => {
      const x = gsap.getProperty(pista, 'x');
      if (x !== ultimaX) { ultimaX = x; actualizarEstados(); }
    };
    // Las imágenes se cargan antes de llegar a ellas: así no cambian de ancho a medio camino
    $$('.obra-btn img', pista).forEach(img => { img.loading = 'eager'; });
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
        onRefresh: () => {
          // La capa del fondo es más ancha justo lo que se va a desplazar
          if (capa) capa.style.right = -distanciaHorizontal() * 0.35 + 'px';
          programarActualizacion();
        },
      },
    });

    // Scroll vertical -> desplazamiento horizontal de las salas
    tl.to(pista, { x: () => -distanciaHorizontal(), ease: 'none' }, 0);
    // Fondo con el escarabajo repetido: se desplaza más lento que las salas (parallax).
    if (capa) tl.to(capa, { x: () => -distanciaHorizontal() * 0.35, ease: 'none' }, 0);
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
      gsap.set([$('#pista'), $('.capa-fondo'), ...elObras].filter(Boolean), { clearProps: 'transform' });
      $('.capa-fondo').style.right = '';
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

  function marcarIndice(destino) {
    $$('.indice-item').forEach(b => {
      const activo = b.dataset.destino === destino;
      if (activo === b.hasAttribute('aria-current')) return;
      if (activo) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  function actualizarEstados() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const carrusel = html.classList.contains('modo-carrusel');
    const horizontal = html.classList.contains('modo-horizontal');
    const esH = carrusel || horizontal;
    const pistaEl = $('#pista');

    // Primero todas las lecturas: intercalarlas con escrituras obliga a recalcular en cada obra
    const rects = elObras.map(el => el && el.firstElementChild.getBoundingClientRect());
    const rc = $('#contacto').getBoundingClientRect();
    const enPortada = $('#entrada').getBoundingClientRect().bottom > vh * 0.5;
    // Carrusel: la sala es la que ocupa el centro de la pantalla (también en su rótulo)
    const salaCentro = carrusel && $$('.sala', pistaEl).find(s => { const r = s.getBoundingClientRect(); return r.left <= vw / 2 && r.right > vw / 2; });
    // Progreso: en el carrusel, el avance de la pista; en el resto, el scroll de la página
    const recorrido = carrusel ? pistaEl.scrollWidth - pistaEl.clientWidth : document.documentElement.scrollHeight - vh;
    const avance = carrusel ? pistaEl.scrollLeft : window.scrollY;

    let mejor = -1;
    let mejorC = Infinity;
    rects.forEach((r, i) => {
      if (!r) return;
      // c: 0 en el centro de la pantalla, 1 en los bordes (solo eje horizontal en modo horizontal)
      const d = esH
        ? Math.abs(r.left + r.width / 2 - vw / 2) / (vw / 2)
        : Math.abs(r.top + r.height / 2 - vh / 2) / (vh / 2);
      if (horizontal) {
        const marco = elObras[i].firstElementChild;
        const c = Math.min(1, d).toFixed(2);
        if (marco.dataset.c !== c) { marco.dataset.c = c; marco.style.setProperty('--c', c); }
      }
      // Sin recortar: en un rótulo de sala gana la obra más cercana, no la primera
      if (r.width > 0 && d < mejorC) { mejorC = d; mejor = i; }
    });

    // La linterna se apaga al llegar a la sala de contacto (crema)
    const enContacto = esH ? rc.left < vw * 0.5 : rc.top < vh * 0.5;
    html.classList.toggle('en-contacto', enContacto);
    html.classList.toggle('en-portada', enPortada);

    // Cabecera e índice cambian de color según la sala del cuadro centrado (no en contacto)
    centrado = mejor;
    const salaMejor = mejor >= 0 ? elObras[mejor].closest('.sala').dataset.sala : undefined;
    const salaActual = enContacto ? undefined : carrusel ? salaCentro && salaCentro.dataset.sala : salaMejor;
    if (mejor >= 0) {
      const texto = `${pad(mejor + 1)} / ${pad(TOTAL)}`;
      if ($('#contador').textContent !== texto) $('#contador').textContent = texto;
    }
    marcarIndice(carrusel && enContacto ? 'contacto' : 'sala-' + (carrusel ? salaActual : salaMejor));
    const info = salaActual && SALAS.find(x => x.id === salaActual);
    const tema = info ? info.tema || info.id : '';
    if (tema) { if (html.dataset.salaActiva !== tema) html.dataset.salaActiva = tema; }
    else if ('salaActiva' in html.dataset) delete html.dataset.salaActiva;

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
      l.style.transform = `translate3d(${e.clientX - window.innerWidth / 2}px, ${e.clientY - window.innerHeight / 2}px, 0)`;
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

    let x = 0, y = 0, cx = 0, cy = 0, visible = false, andando = false;
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
      if (!andando) { andando = true; requestAnimationFrame(frame); }
    }, { passive: true });

    window.addEventListener('pointerout', e => {
      if (!e.relatedTarget && e.pointerType === 'mouse') {
        visible = false;
        c.classList.remove('visible');
      }
    });

    function frame() {
      cx += (x - cx) * suavizado;
      cy += (y - cy) * suavizado;
      c.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      andando = Math.abs(x - cx) + Math.abs(y - cy) > 0.1;
      if (andando) requestAnimationFrame(frame);
    }
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
  const TEXTO_PENDIENTE = 'Aquí irá el texto de la artista sobre esta obra: su historia, en qué se inspiró o cómo la pintó.';
  const vConsulta = $('#visor-consulta');
  const vVideo = $('#visor-video');
  const vProceso = $('#visor-proceso');
  const vMinis = $('#visor-miniaturas');
  const vPasos = $('#visor-pasos');
  const vReproductor = $('#reproductor');
  const vPlay = $('#video-play');
  const vBarra = $('#video-barra');
  const vTiempo = $('#video-tiempo');
  const vSonido = $('#video-sonido');
  const vVolumen = $('#video-volumen');
  const vGrande = $('#video-grande');
  const vAnterior = $('#paso-anterior');
  const vSiguiente = $('#paso-siguiente');
  const ES_VIDEO = /\.(mp4|webm|mov|m4v)$/i;
  let obraVista = null;
  let pasos = [];       // fotos y videos del proceso; el último es la obra terminada
  let paso = -1;        // -1: ficha de la obra (fuera del modo proceso)

  // Muestra en la escena la obra terminada, una foto del proceso o un video
  function verMedio(src, alt) {
    const video = ES_VIDEO.test(src);
    vVideo.pause();
    vVideo.hidden = !video;
    vReproductor.hidden = !video;
    if (!video) vGrande.hidden = true;
    vImg.hidden = video;
    vEscena.classList.toggle('con-video', video);
    if (video) {
      vVideo.src = src;
      vVideo.setAttribute('aria-label', alt);
      pintarReproductor();
    } else {
      vVideo.removeAttribute('src');
      vImg.src = src;
      vImg.alt = alt;
    }
    reiniciarZoom();
  }

  const reloj = t => (isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '0:00');

  function pintarReproductor() {
    const total = vVideo.duration;
    const t = vVideo.currentTime || 0;
    const parte = total ? t / total : 0;
    vBarra.value = Math.round(parte * 1000);
    vBarra.style.setProperty('--avance', `${parte * 100}%`);
    vBarra.setAttribute('aria-valuetext', `${reloj(t)} de ${reloj(total)}`);
    vTiempo.textContent = `${reloj(t)} / ${reloj(total)}`;
    vPlay.classList.toggle('activo', !vVideo.paused);
    vPlay.setAttribute('aria-label', vVideo.paused ? 'Reproducir' : 'Pausar');
    vGrande.hidden = vVideo.hidden || !vVideo.paused;
    const volumen = vVideo.muted ? 0 : Math.round(vVideo.volume * 100);
    vVolumen.value = volumen;
    vVolumen.style.setProperty('--avance', `${volumen}%`);
    vVolumen.setAttribute('aria-valuetext', `${volumen} %`);
    vSonido.classList.toggle('mudo', !volumen);
    vSonido.setAttribute('aria-label', volumen ? 'Silenciar' : 'Activar sonido');
  }

  const alternarVideo = () => { if (vVideo.paused) vVideo.play().catch(() => {}); else vVideo.pause(); };

  function pantallaCompleta() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (vEscena.requestFullscreen) vEscena.requestFullscreen().catch(() => {});
    else if (vVideo.webkitEnterFullscreen) vVideo.webkitEnterFullscreen();   // iPhone
  }

  const nombrePaso = n => (pasos[n].final ? 'Obra terminada' : `${ES_VIDEO.test(pasos[n].src) ? 'Video' : 'Foto'} del proceso ${n + 1}`);

  // En la ficha solo se ofrece el botón; el recorrido se arma aquí
  function pintarProceso(obra) {
    const medios = (obra.proceso || []).map(m => (typeof m === 'string' ? { src: m, texto: '' } : m)).filter(m => m && m.src);
    obraVista = obra;
    pasos = medios.length ? [...medios, { src: obra.img, texto: '', final: true }] : [];
    vProceso.hidden = !medios.length;
    vProceso.textContent = `Ver el proceso · ${medios.length} ${medios.length === 1 ? 'paso' : 'pasos'}`;
    $('#paso-obra').textContent = obra.titulo;
    vMinis.textContent = '';
    pasos.forEach((p, n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'visor-mini';
      b.setAttribute('aria-label', nombrePaso(n));
      const video = ES_VIDEO.test(p.src);
      const m = document.createElement(video ? 'video' : 'img');
      if (video) { m.muted = true; m.preload = 'metadata'; m.playsInline = true; m.tabIndex = -1; b.classList.add('es-video'); }
      else { m.alt = ''; m.loading = 'lazy'; }
      m.src = video ? `${p.src}#t=0.1` : p.src;
      b.appendChild(m);
      b.addEventListener('click', () => irPaso(n));
      vMinis.appendChild(b);
    });
  }

  function irPaso(n) {
    paso = Math.max(0, Math.min(pasos.length - 1, n));
    const p = pasos[paso];
    verMedio(p.src, p.final ? obraVista.alt : `${nombrePaso(paso)} de «${obraVista.titulo}»${p.texto ? `: ${p.texto}` : ''}`);
    $('#paso-numero').textContent = p.final ? 'Obra terminada' : `Paso ${paso + 1} de ${pasos.length - 1}`;
    $('#paso-texto').textContent = p.texto;
    vAnterior.disabled = paso === 0;
    vSiguiente.disabled = paso === pasos.length - 1;
    $$('.visor-mini', vMinis).forEach((b, i) => b.setAttribute('aria-pressed', String(i === paso)));
    const actual = vMinis.children[paso];
    vMinis.scrollTo({ left: actual.offsetLeft - (vMinis.clientWidth - actual.offsetWidth) / 2, behavior: reduceMQ.matches ? 'auto' : 'smooth' });
    if (!vVideo.hidden) alternarVideo();
    else if (vImg.animate && !reduceMQ.matches) vImg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
  }

  function modoProceso(activo) {
    visor.classList.toggle('modo-proceso', activo);
    vPasos.hidden = !activo;
    vAnterior.hidden = vSiguiente.hidden = !activo;
    if (!activo) paso = -1;
  }

  function salirProceso() {
    modoProceso(false);
    verMedio(obraVista.img, obraVista.alt);
    vProceso.focus({ preventScroll: true });
  }

  function iniciarProceso() {
    vProceso.addEventListener('click', () => { modoProceso(true); irPaso(0); $('#paso-volver').focus({ preventScroll: true }); });
    $('#paso-volver').addEventListener('click', salirProceso);
    vAnterior.addEventListener('click', () => irPaso(paso - 1));
    vSiguiente.addEventListener('click', () => irPaso(paso + 1));
    vPlay.addEventListener('click', alternarVideo);
    vVideo.addEventListener('click', alternarVideo);
    vGrande.addEventListener('click', () => { alternarVideo(); vPlay.focus({ preventScroll: true }); });
    vSonido.addEventListener('click', () => {
      const mudo = vVideo.muted || !vVideo.volume;
      if (mudo && !vVideo.volume) vVideo.volume = .6;
      vVideo.muted = !mudo;
    });
    vVolumen.addEventListener('input', () => {
      vVideo.volume = vVolumen.value / 100;
      vVideo.muted = vVideo.volume === 0;
    });
    // iPhone no deja cambiar el volumen desde la página (se usan los botones del teléfono)
    const prueba = document.createElement('video');
    prueba.volume = .5;
    vVolumen.hidden = prueba.volume !== .5;
    document.addEventListener('fullscreenchange', () => {
      const completa = Boolean(document.fullscreenElement);
      $('#video-pantalla').classList.toggle('completa', completa);
      $('#video-pantalla').setAttribute('aria-label', completa ? 'Salir de pantalla completa' : 'Pantalla completa');
    });
    $('#video-pantalla').addEventListener('click', pantallaCompleta);
    vBarra.addEventListener('input', () => { if (vVideo.duration) vVideo.currentTime = vBarra.value / 1000 * vVideo.duration; });
    ['timeupdate', 'durationchange', 'play', 'pause', 'volumechange'].forEach(t => vVideo.addEventListener(t, pintarReproductor));
  }
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
    modoProceso(false);
    pintarProceso(obra);
    verMedio(obra.img, obra.alt);
    vTitulo.textContent = obra.titulo;
    vFicha.textContent = [obra.tecnica, obra.medidas].filter(Boolean).join(' · ');
    vNota.textContent = obra.nota || '';
    vNota.hidden = !obra.nota;
    // Sin texto aún: en escritorio se muestra un ejemplo señalando dónde irá (en móvil no)
    vArtista.textContent = obra.texto || TEXTO_PENDIENTE;
    vArtista.classList.toggle('pendiente', !obra.texto);
    vArtista.hidden = false;
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
    vVideo.pause();
    if (document.fullscreenElement) document.exitFullscreen();
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
    iniciarProceso();
    vCerrar.addEventListener('click', () => cerrarVisor());
    window.addEventListener('popstate', () => { if (!visor.hidden) cerrarVisor(true); });

    // Rueda: zoom
    vEscena.addEventListener('wheel', e => {
      e.preventDefault();
      if (!vVideo.hidden) return;
      fijarZoom(zoom.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    }, { passive: false });

    // Doble clic: alterna zoom
    vEscena.addEventListener('dblclick', e => {
      if (!vVideo.hidden || e.target.closest('button')) return;
      if (zoom.s > 1) reiniciarZoom();
      else fijarZoom(2.5);
    });

    // Puntero: pellizco (dos dedos), arrastre (ampliada) y deslizar abajo o tocar el fondo para cerrar
    vEscena.addEventListener('pointerdown', e => {
      if (e.target.closest('video, button, .reproductor')) return;   // los controles reciben el puntero
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
        const r = (vVideo.hidden ? vImg : vVideo).getBoundingClientRect();
        const enImagen = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (paso >= 0 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) irPaso(paso + (dx < 0 ? 1 : -1));
        else if (dy > 100 && dy > Math.abs(dx) * 1.5) cerrarVisor();          // deslizar abajo cierra
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
      if (e.key === 'Escape') { e.preventDefault(); if (paso >= 0) salirProceso(); else cerrarVisor(); }
      else if (paso >= 0 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.target.closest('input')) { e.preventDefault(); irPaso(paso + (e.key === 'ArrowLeft' ? -1 : 1)); }
      else if (e.key === ' ' && !vVideo.hidden && !e.target.closest('button, a, input')) { e.preventDefault(); alternarVideo(); }
      else if (e.key === '+' || e.key === '=') fijarZoom(zoom.s * 1.25);
      else if (e.key === '-') fijarZoom(zoom.s / 1.25);
      else if (e.key === '0') reiniciarZoom();
      else if (e.key === 'Tab') trampaFoco(e);
    });
  }

  function trampaFoco(e) {
    const f = $$('button:not(:disabled), a[href], input', visor).filter(x => x.getClientRects().length);
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
  // En móvil, tras la bienvenida: se queda hasta que la persona desliza
  function mostrarGuia() {
    const aviso = $('#deslizar-aviso');
    const pista = $('#pista');
    // Solo en teléfonos: una ventana angosta de computadora no se desliza con el dedo
    if (!aviso || !movil() || finoMQ.matches) return;
    aviso.hidden = false;
    const ocultar = () => {
      if (pista.scrollLeft < 40) return;
      aviso.hidden = true;
      pista.removeEventListener('scroll', ocultar);
    };
    pista.addEventListener('scroll', ocultar, { passive: true });
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
