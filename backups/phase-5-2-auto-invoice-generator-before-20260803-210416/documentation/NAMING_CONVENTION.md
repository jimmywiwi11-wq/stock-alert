# Database Naming Convention

## Collections

Recommended future convention:

- Use lower camel case for new CMS collections: `invoiceRequests`, `invoiceRequestDrafts`
- Keep existing production collections until approved migration: `stock_alert_beta1_items`, `stock_alert_beta1_products`
- Avoid mixing version numbers into new collection names unless it is a temporary migration collection.

## Fields

Canonical field names:

| Concept | Canonical | Compatibility aliases |
| --- | --- | --- |
| Product id | `productId` | `id` |
| Product code | `productCode` | `code` |
| Product name | `productName` | `name`, `itemName` |
| Sale price | `salePrice` | `price`, `sellingPrice` |
| Cost price | `costPrice` | `cost` |
| Quantity | `quantity` | `qty` |
| Created user display | `createdBy` | `creator`, `by` |
| Created user uid | `createdByUid` | none |
| Request owner uid | `ownerUid` | none |
| Branch display | `requestedBranch` | `branch`, `sourceBranch` |

## localStorage namespaces

Future keys should use:

- `cms.productMaster.*`
- `cms.invoiceRequest.*`
- `cms.taxInvoice.*`
- `stockAlert.*`
- `cms.test.*`

Existing keys remain compatible in this phase.
