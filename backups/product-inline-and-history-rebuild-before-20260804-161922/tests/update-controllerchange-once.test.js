const assert = require('assert');
const { loadUpdateContext } = require('./update-test-harness');
(async () => {
  const registration = { waiting: null, installing: null, addEventListener: () => {}, update: async () => {} };
  const ctx = loadUpdateContext({ registration });
  await ctx.StockAlertUpdate.checkAppUpdate();
  await new Promise(resolve => setTimeout(resolve, 0));
  ctx.__listeners.controllerchange();
  ctx.__listeners.controllerchange();
  assert.strictEqual(ctx.__reloadCount(), 1);
  console.log('update controllerchange once passed');
})().catch(e => { console.error(e); process.exit(1); });
