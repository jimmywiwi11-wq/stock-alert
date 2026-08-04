const assert = require('assert');

require('../modules/invoice-generator/invoice-number-format.js');
const adapter = require('../modules/invoice-generator/invoice-history-adapter.js');

const central = adapter.desktopInvoiceToCentral({
  id: 'local-1',
  no: 'IV000120',
  buyerName: 'ABC',
  buyerTax: '0100000000001',
  items: [{ code: 'P1', name: 'Paint', qty: 2, unit: 'can', price: 50 }],
  beforeVat: 100,
  vat: 7,
  total: 107
}, { invoiceId: 'IV000120', invoiceNumber: 'IV000120', by: 'desktop' });

assert.strictEqual(central.invoiceId, 'IV000120');
assert.strictEqual(central.invoiceNumber, 'IV000120');
assert.strictEqual(central.source, 'desktop-manual');
assert.strictEqual(central.status, 'ready_to_print');
assert.strictEqual(central.printStatus, 'ready_to_print');

console.log('invoice history integration checks passed');
