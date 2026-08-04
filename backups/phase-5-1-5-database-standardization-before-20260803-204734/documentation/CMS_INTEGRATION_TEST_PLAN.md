# CMS Integration Test Plan

## Desktop Tests

- เปิด Stock Alert ผ่าน desktop viewport
- ยืนยันปุ่ม “ใบกำกับภาษี” แสดงเฉพาะ desktop
- เปิด Tax Invoice route/module
- ปุ่มกลับ Stock Alert ทำงาน
- สินค้า shared product adapter ตรงกับ master
- ลูกค้าแสดงครบ
- ออกบิล draft
- บันทึกบิล
- พิมพ์ 9 x 11
- พิมพ์ 9 x 5.5
- ใช้ Print Layout Designer
- ออกบิลอัตโนมัติ
- ดูประวัติบิล
- Tax Invoice UI เหมือนเดิมมากที่สุด
- app shell/header/nav ไม่ติดไปในงานพิมพ์

## Mobile Tests

- ไม่เห็นปุ่ม “ใบกำกับภาษี”
- direct URL ถูก block หรือ disabled
- แสดงข้อความว่าใช้งานได้เฉพาะคอมพิวเตอร์
- ลงของขาดสาขา 1 ใช้ได้
- ลงของขาดสาขา 2 ใช้ได้
- รายการรวม/หมวดหมู่ใช้ได้
- Transfer ใช้ได้
- Orders ใช้ได้
- Received/Delivered ใช้ได้
- Bottom navigation ไม่ถูกบัง

## Data Tests

- Product Code ไม่ซ้ำ
- Tax ID ไม่เสียเลข 0 นำหน้า
- Invoice Number ไม่ซ้ำ
- ราคาทุนไม่หาย
- ราคาขายไม่หาย
- Supplier ไม่หาย
- Placeholder supplier ไม่ถูกบันทึกเป็นค่าจริง
- Shortage records ไม่ถูกเปลี่ยน schema
- Invoice items snapshot ไม่เปลี่ยนเมื่อแก้ product master

## Firebase/Test Environment

- ใช้ test collections ก่อน production
- ตรวจ Firestore rules ก่อนเปิด write
- ตรวจ offline draft behavior
- ตรวจ transaction invoice counter หลายเครื่องพร้อมกัน
- ตรวจ rollback จาก `migrationBatchId`

## Printing Regression

- Epson LQ-310
- 9 x 11 full tax
- 9 x 5.5 short/full format
- margin/scale/calibration
- layout designer coordinates
- overlay/background
- PNG/PDF export ถ้าเปิดใช้ในอนาคต

## Stock Alert Regression

- Branch 1 entry
- Branch 2 entry
- edit item
- similar product warning
- supplier split `/` และ `,`
- order from one supplier removes from other supplier candidates
- copy list one product per line
- Firebase sync
- PWA update prompt
- version display

## Tax Invoice Regression

- product CRUD
- customer CRUD
- product import/delete preview
- customer import
- invoice create/edit/save
- invoice history clear/undo
- invoice numbering settings
- backup/restore
- auto invoice
- print queue
- layout designer import/export

## Acceptance Criteria

- ไม่มี production data ถูกเขียนระหว่าง test
- ไม่มี mobile workflow เสีย
- ไม่มี invoice number duplicate ใน test
- print output เทียบตัวอย่างเดิมผ่าน
- rollback test ผ่าน
