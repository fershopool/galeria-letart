/* Carga salas y obras desde Supabase (lo que se edita en el panel de administración) y
   después arranca main.js. Si no está configurado o falla, se usan las de data.js. */
(async () => {
  'use strict';

  async function cargar() {
    const leer = async consulta => {
      const r = await fetch(`${SUPABASE.url}/rest/v1/${consulta}`, {
        headers: { apikey: SUPABASE.clave },
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) throw new Error(`Supabase respondió ${r.status}`);
      return r.json();
    };
    const [categorias, obras] = await Promise.all([
      leer('letart_categorias?select=*&order=orden,nombre'),
      leer('letart_obras?select=*,procesos:letart_procesos(*)&order=orden,creada'),
    ]);
    // Las obras van agrupadas por sala, en el orden del recorrido (de ahí sale la numeración)
    const lista = categorias.flatMap(c => obras.filter(o => o.categoria_id === c.id).map(o => ({
      id: o.id,
      sala: c.slug,
      titulo: o.titulo,
      tecnica: o.tecnica,
      medidas: o.medidas,
      nota: o.nota,
      texto: o.texto,
      alt: o.alt || o.titulo,
      img: o.imagen,
      proceso: o.procesos.sort((a, b) => a.orden - b.orden || a.creado.localeCompare(b.creado)).map(p => ({ src: p.archivo, texto: p.texto || '' })),
    })));
    // ponytail: una base sin ninguna obra se trata como fallo y muestra las de data.js
    if (!lista.length) throw new Error('Supabase no tiene obras');
    SALAS = categorias
      .filter(c => lista.some(o => o.sala === c.slug))
      .map(c => ({ id: c.slug, nombre: c.nombre, sub: c.subtitulo, tema: c.tema }));
    OBRAS = lista;
    window.SALAS = SALAS;
    window.OBRAS = OBRAS;
  }

  if (SUPABASE.url && SUPABASE.clave) {
    try { await cargar(); } catch (e) { console.warn('Galería sin Supabase:', e.message); }
  }
  const s = document.createElement('script');
  s.src = 'js/main.js?v=7';   // subir el número al publicar cambios (también en index.html)
  document.body.appendChild(s);
})();
