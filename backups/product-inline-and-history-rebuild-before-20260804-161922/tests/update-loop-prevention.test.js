const assert = require('assert');
const { loadUpdateContext } = require('./update-test-harness');
(async () => {
  let posted = 0;
  const registration = { waiting: { postMessage: () => { posted += 1; } }, installing: null, addEventListener: () => {}, update: async () => {} };
  const ctx = loadUpdateContext({ registration, fetch: async () => ({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ version: '8.04', label: 'V8.04' }) }) });
  ctx.localStorage.setItem('stockAlertUpdateAttemptVersion', '8.04');
  ctx.localStorage.setItem('stockAlertUpdateAttemptCount', '1');
  ctx.localStorage.setItem('stockAlertLastUpdateAttemptAt', Date.now());
  await ctx.checkAppUpdate();
  await ctx.applyAppUpdate();
  assert.strictEqual(posted, 0);
  assert.ok((ctx.localStorage.getItem('stockAlertLastUpdateError') || '').includes('อัปเดตไม่สำเร็จ'));
  console.log('update loop prevention passed');
})().catch(e => { console.error(e); process.exit(1); });
