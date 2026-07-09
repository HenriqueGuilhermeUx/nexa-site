const CACHE_NAME = 'nexa-beta-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/portal.html',
  '/pj.html',
  '/merchant.html',
  '/identity.html',
  '/offline.html',
  '/privacidade.html',
  '/termos.html',
  '/lgpd.html',
  '/suporte.html',
  '/excluir-conta.html',
  '/cookies.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/maskable-icon.svg',
  '/apple-touch-icon.svg',
  '/favicon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(() => null))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.hostname.includes('nexa-backend-p2u0.onrender.com')) {
    event.respondWith(fetch(req));
    return;
  }

  event.respondWith(
    fetch(req)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => null);
        return response;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match('/offline.html')))
  );
});
