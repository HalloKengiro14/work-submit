const CACHE_NAME = 'work-submit-app-shell-v1';
const RUNTIME_CACHE = 'work-submit-runtime-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (!currentCaches.includes(key)) return caches.delete(key);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Navigation requests: try network, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Serve precached static assets (cache-first)
  if (PRECACHE_URLS.includes(url.pathname) || ['script','style','image','font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(resp => {
        return caches.open(RUNTIME_CACHE).then(cache => {
          try { cache.put(request, resp.clone()); } catch (e) { /* some requests are opaque and may fail to cache */ }
          return resp;
        });
      }))
    );
    return;
  }

  // Default: network-first with cache fallback
  event.respondWith(
    fetch(request).then(response => {
      return caches.open(RUNTIME_CACHE).then(cache => {
        try { cache.put(request, response.clone()); } catch (e) {}
        return response;
      });
    }).catch(() => caches.match(request))
  );
});
