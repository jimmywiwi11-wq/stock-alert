# Migration Preview Plan

## Scope

Phase 2 เป็น preview-only ห้ามย้ายข้อมูลจริง

ข้อมูลที่จะวางแผน:

- Products
- Customers
- Invoice history
- Invoice items
- Layouts
- Settings
- Company information
- Number formats

## Steps

1. Export
   - Stock Alert: Firestore export/read-only + localStorage cache
   - Tax Invoice: localStorage backup JSON
2. Backup
   - เก็บ source export ทั้งสองฝั่ง
   - เก็บ hash และ counts
3. Transform
   - normalize product/customer/invoice schemas
   - preserve tax ID as string
   - preserve invoiceNo exactly
4. Validate
   - required fields
   - totals/VAT
   - product code uniqueness
   - invoice number uniqueness
5. Duplicate Detection
   - products: code -> normalized name -> fuzzy match
   - customers: taxId -> name+address
   - invoices: invoiceNo
6. Preview
   - new rows
   - merge candidates
   - conflicts
   - skipped rows
7. Import To Test Environment
   - use `cms_test_*` collections only
   - attach `migrationBatchId`
8. Verification
   - counts
   - hash/source refs
   - sample invoice print
   - query/index checks
9. Rollback
   - remove/disable only documents from `migrationBatchId`
   - restore standalone backup if needed

## Data-specific Notes

Products:

- preserve supplier arrays
- do not create two permanent product masters
- shortage records remain separate

Customers:

- tax ID must remain string
- branch/head office field needs approval

Invoices:

- split header/items in test schema
- retain original snapshots
- do not reuse production invoice counter

Layouts:

- preserve `fullTaxLayouts` objects exactly in test migration
- do not alter 9x11/9x5.5 coordinates

Settings:

- preserve shop info
- separate print profile from company info

Number formats:

- migrate `invoiceNumberSettings`
- compute next from max existing invoice number
- official issuing must use transaction
