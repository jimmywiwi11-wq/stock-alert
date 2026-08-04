const assert = require('assert');

const memory = new Map();
global.localStorage = {
  getItem(key){ return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value){ memory.set(key, String(value)); },
  removeItem(key){ memory.delete(key); }
};

const adapter = require('../modules/invoice-generator/invoice-history-adapter.js');

function snap(rows){
  return {
    docs: rows.map(row => ({
      id: row.invoiceId || row.requestId,
      data: () => row
    }))
  };
}

const invoice = {
  invoiceId: 'IV000123',
  id: 'IV000123',
  invoiceNumber: 'IV000123',
  no: 'IV000123',
  source: 'employee-request',
  sourceRequestId: 'REQ-EMP-1',
  requestId: 'REQ-EMP-1',
  sourceRequestNumber: 'REQ-20260804-000123',
  requestNumber: 'REQ-20260804-000123',
  requestedByUid: 'employee-1',
  ownerUid: 'employee-1',
  customerSnapshot: { customerName: 'Employee Customer', taxId: '0200000000001', address1: '1 Road' },
  itemsSnapshot: [{ productCode: 'PM00001', productName: 'Employee Item', quantity: 1, unit: 'pc', salePrice: 123 }],
  beforeVat: 123,
  subtotal: 123,
  vatAmount: 8.61,
  grandTotal: 131.61,
  invoiceDate: '2026-08-04',
  status: 'ready_to_print',
  printStatus: 'ready_to_print',
  printed: false
};

const request = {
  requestId: 'REQ-EMP-1',
  requestNumber: 'REQ-20260804-000123',
  generationState: 'completed',
  generated: true,
  generatedInvoiceIds: ['IV000123'],
  status: 'ready_to_print',
  requestedByUid: 'employee-1'
};

const writes = [];
const docs = {
  taxInvoices: { IV000123: { ...invoice } },
  taxInvoiceHistory: {},
  invoices: {},
  invoiceRequests: { 'REQ-EMP-1': { ...request } }
};
global.db = {
  collection(name){
    return {
      get: async () => {
        return snap(Object.values(docs[name] || {}));
      },
      doc(id){
        return {
          get: async () => ({ exists: !!(docs[name] && docs[name][id]), data: () => docs[name][id] }),
          set: async (payload, options) => {
            writes.push({ name, id, payload, options });
            docs[name] = docs[name] || {};
            docs[name][id] = options && options.merge ? { ...(docs[name][id] || {}), ...payload } : payload;
          }
        };
      }
    };
  }
};

(async () => {
  const loaded = await adapter.loadUnifiedInvoiceHistory();
  assert.strictEqual(loaded.ok, true);
  assert.strictEqual(loaded.rows.length, 1);
  assert.strictEqual(loaded.rows[0].invoiceId, 'IV000123');
  assert.strictEqual(loaded.rows[0].sourceCollection, 'taxInvoices');

  const desktopRows = adapter.getUnifiedHistoryRows();
  assert.strictEqual(desktopRows.length, 1);
  assert.strictEqual(desktopRows[0].no, 'IV000123');
  assert.strictEqual(desktopRows[0].source, 'employee-request');

  const diag = await adapter.diagnoseEmployeeInvoiceHistory();
  assert.strictEqual(diag.invoiceRequestsCompleted, 1);
  assert.strictEqual(diag.generatedInvoiceIds, 1);
  assert.strictEqual(diag.taxInvoicesFound, 1);
  assert.strictEqual(diag.rendered, 1);
  assert.ok(diag.duplicates <= 1);
  assert.strictEqual(diag.employeeRequestInvoicesFound, 1);
  assert.strictEqual(adapter.getUnifiedHistoryRows().filter(row => row.no === 'IV000123').length, 1);

  await adapter.markPrinted(desktopRows[0], { by: 'desktop-admin', uid: 'admin-1' });
  assert.ok(writes.some(row => row.name === 'taxInvoices' && row.id === 'IV000123' && row.payload.printed === true));
  assert.ok(!writes.some(row => row.name === 'taxInvoiceHistory' && row.id === 'IV000123' && row.payload.printed === true));
  assert.ok(!writes.some(row => row.name === 'invoices' && row.id === 'IV000123' && row.payload.printed === true));
  assert.ok(writes.some(row => row.name === 'invoiceRequests' && row.id === 'REQ-EMP-1' && row.payload.printStatus === 'printed'));

  console.log('employee invoice desktop history checks passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
