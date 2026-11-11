const API = window.APP_CONFIG.apiBase;
const $ = (s, r = document) => r.querySelector(s);
const view = $('#view');

/* ---------- Utilidades ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function getJson(url) {
  let r;
  try { r = await fetch(url); } catch {
    throw new Error(navigator.onLine
      ? 'No se pudo conectar con el servidor. Si la estás probando en local, enciende "node server.mjs"; si es la API, puede estar despertando: reintenta en unos segundos.'
      : 'Sin conexión, y esta sección todavía no se había guardado. Ábrela una vez con internet para poder verla sin conexión.');
  }
  if (r.status === 204) return null;
  if (!r.ok) throw new Error(r.status === 404 ? 'No se encontró lo que buscabas.' : `El servidor respondió con error ${r.status}.`);
  return r.json();
}
const api = {
  historia: () => getJson(`${API}/historia`),
  personajes: () => getJson(`${API}/personajes`),
  personaje: (id) => getJson(`${API}/personajes/${encodeURIComponent(id)}`),
  controles: () => getJson(`${API}/controles`),
  creditos: () => getJson(`${API}/creditos`),
  ranking: (limite = 10) => getJson(`${API}/ranking?limite=${limite}`),
};
let _contenido;
// Contenido que la API no tiene (evento, dinámicas, línea de tiempo, herramientas).
const contenido = () => (_contenido ??= getJson('data/contenido.json').catch((e) => { _contenido = null; throw e; }));

const store = {
  read(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};
const state = {
  favs: store.read('favs', []),
  sel: store.read('sel', null),               // personaje elegido: { id, nombre }
  texto: store.read('texto', 'normal'),
  fx: store.read('fx', true),
};
const save = () => { for (const k of Object.keys(state)) store.write(k, state[k]); };

function applySettings() {
  document.documentElement.dataset.texto = state.texto;
  document.body.classList.toggle('fx', !!state.fx);
}

// El retrato viene de la API (imagenUrl); si falta, se usa el logo del juego.
const foto = (p) => p.imagenUrl || 'icons/icon-512.png';

const loading = (msg = 'Cargando archivo…') => `<div class="loading"><div class="spin"></div><p>${msg}</p></div>`;
const errorBox = (e) => `<div class="err" role="alert"><strong>No se pudo cargar.</strong><p>${esc(e.message || e)}</p>
  <button class="btn small" data-act="retry">Reintentar</button></div>`;

/* ---------- Vistas ---------- */
// Las tarjetas "Personajes" y "Enemigos" cambian a un retrato de la API en cuanto llega.
async function imagenesDeApi() {
  try {
    const lista = (await api.personajes()) ?? [];
    const enem = lista.filter((p) => /enemig/i.test(p.rol) && p.imagenUrl);
    const heroes = lista.filter((p) => !/enemig/i.test(p.rol) && p.imagenUrl);
    const pone = (card, p) => {
      const img = $(`img[data-card="${card}"]`);
      if (img && p) { img.src = p.imagenUrl; img.style.objectPosition = 'center 30%'; }
    };
    pone('personajes', heroes[Math.floor(Math.random() * heroes.length)]);
    pone('enemigos', enem[Math.floor(Math.random() * enem.length)]);
  } catch { /* se queda la imagen local */ }
}

