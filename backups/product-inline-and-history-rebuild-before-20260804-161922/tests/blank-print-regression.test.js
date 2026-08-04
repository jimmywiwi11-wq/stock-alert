const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
const start = source.indexOf('async function printInvoiceRecordsClean');
const end = source.indexOf('function renderInvoicePreview', start);
assert.ok(start > 0 && end > start, 'printInvoiceRecordsClean must exist');
const body = source.slice(start, end);

assert.ok(body.includes('let printHtml='));
assert.ok(body.includes('assertInvoiceReadyForPrint(records,printHtml)'));
assert.ok(body.includes('invoicePreview.innerHTML=printHtml'));
assert.ok(body.includes('assertInvoiceReadyForPrint(records,invoicePreview.innerHTML)'));
assert.ok(body.indexOf('invoicePreview.innerHTML=printHtml') < body.indexOf('window.print();'));
assert.ok(body.indexOf('assertInvoiceReadyForPrint(records,invoicePreview.innerHTML)') < body.indexOf('window.print();'));

console.log('blank print regression passed');
