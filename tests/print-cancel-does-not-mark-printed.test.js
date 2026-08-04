const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
const start = source.indexOf('function markRecordsPrintedAfterConfirmation');
const end = source.indexOf('async function printInvoiceRecordsClean', start);
const body = source.slice(start, end);

assert.ok(body.includes('let ok=confirm('), 'print completion must require explicit confirmation');
assert.ok(body.indexOf('if(!ok)return;') < body.indexOf('TaxInvoiceCMSBridge.markPrinted'), 'parent bridge mark printed must happen only after confirmation');
assert.ok(body.indexOf('if(!ok)return;') < body.indexOf('ChokAnanInvoiceHistoryAdapter.markPrinted'), 'adapter mark printed must happen only after confirmation');
assert.ok(body.indexOf('if(!ok)return;') < body.indexOf('done();'), 'local printed state must happen only after confirmation');

console.log('print cancel does not mark printed static passed');
