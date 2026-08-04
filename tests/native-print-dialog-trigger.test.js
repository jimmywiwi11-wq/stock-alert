const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
const start = source.indexOf('async function printAndSaveInvoice()');
const end = source.indexOf('function employeeRequestId', start);
assert.ok(start > 0 && end > start, 'printAndSaveInvoice must exist');

const body = source.slice(start, end);
assert.ok(body.includes('let ok=saveInvoice(true,true);'));
assert.ok(body.includes('await printInvoiceRecordsClean(records);'));
assert.ok(body.indexOf('await printInvoiceRecordsClean(records);') > body.indexOf('let records='));
assert.ok(!body.includes('setTimeout(()=>'));

console.log('native print dialog trigger passed');
