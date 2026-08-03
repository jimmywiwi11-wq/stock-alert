# Phase 5.1 Firestore Rules Proposal

Phase: Phase 5.1 - Production Invoice Request System

Status: Proposal only. Not deployed.

## Collections

- `invoiceRequests/{requestId}`
- `invoiceRequestCounters/{yyyyMMdd}`
- `invoiceRequestIdempotency/{idempotencyKey}`
- `invoiceRequestAuditLogs/{auditId}`

## Intended Staff Permissions

- Staff may create invoice requests through the approved app flow.
- Staff may read status/history according to future role rules.
- Staff may create/update/delete their own local draft before submit.
- Staff must not directly change request status after submit.
- Staff must not add `generatedInvoiceIds`.
- Staff must not change `printedInvoiceCount`.
- Staff must not change request ownership or `requestedAt`.
- Staff must not create real Tax Invoice documents in Phase 5.1.

## Deployment Status

No Firestore rules file exists in the current repo. No rules were deployed in Phase 5.1.

Before production deployment, create emulator tests for:

- Creating a valid `invoiceRequests` document.
- Blocking status updates by normal staff.
- Blocking generated invoice fields by normal staff.
- Blocking deletion of submitted requests.
- Allowing atomic counter/idempotency writes only through trusted server/admin rules or approved constrained client rules.
