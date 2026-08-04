# Phase 5.1-UAT Report

Phase: Phase 5.1-UAT - ทดสอบระบบคำขอออกใบกำกับภาษีกับการใช้งานจริง

Status: READY FOR USER APPROVAL - PHASE 5.1

## 1. Branch

`feature/cms-tax-invoice-integration`

## 2. Git Status ก่อนและหลัง

ก่อน UAT:

- `index.html`, `sw.js`, `version.json` modified จาก Phase 5.1
- ไฟล์ CMS/Phase ก่อนหน้าเป็น untracked อยู่แล้ว

หลัง UAT:

- มีการแก้เฉพาะ bug ในขอบเขต Phase 5.1
- ไม่มี deleted files
- ไม่มี commit/push/merge/rebase/deploy/tag/reset/clean/checkout/stash/revert

## 3. Backup Path

- Phase 5.1 backup: `D:\stock alert\Github\stock-alert\backups\phase-5-1-invoice-request-production-before-20260803-195019`
- UAT bug-fix backup: `D:\stock alert\Github\stock-alert\backups\phase-5-1-uat-fixes-before-20260803-200720`

## 4. URL ที่ใช้ทดสอบ

`http://127.0.0.1:8766/index.html`

ใช้ local HTTP server และปิด service worker ใน UAT automation เพื่อกัน cache เก่าทับไฟล์ใหม่

## 5. Firebase Project

เชื่อมกับ Firebase project: `check-chokanan`

ไม่เปิดเผย API key, token, password หรือข้อมูลลับ

## 6. User/Role/Branch

- Login: anonymous auth พร้อมใช้งาน
- Nickname: `UAT-Codex`
- Branch: `สาขา 1`
- Role: ไม่พบ role model แยกใน repo; ทดสอบด้วยสิทธิ์ผู้ใช้จริงที่แอปใช้อยู่

## 7-10. Product UAT

- Product ทดสอบล่าสุด: `TEST-UAT-PRODUCT-202608031319`
- productId: `pm_1785763150224_e8687f`
- productCode: `PM00002`
- Product mapping: สร้างใน `stock_alert_beta1_products` สำเร็จ
- Query `productCode == PM00002`: พบ 1 document
- `createdFrom`: `invoice-request`
- `unit`: `pc`
- `salePrice`: `77`
- `costPrice`: `null`
- ไม่สร้างสำเนาใน Tax Invoice `localStorage.products`

## 11-12. Draft

- Production draft บันทึกได้
- Draft key: `cms.invoiceRequest.productionDrafts`
- Offline/local draft ยังทำงาน
- Draft หลังแก้ bug มี `appVersion: 7.74`

## 13-16. Request UAT

- Request test result: ส่งคำขอจริงเข้า Firestore สำเร็จ
- requestId: `6MnALu6lzgUWoDfmm1QW`
- requestNumber: `REQ-20260803-000002`
- Status: `กำลังดำเนินการ`
- `generationState`: `not-started`
- `testMode`: `false`
- `generatedInvoiceIds`: empty array
- `printedInvoiceCount`: `0`
- `appVersion`: `7.74`

## 17-19. Firestore Documents

เพิ่ม:

- `stock_alert_beta1_products/pm_1785763150224_e8687f`
- `invoiceRequests/6MnALu6lzgUWoDfmm1QW`
- `invoiceRequestIdempotency/invoice-request-ee4c99d1-721e-48c3-a650-5c568070da16`
- `invoiceRequestAuditLogs/pS9e9F3RLhJEoSkiep0k`
- `productCodeCounters/PM`
- ก่อนแก้ bug มี UAT ชุดแรก: `REQ-20260803-000001`, productCode `PM00001`

แก้:

- ไม่มีการแก้ Firestore document เดิมระหว่าง UAT

ลบ:

- ไม่มี

## 20. Audit Log

สร้าง audit log สำเร็จ:

- action: `submitted`
- by: `UAT-Codex`
- branch: `สาขา 1`
- requestNumber: `REQ-20260803-000002`

## 21-22. Permission Test

ผ่าน:

- อ่าน Firebase ได้
- สร้าง Product ผ่าน flow ได้
- สร้าง Invoice Request ได้
- สร้าง Idempotency record ได้
- สร้าง Audit log ได้

ยังขาด/ยังไม่ deploy:

- ไม่มี Firestore rules file ใน repo
- ไม่ได้ deploy rules
- Negative permission test เช่น ห้ามแก้ status/generatedInvoiceIds/printedInvoiceCount ยังไม่ได้รันแบบ mutation จริง เพราะจะเสี่ยงเปลี่ยน submitted request
- ใช้ `PHASE_5_1_FIRESTORE_RULES_PROPOSAL.md` เป็น rules proposal สำหรับอนุมัติก่อน Phase 5.2

## 23. Quantity Input

- หลังเลือกสินค้าเดิม focus ไปช่องจำนวนสำเร็จ: `data-qty-index = 0`
- พิมพ์หลายหลักได้
- แก้จำนวนได้
- ไม่เด้งออกหลังเลขตัวแรก

## 24-25. Snapshots

Customer snapshot ครบ:

- customerId, customerCode, prefix, customerName
- address1, address2
- taxId ที่มีเลข 0 นำหน้าไม่หาย
- phone, headOffice, branchNumber

Product snapshot ครบ:

