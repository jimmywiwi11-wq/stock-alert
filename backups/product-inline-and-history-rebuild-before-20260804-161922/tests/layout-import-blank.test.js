const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
assert.ok(source.includes('function createBlankFullTaxLayout()'));
assert.ok(source.includes('base.objects=[]'));
assert.ok(source.includes('base.name=name'));
assert.ok(source.includes("if(!Array.isArray(l.objects))throw new Error('Invalid layout')"));
assert.ok(source.includes('l.allowMissingRequiredObjects=true'));
assert.ok(source.includes('l.blankLayout=l.objects.length===0'));
assert.ok(source.includes("store.set('activeFullTaxTemplate',l.id)"));
console.log('layout import blank passed');

