# Product Field Mapping Phase 4.1

## Mapping Table

| Central Field | Stock Alert Field | Tax Invoice Field | Type | Required | Migration Rule | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| `productId` | `id` or generated preview ID | generated from `code` / row index | string | yes | Stable internal ID; do not use product name. | Product Master |
| `productCode` | `code`, `productCode`, `sku`, `barcode`, `itemCode` | `code` | string | future-required | Preserve leading zero. Do not auto-generate production code in Phase 4.1. | Product Master |
| `productName` | `name` | `name` | string | yes | Preserve Thai text and meaningful spacing. | Product Master |
| `normalizedName` | `search` or normalized `name` | normalized `name` | string | yes | Used for search and preview matching only. | Product Master |
| `unit` | `unit` | `unit` | string | no | Blank is allowed in master preview but blocks Tax Invoice eligibility. | Product Master |
| `costPrice` | `costPrice`, `cost` | `cost` | number/null | no | Blank -> `null`; `0` -> `0`; comma numbers supported. | Product Master |
| `salePrice` | `salePrice`, `price`, primary `sellingPrices.price` | `price` | number/null | no | Blank -> `null`; `0` -> `0`. | Product Master |
| `suppliers` | `supplier`, `suppliers` | none by default | array | no | Split `/` and `,`; preserve all names. | Supplier link |
| `category` | `category` | none by default | string | no | Preserve Stock Alert category. | Product Master/reference |
| `active` | `active`, `archived`, `cleared` | implicit active | boolean | yes | Inactive if archived/cleared. | Product Master |
| `createdAt` | `createdAt` | import metadata if available | number/string | no | Preserve original if present. | Audit |
| `updatedAt` | `updatedAt` | import/edit metadata if available | number/string | no | Preserve original if present. | Audit |
| `branch/source` | `branch`, source page | source localStorage key | string | no | Keep as source context only. | Source metadata |
| `shortage data` | `status`, `qty`, `transfer*`, `ordered*` | none | object | no | Do not migrate into Product Master. | Shortage/transaction |
| `legacy ID` | `id` | `code` / row index | object | yes | Preserve in `legacyIds`. | Product Master |

## Product Column Safety

Confirmed Tax Invoice product columns:

- `productCode` -> รหัสสินค้า
- `productName` -> ชื่อสินค้า/รายการ
- `salePrice` -> ราคาขาย
- `unit` -> หน่วย
- `costPrice` -> ราคาทุน

Bulk import order to support:

```text
ชื่อสินค้า | ราคาขาย | หน่วย | ราคาทุน
```

Do not revert to the old order:

```text
ชื่อสินค้า | หน่วย | ราคาทุน | ราคาขาย
```

## Field Ownership

Product Master:

- Stable identity, code, name, unit, prices, category, suppliers link, active flag, audit metadata, search tokens.

Shortage Record:

- Branch, status, qty, transfer flags, order flags, expected delivery, source shortage event.

Supplier Record:

- Supplier directory, aliases/details, supplier contact data.

Invoice Snapshot:

- Historical invoice item name/code/unit/price/cost snapshot. Do not rewrite history.
