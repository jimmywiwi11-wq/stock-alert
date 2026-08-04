const assert = require('assert');
const fs = require('fs');

const bridge = fs.readFileSync('modules/cms-integration/cms-tax-invoice-history-bridge.js', 'utf8');

assert.ok(!bridge.includes('return { ok: true, requestId, nativeInvoiceIds: alreadyIds, duplicate: true };'), 'duplicate guard must not skip upserting taxInvoices');
assert.ok(bridge.includes('await root.db.collection(PRIMARY_COLLECTION).doc(payload.invoiceId).set(payload, { merge: true })'), 'native import must upsert by stable invoiceId');
assert.ok(bridge.includes('duplicate: alreadyIds.length > 0'), 'duplicate state should be reported without blocking save');

console.log('native save idempotency static passed');
