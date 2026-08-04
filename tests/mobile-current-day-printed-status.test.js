const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('modules/invoice-request/invoice-request.js', 'utf8');

assert.ok(source.includes('function requestVisibleInCurrentStatus(row)'), 'current status visibility helper must exist');
assert.ok(source.includes('if (!isFullyPrinted(row)) return true;'), 'unprinted and ready requests must remain visible');
assert.ok(source.includes('return thaiDateKey(printedTimestamp(row)) === currentThaiDateKey();'), 'printed requests must stay visible only on their Thai printed date');

console.log('mobile current day printed status static passed');
