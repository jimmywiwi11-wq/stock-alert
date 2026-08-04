const assert = require('assert');

const fs = require('fs');
const path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'modules', 'invoice-request', 'invoice-request.js'), 'utf8');
const master = fs.readFileSync(path.join(__dirname, '..', 'modules', 'product-master', 'product-master.js'), 'utf8');

assert.ok(js.includes('createProductAsync'));
assert.ok(js.includes("createdFrom: 'employee-invoice-request'"));
assert.ok(js.includes("source: 'employee-invoice-request'"));
assert.ok(js.includes('costPrice: null'));
assert.ok(master.includes('normalizedName: compact(row.name)'));
assert.ok(master.includes("source: row.source || 'invoice-request'"));

console.log('invoice request new product checks passed');
