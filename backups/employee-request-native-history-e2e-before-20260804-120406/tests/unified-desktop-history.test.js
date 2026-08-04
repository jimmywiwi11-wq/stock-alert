const assert = require('assert');

const memory = new Map();
global.localStorage = {
  getItem(key){ return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value){ memory.set(key, String(value)); },
  removeItem(key){ memory.delete(key); }
};

const adapter = require('../modules/invoice-generator/invoice-history-adapter.js');

const primary = {
  invoiceId: 'IV000888',
  invoiceNumber: 'IV000888',
  source: 'employee-request',
  sourceRequestId: 'REQ-888',
  customerSnapshot: { customerName: 'Primary Customer' },
  itemsSnapshot: [{ productName: 'Primary Item', quantity: 1, unit: 'pc', salePrice: 100 }],
  grandTotal: 107,
  invoiceDate: '2026-08-04'
};

const legacy = {
  id: 'IV000888',
  no: 'IV000888',
  buyerName: 'Legacy Customer',
  total: 107,
  date: '2026-08-04',
  sourceCollection: 'localStorage:invoices'
};

const merged = adapter.mergeLegacyAndFirestoreInvoices([primary], {
  'localStorage:invoices': [legacy]
});

assert.strictEqual(merged.rows.length, 1);
assert.strictEqual(merged.rows[0].sourceCollection, 'taxInvoices');
assert.strictEqual(merged.rows[0].buyerName, 'Primary Customer');
assert.strictEqual(merged.duplicates.length, 1);

console.log('unified desktop history checks passed');
