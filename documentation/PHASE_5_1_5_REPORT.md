# Phase 5.1.5 - Firestore Emulator และ Database Standardization

สถานะ: READY FOR USER APPROVAL - PHASE 5.1.5

วันที่: 2026-08-03

## 1. Branch

`feature/cms-tax-invoice-integration`

## 2. Git status ก่อนและหลัง

ก่อน Phase:

- Branch ถูกต้อง
- มี tracked modified เดิมจาก Phase ก่อนหน้า: `index.html`, `sw.js`, `version.json`
- มี untracked files จำนวนมากจากงาน CMS/backup/documentation ก่อนหน้า

หลัง Phase:

- เพิ่มเอกสารมาตรฐานฐานข้อมูลและ validation test
- เพิ่ม OpenJDK portable ใน `.local-tools/` แต่ถูก ignore ไม่ให้เข้า repo
- ไม่ commit, push, merge, rebase, deploy

## 3. Backup Path

`backups/phase-5-1-5-database-standardization-before-20260803-204734/`

## 4. Java version

Portable OpenJDK:

`openjdk version "17.0.20" 2026-07-21`

Path:

`.local-tools/jdk/jdk-17.0.20+8/bin/java.exe`

## 5. JAVA_HOME

ตั้งเฉพาะ process ตอนรัน test:

`.local-tools/jdk/jdk-17.0.20+8`

ไม่ได้เปลี่ยนค่า JAVA_HOME ของระบบถาวร

## 6. Firebase CLI version

`firebase-tools 14.27.0`

## 7. Emulator ports

- Firestore: `127.0.0.1:8080`
- Firestore Emulator websocket: `9150`
- Emulator UI: disabled in `firebase.json`

## 8. Emulator start result

ผ่าน: Firestore Emulator เปิดและปิดได้เรียบร้อยด้วย `emulators:exec`

หมายเหตุ: Firebase CLI เตือนว่า version 15 จะต้องการ Java 21 ขึ้นไป แต่ version ปัจจุบันรันผ่านด้วย OpenJDK 17

## 9. Security test result

ผ่าน: `tests/firestore-rules-security.test.js`

ข้อความ `PERMISSION_DENIED` ใน log เป็น expected negative tests และ test สรุป `firestore rules security tests passed`

## 10. Positive tests

ผ่านใน Emulator:

- Employee อ่าน Product
- Employee สร้าง Product ที่ถูกต้อง
- Employee สร้าง/อ่าน/แก้/ลบ Draft ของตัวเอง
- Employee submit Invoice Request
- Employee อ่าน request ตามสิทธิ์
- Employee สร้าง Idempotency record
- Employee สร้าง Audit log ที่อนุญาต
- Admin อ่าน request ทุกสาขา
- Admin เปลี่ยน status/generatedInvoiceIds/printedInvoiceCount ได้
- Admin อ่าน audit logs ได้

## 11. Negative tests

ผ่านใน Emulator โดยได้ permission denied:

- Employee เปลี่ยน status/generationState/generatedInvoiceIds/printedInvoiceCount ไม่ได้
- Employee เปลี่ยน requestedBy/requestedAt/requestedBranch/requestNumber ไม่ได้
- Employee แก้ customerSnapshot/items/vatAmount หลัง submit ไม่ได้
- Employee ลบ submitted request ไม่ได้
- Employee อ่าน/แก้ draft คนอื่นไม่ได้
- Employee เปลี่ยน productCode ไม่ได้
- Employee ลด product/request counter ไม่ได้
- Employee แก้/ลบ audit log ไม่ได้
- Employee ปลอม actorUid ไม่ได้
- Employee สร้าง generated invoice fields/invoices/taxInvoiceHistory ไม่ได้
- Unauthorized/unauthenticated user ถูก deny

## 12. Test failures

ไม่มี failure หลังเตรียม Java และ emulator jar สำเร็จ

รอบก่อนหน้าเคยติด:

- ไม่มี Java
- ต้องดาวน์โหลด Firestore emulator jar ครั้งแรก
- sandbox อ่าน Firebase CLI config ไม่ได้ ต้องรันแบบอนุญาต

## 13. Files created

