const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('modules/invoice-request/invoice-request.js', 'utf8');

assert.ok(source.includes('function isFullyPrinted(row)'));
assert.ok(source.includes("if (status === 'partially_printed') return false"));
assert.ok(source.includes('if (!printedTimestamp(row)) return false'));
assert.ok(source.includes('return printedInvoiceCount(row) >= generated'));
assert.ok(source.includes('readMobileHistory().filter(isFullyPrinted)'));
assert.ok(!source.includes("row.printed ? 'สั่งพิมพ์แล้ว' : 'พร้อมพิมพ์'"));

console.log('mobile invoice history filter passed');
