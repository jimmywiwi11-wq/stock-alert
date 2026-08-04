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
      localStorage.setItem('stockAlertNickname', 'Tester');
      localStorage.setItem('stockAlertDeviceBranchV764', '1');
      localStorage.setItem('customers', JSON.stringify([
        { code: 'CU001', prefix: 'บริษัท', name: 'โชคอนันต์ ทดสอบ', address1: '1 ถนนหลัก', address2: 'เมือง', taxId: '0123456789012', phone: '0810000000' }
      ]));
      localStorage.setItem('products', JSON.stringify([
        { code: 'T001', name: 'สีขาว', unit: 'ถัง', cost: 300, price: 450 },
        { code: 'T002', name: 'ท่อ PVC 2 นิ้ว', unit: 'เส้น', cost: 80, price: 120 }
      ]));
    });

    await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#cmsInvoiceRequestEntryV42', { timeout: 7000 });
    const visible = await page.locator('#cmsInvoiceRequestEntryV42').isVisible();
    await page.click('#cmsInvoiceRequestEntryV42');
    await page.waitForSelector('#cmsInvoiceRequestPageV42.active');
    await page.locator('#cmsInvoiceRequestPageV42.active .cmsInvoiceMenuButtonV42').first().click();
    await page.waitForSelector('#cmsInvoiceRequestFormPageV42.active');

    await page.fill('#cmsCustomerSearchV42', 'โชคอนันต์');
    await page.waitForSelector('#cmsCustomerSuggestV42.show button');
    await page.locator('#cmsCustomerSuggestV42 button').first().click();

    await page.fill('#cmsProductSearchV42', 'ท่อ');
    await page.waitForSelector('#cmsProductSuggestV42.show button');
    await page.locator('#cmsProductSuggestV42 button').first().click();
    await page.waitForSelector('[data-qty-index="0"]');
    await page.waitForTimeout(80);
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-qty-index'));
    await page.fill('[data-qty-index="0"]', '1234');

    await page.fill('#cmsNewProductNameV42', 'สินค้าใหม่ทดสอบ');
    await page.fill('#cmsNewProductUnitV42', 'อัน');
    await page.fill('#cmsNewProductPriceV42', '10');
    await page.fill('#cmsNewProductQtyV42', '2');
    await page.locator('#cmsNewProductQtyV42').locator('..').locator('..').locator('..').getByRole('button', { name: 'เพิ่มเป็นสินค้าใหม่' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.cmsInvoiceItemCardV42').length === 2);

    await page.click('text=บันทึกร่างคำขอ');
    const draftLen = await page.evaluate(() => JSON.parse(localStorage.getItem('cms.invoiceRequest.testDrafts') || '[]').length);

    await page.click('text=ยืนยันขอออกใบกำกับภาษี');
    await page.waitForSelector('#cmsInvoiceRequestStatusPageV42.active');
    const requestLen = await page.evaluate(() => JSON.parse(localStorage.getItem('cms.invoiceRequest.testRequests') || '[]').length);
    const invoiceHistory = await page.evaluate(() => localStorage.getItem('invoices'));
    const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

    results.push(`${label}:visible=${visible}:focused=${focused}:drafts=${draftLen}:requests=${requestLen}:invoices=${invoiceHistory}:hscroll=${hasHorizontalScroll}`);
    await page.close();
  }

  await run({ width: 390, height: 844 }, 'mobile');
  await run({ width: 1366, height: 768 }, 'desktop');
  await browser.close();
  console.log(results.join('\n'));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
