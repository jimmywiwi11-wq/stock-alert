# Tax Invoice Architecture

## ภาพรวม

TaxInvoiceAppV22 ที่คัดลอกไว้ใน `desktop/tax-invoice/` เป็น standalone HTML app สำหรับจัดการสินค้า ลูกค้า ใบกำกับภาษี การพิมพ์ และ backup/restore โดยยังไม่เชื่อมกับ Firebase

## Entry และไฟล์หลัก

- Entry: `desktop/tax-invoice/tax_invoice_app.html`
- Manifest: `desktop/tax-invoice/manifest.json`
- Assets: `desktop/tax-invoice/assets/icons/`
- Shortcut helpers: `Create_Tax_Invoice_App_Shortcut.ps1`, `install_desktop_shortcut.bat`

## HTML/CSS/JS

ทุกอย่างส่วนใหญ่รวมอยู่ใน `tax_invoice_app.html`

- CSS inline ใน `<style>`
- JavaScript inline ใน `<script>`
- navigation ใช้ `showPage(id)` เพื่อสลับ `.page.active`
- ไม่มี module bundler
- ไม่มี Firebase

## Storage

ระบบใช้ `localStorage` ผ่าน wrapper:

```js
store.get(key, defaultValue)
store.set(key, value)
```

ทุกครั้งที่ `store.set` จะ schedule auto backup

## IndexedDB

ใช้ IndexedDB ชื่อ `ChokAnanInvoiceBackup`

- object store: `settings`
- key สำคัญ: `activeFolder`
- ใช้จำ File System Access handle ของ backup folder

ไม่ได้ใช้ IndexedDB เป็นฐานข้อมูลสินค้า/ลูกค้า/บิล

## LocalStorage Keys สำคัญ

| Key | ใช้สำหรับ |
| --- | --- |
| `products` | product master ของ Tax Invoice |
| `customers` | customer master |
| `invoices` | ประวัติ invoice ทั้ง header และ items |
| `invoiceNumberSettings` | ตั้งค่าเลขบิล |
| `autoInvoiceNumberSettings` | ตั้งค่าเลขบิลอัตโนมัติ |
| `settings` | ข้อมูลร้าน/บริษัท |
| `fullTaxLayouts` | layout ใบกำกับภาษีเต็มรูป |
| `activeFullTaxTemplate` | layout template ที่ใช้อยู่ |
| `fullTaxCompanyInfo` | company fields สำหรับ full tax layout |
| `productPriceHistory` | ประวัติราคา |
| `productImportBatches` | batch import สินค้า |
| `lastProductImportDeleteUndo` | undo ลบ batch import |
| `productImportDeleteBackups` | backup การลบสินค้า import |
| `customerImport...` | preview/import ลูกค้าใน memory ระหว่างใช้งาน |
| `invoiceHistoryDeleteBackups` | backup ก่อนลบประวัติบิล |
| `lastInvoiceHistoryDeleteUndo` | undo ลบประวัติบิล |
| `lastTrainingBatch` | ชุดบิลอัตโนมัติล่าสุด |
| `lastTrainingDailySummary` | summary บิลอัตโนมัติ |
| `trainingPrintQueue` | คิวพิมพ์บิลอัตโนมัติ |
| `backupRuntimeStatus` | สถานะ backup ล่าสุด |
| `backupSetupNoticeShown` | flag การแจ้งตั้งค่า backup |

## Product Schema

สินค้าใน `products` เป็น array object:

- `code`
- `name`
- `unit`
- `cost`
- `price`
- import metadata เช่น `_importBatchId`, `_importedAt`

ไม่มี branch/supplier field ใน schema หลักปัจจุบัน

## Customer Schema

ลูกค้าใน `customers` ถูก normalize เป็น:

- `code`
- `prefix`
- `name`
- `address1`
- `address2`
- `taxId`
- `tax`
- `phone`
- `tel`
- `address`

ระบบกันซ้ำจาก tax ID หรือ name + address

## Invoice Schema

Invoice เก็บใน `invoices` เป็น array object โดยมีข้อมูลสำคัญ:

- `id`
- `no`
- `date`
- `dateTime`
- `type`
- `customerId`
- `buyerName`
- `buyerAddress`
- `buyerAddress1`
- `buyerAddress2`
- `buyerTax`
- `items`
- `vatMode`
- `beforeVat`
- `vat`
- `total`
- `paperSize`
- print fields เช่น `printCount`, `printStatus`, `trainingPrintedAt`
- training fields เช่น `training`, `batchId`

Invoice items ฝังอยู่ใน invoice object แต่ตอน design CMS ควรแยก `invoiceItems` สำหรับ query/report/atomic write ที่ปลอดภัยกว่า

## Invoice Numbering

ใช้ `invoiceNumberSettings`:

- `formatVersion`
- `prefix`
- `separator`
- `next`
- `width`

เลขบิลถูก format จาก prefix + separator + padded sequence และตรวจซ้ำด้วย `invoiceNoExists`

ความเสี่ยง: localStorage ไม่ปลอดภัยเมื่อใช้หลายเครื่องพร้อมกัน ต้องย้าย counter ไป transaction/atomic counter ใน Firebase test collection ก่อน production

## VAT Logic

VAT rate คงที่ `VAT=0.07`

รองรับ:

- VAT included
- VAT excluded
- คำนวณ `beforeVat`, `vat`, `total`

## Print และ Layout

ระบบพิมพ์ผ่าน browser print:

- `window.print()`
- `@media print`
- paper size 9 x 5.5 และ 9 x 11
- full tax layout designer ใช้ absolute coordinates หน่วย mm
- layout object มี field เช่น `x`, `y`, `w`, `h`, `font`, `fontSize`, `source`, `visible`, `locked`
- มี overlay/background calibration สำหรับงานพิมพ์

## Backup/Restore

ระบบ backup:

- export localStorage ทั้งหมดเป็น JSON
- ใช้ File System Access API เลือกโฟลเดอร์
- เก็บ permission handle ใน IndexedDB
- trim backup เก่าไม่เกิน 100 ไฟล์
- restore จะ clear localStorage แล้วเขียนกลับ

## Browser APIs

- localStorage
- IndexedDB
- File System Access API
- Blob/Object URL download
- window.print
- document.fonts
- manifest/PWA install behavior

## Desktop Assumptions

ตัว app มี workflow ที่เหมาะกับจอใหญ่ เช่น ตารางสินค้า ลูกค้า layout designer และ print calibration จึงควร block mobile route ใน CMS integration

## ข้อสรุป Phase 2

Tax Invoice ควรถูก isolate จาก app shell และ CSS ของ Stock Alert มากที่สุด โดยเฉพาะ print context และ layout designer
