const assert = require('assert');
const fs = require('fs');
const path = require('path');

const js = fs.readFileSync(path.join(__dirname, '..', 'modules', 'invoice-request', 'invoice-request.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'modules', 'invoice-request', 'invoice-request.css'), 'utf8');

assert.ok(js.includes('cmsInvoicePreviewShopV42'));
assert.ok(js.includes('cmsInvoicePreviewPaperV42'));
assert.ok(js.includes('cmsInvoicePreviewRightMetaV42'));
assert.ok(js.includes('cmsInvoicePreviewWordsV42'));
assert.ok(js.includes('thaiBahtTextLocal'));
assert.ok(js.includes('buyerAddress'));
assert.ok(js.includes('shopTax ?'));
assert.ok(js.includes('!requestIsReady(row) && !requestIsPrinted(row)'));
assert.ok(css.includes('overflow-x: hidden'));
assert.ok(css.includes('touch-action: pan-y'));
assert.ok(css.includes('border-radius: 0'));
assert.ok(css.includes('cmsInvoicePreviewPaperV42'));
assert.ok(!js.includes('<div class="head">สินค้า</div>'));
assert.ok(!js.includes('download='));
assert.ok(!js.includes('navigator.share'));

console.log('invoice mobile preview checks passed');
