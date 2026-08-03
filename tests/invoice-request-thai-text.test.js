const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'modules/invoice-request/invoice-request.js'), 'utf8');

assert.strictEqual(/[\uFFFD]|โ€|เธ/.test(source), false, 'invoice request UI must not contain mojibake Thai text');

[
  'สั่งทำใบกำกับภาษี',
  'ส่งรายการให้ระบบสร้างใบกำกับภาษีอัตโนมัติ',
  'ลูกค้า',
  'ค้นหา/เลือกลูกค้า',
  'เพิ่มสินค้าใหม่เข้า Product Master',
  'รายการที่เลือก',
  'ยังไม่มีรายการสินค้า',
  'บันทึกร่างคำขอแล้ว',
  'ยืนยันส่งคำขอออกใบกำกับภาษี?',
  'กำลังดำเนินการ',
  'สถานะใบกำกับภาษี',
  'ประวัติใบกำกับภาษี'
].forEach(text => assert.ok(source.includes(text), `missing Thai UI text: ${text}`));

assert.ok(source.includes('Production Mode: ส่งคำขอจริงไปที่ invoiceRequests'), 'production banner should be readable Thai');
assert.ok(source.includes('Test Mode: เก็บเฉพาะข้อมูลทดสอบในเครื่องนี้'), 'test banner should be readable Thai');

console.log('invoice request Thai text checks passed');
