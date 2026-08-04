const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
assert.ok(source.includes('function clearAllLayoutObjects()'));
assert.ok(source.includes('ล้างวัตถุทั้งหมด'));
assert.ok(source.includes('l.objects=[]'));
assert.ok(source.includes('l.blankLayout=true'));
assert.ok(source.includes('การกระทำนี้ไม่ลบข้อมูลลูกค้า สินค้า หรือประวัติบิล'));
assert.ok(source.includes('Blank layout: no objects'));
console.log('layout clear all passed');

