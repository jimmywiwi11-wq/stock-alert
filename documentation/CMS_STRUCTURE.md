# ChokAnan Management System (CMS)

## Purpose

ChokAnan Management System (CMS) is the planned umbrella workspace for shop operations tools.
The existing Stock Alert PWA remains the primary production app.

## Current Phase

Phase 1 prepares the workspace only:

- create a safe CMS folder structure
- copy TaxInvoiceAppV22 into a separate desktop module
- keep the existing Stock Alert entry point unchanged
- do not connect routes, navigation, Firebase, schemas, or shared business logic

## Current Apps

### Stock Alert

- Location: project root
- Entry file: `index.html`
- Supporting files: `app.js`, `cash-reconciliation.js`, `sw.js`, `manifest.json`, `version.json`
- Type: mobile-first PWA using plain HTML, CSS, JavaScript, Firebase sync, and service worker caching

### Tax Invoice

- Location: `desktop/tax-invoice/`
- Entry file: `desktop/tax-invoice/tax_invoice_app.html`
- Type: standalone desktop-oriented HTML app with local assets and manifest
- Status: copied only, not integrated with Stock Alert

## Folder Structure

```text
desktop/
  tax-invoice/

modules/
  stock-alert/
  sales/
  customers/
  products/
  finance/
  reports/

shared/
services/
config/
database/
assets/
backups/
documentation/
```

## Future Separation Plan

Mobile-first workflows should stay in Stock Alert until a later phase defines clear contracts.
Desktop workflows such as Tax Invoice should remain in `desktop/` until routing and data ownership are designed.

## Planned Modules

- `modules/stock-alert/`: future home for Stock Alert module code if it can be moved safely
- `modules/sales/`: future sales workflows
- `modules/customers/`: future customer workflows
- `modules/products/`: future product master workflows
- `modules/finance/`: future finance and reconciliation workflows
- `modules/reports/`: future reports and summaries

## Shared Data Guidance

Future shared data may include product names, supplier references, branch metadata, and reporting summaries.
Customer data, tax invoice records, print settings, Stock Alert shortage records, and Firebase collections must remain separate until a reviewed integration plan exists.

## Production Restrictions

- Do not change the production Stock Alert entry point without approval.
- Do not silently update PWA behavior.
- Do not change Firebase collections or schemas in this phase.
- Do not connect Tax Invoice navigation in this phase.
- Do not deploy, push, merge, or commit in this phase.

## Phase 2 Readiness

Phase 2 should begin only after confirming:

- Stock Alert still opens from `index.html`
- Tax Invoice opens separately from `desktop/tax-invoice/tax_invoice_app.html`
- copied files match the original TaxInvoiceAppV22 files
- a data and navigation integration plan is approved
