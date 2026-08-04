const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
const adapter = fs.readFileSync('modules/invoice-generator/invoice-history-adapter.js', 'utf8');

const saveStart = source.indexOf('function saveInvoice(');
const saveEnd = source.indexOf('async function printAndSaveInvoice', saveStart);
const saveBody = source.slice(saveStart, saveEnd);
assert.ok(saveBody.includes("store.set('invoices',a)"), 'native save must still write local history immediately');
assert.ok(saveBody.includes('renderHistory();'), 'native save must render history after local save');
assert.ok(source.includes('function desktopHistoryRows(){return window.ChokAnanInvoiceHistoryAdapter'), 'desktop history must read unified rows when adapter is available');
assert.ok(adapter.includes("sourceCollection: row.sourceCollection || 'localStorage:invoices'"), 'unified history must include local invoices after save');

console.log('native history reader after save static passed');
