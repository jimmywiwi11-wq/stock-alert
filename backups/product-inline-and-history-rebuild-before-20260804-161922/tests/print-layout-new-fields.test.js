const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');

assert.ok(source.includes('function ensureRequiredFullTaxLayoutFields'));
assert.ok(source.includes("id:'customer_name'"));
assert.ok(source.includes("source:'customerName'"));
assert.ok(source.includes("id:'customer_tax_id'"));
assert.ok(source.includes("source:'customerTaxId'"));
assert.ok(source.includes("id:'shop_address'"));
assert.ok(source.includes("source:'shopAddress'"));
assert.ok(source.includes("id:'shop_address_1'"));
assert.ok(source.includes("id:'shop_address_2'"));
assert.ok(source.includes('normalizeFullTaxLayoutObjects(layout)'));

console.log('print layout new fields passed');
