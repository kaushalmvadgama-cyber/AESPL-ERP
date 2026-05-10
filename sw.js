const CACHE_NAME = 'aespl-cache-v1';
const urlsToCache = [
  './index.html',
  './styles.css',
  './js/db.js',
  './js/utils.js',
  './js/sync.js',
  './js/pages/dashboard.js',
  './js/pages/entrybook.js',
  './js/pages/masters.js',
  './js/pages/products.js',
  './js/pages/sales.js',
  './js/pages/purchase.js',
  './js/pages/bank.js',
  './js/pages/finance.js',
  './js/pages/operations.js',
  './js/pages/extras.js',
  './js/app.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
