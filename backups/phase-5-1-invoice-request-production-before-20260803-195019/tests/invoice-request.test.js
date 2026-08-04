const assert = require('assert');

const memory = new Map();
global.localStorage = {
  getItem(key){ return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value){ memory.set(key, String(value)); },
  removeItem(key){ memory.delete(key); }
};

global.CMSProductAdapter = {
  sharedProducts(){
    return [
      { productId: 'p-001', code: '001', name: 'ท่อ PVC 2 นิ้ว', unit: 'เส้น', salePrice: 120, costPrice: 80 },
      { productId: 'p-002', code: '002', name: 'กาวทาท่อ PVC', unit: 'กระป๋อง', salePrice: 45, costPrice: 30 },
      { productId: 'p-003', code: '003', name: 'เทปพันเกลียว', unit: '', salePrice: null, costPrice: 5 }
    ];
  }
};

const store = require('../modules/invoice-request/invoice-request-store.js');
const validation = require('../modules/invoice-request/invoice-request-validation.js');
const customers = require('../modules/invoice-request/invoice-request-customer-search.js');
const products = require('../modules/invoice-request/invoice-request-product-search.js');

localStorage.setItem('customers', JSON.stringify([
  { code: 'CU001', prefix: 'บริษัท', name: 'โชคอนันต์ ทดสอบ', address1: '1 ถนนหลัก', address2: 'เมือง', taxId: '0123456789012', phone: '0810000000' },
  { code: 'CU002', prefix: 'ร้าน', name: 'ลูกค้าเงินสด', address1: 'ตลาด', taxId: '9999999999999' }
]));
localStorage.setItem('products', JSON.stringify([
  { code: 'T001', name: 'สีขาว', unit: 'ถัง', cost: 300, price: 450 },
  { code: '001', name: 'ท่อ PVC 2 นิ้ว', unit: 'เส้น', cost: 80, price: 120 }
]));

assert.strictEqual(store.DRAFT_KEY, 'cms.invoiceRequest.testDrafts');
assert.strictEqual(store.REQUEST_KEY, 'cms.invoiceRequest.testRequests');

const customerRows = customers.searchCustomers('012345', 5);
assert.strictEqual(customerRows[0].customerCode, 'CU001');
assert.strictEqual(customerRows[0].address1, '1 ถนนหลัก');

const productRows = products.searchProducts('PVC', 10);
assert.strictEqual(productRows.length, 2);
assert.strictEqual(productRows.filter(row => row.productCode === '001').length, 1);
assert.strictEqual(products.searchProducts('เส้น', 10).some(row => row.productName.includes('ท่อ')), true);

const validItem = { productName: 'ท่อ PVC 2 นิ้ว', unit: 'เส้น', salePrice: '120', quantity: '25' };
assert.strictEqual(validation.validateItem(validItem).valid, true);
assert.strictEqual(validation.lineTotal(validItem), 3000);
assert.strictEqual(validation.validateItem({ ...validItem, quantity: '' }).errors.quantity, 'กรุณาระบุจำนวน');
assert.strictEqual(validation.validateItem({ ...validItem, salePrice: '0' }).valid, true);

const requestValidation = validation.validateRequest({
  customer: customerRows[0],
  items: [
    { productCode: '001', productName: 'ท่อ PVC 2 นิ้ว', unit: 'เส้น', salePrice: 120, quantity: 1 },
    { productCode: '002', productName: 'กาวทาท่อ PVC', unit: 'กระป๋อง', salePrice: 45, quantity: 2 }
  ]
});
assert.strictEqual(requestValidation.valid, true);

const duplicateValidation = validation.validateRequest({
  customer: customerRows[0],
  items: [
    { productCode: '001', productName: 'ท่อ PVC 2 นิ้ว', unit: 'เส้น', salePrice: 120, quantity: 1 },
    { productCode: '001', productName: 'ท่อ PVC 2 นิ้ว', unit: 'เส้น', salePrice: 120, quantity: 2 }
  ]
});
assert.strictEqual(duplicateValidation.valid, false);
assert.strictEqual(duplicateValidation.itemResults[0].errors.duplicate, 'พบสินค้าซ้ำในคำขอนี้');

store.saveDraft({ draftId: 'TEST-DRAFT-1', customer: customerRows[0], items: [validItem], testMode: true });
assert.strictEqual(store.listDrafts().length, 1);

store.saveRequest({
  requestId: 'TEST-REQ-20260803-0001',
  customer: customerRows[0],
  sender: { nickname: 'tester', branch: 'สาขา 1' },
  itemCount: 11,
  expectedInvoiceCount: 2,
  subtotalPreview: 123,
  status: 'กำลังดำเนินการ',
  testMode: true
});
assert.strictEqual(store.listRequests()[0].status, 'กำลังดำเนินการ');
assert.strictEqual(memory.has('products'), true);
assert.strictEqual(memory.has('customers'), true);
assert.strictEqual(memory.has('invoices'), false);

console.log('invoice request test mode checks passed');
