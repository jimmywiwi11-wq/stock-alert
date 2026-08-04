const assert = require('assert');

const sent = [];
const listeners = [];
global.location = { origin: 'http://127.0.0.1:8765' };
global.addEventListener = (type, handler) => {
  if (type === 'message') listeners.push(handler);
};
global.firebase = { app: () => ({ options: { projectId: 'check-chokanan' } }) };
global.auth = { currentUser: { uid: 'admin-1' } };
global.localStorage = { getItem: key => key === 'stockAlertNickname' ? 'Admin' : null };

const docs = new Map([
  ['taxInvoices/IV009001', {
    invoiceId: 'IV009001',
    invoiceNumber: 'IV009001',
    source: 'employee-request',
    sourceRequestId: 'REQ-9001',
    requestedByUid: 'employee-1',
    customerSnapshot: { customerName: 'Bridge Customer', taxId: '0100000009001' },
    itemsSnapshot: [{ productName: 'Bridge Item', quantity: 1, unit: 'pc', salePrice: 100 }],
    grandTotal: 107,
    invoiceDate: '2026-08-04',
    status: 'ready_to_print',
    printStatus: 'ready_to_print',
    printed: false
  }],
  ['invoiceRequests/REQ-9001', {
    requestId: 'REQ-9001',
    generatedInvoiceIds: ['IV009001'],
    printedInvoiceCount: 0,
    status: 'ready_to_print'
  }]
]);

global.db = {
  collection(collectionName){
    return {
      async get(){
        const rows = [];
        for (const [key, value] of docs.entries()) {
          if (key.startsWith(`${collectionName}/`)) {
            rows.push({ id: key.split('/')[1], data: () => value });
          }
        }
        return { docs: rows };
      },
      onSnapshot(callback){
        this.get().then(callback);
        return () => {};
      },
      doc(id){
        const key = `${collectionName}/${id}`;
        return {
          async get(){ return { exists: docs.has(key), data: () => docs.get(key) }; },
          async set(payload, options){
            docs.set(key, options && options.merge ? { ...(docs.get(key) || {}), ...payload } : payload);
          }
        };
      }
    };
  }
};

const frameWindow = { postMessage: message => sent.push(message) };
const frame = { contentWindow: frameWindow };
const bridge = require('../modules/cms-integration/cms-tax-invoice-history-bridge.js');
bridge.init({ getFrame: () => frame, origin: 'http://127.0.0.1:8765' });

(async () => {
  const refresh = await bridge.refresh();
  assert.strictEqual(refresh.projectId, 'check-chokanan');
  assert.strictEqual(refresh.invoiceCount, 1);
  assert.strictEqual(refresh.employeeInvoiceCount, 1);
  assert.ok(sent.some(message => message.type === 'TAX_INVOICE_HISTORY_RESPONSE'));

  await listeners[0]({
    source: frameWindow,
    origin: 'http://127.0.0.1:8765',
    data: { source: 'tax-invoice-app', type: 'REQUEST_MARK_INVOICE_PRINTED', payload: { requestKey: 'print-1', invoiceId: 'IV009001', requestId: 'REQ-9001', confirmation: true } }
  });

  assert.strictEqual(docs.get('taxInvoices/IV009001').printStatus, 'printed');
  assert.strictEqual(docs.get('invoiceRequests/REQ-9001').status, 'printed');
  assert.ok(sent.some(message => message.type === 'MARK_INVOICE_PRINTED_RESULT' && message.payload.ok === true && message.payload.requestKey === 'print-1'));
  console.log('cms tax invoice history bridge checks passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
