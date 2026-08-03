const { chromium } = require('C:/Users/Acer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const productName = `TEST-UAT-PRODUCT-${stamp}`;
  const customerName = `TEST-UAT-CUSTOMER-${stamp}`;
  const url = process.env.UAT_URL || 'http://127.0.0.1:8765/index.html';
  const result = { stamp, productName, customerName, url, dialogs: [] };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
  const page = await context.newPage();

  page.on('dialog', async dialog => {
    result.dialogs.push(dialog.message());
    await dialog.accept();
  });

  await page.addInitScript(({ productName, customerName }) => {
    localStorage.removeItem('invoiceRequestTestMode');
    localStorage.setItem('stockAlertNickname', 'UAT-Codex');
    localStorage.setItem('stockAlertDeviceBranchV764', '1');
    localStorage.setItem('customers', JSON.stringify([
      {
        code: 'UAT-CUST-001',
        prefix: 'Company',
        name: customerName,
        address1: '001 UAT Main Road',
        address2: 'UAT District',
        taxId: '0012345678901',
        phone: '0800000000',
        branch: 'Head Office'
      }
    ]));
    localStorage.setItem('products', JSON.stringify([
      { code: 'UAT-OLD-001', name: 'UAT Existing Product A', unit: 'pc', cost: 10, price: 100 },
      { code: 'UAT-OLD-002', name: 'UAT Existing Product B', unit: 'box', cost: 20, price: 0 },
      { code: 'UAT-OLD-003', name: 'UAT Existing Similar Product', unit: 'pc', cost: 30, price: 150 }
    ]));
    window.__uatProductName = productName;
  }, { productName, customerName });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.db && window.firebase && window.CMSInvoiceRequest && window.ChokAnanProductMaster, null, { timeout: 20000 });
  await page.evaluate(() => window.stockAlertAuthReady && window.stockAlertAuthReady());
  await page.waitForFunction(() => !window.auth || window.auth.currentUser, null, { timeout: 8000 }).catch(() => {});

  result.precheck = await page.evaluate(() => ({
    projectId: window.firebase?.app?.()?.options?.projectId || null,
    authReady: !!window.auth?.currentUser,
    isAnonymous: !!window.auth?.currentUser?.isAnonymous,
    nickname: localStorage.getItem('stockAlertNickname'),
    branch: localStorage.getItem('stockAlertDeviceBranchV764'),
    appVersion: window.STOCK_ALERT_APP_VERSION || window.APP_VERSION || null,
    serviceWorkerVersion: window.stockAlertDiagnostics ? window.stockAlertDiagnostics().serviceWorkerVersion : null,
    firebaseReady: !!window.db
  }));

  await page.waitForSelector('#cmsInvoiceRequestEntryV42');
  await page.click('#cmsInvoiceRequestEntryV42');
  await page.locator('#cmsInvoiceRequestPageV42.active .cmsInvoiceMenuButtonV42').first().click();
  await page.waitForSelector('#cmsInvoiceRequestFormPageV42.active');

  await page.fill('#cmsCustomerSearchV42', 'UAT-CUST-001');
  await page.waitForSelector('#cmsCustomerSuggestV42.show button');
  await page.locator('#cmsCustomerSuggestV42 button').first().click();

  await page.fill('#cmsProductSearchV42', 'UAT Existing Product A');
  await page.waitForSelector('#cmsProductSuggestV42.show button');
  await page.locator('#cmsProductSuggestV42 button').first().click();
  await page.waitForSelector('[data-qty-index="0"]');
  await page.waitForTimeout(120);
  result.quantityFocus = await page.evaluate(() => document.activeElement?.getAttribute('data-qty-index'));
  await page.fill('[data-qty-index="0"]', '123');
  await page.locator('[data-qty-index="0"]').fill('1234');
  await page.locator('[data-qty-index="0"]').fill('12');
  await page.locator('.cmsInvoiceItemCardV42').first().locator('input').nth(0).fill('pcs');
  await page.locator('.cmsInvoiceItemCardV42').first().locator('input').nth(1).fill('125');
  await page.locator('.cmsInvoiceItemCardV42').first().locator('input').nth(2).fill('3');

  await page.fill('#cmsNewProductNameV42', productName);
  await page.fill('#cmsNewProductUnitV42', 'pc');
  await page.fill('#cmsNewProductPriceV42', '77');
  await page.fill('#cmsNewProductQtyV42', '2');
  await page.locator('#cmsNewProductQtyV42').locator('..').locator('..').locator('..').getByRole('button').click();
  await page.waitForFunction(() => document.querySelectorAll('.cmsInvoiceItemCardV42').length === 2);
  await page.evaluate(() => window.ChokAnanProductMasterLastRemoteWrite).catch(() => null);

  await page.locator('button.cmsInvoiceSecondaryV42').filter({ hasText: 'บันทึกร่างคำขอ' }).click();
  result.draft = await page.evaluate(() => JSON.parse(localStorage.getItem('cms.invoiceRequest.productionDrafts') || '[]')[0] || null);

  await page.locator('button.cmsInvoicePrimaryV42').click();
  await page.waitForTimeout(3000);
  result.localRequest = await page.evaluate(() => JSON.parse(localStorage.getItem('cms.invoiceRequest.productionRequests') || '[]')[0] || null);
  result.pendingCount = await page.evaluate(() => JSON.parse(localStorage.getItem('cms.invoiceRequest.productionPending') || '[]').length);
  result.invoiceHistoryLocal = await page.evaluate(() => localStorage.getItem('invoices'));

  result.remote = await page.evaluate(async ({ productName }) => {
    const out = { productDocs: [], requestDoc: null, idempotencyDoc: null, auditDocs: [], retry: null, error: null };
    try {
      const productSnap = await window.db.collection('stock_alert_beta1_products').where('name', '==', productName).get();
      out.productDocs = productSnap.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, productCode: data.productCode || data.code || '', createdFrom: data.createdFrom || '', unit: data.unit || '', salePrice: data.salePrice ?? data.price ?? null, costPrice: data.costPrice ?? null };
      });
      const req = JSON.parse(localStorage.getItem('cms.invoiceRequest.productionRequests') || '[]')[0] || null;
      if (req && req.requestId && req.syncStatus !== 'pending') {
        const reqDoc = await window.db.collection('invoiceRequests').doc(req.requestId).get();
        out.requestDoc = reqDoc.exists ? { id: reqDoc.id, ...reqDoc.data(), items: (reqDoc.data().items || []).map(item => ({ productId: item.productId, productCode: item.productCode, productName: item.productName, unit: item.unit, salePrice: item.salePrice, quantity: item.quantity })) } : null;
        const idemDoc = await window.db.collection('invoiceRequestIdempotency').doc(req.idempotencyKey).get();
        out.idempotencyDoc = idemDoc.exists ? idemDoc.data() : null;
        const auditSnap = await window.db.collection('invoiceRequestAuditLogs').where('requestId', '==', req.requestId).get();
        out.auditDocs = auditSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        out.retry = await window.CMSInvoiceRequestSync.submit(req);
      }
    } catch (error) {
      out.error = error.code || error.message || String(error);
    }
    return out;
  }, { productName });

  result.responsive = await page.evaluate(() => ({
    horizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    itemCards: document.querySelectorAll('.cmsInvoiceItemCardV42').length,
    activePage: document.querySelector('.page.active')?.id || ''
  }));

  await browser.close();
  console.log(JSON.stringify(result, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
