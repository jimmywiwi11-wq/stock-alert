const assert = require('assert');
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'modules', 'invoice-request', 'invoice-request.css'), 'utf8');

assert.ok(css.includes('@media (max-width: 719px)'));
assert.ok(css.includes('@media (max-width: 380px)'));
assert.ok(css.includes('.cmsInvoiceSummaryV42'));
assert.ok(css.includes('.cmsInvoiceGridV42.three .cmsInvoiceReadOnlyV42'));
assert.ok(css.includes('align-items: center'));
assert.ok(css.includes('justify-content: center'));

console.log('invoice responsive layout checks passed');
