const CACHE_NAME='stock-alert-v8_05-employee-app-v12-20260805-1421';
const CACHE_PREFIX='stock-alert-';
const APP_SHELL=[
  './',
  './index.html',
  './manifest.json',
  './version.json',
  './icons/icon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './app.js',
  './cash-reconciliation.js',
  './vendor/html2canvas.min.js',
  './modules/cms-integration/cms-integration.css',
  './modules/cms-integration/cms-product-adapter.js',
  './modules/cms-integration/cms-invoice-request-status.js',
  './modules/cms-integration/cms-tax-invoice-history-bridge.js',
  './modules/cms-integration/cms-integration.js',
  './modules/product-master/product-master.js',
  './modules/product-master/product-master-stock-alert.js',
  './modules/product-master/product-master-tax-bridge.js',
  './modules/customer-master/customer-master.js',
  './modules/invoice-request/invoice-request.css',
  './modules/invoice-request/invoice-request-store.js',
  './modules/invoice-request/invoice-request-validation.js',
  './modules/invoice-request/invoice-request-customer-search.js',
  './modules/invoice-request/invoice-request-product-search.js',
  './modules/invoice-request/invoice-request-summary.js',
  './modules/invoice-request/invoice-request-sync.js',
  './modules/invoice-request/invoice-request.js'
];

const NETWORK_FIRST_PATHS=[
  '/index.html',
  '/version.json',
  '/app.js',
  '/modules/invoice-request/',
  '/modules/customer-master/',
  '/modules/cms-integration/'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(error => console.warn('[sw] precache failed', error))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_APP_CACHE') {
    event.waitUntil(
      caches.keys()
        .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX)).map(key => caches.delete(key))))
        .then(() => self.skipWaiting())
    );
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type:'window', includeUncontrolled:true }))
      .then(clients => clients.forEach(client => client.postMessage({ type:'APP_UPDATE_READY', cache:CACHE_NAME })))
  );
});

function networkFirst(request){
  return fetch(request, { cache:'no-store' })
    .then(response => {
      if (response && response.ok) {
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(()=>{});
      }
      return response;
    })
    .catch(() => caches.match(request));
}

self.addEventListener('fetch', event => {
  const request=event.request;
  const url=new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.includes('/desktop/tax-invoice/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request).then(response => response || caches.match('./index.html')));
    return;
  }

  if (NETWORK_FIRST_PATHS.some(path => url.pathname === path || url.pathname.includes(path))) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response && response.ok) {
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(()=>{});
      }
      return response;
    }))
  );
});
