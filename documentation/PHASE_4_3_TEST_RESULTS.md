# Phase 4.3 Test Results

Phase: Phase 4.3 - Live Product Master Integration

Status: READY FOR USER TEST

## Product Master

- Master storage key: `stockAlertProductsV730`
- Legacy Tax Invoice product key: `products` is read for one-time merge into Product Master, then runtime product reads are served from Product Master.
- Generated Product Code format: `PM00001`, `PM00002`, ...
- Existing Product Code is preserved and does not change after product name edits.
- Products without unit stay in Product Master but are excluded from Tax Invoice product list.

## Need Unit

- Button: `ต้องระบุหน่วย`
- Location: `สินค้า / ราคา`
- Shows active products without unit.
- Saving unit updates Product Master and removes the product from the need-unit list.

## Fixed Rule

Tax Invoice product search reads from live Product Master through `ChokAnanProductMaster.listTaxInvoiceProducts()`.

Stock Alert keeps Product Code hidden in its normal UI.

Tax Invoice still displays Product Code in its product table and invoice product search.

## Commands Run

```text
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check modules\product-master\product-master.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check modules\product-master\product-master-stock-alert.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check modules\product-master\product-master-tax-bridge.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check modules\invoice-request\invoice-request-product-search.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\product-master.test.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\product-master-smoke.test.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\invoice-request.test.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\invoice-request-smoke.test.js
```

## Results

- Product Master unit test passed.
- Browser smoke test passed for live Product Master.
- New product without Product Code generated `PM00001` in smoke test.
- Duplicate count stayed `0`.
- Need Unit count changed from `1` to `0` after saving unit.
- Tax Invoice product count changed from `2` to `3` after unit was added.
- Tax Invoice saw the generated-code product after unit was added.
- Legacy Tax Invoice product was merged into Product Master runtime list.
- Phase 4.2 invoice request unit and browser smoke tests still passed.
- Browser reload/navigation kept Product Master data in `stockAlertProductsV730`.

## Smoke Test Snapshot

```text
initial={"productCount":3,"generatedCodeCount":1,"duplicateCount":0,"needUnitCount":1,"taxInvoiceProductCount":2}
generatedCode=PM00001
needButtonVisible=true
afterUnit={"productCount":3,"generatedCodeCount":1,"duplicateCount":0,"needUnitCount":0,"taxInvoiceProductCount":3}
persistedUnit=ชิ้น
taxProductCount=3
taxHasGenerated=true
taxHasLegacy=true
duplicateCount=0
```

## Known Issues

- Existing legacy Tax Invoice `products` localStorage may still exist as old local data, but runtime product reads/writes are redirected to Product Master.
- Firebase sync depends on the existing Stock Alert product sync path. Offline mode uses `stockAlertProductsV730` and syncs through the existing app path when Firebase is available.
- Product Code is intentionally hidden in Stock Alert normal UI and visible in Tax Invoice.
