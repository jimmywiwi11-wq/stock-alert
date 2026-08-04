const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');

assert.ok(source.includes('@media print'));
assert.ok(source.includes('.invoice-clean-print'));
assert.ok(source.includes('body.invoice-clean-print #invoicePreview'));
assert.ok(source.includes('body.invoice-clean-print #invoicePreview{display:block!important}'));
assert.ok(/body\.invoice-clean-print\s+#invoice\s+\.print-card\{[^}]*display:block!important/i.test(source));
assert.ok(source.includes('body.invoice-clean-print #invoicePreview .invoice-box'));
assert.ok(source.includes('@page{size:${w}in ${h}in'));
assert.ok(!/body\.invoice-clean-print\s+#invoicePreview\s*\{[^}]*display\s*:\s*none/i.test(source));

console.log('native print css passed');
