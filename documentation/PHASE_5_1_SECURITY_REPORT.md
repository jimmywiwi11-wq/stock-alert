# Phase 5.1-Security - Firestore Rules และ Permission Validation

สถานะ: READY FOR USER APPROVAL - PHASE 5.1 SECURITY

วันที่ทดสอบ: 2026-08-03

## 1. Branch

`feature/cms-tax-invoice-integration`

## 2. Git status ก่อนและหลัง

ก่อนเริ่ม Phase นี้:

- มีไฟล์เดิมที่แก้จาก Phase ก่อนหน้า: `index.html`, `sw.js`, `version.json`
- มีไฟล์/โฟลเดอร์ CMS, modules, tests, documentation, backups เป็น untracked จาก Phase ก่อนหน้า

หลัง Phase นี้:

- เพิ่มไฟล์ security/rules/test/report ใหม่
- แก้ payload เฉพาะจุดใน invoice request และ product master เพื่อเพิ่ม uid สำหรับ rules
- ไม่ commit, ไม่ push, ไม่ merge, ไม่ deploy

## 3. Backup Path

`backups/phase-5-1-security-before-20260803-202803/`

## 4. Auth model ปัจจุบัน

- แอปใช้ Firebase Anonymous Auth ผ่าน `auth.signInAnonymously()`
- uid จริงมาจาก `window.auth.currentUser.uid`
- ชื่อเล่นมาจาก `localStorage.stockAlertNickname`
- สาขามาจาก `StockAlertDeviceBranch`, `window.currentDeviceBranch`, หรือ `localStorage.stockAlertDeviceBranchV764`
- ยังไม่พบ role/permission model ฝั่ง server ที่ production ใช้จริง
- client-side permission ที่พบใน CMS integration ยังเป็น local flag ไม่ใช่ security boundary

## 5. Role model ที่เสนอ

ใช้ `users/{uid}` เป็นแหล่งสิทธิ์ที่ rules เชื่อถือ:

- `role`: `employee`, `admin`, `owner`
- `branch`: เช่น `สาขา 1`, `สาขา 2`
- `active`: ต้องเป็น `true`
- `permissions`: list สำหรับขยายในอนาคต

ห้ามเชื่อ nickname, branch, role ที่ client ส่งมาเพียงอย่างเดียว

## 6. Files created

- `.gitignore`
- `firestore.rules`
- `firebase.json`
- `package.json`
- `tests/firestore-rules-security.test.js`
- `documentation/PHASE_5_1_SECURITY_REPORT.md`

## 7. Files modified

- `modules/invoice-request/invoice-request.js`
- `modules/invoice-request/invoice-request-sync.js`
- `modules/product-master/product-master.js`

## 8. firestore.rules path

`firestore.rules`

## 9. firebase.json path

`firebase.json`

## 10. Collections covered

- `users`
- `stock_alert_beta1_products`
- `products`
- `productCodeCounters`
- `invoiceRequestDrafts`
- `invoiceRequests`
- `invoiceRequestCounters`
- `invoiceRequestIdempotency`
- `invoiceRequestAuditLogs`
- `invoices`
- `taxInvoices`
- `invoiceHistory`
- `taxInvoiceHistory`

## 11. Product permissions

- Employee/admin/owner อ่านสินค้าได้เมื่อมี user profile ที่ active
- Employee สร้างสินค้าใหม่ได้เฉพาะ payload ที่ถูกต้องและมี `createdByUid`/`ownerUid` ตรงกับ auth uid
- `productCode`, `productId`, `id`, `createdAt`, `createdBy`, `createdByUid` ถูกล็อกหลังสร้าง
- ห้าม delete product ทุก role ใน rules ชุดนี้ เพื่อป้องกันลบโดยพลาด

## 12. Draft permissions

- Employee สร้าง/อ่าน/แก้/ลบร่างของตัวเองได้
- Owner ตรวจจาก `ownerUid`
- Employee อ่าน/แก้ร่างของคนอื่นไม่ได้
- Admin/owner อ่านร่างตามสิทธิ์ได้

## 13. Request permissions

- Employee submit `invoiceRequests` ได้เมื่อ `ownerUid` และ `requestedByUid` ตรงกับ auth uid
- Request ใหม่ต้องเป็น `status = กำลังดำเนินการ`
- Request ใหม่ต้องเป็น `generationState = not-started`
- Request ใหม่ต้องมี `generatedInvoiceIds = []`
- Request ใหม่ต้องมี `printedInvoiceCount = 0`
- Employee อ่าน request ของตัวเองหรือสาขาตาม policy ได้
- Employee แก้ submitted request ไม่ได้
- Admin/owner เท่านั้นที่แก้สถานะและ generated/printed fields ได้
- ห้าม delete submitted request

