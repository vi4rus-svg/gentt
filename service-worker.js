/* Auto-optimized SW */
const CACHE = 'tiktok-generator-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles/style.css',
  './scripts/app.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))  
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // Prefer network, fallback to cache
  event.respondWith(
    fetch(req).then(res => {
      const resClone = res.clone();
      caches.open(CACHE).then(cache => cache.put(req, resClone)).catch(() => {});
      return res;
    }).catch(() => caches.match(req))
  );
});
