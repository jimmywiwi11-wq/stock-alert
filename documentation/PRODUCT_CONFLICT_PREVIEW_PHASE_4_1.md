# Product Conflict Preview Phase 4.1

This report is generated from the Phase 4.1 test fixture, not production data.

## Preview Paths

- JSON: `documentation/PRODUCT_MIGRATION_PREVIEW_PHASE_4_1.json`
- CSV: `documentation/PRODUCT_MIGRATION_PREVIEW_PHASE_4_1.csv`
- Adapter: `modules/cms-integration/cms-product-master-preview.js`
- Test: `tests/cms-product-master-preview.test.js`

## Fixture Source Counts

| Source | Count |
| --- | ---: |
| Stock Alert product cache fixture | 4 |
| Stock Alert shortage fixture | 2 |
| Tax Invoice product fixture | 6 |
| Total | 12 |

## Conflict Counts

| Group | Count |
| --- | ---: |
| Same code + same name | 1 |
| Same code + different name | 1 |
| Same name + different code | 1 |
| Fuzzy name candidates | 14 |
| Spacing difference | 1 |
| Case difference | 0 |
| Unit conflict | 0 |
| Sale price conflict | 0 |
| Cost price conflict | 1 |
| Stock Alert only | 4 |
| Tax Invoice only | 4 |
| Missing code | 4 |
| Missing unit | 1 |
| Missing sale price | 4 |
| Missing cost price | 4 |
| Invalid record | 0 |

## Proposed Action Counts

| Proposed action | Count |
| --- | ---: |
| KEEP | 3 |
| CREATE_NEW | 1 |
| NEED_UNIT | 1 |
| NEED_CODE | 3 |
| REVIEW_CONFLICT | 4 |
| SKIP_INVALID | 0 |

## Safety Notes

- Fuzzy match is preview-only.
- No automatic merge is allowed.
- Similar names are not considered the same product until a user/admin confirms.
- Blank price remains blank (`null` in preview).
- Numeric zero remains numeric `0`.
