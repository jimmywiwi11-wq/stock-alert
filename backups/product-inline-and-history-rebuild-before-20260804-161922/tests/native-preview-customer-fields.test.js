const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');

assert.ok(source.includes('function assertInvoiceReadyForPrint(records=null,previewHtml='));
assert.ok(source.includes('ไม่มีที่อยู่บรรทัด 1'));
assert.ok(source.includes('ไม่มีที่อยู่บรรทัด 2'));
assert.ok(source.includes('ไม่มีเลขผู้เสียภาษี'));
assert.ok(source.includes('Preview ไม่มีชื่อลูกค้า'));
assert.ok(source.includes('Preview ไม่มีเลขผู้เสียภาษี'));
assert.ok(source.includes('Preview ไม่มีที่อยู่บรรทัด 1'));
assert.ok(source.includes('Preview ไม่มีที่อยู่บรรทัด 2'));

console.log('native preview customer fields passed');
