const assert = require('assert');

const memory = new Map();
global.localStorage = {
  getItem(key){ return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value){ memory.set(key, String(value)); },
  removeItem(key){ memory.delete(key); }
};

require('../modules/invoice-generator/invoice-print-service.js');
const adapter = require('../modules/invoice-generator/invoice-history-adapter.js');

const writes = [];
const docs = new Map([
  ['taxInvoices/IV001001', { invoiceId: 'IV001001', invoiceNumber: 'IV001001', sourceRequestId: 'REQ-1001', printed: false }],
  ['taxInvoices/IV001002', { invoiceId: 'IV001002', invoiceNumber: 'IV001002', sourceRequestId: 'REQ-1001', printed: false }],
  ['invoiceRequests/REQ-1001', { requestId: 'REQ-1001', generatedInvoiceIds: ['IV001001', 'IV001002'], printedInvoiceCount: 0, status: 'ready_to_print' }]
]);

global.db = {
  collection(collectionName){
    return {
      async get(){ return { docs: [] }; },
      doc(id){
        const key = `${collectionName}/${id}`;
        return {
          async get(){ return { exists: docs.has(key), data: () => docs.get(key) }; },
          async set(payload, options){
            writes.push({ collectionName, id, payload, options });
            docs.set(key, options && options.merge ? { ...(docs.get(key) || {}), ...payload } : payload);
          }
        };
      }
    };
  }
};

(async () => {
  await adapter.markPrinted({ invoiceId: 'IV001001', sourceRequestId: 'REQ-1001', printCount: 0 }, { by: 'desktop', uid: 'admin-1' });
  assert.ok(writes.some(row => row.collectionName === 'taxInvoices' && row.id === 'IV001001' && row.payload.printStatus === 'printed'));
  assert.ok(!writes.some(row => row.collectionName === 'taxInvoiceHistory'));
  assert.ok(!writes.some(row => row.collectionName === 'invoices'));
  const partial = writes.find(row => row.collectionName === 'invoiceRequests' && row.id === 'REQ-1001');
  assert.strictEqual(partial.payload.status, 'partially_printed');
  assert.strictEqual(partial.payload.printStatus, 'partially_printed');

  await adapter.markPrinted({ invoiceId: 'IV001002', sourceRequestId: 'REQ-1001', printCount: 0 }, { by: 'desktop', uid: 'admin-1' });
  const requestWrites = writes.filter(row => row.collectionName === 'invoiceRequests' && row.id === 'REQ-1001');
  assert.strictEqual(requestWrites[requestWrites.length - 1].payload.status, 'printed');
  assert.strictEqual(requestWrites[requestWrites.length - 1].payload.printStatus, 'printed');
  assert.strictEqual(requestWrites[requestWrites.length - 1].payload.printedInvoiceCount, 2);

  console.log('invoice print status sync checks passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
