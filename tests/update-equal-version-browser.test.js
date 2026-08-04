const assert = require('assert');
const { chromium } = require('C:/Users/Acer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const launchOptions = { headless: true };
  if (process.env.BROWSER_EXECUTABLE) launchOptions.executablePath = process.env.BROWSER_EXECUTABLE;
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 430, height: 860 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const base = process.env.RUNTIME_URL || 'http://127.0.0.1:8765';
  await page.goto(base + '/index.html?updateDebug=1&testEqualVersion=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.StockAlertUpdate && window.STOCK_ALERT_APP_VERSION === '8.03', null, { timeout: 10000 });
  await page.waitForTimeout(1800);

  const result = await page.evaluate(async () => {
    const info = await window.checkAppUpdate();
    const modal = document.getElementById('updateModal');
    const status = document.getElementById('updateStatusTitle')?.textContent || '';
    const sub = document.getElementById('updateStatusSub')?.textContent || '';
    return {
      current: window.STOCK_ALERT_APP_VERSION,
      label: window.STOCK_ALERT_APP_VERSION_LABEL,
      latest: info.version,
      latestLabel: info.label,
      hasUpdate: info.hasUpdate,
      comparisonResult: info.comparisonResult,
      modalShown: !!modal?.classList.contains('show'),
      status,
      sub,
      debug: window.StockAlertUpdate.updateDebugSnapshot()
    };
  });

  const relevantErrors = errors.filter(text =>
    !/ERR_NETWORK_ACCESS_DENIED|firebase is not defined|Firebase SDK or Firestore db is not initialized|StockAlert Firebase sync error/.test(text)
  );
  assert.deepStrictEqual(relevantErrors, []);
  assert.strictEqual(result.current, '8.03');
  assert.strictEqual(result.label, 'V8.03');
  assert.strictEqual(result.latest, '8.03');
  assert.strictEqual(result.latestLabel, 'V8.03');
  assert.strictEqual(result.hasUpdate, false);
  assert.strictEqual(result.comparisonResult, 0);
  assert.strictEqual(result.modalShown, false);
  assert.ok(result.status.includes('เป็นเวอร์ชันล่าสุดแล้ว'));
  assert.strictEqual(result.sub, 'V8.03');

  await browser.close();
  console.log('update equal version browser passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
