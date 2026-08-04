const assert = require('assert');
const { loadUpdateContext } = require('./update-test-harness');
(async () => {
  const ctx = loadUpdateContext({ fetch: async () => ({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ version: '8.05', label: 'V8.05' }) }) });
  const info = await ctx.checkAppUpdate();
  assert.strictEqual(info.hasUpdate, false);
  assert.strictEqual(info.comparisonResult, 0);
  assert.strictEqual(ctx.__reloadCount(), 0);
  console.log('update equal version no prompt passed');
})().catch(e => { console.error(e); process.exit(1); });

