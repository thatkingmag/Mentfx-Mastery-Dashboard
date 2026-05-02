// Temporary Bypass Service Worker to fix 404 issue
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))))
    .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
