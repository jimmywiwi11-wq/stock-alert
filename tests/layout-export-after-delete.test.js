const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
assert.ok(source.includes("function exportFullTaxLayout(){downloadJson('full-tax-layout.json',activeFullTaxLayout())}"));
assert.ok(source.includes('activeFullTaxLayout()'));
assert.ok(source.includes('if(layout?.allowMissingRequiredObjects||layout?.blankLayout)return'));
console.log('layout export after delete passed');

