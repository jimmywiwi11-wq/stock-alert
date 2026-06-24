# Changelog

All notable Stock Alert changes should be recorded here. Use one section per released version and keep the app version synchronized with `version.json` and every visible version label.

## Unreleased

## 7.23 — 2026-06-24

### Fixed

- Deduplicated legacy supplier order cards by the displayed confirmation minute, status, product names, quantities, and units across ordered, receiving, delivered, and history views.
- Added a stable confirmation key to new order batches so retry copies collapse while genuine new orders remain distinct, including orders created within the same minute.
- Prefer the most progressed duplicate representative so submitted receive state is preserved when legacy copies disagree only in receive metadata.
- Kept Firebase records untouched; all legacy cleanup remains display-level and receive-state synchronization remains non-destructive.

## 7.22 — 2026-06-24

### Added

- Added a company-selection page and a manual purchase-order mode that reuses the existing PO editor, preview, export, and confirmation workflow.
- Added instant product-name and supported barcode-field search across shortage, order, and delivery history data.
- Added Firebase-backed company details with optional phone, contact, and notes, plus long-press edit and delete actions.

### Changed

- Confirmed shortage orders now mark their source records as ordered and hide them from all three shortage list pages immediately without deleting Firebase documents.
- Receiving goods marks linked shortage records completed instead of controlling shortage visibility or deleting their audit records.
- Supplier renaming changes only the active company directory; historical purchase orders retain their stored supplier names.

## 7.21 — 2026-06-24

### Fixed

- Bundled html2canvas 1.4.1 locally and capture the exact shortage preview paper for PNG save and share.
- Made desktop sharing fall back to downloading the already-generated PNG without reporting an unsupported-share error.
- Preserved the full paper height so long shortage exports are not clipped or re-laid out.

### Changed

- Restyled all, Branch 1, and Branch 2 shortage exports as compact warm-yellow notebook paper with close horizontal lines.
- Flowed numbered product names naturally across each line and aligned small red, yellow, and green quantity badges above the product text.

## 7.20 — 2026-06-24

### Fixed

- Prevented repeated supplier-order confirmation from creating duplicate batches, including rapid taps and reload retries.
- Added an atomic Firebase duplicate check using supplier, confirmed time, status, item names, quantities, and units.
- Deduplicated ordered, receiving, delivered, and supplier-history cards and counts without deleting existing Firebase records.
- Kept distinct orders visible when their confirmed time, items, quantities, or units differ.

## 7.16 — 2026-06-24

### Added

- Added paper-style image export to all, Branch 1, and Branch 2 shortage pages.
- Added all/date and with/without quantity choices with a preview before save or share.
- Combined Branch 1 and Branch 2 remaining quantities on the combined shortage export.

## 7.15 — 2026-06-23

### Fixed

- Removed the repeated compact-list minimum height and excess bottom padding inside shortage date groups, so consecutive dates now follow the wrapped item pills naturally.

## 7.14 — 2026-06-23

### Added

- Grouped all, Branch 1, and Branch 2 shortage lists by their original recorded date, newest date first.

### Compatibility

- Preserved existing item cards, ordering within each date, Firebase fields, search, copy, editing, and deleting behavior.
- Existing records without `createdAt` use `updatedAt` as a backward-compatible date fallback.

## 7.13 — 2026-06-23

### Changed

- “ของที่แบ่งไว้แล้ว” now shows only unconfirmed rounds automatically closed by a Bangkok calendar-date rollover.
- “รับหรือส่งส่วนที่แบ่งก่อน” now immediately applies the prepared quantities to shortage/order-needed data and records the round as confirmed normal transfer history.
- Completed, intentionally partial-sent, and confirmed rounds remain in normal transfer history and never enter the rollover-pending list.

### Compatibility

- Reused the existing shortage and transfer-history collections with additive status and archive-reason fields.
- Preserved stable round IDs, same-day round numbering, per-line idempotency markers, and controlled PWA updates.

## 7.12 — 2026-06-23

### Added

- Added round-specific “ยืนยันรับ/ส่งสินค้า” controls to archived transfer details.
- Added confirmed-by/time metadata and per-line idempotency markers.

### Changed

- Confirmation removes fully covered shortage records and reduces numeric partially covered shortages.
- Confirmed rounds remain visible with duplicate confirmation disabled.

### Compatibility

- Reused the existing shortage and transfer-history collections with additive fields only.
- Preserved Phase 1 lifecycle, Phase 2 history grouping, and transferred-first status ordering.

## 7.11 — 2026-06-23

### Changed

- Transfer status details now list transferred items before items marked “ยังไม่แบ่ง”.
- Progress calculation, round lifecycle, Firebase data, and archived-round UI are unchanged.

## 7.10 — 2026-06-23

### Added

- Added the “ของที่แบ่งไว้แล้ว” section below the existing transfer direction buttons.
- Added read-only archived-round browsing by shortage branch, calendar date, and numbered round.
- Added archived item details for product, quantity, unit, preparer, and transfer direction.

### Compatibility

- Reused the existing transfer-history collection and legacy round fields without changing Phase 1 lifecycle behavior.
- Receive/send confirmation for archived rounds remains intentionally unimplemented.

## 7.9 — 2026-06-23

### Added

- Added one active daily transfer round at a time with Bangkok calendar-date keys.
- Added sequential same-day round numbers and additive transfer-round metadata.
- Added the “รับหรือส่งส่วนที่แบ่งก่อน” action for archiving partial rounds.

### Changed

- Closing a partial round removes its home progress card instead of showing 0%.
- Date rollover archives an unfinished round under its original date without automatically creating a new round.
- Updated visible version, manifest, version metadata, and service-worker cache identifier to V7.9.
- Fixed initial offline rendering before a transfer direction has been opened.
- Fixed the controlled-update script syntax so version checking and update dialogs initialize correctly.
- Delayed the initial update check until its runtime handler is available.
- Ensured shortage-entry navigation remains on the form after all compatibility wrappers run.

### Compatibility

- Reused the existing shortage and transfer-history collections.
- Added compatibility handling for legacy prepared-transfer flags without deleting existing Firebase data.

### Documentation

- Added the project developer-guide structure under the repository root and `docs/`.
- Documented the current architecture, features, interface constraints, testing expectations, deployment safeguards, known issues, and roadmap.

## 7.8 — 2026-06-21

- Current version recorded in `version.json`.
- Uses a controlled update flow intended to prompt users before applying a new cached release.

> Earlier release history is not available in this repository. Add verified historical entries only; do not reconstruct them from assumptions.
