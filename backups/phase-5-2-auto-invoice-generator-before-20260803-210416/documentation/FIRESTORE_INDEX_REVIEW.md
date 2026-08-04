# Firestore Index Review

No index was deployed in Phase 5.1.5.

| Query | Existing index | Required index | Risk | Notes |
| --- | --- | --- | --- | --- |
| `stock_alert_beta1_activity.orderBy('time','desc').limit(80)` | Single-field | Single-field automatic | Low | Activity feed. |
| `stock_alert_beta1_products.orderBy('updatedAt','desc').limit(1200)` | Single-field | Single-field automatic | Medium | Large limit; add pagination later. |
| `stock_alert_beta1_products.orderBy('search').startAt(k).endAt(k+'\uf8ff').limit(80)` | Single-field | Single-field automatic | Low | Prefix search. |
| `stock_alert_beta1_products.where('supplier','==',oldName).limit(450)` | Single-field | Single-field automatic | Medium | Bulk supplier rename can touch many docs. |
| `stock_alert_beta1_products.where('search','==',key).limit(1)` | Single-field | Single-field automatic | Low | Product duplicate lookup. |
| `stock_alert_beta1_products.where('productCode','>=','PM00000').where('productCode','<=','PM99999').orderBy('productCode','desc').limit(1)` | Single-field likely enough | Verify in emulator/production before deploy | Medium | Counter fallback; prefer counter as source of truth. |
| `invoiceRequestAuditLogs.where('requestId','==',req.requestId)` | Single-field | Single-field automatic | Low | UAT lookup. |

Recommendation:

- Add pagination before expanding product list beyond 1200.
- Create `firestore.indexes.json` only after an emulator/index review phase is approved.
- Do not deploy indexes in this phase.
