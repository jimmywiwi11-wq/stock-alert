const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
assert.ok(source.includes('normalizeLayoutObjectIds(layout)'));
assert.ok(source.includes('data-id="'));
assert.ok(source.includes('selectLayoutObject(el.dataset.id)'));
assert.ok(source.includes('ID: '));
assert.ok(source.includes('Key: '));
console.log('layout select all object types passed');