## 14. Counter permissions

- `productCodeCounters/{prefix}` อนุญาตให้เพิ่มค่าเท่านั้น
- `invoiceRequestCounters/{dateKey}` อนุญาตให้เพิ่มค่าเท่านั้น
- ห้าม decrement หรือ overwrite format
- Rules ไม่สามารถพิสูจน์ว่า client ใช้ transaction จริงได้ 100% แต่บังคับรูปแบบและบังคับให้เลขเพิ่มขึ้น

## 15. Idempotency permissions

- Employee สร้าง idempotency record ของตัวเองได้
- `ownerUid` และ `requestedByUid` ต้องตรงกับ auth uid
- อ่านได้เฉพาะ owner หรือ admin/owner
- ห้าม update/delete หลังสร้าง

## 16. Audit log permissions

- Audit log เป็น append-only
- สร้างได้เฉพาะ action ที่อนุญาต
- `actorUid` ต้องตรงกับ auth uid
- ห้าม update/delete
- Admin/owner อ่าน audit log ได้

## 17. Positive test results

สร้าง test file แล้ว: `tests/firestore-rules-security.test.js`

ผลที่ตรวจได้ในเครื่องนี้:

- JS syntax check ผ่าน
- Dependency สำหรับ rules test resolve ได้หลังติดตั้ง local
- ยังรัน Firebase Emulator ไม่สำเร็จเพราะเครื่องไม่มี Java

## 18. Negative test results

มี negative cases ใน test file ครบตามคำสั่ง ได้แก่:

- เปลี่ยน status
- เปลี่ยน generationState
- เพิ่ม generatedInvoiceIds
- เปลี่ยน printedInvoiceCount
- เปลี่ยน requestedBy/requestedAt/requestedBranch/requestNumber
- เปลี่ยน customerSnapshot/items/vatAmount หลัง submit
- ลบ submitted request
- อ่าน/แก้ draft คนอื่น
- เปลี่ยน productCode
- ลด product/request counter
- แก้/ลบ audit log
- ปลอม actorUid
- เขียน generated invoice fields
- สร้าง invoice จริง
- เขียน tax invoice history

สถานะ execution: ยังไม่ผ่าน emulator เพราะ Java missing

## 19. Employee status update result

Test case ถูกเขียนให้คาดหวัง `permission-denied` เมื่อ employee update `status`

Execution ผ่าน emulator: ยังไม่ได้รันสำเร็จ เพราะ Java missing

## 20. Employee generatedInvoiceIds result

Test case ถูกเขียนให้คาดหวัง `permission-denied` เมื่อ employee update `generatedInvoiceIds`

Execution ผ่าน emulator: ยังไม่ได้รันสำเร็จ เพราะ Java missing

## 21. Employee printedInvoiceCount result

Test case ถูกเขียนให้คาดหวัง `permission-denied` เมื่อ employee update `printedInvoiceCount`

Execution ผ่าน emulator: ยังไม่ได้รันสำเร็จ เพราะ Java missing

## 22. Admin update result

Test case ถูกเขียนให้ admin/owner update ได้เฉพาะ:

- `status`
- `generationState`
- `generatedInvoiceIds`
- `printedInvoiceCount`
- `generatedAt`
- `printedAt`
- `printedBy`
- `updatedAt`

Execution ผ่าน emulator: ยังไม่ได้รันสำเร็จ เพราะ Java missing

## 23. Anonymous auth risks

- Anonymous user เปลี่ยนเครื่อง/ล้าง browser แล้วได้ uid ใหม่
- nickname และ branch ใน localStorage ปลอมได้จาก client
- พนักงานสามารถแก้ localStorage เพื่อปลอมสาขาได้ถ้า rules เชื่อ client branch ตรง ๆ
- Anonymous auth เพียงอย่างเดียวไม่พอสำหรับ production security
- ก่อน deploy rules ควรมี provisioning `users/{uid}` จริง หรือย้ายเป็น Google/email login/PIN พร้อม admin provisioning
- Phase นี้ยังไม่เปลี่ยน login ตามคำสั่ง

## 24. Rule limitations

