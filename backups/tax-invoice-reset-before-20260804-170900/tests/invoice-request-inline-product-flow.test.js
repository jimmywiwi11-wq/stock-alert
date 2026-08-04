const assert = require('assert');
const fs = require('fs');

const js = fs.readFileSync('modules/invoice-request/invoice-request.js', 'utf8');
const css = fs.readFileSync('modules/invoice-request/invoice-request.css', 'utf8');

assert.ok(js.includes('cmsNewProductNameV42'), 'inline row must use the product name field');
assert.ok(js.includes('cmsNewProductQtyV42'), 'inline row must keep quantity in the same flow');
assert.ok(js.includes('cmsNewProductUnitV42'), 'inline row must keep unit in the same flow');
assert.ok(js.includes('cmsNewProductPriceV42'), 'inline row must keep sale price in the same flow');
assert.ok(js.includes('findExactProductByName'), 'existing products must be reused by exact match before creating a new product');
assert.ok(js.includes("createdFrom: 'employee-invoice-request'"), 'new products must be marked as created from employee invoice request');
assert.ok(!js.includes('confirm(`พบสินค้าใกล้เคียง'), 'new product flow must not show the old similar-product confirmation modal');
assert.ok(!js.includes('alert(Object.values(result.errors)[0])'), 'inline validation must not use alert');
assert.ok(js.includes('hideProductSuggestions'), 'product suggestions must have an explicit close path');
assert.ok(js.includes("event.key === 'Escape'"), 'Escape must close product suggestions');
assert.ok(css.includes('.cmsInvoiceSuggestV42.inlineHint'), 'no-match hint must not render as an overlay dropdown');
assert.ok(css.includes('.cmsInvoiceFieldErrorV42'), 'inline field errors must be styled');

console.log('invoice request inline product flow static passed');
