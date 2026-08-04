# Final Security Model

Roles:
- Employee: create invoice requests and read own generated invoice preview.
- Admin/Owner/System: generate invoices, reserve numbers, write invoice history, and update request generation fields.
- Anonymous/disabled users: denied.

Protected operations:
- Employees cannot create/edit/delete generated invoices.
- Employees cannot reserve IV numbers.
- Employees cannot update generation locks/idempotency/audit docs.
- Employees cannot mark invoices printed.

Validation:
- Firestore Emulator security test passed with expected permission-denied logs for negative cases.