- requestItemId, rowNumber
- productId, productCode, productName
- unit, salePrice, quantity
- lineSubtotal, vatAmount, lineGrandTotal
- isNewProduct, source, addedBy, addedAt

## 26. VAT Calculation

UAT ล่าสุด:

- subtotal: `529.00`
- VAT 7%: `37.03`
- grandTotal: `566.03`
- expectedInvoiceCount: `1`
- settings: full-tax-invoice, 9x11, exclusive VAT, 7%, 10 items per invoice

## 27. Responsive Test

Automated UAT desktop:

- viewport 1366 x 768
- horizontalScroll: `false`
- activePage หลังส่ง: `cmsInvoiceRequestStatusPageV42`

Regression smoke:

- mobile: visible true, focus 0, hscroll false
- tablet: visible true, focus 0, hscroll false
- desktop: visible true, focus 0, hscroll false

## 28. Regression Test

ผ่าน:

- `tests/invoice-request.test.js`
- `tests/product-master.test.js`
- `tests/product-master-smoke.test.js`
- `tests/cms-product-master-preview.test.js`
- `tests/invoice-request-smoke.test.js`
- `tests/invoice-request-uat-live.test.js`

## 29-30. Bugs Found / Fixed

Bug 1:

- Root cause: Phase 5.1 modules ใช้ `window.db` แต่แอปหลักประกาศ `db` ด้วย `let` ทำให้ module มองไม่เห็น Firebase และ queue offline ตลอด
- Fix: expose `window.db` และ `window.auth` หลัง Firebase init ใน `index.html`

Bug 2:

- Root cause: request snapshot ใช้ `window.APP_VERSION_LABEL/window.APP_VERSION` แต่ version จริงเปิดผ่าน `window.STOCK_ALERT_APP_VERSION`
- Fix: request snapshot ใช้ `window.STOCK_ALERT_APP_VERSION` ก่อน

Bug 3:

- Root cause: สินค้าใหม่สร้าง productCode จาก local cache เท่านั้น เสี่ยงซ้ำเมื่อเปิดเครื่อง/browser ใหม่
- Fix: เพิ่ม `createProductAsync()` ให้อ่าน productCode สูงสุดจาก live Firestore และจอง `productCodeCounters/PM` ใน transaction

## 31-33. Files

Modified:

- `index.html`
- `modules/product-master/product-master.js`
- `modules/invoice-request/invoice-request.js`
- `modules/invoice-request/invoice-request-sync.js`
- `tests/invoice-request.test.js`
- `tests/invoice-request-smoke.test.js`

Created:

- `tests/invoice-request-uat-live.test.js`
- `documentation/PHASE_5_1_UAT_REPORT.md`
- `backups/phase-5-1-uat-fixes-before-20260803-200720/`

Deleted:

- none

## 34-36. No Real Invoice Confirmation

- ไม่มี Invoice จริงถูกสร้าง
- ไม่มีเลข IV ถูกออก
- ไม่มี Tax Invoice History ถูกเขียน
- `localStorage.invoices` ระหว่าง UAT: `null`
- request status ไม่เปลี่ยนเป็น `พร้อมพิมพ์`

## 37. Known Limitations

- Firestore rules ยังเป็น proposal และยังไม่ deploy
- Negative permission test ยังต้องทำผ่าน emulator/rules test หรือหลังผู้ใช้อนุมัติ rules
- มี UAT test data 2 ชุดค้างไว้ชั่วคราวตามคำสั่ง UAT:
  - `REQ-20260803-000001`, `PM00001`
  - `REQ-20260803-000002`, `PM00002`

## 38. Rollback Procedure

Copy ไฟล์จาก backup path กลับเข้า workspace:

```text
D:\stock alert\Github\stock-alert\backups\phase-5-1-uat-fixes-before-20260803-200720
```

ห้ามใช้ `git reset`, `git clean`, `checkout`, `stash`, หรือ `revert` เว้นแต่ผู้ใช้อนุมัติชัดเจน

## 39. ขั้นตอนให้ผู้ใช้ทดสอบเอง

1. เปิด `http://127.0.0.1:8766/index.html` หรือเปิดจาก hosting หลัง deploy ที่ผู้ใช้อนุมัติเอง
2. กด “สั่งทำใบกำกับภาษี”
3. เลือกลูกค้า
4. เพิ่มสินค้าเดิม 1 รายการ
5. เพิ่มสินค้าใหม่ชื่อ `TEST-UAT-PRODUCT-...`
6. ตรวจ summary VAT
7. กดบันทึกร่าง
8. กดยืนยันส่งคำขอ
9. ตรวจว่าสถานะเป็น `กำลังดำเนินการ`
10. ตรวจว่าไม่มีใบจริง, ไม่มีเลข IV, ไม่มี Tax Invoice History

## 40. Commit/Push/Merge/Deploy

ไม่ได้ทำ commit, push, merge, rebase, deploy, tag, reset, clean, checkout, stash หรือ revert

## 41. ก่อนเริ่ม Phase 5.2 ต้องอนุมัติ

- อนุมัติ UAT result
- อนุมัติ Firestore rules หรือ rules patch
- ตัดสินใจว่าจะเก็บหรือลบ UAT test data
- ยืนยันว่า Phase 5.2 จะเริ่มสร้าง workflow ถัดไปเท่านั้น

## Stop Point

READY FOR USER APPROVAL - PHASE 5.1
