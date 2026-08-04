const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve(__dirname, '../modules/product-master/product-master-stock-alert.js'), 'utf8');

assert.ok(source.includes('id="needUnitBackV43"'), 'need-unit page must render a visible back button');
assert.ok(source.includes("window.go('productDbPage')"), 'need-unit back button must return to Product / Price page');
assert.ok(source.includes("window.history.pushState({ stockAlertPage: 'needUnitProductPageV43' }"), 'opening need-unit page should create browser history state');
assert.ok(source.includes("window.addEventListener('popstate'"), 'browser back should be handled');
assert.ok(source.includes("page.classList.contains('active')"), 'popstate handler should only act while need-unit page is active');

console.log('need-unit navigation checks passed');
