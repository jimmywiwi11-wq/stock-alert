# Final VAT Calculation Report

VAT mode: exclusive.

VAT rate: 7%.

Rounding:
- Line subtotal: quantity x sale price, rounded to 2 decimals.
- Invoice VAT: invoice subtotal x 7%, rounded to 2 decimals.
- Invoice grand total: before VAT + VAT, rounded to 2 decimals.
- Batch summary: sum invoice totals, rounded to 2 decimals.

Validated cases:
- Whole numbers.
- Decimals.
- `.005` rounding.
- Multiple invoices.
- Batch VAT summary.
