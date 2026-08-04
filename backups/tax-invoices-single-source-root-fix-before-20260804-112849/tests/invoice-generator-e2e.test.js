const assert = require('assert');

require('../modules/invoice-generator/invoice-number-format.js');
require('../modules/invoice-generator/invoice-chunk-service.js');
require('../modules/invoice-generator/invoice-vat-service.js');
require('../modules/invoice-generator/invoice-generation-validation.js');
require('../modules/invoice-generator/invoice-history-adapter.js');
require('../modules/invoice-generator/invoice-number-service.js');
require('../modules/invoice-generator/invoice-generation-lock.js');
require('../modules/invoice-generator/invoice-number-reservation.js');
require('../modules/invoice-generator/invoice-generation-audit.js');
require('../modules/invoice-generator/invoice-preview-service.js');
require('../modules/invoice-generator/invoice-print-service.js');
require('../modules/invoice-generator/invoice-status-service.js');
require('../modules/invoice-generator/invoice-generator-store.js');
require('../modules/invoice-generator/invoice-generator.js');

const generator = globalThis.ChokAnanInvoiceGenerator;
const preview = globalThis.ChokAnanInvoicePreviewService;
const print = globalThis.ChokAnanInvoicePrintService;

function request(count){
  const itemSnapshots = Array.from({ length: count }, (_, index) => ({
    requestItemId: `item-${count}-${index + 1}`,
    productId: `product-${index + 1}`,
    productCode: `PM${String(index + 1).padStart(5, '0')}`,
    productName: `E2E Product ${index + 1}`,
    quantity: 1,
    unit: 'ชิ้น',
    salePrice: 100 + index
  }));
  return {
    requestId: `req-e2e-${count}`,
    requestNumber: `REQ-20260803-${String(count).padStart(6, '0')}`,
    status: 'กำลังดำเนินการ',
    generationState: 'not-started',
    testMode: false,
    ownerUid: 'employee-e2e',
    requestedByUid: 'employee-e2e',
    requestedBranch: 'สาขา 1',
    customerSnapshot: { customerId: 'cust-e2e', customerName: 'E2E Customer', taxId: '0105559999999' },
    invoiceSettings: { invoiceType: 'full-tax-invoice', paperSize: '9x11', vatMode: 'exclusive', vatRate: 7, itemsPerInvoice: 10 },
    itemSnapshots,
    itemCount: itemSnapshots.length,
    generatedInvoiceIds: [],
    printedInvoiceCount: 0
  };
}

function runCase(count, currentLastSequence){
  const req = request(count);
  const plan = generator.buildPlan(req, currentLastSequence, { uid: 'admin-e2e', by: 'Admin E2E' });
  const expectedCount = Math.ceil(count / 10);
  assert.strictEqual(plan.invoices.length, expectedCount, `invoice count for ${count}`);
  assert.strictEqual(plan.invoices.reduce((sum, invoice) => sum + invoice.itemsSnapshot.length, 0), count);
  plan.invoices.forEach(invoice => {
    assert.ok(invoice.itemsSnapshot.length <= 10);
    assert.strictEqual(invoice.paperSize, '9x11');
    assert.strictEqual(invoice.vatMode, 'exclusive');
    assert.strictEqual(invoice.vatRate, 7);
    assert.strictEqual(invoice.printed, false);
  });
  const mobile = preview.requestPreviewPayload(req, plan.invoices);
  assert.strictEqual(mobile.readOnly, true);
  assert.strictEqual(mobile.invoiceCount, expectedCount);
  assert.strictEqual(mobile.batchVatAmount, plan.batch.vatAmount);
  return plan;
}

let last = 0;
[1, 10, 11, 25, 30, 50].forEach(count => {
  const plan = runCase(count, last);
  last = plan.reservation.endSequence;
});

const retryA = generator.buildPlan(request(11), 500, { uid: 'admin-e2e', by: 'Admin E2E' });
const retryB = generator.buildPlan(request(11), 500, { uid: 'admin-e2e', by: 'Admin E2E' });
assert.deepStrictEqual(retryA.invoices.map(invoice => invoice.invoiceNumber), retryB.invoices.map(invoice => invoice.invoiceNumber));

const printed = retryA.invoices.map(invoice => print.markInvoicePrinted(invoice, { uid: 'admin-e2e', by: 'Admin E2E' }));
assert.strictEqual(print.printBatchStatus(printed).status, 'printed');
assert.strictEqual(print.printBatchStatus(printed).printedCount, 2);

console.log('invoice generator e2e fixture tests passed');
