# Final UAT Guide

Recommended final UAT:
1. Open the app and confirm `V7.75`.
2. Create a production invoice request with 1 item.
3. Confirm request status starts as `กำลังดำเนินการ`.
4. Generate invoice and confirm one IV number.
5. Repeat with 10, 11, and 25 items.
6. Confirm each invoice has at most 10 items.
7. Confirm VAT per invoice and batch total.
8. Confirm request becomes `พร้อมพิมพ์`.
9. Confirm no automatic print starts.
10. Confirm employee cannot edit generated invoices.
11. Owner/admin prints one invoice.
12. Owner/admin prints all invoices.
13. Confirm request becomes `พิมพ์แล้ว` only after all invoices are printed.

Production deployment still requires explicit approval after Final UAT.
