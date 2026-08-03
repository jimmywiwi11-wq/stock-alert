# Immutable Fields

Phase 5.1.5 documents the target rules. It does not migrate production data.

## Product

Immutable after create:

- `productId`
- `id`
- `productCode`
- `code`
- `createdAt`
- `createdBy`
- `createdByUid`
- `ownerUid`
- `createdFrom`

Mutable by controlled roles:

- `productName`
- `name`
- `search`
- `unit`
- `salePrice`
- `costPrice`
- `category`
- `supplier`
- `active`
- `updatedAt`
- `updatedBy`

## Invoice Request

Immutable after submit for employee:

- `requestId`
- `requestNumber`
- `requestedBy`
- `requestedByUid`
- `ownerUid`
- `requestedAt`
- `requestedBranch`
- `invoiceSettings`
- `customerSnapshot`
- `items`
- `itemSnapshots`
- `subtotal`
- `vatAmount`
- `grandTotal`

Admin/backend-only mutable:

- `status`
- `generationState`
- `generatedInvoiceIds`
- `printedInvoiceCount`
- `generatedAt`
- `printedAt`
- `printedBy`
- `updatedAt`

## Audit Log

Append-only:

- No update
- No delete
- `actorUid` must equal authenticated uid
