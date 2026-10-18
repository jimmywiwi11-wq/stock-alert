# Stock Alert: Firebase Hosting preparation — 2026-10-18

Status update 2026-10-18: User explicitly authorized immediate Hosting deployment of the prepared files. Deployment completed successfully to check-chokanan with `deploy --only hosting --project check-chokanan --config firebase.json --non-interactive`. No Firestore reads/writes, rules deployment, billing changes or project creation were performed. Existing application version/PWA limitations below remain unchanged.

Post-deployment verification:

- Read-only Hosting API confirmed projects/check-chokanan/sites/check-chokanan (DEFAULT_SITE).
- Read-only Authentication configuration confirmed project number 637683943443, Anonymous Authentication enabled, and authorized domains check-chokanan.web.app and check-chokanan.firebaseapp.com.
- Both HTTPS domains returned HTTP 200 for index.html and SHA-256 matched the prepared file.
- Production version.json and sw.js returned HTTP 200 with Cache-Control: no-store, max-age=0. index.html returned no-cache. This resolves the header verification uncertainty seen in the local emulator.
- Product module returned HTTP 200. CLI configstore, Firestore Rules and the one-time data-clear page returned HTTP 404.
- Browser workflows, production Firestore writes and physical iPhone were not exercised; website reachability is confirmed, full workflow validation is not.
- This was a relocation of the existing 8.07 artifact as explicitly requested, with no runtime source or version changes. The sections below retain the original preparation findings and pre-deploy procedure for reference.

## Repository and application

- Actual entry point: root `index.html`, with inline CSS and JavaScript. It loads Firebase compat SDK 10.12.2 from gstatic, local html2canvas, modules and cash-reconciliation.js. Root app.js is not loaded by the HTML but is referenced by the existing service worker precache, so it is retained.
- Static browser application. Firebase Authentication and Firestore are remote managed services; no custom backend, Netlify Functions or server rendering was found in the shipped application. Local CMS launcher PowerShell/BAT files are not required for browser Hosting.
- Main directories inspected: modules (39 files), desktop (21), icons (11), vendor (1), assets (1), config/services/shared/database (one file each), scripts, tests (102), docs/documentation/specs, configstore (2), and backups (1566 before this preparation). Dependency stores and Git metadata are not application assets.
- Root inline Firebase config uses projectId `check-chokanan`, authDomain `check-chokanan.firebaseapp.com`, and existing Web App ID ending `db64ac24fd66b93474d7e6`. Anonymous Authentication, default Firestore database, persistence, and onSnapshot listeners are already implemented.
- Existing collection names remain unchanged: stock_alert_beta1_items, activity, purchase_orders, delivery_history, categories, suppliers, transfer_history, products, unit_conversions and other existing module collections. No data conversion is required by a Hosting origin change.
- No Netlify hostname or /.netlify/functions dependency was found in application sources. Firebase SDK loading still needs internet access; initial offline use is not guaranteed.
- The existing Stock Alert CMS module opens desktop/tax-invoice/tax_invoice_app.html. Its existing HTML, manifest, history assets and icons are copied unchanged to preserve this link; no Tax Invoice source was edited. Modules used by the existing page are retained unchanged.

## Changes and backup

- `firebase.json`: added Hosting site check-chokanan, isolated public directory .hosting-stock-alert, local packaging predeploy command, and cache/security header configuration. Firestore and emulator objects match the backup exactly. No catch-all SPA rewrite: missing files and sensitive paths should remain 404.
- `scripts/prepare-stock-alert-hosting.cjs`: allowlisted packaging, syntax/JSON checks, local HTML and service-worker asset checks, secret pattern scanning and SHA-256 copy verification. No network/Firebase calls. Rebuilds only the dedicated output directory and rejects symlink output. Does not deploy.
- `.gitignore`: ignores generated Hosting output, Firebase local cache and configstore. Existing tracked configstore files are still tracked; adding an ignore rule does not remove Git history.
- Backup: `backups/firebase-hosting-preparation-20261018/firebase.json` and `gitignore.txt`.
- No application release was made: version.json remains 8.07 and all runtime source files remain unchanged. A release fixing the issues below must update version.json and applicable Stock Alert labels together.

## Security

- The deploy directory contains only 66 selected web files, 3,371,007 bytes. No configstore, service account, package dependencies, scripts, database files, backup files, ZIP archive, installers, rules or one-time reset pages are included.
- Secret-pattern scan of packaged text files found no private key, refresh token, client secret or recognized GitHub token. This is a pattern scan, not proof that every possible secret format is absent.
- Existing configstore/firebase-tools.json is tracked in Git. A check for refresh_token, access_token and private_key found none in its current contents. Contents were not printed. Historical commits were not audited.
- The Firebase Web API key is expected public client configuration, not a service-account secret. Firebase access depends on Authentication, Firestore Rules and optional App Check/API restrictions. Live restrictions and deployed Rules have not been verified or changed.
- Reference: https://firebase.google.com/docs/projects/api-keys

