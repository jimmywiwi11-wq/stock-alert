# Final Invoice Workflow

Employee flow:
1. Open Stock Alert / CMS.
2. Create an invoice request.
3. Select customer and products.
4. Submit request to `invoiceRequests`.
5. Request starts as `กำลังดำเนินการ`.
6. Generator validates and creates invoices.
7. Request becomes `พร้อมพิมพ์`.
8. Employee can read preview data only.

Owner/admin flow:
1. Open desktop CMS / Tax Invoice.
2. Review generated invoices.
3. Print one invoice or the whole batch.
4. When every invoice is printed, request can move to `พิมพ์แล้ว`.

Phase 5.2 does not auto-print and does not mark requests as printed during generation.
