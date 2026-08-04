const assert = require('assert');
const { loadUpdateContext } = require('./update-test-harness');
(async () => {
  let posted = null;
  const registration = { waiting: { postMessage: msg => { posted = msg; } }, installing: null, addEventListener: () => {}, update: async () => {} };
  const ctx = loadUpdateContext({ registration, fetch: async () => ({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ version: '8.05', label: 'V8.05' }) }) });
  await ctx.checkAppUpdate();
  await ctx.applyAppUpdate();
  assert.strictEqual(ctx.localStorage.getItem('stockAlertPendingUpdateVersion'), '8.05');
  assert.strictEqual(JSON.stringify(posted), JSON.stringify({ type: 'SKIP_WAITING', version: '8.05' }));
  assert.strictEqual(ctx.localStorage.getItem('stockAlertUpdateAttemptCount'), '1');
  console.log('update apply flow passed');
})().catch(e => { console.error(e); process.exit(1); });
