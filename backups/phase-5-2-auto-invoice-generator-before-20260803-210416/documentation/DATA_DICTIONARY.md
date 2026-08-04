# ChokAnan CMS Data Dictionary

Phase 5.1.5 is documentation and readiness only. No production schema migration is performed.

## Firestore Collections

| Collection | Owner | Purpose | Current status |
| --- | --- | --- | --- |
| `stock_alert_beta1_items` | Stock Alert | Shortage records for branches | Existing production collection |
| `stock_alert_beta1_activity` | Stock Alert | Activity feed | Existing production collection |
| `stock_alert_beta1_orders` | Stock Alert | Purchase orders in `main` document | Existing production doc collection |
| `stock_alert_beta1_deliveries` | Stock Alert | Delivery history in `main` document | Existing production doc collection |
| `stock_alert_beta1_transfer_history` | Stock Alert | Transfer history in `main` document | Existing production doc collection |
| `stock_alert_beta1_categories` | Stock Alert | Category list in `main` document | Existing production doc collection |
| `stock_alert_beta1_suppliers` | Stock Alert | Supplier list/details in `main` document | Existing production doc collection |
| `stock_alert_beta1_unit_conversions` | Stock Alert | Unit conversion dictionary | Existing production doc collection |
| `stock_alert_beta1_products` | Product Master | Product master | Existing Phase 4/5 collection |
| `productCodeCounters` | Product Master | Product code sequence | Phase 5.1 collection |
| `invoiceRequests` | Invoice Request | Submitted production invoice requests | Phase 5.1 collection |
| `invoiceRequestCounters` | Invoice Request | Daily request number sequence | Phase 5.1 collection |
| `invoiceRequestIdempotency` | Invoice Request | Duplicate submit guard | Phase 5.1 collection |
| `invoiceRequestAuditLogs` | Invoice Request | Append-only request audit | Phase 5.1 collection |
| `invoiceRequestDrafts` | Invoice Request | Proposed Firestore draft collection | Proposed by rules |
| `users` | Security | Proposed role/permission source | Proposed by rules |
| `invoices` / `taxInvoices` | Future invoice generator | Real invoices | Denied in rules for this phase |
| `invoiceHistory` / `taxInvoiceHistory` | Future invoice generator | Real invoice history | Denied in rules for this phase |

## Product Master

| Field | Type | Required | Immutable | Notes |
| --- | --- | --- | --- | --- |
| `productId` | string | Yes | Yes | Canonical id |
| `id` | string | Compatibility | Yes | Alias for current app |
| `productCode` | string | Yes | Yes | Format `PM00001` |
| `code` | string | Compatibility | Yes | Alias |
| `productName` | string | Yes | No | Canonical name |
| `name` | string | Compatibility | No | Alias/search source |
| `search` | string | Yes | No | Normalized search key |
| `unit` | string | Optional | No | Required for tax invoice eligibility |
| `salePrice` | number/null | Optional | No | Do not use formatted text |
| `price` | number/null | Compatibility | No | Alias |
| `costPrice` | number/null | Optional | No | Null means unknown |
| `cost` | number/null | Compatibility | No | Alias |
| `active` | boolean | Yes | No | Delete should be avoided |
| `createdAt` | timestamp/number/string legacy | Yes | Yes | Standard target is Timestamp |
| `createdBy` | string | Yes | Yes | Display name only |
| `createdByUid` | string | Yes for secured writes | Yes | Security identity |
| `ownerUid` | string | Yes for secured writes | Yes | Owner identity |
| `updatedAt` | timestamp/number/string legacy | Yes | No | Standard target is Timestamp |
| `updatedBy` | string | Optional | No | Display name |

## Invoice Request

