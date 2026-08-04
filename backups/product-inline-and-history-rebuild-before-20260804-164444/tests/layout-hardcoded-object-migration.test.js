const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
assert.ok(source.includes('let objects=(layout.objects||[]).filter'));
assert.ok(source.includes('layout.objects.map'));
assert.ok(source.includes('fullTaxObj('));
assert.ok(!source.includes('hardcoded-layout-object'));
assert.ok(source.includes('normalizeLayoutObjectIds(layout)'));
console.log('layout hardcoded object migration passed');