async function vInicio() {
  const c = await contenido();
  const ev = c.evento;
  setTimeout(imagenesDeApi);
  return `
  <section class="hero">
    <img src="img/portada.png" alt="Jason y Milena corriendo armados por un pasillo del laboratorio">
    <div>
      <span class="kicker">Juego de supervivencia</span>
      <h1>LABORATORIO <b>4</b></h1>
      <p class="muted">Un accidente en una planta de investigación desató un brote. Descubre qué pasó, elige a tu sobreviviente y enfrenta a las criaturas del laboratorio.</p>
      <div class="row"><a class="btn" href="#/historia">Explorar el archivo</a><a class="btn ghost" href="#/evento">Ver el evento</a></div>
    </div>
  </section>

  ${state.sel ? `<h2>Tu personaje</h2>
  <a class="card pad row link" href="#/personaje/${esc(state.sel.id)}" style="text-decoration:none">
    <strong>${esc(state.sel.nombre)}</strong><span class="muted">Ver ficha →</span></a>` : ''}

  <h2>Dinámicas de juego</h2>
  <div class="grid">${c.dinamicas.map((d) => `
    <div class="card pad"><div style="font-size:1.8rem">${d.icono}</div><h3>${esc(d.titulo)}</h3><p class="muted">${esc(d.texto)}</p></div>`).join('')}
  </div>

  <h2>Explora</h2>
  <div class="grid">
    ${[['historia', 'Historia', 'img/tarjeta-historia.png', 'Los eventos que originaron el brote.'],
       ['personajes', 'Personajes', 'img/tarjeta-personajes.png', 'Protagonistas y habilidades.'],
       ['enemigos', 'Enemigos', 'img/tarjeta-enemigos.png', 'Las criaturas mutantes.'],
       ['controles', 'Controles', 'img/portada.png', 'Acciones y mecánicas.']]
      .map(([r, t, i, d]) => `<a class="card link-card" href="#/${r}"><img src="${i}" alt="" data-card="${r}"><div class="body"><h3>${t}</h3><span class="small">${d}</span></div></a>`).join('')}
  </div>

  <h2>Próximo evento</h2>
  <div class="card pad"><h3>${esc(ev.titulo)}</h3>
    <p class="muted">${fechaLarga(ev.fecha)} · ${esc(ev.lugar)}</p>
    <a class="btn small" href="#/evento">Detalles y ranking</a></div>`;
}

async function vHistoria() {
  const [h, c] = await Promise.all([api.historia(), contenido()]);
  return `
  <img src="img/logo.png" alt="Logo de Laboratorio 4" style="display:block;margin:0 auto;width:min(240px,60%);border-radius:18px">
  <h1 style="margin-top:16px;text-align:center">${esc(h?.titulo ?? 'Historia')}</h1>
  ${h?.subtitulo ? `<p class="kicker" style="text-align:center">${esc(h.subtitulo)}</p>` : ''}
  <p class="prose">${esc(h?.contenido ?? 'Todavía no hay historia publicada.')}</p>
  <h2>Cómo empezó todo</h2>
  <div class="timeline">${c.eventos.map((e) => `
    <div class="card ev"><span class="n">${esc(e.n)}</span>
      <div><strong>${esc(e.titulo)}</strong><div class="muted small">${esc(e.texto)}</div></div>
      <img src="${esc(e.img)}" alt="" loading="lazy"></div>`).join('')}
  </div>`;
}

/* Personajes: búsqueda, filtro por rol, favoritos y selección */
const pv = { list: [], q: '', rol: 'Todos' };

function cardPersonaje(p) {
  const fav = state.favs.includes(p.id);
  const sel = state.sel?.id === p.id;
  return `<article class="card">
    <img class="cover" src="${esc(foto(p))}" alt="Retrato de ${esc(p.nombre)}" loading="lazy">
    <div class="body">
      <div class="row" style="justify-content:space-between">
        <h3>${esc(p.nombre)}</h3>
        <button class="fav" data-fav="${p.id}" aria-pressed="${fav}" aria-label="Favorito: ${esc(p.nombre)}">${fav ? '♥' : '♡'}</button>
      </div>
      <div><span class="tag">${esc(p.rol)}</span> <span class="tag red">${esc(p.habilidad)}</span></div>
      <p class="muted small">${esc((p.biografia || '').slice(0, 110))}…</p>
      <div class="row"><a class="btn small" href="#/personaje/${p.id}">Ver ficha</a>
        <button class="btn small ghost" data-pick="${p.id}" data-name="${esc(p.nombre)}">${sel ? '✓ Elegido' : 'Elegir'}</button></div>
    </div></article>`;
}

function renderGrid() {
  const q = pv.q.trim().toLowerCase();
  const items = pv.list.filter((p) =>
    (pv.rol === 'Todos' || (pv.rol === '♥ Favoritos' ? state.favs.includes(p.id) : p.rol === pv.rol)) &&
    (!q || `${p.nombre} ${p.biografia} ${p.habilidad}`.toLowerCase().includes(q)));
  $('#grid').innerHTML = items.length ? items.map(cardPersonaje).join('') : '<p class="muted">No hay personajes con ese filtro.</p>';
  $('#count').textContent = `${items.length} de ${pv.list.length}`;
}

