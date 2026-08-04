# Stock Alert Architecture

## ภาพรวม

Stock Alert เป็น PWA แบบ mobile-first สำหรับบันทึกของขาด/ของใกล้หมดของสาขา 1 และสาขา 2 พร้อม workflow แบ่งของ สั่งซื้อ รับของ ตรวจสอบเงิน และ sync Firebase

## Entry และไฟล์หลัก

- Entry: `index.html`
- JavaScript หลักที่ยังมีอยู่แยกไฟล์: `app.js`, `cash-reconciliation.js`
- Service Worker: `sw.js`
- PWA manifest: `manifest.json`
- Version metadata: `version.json`
- Assets: `icons/`, `vendor/html2canvas.min.js`

หมายเหตุ: `index.html` มี inline CSS และ inline JavaScript จำนวนมาก และมี logic หลักซ้ำ/ต่อยอดจาก `app.js` หลายช่วง จึงต้องแก้แบบระวังมากใน Phase ถัดไป

## HTML และ Navigation

ระบบใช้ `<section class="page">` หลายหน้าในไฟล์เดียว แล้วสลับด้วย `go(id)` โดย hide/show class `active`

หน้าหลักที่พบ:

- `home`
- shortage form/list pages
- category pages
- order pages
- transfer menu/detail/status pages
- delivered/received/history pages
- activity/pending/manage pages
- cash reconciliation pages ถูกเพิ่มจาก `cash-reconciliation.js`

Bottom navigation อยู่ใน `index.html` และเป็นส่วนสำคัญของ mobile workflow ห้ามทำให้ทับปุ่มสำคัญ

## Firebase

Firebase config ใช้ project:

- `projectId`: `check-chokanan`
- `authDomain`: `check-chokanan.firebaseapp.com`
- Firestore compat SDK
- Anonymous Auth มีใน `index.html`
- Firestore persistence เปิดด้วย `enablePersistence({ synchronizeTabs:true })`

ไม่พบ security rules ใน repository รอบนี้

## Collections ที่พบ

| Collection | ใช้สำหรับ | รูปแบบ |
| --- | --- | --- |
| `stock_alert_beta1_items` | รายการของขาด/ของใกล้หมด | document ต่อ shortage item |
| `stock_alert_beta1_activity` | activity log | document ต่อ log |
| `stock_alert_beta1_purchase_orders` | purchase orders | doc `main` เก็บ array |
| `stock_alert_beta1_delivery_history` | ประวัติรับของ | doc `main` เก็บ array |
| `stock_alert_beta1_categories` | หมวดหมู่ | doc `main` เก็บ array |
| `stock_alert_beta1_suppliers` | supplier master/details | doc `main` เก็บ array และ details |
| `stock_alert_beta1_transfer_history` | ประวัติแบ่งของ | doc `main` เก็บ array |
| `stock_alert_beta1_products` | product memory/pricing database | document ต่อ product |
| `stock_alert_beta1_unit_conversions` | unit conversion | doc `main` |
| `stock_alert_beta1_cash_reconciliation` | ตรวจสอบเงินรายวัน | document ต่อ branch/date/type |
| `stock_alert_beta1_clear_operations` | lock/log การล้างข้อมูล | document ต่อ operation |

## LocalStorage Keys ที่พบ

- `stock_alert_beta1_items`
- `stock_alert_beta1_activity`
- `stockAlertPurchaseOrders`
- `stockAlertDeliveryHistory`
- `stockAlertTransferHistory`
- `stockAlertCategories`
- `stockAlertSuppliers`
- `stockAlertSupplierDetails`
- `stockAlertNickname`
- `stockAlertCurrentDeviceBranch`
- `stockAlertProductsV730`
- `stockAlertProductsFirebaseMigrationV743`
- `stockAlertPendingFirebaseWritesV744`
- `stockAlertLocalReconcileV744`
- `stockAlertProductAliasesV1`, `stockAlertProductAliasesV2`
- `stockAlertUnitConversions`
- `stockAlertDailyCashChecksV746`
- `stockAlertDailyCashDraftsV746`

## Authentication และ User Identity

ระบบปัจจุบันใช้:

- Firebase Anonymous Auth เพื่อให้ Firestore ใช้งานได้
- `stockAlertNickname` เป็นชื่อผู้ใช้/ชื่อเครื่อง
- ไม่พบ role/permission model จริงใน code ปัจจุบัน

ข้อสรุป: permission สำหรับ Tax Invoice ต้องเพิ่มเป็น layer ใหม่ ห้ามใช้ desktop detection เป็น security เพียงอย่างเดียว

## Shortage Schema ปัจจุบัน

รายการของขาดใน `stock_alert_beta1_items` มี field สำคัญ:

- `id`
- `name`
- `search`
- `branch`
- `status`: `out` หรือ `low`
- `qty`
- `unit`
- `supplier`
- `category`
- `note`
- `createdAt`, `createdBy`
- `updatedAt`, `updatedBy`
- transfer fields เช่น `transferPrepared`, `transferDone`, `transferQty`, `transferUnit`, `transferBy`, `transferAt`
- order/clear fields เช่น `orderState`, `active`, `archived`, `cleared`, `clearOperationId`

## Product Memory Schema ปัจจุบัน

`stock_alert_beta1_products` ใช้เพื่อจำข้อมูลสินค้า/ราคา:

- `id`
- `name`
- `search`
- `unit`
- `category`
- `supplier`
- `cost`
- `price`
- `notes`
- `source`
- `previousNames`
- `history`
- `createdAt`, `updatedAt`, `updatedBy`

ข้อมูลนี้เหมาะที่สุดที่จะเป็นฐานเริ่มต้นของ shared product master แต่ต้องคง shortage records แยกไว้

## Supplier Schema

มีทั้ง array supplier names และ supplier details:

- supplier name list: `stockAlertSuppliers`
- details: `stockAlertSupplierDetails` และ Firestore `stock_alert_beta1_suppliers/main.details`

ต้องรักษาพฤติกรรม supplier optional และไม่บันทึก placeholder เป็นค่าจริงใน Phase integration

## Branch และ Transfer

Branch ใช้เลข `1` และ `2` เป็นหลัก พร้อม local key `stockAlertCurrentDeviceBranch`

Transfer logic ผูกกับ shortage item โดยตรง เช่น:

- มี item เฉพาะสาขาหนึ่งและอีกสาขาไม่มี ถือเป็น candidate สำหรับ transfer
- field transfer อยู่ใน shortage document
- transfer history เก็บเป็น array แยก

## Service Worker และ PWA

`sw.js` ใช้ cache name `stock-alert-v7_73-controlled-update` และไม่เรียก `skipWaiting` เพื่อรักษา update prompt

ข้อควรระวัง:

- ห้ามทำให้ Tax Invoice ถูก cache ทับโดย service worker โดยไม่ได้ออกแบบ
- ถ้าเพิ่ม route desktop ต้องตรวจ cache strategy แยก

## Build และ Deploy

ไม่พบ build tool/package manager ใน repo หลัก เป็น static PWA ที่ deploy ผ่าน GitHub/Netlify ตามเอกสารเดิม

## ข้อสรุป Phase 2

Stock Alert ควรคง entry point และ mobile workflow เดิมไว้ก่อน การเพิ่ม Tax Invoice ควรเป็น desktop-only isolated route/page ไม่ควรย้าย logic หลักเข้า modules ใน Phase 3 แรก
