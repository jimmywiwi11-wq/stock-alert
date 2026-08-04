const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
assert.ok(source.includes('markLayoutUserManaged(layout)'));
assert.ok(source.includes('allowMissingRequiredObjects=true'));
assert.ok(source.includes('if(layout?.allowMissingRequiredObjects||layout?.blankLayout)return'));
assert.ok(source.includes('locked&&!confirm'));
assert.ok(source.includes('protected:false'));
assert.ok(source.includes('required:false'));
assert.ok(source.includes('system:false'));
console.log('layout delete protected object passed');

