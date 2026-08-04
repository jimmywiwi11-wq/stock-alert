const fs = require('fs');
const vm = require('vm');
function createStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), clear:()=>m.clear(), _map:m }; }
function loadUpdateContext(extra={}){
  const html = fs.readFileSync('index.html', 'utf8');
  const start = html.indexOf('/* === V8.03 Update Loop Fix');
  const end = html.indexOf('/* === V7.2 Stable Fixes:', start);
  if (start < 0 || end < 0) throw new Error('update block not found');
  const code = html.slice(start, end);
  const listeners = {};
  const localStorage = extra.localStorage || createStorage();
  const sessionStorage = extra.sessionStorage || createStorage();
  let reloadCount = 0;
  const context = {
    console,
    setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 1; },
    Date,
    URLSearchParams,
    localStorage,
    sessionStorage,
    location: { search: extra.search || '', pathname: '/index.html', replace: () => { reloadCount += 1; } },
    navigator: extra.navigator || { serviceWorker: { addEventListener: (name, fn) => { listeners[name] = fn; }, getRegistration: async () => extra.registration || null, register: async () => extra.registration || null, controller: extra.controller || null } },
    document: extra.document || { hidden: false, addEventListener: () => {}, getElementById: () => null, createElement: () => ({ style: {}, textContent: '' }), body: { appendChild: () => {} } },
    window: {},
    addEventListener: (name, fn) => { listeners['window:'+name] = fn; },
    closeModal: () => {},
    toast: () => {},
    fetch: extra.fetch || (async () => ({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ version: '8.03', label: 'V8.03' }) }))
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'update-block.js' });
  context.__reloadCount = () => reloadCount;
  context.__listeners = listeners;
  return context;
}
module.exports = { loadUpdateContext, createStorage };
