const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');

assert.ok(source.includes('lastEmployeeNativeSyncPromise=syncSavedInvoiceRecordsToCentral(created,{force:true})'), 'split save must sync employee invoices through the same central path');
assert.ok(source.includes('lastEmployeeNativeSyncPromise=syncSavedInvoiceRecordsToCentral(lastSavedInvoiceRecords,{force:true})'), 'single save must sync employee invoices through the same central path');
assert.ok(source.includes('NativeInvoiceRepository.save'), 'central sync must upsert through NativeInvoiceRepository');
assert.ok(source.includes("await db.collection('taxInvoices').doc(invoiceId).set"), 'direct Firestore fallback must write taxInvoices');
assert.ok(source.includes("await db.collection('invoiceRequests').doc(employeeNativeImportContext.sourceRequestId).set"), 'save must update the source invoiceRequests document');
assert.ok(source.includes("status:'ready_to_print',printStatus:'ready_to_print'"), 'save must leave employee requests ready to print, not printed');

console.log('employee request native save history static passed');
