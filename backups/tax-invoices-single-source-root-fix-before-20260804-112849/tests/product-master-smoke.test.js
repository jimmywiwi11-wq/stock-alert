const { chromium } = require('C:/Users/Acer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const results = [];
  page.on('dialog', dialog => dialog.accept());

  await page.addInitScript(() => {
    if (localStorage.getItem('phase43SmokeSeeded') === '1') return;
    localStorage.setItem('phase43SmokeSeeded', '1');
    localStorage.setItem('stockAlertNickname', 'Tester');
    localStorage.setItem('stockAlertDeviceBranchV764', '1');
    localStorage.setItem('stockAlertProductsV730', JSON.stringify([
      { id: 'pm-smoke-a', name: 'สินค้ารอหน่วย', unit: '', price: '99', cost: '50', active: true },
      { id: 'pm-smoke-b', code: 'EX00001', name: 'สินค้าพร้อมบิล', unit: 'อัน', price: '20', cost: '10', active: true }
    ]));
    localStorage.setItem('products', JSON.stringify([
      { code: 'TX00001', name: 'สินค้าเก่าจาก Tax', unit: 'กล่อง', price: 33, cost: 11 }
    ]));
  });

  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ChokAnanProductMaster && window.ChokAnanProductMaster.stats().productCount >= 3);

  const initialStats = await page.evaluate(() => window.ChokAnanProductMaster.stats());
  const generatedCode = await page.evaluate(() => window.ChokAnanProductMaster.listAll().find(row => row.id === 'pm-smoke-a').code);
  await page.evaluate(() => go('productDbPage'));
  await page.waitForSelector('#needUnitProductButtonV43', { timeout: 7000 });
  const needButtonVisible = await page.locator('#needUnitProductButtonV43').isVisible();
  await page.click('#needUnitProductButtonV43');
  await page.waitForSelector('#needUnitProductPageV43.active');
  await page.fill('#needUnitInput_pm-smoke-a', 'ชิ้น');
  await page.click('text=บันทึกหน่วย');
  await page.waitForFunction(() => window.ChokAnanProductMaster.needUnit().length === 0);
  const afterUnitStats = await page.evaluate(() => window.ChokAnanProductMaster.stats());
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('stockAlertProductsV730')).find(row => row.id === 'pm-smoke-a'));

  await page.goto('http://127.0.0.1:8765/desktop/tax-invoice/tax_invoice_app.html?cmsTest=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ChokAnanTaxInvoiceProductMasterBridge);
  const taxProducts = await page.evaluate(() => window.ChokAnanTaxInvoiceProductMasterBridge.list());

  results.push(`initial=${JSON.stringify(initialStats)}`);
  results.push(`generatedCode=${generatedCode}`);
  results.push(`needButtonVisible=${needButtonVisible}`);
  results.push(`afterUnit=${JSON.stringify(afterUnitStats)}`);
  results.push(`persistedUnit=${persisted.unit}`);
  results.push(`taxProductCount=${taxProducts.length}`);
  results.push(`taxHasGenerated=${taxProducts.some(row => row.code === generatedCode && row.name === 'สินค้ารอหน่วย')}`);
  results.push(`taxHasLegacy=${taxProducts.some(row => row.code === 'TX00001')}`);
  results.push(`duplicateCount=${afterUnitStats.duplicateCount}`);

  await browser.close();
  console.log(results.join('\n'));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
