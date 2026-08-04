const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('modules/invoice-request/invoice-request.js', 'utf8');

assert.ok(source.includes("function currentThaiDateKey()"));
assert.ok(source.includes("timeZone: 'Asia/Bangkok'"));
assert.ok(source.includes("if (status === 'printed') return 'สั่งพิมพ์แล้ว'") || source.includes("if (status === 'printed') return 'เธ"));
assert.ok(source.includes("if (status === 'printed') return 'printed'"));
assert.ok(source.includes('requestCanPreview(row)'));

console.log('mobile invoice current-day status passed');
