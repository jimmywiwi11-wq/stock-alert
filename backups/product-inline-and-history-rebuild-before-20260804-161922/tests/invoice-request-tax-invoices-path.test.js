const assert = require('assert');
const fs = require('fs');
const path = require('path');

const generator = fs.readFileSync(path.join(__dirname, '..', 'modules', 'invoice-generator', 'invoice-generator.js'), 'utf8');
const store = fs.readFileSync(path.join(__dirname, '..', 'modules', 'invoice-generator', 'invoice-generator-store.js'), 'utf8');

assert.ok(store.includes("const INVOICE_COLLECTION = 'taxInvoices'"));
assert.ok(generator.includes('const invoiceRef = store.ref(db, store.INVOICE_COLLECTION, invoice.invoiceId)'));
assert.ok(generator.includes('transaction.set(invoiceRef, invoice)'));
assert.ok(generator.includes("generationState: 'completed'"));
assert.ok(generator.includes("status: 'ready_to_print'"));
assert.ok(!generator.includes("store.ref(db, 'invoices', invoice.invoiceId)"));
assert.ok(!generator.includes('transaction.set(desktopHistoryRef, legacyInvoiceShape(invoice))'));
assert.ok(!generator.includes("historySource: 'taxInvoiceHistory'"));

console.log('invoice request taxInvoices path checks passed');
