const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');

assert.ok(source.includes('function fullTaxShopAddressParts'));
assert.ok(source.includes('shopAddress1'));
assert.ok(source.includes('shopAddress2'));
assert.ok(source.includes("shopaddress:'shopAddress'"));
assert.ok(source.includes("case 'shopAddress'"));
assert.ok(source.includes('splitAddressForInvoiceLines(raw1,raw2)'));
assert.ok(source.includes('base.shopAddress'));

console.log('native preview shop address passed');
