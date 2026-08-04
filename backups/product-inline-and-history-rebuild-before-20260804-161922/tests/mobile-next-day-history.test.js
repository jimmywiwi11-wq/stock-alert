const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('modules/invoice-request/invoice-request.js', 'utf8');

assert.ok(source.includes('.filter(requestVisibleInCurrentStatus)'), 'next-day printed requests must leave current status');
assert.ok(source.includes('readMobileHistory().filter(isFullyPrinted)'), 'printed invoices must remain available in history');
assert.ok(source.includes('thaiDateKey(new Date())'), 'day boundary must use current Thai date');

console.log('mobile next-day history static passed');
