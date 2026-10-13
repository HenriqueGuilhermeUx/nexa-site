const CACHE_NAME = 'nexa-wallet-v3';
const STATIC_SHELL = [
  '/',
  '/index.html',
  '/portal.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/maskable-icon.svg',
  '/favicon.svg',
  '/nexa-2026.css',
  '/nexa-pwa.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_SHELL).catch(() => null))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key === CACHE_NAME ? null : caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const authenticated = req.headers.has('authorization');

  // Financial/auth APIs are always network-only. Never persist authenticated responses.
  if (
    authenticated ||
    url.hostname.includes('nexa-backend-p2u0.onrender.com') ||
    (sameOrigin && url.pathname.startsWith('/api/'))
  ) {
    event.respondWith(fetch(req));
    return;
  }

  // HTML/app-shell navigation stays network-first so a published version is picked up
  // without the user clearing cache or reinstalling the PWA.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(response => {
          if (response.ok && sameOrigin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => null);
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match('/offline.html');
        })
    );
    return;
  }

  // Cache only version-neutral, same-origin static presentation assets.
  if (
    sameOrigin &&
    /\.(?:css|js|svg|png|jpg|jpeg|webp|woff2?|webmanifest)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then(cached => {
        const network = fetch(req).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => null);
          }
          return response;
        });
        return cached || network;
      })
    );
    return;
  }

  // Cross-origin resources and anything else are not persisted by the PWA.
  event.respondWith(fetch(req));
});
