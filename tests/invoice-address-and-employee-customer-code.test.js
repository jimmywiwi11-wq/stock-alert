const assert = require('assert');
const fs = require('fs');

const taxInvoiceSource = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
const requestSource = fs.readFileSync('modules/invoice-request/invoice-request.js', 'utf8');

assert.ok(taxInvoiceSource.includes('function isCustomerAddressObject'), 'full-tax preview should identify customer address objects');
assert.ok(taxInvoiceSource.includes('invoice-address-object'), 'customer address objects should get a dedicated class');
assert.ok(taxInvoiceSource.includes('white-space:pre-wrap!important'), 'invoice customer address must wrap preserved line breaks');
assert.ok(taxInvoiceSource.includes('overflow-wrap:anywhere!important'), 'long invoice customer address should wrap within its object');
assert.ok(taxInvoiceSource.includes('word-break:break-word!important'), 'long invoice customer address should break safely');
assert.ok(taxInvoiceSource.includes('text-overflow:clip!important'), 'invoice customer address must not use ellipsis');
assert.ok(taxInvoiceSource.includes('height:auto!important'), 'invoice customer address must be allowed to grow vertically');
assert.ok(taxInvoiceSource.includes("['buyeraddress','customeraddress','buyeraddress1','buyeraddress2','customeraddress1','customeraddress2']"), 'address wrapping must be scoped to customer address bindings');

const customerCodeStart = requestSource.indexOf('async function customerCodeNow');
const customerCodeEnd = requestSource.indexOf('function newCustomerValue', customerCodeStart);
assert.ok(customerCodeStart > 0 && customerCodeEnd > customerCodeStart, 'employee customer code allocator should exist');
const customerCodeSource = requestSource.slice(customerCodeStart, customerCodeEnd);
assert.ok(customerCodeSource.includes('ChokAnanCustomerMaster.nextCustomerCode'), 'employee customer creation must use customer master code generator');
assert.ok(customerCodeSource.includes("generator(rows, 'CM', 3)"), 'employee customer code should use short CM001-style codes');
assert.ok(customerCodeSource.includes('customerCodeExists'), 'employee customer code should check duplicate codes before saving');
assert.ok(!customerCodeSource.includes('getFullYear'), 'employee customer code should not be timestamp based');
assert.ok(!customerCodeSource.includes('getSeconds'), 'employee customer code should not include seconds');
assert.ok(!customerCodeSource.includes('Math.random'), 'employee customer code should not include random suffixes');
assert.ok(requestSource.includes('const customerCode = await customerCodeNow();'), 'saving a new employee customer should await the allocator');

console.log('invoice address and employee customer code checks passed');
