# Product Conflict Report

## Phase 3 Status

This report is generated for the CMS test integration only.
No product merge, overwrite, delete, supplier update, or production Firebase write is performed in Phase 3.

## Sources Compared

| Source | Location | Mode |
| --- | --- | --- |
| Stock Alert product memory | `stockAlertProductsV730` localStorage and `stock_alert_beta1_products` concept | read-only |
| Stock Alert shortage records | `stock_alert_beta1_items` cache / active `items` array | read-only |
| Tax Invoice products | Tax Invoice `localStorage.products` | read-only |

## Runtime Adapter

The runtime conflict report is available in the browser console after opening Stock Alert:

```js
CMSProductAdapter.conflictReport()
```

The Tax Invoice iframe receives a read-only mapped product list through `postMessage`.
It does not write the received products into Tax Invoice `localStorage.products`.

## Mapping Used

| Adapter Field | Stock Alert Source | Tax Invoice Source |
| --- | --- | --- |
| `productId` | `id` or generated from name/code | generated from `code` or name |
| `code` | `code`, `productCode`, `sku`, `barcode`, `itemCode` | `code` |
| `name` | `name` | `name` |
| `unit` | `unit` | `unit` |
| `costPrice` | `costPrice` or `cost` | `cost` |
| `salePrice` | `salePrice` or `price` | `price` |
| `active` | not archived/cleared/inactive | true |

## Conflict Categories

The adapter identifies:

- same code, same name
- same code, different name
- same name, different code
- missing unit
- missing cost price
- missing sale price
- duplicates by code/name key
- records only in Stock Alert
- records only in Tax Invoice

## Initial Code-level Findings

From source analysis:

- Stock Alert shortage records often have product name, unit, supplier, branch, and shortage status but may not have product code, cost price, or sale price.
- Stock Alert product memory can include cost/price/unit/category/supplier, but records are not guaranteed for every shortage item.
- Tax Invoice products have code/name/unit/cost/price but do not include branch or supplier fields.
- Supplier data must stay with Stock Alert/product supplier mapping and must not be overwritten by Tax Invoice.
- Shortage fields must remain separate and must not be merged into product master fields.

## Current Phase 3 Rule

All product conflicts are preview-only.
Automatic merge is disabled.
Production Firestore writes are disabled.

## Manual Review Required Before Any Merge

Before a future Phase 4/production migration:

1. Export runtime `CMSProductAdapter.conflictReport()`.
2. Review same-code different-name rows.
3. Review same-name different-code rows.
4. Fill missing unit/cost/sale price intentionally.
5. Confirm supplier splitting rules.
6. Import only into test collections first.
