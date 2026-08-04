const assert = require('assert');

(async () => {
  const memory = new Map();
  global.localStorage = {
    getItem(key){ return memory.has(key) ? memory.get(key) : null; },
    setItem(key, value){ memory.set(key, String(value)); },
    removeItem(key){ memory.delete(key); }
  };

  require('../modules/invoice-generator/invoice-number-format.js');
  require('../modules/invoice-generator/invoice-number-service.js');
  require('../modules/invoice-generator/invoice-print-service.js');
  const adapter = require('../modules/invoice-generator/invoice-history-adapter.js');

  const invoice = adapter.historyToDesktopInvoice({
    invoiceId: 'inv-1',
    invoiceNumber: 'IV000115',
    sourceRequestId: 'req-1',
    requestedByUid: 'employee-1',
    customerSnapshot: { customerName: 'ABC Co', taxId: '0123456789012', address1: 'Main' },
    itemsSnapshot: [{ productCode: 'P1', productName: 'Paint', quantity: 2, unit: 'can', salePrice: 100, lineSubtotal: 200 }],
    beforeVat: 200,
    vatAmount: 14,
    grandTotal: 214,
    createdAt: '2026-08-04T01:00:00.000Z'
  });
  assert.strictEqual(invoice.no, 'IV000115');
  assert.strictEqual(invoice.buyerName, 'ABC Co');
  assert.strictEqual(invoice.items[0].name, 'Paint');
  assert.strictEqual(invoice.sourceRequestId, 'req-1');

  adapter.mergeLocalInvoices([invoice]);
  adapter.mergeLocalInvoices([{ ...invoice, buyerName: 'ABC Co Updated' }]);
  assert.strictEqual(adapter.readLocalInvoices().filter(row => row.invoiceId === 'inv-1').length, 1);

  const writes = [];
  const docs = new Map([
    ['invoiceRequests/req-1', {
      generatedInvoiceIds: ['inv-1'],
      printedInvoiceCount: 0,
      status: 'พร้อมพิมพ์'
    }],
    ['taxInvoices/inv-1', { invoiceId: 'inv-1', printed: true }]
  ]);
  global.db = {
    collection(collectionName){
      return {
        doc(id){
          const key = `${collectionName}/${id}`;
          return {
            async get(){
              return { exists: docs.has(key), data: () => docs.get(key) };
            },
            async set(payload, options){
              writes.push({ collectionName, id, payload, options });
              docs.set(key, { ...(docs.get(key) || {}), ...payload });
            }
          };
        }
      };
    }
  };

  const result = await adapter.markPrinted(invoice, { by: 'desktop', uid: 'admin-1' });
  assert.strictEqual(result.ok, true);
  assert.ok(writes.some(row => row.collectionName === 'taxInvoices' && row.id === 'inv-1' && row.payload.printed === true));
  const requestWrite = writes.find(row => row.collectionName === 'invoiceRequests' && row.id === 'req-1');
  assert.strictEqual(requestWrite.payload.status, 'พิมพ์แล้ว');
  assert.strictEqual(requestWrite.payload.printedInvoiceCount, 1);

  docs.set('invoiceNumberCounters/IV', { lastSequence: 115 });
  global.db.runTransaction = async callback => callback({
    async get(ref){
      const key = `${ref.collectionName}/${ref.id}`;
      return { exists: docs.has(key), data: () => docs.get(key) };
    },
    set(ref, payload, options){
      const key = `${ref.collectionName}/${ref.id}`;
      writes.push({ collectionName: ref.collectionName, id: ref.id, payload, options });
      docs.set(key, { ...(docs.get(key) || {}), ...payload });
    }
  });
  global.db.collection = function(collectionName){
    return {
      doc(id){
        return {
          collectionName,
          id,
          async get(){
            const key = `${collectionName}/${id}`;
            return { exists: docs.has(key), data: () => docs.get(key) };
          },
          async set(payload, options){
            writes.push({ collectionName, id, payload, options });
            docs.set(`${collectionName}/${id}`, { ...(docs.get(`${collectionName}/${id}`) || {}), ...payload });
          }
        };
      }
    };
  };
  const manualRows = await adapter.syncDesktopManualInvoices([{
    id: 'local-1',
    no: 'LOCAL-OLD',
    buyerName: 'Manual Buyer',
    buyerTax: '1111111111111',
    items: [{ code: 'M1', name: 'Manual Product', qty: 1, unit: 'pc', price: 50 }],
    beforeVat: 50,
    vat: 3.5,
    total: 53.5,
    date: '2026-08-04',
    type: 'ใบกำกับภาษีเต็ม',
    vatMode: 'excluded',
    paperSize: '9x11'
  }], { by: 'desktop', uid: 'admin-1' });
  assert.strictEqual(manualRows[0].no, 'IV000116');
  assert.strictEqual(docs.get('invoiceNumberCounters/IV').lastSequence, 116);
  assert.ok(writes.some(row => row.collectionName === 'taxInvoices' && row.payload.source === 'desktop-manual'));
  assert.ok(writes.some(row => row.collectionName === 'taxInvoiceHistory' && row.payload.invoiceNumber === 'IV000116'));

  console.log('invoice history adapter checks passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
