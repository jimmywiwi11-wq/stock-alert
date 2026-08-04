# Final System Architecture

Chokanan Management System keeps the mobile Stock Alert PWA and the desktop Tax Invoice app separate, connected through small CMS modules.

Core areas:
- `modules/invoice-request/`: employee invoice request workflow.
- `modules/product-master/`: shared product creation and product code generation.
- `modules/invoice-generator/`: automatic invoice generation from approved request snapshots.
- `desktop/tax-invoice/`: existing full Tax Invoice UI and print layout.
- `firestore.rules`: local rules proposal and emulator-tested permissions.

Phase 5.2 adds an automatic generator without redesigning the production print layout. Requests are validated, locked, split into groups of 10, assigned `IV000001` style numbers, saved to invoice/history collections, and moved to `พร้อมพิมพ์`.
