(function(){
  'use strict';

  const CMS_ORIGIN = window.location.origin === 'null' ? '*' : window.location.origin;
  const TAX_INVOICE_URL = 'desktop/tax-invoice/tax_invoice_app.html?cmsTest=1';
  const FEATURE_FLAG_KEY = 'cmsTaxInvoiceFeatureEnabled';
  const PERMISSION_KEY = 'cmsPermission.taxInvoice.view';
  const MESSAGE_TYPES = new Set([
    'CMS_READY',
    'TAX_INVOICE_READY',
    'GET_PRODUCTS',
    'PRODUCTS_RESPONSE',
    'PRODUCT_UPDATED',
    'REQUEST_CLOSE',
    'UNSAVED_CHANGES',
    'OPEN_TAX_INVOICE',
    'RETURN_TO_STOCK_ALERT'
  ]);

  let modulePage;
  let guardPage;
  let frame;
  let stateBox;
  let bridgeReady = false;

  function featureEnabled(){
    return localStorage.getItem(FEATURE_FLAG_KEY) !== 'false';
  }

  function permissionAllowed(){
    return localStorage.getItem(PERMISSION_KEY) !== 'false';
  }

  function desktopCapable(){
    return window.innerWidth >= 1024 &&
      window.matchMedia('(pointer: fine)').matches &&
      window.matchMedia('(hover: hover)').matches &&
      featureEnabled() &&
      permissionAllowed();
  }

  function setDesktopClass(){
    document.body.classList.toggle('cmsDesktopAllowedV3', desktopCapable());
  }

  function safeMessage(type, payload){
    if (!MESSAGE_TYPES.has(type)) return null;
    return { source: 'chokanan-cms', type, payload: payload || {}, version: 1 };
  }

  function postToFrame(type, payload){
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage(safeMessage(type, payload), CMS_ORIGIN);
  }

  function productsPayload(){
    const adapter = window.CMSProductAdapter;
    const products = adapter ? adapter.sharedProducts() : [];
    const conflicts = adapter ? adapter.conflictReport() : null;
    return {
      mode: 'test-read-only',
      readOnly: true,
      products,
      summary: conflicts ? {
        stockAlertProducts: conflicts.stockAlertProducts,
        taxInvoiceProducts: conflicts.taxInvoiceProducts,
        sameCodeDifferentName: conflicts.sameCodeDifferentName.length,
        sameNameDifferentCode: conflicts.sameNameDifferentCode.length,
        stockAlertOnly: conflicts.stockAlertOnly.length,
        taxInvoiceOnly: conflicts.taxInvoiceOnly.length
      } : {}
    };
  }

  function ensureEntryButton(){
    if (document.getElementById('cmsDesktopEntryV3')) return;
    const home = document.getElementById('home');
    const target = home || document.querySelector('.phone') || document.body;
    const entry = document.createElement('div');
    entry.id = 'cmsDesktopEntryV3';
    entry.className = 'cmsDesktopEntryV3';
    entry.setAttribute('data-cms-placement', 'home-bottom');
    entry.innerHTML = '<button type="button" class="cmsDesktopButtonV3" id="cmsOpenTaxInvoiceV3">ใบกำกับภาษี<span>ChokAnan Management System (CMS) - โหมดทดสอบข้อมูลสินค้าแบบอ่านอย่างเดียว</span></button>';
    entry.innerHTML = '<button type="button" class="cmsDesktopButtonV3" id="cmsOpenTaxInvoiceV3"><span class="cmsDesktopButtonIconV3" aria-hidden="true">ภ</span><span class="cmsDesktopButtonTextV3"><b>ใบกำกับภาษี</b><small>ระบบออกใบกำกับภาษีสำหรับคอมพิวเตอร์</small></span></button>';
    target.appendChild(entry);
    document.getElementById('cmsOpenTaxInvoiceV3').addEventListener('click', openTaxInvoice);
  }

  function ensureModulePage(){
    if (modulePage) return;
    modulePage = document.createElement('div');
    modulePage.id = 'cmsTaxInvoiceModuleV3';
    modulePage.className = 'cmsModulePageV3';
    modulePage.innerHTML = [
      '<div class="cmsModuleHeaderV3">',
      '<button type="button" class="cmsBackButtonV3" id="cmsBackToStockAlertV3">กลับสู่ระบบสินค้าขาด</button>',
      '<div><h1>ChokAnan Management System (CMS)</h1><small>ใบกำกับภาษี - โหมดทดสอบข้อมูลสินค้าแบบอ่านอย่างเดียว</small></div>',
      '<span class="cmsTestBadgeV3" id="cmsBridgeStatusV3">กำลังเชื่อมต่อ</span>',
      '</div>',
      '<div class="cmsModuleBodyV3">',
      '<div class="cmsModuleStateV3" id="cmsModuleStateV3"><div><b>กำลังโหลดใบกำกับภาษี</b><br><small>ระบบจะแยกหน้าจอและ CSS ผ่าน iframe</small></div></div>',
      '<iframe class="cmsTaxFrameV3" id="cmsTaxInvoiceFrameV3" title="Tax Invoice App" src="about:blank"></iframe>',
      '</div>'
    ].join('');
    document.body.appendChild(modulePage);
    frame = document.getElementById('cmsTaxInvoiceFrameV3');
    stateBox = document.getElementById('cmsModuleStateV3');
    document.getElementById('cmsBackToStockAlertV3').addEventListener('click', requestClose);
    frame.addEventListener('load', () => {
      stateBox.classList.add('hidden');
      if (!bridgeReady) postToFrame('CMS_READY', productsPayload());
    });
  }

  function ensureGuard(){
    if (guardPage) return;
    guardPage = document.createElement('div');
    guardPage.id = 'cmsTaxInvoiceGuardV3';
    guardPage.className = 'cmsGuardV3';
    guardPage.innerHTML = '<div class="cmsGuardCardV3"><h2>ระบบใบกำกับภาษีใช้งานได้เฉพาะบนคอมพิวเตอร์</h2><p>ระบบสินค้าขาดบนมือถือยังใช้งานได้ตามปกติ</p><button type="button" id="cmsGuardBackV3">กลับสู่ระบบสินค้าขาด</button></div>';
    document.body.appendChild(guardPage);
    document.getElementById('cmsGuardBackV3').addEventListener('click', closeGuard);
  }

  function showGuard(){
    ensureGuard();
    guardPage.classList.add('show');
    history.replaceState(null, '', location.pathname + location.search);
  }

  function closeGuard(){
    if (guardPage) guardPage.classList.remove('show');
  }

  function openTaxInvoice(){
    if (!desktopCapable()) {
      showGuard();
      return;
    }
    ensureModulePage();
    bridgeReady = false;
    modulePage.classList.add('show');
    stateBox.classList.remove('hidden');
    document.getElementById('cmsBridgeStatusV3').textContent = 'กำลังเชื่อมต่อ';
    if (!frame.src || frame.src === 'about:blank') frame.src = TAX_INVOICE_URL;
    else postToFrame('CMS_READY', productsPayload());
  }

  function closeModule(){
    if (modulePage) modulePage.classList.remove('show');
  }

  function requestClose(){
    if (!frame || !frame.contentWindow) return closeModule();
    postToFrame('REQUEST_CLOSE', {});
    setTimeout(() => {
      if (modulePage && modulePage.classList.contains('show')) {
        const ok = confirm('ต้องการกลับสู่ระบบสินค้าขาดหรือไม่?');
        if (ok) closeModule();
      }
    }, 800);
  }

  function validIncoming(event){
    if (!frame || event.source !== frame.contentWindow) return false;
    if (CMS_ORIGIN !== '*' && event.origin !== window.location.origin) return false;
    const data = event.data || {};
    return data.source === 'tax-invoice-app' && MESSAGE_TYPES.has(data.type);
  }

  function onMessage(event){
    if (!validIncoming(event)) return;
    const data = event.data;
    if (data.type === 'TAX_INVOICE_READY') {
      bridgeReady = true;
      document.getElementById('cmsBridgeStatusV3').textContent = 'เชื่อมต่อแล้ว';
      postToFrame('PRODUCTS_RESPONSE', productsPayload());
    }
    if (data.type === 'GET_PRODUCTS') postToFrame('PRODUCTS_RESPONSE', productsPayload());
    if (data.type === 'UNSAVED_CHANGES') {
      const ok = confirm('มีข้อมูลใบกำกับภาษีที่อาจยังไม่ได้บันทึก ต้องการกลับสู่ระบบสินค้าขาดหรือไม่?');
      if (ok) closeModule();
    }
    if (data.type === 'RETURN_TO_STOCK_ALERT') closeModule();
  }

  function guardDirectRoute(){
    const params = new URLSearchParams(location.search);
    if (params.get('taxInvoice') === '1' || location.hash === '#tax-invoice') {
      if (desktopCapable()) openTaxInvoice();
      else showGuard();
    }
  }

  function init(){
    ensureEntryButton();
    ensureGuard();
    setDesktopClass();
    guardDirectRoute();
    window.addEventListener('resize', setDesktopClass);
    window.matchMedia('(pointer: fine)').addEventListener?.('change', setDesktopClass);
    window.matchMedia('(hover: hover)').addEventListener?.('change', setDesktopClass);
    window.addEventListener('message', onMessage);
  }

  window.ChokAnanCMS = {
    openTaxInvoice,
    closeTaxInvoice: requestClose,
    desktopCapable,
    featureEnabled,
    permissionAllowed,
    setTestPermission(value){ localStorage.setItem(PERMISSION_KEY, value ? 'true' : 'false'); setDesktopClass(); },
    setFeatureFlag(value){ localStorage.setItem(FEATURE_FLAG_KEY, value ? 'true' : 'false'); setDesktopClass(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
