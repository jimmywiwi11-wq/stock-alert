# Phase 5.1.5 Backup Report

Backup path: `backups/phase-5-1-5-database-standardization-before-20260803-204734/`

Created before Phase 5.1.5 edits.

## Scope

Backed up:

- `firestore.rules`
- `firebase.json`
- `package.json`
- `pnpm-lock.yaml`
- `tests/firestore-rules-security.test.js`
- `modules/product-master/`
- `modules/invoice-request/`
- `modules/cms-integration/`
- `documentation/`
- `.gitignore`

No production Firebase data was copied. No browser production localStorage or IndexedDB export was copied.

## Hash Sample

| File | Size | SHA-256 |
| --- | ---: | --- |
| `firestore.rules` | 11761 | `021BA52E8D9FEF2F9083FBD0F4BACDA0759042EF920F62CFCCA393BC10E941F9` |
| `firebase.json` | 222 | `F22A35D7FE824A3FE488CBE2C480AD5D9BEF3BFB1AD729DF81309B59136B1A13` |
| `package.json` | 485 | `EED129A88BE1DBD04C55DE9F72EAEFF57588CB07371396F3698A5EF58465FC25` |
| `pnpm-lock.yaml` | 200297 | `112B1781A4CEA2E96C401B9455F357C6CF45F1A452316332DE2AF314FEBBED09` |
| `tests/firestore-rules-security.test.js` | 12615 | `823F717BDB4AD374CE9ECEF3B25D669FB23C27B6406120DAC5F386189B8EFCAF` |
| `modules/invoice-request/invoice-request.js` | 33165 | `768556BDE62A127BDDF156AA83073D7B4CAF8ED7B312B1445DA88217CD03D41C` |
| `modules/product-master/product-master.js` | 16983 | `116A2A24CD9C4F249C7A2794397843367EF4E162D0BFED6651C38259BE7B442B` |
| `documentation/PHASE_5_1_SECURITY_REPORT.md` | 14295 | `AE335CA9584ADB7BAC807E60931A0EE13165C17FD461EAFB04542B4C4E24A751` |

## Restore

Restore only if approved:

1. Copy the needed files from the backup path back to the repo.
2. Re-run syntax and unit tests.
3. Do not use this backup to overwrite unrelated user changes.
4. No Firebase rollback is needed for this phase because no production rules or data were changed.