## Local verification

- Packaging passed: JavaScript syntax (including inline script blocks), JSON parsing, local script/link/image dependencies, service worker APP_SHELL references, secret patterns and identical copied file hashes.
- Started Hosting Emulator only with `--project demo-stock-alert`; never started Firestore or opened the application in a live Firebase browser session. Note: demo CLI project selection does NOT change the hardcoded production config in the web app. Do not browse this emulator without blocking external requests if zero production access is required.
- HTTP reads: all 66 packaged file paths returned 200. configstore/firebase-tools.json, firestore.rules and clear_tax_invoice_history_once.html returned 404.
- Emulator response checks did NOT show the configured Cache-Control headers on version.json/sw.js. This remains unverified and must be resolved or rechecked before release; do not claim header behavior passed.
- Existing targeted test suite: 4 passed (need-unit-navigation, update-controllerchange-once, version-comparison, version-normalization), 7 failed (update-apply-flow, update-dismiss-version, update-equal-version-browser, update-equal-version-no-prompt, update-loop-prevention, update-modal-visibility, version-json-no-store). Tests were run with unchanged runtime sources. Some hardcode older versions (browser test expects 8.03; other fixtures use 8.05), and some assert exact source formatting. Failures require individual review and are not all proof of runtime defects.
- No real branch entry/edit/order/transfer/receive actions were performed. Supplier placeholder/copy/similarity workflows, real Firebase sync, complete browser runtime and physical iPhone behavior have NOT been end-to-end verified by this migration preparation.

## Release gates and risks

1. Existing sw.js install calls skipWaiting automatically, then activation deletes older app caches and claims clients. This conflicts with the required user-approved update flow. Its navigation HTML patch also injects a script clearing update state and dismissals. These are existing defects; this preparation has not changed them. Repair and verify Update now/Later before claiming compliant PWA behavior.
2. manifest.json name is Stock Alert V8.05 while version.json is V8.07. Runtime contains legacy version labels/diagnostic strings too. Align visible Stock Alert labels in a coordinated release; do not change the unrelated Tax Invoice release automatically.
3. Confirm via Firebase console/authorized read-only CLI that Hosting site `check-chokanan` exists and is the intended site. A Web App name does not itself establish a Hosting site. Do not create a new project. If this site already serves another system, stop before overwriting it.
4. Confirm Anonymous Authentication is enabled, intended web domains and API key HTTP-referrer restrictions permit the new host, and App Check enforcement is compatible if enabled. Do not loosen Rules to solve an authentication issue.
5. Spark is suitable for static Hosting; no Blaze upgrade is needed for these assets. Quotas are shared by the project; check current usage before deploy. Official Hosting docs list 10 GB no-cost storage and 10 GB/month no-cost transfer; Spark service can be restricted after exceeding quota. https://firebase.google.com/docs/hosting/usage-quotas-pricing
6. A new origin has separate localStorage, IndexedDB, caches and anonymous Auth identity. Synced Firestore data stays in the original project, but unsynced device drafts/queued operations and nickname will not automatically migrate. Existing Netlify Home Screen icons still point to Netlify. Keep them until unsynced data is accounted for; install the new Firebase URL separately on iPhone using Safari > Share > Add to Home Screen.

## Deployment procedure — ONLY after explicit approval and release gates addressed

From PowerShell in D:\stock alert\Github\stock-alert:

```powershell
node scripts/prepare-stock-alert-hosting.cjs
.\node_modules\.bin\firebase.cmd login
.\node_modules\.bin\firebase.cmd hosting:sites:list --project check-chokanan
# Stop if the site is absent, unexpected, or serves another system.
# Only after the user authorizes production deployment:
.\node_modules\.bin\firebase.cmd deploy --only hosting --project check-chokanan --config firebase.json
```

Never run bare `firebase deploy`: this repository also defines Firestore Rules. Do not run init, rules deploy, destructive scripts or billing upgrades as part of this migration. The explicit project and site avoid relying on a CLI default; no .firebaserc was created.

Expected URLs if the confirmed site ID is check-chokanan:

- https://check-chokanan.web.app
- https://check-chokanan.firebaseapp.com

These are expected site URLs, not confirmation that a deployment has occurred. After deployment, verify HTTPS, browser console, both branches, edits, suppliers, copying, similarity, transfer/order/receive pages, same database sync, version labels and Update now/Later on desktop and iPhone with approved test data. Do not delete the old installed PWA until local-only data is accounted for.
