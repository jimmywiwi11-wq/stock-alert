const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');

assert.ok(source.includes('function mapEmployeeRequestCustomerToNativeInvoice(row)'));
assert.ok(source.includes('customerPrefix'));
assert.ok(source.includes('companyName'));
assert.ok(source.includes('customerAddress'));
assert.ok(source.includes('customerTaxId'));
assert.ok(source.includes('headOffice'));
assert.ok(source.includes('branchNumber'));
assert.ok(source.includes('buyerName.value=c.name||'));
assert.ok(source.includes('buyerTax.value=c.taxId||'));
assert.ok(source.includes('buyerAddress.value=c.address||'));
assert.ok(source.includes('customerSnapshot:c.snapshot||{}'));

console.log('employee request customer native mapping passed');
