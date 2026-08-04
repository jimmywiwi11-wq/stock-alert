# Data Type Standard

This standard is proposed for future writes. Phase 5.1.5 does not migrate production data.

| Area | Standard Type | Notes |
| --- | --- | --- |
| Money | Firestore Number | Store numeric value without commas. Use `null` for unknown, not `0`. |
| Quantity | Firestore Number | Decimal allowed when business flow needs it. |
| VAT rate | Number | Current logic uses decimal `0.07`; display can show 7%. |
| Tax ID | String | Never Number; preserves leading zero and 13 digits. |
| Phone | String | Never Number; preserves leading zero and formatting. |
| Product Code | String | Product Master generated code uses `PM00001` format. |
| Dates in Firestore | Timestamp preferred | ISO string allowed for legacy/request snapshots until migration. |
| Dates in export/display | ISO string | Export-friendly, not primary server type. |
| Status | Internal enum string | Use documented enums only. |
| Boolean flags | Boolean | Example: `active`, `testMode`, `transferPrepared`. |
| Missing optional text | Empty string or omitted | Do not store placeholder text such as `ยังไม่ได้ระบุ` as real supplier data. |

Rounding:

- Line subtotal = `salePrice * quantity`
- VAT = subtotal * VAT rate
- Keep numeric precision in data; round for display/export.
