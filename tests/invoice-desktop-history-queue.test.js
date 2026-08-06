const assert = require('assert');
const fs = require('fs');
const path = require('path');

const desktop = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'tax-invoice', 'tax_invoice_app.html'), 'utf8');
const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const adapter = fs.readFileSync(path.join(__dirname, '..', 'modules', 'invoice-generator', 'invoice-history-adapter.js'), 'utf8');

assert.ok(desktop.includes('id="employeeInvoicePrintQueue"'));
assert.ok(desktop.includes('function renderEmployeeInvoicePrintQueue'));
assert.ok(desktop.includes('function employeeInvoiceRows'));
assert.ok(desktop.includes('function printHistoryInvoice'));
assert.ok(/Tax Invoice App V\d+/.test(desktop));
assert.ok(desktop.includes('startup-safe: invoice-history-adapter disabled'));
assert.ok(/invoice-history-adapter\.js\?v=\d+\.\d+/.test(index));
assert.ok(/cms-tax-invoice-history-bridge\.js\?v=\d+\.\d+/.test(index));
assert.ok(/cms-integration\.js\?v=\d+\.\d+/.test(index));
assert.ok(/invoice-generator\.js\?v=\d+\.\d+/.test(index));
assert.ok(desktop.includes('function invoiceActionArg'));
assert.ok(desktop.includes('JSON.stringify(invoiceRecordKey(x))'));
assert.ok(desktop.includes('historyActionButtons(x)'));
assert.ok(desktop.includes('data-history-action="${action}"'));
assert.ok(desktop.includes('data-invoice-key="${escapeHtml(key)}"'));
assert.ok(desktop.includes('renderEmployeeInvoicePrintQueue()'));
assert.ok(!desktop.includes('viewInvoice(${x.id})'));
assert.ok(!desktop.includes('editInvoice(${x.id})'));

assert.ok(adapter.includes('historyRetryTimer'));
assert.ok(adapter.includes('setTimeout'));
assert.ok(adapter.includes('refreshFirestoreHistoryOnce'));
assert.ok(adapter.includes('receiveBridgeHistory'));
assert.ok(adapter.includes('HISTORY_COLLECTIONS'));
assert.ok(desktop.includes('refreshCentralInvoiceHistory'));

console.log('invoice desktop history queue checks passed');
