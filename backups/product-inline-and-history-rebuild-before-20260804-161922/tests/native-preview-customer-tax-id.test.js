const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');

assert.ok(source.includes('customerTaxId'));
assert.ok(source.includes('printCustomerTaxId'));
assert.ok(source.includes("case 'customerTaxId'"));
assert.ok(source.includes("customertaxid:'customerTaxId'"));
assert.ok(source.includes("String(buyerTax.value||'')"));
assert.ok(source.includes("String(x.buyerTax||x.customerTaxId||x.taxId||x.customerSnapshot?.taxId||'')"));
assert.ok(!source.includes('Number(buyerTax'));

console.log('native preview customer tax id passed');
