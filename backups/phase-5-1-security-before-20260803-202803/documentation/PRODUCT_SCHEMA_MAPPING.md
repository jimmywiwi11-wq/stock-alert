# Product Schema Mapping

## เป้าหมาย

ออกแบบ single source of truth สำหรับสินค้าโดยไม่เขียนทับ Firebase จริงใน Phase 2

ข้อเสนอหลัก: ใช้ collection กลางในอนาคตชื่อ `products/{productId}` โดยเริ่ม migration จาก `stock_alert_beta1_products` และ map ข้อมูลจาก Tax Invoice `localStorage.products`

## ตาราง Mapping

| Field | stock-alert | TaxInvoiceAppV22 | Type | Required | Conflict | Proposed Shared Field | Migration Rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Product ID | `id` เช่น `p_...` | ไม่มี id เสมอไป ใช้ index/code | string | yes | Tax app ไม่มี stable id | `productId` | ใช้ existing `id`; ถ้าไม่มี สร้างจาก normalized code/name |
| Product Code | `code`, `productCode`, `sku` อาจมีในบาง record | `code` | string | recommended | stock-alert shortage อาจไม่มี code | `productCode` | ถ้ามี Tax code ให้ใช้เป็น candidate หลัก แต่ต้องตรวจซ้ำ |
| Product Name | `name` | `name` | string | yes | ชื่อคล้าย/สะกดต่าง | `name` | normalize + similarity review ก่อน merge |
| Search Key | `search` | ไม่มีแยก | string | yes | format ต่าง | `search` | สร้างจาก normalized `name` |
| Unit | `unit` | `unit` | string | recommended | อาจมีตัวย่อไม่ตรง | `unit` | map ตรง แล้วใช้ unit conversion table เฉพาะกรณี |
| Cost Price | `cost` หรือ cost-code display ใน product database | `cost` | number/string | optional | stock-alert อาจเก็บเป็น glyph/cost code | `costPrice` | ถ้าเป็นตัวเลข map ตรง ถ้าเป็น code เก็บ `costCode` แยก |
| Sale Price | `price` | `price` | number | optional | shortage records ไม่มี price | `salePrice` | ใช้ Tax price หรือ product memory price ล่าสุด |
| Suppliers | `supplier`, supplier details | ไม่มีใน product หลัก | array/string | optional | Tax app ไม่มี supplier | `suppliers[]` | split `/` และ `,`; เก็บเป็น array ไม่เก็บ placeholder |
| Active Status | `active`, `archived`, `cleared` เฉพาะ shortage | ไม่มี | boolean | yes | shortage status ไม่ใช่ product active | `active` | default true; shortage archive ไม่กระทบ product active |
| Created At | `createdAt` | ไม่มีเสมอ | timestamp | recommended | local Tax products ไม่มี timestamp | `createdAt` | ใช้ค่าเดิม ถ้าไม่มีใช้ migration timestamp + source flag |
| Updated At | `updatedAt` | ไม่มีเสมอ | timestamp | recommended | Tax local ไม่มี updatedAt | `updatedAt` | ใช้ latest known หรือ migration timestamp |
| Branch Fields | `branch`, `branchId` ใน shortage | ไม่มี | separate record | no | ห้ามปน product master | `branchStockRefs` หรือแยก collection | แยกไป shortage/branch inventory records |
| Shortage Fields | `status`, `qty`, `transfer...`, `orderState` | ไม่มี | separate record | no | ไม่ใช่สินค้า master | `shortageRecords` collection | ห้ามรวมเข้า product master |
| Import Batch | มี migration flags บางตัว | `_importBatchId`, `_importedAt` | string/timestamp | optional | Tax import metadata สำคัญ | `importBatchId`, `importedAt` | เก็บใน metadata |
| Notes | `notes`, `note` | ไม่มี/อาจไม่มี | string | optional | ชื่อ field ต่าง | `notes` | รวม text โดยไม่ทับของเดิม |
| Category | `category` | ไม่มีใน Tax product หลัก | string | optional | Tax ไม่มี category | `category` | ใช้ stock-alert category ถ้ามี |
| Supplier Placeholder | อาจมี `ยังไม่ได้ระบุ` ใน legacy | ไม่มี | string | no | ห้ามถือเป็น supplier จริง | none | แปลงเป็น empty/null |

## Proposed `products/{productId}`

```json
{
  "productId": "p_or_generated_id",
  "productCode": "PVC001",
  "name": "ชื่อสินค้า",
  "search": "normalized-name",
  "unit": "อัน",
  "category": "ประปา",
  "costPrice": 0,
  "costCode": [],
  "salePrice": 0,
  "suppliers": [],
  "active": true,
  "sourceSystems": ["stock-alert", "tax-invoice"],
  "legacyRefs": {
    "stockAlertProductId": "",
    "taxInvoiceCode": ""
  },
  "importBatchId": "",
  "notes": "",
  "createdAt": 0,
  "updatedAt": 0,
  "updatedBy": ""
}
```

## Collections ที่ควรแยก

- `products`: master product data
- `productSuppliers`: relationship ถ้าสินค้าหนึ่งมีหลาย supplier พร้อมราคา/เงื่อนไข
- `shortageRecords`: รายการของขาด ไม่ปน master
- `branchInventoryStatus`: สถานะ branch ถ้าต้องมีในอนาคต
- `productImportBatches`: batch import และ rollback metadata
- `productAliases`: ชื่อคล้าย/ชื่อเก่า

## Index ที่ควรใช้ในอนาคต

- `products.search`
- `products.productCode`
- `products.active + updatedAt`
- `products.category + search`
- `productSuppliers.supplierId + productId`

## Migration Strategy

1. Export ทั้งสองฝั่งเป็น JSON
2. Normalize product code/name/unit
3. Detect duplicates ด้วย code ก่อน แล้วค่อย fuzzy name
4. Preview merge groups ให้ผู้ใช้ตรวจ
5. Import เข้า test collection เช่น `cms_test_products`
6. Validate counts, duplicates, price/cost loss
7. Run adapter read-only จาก test collection
8. เปิด write เฉพาะ test environment

## Rollback Strategy

- เก็บ export ก่อน migration
- ทุก imported product มี `migrationBatchId`
- rollback โดยลบเฉพาะ batch ใน test collection
- production ต้อง rollback ด้วย archived/reverted flag ก่อน ไม่ลบจริงทันที
