const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'modules', 'invoice-request', 'invoice-request.js'), 'utf8');

assert.ok(html.includes('cmsInvoiceProductEntryRowV42'));
assert.ok(html.includes('cmsNewProductNameV42'));
assert.ok(html.includes('id="cmsNewProductNameV42" oncompositionstart='));
assert.ok(html.includes('onkeydown="CMSInvoiceRequest.productSearchKey(event)"'));
assert.ok(html.includes('id="cmsProductSuggestV42"'));
assert.ok(html.includes('cmsNewProductQtyV42'));
assert.ok(html.includes('cmsNewProductUnitV42'));
assert.ok(html.includes('cmsNewProductPriceV42'));
assert.ok(html.includes('cmsInvoiceAddProductV42'));
assert.ok(!html.includes('เพิ่มสินค้าใหม่เข้า Product Master'));

console.log('invoice request product row checks passed');
