const assert = require('assert');
const fs = require('fs');
const sw = fs.readFileSync('sw.js', 'utf8');
assert.ok(sw.includes("event.data && event.data.type === 'SKIP_WAITING'"), 'service worker must listen for SKIP_WAITING');
assert.ok(sw.includes('self.skipWaiting()'), 'service worker must call skipWaiting only after message');
assert.ok(sw.includes('self.clients.claim()'), 'service worker activate must claim clients');
assert.ok(sw.includes("k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME"), 'service worker must delete only app caches');
console.log('service worker skip waiting passed');
