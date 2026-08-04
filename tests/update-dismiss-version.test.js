const assert = require('assert');
const { loadUpdateContext } = require('./update-test-harness');
(async () => {
  const ctx = loadUpdateContext({ fetch: async () => ({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ version: '8.05', label: 'V8.05' }) }) });
  await ctx.checkAppUpdate();
  ctx.dismissAppUpdate();
  assert.strictEqual(ctx.sessionStorage.getItem('stockAlertDismissUpdateVersion'), '8.05');
  assert.strictEqual(ctx.StockAlertUpdate.shouldShowUpdateModal({ version: '8.05', hasUpdate: true }), false);
  assert.strictEqual(ctx.StockAlertUpdate.shouldShowUpdateModal({ version: '8.05', hasUpdate: true }), true);
  console.log('update dismiss version passed');
})().catch(e => { console.error(e); process.exit(1); });

