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

const numberFormat = globalThis.ChokAnanInvoiceNumberFormat;
const chunks = globalThis.ChokAnanInvoiceChunkService;
const vat = globalThis.ChokAnanInvoiceVatService;
const validation = globalThis.ChokAnanInvoiceGenerationValidation;
const numberService = globalThis.ChokAnanInvoiceNumberService;
const generator = globalThis.ChokAnanInvoiceGenerator;
const preview = globalThis.ChokAnanInvoicePreviewService;
const print = globalThis.ChokAnanInvoicePrintService;
const status = globalThis.ChokAnanInvoiceStatusService;

function items(count){
  return Array.from({ length: count }, (_, index) => ({
    requestItemId: `item-${index + 1}`,
    productId: `product-${index + 1}`,
    productCode: `P${String(index + 1).padStart(3, '0')}`,
    productName: `Product ${index + 1}`,
    quantity: index % 2 ? 2 : 1,
    unit: 'ชิ้น',
    salePrice: 100 + index
  }));
}

function request(count){
  const rows = items(count);
  return {
    requestId: 'req-final-test',
    requestNumber: 'REQ-20260803-000001',
    status: 'กำลังดำเนินการ',
    generationState: 'not-started',
    testMode: false,
    ownerUid: 'employee-1',
    requestedByUid: 'employee-1',
    requestedBranch: 'สาขา 1',
    customerSnapshot: {
      customerId: 'cust-1',
      customerName: 'บริษัท ทดสอบ จำกัด',
      taxId: '0105559999999',
      address1: 'ชลบุรี'
    },
    invoiceSettings: {
      invoiceType: 'full-tax-invoice',
      paperSize: '9x11',
      vatMode: 'exclusive',
      vatRate: 7,
      itemsPerInvoice: 10
    },
    itemSnapshots: rows,
    itemCount: rows.length,
    generatedInvoiceIds: [],
    printedInvoiceCount: 0
  };
}

function testInvoiceNumbers(){
  const cases = [
    [1, 'IV000001'], [9, 'IV000009'], [10, 'IV000010'], [99, 'IV000099'],
    [100, 'IV000100'], [125, 'IV000125'], [999, 'IV000999'], [1000, 'IV001000'],
    [9999, 'IV009999'], [10000, 'IV010000'], [99999, 'IV099999'],
    [100000, 'IV100000'], [999999, 'IV999999']
  ];
  cases.forEach(([sequence, expected]) => assert.strictEqual(numberFormat.formatInvoiceNumber(sequence), expected));
  [0, -1, 1000000, 1.5, 'abc', null, undefined].forEach(value => {
    assert.throws(() => numberFormat.formatInvoiceNumber(value), /invoice-number-out-of-range/);
  });
  assert.deepStrictEqual(numberFormat.parseInvoiceNumber('IV000125').sequence, 125);
  assert.strictEqual(numberFormat.parseInvoiceNumber('IV1000000'), null);
}

function testChunking(){
  const cases = [[1, 1], [10, 1], [11, 2], [20, 2], [21, 3], [25, 3], [30, 3], [31, 4], [50, 5], [100, 10]];
  cases.forEach(([count, expected]) => {
    const result = chunks.chunkItems(items(count), 10);
    assert.strictEqual(result.length, expected, `chunk count for ${count}`);
    result.forEach(chunk => assert.ok(chunk.items.length <= 10));
    assert.strictEqual(result.flatMap(chunk => chunk.items).map(item => item.productCode).join(','), items(count).map(item => item.productCode).join(','));
  });
  assert.throws(() => chunks.chunkItems(items(1), 0), /invalid-items-per-invoice/);
}

function testVat(){
  assert.deepStrictEqual(vat.invoiceTotals([{ quantity: 1, salePrice: 100 }], 7), {
    vatMode: 'exclusive',
    vatRate: 7,
    beforeVat: 100,
    subtotal: 100,
    vatAmount: 7,
    grandTotal: 107
  });
  assert.strictEqual(vat.invoiceTotals([{ quantity: 1, salePrice: 0.005 }], 7).beforeVat, 0.01);
  const one = vat.invoiceTotals(items(10), 7);
  const two = vat.invoiceTotals(items(5), 7);
  const batch = vat.batchTotals([{ ...one }, { ...two }]);
  assert.strictEqual(batch.vatAmount, vat.round2(one.vatAmount + two.vatAmount));
}

