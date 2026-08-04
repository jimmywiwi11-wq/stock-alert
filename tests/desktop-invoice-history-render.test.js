const assert = require('assert');
const fs = require('fs');
const path = require('path');

const desktop = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'tax-invoice', 'tax_invoice_app.html'), 'utf8');

assert.ok(desktop.includes("window.DESKTOP_TAX_INVOICE_BUILD='V31-LAYOUT-DELETE-ALL'"));
assert.ok(desktop.includes('id="desktopTaxInvoiceRuntimeMarker"'));
assert.ok(desktop.includes('function desktopHistoryRows()'));
assert.ok(desktop.includes('ChokAnanInvoiceHistoryAdapter.getUnifiedHistoryRows'));
assert.ok(desktop.includes('TaxInvoiceCMSBridge.requestRefresh'));
assert.ok(desktop.includes('let all=desktopHistoryRows().filter'));
assert.ok(desktop.includes('function runEmployeeInvoiceHistoryDiagnostics()'));
assert.ok(desktop.includes('diagnoseEmployeeInvoiceHistory'));
assert.ok(desktop.includes("refreshCentralInvoiceHistory('manual-button')"));
assert.ok(desktop.includes('ใบกำกับภาษีจากคำขอพนักงาน'));
assert.ok(desktop.includes('REQUEST_TAX_INVOICE_HISTORY'));
assert.ok(!desktop.includes("let all=store.get('invoices',[]).filter"));

console.log('desktop invoice history render checks passed');
