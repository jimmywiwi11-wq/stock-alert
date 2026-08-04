# localStorage / IndexedDB Key Inventory

No production browser storage was exported. This is a code inventory only.

| Key | Owner | Purpose | Production/Test | Sync | Migration |
| --- | --- | --- | --- | --- | --- |
| `stock_alert_beta1_items` | Stock Alert | Offline shortage cache | Production cache | Firestore mirror | Keep compatibility |
| `stock_alert_beta1_activity` | Stock Alert | Offline activity cache | Production cache | Firestore mirror | Keep compatibility |
| `stockAlertPurchaseOrders` | Stock Alert | Purchase order cache | Production cache | Firestore doc mirror | Future namespace `stockAlert.purchaseOrders` |
| `stockAlertDeliveryHistory` | Stock Alert | Delivery history cache | Production cache | Firestore doc mirror | Future namespace `stockAlert.deliveryHistory` |
| `stockAlertTransferHistory` | Stock Alert | Transfer history cache | Production cache | Firestore doc mirror | Future namespace `stockAlert.transferHistory` |
| `stockAlertCategories` | Stock Alert | Category list | Production cache | Firestore doc mirror | Future namespace `stockAlert.categories` |
| `stockAlertSuppliers` | Stock Alert | Supplier names | Production cache | Firestore doc mirror | Keep placeholder out of stored values |
| `stockAlertSupplierDetails` | Stock Alert | Supplier detail rows | Production cache | Firestore doc mirror | Future normalized supplier collection |
| `stockAlertNickname` | Stock Alert | Device display name | Production setting | Local only | Not a trusted identity |
| `stockAlertDeviceBranchV764` | Stock Alert | Device branch selection | Production setting | Local only | Not a trusted security branch |
| `stockAlertUserId` | Invoice Request | Legacy requestedBy fallback | Production setting | Local only | Replace with auth uid |
| `stockAlertUserUid` | Invoice Request | Auth uid fallback | Production setting | Local only | Prefer `auth.currentUser.uid` |
| `stockAlertProductsV730` | Product Master | Product master cache | Production cache | Firestore mirror | Future `cms.productMaster.cache` |
| `products` | Tax Invoice legacy | Legacy Tax Invoice products | Production legacy | Local only | Read compatibility only |
| `customers` | Tax Invoice legacy | Legacy customer list | Production legacy | Local only | Read compatibility only |
| `invoices` | Tax Invoice legacy | Invoice history | Production legacy | Local only | Do not write in Phase 5.1/5.1.5 |
| `cms.invoiceRequest.testDrafts` | Invoice Request | Test drafts | Test | Local only | Test namespace OK |
| `cms.invoiceRequest.testRequests` | Invoice Request | Test requests | Test | Local only | Test namespace OK |
| `cms.invoiceRequest.productionDrafts` | Invoice Request | Local mirror of production drafts | Production cache | Local only currently | Future Firestore draft collection |
| `cms.invoiceRequest.productionRequests` | Invoice Request | Local mirror of submitted requests | Production cache | Firestore writes | Keep as cache |
| `cms.invoiceRequest.productionPending` | Invoice Request | Offline pending queue | Production cache | Firestore sync retry | Add queue validation later |
| `invoiceRequestTestMode` | Invoice Request | Test mode toggle | Test/dev | Local only | Keep explicit |
| `cmsIntegrationFeatureEnabled` | CMS integration | Feature flag | Local setting | Local only | Not security |
| `cmsIntegrationPermissionAllowed` | CMS integration | Local permission test flag | Test/dev | Local only | Not security |
| `stockAlertUnitConversions` | Stock Alert | Unit conversion map | Production cache | Firestore doc mirror | Future normalized collection |
| `stockAlertDismissUpdateVersion` | PWA | Dismissed update prompt | Session | Session only | Keep |

IndexedDB:

- No direct `indexedDB.open()` usage was found in project code.
- Firebase Firestore persistence may create IndexedDB internally.
- Service worker uses Cache Storage via `caches.open()`.
