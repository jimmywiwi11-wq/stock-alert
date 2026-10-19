const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('C:/Users/Acer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
    await context.addInitScript(()=>localStorage.setItem('stockAlertNickname','Local autosave test'));
    // Serve fixture files in memory and block ALL other origins, including live Firebase.
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin!=='http://cash-autosave.test')return route.abort();
      const name=decodeURIComponent(url.pathname)==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);
      const file=path.resolve(name);
      if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
      const contentType=file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'application/octet-stream';
      return route.fulfill({status:200,contentType,body:fs.readFileSync(file)});
    });
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const dialogs=[];page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.accept();});
    await page.goto('http://cash-autosave.test/index.html');
    await page.waitForFunction(()=>typeof window.openCashBranch==='function');
    await page.evaluate(()=>window.openCashBranch(1));
    await page.locator('#cashMorningSaveButton').click();
    await page.locator('#cashMorningTotalV749').fill('1500');
    await page.evaluate(()=>window.openCashExchangePopup());
    await page.locator('#cashExchangeFromV749').selectOption({index:1});
    await page.locator('#cashExchangeToV749').selectOption({index:2});
    await page.locator('#cashExchangeAmountV749').fill('4000');
    await page.locator('#cashExchangeNoteV749').fill('autosave offline test');
    await page.evaluate(()=>window.saveCashExchange());
    await page.evaluate(()=>window.go('home'));
    assert.ok(!dialogs.some(x=>x.includes('ยังไม่ได้บันทึก')),'home navigation must not prompt to discard');
    await page.reload();await page.waitForFunction(()=>typeof window.openCashBranch==='function');
    await page.evaluate(()=>window.openCashBranch(1));
    const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('stockAlertDailyCashDraftsV746')));
    const record=Object.values(restored).find(x=>x.branch===1);
    assert.equal(Number(String(record.morningChange).replace(/,/g,'')),1500);
    assert.equal(record.exchangeTransactions[0].amount,4000);
    assert.equal(record.exchangeTransactions[0].note,'autosave offline test');
    assert.equal(await page.locator('#cashMorningSaveButton').textContent(),'ลงยอดเงินทอนตอนเช้า','autosaved typing is not an explicit morning confirmation');
    assert.deepEqual(errors.filter(message=>message!=='firebase is not defined'),[],'no cash JavaScript errors beyond the intentionally blocked Firebase SDK');
    console.log('Browser offline: morning input and exchange details survive Home + reload, without discard confirmation or production access.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
