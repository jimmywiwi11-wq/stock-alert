const CACHE_NAME='stock-alert-v7-1-controlled-update';
const ASSETS=['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).catch(()=>{}));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(url.pathname.endsWith('/version.json')){
    e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>new Response(JSON.stringify({version:'7.1',label:'V7.1',offline:true}),{headers:{'Content-Type':'application/json'}})));
    return;
  }
  if(e.request.mode==='navigate'){
    e.respondWith(caches.match('./index.html').then(cached=>cached||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put('./index.html',copy));return res;})).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{try{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));}catch(e){} return res;})));
});
