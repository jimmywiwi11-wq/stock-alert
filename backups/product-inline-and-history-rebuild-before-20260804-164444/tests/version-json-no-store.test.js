const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
assert.ok(source.includes("fetch('./version.json?ts='+Date.now(),{cache:'no-store'})"), 'app must fetch version.json with no-store and timestamp');
assert.ok(sw.includes("if (url.pathname.endsWith('/version.json'))"), 'service worker must special-case version.json');
assert.ok(sw.includes("fetch(req, { cache: 'no-store' })"), 'service worker must fetch version.json network/no-store');
assert.ok(!/version.json[sS]{0,300}caches.match/.test(sw), 'version.json must not use cache-first');
console.log('version json no-store passed');
