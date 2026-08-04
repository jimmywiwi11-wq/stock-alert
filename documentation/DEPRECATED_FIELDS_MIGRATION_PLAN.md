# Deprecated Fields Migration Plan

No field rename or production migration is performed in Phase 5.1.5.

| Old field | New field | Source | Read compatibility | Write behavior | Priority | Removal phase | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `id` | `productId` | Product Master | Keep reading | Write both during compatibility | High | After migration approval | Broken product refs |
| `code` | `productCode` | Product/Tax legacy | Keep reading | Write both for now | High | After migration approval | Duplicate codes |
| `name` | `productName` | Products/items | Keep reading | Canonical writes use `productName`; Stock Alert shortage still uses `name` | High | Later | UI search mismatch |
| `itemName` | `productName` | Legacy imports | Adapter only | Do not write new | Medium | Later | Import loss |
| `price` | `salePrice` | Tax legacy | Keep reading | Write both in Product Master compatibility | High | Later | Invoice amount error |
| `sellingPrice` | `salePrice` | Possible future legacy | Adapter only | Do not write new | Low | Later | Low |
| `cost` | `costPrice` | Tax legacy | Keep reading | Write both in Product Master compatibility | Medium | Later | Margin reports |
| `qty` | `quantity` | Stock shortage | Keep for shortage records | Invoice request writes `quantity` | Medium | No removal for shortage | Mixed meaning |
| `by` | `createdBy` / `actorUid` | Activity/audit | Keep reading | Audit writes `actorUid` | High | Later | Security spoofing |
| `branch` | `requestedBranch` | Request/product context | Keep reading | Request writes `requestedBranch`; user branch from `users/{uid}` | High | Later | Permission bypass |
| `date` | `createdAt` / `requestedAt` | Legacy records | Keep reading | Use exact event field | Medium | Later | Sorting errors |

Adapter rule:

- Read old fields.
- Write canonical fields plus compatibility aliases only where current app still needs them.
- Remove aliases only after test migration, production backup, user approval, and rollback plan.
