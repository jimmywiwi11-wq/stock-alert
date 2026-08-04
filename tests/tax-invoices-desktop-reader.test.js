const assert = require('assert');

const memory = new Map();
global.localStorage = {
  getItem(key){ return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value){ memory.set(key, String(value)); },
  removeItem(key){ memory.delete(key); }
};

const adapter = require('../modules/invoice-generator/invoice-history-adapter.js');

global.db = {
  collection(name){
    return {
      async get(){
        return {
          docs: name === 'taxInvoices' ? [{
            id: 'IV000777',
            data: () => ({
              invoiceId: 'IV000777',
              invoiceNumber: 'IV000777',
              source: 'employee-request',
              sourceRequestId: 'REQ-777',
              requestedByUid: 'employee-1',
              customerSnapshot: { customerName: 'Direct Tax Invoice Customer', taxId: '0100000000777' },
              itemsSnapshot: [{ productName: 'Direct Item', quantity: 1, unit: 'pc', salePrice: 777 }],
              grandTotal: 777,
              invoiceDate: '2026-08-04',
              status: 'ready_to_print',
              printStatus: 'ready_to_print'
            })
          }] : []
        };
      }
    };
  }
};

(async () => {
  assert.strictEqual(adapter.PRIMARY_INVOICE_COLLECTION, 'taxInvoices');
  assert.strictEqual(adapter.DESKTOP_HISTORY_BUILD, 'V31-LAYOUT-DELETE-ALL');
  assert.strictEqual(typeof adapter.loadTaxInvoicesFromFirestore, 'function');
  assert.strictEqual(typeof adapter.subscribeTaxInvoices, 'function');
  assert.strictEqual(typeof adapter.normalizeTaxInvoiceForDesktop, 'function');

  const loaded = await adapter.loadTaxInvoicesFromFirestore();
  assert.strictEqual(loaded.ok, true);
  assert.strictEqual(loaded.primaryCount, 1);
  assert.strictEqual(loaded.rows[0].sourceCollection, 'taxInvoices');
  assert.strictEqual(loaded.rows[0].no, 'IV000777');
  assert.strictEqual(adapter.getUnifiedHistoryRows()[0].buyerName, 'Direct Tax Invoice Customer');
  console.log('taxInvoices desktop reader checks passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
