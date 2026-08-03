# Product Data Sources

Phase: Phase 4.1 - Central Product Master Analysis and Test Foundation

This document lists product-related sources found in Stock Alert and the isolated Tax Invoice app. Counts marked `runtime-only` require live browser/Firebase data and were not read from production in this phase.

## Summary

| Source name | Storage type | Key / Collection | Record count | Role | Product Master? |
| --- | --- | --- | ---: | --- | --- |
| Stock Alert shortages | Firestore + localStorage fallback | `stock_alert_beta1_items` | runtime-only | Current shortage/status records | No, transaction/status data |
| Stock Alert product cache | Firestore + localStorage cache | `stock_alert_beta1_products`, `stockAlertProductsV730` | runtime-only | Product/price page cache | Candidate source for Product Master |
| Stock Alert suppliers | Firestore doc + localStorage | `stock_alert_beta1_suppliers/main`, `stockAlertSuppliers` | runtime-only | Supplier master/list | Supplier data linked to products |
| Stock Alert supplier details | localStorage + Firestore supplier doc details | `stockAlertSupplierDetails` | runtime-only | Supplier metadata | Supplier record, not Product Master |
| Stock Alert categories | Firestore doc + localStorage | `stock_alert_beta1_categories/main`, `stockAlertCategories` | runtime-only | Product/category choices | Category reference data |
| Stock Alert purchase orders | Firestore doc + localStorage | `stock_alert_beta1_orders/main`, `stockAlertPurchaseOrders` | runtime-only | Ordered item transactions | No, transaction data |
| Stock Alert deliveries | Firestore doc + localStorage | `stock_alert_beta1_deliveries/main`, `stockAlertDeliveryHistory` | runtime-only | Delivery history | No, transaction data |
| Tax Invoice products | localStorage | `products` | runtime-only | Existing Tax Invoice product list | Candidate source for Product Master |
| Tax Invoice invoice snapshots | localStorage | `invoices` | runtime-only | Historical invoice item snapshots | No, immutable invoice snapshot |
| Tax Invoice backup IndexedDB | IndexedDB | `ChokAnanInvoiceBackup` | runtime-only | Folder handle/settings for backups | No |
| CMS Phase 3 adapter | JavaScript read-only adapter | `modules/cms-integration/cms-product-adapter.js` | derived | Shared product bridge test | Read-only adapter, not data owner |
| CMS Phase 4.1 preview adapter | JavaScript read-only adapter | `modules/cms-integration/cms-product-master-preview.js` | test fixture: 12 | Migration preview/test foundation | Test-only |

## Stock Alert Sources

### `stock_alert_beta1_items`

- Storage type: Firestore collection with localStorage fallback.
- Code locations: `index.html`, `app.js`.
- Fields observed: `id`, `name`, `search`, `branch`, `status`, `qty`, `unit`, `supplier`, `category`, `note`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, transfer/order fields.
- Example shape:

```json
{
  "id": "firebase-doc-id",
  "name": "ท่อ PVC 2 นิ้ว",
  "branch": 1,
  "status": "out",
  "qty": "",
  "unit": "เส้น",
  "supplier": "SCG / ThaiPipe",
  "category": "ประปา",
  "updatedAt": 1785730000000
}
```

- Risk: product name/unit/supplier are mixed with shortage status.
- Product Master decision: do not migrate as-is into Product Master; use only as a candidate source and preserve transaction/status separately.

### `stock_alert_beta1_products` / `stockAlertProductsV730`

- Storage type: Firestore collection plus localStorage cache.
- Code locations: `index.html` product/price page around product database logic.
- Fields observed: `id`, `name`, `search`, `unit`, `category`, `supplier`, `price`, `cost`, `costPrice`, `sellingPrices`, `purpose`, `createdAt`, `updatedAt`, `updatedBy`.
- Risk: some products may have no product code, and price fields may be blank, numeric zero, or legacy string values.
- Product Master decision: primary Stock Alert source candidate.

### Supplier and Category Sources

- Supplier list: `stockAlertSuppliers`, `stock_alert_beta1_suppliers/main`.
- Supplier details: `stockAlertSupplierDetails`, supplier doc `details`.
- Category list: `stockAlertCategories`, `stock_alert_beta1_categories/main`.
- Product Master decision: reference/link data; do not flatten status/order data into Product Master.

## Tax Invoice Sources

### `products`

- Storage type: Tax Invoice localStorage.
- Code locations: `desktop/tax-invoice/tax_invoice_app.html`.
- Fields observed: `code`, `name`, `unit`, `cost`, `price`, `_importBatchId`, `_importedAt`, `_importSession`.
- Product table order: `code`, `name`, `price`, `unit`, `cost`.
- Bulk import order to preserve: `ชื่อสินค้า | ราคาขาย | หน่วย | ราคาทุน`.
- Product Master decision: primary Tax Invoice source candidate.

### `invoices`

- Storage type: Tax Invoice localStorage.
- Fields observed through invoice snapshot use: invoice item `code`, `name`, `qty`, `unit`, `price`, `cost`.
- Product Master decision: invoice snapshot only. Do not rewrite historical invoice products during Product Master migration preview.

### IndexedDB `ChokAnanInvoiceBackup`

- Storage type: IndexedDB object store `settings`.
- Purpose: stores folder handle/settings for local backup.
- Product Master decision: not a product source.

## Read / Write Locations

- Stock Alert shortage writes: add/edit/delete shortage functions in `index.html` and `app.js`.
- Stock Alert product writes: product database editor and clear-data preserve logic in `index.html`.
- Tax Invoice product writes: `saveProduct`, inline product edit, bulk import, product delete in `desktop/tax-invoice/tax_invoice_app.html`.
- Phase 4.1 adapter writes: none. It creates in-memory previews only.

## Source Risks

- Names are currently used as matching keys in several flows.
- Product code is optional or missing in Stock Alert data.
- Supplier can contain multiple names separated by `/` or `,`.
- Blank price must stay blank; numeric zero must stay zero.
- Shortage status, branch, qty, transfers, and orders must stay transaction records, not Product Master fields.
