const CACHE_NAME='stock-alert-v7_8-controlled-update';
const APP_SHELL=['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png','./app.js'];

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

  // Always check the latest version file from the server.
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() =>
        new Response(JSON.stringify({ version:'7.8', label:'V7.8', offline:true }), {
          headers: { 'Content-Type':'application/json' }
        })
      )
    );
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
