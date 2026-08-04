const assert = require('assert');

const store = require('../modules/invoice-generator/invoice-generator-store.js');

assert.strictEqual(store.idempotencyKey('REQ-1', 'v1'), 'REQ-1:v1');
assert.strictEqual(store.idempotencyKey('REQ-1', 'v2'), 'REQ-1:v2');

console.log('invoice idempotency checks passed');
