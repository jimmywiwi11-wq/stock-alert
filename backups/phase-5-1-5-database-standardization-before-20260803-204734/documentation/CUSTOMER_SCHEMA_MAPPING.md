# Customer Schema Mapping

## สถานะปัจจุบัน

Stock Alert ปัจจุบันไม่พบ customer master schema ใช้งานจริง ระบบหลักจัดการ shortage, suppliers, branch, orders และ cash reconciliation

TaxInvoiceAppV22 มี customer master ใน `localStorage.customers`

## Tax Invoice Customer Schema

หลัง normalize ลูกค้ามี field:

- `code`
- `prefix`
- `name`
- `address1`
- `address2`
- `taxId`
- `tax`
- `phone`
- `tel`
- `address`

ระบบกันซ้ำโดย:

- tax ID ตรงกัน
- หรือ name + address1 + address2 ตรงกัน

## Proposed `customers/{customerId}`

```json
{
  "customerId": "generated_or_code",
  "customerCode": "CU001",
  "prefix": "บริษัท",
  "name": "ชื่อลูกค้า",
  "displayName": "บริษัท ชื่อลูกค้า",
  "address1": "",
  "address2": "",
  "taxId": "",
  "phone": "",
  "branchType": "headOffice",
  "branchCode": "",
  "active": true,
  "sourceSystems": ["tax-invoice"],
  "legacyRefs": {
    "taxInvoiceCode": "CU001"
  },
  "createdAt": 0,
  "updatedAt": 0,
  "updatedBy": ""
}
```

## Mapping

| Proposed Field | TaxInvoiceAppV22 | stock-alert | Rule |
| --- | --- | --- | --- |
| `customerId` | stable id from `code`/`taxId`/name-address | none | generate in migration |
| `customerCode` | `code` | none | preserve |
| `prefix` | `prefix` | none | preserve |
| `name` | `name` | none | preserve |
| `displayName` | prefix + name | none | derive |
| `address1` | `address1` | none | preserve |
| `address2` | `address2` | none | preserve |
| `taxId` | `taxId`/`tax` | none | keep as string to preserve leading zero |
| `phone` | `phone`/`tel` | none | preserve |
| `branchType` | not explicit | none | default `headOffice`; allow branch later |
| `active` | not explicit | none | default true |

## Migration Preview Only

1. Export `localStorage.customers`
2. Normalize tax ID as string, never number
3. Generate customerId
4. Detect duplicate tax ID
5. Detect duplicate normalized name + address
6. Preview skipped/merged/new rows
7. Import to test collection only
8. Verify invoice references still resolve

## Rollback

- Keep original Tax Invoice backup
- Keep migration batch metadata
- Delete/disable only documents with the test `migrationBatchId`

## Open Questions

- ต้องการแยกลูกค้าสำนักงานใหญ่/สาขาอย่างไร
- มี customer master ภายนอก Tax Invoice หรือไม่
- Tax ID ที่มีเครื่องหมาย/ช่องว่างควรรักษารูปแบบเดิมแยกจาก normalized tax ID หรือไม่
