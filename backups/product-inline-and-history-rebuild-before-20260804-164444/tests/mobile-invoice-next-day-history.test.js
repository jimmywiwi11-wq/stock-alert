const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('modules/invoice-request/invoice-request.js', 'utf8');

assert.ok(source.includes('function thaiDateKey(value)'));
assert.ok(source.includes("timeZone: 'Asia/Bangkok'"));
assert.ok(source.includes('printedTimestamp(b)||b.updatedAt||b.createdAt'));
assert.ok(source.includes('printedTimestamp(a)||a.updatedAt||a.createdAt'));
assert.ok(source.includes('readMobileHistory().filter(isFullyPrinted)'));

console.log('mobile invoice next-day history passed');
