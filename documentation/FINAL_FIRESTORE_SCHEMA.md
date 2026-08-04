# Final Firestore Schema

Collections used by the final invoice workflow:
- `invoiceRequests/{requestId}`: employee request snapshots and generation status.
- `taxInvoices/{invoiceId}`: generated full tax invoice records.
- `taxInvoiceHistory/{historyId}`: history mirror for generated invoices.
- `invoiceNumberCounters/IV`: atomic IV counter.
- `invoiceNumberReservations/{requestId}:chunk:{n}`: per-chunk reservation records.
- `invoiceGenerationLocks/{requestId}`: generation lock state.
- `invoiceGenerationIdempotency/{requestId}:v1`: retry protection.
- `invoiceGenerationAuditLogs/{auditId}`: generation audit events.

Compatibility:
- Legacy desktop history uses local `invoices` shape with `no`, `items`, `beforeVat`, `vat`, and `total`.
- Generated docs also store request linkage fields: `sourceRequestId`, `sourceRequestNumber`, `ownerUid`, `requestedByUid`, and `requestedBranch`.
