const { chromium } = require('C:/Users/Acer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  async function run(viewport, label) {
    const page = await browser.newPage({ viewport });
    page.on('dialog', async dialog => {
      results.push(`${label}:dialog:${dialog.message()}`);
      await dialog.accept();
    });
    await page.addInitScript(() => {
      localStorage.removeItem('invoiceRequestTestMode');
      localStorage.setItem('stockAlertNickname', 'Tester');
      localStorage.setItem('stockAlertDeviceBranchV764', '1');
      localStorage.setItem('customers', JSON.stringify([
        { code: 'CU001', prefix: 'Company', name: 'ChokAnan Test', address1: '1 Main Road', address2: 'Town', taxId: '0123456789012', phone: '0810000000' }
      ]));
      localStorage.setItem('products', JSON.stringify([
        { code: 'T001', name: 'White Paint', unit: 'bucket', cost: 300, price: 450 },
        { code: 'T002', name: 'PVC Pipe 2 inch', unit: 'piece', cost: 80, price: 120 }
      ]));
    });

    await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#cmsInvoiceRequestEntryV42', { timeout: 7000 });
    const visible = await page.locator('#cmsInvoiceRequestEntryV42').isVisible();
    await page.click('#cmsInvoiceRequestEntryV42');
    await page.waitForSelector('#cmsInvoiceRequestPageV42.active');
    await page.locator('#cmsInvoiceRequestPageV42.active .cmsInvoiceMenuButtonV42').first().click();
    await page.waitForSelector('#cmsInvoiceRequestFormPageV42.active');

    await page.fill('#cmsCustomerSearchV42', 'ChokAnan');
    await page.waitForSelector('#cmsCustomerSuggestV42.show button');
    await page.locator('#cmsCustomerSuggestV42 button').first().click();

    await page.fill('#cmsProductSearchV42', 'PVC');
    await page.waitForSelector('#cmsProductSuggestV42.show button');
    await page.locator('#cmsProductSuggestV42 button').first().click();
    await page.waitForSelector('[data-qty-index="0"]');
    await page.waitForTimeout(80);
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-qty-index'));
    await page.fill('[data-qty-index="0"]', '1234');

    await page.fill('#cmsNewProductNameV42', `Phase 5 Smoke Product ${label}`);
    await page.fill('#cmsNewProductUnitV42', 'pc');
    await page.fill('#cmsNewProductPriceV42', '10');
    await page.fill('#cmsNewProductQtyV42', '2');
    await page.locator('#cmsNewProductQtyV42').locator('..').locator('..').locator('..').getByRole('button').click();
    await page.waitForFunction(() => document.querySelectorAll('.cmsInvoiceItemCardV42').length === 2);

    await page.locator('button.cmsInvoiceSecondaryV42').filter({ hasText: 'บันทึกร่างคำขอ' }).click();
    const draftLen = await page.evaluate(() => JSON.parse(localStorage.getItem('cms.invoiceRequest.productionDrafts') || '[]').length);

    await page.locator('button.cmsInvoicePrimaryV42').click();
    await page.waitForSelector('#cmsInvoiceRequestStatusPageV42.active');
    const requestLen = await page.evaluate(() => JSON.parse(localStorage.getItem('cms.invoiceRequest.productionRequests') || '[]').length);
    const pendingLen = await page.evaluate(() => JSON.parse(localStorage.getItem('cms.invoiceRequest.productionPending') || '[]').length);
    const productMaster = await page.evaluate(() => JSON.parse(localStorage.getItem('stockAlertProductsV730') || '[]'));
    const invoiceHistory = await page.evaluate(() => localStorage.getItem('invoices'));
    const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

    results.push(`${label}:visible=${visible}:focused=${focused}:drafts=${draftLen}:requests=${requestLen}:pending=${pendingLen}:products=${productMaster.length}:invoices=${invoiceHistory}:hscroll=${hasHorizontalScroll}`);
    await page.close();
  }

  await run({ width: 390, height: 844 }, 'mobile');
  await run({ width: 820, height: 1180 }, 'tablet');
  await run({ width: 1366, height: 768 }, 'desktop');
  await browser.close();
  console.log(results.join('\n'));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
