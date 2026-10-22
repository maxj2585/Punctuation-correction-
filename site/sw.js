// Offline cache for Punctuation Studio. After the first visit the whole app,
// including the engine, loads from this cache when the device is offline.
const VERSION = 'studio-v10';
const CORE = [
  './',
  './index.html',
  './app.js?v=10',
  './worker.js?v=10',
  './punct.js?v=9',
  './engine/harper_wasm.js',
  './engine/harper_wasm_bg.wasm',
  './HARPER-LICENSE.txt',
  './SOURCE.txt'
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(VERSION).then((cache) => cache.put(request, copy));
    }
    return response;
  })));
});