async function vPersonajes() {
  pv.list = (await api.personajes()) ?? [];
  pv.q = ''; pv.rol = 'Todos';
  const roles = ['Todos', '♥ Favoritos', ...new Set(pv.list.map((p) => p.rol))];
  setTimeout(renderGrid);
  return `<h1>Personajes</h1><p class="lead">Busca, filtra, marca tus favoritos y elige con quién jugar.</p>
  <div class="row"><input id="q" type="search" placeholder="Buscar por nombre, habilidad o historia…" aria-label="Buscar personaje"><span id="count" class="muted small"></span></div>
  <div class="chips" id="chips">${roles.map((r) => `<button class="chip" data-rol="${esc(r)}" aria-pressed="${r === 'Todos'}">${esc(r)}</button>`).join('')}</div>
  <div class="grid" id="grid"></div>`;
}

async function vPersonaje(id) {
  const p = await api.personaje(id);
  const fav = state.favs.includes(p.id);
  const sel = state.sel?.id === p.id;
  const f = (k, v) => v ? `<div class="fact"><b>${k}</b>${esc(v)}</div>` : '';
  return `<p><a href="#/personajes">← Volver a personajes</a></p>
  <div class="detail">
    <img class="portrait" src="${esc(foto(p))}" alt="Retrato de ${esc(p.nombre)}">
    <div>
      <span class="kicker">${esc(p.rol)}</span><h1>${esc(p.nombre)}</h1>
      <p class="prose">${esc(p.biografia)}</p>
      <div class="facts">${f('Habilidad', p.habilidad)}${f('Género', p.genero)}${f('Vestimenta', p.vestimenta)}</div>
      <div class="row">
        <button class="btn" data-pick="${p.id}" data-name="${esc(p.nombre)}">${sel ? '✓ Personaje elegido' : 'Elegir este personaje'}</button>
        <button class="btn ghost" data-fav="${p.id}" aria-pressed="${fav}">${fav ? '♥ En favoritos' : '♡ Añadir a favoritos'}</button>
      </div>
    </div></div>`;
}

async function vEnemigos() {
  const lista = ((await api.personajes()) ?? []).filter((p) => /enemig/i.test(p.rol));
  return `<h1>Enemigos</h1><p class="lead">Criaturas y experimentos que encontrarás en el laboratorio.</p>
  ${lista.length ? `<div class="grid">${lista.map((p) => `
    <article class="card"><img class="cover" src="${esc(foto(p))}" alt="${esc(p.nombre)}" loading="lazy">
      <div class="body"><h3>${esc(p.nombre)}</h3><div><span class="tag red">${esc(p.habilidad || p.rol)}</span></div>
      <p class="muted small">${esc((p.biografia || '').slice(0, 140))}…</p>
      <a class="btn small" href="#/personaje/${p.id}">Ver ficha</a></div></article>`).join('')}</div>`
    : '<p class="muted">Todavía no hay enemigos registrados.</p>'}`;
}

async function vControles() {
  const list = (await api.controles()) ?? [];
  return `<h1>Controles</h1><p class="lead">Acciones disponibles en el juego.</p>
  ${list.length ? `<div class="keys">${list.map((k) => `
    <div class="card key"><span class="cap">${esc(k.tecla)}</span><span>${esc(k.accion)}</span></div>`).join('')}</div>`
    : '<p class="muted">Aún no hay controles registrados.</p>'}`;
}

/* Evento: cuenta regresiva, calendario y ranking (API) */
let timer;
const fechaLarga = (iso) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(iso));

function tick(iso) {
  const el = $('#count-evento'); if (!el) return;
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) { el.innerHTML = '<p class="muted">El evento ya comenzó o terminó.</p>'; return; }
  const s = Math.floor(ms / 1000);
  const parts = [['Días', Math.floor(s / 86400)], ['Horas', Math.floor(s % 86400 / 3600)], ['Min', Math.floor(s % 3600 / 60)], ['Seg', s % 60]];
  el.innerHTML = parts.map(([l, v]) => `<div><b>${v}</b>${l}</div>`).join('');
}

