# Invoice Data Model

## หลักการ

Invoice data ต้องแยกจาก shortage/order/transfer records ของ Stock Alert อย่างชัดเจน และต้องรองรับหลายเครื่องโดยไม่ทำให้เลขบิลซ้ำ

## Proposed Collections

### `invoices/{invoiceId}`

Header ของบิล:

- `invoiceId`
- `invoiceNo`
- `invoiceType`
- `date`
- `dateTime`
- `customerId`
- `buyerName`
- `buyerAddress1`
- `buyerAddress2`
- `buyerTaxId`
- `vatMode`
- `beforeVat`
- `vat`
- `total`
- `paperSize`
- `status`: `draft`, `issued`, `printed`, `void`
- `printCount`
- `lastPrintedAt`
- `createdAt`, `createdBy`
- `updatedAt`, `updatedBy`
- `migrationBatchId`

### `invoiceItems/{invoiceItemId}`

Line items:

- `invoiceItemId`
- `invoiceId`
- `lineNo`
- `productId`
- `productCode`
- `nameSnapshot`
- `unitSnapshot`
- `qty`
- `price`
- `costSnapshot`
- `lineTotal`

ใช้ snapshot เพื่อให้ประวัติบิลไม่เปลี่ยนเมื่อแก้ product master

### `invoiceLayouts/{layoutId}`

- `layoutId`
- `name`
- `paperSize`
- `objects`
- `calibration`
- `overlay`
- `designer`
- `active`
- `createdAt`, `updatedAt`

### `invoiceTemplates/{templateId}`

- template metadata และ default binding set

### `invoiceSettings/{settingsId}`

- company info
- tax settings
- default paper/print behavior

### `invoiceNumberSettings/{scopeId}`

- `prefix`
- `separator`
- `next`
- `width`
- `updatedAt`

### `invoiceBatches/{batchId}`

- migration/import/training batch metadata

### `automaticInvoiceJobs/{jobId}`

คำขอใบกำกับภาษีจาก Stock Alert/CMS:

- `requestId`
- `status`: ใช้ได้เพียง 3 ค่าเท่านั้น: `กำลังดำเนินการ`, `พร้อมพิมพ์`, `พิมพ์แล้ว`
- `items`
- `invoiceItemGroups`: รายการที่แบ่งเป็นชุด ชุดละไม่เกิน 10 รายการต่อใบ
- `invoiceIds`
- `invoices`: รายการบิลที่สร้างแล้ว พร้อมสถานะพิมพ์รายใบ
- `submittedAt`, `submittedBy`
- `generatedAt`, `generatedBy`
- `printedAt`, `printedBy`
- `statusEditableByStaff`: `false`
- `statusHistory`: append-only audit events
- `errors`

กติกา:

- เมื่อพนักงานส่งคำขอ ให้ตั้งเป็น `กำลังดำเนินการ`
- ระหว่างตรวจข้อมูล แบ่งรายการ และสร้างบิล ให้คง `กำลังดำเนินการ`
- เมื่อสร้างและบันทึกบิลครบทุกใบ ให้เปลี่ยนเป็น `พร้อมพิมพ์`
- เมื่อพิมพ์ครบทุกใบในคำขอเดียวกันเท่านั้น จึงเปลี่ยนเป็น `พิมพ์แล้ว`
- พนักงานดูสถานะได้ แต่แก้เองไม่ได้
- `พิมพ์แล้ว` ต้องมาจากระบบหลังยืนยันการพิมพ์ หรือผู้ดูแลบนคอมพิวเตอร์เท่านั้น

### `printProfiles/{profileId}`

- printer/paper/calibration profile เช่น Epson LQ-310, 9x11, 9x5.5

## Primary Keys

- ใช้ Firestore document ID เป็น primary key
- `invoiceNo` ต้อง unique ต่อ company/scope
- `invoiceItems` ใช้ composite generated id: `invoiceId_lineNo` หรือ auto id พร้อม field `invoiceId`

## Duplicate Prevention

เลขบิลต้องจองด้วย transaction:

1. อ่าน `invoiceNumberSettings/{scopeId}`
2. สร้าง `invoiceNo`
3. ตรวจ `invoiceNumbers/{invoiceNo}` หรือ query unique guard
4. เขียน guard + invoice ใน transaction เดียว
5. เพิ่ม `next`

ข้อเสนอเพิ่ม collection guard:

```text
invoiceNumberLocks/{invoiceNo}
```

เพื่อป้องกันเลขซ้ำแบบ atomic

## Multi-computer Safety

- ห้ามให้ client คำนวณเลขแล้วเขียน local เองสำหรับ production
- ต้องใช้ Firestore transaction หรือ Cloud Function ในอนาคต
- ถ้า offline ให้สร้าง draft แบบไม่มีเลขจริง หรือเลข temporary เช่น `DRAFT-{device}-{time}`
- เลขจริงออกเมื่อ online และ transaction สำเร็จ

## Offline Behavior

- Draft offline ได้
- Issue/print official invoice ต้อง online หรือมี queued issue ที่ยังไม่ถือว่าเลขบิลจริง
- UI ต้องบอกสถานะชัดเจนว่า `draft/offline` ไม่ใช่ issued invoice

## Audit Fields

ทุก collection ควรมี:

- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`
- `sourceDevice`
- `migrationBatchId` ถ้ามาจาก migration

## Backup/Restore

- Export products/customers/invoices/layouts/settings เป็น JSON ต่อ batch
- Restore เข้า test environment ก่อน
- Production restore ต้องใช้ preview และ migration batch id

## Migration From Current LocalStorage

1. Export `products`, `customers`, `invoices`, `fullTaxLayouts`, `settings`, `invoiceNumberSettings`
2. Normalize IDs
3. Split invoice header/items
4. Preserve snapshots
5. Preserve invoiceNo exactly
6. Rebuild invoiceNumberSettings.next จากเลขสูงสุด
7. Validate totals and VAT
8. Import test only

## Rollback

- Delete/disable only documents in `migrationBatchId`
- Restore old localStorage backup for standalone Tax Invoice
- Do not delete production invoice numbers without explicit approval
