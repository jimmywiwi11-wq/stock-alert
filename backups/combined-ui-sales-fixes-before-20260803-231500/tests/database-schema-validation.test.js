const assert = require('assert');

const PRODUCT_CODE = /^PM\d{5}$/;
const REQUEST_NUMBER = /^REQ-\d{8}-\d{6}$/;
const TAX_ID = /^\d{13}$/;
const REQUEST_STATUS = new Set([
  'กำลังดำเนินการ',
  'สร้างใบกำกับแล้ว',
  'พร้อมพิมพ์',
  'พิมพ์แล้ว',
  'ยกเลิก'
]);

function isNumberOrNull(value){
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function requireFields(row, fields, label){
  for (const field of fields) {
    assert.ok(Object.prototype.hasOwnProperty.call(row, field), `${label} missing ${field}`);
    assert.notStrictEqual(row[field], undefined, `${label} ${field} is undefined`);
  }
}

function validateProduct(row){
  requireFields(row, ['productId', 'productCode', 'productName', 'active', 'createdAt', 'createdBy'], 'product');
  assert.strictEqual(typeof row.productId, 'string');
  assert.ok(PRODUCT_CODE.test(row.productCode), `invalid productCode ${row.productCode}`);
  assert.strictEqual(typeof row.productName, 'string');
  assert.strictEqual(typeof row.active, 'boolean');
  assert.ok(isNumberOrNull(row.salePrice), 'salePrice must be number or null');
  assert.ok(isNumberOrNull(row.costPrice), 'costPrice must be number or null');
}

function validateCustomerSnapshot(row){
  requireFields(row, ['customerName', 'taxId', 'address1'], 'customerSnapshot');
  assert.strictEqual(typeof row.customerName, 'string');
  assert.strictEqual(typeof row.taxId, 'string');
  assert.ok(TAX_ID.test(row.taxId), 'taxId must be a 13 digit string');
}

function validateRequest(row){
  requireFields(row, [
    'requestId', 'requestNumber', 'requestedByUid', 'ownerUid', 'status',
    'generationState', 'generatedInvoiceIds', 'printedInvoiceCount',
    'customerSnapshot', 'items', 'subtotal', 'vatAmount', 'grandTotal'
  ], 'invoiceRequest');
  assert.strictEqual(row.requestId, row.id || row.requestId);
  assert.ok(REQUEST_NUMBER.test(row.requestNumber), `invalid requestNumber ${row.requestNumber}`);
  assert.ok(REQUEST_STATUS.has(row.status), `invalid request status ${row.status}`);
  assert.strictEqual(row.ownerUid, row.requestedByUid, 'ownerUid and requestedByUid should match for employee-created requests');
  assert.ok(Array.isArray(row.generatedInvoiceIds));
  assert.strictEqual(typeof row.printedInvoiceCount, 'number');
  assert.ok(Array.isArray(row.items));
  validateCustomerSnapshot(row.customerSnapshot);
  for (const item of row.items) validateRequestItem(item);
}

function validateRequestItem(row){
  requireFields(row, ['productId', 'productCode', 'productName', 'unit', 'salePrice', 'quantity'], 'requestItem');
  assert.strictEqual(typeof row.productId, 'string');
  assert.strictEqual(typeof row.productCode, 'string');
  assert.strictEqual(typeof row.productName, 'string');
  assert.strictEqual(typeof row.unit, 'string');
  assert.strictEqual(typeof row.salePrice, 'number');
  assert.strictEqual(typeof row.quantity, 'number');
}

function findDuplicates(rows, key){
  const seen = new Set();
  const dupes = new Set();
  for (const row of rows) {
    const value = row[key];
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
}

const fixture = {
  products: [
    {
      productId: 'pm_fixture_1',
      productCode: 'PM00001',
      productName: 'Fixture Product',
      active: true,
      createdAt: 1785763600000,
      createdBy: 'tester',
      salePrice: 120,
      costPrice: null
    }
  ],
  invoiceRequests: [
    {
      requestId: 'req_fixture_1',
      requestNumber: 'REQ-20260803-000001',
      requestedByUid: 'employee-branch-1',
      ownerUid: 'employee-branch-1',
      status: 'กำลังดำเนินการ',
      generationState: 'not-started',
      generatedInvoiceIds: [],
      printedInvoiceCount: 0,
      customerSnapshot: {
        customerName: 'Fixture Customer',
        taxId: '0123456789012',
        address1: '1 Main Road'
      },
      items: [
        {
          productId: 'pm_fixture_1',
          productCode: 'PM00001',
          productName: 'Fixture Product',
          unit: 'pc',
          salePrice: 120,
          quantity: 1
        }
      ],
      subtotal: 120,
      vatAmount: 8.4,
      grandTotal: 128.4
    }
  ]
};

for (const product of fixture.products) validateProduct(product);
for (const request of fixture.invoiceRequests) validateRequest(request);

assert.deepStrictEqual(findDuplicates(fixture.products, 'productCode'), []);
assert.deepStrictEqual(findDuplicates(fixture.invoiceRequests, 'requestNumber'), []);

console.log('database schema validation fixture checks passed');
