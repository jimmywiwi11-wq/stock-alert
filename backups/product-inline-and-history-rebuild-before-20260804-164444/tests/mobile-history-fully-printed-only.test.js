const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('modules/invoice-request/invoice-request.js', 'utf8');

assert.ok(source.includes('function isFullyPrinted(row)'), 'fully printed helper must exist');
assert.ok(source.includes("if (status === 'partially_printed') return false;"), 'partially printed requests must not enter history');
assert.ok(source.includes('return printedInvoiceCount(row) >= generated;'), 'history must require printed count to match generated count');
assert.ok(source.includes('readMobileHistory().filter(isFullyPrinted)'), 'mobile history must show fully printed invoices only');

console.log('mobile history fully printed only static passed');
