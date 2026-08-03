# Phase 5.1 Test Results

Phase: Phase 5.1 - Production Invoice Request System

Status: READY FOR USER TEST - PHASE 5.1

## Summary

- Normal staff menu now opens Production Mode by default.
- Test Mode is preserved behind `localStorage.invoiceRequestTestMode=true`.
- Production drafts use `cms.invoiceRequest.productionDrafts`.
- Production request mirror uses `cms.invoiceRequest.productionRequests`.
- Offline/pending submit queue uses `cms.invoiceRequest.productionPending`.
- Production Firestore target collection is `invoiceRequests`.
- Request number strategy is `REQ-yyyyMMdd-000001` from a Firestore transaction counter.
- Idempotency uses `invoiceRequestIdempotency/{idempotencyKey}`.
- Audit log target is `invoiceRequestAuditLogs`.
- No Tax Invoice document, IV invoice number, print layout, or Tax Invoice History is created in this phase.

## Commands Run

```text
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check modules\product-master\product-master.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check modules\invoice-request\invoice-request-store.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check modules\invoice-request\invoice-request-summary.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check modules\invoice-request\invoice-request-sync.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check modules\invoice-request\invoice-request.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check tests\invoice-request.test.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check tests\invoice-request-smoke.test.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\invoice-request.test.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\product-master.test.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\product-master-smoke.test.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\cms-product-master-preview.test.js
C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\invoice-request-smoke.test.js
```

## Results

- Syntax checks passed for changed invoice request modules.
- Unit test passed for Test Mode keys, Production Mode keys, validation, duplicate detection, VAT summary, offline pending queue, and Product Master product creation.
- Product Master unit test passed with duplicate count `0`.
- Product Master browser smoke test passed.
- CMS Product Master preview regression test passed.
- Invoice Request smoke test passed on mobile, tablet, and desktop.
- Quantity focus stayed on quantity input after selecting an existing product.
- Production request submit did not create `invoices`.
- Smoke test had no horizontal scroll on tested viewports.

## Smoke Test Snapshot

```text
mobile:visible=true:focused=0:drafts=1:requests=1:pending=1:products=3:invoices=null:hscroll=false
tablet:visible=true:focused=0:drafts=1:requests=1:pending=1:products=3:invoices=null:hscroll=false
desktop:visible=true:focused=0:drafts=1:requests=1:pending=1:products=3:invoices=null:hscroll=false
```

## Known Limitations

- Firestore rules are proposal-only in this phase because no rules file exists in the repo.
- Offline submit is queued locally and mirrored as pending until Firebase is available.
- This phase creates the request and Product Master product only; it does not generate real invoices.
- Production Firestore writes were not tested against the live project during automated tests; local smoke tests exercised offline-safe behavior.

## Firebase Production Data

- Added: none by automated tests.
- Modified: none by automated tests.
- Deleted: none.

## Stop Point

READY FOR USER TEST - PHASE 5.1