- `documentation/PHASE_5_1_5_BACKUP_REPORT.md`
- `documentation/DATA_DICTIONARY.md`
- `documentation/NAMING_CONVENTION.md`
- `documentation/IMMUTABLE_FIELDS.md`
- `documentation/STATUS_ENUM_STANDARD.md`
- `documentation/DATABASE_RELATIONSHIP_DIAGRAM.md`
- `documentation/FIRESTORE_INDEX_REVIEW.md`
- `documentation/LOCAL_STORAGE_AND_INDEXEDDB_KEYS.md`
- `documentation/DATA_TYPE_STANDARD.md`
- `documentation/DEPRECATED_FIELDS_MIGRATION_PLAN.md`
- `documentation/AUTH_ROLE_MODEL.md`
- `documentation/DATABASE_COMPATIBILITY_MIGRATION_PLAN.md`
- `documentation/CURRENT_VS_PROPOSED_DATABASE.md`
- `documentation/PHASE_5_1_5_REPORT.md`
- `tests/database-schema-validation.test.js`

## 14. Files modified

- `.gitignore`
- `package.json`

## 15. Files deleted

ไม่มี

## 16. Collections found

พบ/ครอบคลุม:

- `stock_alert_beta1_items`
- `stock_alert_beta1_activity`
- `stock_alert_beta1_orders`
- `stock_alert_beta1_deliveries`
- `stock_alert_beta1_transfer_history`
- `stock_alert_beta1_categories`
- `stock_alert_beta1_suppliers`
- `stock_alert_beta1_unit_conversions`
- `stock_alert_beta1_products`
- `productCodeCounters`
- `invoiceRequests`
- `invoiceRequestCounters`
- `invoiceRequestIdempotency`
- `invoiceRequestAuditLogs`
- `invoiceRequestDrafts`
- `users`
- `invoices`
- `taxInvoices`
- `invoiceHistory`
- `taxInvoiceHistory`

## 17. localStorage keys found

หลัก ๆ:

- `stock_alert_beta1_items`
- `stock_alert_beta1_activity`
- `stockAlertPurchaseOrders`
- `stockAlertDeliveryHistory`
- `stockAlertTransferHistory`
- `stockAlertCategories`
- `stockAlertSuppliers`
- `stockAlertSupplierDetails`
- `stockAlertNickname`
- `stockAlertDeviceBranchV764`
- `stockAlertProductsV730`
- `stockAlertUnitConversions`
- `products`
- `customers`
- `invoices`
- `cms.invoiceRequest.testDrafts`
- `cms.invoiceRequest.testRequests`
- `cms.invoiceRequest.productionDrafts`
- `cms.invoiceRequest.productionRequests`
- `cms.invoiceRequest.productionPending`
- `invoiceRequestTestMode`

Full inventory: `documentation/LOCAL_STORAGE_AND_INDEXEDDB_KEYS.md`

## 18. IndexedDB databases found

ไม่พบ direct `indexedDB.open()` ใน project code

หมายเหตุ:

- Firebase Firestore persistence อาจใช้ IndexedDB ภายใน SDK
- Service Worker ใช้ Cache Storage ผ่าน `caches.open()`

## 19. Data Dictionary path

`documentation/DATA_DICTIONARY.md`

## 20. Naming Convention path

`documentation/NAMING_CONVENTION.md`

## 21. Immutable Fields path

`documentation/IMMUTABLE_FIELDS.md`

## 22. Status Enum path

`documentation/STATUS_ENUM_STANDARD.md`

## 23. Relationship Diagram path

`documentation/DATABASE_RELATIONSHIP_DIAGRAM.md`

## 24. Index Proposal path

`documentation/FIRESTORE_INDEX_REVIEW.md`

## 25. Index Review result

ทำแล้ว แต่ยังไม่ deploy index

ข้อสรุป:

- Query ส่วนใหญ่ใช้ single-field index อัตโนมัติ
- Product list `orderBy(updatedAt).limit(1200)` มีความเสี่ยงเรื่อง collection ใหญ่ ควรเพิ่ม pagination ภายหลัง
- Product code max fallback ควรลดบทบาทและใช้ counter เป็น source of truth

## 26. Data Type Standard path

`documentation/DATA_TYPE_STANDARD.md`

## 27. Deprecated Fields plan

`documentation/DEPRECATED_FIELDS_MIGRATION_PLAN.md`

