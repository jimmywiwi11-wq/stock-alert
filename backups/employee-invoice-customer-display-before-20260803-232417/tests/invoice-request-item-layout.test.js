const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'modules/invoice-request/invoice-request.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'modules/invoice-request/invoice-request.js'), 'utf8');

assert.ok(js.includes('cmsInvoiceLineTotalV42'), 'line subtotal needs its own class');
assert.ok(js.includes('cmsInvoiceItemPriceV42'), 'sale price input needs layout class');
assert.ok(js.includes('cmsInvoiceItemQtyV42'), 'quantity input needs layout class');

assert.ok(css.includes('grid-template-columns: 30px minmax(220px,1.7fr) minmax(96px,.75fr) minmax(88px,.7fr) minmax(112px,.85fr) minmax(96px,.75fr) minmax(112px,.85fr) 58px'), 'desktop item row must define 8 stable columns');
assert.ok(css.includes('.cmsInvoiceLineTotalV42'), 'line total CSS must exist');
assert.ok(css.includes('white-space: nowrap'), 'money fields must not wrap digits vertically');
assert.ok(css.includes('text-align: right'), 'money fields should align right');
assert.ok(css.includes('min-width: 112px'), 'line total needs a usable minimum width for 1,250.00 and larger');
assert.strictEqual(/word-break\s*:\s*break-all/.test(css), false, 'item layout must not use break-all');
assert.ok(css.includes('@media (max-width: 719px)'), 'mobile card layout breakpoint should exist');
assert.ok(css.includes('.cmsInvoiceLineTotalV42 { grid-column: span 2; }'), 'mobile total should wrap as a field, not as individual digits');

console.log('invoice request item layout checks passed');
