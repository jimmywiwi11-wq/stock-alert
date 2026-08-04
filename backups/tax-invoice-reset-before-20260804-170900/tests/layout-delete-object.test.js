const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
assert.ok(source.includes('function deleteSelectedObject()'));
assert.ok(source.includes("alert('กรุณาเลือกวัตถุ')"));
assert.ok(source.includes("pushLayoutUndo('delete-object')"));
assert.ok(source.includes('l.objects=l.objects.filter(x=>x.id!==selectedLayoutObjectId)'));
assert.ok(source.includes('selectedLayoutObjectId=null;saveDesignerLayoutMutation(l)'));
console.log('layout delete object passed');

