const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
assert.ok(source.includes('Delete Background'));
assert.ok(source.includes('function deleteLayoutBackground()'));
assert.ok(source.includes("pushLayoutUndo('delete-background')"));
assert.ok(source.includes("l.overlay={enabled:false,opacity:.35,image:''}"));
assert.ok(source.includes('layout.overlay?.enabled&&layout.overlay.image'));
console.log('layout background delete passed');

