// Service worker: la app abre sin conexión y los datos de la API quedan en caché.
const VERSION = 'v10';
const SHELL = `lab4-shell-${VERSION}`;
const DATA = `lab4-data-${VERSION}`;
const SHELL_FILES = [
  './', 'index.html', 'css/styles.css', 'js/app.js', 'js/config.js', 'manifest.webmanifest',
  'data/contenido.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon-64.png', 'img/logo.png',
  'img/portada.png', 'img/historia-ciudad.png', 'img/personaje-jason.png', 'img/personaje-milena.png',
  'img/tarjeta-historia.png', 'img/tarjeta-personajes.png', 'img/tarjeta-enemigos.png', 'img/tarjeta-controles.png',
  'img/evento-explosion.png', 'img/evento-contaminacion.png', 'img/evento-brote.png',
  'img/enemigo-sorbos.png', 'img/enemigo-doctor-yiba.png', 'img/enemigo-homunculos.png', 'img/enemigo-variaciones.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, DATA].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function staleWhileRevalidate(req, cacheName, opaqueOk = false) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const net = fetch(req).then((res) => { if (res.ok || (opaqueOk && res.type === 'opaque')) cache.put(req, res.clone()); return res; });
  if (cached) { net.catch(() => {}); return cached; }
  return net;
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) {
    if (request.destination === 'image') e.respondWith(staleWhileRevalidate(request, DATA, true));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    e.respondWith(staleWhileRevalidate(request, DATA));
  } else if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('index.html')));
  } else if (/\.(js|css|json|html|webmanifest)$/.test(url.pathname)) {
    e.respondWith(networkFirst(request, SHELL));
  } else {
    e.respondWith(staleWhileRevalidate(request, SHELL));
  }
});
