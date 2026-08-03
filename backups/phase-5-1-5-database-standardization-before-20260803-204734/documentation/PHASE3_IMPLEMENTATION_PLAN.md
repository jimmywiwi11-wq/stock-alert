# Phase 3 Implementation Plan

## 3.1 Add Desktop Shell

เพิ่ม shell สำหรับ desktop เท่านั้น

Risk: กระทบ mobile layout

Rollback: ปิด feature flag และลบ shell wrapper

## 3.2 Add Tax Invoice Route

เพิ่ม route guard และ route ไป isolated Tax Invoice

Risk: direct URL บน mobile หรือ path assets ผิด

Rollback: ปิด route guard ให้กลับไป standalone link เดิม

## 3.3 Isolate CSS/Print

ใช้ iframe/isolated document context

Risk: print context ยังโดน app shell หรือ service worker

Rollback: เปิด Tax Invoice เป็น separate page แทน iframe

## 3.4 Add Shared Product Adapter

เริ่ม read-only adapter จาก shared products test collection

Risk: mapping product ผิด ทำให้เลือกราคา/unit ผิด

Rollback: กลับไปใช้ `localStorage.products` ของ Tax Invoice

## 3.5 Add Customer Adapter

เพิ่ม read-only customer adapter

Risk: tax ID/address mapping ผิด

Rollback: กลับไปใช้ `localStorage.customers`

## 3.6 Add Test Firebase Collections

สร้าง `cms_test_*` collections เท่านั้น

Risk: rules/index ไม่พร้อม

Rollback: ลบ/disable test batch

## 3.7 Migrate Test Data

ใช้ migration preview แล้ว import test

Risk: duplicate/merge ผิด

Rollback: remove documents by `migrationBatchId`

## 3.8 Add Permissions

เพิ่ม permission keys:

- `taxInvoice.view`
- `taxInvoice.create`
- `taxInvoice.edit`
- `taxInvoice.print`
- `taxInvoice.history`
- `taxInvoice.settings`
- `taxInvoice.layout`
- `taxInvoice.delete`

Risk: lock user out หรือเปิดสิทธิ์ผิดคน

Rollback: feature flag off และ default deny

## 3.9 Run Printing Tests

ทดสอบ 9x11, 9x5.5, Epson LQ-310

Risk: CSS/scale/margin เพี้ยน

Rollback: isolated standalone print page

## 3.10 Run Regression Tests

ทดสอบ Stock Alert ทุก workflow และ Tax Invoice เดิมทุกเมนู

Risk: global JS/CSS ชนกัน

Rollback: disable integration route

## 3.11 User Acceptance Test

ให้ผู้ใช้จริงลอง desktop และ mobile

Risk: workflow ไม่ตรงหน้างาน

Rollback: เก็บเป็น test-only ไม่ deploy production

## 3.12 Commit

Commit หลัง UAT ผ่านเท่านั้น

Risk: commit งานที่ยังไม่ผ่าน

Rollback: revert commit ใน branch

## 3.13 Push Test Branch

Push branch ทดสอบ

Risk: CI/deploy อัตโนมัติ

Rollback: ใช้ branch ที่ไม่ผูก production deploy

## 3.14 Test Deployment

Deploy test URL เท่านั้น

Risk: service worker cache ทับกัน

Rollback: clear test deploy/cache

## 3.15 Production Approval

ขออนุมัติ production หลัง test print/data ผ่าน

Risk: production data/write rules

Rollback: feature flag off, keep old Stock Alert active
