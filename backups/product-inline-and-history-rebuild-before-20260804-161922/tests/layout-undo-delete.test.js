const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
assert.ok(source.includes('layoutUndoStack=[]'));
assert.ok(source.includes('function pushLayoutUndo(reason)'));
assert.ok(source.includes("store.set('lastFullTaxLayoutDeleteUndo'"));
assert.ok(source.includes('function undoLastLayoutDelete()'));
assert.ok(source.includes("store.get('lastFullTaxLayoutDeleteUndo'"));
assert.ok(source.includes('saveActiveFullTaxLayout(item.layout)'));
console.log('layout undo delete passed');

