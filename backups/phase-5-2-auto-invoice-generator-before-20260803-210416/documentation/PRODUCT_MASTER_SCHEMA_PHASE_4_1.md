# Central Product Master Schema Proposal

Phase: Phase 4.1 - Central Product Master Analysis and Test Foundation

This is a proposal only. No production schema was changed in this phase.

## Proposed Collection

```text
cms_product_master/{productId}
```

The final collection name must be approved before Phase 4.2 or any production migration.

## Product Master Fields

| Field | Type | Required | Rule |
| --- | --- | --- | --- |
| `productId` | string | yes | Internal stable ID. Never use product name as the ID. Must not change when name changes. |
| `productCode` | string | future-required | User-visible Tax Invoice code. Must be unique when present. Leading zero must be preserved. |
| `productName` | string | yes | Real display name. Thai text supported. |
| `normalizedName` | string | yes | Search/matching normalized value. |
| `unit` | string | no | May be blank temporarily, but blank unit is not ready for Tax Invoice. |
| `costPrice` | number/null | no | Blank stays `null`; real zero stays `0`. |
| `salePrice` | number/null | no | Blank stays `null`; real zero stays `0`. |
| `category` | string | no | Category label/reference from Stock Alert. |
| `suppliers` | array | no | Multiple suppliers preserved as separate names. |
| `active` | boolean | yes | `false` only for archived/disabled products. |
| `createdAt` | number/string | yes | Preserve source timestamp if available. |
| `createdBy` | string | no | Preserve source user if available. |
| `createdFrom` | string | yes | `stock-alert-products`, `stock-alert-shortages`, `tax-invoice-products`, or import source. |
| `sourceBranch` | string | no | Only source context, not inventory status. |
| `updatedAt` | number/string | no | Preserve latest source timestamp. |
| `updatedBy` | string | no | Preserve latest source user. |
| `legacyIds` | object | yes | Map original IDs/codes from each system. |
| `searchTokens` | array | yes | Search helper tokens. |
| `syncStatus` | string | yes | `preview`, `pending_approval`, `synced`, `conflict`, `needs_data`. |

## Data That Must Stay Outside Product Master

- Shortage status: out of stock / low stock
- Branch shortage records
- Remaining quantity
- Transfer status and transfer quantity
- Supplier order status
- Purchase order lines
- Received/delivery history
- Invoice line snapshots
- Invoice print/history records

## Tax Invoice Eligibility

A product is ready to appear in Tax Invoice when:

- `productName` has a value
- `unit` has a value

Not required for visibility:

- `costPrice`
- `salePrice`

Rules:

- Name + unit + blank sale price = eligible for Tax Invoice display.
- Name + unit + blank cost price = eligible for Tax Invoice display.
- Name + blank unit = not eligible; action `NEED_UNIT`.
- Blank name = invalid; action `SKIP_INVALID`.

## Phase 4.1 Decision

No central Product Master is connected to production UI in this phase. The schema is used only for preview and approval.
