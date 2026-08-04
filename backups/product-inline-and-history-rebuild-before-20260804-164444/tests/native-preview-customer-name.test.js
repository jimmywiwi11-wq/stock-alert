const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');

assert.ok(source.includes('customerName'));
assert.ok(source.includes('printCustomerName'));
assert.ok(source.includes("case 'customerName'"));
assert.ok(source.includes("customername:'customerName'"));
assert.ok(source.includes("buyerName:customerName,customerName"));
assert.ok(source.includes("x.buyerName||x.customerName||x.customerSnapshot?.customerName"));
assert.ok(!source.includes('บริษัท ทดสอบ'));

console.log('native preview customer name passed');
