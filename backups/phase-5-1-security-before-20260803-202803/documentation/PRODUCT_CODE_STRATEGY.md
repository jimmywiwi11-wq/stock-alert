# Product Code Strategy

Phase: Phase 4.1 - Analysis only

No production product codes were created in this phase.

## Existing Tax Invoice Pattern

Observed in `desktop/tax-invoice/tax_invoice_app.html`:

- `pCode` is readonly on the product form.
- `previewProductCode()` calls `nextCode(thaiInitials(pName.value), store.get('products', []), 5)`.
- `saveProduct()` uses `pCode.value || nextCode(thaiInitials(pName.value), arr, 5)`.
- Bulk import uses the Tax Invoice localStorage `products` list.
- Product code is displayed in the Tax Invoice product table and invoice item table.

## Pattern Summary

| Item | Current observation |
| --- | --- |
| Prefix | Generated from Thai initials of product name |
| Number width | 5 digits requested in code path |
| Leading zero | Must be preserved |
| Latest number | Runtime-only; depends on current `localStorage.products` |
| Duplicate check | Existing product array checked by code/name before save |
| Source | Tax Invoice localStorage `products` |
| Invalid codes | Runtime-only; not read from production in Phase 4.1 |
| Duplicate codes | Runtime-only; preview adapter can detect from supplied data |

## Future Multi-computer Safe Strategy

Use a server-side or Firestore transaction strategy before creating real product codes:

1. Normalize requested prefix.
2. Read `productCodeCounters/{prefix}` in a Firestore transaction.
3. Reserve the next code in `productCodeLocks/{productCode}`.
4. Create/update the Product Master document with the reserved code.
5. Increment counter atomically.
6. Store idempotency key for retries.
7. Reject duplicates if lock already exists.

Suggested future collections:

```text
productCodeCounters/{prefix}
productCodeLocks/{productCode}
productCodeReservations/{reservationId}
```

## Phase 4.1 Rule

The preview may propose empty `proposedProductCode` for missing codes, but it must not create or reserve real production codes.
