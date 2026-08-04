const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
assert.ok(source.includes('saveDesignerLayoutMutation(l)'));
assert.ok(source.includes('saveActiveFullTaxLayout(layout)'));
assert.ok(source.includes('allowMissingRequiredObjects'));
assert.ok(source.includes('userManagedObjects'));
assert.ok(source.includes('updatedAt=new Date().toISOString()'));
console.log('layout save after delete passed');

