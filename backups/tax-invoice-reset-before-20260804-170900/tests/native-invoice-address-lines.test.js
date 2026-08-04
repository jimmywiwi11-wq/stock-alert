const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
const start = source.indexOf('function customerAddress1ForInvoice');
const end = source.indexOf('function getCustomers', start);
assert.ok(start > 0 && end > start, 'address helpers must exist before getCustomers');

const context = {};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);

let split = context.splitAddressForInvoiceLines(
  '6/50 หมู่ที่ 8 ต.คูบางหลวง',
  'อ.ลาดหลุมแก้ว จ.ปทุมธานี 12140'
);
assert.strictEqual(split.address1, '6/50 หมู่ที่ 8 ต.คูบางหลวง');
assert.strictEqual(split.address2, 'อ.ลาดหลุมแก้ว จ.ปทุมธานี 12140');
assert.ok(split.buyerAddress.includes('\n'));

split = context.splitAddressForInvoiceLines('210/38 หมู่ 7 ต.หนองขาม อ.ศรีราชา จ.ชลบุรี 20230', '');
assert.strictEqual(split.address1, '210/38 หมู่ 7 ต.หนองขาม');
assert.strictEqual(split.address2, 'อ.ศรีราชา จ.ชลบุรี 20230');

console.log('native invoice address lines passed');
