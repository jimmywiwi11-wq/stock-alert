const APP_VERSION='8.06';
const APP_VERSION_LABEL='V8.06';
const BUILD_MARKER='V8.06-BUILD-EMPLOYEE-REQUEST-AUTO-INVOICE';
const CACHE_NAME='stock-alert-v8_06-employee-request-auto-invoice-20260806';
const CACHE_PREFIX='stock-alert-';

const APP_SHELL=[
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
  '/version.json',
  '/app.js',
  '/modules/invoice-request/',
  '/modules/customer-master/',
  '/modules/cms-integration/'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(APP_SHELL))
      .catch(error=>console.warn('[sw] precache failed',error))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
      .then(()=>self.clients.matchAll({type:'window',includeUncontrolled:true}))
      .then(clients=>clients.forEach(client=>client.postMessage({type:'APP_UPDATE_READY',version:APP_VERSION})))
  );
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();
  if(event.data&&event.data.type==='CLEAR_APP_CACHE'){
    event.waitUntil(
      caches.keys()
        .then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)).map(key=>caches.delete(key))))
        .then(()=>self.skipWaiting())
    );
  }
});

function patchIndexHtml(html){
  let output=String(html||'');
  output=output
    .replace(/const APP_VERSION='8\.05';/g,`const APP_VERSION='${APP_VERSION}';`)
    .replace(/const APP_VERSION='8\.05\.13';/g,`const APP_VERSION='${APP_VERSION}';`)
    .replace(/const APP_VERSION_LABEL='V8\.05';/g,`const APP_VERSION_LABEL='${APP_VERSION_LABEL}';`)
    .replace(/const APP_VERSION_LABEL='V8\.05\.13';/g,`const APP_VERSION_LABEL='${APP_VERSION_LABEL}';`)
    .replace(/const BUILD_MARKER='V8\.05-BUILD-VERIFY-PER-INVOICE-IV000110';/g,`const BUILD_MARKER='${BUILD_MARKER}';`)
    .replace(/const BUILD_MARKER='V8\.05\.13-EMPLOYEE-APP-V13';/g,`const BUILD_MARKER='${BUILD_MARKER}';`)
    .replace(/navigator\.serviceWorker\.register\('sw\.js\?v=8\.05'\)/g,`navigator.serviceWorker.register('sw.js?v=${APP_VERSION}')`)
    .replace(/navigator\.serviceWorker\.register\('sw\.js\?v=8\.05\.13'\)/g,`navigator.serviceWorker.register('sw.js?v=${APP_VERSION}')`)
    .replace(/V8\.05-BUILD-VERIFY-PER-INVOICE-IV000110/g,BUILD_MARKER)
    .replace(/V8\.05\.13-EMPLOYEE-APP-V13/g,BUILD_MARKER);

  const repairScript=`<script>(function(){try{var v='${APP_VERSION}';window.STOCK_ALERT_APP_VERSION=v;window.STOCK_ALERT_APP_VERSION_LABEL='${APP_VERSION_LABEL}';['stockAlertPendingUpdateVersion','stockAlertUpdateAttemptVersion','stockAlertUpdateAttemptCount','stockAlertLastUpdateAttemptAt','stockAlertLastUpdateError'].forEach(function(k){localStorage.removeItem(k)});sessionStorage.removeItem('stockAlertDismissUpdateVersion');window.addEventListener('load',function(){setTimeout(function(){var title=document.getElementById('updateStatusTitle'),sub=document.getElementById('updateStatusSub'),btn=document.getElementById('appUpdateStatus');if(title)title.textContent='เป็นเวอร์ชันล่าสุดแล้ว';if(sub)sub.textContent='${APP_VERSION_LABEL}';if(btn){btn.classList.remove('hasUpdate','checking');btn.classList.add('latest')}} ,300)}, {once:true});}catch(e){}})();<\/script>`;
  if(output.includes('</body>'))output=output.replace('</body>',repairScript+'</body>');
  else output+=repairScript;
  return output;
}

async function fetchPatchedNavigation(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(!response||!response.ok)return response;
    const html=await response.text();
    const patched=patchIndexHtml(html);
    const headers=new Headers(response.headers);
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('cache-control','no-store, no-cache, must-revalidate');
    const result=new Response(patched,{status:response.status,statusText:response.statusText,headers});
    caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',result.clone())).catch(()=>{});
    return result;
  }catch(error){
    const cached=await caches.match('./index.html');
    if(!cached)throw error;
    const html=await cached.text();
    return new Response(patchIndexHtml(html),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
  }
}

function networkFirst(request){
  return fetch(request,{cache:'no-store'}).then(response=>{
    if(response&&response.ok){
      const copy=response.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)).catch(()=>{});
    }
    return response;
  }).catch(()=>caches.match(request));
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(fetchPatchedNavigation(request));
    return;
  }

  if(url.pathname.includes('/desktop/tax-invoice/')){
    event.respondWith(networkFirst(request));
    return;
  }

  if(NETWORK_FIRST_PATHS.some(path=>url.pathname===path||url.pathname.includes(path))){
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached=>cached||fetch(request).then(response=>{
      if(response&&response.ok){
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)).catch(()=>{});
      }
      return response;
    }))
  );
});
