const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');

assert.ok(source.includes('function renderEmployeeInvoiceRequests()'));
assert.ok(source.includes('loadEmployeeRequestIntoNativeInvoiceEditor'));
assert.ok(source.includes('เปิดตรวจสอบในหน้าออกบิล'));
assert.ok(!source.includes('ตรวจสอบและสั่งพิมพ์'));
assert.ok(!source.includes('รับเข้าระบบออกบิล'));
assert.ok(source.includes('เจ้าของร้านต้องบันทึกและพิมพ์จากหน้าออกบิลเท่านั้น'));

console.log('employee request print regression passed');
