const assert = require('assert');

require('../modules/invoice-generator/invoice-preview-service.js');
require('../modules/invoice-generator/invoice-number-format.js');
require('../modules/invoice-generator/invoice-chunk-service.js');
require('../modules/invoice-generator/invoice-vat-service.js');
require('../modules/invoice-generator/invoice-generation-validation.js');
require('../modules/invoice-generator/invoice-number-service.js');
require('../modules/invoice-generator/invoice-generation-lock.js');
require('../modules/invoice-generator/invoice-number-reservation.js');
require('../modules/invoice-generator/invoice-generation-audit.js');
require('../modules/invoice-generator/invoice-generator-store.js');
require('../modules/invoice-generator/invoice-generator.js');

const preview = globalThis.ChokAnanInvoicePreviewService;
const generator = globalThis.ChokAnanInvoiceGenerator;

const invoice = {
  invoiceId: 'IV000004',
  invoiceNumber: 'IV000004',
  buyerName: 'อีออน (ไทยแลนด์) จำกัด',
  buyerTax: '0105527044125',
  customerSnapshot: {
    customerName: 'อีออน (ไทยแลนด์) จำกัด',
    taxId: '0105527044125',
    address1: '388 อาคารเอ็กเชน ทาวเวอร์ ชั้น 27',
    address2: 'ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110'
  },
  itemsSnapshot: [{ productName: 'สินค้า A', quantity: 1, unit: 'ชิ้น', salePrice: 100 }],
  beforeVat: 100,
  vatAmount: 7,
  grandTotal: 107
};

const payload = preview.previewPayload(invoice);
assert.strictEqual(payload.buyerAddress, '388 อาคารเอ็กเชน ทาวเวอร์ ชั้น 27\nถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110');
assert.strictEqual(payload.buyerAddress1, '388 อาคารเอ็กเชน ทาวเวอร์ ชั้น 27');
assert.strictEqual(payload.buyerAddress2, 'ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110');
assert.strictEqual(payload.customerSnapshot.address1, '388 อาคารเอ็กเชน ทาวเวอร์ ชั้น 27');

const plan = generator.buildPlan({
  requestId: 'REQ-ADDR-1',
  requestNumber: 'REQ-ADDR-1',
  status: 'กำลังดำเนินการ',
  testMode: false,
  generationState: 'not-started',
  customerSnapshot: {
    customerName: 'Full Address Co',
    taxId: '0123456789012',
    customerAddress: '99 Customer Address Road'
  },
  invoiceSettings: { invoiceType: 'full-tax-invoice', paperSize: '9x11', vatMode: 'exclusive', vatRate: 7, itemsPerInvoice: 10 },
  items: [{ productName: 'Product A', quantity: 1, unit: 'pc', salePrice: 100 }]
}, 3, { by: 'test' });

assert.strictEqual(plan.invoices[0].buyerAddress, '99 Customer Address Road');
assert.strictEqual(plan.invoices[0].customerSnapshot.address1, '99 Customer Address Road');

const splitPlan = generator.buildPlan({
  requestId: 'REQ-ADDR-2',
  requestNumber: 'REQ-ADDR-2',
  status: globalThis.ChokAnanInvoiceGenerationValidation.STATUS_PROCESSING,
  testMode: false,
  generationState: 'not-started',
  customerSnapshot: {
    customerName: 'Split Address Co',
    taxId: '0205567064347',
    customerAddress: '210/38 Moo 7 T.Nongkham อ.ศรีราชา จ.ชลบุรี 20230'
  },
  invoiceSettings: { invoiceType: 'full-tax-invoice', paperSize: '9x11', vatMode: 'exclusive', vatRate: 7, itemsPerInvoice: 10 },
  items: [{ productName: 'Product B', quantity: 1, unit: 'pc', salePrice: 100 }]
}, 4, { by: 'test' });

assert.strictEqual(splitPlan.invoices[0].buyerAddress1, '210/38 Moo 7 T.Nongkham');
assert.strictEqual(splitPlan.invoices[0].buyerAddress2, 'อ.ศรีราชา จ.ชลบุรี 20230');
assert.strictEqual(splitPlan.invoices[0].buyerAddress, '210/38 Moo 7 T.Nongkham\nอ.ศรีราชา จ.ชลบุรี 20230');

console.log('invoice preview address checks passed');
