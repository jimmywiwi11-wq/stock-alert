const assert = require('assert');
const fs = require('fs');

const desktop = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
const bridge = fs.readFileSync('modules/cms-integration/cms-tax-invoice-history-bridge.js', 'utf8');
const adapter = fs.readFileSync('modules/invoice-generator/invoice-history-adapter.js', 'utf8');

assert.ok(desktop.includes("confirm('พิมพ์ใบกำกับภาษีเรียบร้อยแล้วใช่ไหม?\\\\nระบบจะอัปเดตสถานะเป็นพิมพ์แล้วหลังยืนยัน')"), 'desktop must ask before marking printed');
assert.ok(desktop.includes('if(!ok)return;'), 'cancelled confirmation must stop print status update');
assert.ok(bridge.includes("status: allPrinted ? 'printed' : 'partially_printed'"), 'parent bridge must update request print status');
assert.ok(bridge.includes('printedInvoiceIds: printedIds'), 'parent bridge must write printed invoice ids');
assert.ok(adapter.includes('printedInvoiceNumbers: data.printedInvoiceNumbers || []'), 'direct adapter must write printed invoice numbers');

console.log('print confirmation status static passed');
