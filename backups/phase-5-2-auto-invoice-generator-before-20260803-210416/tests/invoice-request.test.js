const assert = require('assert');

(async () => {
  const memory = new Map();
  global.localStorage = {
    getItem(key){ return memory.has(key) ? memory.get(key) : null; },
    setItem(key, value){ memory.set(key, String(value)); },
    removeItem(key){ memory.delete(key); }
  };

  global.CMSProductAdapter = {
    sharedProducts(){
      return [
        { productId: 'p-001', code: '001', name: 'PVC Pipe 2 inch', unit: 'piece', salePrice: 120, costPrice: 80 },
        { productId: 'p-002', code: '002', name: 'PVC Glue', unit: 'can', salePrice: 45, costPrice: 30 },
        { productId: 'p-003', code: '003', name: 'Thread tape', unit: '', salePrice: null, costPrice: 5 }
      ];
    }
  };

  const store = require('../modules/invoice-request/invoice-request-store.js');
  const validation = require('../modules/invoice-request/invoice-request-validation.js');
  const customers = require('../modules/invoice-request/invoice-request-customer-search.js');
  const products = require('../modules/invoice-request/invoice-request-product-search.js');
  const summary = require('../modules/invoice-request/invoice-request-summary.js');
  const sync = require('../modules/invoice-request/invoice-request-sync.js');

  localStorage.setItem('customers', JSON.stringify([
    { code: 'CU001', prefix: 'Company', name: 'ChokAnan Test', address1: '1 Main Road', address2: 'Town', taxId: '0123456789012', phone: '0810000000' },
    { code: 'CU002', prefix: 'Shop', name: 'Cash Customer', address1: 'Market', taxId: '9999999999999' }
  ]));
  localStorage.setItem('products', JSON.stringify([
    { code: 'T001', name: 'White Paint', unit: 'bucket', cost: 300, price: 450 },
    { code: '001', name: 'PVC Pipe 2 inch', unit: 'piece', cost: 80, price: 120 }
  ]));

  assert.strictEqual(store.DRAFT_KEY, 'cms.invoiceRequest.testDrafts');
  assert.strictEqual(store.REQUEST_KEY, 'cms.invoiceRequest.testRequests');
  assert.strictEqual(store.PRODUCTION_DRAFT_KEY, 'cms.invoiceRequest.productionDrafts');
  assert.strictEqual(store.PRODUCTION_REQUEST_KEY, 'cms.invoiceRequest.productionRequests');
  assert.strictEqual(store.PRODUCTION_PENDING_KEY, 'cms.invoiceRequest.productionPending');

  const customerRows = customers.searchCustomers('012345', 5);
  assert.strictEqual(customerRows[0].customerCode, 'CU001');
  assert.strictEqual(customerRows[0].address1, '1 Main Road');

  const productRows = products.searchProducts('PVC', 10);
  assert.strictEqual(productRows.length, 2);
  assert.strictEqual(productRows.filter(row => row.productCode === '001').length, 1);
  assert.strictEqual(products.searchProducts('piece', 10).some(row => row.productName.includes('PVC')), true);

  const validItem = { productName: 'PVC Pipe 2 inch', unit: 'piece', salePrice: '120', quantity: '25' };
  assert.strictEqual(validation.validateItem(validItem).valid, true);
  assert.strictEqual(validation.lineTotal(validItem), 3000);
  assert.strictEqual(validation.validateItem({ ...validItem, quantity: '' }).valid, false);
  assert.strictEqual(validation.validateItem({ ...validItem, salePrice: '0' }).valid, true);

  const requestValidation = validation.validateRequest({
    customer: customerRows[0],
    items: [
      { productCode: '001', productName: 'PVC Pipe 2 inch', unit: 'piece', salePrice: 120, quantity: 1 },
      { productCode: '002', productName: 'PVC Glue', unit: 'can', salePrice: 45, quantity: 2 }
    ]
  });
  assert.strictEqual(requestValidation.valid, true);

  const duplicateValidation = validation.validateRequest({
    customer: customerRows[0],
    items: [
      { productCode: '001', productName: 'PVC Pipe 2 inch', unit: 'piece', salePrice: 120, quantity: 1 },
      { productCode: '001', productName: 'PVC Pipe 2 inch', unit: 'piece', salePrice: 120, quantity: 2 }
    ]
  });
  assert.strictEqual(duplicateValidation.valid, false);
  assert.strictEqual(!!duplicateValidation.itemResults[0].errors.duplicate, true);

  store.saveDraft({ draftId: 'TEST-DRAFT-1', customer: customerRows[0], items: [validItem], testMode: true });
  assert.strictEqual(store.listDrafts().length, 1);
  store.saveRequest({
    requestId: 'TEST-REQ-20260803-0001',
    customer: customerRows[0],
    sender: { nickname: 'tester', branch: 'Branch 1' },
    itemCount: 11,
    expectedInvoiceCount: 2,
    subtotalPreview: 123,
    status: 'กำลังดำเนินการ',
    testMode: true
  });
  assert.strictEqual(store.listRequests()[0].testMode, true);

  store.saveProductionDraft({ draftId: 'DRAFT-1', customerSnapshot: customerRows[0], items: [validItem], testMode: false });
  assert.strictEqual(store.listProductionDrafts().length, 1);
  store.saveProductionRequest({
    requestId: 'REQ-DOC-1',
    requestNumber: 'REQ-20260803-000001',
    customerSnapshot: customerRows[0],
    items: [validItem],
    itemCount: 1,
    status: 'กำลังดำเนินการ',
    testMode: false
  });
  assert.strictEqual(store.listProductionRequests()[0].requestNumber, 'REQ-20260803-000001');

  const vatSummary = summary.summarize([{ salePrice: 100, quantity: 2 }, { salePrice: '50', quantity: '1' }]);
  assert.strictEqual(vatSummary.subtotal, 250);
  assert.strictEqual(vatSummary.vatAmount, 17.5);
  assert.strictEqual(vatSummary.grandTotal, 267.5);
  assert.strictEqual(vatSummary.expectedInvoiceCount, 1);

  const offlineResult = await sync.submit({
    idempotencyKey: 'idem-offline-1',
    customerSnapshot: customerRows[0],
    items: [validItem],
    itemCount: 1,
    status: 'กำลังดำเนินการ'
  });
  assert.strictEqual(offlineResult.offline, true);
  assert.strictEqual(store.listPendingProductionRequests().length, 1);
  assert.strictEqual(store.listProductionRequests()[0].requestNumber, 'PENDING-FIREBASE-SYNC');
  assert.strictEqual(store.listProductionRequests()[0].generationState, 'not-started');

  const productMaster = require('../modules/product-master/product-master.js');
  const remoteWrites = [];
  global.db = {
    collection(name){
      return {
        doc(id){
          return {
            set(payload, options){
              remoteWrites.push({ name, id, payload, options });
              return Promise.resolve();
            }
          };
        }
      };
    }
  };
  const createdA = productMaster.createProduct({ productName: 'Phase 5 Product A', unit: 'pc', salePrice: 10 }, { by: 'tester', branch: 'Branch 1' });
  const createdB = productMaster.createProduct({ productName: 'Phase 5 Product B', unit: 'pc', salePrice: 20 }, { by: 'tester', branch: 'Branch 2' });
  await global.ChokAnanProductMasterLastRemoteWrite;
  assert.notStrictEqual(createdA.productId, createdB.productId);
  assert.notStrictEqual(createdA.productCode, createdB.productCode);
  assert.strictEqual(/^PM\d{5}$/.test(createdA.productCode), true);
  assert.strictEqual(remoteWrites[0].name, 'stock_alert_beta1_products');
  assert.strictEqual(remoteWrites[0].id, createdA.productId);
  assert.strictEqual(remoteWrites[0].payload.createdFrom, 'invoice-request');
  assert.strictEqual(remoteWrites[0].payload.productCode, createdA.productCode);
  assert.strictEqual(remoteWrites[0].payload.costPrice, null);

  assert.strictEqual(memory.has('products'), true);
  assert.strictEqual(memory.has('customers'), true);
  assert.strictEqual(memory.has('invoices'), false);

  console.log('invoice request production and test mode checks passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
