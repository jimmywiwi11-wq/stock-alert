# Final Print Workflow

Phase 5.2 generation creates invoices with:
- `status = พร้อมพิมพ์`
- `printed = false`
- `printedAt = null`
- `printStatus = unprinted`
- `printCount = 0`

Printing is still a separate owner/admin action.

Print helper behavior:
- Single invoice print can mark one invoice printed.
- Batch status becomes `พิมพ์แล้ว` only when every invoice in the request is printed.
- No automatic print is triggered by generation.
