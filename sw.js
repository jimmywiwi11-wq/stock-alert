const CACHE_NAME='stock-alert-v7_80-customer-display';
const APP_SHELL=['./','./index.html','./manifest.json','./icons/icon-32.png','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./app.js','./cash-reconciliation.js','./vendor/html2canvas.min.js','./modules/cms-integration/cms-integration.css','./modules/cms-integration/cms-product-adapter.js','./modules/cms-integration/cms-invoice-request-status.js','./modules/cms-integration/cms-integration.js','./modules/product-master/product-master.js','./modules/product-master/product-master-stock-alert.js','./modules/product-master/product-master-tax-bridge.js','./modules/customer-master/customer-master.js','./modules/invoice-request/invoice-request.css','./modules/invoice-request/invoice-request-store.js','./modules/invoice-request/invoice-request-validation.js','./modules/invoice-request/invoice-request-customer-search.js','./modules/invoice-request/invoice-request-product-search.js','./modules/invoice-request/invoice-request-summary.js','./modules/invoice-request/invoice-request-sync.js','./modules/invoice-generator/invoice-number-format.js','./modules/invoice-generator/invoice-chunk-service.js','./modules/invoice-generator/invoice-vat-service.js','./modules/invoice-generator/invoice-generation-validation.js','./modules/invoice-generator/invoice-history-adapter.js','./modules/invoice-generator/invoice-number-service.js','./modules/invoice-generator/invoice-generation-lock.js','./modules/invoice-generator/invoice-number-reservation.js','./modules/invoice-generator/invoice-generation-audit.js','./modules/invoice-generator/invoice-preview-service.js','./modules/invoice-generator/invoice-print-service.js','./modules/invoice-generator/invoice-status-service.js','./modules/invoice-generator/invoice-generator-store.js','./modules/invoice-generator/invoice-generator.js','./modules/invoice-request/invoice-request.js'];

// Do NOT call skipWaiting here. This keeps future versions from replacing the current app
// until the user presses the in-app update button.
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(()=>{}));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Always check the latest version file from the server.
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() =>
        new Response(JSON.stringify({ version:'7.80', label:'V7.80', offline:true }), {
          headers: { 'Content-Type':'application/json' }
        })
      )
    );
    return;
  }

  // Phase 3 CMS test: keep Tax Invoice in its own document context.
  // The Stock Alert app-shell fallback must not replace iframe navigations
  // under desktop/tax-invoice with index.html.
  if (url.pathname.includes('/desktop/tax-invoice/')) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Keep the current app shell until the user chooses to update.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
        return res;
      }))
    );
    return;
  }

  // Static files: cache first, then network fallback.
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      try {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      } catch(e) {}
      return res;
    }))
  );
});
