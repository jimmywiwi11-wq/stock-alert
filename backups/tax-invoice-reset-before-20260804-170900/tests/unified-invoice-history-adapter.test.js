const assert = require('assert');

const memory = new Map();
global.localStorage = {
  getItem(key){ return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value){ memory.set(key, String(value)); },
  removeItem(key){ memory.delete(key); }
};

const adapter = require('../modules/invoice-generator/invoice-history-adapter.js');

const primary = {
  invoiceId: 'IV000123',
  invoiceNumber: 'IV000123',
  source: 'employee-request',
  sourceRequestId: 'REQ-DOC-1',
  requestedByUid: 'employee-1',
  customerSnapshot: { customerName: 'Customer A', taxId: '0100000000001', address1: '1 Main' },
  itemsSnapshot: [{ productCode: 'P1', productName: 'Item A', quantity: 2, unit: 'pc', salePrice: 100 }],
  beforeVat: 200,
  vatAmount: 14,
  grandTotal: 214,
  invoiceDate: '2026-08-04',
  status: 'ready_to_print',
  printStatus: 'ready_to_print'
};

const legacy = {
  id: 'IV000123',
  no: 'IV000123',
  buyerName: 'Old Customer Name',
  total: 214,
  date: '2026-08-04',
  source: 'employee-request',
  sourceRequestId: 'REQ-DOC-1'
};

const merged = adapter.mergeInvoiceHistorySources({
  taxInvoices: [primary],
  taxInvoiceHistory: [{ ...primary, buyerName: 'History Customer' }],
  invoices: [legacy]
});

assert.strictEqual(merged.rows.length, 1);
assert.strictEqual(merged.rows[0].invoiceId, 'IV000123');
assert.strictEqual(merged.rows[0].no, 'IV000123');
assert.strictEqual(merged.rows[0].source, 'employee-request');
assert.strictEqual(merged.rows[0].printStatus, 'ready_to_print');
assert.strictEqual(merged.rows[0].sourceCollection, 'taxInvoices');
assert.strictEqual(merged.duplicates.length, 2);

adapter.writeLocalInvoices([legacy]);
assert.strictEqual(adapter.getUnifiedHistoryRows().filter(row => row.invoiceId === 'IV000123' || row.no === 'IV000123').length, 1);

console.log('unified invoice history adapter checks passed');
