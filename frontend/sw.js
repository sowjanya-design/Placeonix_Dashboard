// Placeonix Hub service worker — v3 (network-only).
// A dashboard must always show fresh data, so this SW deliberately does NOT
// cache anything. It exists only to make the app installable (PWA) and to
// purge any caches left by older caching service workers.

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

// Network-only passthrough — never serve cached/stale content.
self.addEventListener('fetch', function (e) {
  e.respondWith(fetch(e.request));
});
