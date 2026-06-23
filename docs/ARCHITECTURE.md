# Architecture

## Runtime shape

Stock Alert is a static, client-side PWA with no build step visible in this repository. The browser loads `index.html`, Firebase compatibility libraries from Google’s CDN, and extensive inline JavaScript. The active page is switched by adding and removing CSS classes rather than navigating between URLs.

`app.js` overlaps heavily with the inline application code but is not referenced by the current HTML. Treat `index.html` as the observed runtime source until the loading path is intentionally changed and tested.

## Main layers

1. **Presentation:** HTML pages, modals, cards, bottom navigation, and inline CSS in `index.html`.
2. **Application state:** global arrays and state variables for items, activity, orders, deliveries, categories, suppliers, transfers, and the current screen/form.
3. **Persistence:** Firestore listeners and writes when available, with browser `localStorage` used for local/offline state.
4. **PWA:** `manifest.json`, icons, and `sw.js` provide installation and cached app-shell behavior.
5. **Release update:** the app fetches `version.json`, compares it with its current visible version, and presents an update choice.

## Data storage

Observed Firestore collections include:

- `stock_alert_beta1_items`: one document per shortage item.
- `stock_alert_beta1_activity`: activity documents ordered by `time`.
- Additional collections for purchase orders, deliveries, categories, suppliers, and transfer history store a `main` document containing an `items` array. Verify their exact constants in the active runtime before changing them.

Observed shortage fields include:

- Identity/content: `name`, normalized `search`, `branch`, `category`, `supplier`, `note`.
- Stock state: `status`, `qty`, `unit`.
- Audit: `createdAt`, `createdBy`, `updatedAt`, `updatedBy`.
- Transfer state: `transferPrepared`, `transferDone`, and related quantity, unit, decision, and conversion fields in later flows.

Observed browser keys include shortage/activity collection names plus `stockAlertPurchaseOrders`, `stockAlertDeliveryHistory`, `stockAlertTransferHistory`, `stockAlertCategories`, `stockAlertSuppliers`, and `stockAlertNickname`. Other compatibility keys exist; search before changing storage behavior.

## Data compatibility rules

- Additive fields should have safe defaults when absent.
- Readers must tolerate legacy documents and legacy supplier sentinel text.
- Do not rename or delete collections, keys, or fields without an explicit migration and rollback plan.
- Do not assume local data and cloud data have identical freshness.
- Any grouping change must remain compatible with existing product names and similarity aliases.

## Update lifecycle

`sw.js` caches the application shell and deliberately avoids calling `skipWaiting` during installation. The UI checks `version.json`; a new worker/cache should be activated and the app reloaded only after the user chooses **Update now**. **Later** must leave the current session usable.

## Architectural risks

- Multiple later scripts override earlier functions in the same HTML file.
- Parallel copies in `index.html` and `app.js` can drift.
- Global mutable state makes unrelated workflows easy to affect accidentally.
- CDN availability influences first-load Firebase initialization.

For these reasons, search for every definition and assignment of a target function before modifying it, and test the final overriding definition used at runtime.
