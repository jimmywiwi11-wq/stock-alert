const assert = require('assert');
const fs = require('fs');
const path = require('path');

const desktop = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'tax-invoice', 'tax_invoice_app.html'), 'utf8');
const adapter = fs.readFileSync(path.join(__dirname, '..', 'modules', 'invoice-generator', 'invoice-history-adapter.js'), 'utf8');
const parent = fs.readFileSync(path.join(__dirname, '..', 'modules', 'cms-integration', 'cms-integration.js'), 'utf8');

assert.ok(parent.includes('V27-NATIVE-EDITOR-WORKFLOW'));
assert.ok(parent.includes('ChokAnanCMSTaxInvoiceHistoryBridge.init'));
assert.ok(desktop.includes('V27-NATIVE-EDITOR-WORKFLOW'));
assert.ok(desktop.includes('TAX_HISTORY_BRIDGE_READY'));
assert.ok(desktop.includes('REQUEST_TAX_INVOICE_HISTORY'));
assert.ok(desktop.includes('TAX_INVOICE_HISTORY_RESPONSE'));
assert.ok(desktop.includes('REQUEST_EMPLOYEE_INVOICE_REQUESTS'));
assert.ok(desktop.includes('REQUEST_MARK_REQUEST_OPENED'));
assert.ok(desktop.includes('REQUEST_MARK_REQUEST_IMPORTED_NATIVE'));
assert.ok(parent.includes('REQUEST_EMPLOYEE_INVOICE_REQUESTS'));
assert.ok(parent.includes('REQUEST_MARK_REQUEST_OPENED'));
assert.ok(parent.includes('REQUEST_MARK_REQUEST_IMPORTED_NATIVE'));
assert.ok(desktop.includes('REQUEST_MARK_INVOICE_PRINTED'));
assert.ok(desktop.includes('MARK_INVOICE_PRINTED_RESULT'));
assert.ok(desktop.includes('TaxInvoiceCMSBridge.markPrinted'));
assert.ok(desktop.includes('TaxInvoiceCMSBridge.markRequestOpened'));
assert.ok(desktop.includes('TaxInvoiceCMSBridge.markRequestImported'));
assert.ok(desktop.includes("showPage('employeeRequests')"));
assert.ok(desktop.includes('loadEmployeeRequestIntoNativeInvoiceEditor'));
assert.ok(desktop.includes('if(!cmsBridgeMode&&window.ChokAnanInvoiceHistoryAdapter'));
assert.ok(adapter.includes('receiveBridgeHistory'));
assert.ok(adapter.includes("parentBridge:taxInvoices"));

console.log('tax invoice iframe parent bridge checks passed');