- Rules ตรวจ uniqueness ของ `productCode` แบบ global โดยตรงไม่ได้ ต้องใช้ counter/reservation transaction ต่อไป
- Rules ตรวจว่า write มาจาก transaction จริง 100% ไม่ได้ แต่บังคับให้ counter เพิ่มเท่านั้น
- ต้องสร้าง `users/{uid}` production ก่อน deploy rules
- Payload จาก client ต้องมี `requestedByUid`, `ownerUid`, `actorUid` ตามที่ Phase นี้เพิ่มแล้ว
- Rules ชุดนี้ยังเป็น proposal/test-ready ไม่ควร deploy ทันทีโดยไม่มี emulator pass

## 25. Emulator commands

คำสั่งที่เตรียมไว้:

```powershell
pnpm install
pnpm test:rules
```

คำสั่งที่ลองจริง:

```powershell
firebase emulators:exec --project check-chokanan-security-test --only firestore "node tests\firestore-rules-security.test.js"
```

ผลจริง:

- Dependency install: สำเร็จแบบ local แต่มี warning เรื่อง ignored build scripts
- Emulator start: ไม่สำเร็จ เพราะ `java.exe` ไม่อยู่ใน PATH
- Emulator port ที่ตั้งไว้: Firestore `127.0.0.1:8080`

## 26. Regression result

ตรวจที่รันได้:

- `tests/invoice-request.test.js` ผ่าน
- `tests/product-master.test.js` ผ่าน
- `node --check` สำหรับไฟล์ที่แก้/เพิ่มผ่าน

ไม่ได้เปิด UI browser ใน Phase นี้ และไม่ได้แตะ production Firebase

## 27. Production Rules ถูกเปลี่ยนหรือไม่

ไม่ถูกเปลี่ยน

## 28. Production Data ถูกเปลี่ยนหรือไม่

ไม่ถูกเปลี่ยน

## 29. Firebase Deploy status

ไม่ได้ deploy

ไม่ได้รัน:

- `firebase deploy`
- `firebase deploy --only firestore:rules`

## 30. Rollback procedure

ถ้าต้อง rollback เฉพาะ Phase 5.1-Security:

1. ใช้ backup จาก `backups/phase-5-1-security-before-20260803-202803/`
2. คืนไฟล์ที่แก้: `modules/invoice-request/invoice-request.js`, `modules/invoice-request/invoice-request-sync.js`, `modules/product-master/product-master.js`
3. ลบ/ไม่ใช้ไฟล์ใหม่: `firestore.rules`, `firebase.json`, `package.json`, `tests/firestore-rules-security.test.js`, `documentation/PHASE_5_1_SECURITY_REPORT.md`, `.gitignore`
4. ไม่ต้อง rollback Firebase production เพราะไม่ได้ deploy และไม่ได้แก้ production data

## 31. สิ่งที่ผู้ใช้ต้องอนุมัติก่อน Deploy Rules

- อนุมัติ role model `users/{uid}`
- สร้าง/provision user documents จริงสำหรับพนักงานและ admin
- ยืนยันรายชื่อ admin/owner
- ยืนยัน branch assignment ต่อ uid
- ติดตั้ง Java/OpenJDK เพื่อรัน emulator tests ให้ผ่านครบ
- รัน `tests/firestore-rules-security.test.js` ผ่าน emulator สำเร็จ
- ตรวจว่าสาขา/พนักงานจริง submit request ได้หลัง rules
- อนุมัติ deployment window และ rollback plan

## 32. สิ่งที่ต้องอนุมัติก่อน Phase 5.2

- อนุมัติ Phase 5.1-Security report
- Emulator tests ต้องผ่านจริงหลังมี Java
- อนุมัติว่าจะใช้ anonymous auth + user provisioning ชั่วคราว หรือเปลี่ยน login model ใน phase ถัดไป
- ยืนยันว่า Phase 5.1 request flow ยังไม่สร้าง invoice จริง/ไม่ออกเลข IV

## 33. Commit/Push/Merge/Deploy status

- Commit: ไม่ได้ทำ
- Push: ไม่ได้ทำ
- Merge: ไม่ได้ทำ
- Rebase: ไม่ได้ทำ
- Tag: ไม่ได้ทำ
- Deploy: ไม่ได้ทำ
- Firebase Rules Deploy: ไม่ได้ทำ

## Test command log

ผ่าน:

```powershell
node tests\invoice-request.test.js
node tests\product-master.test.js
node --check tests\firestore-rules-security.test.js
node --check modules\invoice-request\invoice-request.js
node --check modules\invoice-request\invoice-request-sync.js
node --check modules\product-master\product-master.js
```

ยังไม่ผ่านเพราะ environment:

```powershell
firebase emulators:exec --project check-chokanan-security-test --only firestore "node tests\firestore-rules-security.test.js"
```

Error:

```text
Could not spawn `java -version`. Please make sure Java is installed and on your system PATH.
```