function descargarICS(ev) {
  const f = (d) => new Date(d).toISOString().replace(/[-:]|\.\d{3}/g, '');
  const fin = new Date(new Date(ev.fecha).getTime() + ev.duracionHoras * 3600e3);
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Laboratorio 4//ES', 'BEGIN:VEVENT',
    `UID:${f(ev.fecha)}@laboratorio4`, `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(ev.fecha)}`, `DTEND:${f(fin)}`,
    `SUMMARY:${ev.titulo}`, `LOCATION:${ev.lugar}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })), download: 'laboratorio4.ics' });
  a.click(); URL.revokeObjectURL(a.href);
}

async function vEvento() {
  const { evento: ev } = await contenido();
  setTimeout(() => { tick(ev.fecha); timer = setInterval(() => tick(ev.fecha), 1000); cargarRanking(); });
  return `<span class="kicker">Evento de videojuegos</span><h1>${esc(ev.titulo)}</h1>
  <p class="lead">${esc(ev.descripcion)}</p>
  <div class="count" id="count-evento" aria-live="off"></div>
  <div class="grid" style="margin-top:18px">
    <div class="card pad"><b>📅 Fecha y hora</b><p>${fechaLarga(ev.fecha)}</p></div>
    <div class="card pad"><b>📍 Lugar</b><p>${esc(ev.lugar)}<br><span class="muted small">${esc(ev.direccion)}</span></p>
      <a class="btn small ghost" href="${esc(ev.mapa)}" target="_blank" rel="noopener">Ver mapa</a></div>
  </div>
  <div class="row" style="margin-top:14px"><button class="btn" data-act="ics">Añadir al calendario</button></div>
  <h2>Programa</h2>
  <ul class="prog card pad">${ev.programa.map((p) => `<li><b>${esc(p.hora)}</b><span>${esc(p.actividad)}</span></li>`).join('')}</ul>
  <h2>🏆 Ranking de jugadores</h2>
  <div id="ranking">${loading('Cargando ranking…')}</div>`;
}
const MEDALLAS = ['🥇', '🥈', '🥉'];
const tiempo = (seg) => `${Math.floor(seg / 60)}:${String(Math.floor(seg % 60)).padStart(2, '0')}`;
const fechaCorta = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(d); };

async function cargarRanking() {
  const box = $('#ranking'); if (!box) return;
  try {
    const [lista, pers] = await Promise.all([api.ranking(10), api.personajes().catch(() => [])]);
    if (!$('#ranking')) return;                       // el usuario cambió de página
    const nombre = (id) => (pers ?? []).find((p) => p.id === id)?.nombre ?? '';
    box.innerHTML = lista?.length
      ? `<ol class="rank">${lista.map((r, i) => `
        <li><span class="pos">${MEDALLAS[i] ?? i + 1}</span>
          <div class="who"><strong>${esc(r.playerName)}</strong>
            <span class="muted small">${[nombre(r.characterId), tiempo(r.time), fechaCorta(r.date)].filter(Boolean).map(esc).join(' · ')}</span></div>
          <b class="pts">${Number(r.score).toLocaleString('es-MX')}</b></li>`).join('')}</ol>`
      : '<p class="muted">Todavía no hay puntuaciones. ¡Sé el primero!</p>';
  } catch (e) {
    if ($('#ranking')) $('#ranking').innerHTML = `${errorBox(e)}`;
  }
}

async function vCreditos() {
  const [c, k] = await Promise.all([api.creditos(), contenido()]);
  return `<h1>Créditos</h1>
  <p class="kicker">${esc(c?.grupo ?? 'Equipo')}</p><p class="lead">${esc(c?.descripcion ?? '')}</p>
  <h2>Desarrolladores</h2>
  <div class="grid">${(c?.creadores ?? []).map((n) => `<div class="card pad">👤 ${esc(n)}</div>`).join('') || '<p class="muted">Sin creadores registrados.</p>'}</div>
  <h2>Herramientas utilizadas</h2>
  <div class="chips">${k.herramientas.map((h) => `<span class="tag">${esc(h)}</span>`).join(' ')}</div>`;
}

async function vAjustes() {
  return `<h1>Ajustes</h1><p class="lead">Se guardan en este dispositivo.</p>
  <div class="card pad" style="display:grid;gap:16px;max-width:520px">
    <label>Tamaño del texto
      <select id="s-texto"><option value="pequeno">Pequeño</option><option value="normal">Normal</option><option value="grande">Grande</option></select></label>
    <label class="row" style="flex-direction:row"><input id="s-fx" type="checkbox" ${state.fx ? 'checked' : ''}> Efecto de líneas (estilo retro)</label>
    <div class="row"><button class="btn ghost small" data-act="clear-favs">Borrar favoritos (${state.favs.length})</button>
      <button class="btn ghost small" data-act="clear-sel">Quitar personaje elegido</button></div>
    <button class="btn" id="install2" hidden>Instalar como aplicación</button>
  </div>`;
}

/* ---------- Router ---------- */
const routes = { inicio: vInicio, historia: vHistoria, personajes: vPersonajes, personaje: vPersonaje, enemigos: vEnemigos, controles: vControles, evento: vEvento, creditos: vCreditos, ajustes: vAjustes };
const titles = { inicio: 'Inicio', historia: 'Historia', personajes: 'Personajes', personaje: 'Personaje', enemigos: 'Enemigos', controles: 'Controles', evento: 'Evento', creditos: 'Créditos', ajustes: 'Ajustes' };
let navId = 0;

async function route() {
  clearInterval(timer);
  const [, name = 'inicio', arg] = location.hash.slice(1).split('/');
  const fn = routes[name] ?? routes.inicio;
  const id = ++navId;
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === (name === 'personaje' ? 'personajes' : name)));
  document.title = `${titles[name] ?? 'Inicio'} · Laboratorio 4`;
  view.innerHTML = loading();
  const slow = setTimeout(() => { if (id === navId) view.innerHTML = loading('El servidor del juego está despertando, puede tardar unos segundos…'); }, 4000);
  try {
    const html = await fn(arg);
    if (id !== navId) return;
    view.innerHTML = html;
    if (name === 'ajustes') initAjustes();
  } catch (e) {
    if (id === navId) view.innerHTML = errorBox(e);
  } finally {
    clearTimeout(slow);
  }
  if (id === navId) { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
}

function initAjustes() {
  const t = $('#s-texto'); t.value = state.texto;
  t.onchange = () => { state.texto = t.value; save(); applySettings(); };
  $('#s-fx').onchange = (e) => { state.fx = e.target.checked; save(); applySettings(); };
  if (deferredPrompt) $('#install2').hidden = false;
  $('#install2').onclick = instalar;
}

/* ---------- Eventos globales ---------- */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-fav],[data-pick],[data-act],[data-rol]'); if (!b) return;
  if (b.dataset.fav) {
    const id = Number(b.dataset.fav);
    state.favs = state.favs.includes(id) ? state.favs.filter((x) => x !== id) : [...state.favs, id];
    save();
    if ($('#grid')) renderGrid(); else route();
  } else if (b.dataset.pick) {
    state.sel = { id: Number(b.dataset.pick), nombre: b.dataset.name }; save();
    if ($('#grid')) renderGrid(); else route();
  } else if (b.dataset.rol) {
    pv.rol = b.dataset.rol;
    document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c === b));
    renderGrid();
  } else if (b.dataset.act === 'retry') route();
  else if (b.dataset.act === 'ics') contenido().then((c) => descargarICS(c.evento));
  else if (b.dataset.act === 'clear-favs') { state.favs = []; save(); route(); }
  else if (b.dataset.act === 'clear-sel') { state.sel = null; save(); route(); }
});
document.addEventListener('input', (e) => { if (e.target.id === 'q') { pv.q = e.target.value; renderGrid(); } });

/* ---------- PWA: instalación, conexión y service worker ---------- */
let deferredPrompt;
const installBtn = $('#install');
async function instalar() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt(); await deferredPrompt.userChoice;
  deferredPrompt = null; installBtn.hidden = true;
}
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; installBtn.hidden = false; });
window.addEventListener('appinstalled', () => { installBtn.hidden = true; });
installBtn.onclick = instalar;

const setOffline = () => { $('#offline').hidden = navigator.onLine; };
window.addEventListener('online', setOffline); window.addEventListener('offline', setOffline); setOffline();

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

applySettings();
window.addEventListener('hashchange', route);
route();

// Con internet, guarda en segundo plano los datos de la API para poder abrir cualquier sección sin conexión.
if (navigator.onLine) setTimeout(() => ['historia', 'personajes', 'controles', 'creditos', 'ranking?limite=10'].forEach((r) => fetch(`${API}/${r}`).catch(() => {})), 3000);
