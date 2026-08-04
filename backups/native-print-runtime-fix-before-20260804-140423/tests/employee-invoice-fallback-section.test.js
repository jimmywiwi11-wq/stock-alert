const assert = require('assert');
const fs = require('fs');
const path = require('path');

const desktop = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'tax-invoice', 'tax_invoice_app.html'), 'utf8');

assert.ok(desktop.includes('function renderEmployeeInvoicePrintQueue()'));
assert.ok(desktop.includes('ใบกำกับภาษีจากคำขอพนักงาน'));
assert.ok(desktop.includes('อ่านจากฐานกลาง taxInvoices โดยตรง'));
assert.ok(desktop.includes('employeeInvoiceRows()'));
assert.ok(desktop.includes('historyActionButtons(x)'));
assert.ok(desktop.includes('ChokAnanInvoiceHistoryAdapter.subscribeTaxInvoices'));

console.log('employee invoice fallback section checks passed');
