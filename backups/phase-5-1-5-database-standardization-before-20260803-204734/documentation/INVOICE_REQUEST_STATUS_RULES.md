# Invoice Request Status Rules

## Allowed Statuses

Tax invoice requests must use only these three visible statuses:

1. `กำลังดำเนินการ`
2. `พร้อมพิมพ์`
3. `พิมพ์แล้ว`

These are request-level statuses. They describe the whole request submitted by staff, not one individual invoice page.

## Status Flow

```text
ส่งคำขอ
  -> กำลังดำเนินการ
  -> พร้อมพิมพ์
  -> พิมพ์แล้ว
```

## Rules

- When staff submits a request, set request status to `กำลังดำเนินการ`.
- While the system validates data, splits items into invoices with no more than 10 items per invoice, and creates invoices, keep status as `กำลังดำเนินการ`.
- When every invoice in the request has been created and saved, change status to `พร้อมพิมพ์`.
- When every invoice in that request has been printed, change status to `พิมพ์แล้ว`.
- If one request is split into multiple invoices, do not change the request to `พิมพ์แล้ว` until every split invoice is printed.
- Staff may view the request status but must not edit it directly.
- `พิมพ์แล้ว` may be set only by system print confirmation or by a desktop admin.
- Every event must keep timestamp and user name for submitter, invoice creator, and printer.

## Request Fields

Suggested fields for `automaticInvoiceJobs/{jobId}` or the future request collection:

- `requestId`
- `status`: one of `กำลังดำเนินการ`, `พร้อมพิมพ์`, `พิมพ์แล้ว`
- `items`
- `invoiceItemGroups`: item chunks, each with no more than 10 items
- `invoiceIds`
- `invoices`: generated invoices with `invoiceId`, `invoiceNo`, `printed`, `printedAt`, `printedBy`
- `submittedAt`, `submittedBy`
- `generatedAt`, `generatedBy`
- `printedAt`, `printedBy`
- `statusEditableByStaff`: always `false`
- `statusHistory`: append-only audit events

## Event Types

- `submitted`: staff submitted the request, status becomes `กำลังดำเนินการ`.
- `generated`: all invoices were created and saved, status becomes `พร้อมพิมพ์`.
- `printed`: one invoice was printed. The request becomes `พิมพ์แล้ว` only when all invoices in the request are printed.

## Implementation Helper

The shared helper lives at:

```text
modules/cms-integration/cms-invoice-request-status.js
```

It exposes:

- `window.CMSInvoiceRequestStatus.STATUS`
- `createSubmittedRequest(input)`
- `splitItemsForInvoices(items, maxItemsPerInvoice)`
- `markGenerated(request, generatedInvoices, by, at)`
- `markInvoicePrinted(request, invoiceId, by, options)`
- `markAllPrintedByAdmin(request, by, at)`
- `canStaffEditStatus()`
