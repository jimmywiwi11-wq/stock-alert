const assert = require('assert');
const fs = require('fs');
const path = require('path');

const js = fs.readFileSync(path.join(__dirname, '..', 'modules', 'invoice-request', 'invoice-request.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'modules', 'invoice-request', 'invoice-request.css'), 'utf8');

assert.ok(js.includes('cmsInvoiceItemCompactV42'));
assert.ok(js.includes('cmsInvoiceItemMenuWrapV42'));
assert.ok(js.includes('toggleItemMenu'));
assert.ok(js.includes('closeItemMenus'));
assert.ok(css.includes('.cmsInvoiceItemMenuV42.show'));

console.log('invoice request compact item checks passed');
