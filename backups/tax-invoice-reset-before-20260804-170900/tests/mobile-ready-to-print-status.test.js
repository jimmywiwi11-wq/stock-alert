const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('modules/invoice-request/invoice-request.js', 'utf8');

assert.ok(source.includes("if (status === 'ready_to_print') return 'ready';"), 'ready to print must use ready class');
assert.ok(source.includes("if (requestIsReady(row)) return 'พร้อมพิมพ์';"), 'ready to print must display Thai ready text');
assert.ok(source.includes('requestVisibleInCurrentStatus'), 'current status must use visibility filter');

console.log('mobile ready to print status static passed');
