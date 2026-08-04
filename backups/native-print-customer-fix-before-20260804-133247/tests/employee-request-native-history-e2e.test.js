const assert = require('assert');
const { chromium } = require('C:/Users/Acer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const dialogs = [];
  page.on('dialog', async dialog => {
    dialogs.push(dialog.message());
    await dialog.accept();
  });

  await page.addInitScript(() => {
    window.__employeePrintSnapshots = [];
    window.print = () => {
      window.__employeePrintSnapshots.push({
        bodyClass: document.body.className,
        text: document.querySelector('#invoicePreview')?.textContent || '',
        htmlLength: (document.querySelector('#invoicePreview')?.innerHTML || '').length
      });
      window.dispatchEvent(new Event('afterprint'));
    };
    if (sessionStorage.getItem('nativeImportE2ESeeded') === '1') return;
    sessionStorage.setItem('nativeImportE2ESeeded', '1');
    localStorage.setItem('settings', JSON.stringify({
      shopName: 'ChokAnan Hardware',
      shopAddress: '78/10-12 Main Road Chonburi 20110',
      shopTax: '5450200045561',
      shopPhone: '038000000'
    }));
    localStorage.setItem('invoiceNumberSettings', JSON.stringify({
      formatVersion: 2,
      prefix: 'IV',
      separator: '',
      next: 901,
      width: 6
    }));
    localStorage.setItem('invoices', JSON.stringify([]));
    localStorage.setItem('employeeInvoiceRequestsFixture', JSON.stringify([{
      requestId: 'REQ-E2E-NATIVE-001',
      requestNumber: 'REQ-20260804-999001',
      requestedAt: '2026-08-04T12:34:00.000Z',
      requestedByNickname: 'Mobile Staff',
      requestedBranch: 'Branch 1',
      status: 'processing',
      generationState: 'not-started',
      importedToNativeHistory: false,
      nativeInvoiceIds: [],
      generatedInvoiceIds: [],
      customerSnapshot: {
        customerId: 'CU-E2E-001',
        customerCode: 'CU-E2E-001',
        prefix: 'บริษัท',
        customerName: 'อีทูอี เนทีฟ จำกัด',
        address1: '99/1 หมู่ 2 ต.ทดสอบ',
        address2: 'อ.เมือง จ.ชลบุรี 20000',
        taxId: '0105550009991',
        phone: '0810009991'
      },
      items: [{
        requestItemId: 'RI-1',
        productCode: 'P-E2E-1',
        productName: 'ดอกสว่าน E2E 8mm',
        quantity: 5,
        unit: 'ดอก',
        salePrice: 90,
        lineSubtotal: 450,
        vatAmount: 31.5,
        lineGrandTotal: 481.5
      }],
      itemCount: 1,
      expectedInvoiceCount: 1,
      subtotal: 450,
      vatAmount: 31.5,
      grandTotal: 481.5
    }]));
  });

  const url = process.env.TAX_URL || 'http://127.0.0.1:8765/desktop/tax-invoice/tax_invoice_app.html?e2eNativeImport=1';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('nav button[onclick="showPage(\'employeeRequests\')"]', { timeout: 10000 });
  await page.click('nav button[onclick="showPage(\'history\')"]');
  await page.waitForSelector('#history.active');
  assert.ok(!(await page.locator('#historyTable').textContent()).includes('REQ-20260804-999001'));
  await page.click('nav button[onclick="showPage(\'employeeRequests\')"]');
  await page.waitForSelector('#employeeRequests.active');
  await page.waitForFunction(() => document.querySelector('#employeeRequestList')?.textContent.includes('REQ-20260804-999001'));
  assert.ok(await page.locator('#employeeRequestList').getByText('เปิดตรวจสอบในหน้าออกบิล').isVisible());
  assert.ok(!(await page.locator('#employeeRequestList').textContent()).includes('ตรวจสอบและสั่งพิมพ์'));
  assert.ok(!(await page.locator('#employeeRequestList').textContent()).includes('รับเข้าระบบออกบิล'));

  await page.locator('#employeeRequestList').getByText('เปิดตรวจสอบในหน้าออกบิล').click();
  await page.waitForSelector('#invoice.active');
  assert.strictEqual(await page.evaluate(() => (window.__employeePrintSnapshots || []).length), 0);
  assert.strictEqual(await page.locator('#buyerName').inputValue(), 'บริษัท อีทูอี เนทีฟ จำกัด');
  assert.strictEqual(await page.locator('#buyerTax').inputValue(), '0105550009991');
  assert.ok((await page.locator('#buyerAddress').inputValue()).includes('อ.เมือง จ.ชลบุรี 20000'));
  assert.strictEqual(await page.locator('#invNo').inputValue(), 'IV000901');
  assert.strictEqual(await page.locator('#paperSize').inputValue(), '9x11');
  assert.strictEqual(await page.locator('#vatMode').inputValue(), 'excluded');
  assert.strictEqual(await page.locator('#invoiceItemsEdit tr[data-row-id] input').nth(0).inputValue(), 'ดอกสว่าน E2E 8mm');
  assert.ok((await page.locator('#invoicePreview').textContent()).includes('บริษัท อีทูอี เนทีฟ จำกัด'));
  assert.ok((await page.locator('#invoicePreview').textContent()).includes('อ.เมือง จ.ชลบุรี 20000'));
  const beforeSave = await page.evaluate(() => JSON.parse(localStorage.getItem('invoices') || '[]'));
  assert.strictEqual(beforeSave.length, 0);

  await page.locator('#invoiceItemsEdit .invoice-qty-input').first().fill('5');
  await page.locator('#invoiceItemsEdit .price-input').first().fill('125');
  await page.locator('#invoiceItemsEdit .price-input').first().dispatchEvent('change');
  await page.getByRole('button', { name: 'บันทึกบิล', exact: true }).click();
  await page.waitForFunction(() => {
    const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    return invoices.some(inv => inv.sourceRequestId === 'REQ-E2E-NATIVE-001');
  }, { timeout: 10000 });
  assert.strictEqual(await page.evaluate(() => (window.__employeePrintSnapshots || []).length), 0);

  await page.getByRole('button', { name: 'พิมพ์อย่างเดียว', exact: true }).click();
  await page.waitForFunction(() => (window.__employeePrintSnapshots || []).length > 0, { timeout: 10000 });
  const printSnapshot = await page.evaluate(() => window.__employeePrintSnapshots[0]);
  assert.ok(printSnapshot.bodyClass.includes('invoice-clean-print'));
  assert.ok(printSnapshot.htmlLength > 500);
  assert.ok(printSnapshot.text.includes('IV000901'));
  assert.ok(printSnapshot.text.includes('บริษัท อีทูอี เนทีฟ จำกัด'));
  assert.ok(printSnapshot.text.includes('อ.เมือง จ.ชลบุรี 20000'));

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('invoices') || '[]'));
  assert.strictEqual(saved.length, 1);
  assert.strictEqual(saved[0].sourceRequestId, 'REQ-E2E-NATIVE-001');
  assert.strictEqual(saved[0].source, 'employee-request');
  assert.strictEqual(saved[0].printStatus, 'ready_to_print');
  assert.strictEqual(saved[0].paperSize, '9x11');
  assert.strictEqual(saved[0].vatMode, 'excluded');
  assert.strictEqual(saved[0].buyerName, 'บริษัท อีทูอี เนทีฟ จำกัด');
  assert.ok(String(saved[0].buyerAddress || '').includes('อ.เมือง จ.ชลบุรี 20000'));
  assert.strictEqual(saved[0].no, 'IV000901');
  assert.strictEqual(Number(saved[0].items[0].qty), 5);
  assert.strictEqual(Number(saved[0].items[0].price), 125);

  await page.click('nav button[onclick="showPage(\'history\')"]');
  await page.waitForSelector('#history.active');
  await page.waitForFunction(() => document.querySelector('#historyTable')?.textContent.includes('IV000901'));
  const historyText = await page.locator('#historyTable').textContent();
  assert.ok(historyText.includes('บริษัท อีทูอี เนทีฟ จำกัด'));

  await page.click('nav button[onclick="showPage(\'employeeRequests\')"]');
  await page.waitForFunction(() => document.querySelector('#employeeRequestList')?.textContent.includes('ยังไม่มีคำขอจากพนักงานที่รอตรวจสอบในหน้าออกบิล'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.click('nav button[onclick="showPage(\'history\')"]');
  await page.waitForSelector('#history.active #historyTable');
  await page.waitForFunction(() => document.querySelector('#historyTable')?.textContent.includes('IV000901'));

  await browser.close();
  console.log(`employee request native history e2e passed: invoices=${saved.length}; dialogs=${dialogs.length}`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