| Field | Type | Required | Immutable for employee | Notes |
| --- | --- | --- | --- | --- |
| `requestId` | string | Yes | Yes | Document id should match |
| `requestNumber` | string | Yes | Yes | `REQ-YYYYMMDD-000001` |
| `idempotencyKey` | string | Yes | Yes | Duplicate submit guard |
| `ownerUid` | string | Yes | Yes | From auth uid |
| `requestedByUid` | string | Yes | Yes | From auth uid |
| `requestedBy` | string | Yes | Yes | Display/legacy |
| `requestedByNickname` | string | Yes | Yes | Display only |
| `requestedBranch` | string | Yes | Yes | Display; rules compare to user profile |
| `requestedAt` | timestamp/string legacy | Yes | Yes | Standard target is Timestamp |
| `customerSnapshot` | map | Yes | Yes | Immutable snapshot |
| `items` | list | Yes | Yes | Immutable item snapshots |
| `invoiceSettings` | map | Yes | Yes | VAT/settings snapshot |
| `subtotal` | number | Yes | Yes | Numeric |
| `vatAmount` | number | Yes | Yes | Numeric |
| `grandTotal` | number | Yes | Yes | Numeric |
| `status` | enum string | Yes | Admin/backend only | Starts `กำลังดำเนินการ` |
| `generationState` | enum string | Yes | Admin/backend only | Starts `not-started` |
| `generatedInvoiceIds` | list | Yes | Admin/backend only | Empty on submit |
| `printedInvoiceCount` | number | Yes | Admin/backend only | Zero on submit |
| `testMode` | boolean | Yes | Yes | Must be false for production collection |

## Invoice Request Item Snapshot

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `requestItemId` | string | Yes | Row id in request |
| `rowNumber` | number | Yes | Display ordering |
| `productId` | string | Yes | Product reference at submit time |
| `productCode` | string | Yes | Snapshot |
| `productName` | string | Yes | Snapshot |
| `unit` | string | Yes | Required for tax invoice |
| `salePrice` | number | Yes | Numeric |
| `quantity` | number | Yes | Numeric |
| `lineSubtotal` | number | Yes | Numeric |
| `vatAmount` | number | Yes | Numeric |
| `lineGrandTotal` | number | Yes | Numeric |
| `addedByUid` | string | Recommended | Security/audit |

## Customer Snapshot

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `customerName` | string | Yes | Full tax invoice customer name |
| `taxId` | string | Yes | 13 digit string |
| `address1` | string | Yes | Required for full tax invoice |
| `address2` | string | Optional | Additional address |
| `phone` | string | Optional | String only |
| `headOffice` | string | Conditional | Head office/branch info |
| `branchNumber` | string | Conditional | Preserve leading zeros |

## Users

| Field | Type | Required | Immutable | Notes |
| --- | --- | --- | --- | --- |
| `uid` | string | Yes | Yes | Auth uid |
| `nickname` | string | Yes | No | Display |
| `branch` | string | Yes | No by admin | Trusted branch assignment |
| `role` | enum string | Yes | No by admin | `employee`, `manager`, `admin`, `owner`, `system` |
| `permissions` | list | Optional | No by admin | Future fine-grained control |
| `active` | boolean | Yes | No by admin | Disabled users denied |
| `createdAt` | timestamp | Yes | Yes | Provisioning time |
| `updatedAt` | timestamp | Yes | No | Last admin change |

## Counters

| Collection | Field | Type | Rule |
| --- | --- | --- | --- |
| `productCodeCounters/{prefix}` | `lastSequence` | int | Increase only |
| `invoiceRequestCounters/{dateKey}` | `lastSequence` | int | Increase only |

## Idempotency

| Field | Type | Required | Immutable |
| --- | --- | --- | --- |
| `idempotencyKey` | string | Yes | Yes |
| `requestId` | string | Yes | Yes |
| `requestNumber` | string | Yes | Yes |
| `ownerUid` | string | Yes | Yes |
| `requestedByUid` | string | Yes | Yes |
| `createdAt` | timestamp/string legacy | Yes | Yes |

## Audit Log

| Field | Type | Required | Rule |
| --- | --- | --- | --- |
| `requestId` | string | Yes | Append-only |
| `requestNumber` | string | Yes | Append-only |
| `action` | enum string | Yes | Allowlisted |
| `actorUid` | string | Yes | Must equal auth uid |
| `by` | string | Optional | Display only |
| `branch` | string | Optional | Display only |
| `at` | timestamp/string legacy | Yes | Append-only |
