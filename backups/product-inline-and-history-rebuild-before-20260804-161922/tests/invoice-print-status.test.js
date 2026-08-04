const assert = require('assert');

const service = require('../modules/invoice-generator/invoice-print-service.js');

assert.strictEqual(service.printBatchStatus([{ printed: true }, { printed: true }]).status, 'printed');
assert.strictEqual(service.printBatchStatus([{ printed: true }, { printed: false }]).status, 'partially_printed');
assert.strictEqual(service.markInvoicePrinted({ printCount: 0 }, { by: 'admin', uid: 'u1' }, 123).printStatus, 'printed');

console.log('invoice print status checks passed');
