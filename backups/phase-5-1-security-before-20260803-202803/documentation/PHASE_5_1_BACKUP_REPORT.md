# Phase 5.1 Backup Report

Phase: Phase 5.1 - Production Invoice Request System

Status: Backup created before Phase 5.1 edits.

## Backup Path

```text
D:\stock alert\Github\stock-alert\backups\phase-5-1-invoice-request-production-before-20260803-195019
```

## Backed Up Scope

- `index.html`
- `app.js`
- `sw.js`
- `version.json`
- `modules/invoice-request/`
- `modules/cms-integration/`
- `modules/product-master/`
- `tests/`
- Phase 4.1, 4.2, 4.3 documents used as references
- Invoice request and Product Master schema/status documents

## Size And SHA256

| File | Size | SHA256 |
| --- | ---: | --- |
| `app.js` | 261615 | `1201ABD755B53461830267371332C4E23747B0ACE3098A77BB949FDEC101B6C5` |
| `index.html` | 699326 | `3B16918DCAB50021384944C27B0983D61828B2FD9E36ED40692EF56CE4603B86` |
| `sw.js` | 3060 | `5A350DD7A9DBF920C0C854B4F72D4E1D4E76C3DBD4BFC7E8F0FF999DA1183B51` |
| `version.json` | 181 | `D8B5A8483F585350C67BFDAF0B988DF214D280FFFBA91808557A4DD2DA6B77A8` |
| `modules/invoice-request/invoice-request.js` | 26776 | `84A351600D9123370FDF80E13AD869CA9E8972273AA03B39E9A0337D4478793C` |
| `modules/invoice-request/invoice-request.css` | 7398 | `6AEF595D5B133316705865E641AA47A6F75340F5B74587D9FAF7BB332DE5DB5D` |
| `modules/invoice-request/invoice-request-store.js` | 1860 | `9EC197C28DF7314391B963B4409A1212B92A02455EEE807EF21848D574088A6C` |
| `modules/invoice-request/invoice-request-validation.js` | 3424 | `D8B2FB29D626BAB1F58BD9DC789FE87088AF06B947E7F4769C22CB26658556B3` |
| `modules/invoice-request/invoice-request-product-search.js` | 4211 | `A9D11DA13391B838E694A40DF13E706AFAFCFFA83A003A25E166AAA412EC80D8` |
| `modules/invoice-request/invoice-request-customer-search.js` | 3261 | `BFD007E817973C53CFDE24999CA2AEF07AC16CA33B219F66D34877177CB4C665` |
| `modules/product-master/product-master.js` | 9392 | `682B7CB52BD7F4DEA580CBC669DF3F645F829C1A7B7C405DC73974FF5550E419` |
| `modules/product-master/product-master-stock-alert.js` | 5263 | `007457EA254B388FFF68745BC9EDC195BE3032BCBD3C7174A48170DACD503D7C` |
| `modules/product-master/product-master-tax-bridge.js` | 2955 | `58D3692F57BD1B0E89C58DB5E69715FDD679A5399712CACE6FA2E8EB4DB070CC` |
| `modules/cms-integration/cms-invoice-request-status.js` | 7720 | `F530F43CA45B519DB46BC220921CDC070A95439BE9D1EE5E970800FF9CBA99C8` |
| `tests/invoice-request.test.js` | 4581 | `32F11E9F357E0889E9E767FE2AF20E8C29570DB305FD0374F98D766F3977C9BE` |
| `tests/invoice-request-smoke.test.js` | 4121 | `A8478096BEA97117A5538EF57E2A490BFEA772593D083A437EEBD152FDDA0246` |

## Restore Method

Copy the needed file or folder from the backup path back into:

```text
D:\stock alert\Github\stock-alert
```

Do not use `git reset`, `git clean`, `checkout`, `stash`, or `revert` unless explicitly approved.

## Notes

- Backup was created before Phase 5.1 edits.
- Existing uncommitted Phase 4.1, 4.2, and 4.3 files remain present and were not reverted.
- No production Firebase data was deleted during backup.
- No commit, push, merge, rebase, deploy, reset, clean, checkout, stash, or revert was performed.