## 28. Auth Role Model result

จัดทำแล้วที่ `documentation/AUTH_ROLE_MODEL.md`

ข้อเสนอ:

- ใช้ `users/{uid}`
- role: `employee`, `manager`, `admin`, `owner`, `system`
- branch assignment ต้องมาจาก Firestore/Custom Claims ไม่ใช่ localStorage

## 29. Anonymous auth risks

- Anonymous uid เปลี่ยนได้เมื่อเปลี่ยนเครื่องหรือล้าง browser
- nickname/branch ใน localStorage ปลอมได้
- local feature flag ไม่ใช่ security
- ต้อง provision `users/{uid}` ก่อน deploy rules จริง

## 30. Migration Plan path

`documentation/DATABASE_COMPATIBILITY_MIGRATION_PLAN.md`

## 31. Validation Script result

ผ่าน:

`tests/database-schema-validation.test.js`

ผล:

`database schema validation fixture checks passed`

## 32. Current vs Proposed summary

จัดทำแล้ว:

`documentation/CURRENT_VS_PROPOSED_DATABASE.md`

สรุป: ระบบปัจจุบันยังมี field aliases และ localStorage legacy หลายจุด จึงเสนอ canonical fields + compatibility adapter ก่อน migration จริง

## 33. Production Rules changed or not

ไม่เปลี่ยน production rules

## 34. Production Indexes changed or not

ไม่เปลี่ยน production indexes

## 35. Production Data changed or not

ไม่เปลี่ยน production data

## 36. Invoice created or not

ไม่ได้สร้าง invoice จริง

## 37. IV number created or not

ไม่ได้ออกเลข IV

## 38. Tax Invoice History changed or not

ไม่ได้เปลี่ยน Tax Invoice History

## 39. Regression result

ผ่าน:

- `tests/database-schema-validation.test.js`
- `tests/invoice-request.test.js`
- `tests/product-master.test.js`
- JS syntax check ของ schema/rules tests
- Firestore emulator security tests

ไม่ได้เปิด browser UI ใน Phase นี้

## 40. Known limitations

- OpenJDK เป็น portable ใน workspace ไม่ใช่ system install
- Firebase CLI เตือนว่าอนาคตควรใช้ Java 21
- Data Dictionary เป็น schema standard/proposal ไม่ใช่ migration
- ยังไม่มี `firestore.indexes.json`
- ยังไม่มี production `users/{uid}` provisioning

## 41. Rollback procedure

1. ใช้ backup path `backups/phase-5-1-5-database-standardization-before-20260803-204734/`
2. คืนไฟล์ที่ต้องการจาก backup
3. ลบ/ไม่ใช้เอกสาร Phase 5.1.5 และ validation test ที่เพิ่มในรอบนี้ หากต้อง rollback
4. ไม่ต้อง rollback Firebase production เพราะไม่ได้ deploy และไม่ได้เปลี่ยนข้อมูลจริง

## 42. Commit/Push/Merge/Deploy status

- Commit: ไม่ได้ทำ
- Push: ไม่ได้ทำ
- Merge: ไม่ได้ทำ
- Rebase: ไม่ได้ทำ
- Tag: ไม่ได้ทำ
- Deploy: ไม่ได้ทำ
- Firebase Rules Deploy: ไม่ได้ทำ
- Firebase Index Deploy: ไม่ได้ทำ

## 43. สิ่งที่ต้องให้ผู้ใช้อนุมัติก่อน Phase 5.2

- อนุมัติ Data Dictionary
- อนุมัติ Naming Convention
- อนุมัติ Auth Role Model `users/{uid}`
- อนุมัติ Migration/Compatibility Plan
- อนุมัติว่าจะใช้ OpenJDK portable ต่อ หรือเปลี่ยนเป็น Java 21/system Java
- อนุมัติ index strategy ก่อนสร้าง/ deploy index
- ยืนยันว่า Phase 5.2 จะเริ่มเฉพาะหลัง Phase 5.1.5 ได้รับอนุมัติแล้ว

## Commands confirmed

Passed:

```powershell
node tests/database-schema-validation.test.js
node tests/invoice-request.test.js
node tests/product-master.test.js
firebase emulators:exec --project check-chokanan-security-test --only firestore "node tests\firestore-rules-security.test.js"
```
