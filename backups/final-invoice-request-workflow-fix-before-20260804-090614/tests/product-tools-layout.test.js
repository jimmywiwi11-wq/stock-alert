const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve(__dirname, '../modules/product-master/product-master-stock-alert.js'), 'utf8');

assert.ok(source.includes('productToolsGridV43'), 'product tools grid container is required');
assert.ok(source.includes('tools.appendChild(button)'), 'need-unit button should be placed inside the shared tools container');
assert.ok(source.includes('tools.appendChild(filter)'), 'category filter button should share the same tools container');
assert.ok(source.includes('@media(min-width:560px){.productToolsGridV43{grid-template-columns:1fr 1fr}'), 'tools must become two columns where possible');

const buttonHtml = source.match(/button\.innerHTML = '([^']+)'/);
assert.ok(buttonHtml, 'need-unit button HTML should be present');
assert.ok(buttonHtml[1].includes('<svg viewBox="0 0 24 24"'), 'need-unit icon must be inline SVG');
assert.strictEqual(buttonHtml[1].includes('>!<'), false, 'need-unit icon must not use ! as icon text');

console.log('product tools layout checks passed');
