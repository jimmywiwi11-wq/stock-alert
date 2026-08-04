const assert = require('assert');

require('../modules/invoice-generator/invoice-number-format.js');
const service = require('../modules/invoice-generator/invoice-number-service.js');

assert.deepStrictEqual(service.reserveRange(114, 3).invoiceNumbers, ['IV000115', 'IV000116', 'IV000117']);
assert.strictEqual(service.reserveRange(114, 3).endSequence, 117);
assert.strictEqual(service.currentSequenceFromCounter({ lastSequence: 117 }), 117);

console.log('invoice running number checks passed');
