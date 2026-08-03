# Final Invoice Number Report

Format: `IV` + 6 digits.

Examples:
- `1 -> IV000001`
- `125 -> IV000125`
- `999999 -> IV999999`

Rejected:
- `0`, negative numbers, decimals, invalid strings, null/undefined, and values above `999999`.

Counter strategy:
- Firestore counter document: `invoiceNumberCounters/IV`.
- Reservation occurs inside the same generator transaction.
- Generated invoices and history share the same reserved number.

Latest production number:
- Not read from production in this implementation run.
- Existing desktop localStorage `invoices` remains untouched.
