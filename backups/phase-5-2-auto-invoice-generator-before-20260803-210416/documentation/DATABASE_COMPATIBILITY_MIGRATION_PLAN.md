# Database Compatibility and Migration Plan

No production migration is started in Phase 5.1.5.

## Stage A - Read Compatibility

Keep adapters reading legacy fields:

- `id` and `productId`
- `code` and `productCode`
- `name` and `productName`
- `price` and `salePrice`
- `cost` and `costPrice`

## Stage B - Dual Read / Single Write

New workflows should write canonical fields. Compatibility aliases may remain only when current UI still reads them.

## Stage C - Migration Preview

Run export/preview against approved test data only:

- Row counts
- Duplicate codes
- Missing required fields
- Null vs zero
- Orphan references

## Stage D - Test Collection Migration

Use test collections and emulator first. Never write production collections during preview.

## Stage E - User Approval

User must approve:

- Backup
- Mapping
- Validation report
- Rollback
- Deployment window

## Stage F - Production Migration

Only after approval:

- Backup production
- Run limited migration
- Compare counts/checksums
- Keep audit log

## Stage G - Legacy Cleanup

Remove deprecated read paths only after all production clients are on the new version and rollback window has passed.
