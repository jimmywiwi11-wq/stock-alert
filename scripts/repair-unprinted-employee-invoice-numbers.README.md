# Repair Unprinted Employee Invoice Numbers

One-time admin repair tool for correcting the current unprinted employee-generated invoice numbers:

- `IV000115` -> `IV000138`
- `IV000116` -> `IV000139`
- `IV000118` -> `IV000140`

This tool does not run automatically and does not modify production data in dry-run mode.

## Safety Rules

- Uses Firebase Admin SDK only.
- Requires an explicit service-account JSON path in `FIREBASE_ADMIN_SERVICE_ACCOUNT`.
- Default mode is dry run.
- Apply mode requires the exact confirmation string:
  `CONFIRM_RENUMBER_UNPRINTED_EMPLOYEE_INVOICES`
- Refuses to continue if a target invoice is printed, has `printedAt`, has duplicate target number, or cannot be uniquely identified.
- Backs up every affected Firestore document before writing.
- Creates new `taxInvoices` documents before deleting old invoice-number document IDs.
- Verifies created replacement documents before updating references and deleting old IDs.
- Updates invoice references only in invoice-related Firestore collections.
- Does not modify products, customers, line items, prices, VAT, dates, names, addresses, or printed invoices.
- Does not add automatic close-gap-after-delete behavior.

## Environment

Set this environment variable to a Firebase service-account JSON file for project `check-chokanan`:

```powershell
$env:FIREBASE_ADMIN_SERVICE_ACCOUNT = "C:\path\to\check-chokanan-service-account.json"
```

## Dry Run

Dry run reads Firestore, writes a backup JSON file, prints documents found, proposed mapping, changed references, and counter information, but does not write to Firestore.

```powershell
npm run repair:invoice-numbers:dry-run
```

Equivalent direct command:

```powershell
node scripts/repair-unprinted-employee-invoice-numbers.mjs --dry-run
```

Review the printed report before applying. Confirm that:

- each old number has exactly one `taxInvoices` document
- each document has `printStatus: ready_to_print`
- no document has `printed: true`, `printStatus: printed`, `status: printed`, `printedAt`, or `printCount > 0`
- target numbers `IV000138`, `IV000139`, and `IV000140` do not already exist
- references listed are only invoice/request/history/counter references

## Apply

Apply mode writes Firestore changes. It still backs up affected documents first and verifies after the repair.

```powershell
$env:FIREBASE_ADMIN_SERVICE_ACCOUNT = "C:\path\to\check-chokanan-service-account.json"
$env:REPAIR_INVOICE_CONFIRMATION = "CONFIRM_RENUMBER_UNPRINTED_EMPLOYEE_INVOICES"
npm run repair:invoice-numbers:apply
```

Equivalent direct command:

```powershell
node scripts/repair-unprinted-employee-invoice-numbers.mjs --apply --confirm CONFIRM_RENUMBER_UNPRINTED_EMPLOYEE_INVOICES
```

## What It Updates

- `taxInvoices` documents for the three target invoices
- `invoiceRequests` invoice-number/id reference arrays, including `generatedInvoiceNumbers`, `generatedInvoiceIds`, and `nativeInvoiceIds`
- nested `requestSnapshot` invoice-number/id reference arrays
- invoice-related history, bridge, reservation, idempotency, and audit documents when they contain these invoice-number references
- `invoiceNumberCounters/IV.lastSequence`, never below the highest corrected sequence

## Backup

Each run creates:

```text
backups/repair-unprinted-employee-invoice-numbers-YYYYMMDD-HHMMSS/backup.json
```

The backup contains the original target invoice documents, every affected reference document, the mapping, and the counter state before repair.
