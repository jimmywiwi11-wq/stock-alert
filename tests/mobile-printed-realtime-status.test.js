const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('modules/invoice-request/invoice-request.js', 'utf8');

assert.ok(source.includes("window.db.collection('invoiceRequests').where('requestedByUid', '==', uid).onSnapshot"), 'mobile must listen to invoiceRequests realtime');
assert.ok(source.includes("window.db.collection('taxInvoices').where('requestedByUid', '==', uid).onSnapshot"), 'mobile must listen to taxInvoices realtime');
assert.ok(source.includes("if (status === 'printed') return 'สั่งพิมพ์แล้ว';"), 'printed status must render immediately after listener update');
assert.ok(source.includes("if (status === 'printed') return 'printed';"), 'printed status must use green class');

assert.ok(source.includes('mobileStatusInvoiceRows()'), 'mobile status must build rows from taxInvoices records');
assert.ok(source.includes("CMSInvoiceRequest.openPreview('${esc(key)}', 'invoice')"), 'mobile preview must open the selected invoice record');

console.log('mobile printed realtime status static passed');
