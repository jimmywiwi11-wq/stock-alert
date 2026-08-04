const assert = require('assert');
const { loadUpdateContext } = require('./update-test-harness');
const ctx = loadUpdateContext();
const u = ctx.StockAlertUpdate;
assert.strictEqual(u.normalizeVersion('V8.02'), '8.2.0');
assert.strictEqual(u.normalizeVersion('8.02'), '8.2.0');
assert.strictEqual(u.normalizeVersion('v8.2'), '8.2.0');
assert.strictEqual(u.normalizeVersion('8.2.0'), '8.2.0');
console.log('version normalization passed');
