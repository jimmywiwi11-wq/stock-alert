# Phase 4.1 Test Plan

## Scope

Test only Product Master analysis and preview foundation.

Out of scope:

- Production migration
- Product code creation
- Firestore schema changes
- Real Product Master integration into Stock Alert or Tax Invoice UI
- Invoice request/draft invoice flow

## Tests

1. Static syntax check for `cms-product-master-preview.js`.
2. Unit test for field mapping and eligibility.
3. Unit test for blank price vs numeric zero.
4. Unit test for leading-zero code preservation.
5. Unit test for Thai product names.
6. Unit test for supplier split by `/` and `,`.
7. Unit test for exact duplicate.
8. Unit test for fuzzy duplicate candidate.
9. Unit test for same code with different name.
10. Unit test for same name with different code.
11. Unit test for missing unit -> `NEED_UNIT`.
12. Unit test for missing code -> `NEED_CODE`.
13. Generate JSON/CSV migration preview.
14. Confirm adapter does not write Firestore/localStorage.
15. Runtime smoke test Stock Alert opens.
16. Runtime smoke test desktop Tax Invoice iframe opens.
17. Mobile smoke test button remains hidden.
18. Refresh test preview script still runs.
19. Restart local server and verify app still opens.

## Test Data

The fixture in `tests/cms-product-master-preview.test.js` includes:

- Thai product names
- Leading-zero code `00123`
- Blank cost price
- Blank sale price
- Numeric zero cost/sale price
- Blank unit
- Supplier with multiple names
- Same code/same name
- Same code/different name
- Same name/different code
- Fuzzy name candidate

## Expected Result

All tests pass and no production data is changed.