function testValidationAndPlan(){
  const valid = validation.validateRequest(request(25));
  assert.strictEqual(valid.items.length, 25);
  assert.throws(() => validation.validateRequest({ ...request(1), testMode: true }), /test-request-not-eligible/);
  assert.throws(() => validation.validateRequest({ ...request(1), invoiceSettings: { ...request(1).invoiceSettings, vatMode: 'included' } }), /invalid-invoice-settings/);

  const reserved = numberService.reserveRange(124, 3);
  assert.deepStrictEqual(reserved.invoiceNumbers, ['IV000125', 'IV000126', 'IV000127']);

  const plan = generator.buildPlan(request(25), 124, { uid: 'admin-1', by: 'Admin' });
  assert.strictEqual(plan.invoices.length, 3);
  assert.deepStrictEqual(plan.invoices.map(invoice => invoice.invoiceNumber), ['IV000125', 'IV000126', 'IV000127']);
  assert.strictEqual(plan.invoices[0].itemsSnapshot.length, 10);
  assert.strictEqual(plan.invoices[2].itemsSnapshot.length, 5);
  assert.strictEqual(plan.invoices[0].status, 'ready_to_print');
  assert.strictEqual(plan.invoices[0].statusText, 'พร้อมพิมพ์');
  assert.strictEqual(plan.invoices[0].printed, false);
  assert.strictEqual(plan.invoices[0].ownerUid, 'employee-1');
  assert.ok(plan.batch.vatAmount > 0);
}

function testLocalHistoryHighestSequence(){
  const previousStorage = global.localStorage;
  const previousAdapter = global.ChokAnanInvoiceHistoryAdapter;
  global.localStorage = {
    getItem(key){
      if (key !== 'invoices') return null;
      return JSON.stringify([
        { invoiceNumber: 'IV000137' },
        { no: 'IV000118' }
      ]);
    }
  };
  global.ChokAnanInvoiceHistoryAdapter = {
    getUnifiedHistoryRows(){
      return [
        { invoiceNumber: 'IV000140' },
        { id: 'IV000139' }
      ];
    }
  };
  assert.strictEqual(generator.highestSequenceFromLocalInvoiceHistory(), 140);
  global.localStorage = previousStorage;
  global.ChokAnanInvoiceHistoryAdapter = previousAdapter;
}

function testPreviewAndPrint(){
  const plan = generator.buildPlan(request(11), 0, { uid: 'admin-1', by: 'Admin' });
  const mobile = preview.requestPreviewPayload(request(11), plan.invoices);
  assert.strictEqual(mobile.readOnly, true);
  assert.strictEqual(mobile.invoiceCount, 2);
  assert.strictEqual(mobile.invoices[0].paperSize, '9x11');

  const printed = print.markInvoicePrinted(plan.invoices[0], { uid: 'admin-1', by: 'Admin' }, 123);
  assert.strictEqual(printed.printed, true);
  assert.strictEqual(printed.printStatus, 'printed');
  const batchStatus = print.printBatchStatus([printed, plan.invoices[1]]);
  assert.strictEqual(batchStatus.status, 'partially_printed');
  const requestUpdate = status.printedRequestUpdate([printed, print.markInvoicePrinted(plan.invoices[1], { by: 'Admin' }, 124)], { by: 'Admin' }, 125);
  assert.strictEqual(requestUpdate.status, 'printed');
  assert.strictEqual(requestUpdate.printedInvoiceCount, 2);
}

function testTaxInvoicesSingleSourceWritePath(){
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(path.join(__dirname, '..', 'modules', 'invoice-generator', 'invoice-generator.js'), 'utf8');
  assert.ok(source.includes('const invoiceRef = store.ref(db, store.INVOICE_COLLECTION, invoice.invoiceId)'));
  assert.ok(source.includes('transaction.set(invoiceRef, invoice)'));
  assert.ok(!source.includes("store.ref(db, 'invoices', invoice.invoiceId)"));
  assert.ok(!source.includes('transaction.set(desktopHistoryRef, legacyInvoiceShape(invoice))'));
}

testInvoiceNumbers();
testChunking();
testVat();
testValidationAndPlan();
testLocalHistoryHighestSequence();
testPreviewAndPrint();
testTaxInvoicesSingleSourceWritePath();

console.log('invoice generator tests passed');
