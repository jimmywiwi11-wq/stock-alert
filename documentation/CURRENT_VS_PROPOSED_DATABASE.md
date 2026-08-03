# Current vs Proposed Database

| Area | Current | Problem | Proposed | Migration Needed | Risk |
| --- | --- | --- | --- | --- | --- |
| Products | `stock_alert_beta1_products` plus local `stockAlertProductsV730` | Aliases `id/code/name/price` mixed with canonical fields | Canonical product master with compatibility aliases | Yes, later | Duplicate codes |
| Product Codes | `productCodeCounters/PM` plus max-code fallback | Race risk if counter not source of truth | Counter/reservation as source of truth | Later hardening | Duplicate productCode |
| Customers | Legacy `localStorage.customers` | Not Firestore standardized | Future `customers` collection | Yes | Tax invoice completeness |
| Users | Anonymous auth only | No server role source | `users/{uid}` | Yes | Permission bypass |
| Roles | Local flags / none | Client trust risk | Firestore role or custom claims | Yes | Security |
| Invoice Requests | `invoiceRequests` | New collection, now uid-aware | Keep with stricter rules | No immediate migration | Low |
| Drafts | Local production drafts | Not synced to Firestore yet | `invoiceRequestDrafts` | Later | Device-only draft loss |
| Audit Logs | `invoiceRequestAuditLogs` | Needs append-only rules | Append-only with actor uid | No | Spoofing if uid missing |
| Counters | Request/product counters | Must prevent decrement | Increase-only rules | No | Number collision |
| Idempotency | `invoiceRequestIdempotency` | Must be immutable | Owner-only read, create once | No | Duplicate submit |
| Invoices | Legacy localStorage / future Firestore | Must not write in 5.1.5 | Future invoice generator phase | Later | Real invoice risk |
| Invoice History | Legacy `invoices` localStorage | Must not write in 5.1.5 | Future controlled history | Later | Compliance |
| Layouts | Tax Invoice local settings | Not inventoried as Firestore | Keep local until phase approved | Later | Print layout mismatch |
| Status | Thai display strings mixed with internal state | State/display coupling | Documented enum | Later | Workflow ambiguity |
| localStorage | Many legacy keys | Collision and trust risk | Namespaced compatibility plan | Later | Data loss |
| IndexedDB | Firebase internal persistence only | Not app-controlled | Document as SDK-managed | No | Cache confusion |
| Firebase Rules | New local rules | Must pass emulator before deploy | Passed emulator in Phase 5.1.5 | Deploy later only | Blocking valid users |
| Indexes | No explicit index file | Future query growth risk | Index review before deploy | Later | Slow queries |
