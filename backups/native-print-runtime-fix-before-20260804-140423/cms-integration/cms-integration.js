(function(){
  'use strict';

  const CMS_ORIGIN = window.location.origin === 'null' ? '*' : window.location.origin;
  const TAX_INVOICE_BASE_URL = 'desktop/tax-invoice/tax_invoice_app.html?cmsTest=1';
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
    'RETURN_TO_STOCK_ALERT',
    'TAX_HISTORY_BRIDGE_READY',
    'REQUEST_TAX_INVOICE_HISTORY',
    'TAX_INVOICE_HISTORY_RESPONSE',
    'TAX_INVOICE_HISTORY_UPDATE',
    'REQUEST_TAX_INVOICE_DETAIL',
    'TAX_INVOICE_DETAIL_RESPONSE',
    'REQUEST_MARK_INVOICE_PRINTED',
    'MARK_INVOICE_PRINTED_RESULT',
    'REQUEST_REFRESH_TAX_HISTORY',
    'TAX_HISTORY_BRIDGE_ERROR',
    'REQUEST_EMPLOYEE_INVOICE_REQUESTS',
    'EMPLOYEE_INVOICE_REQUESTS_RESPONSE',
    'EMPLOYEE_INVOICE_REQUESTS_UPDATE',
    'REQUEST_MARK_REQUEST_OPENED',
    'MARK_REQUEST_OPENED_RESULT',
    'REQUEST_MARK_REQUEST_IMPORTED_NATIVE',
    'MARK_REQUEST_IMPORTED_NATIVE_RESULT'
  ]);

  let modulePage;
  let guardPage;
  let frame;
  let stateBox;
  let bridgeReady = false;
  let frameReadyTimer = null;

  function taxInvoiceUrl(){
    const version = window.STOCK_ALERT_APP_VERSION || window.APP_VERSION_LABEL || window.APP_VERSION || Date.now();
    return `${TAX_INVOICE_BASE_URL}&v=${encodeURIComponent(version)}`;
  }

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

  function markFrameReady(){
    bridgeReady = true;
    if (stateBox) stateBox.classList.add('hidden');
    const badge = document.getElementById('cmsBridgeStatusV3');
    if (badge) badge.textContent = 'เชื่อมต่อแล้ว';
  }

  function frameLooksLoaded(){
    try {
      const doc = frame && frame.contentDocument;
      return !!(doc && doc.readyState === 'complete' && doc.body && doc.body.children.length);
    } catch (error) {
      return false;
    }
  }

  function resetLoadingState(){
    if (!stateBox) return;
    stateBox.innerHTML = '<div><b>กำลังโหลดใบกำกับภาษี</b><br><small>ระบบจะแยกหน้าจอและ CSS ผ่าน iframe</small></div>';
    stateBox.classList.remove('hidden');
    const badge = document.getElementById('cmsBridgeStatusV3');
    if (badge) badge.textContent = 'กำลังเชื่อมต่อ';
  }

  function reloadTaxInvoiceFrame(){
    if (!frame) return;
    bridgeReady = false;
    resetLoadingState();
    frame.src = taxInvoiceUrl();
    scheduleFrameReadyCheck();
  }

  function scheduleFrameReadyCheck(){
    if (frameReadyTimer) window.clearTimeout(frameReadyTimer);
    let tries = 0;
    const tick = () => {
      if (!modulePage || !modulePage.classList.contains('show')) return;
      if (bridgeReady || frameLooksLoaded()) {
        markFrameReady();
        postToFrame('CMS_READY', productsPayload());
        return;
      }
      tries += 1;
      if (tries < 30) {
        frameReadyTimer = window.setTimeout(tick, 300);
        return;
      }
      if (stateBox) {
        stateBox.innerHTML = '<div><b>โหลดใบกำกับภาษียังไม่สำเร็จ</b><br><small>กดปุ่มด้านล่างเพื่อลองโหลดหน้าคอมอีกครั้ง</small><br><button type="button" id="cmsReloadTaxInvoiceV3" class="cmsBackButtonV3" style="margin-top:12px">โหลดใหม่</button></div>';
        document.getElementById('cmsReloadTaxInvoiceV3')?.addEventListener('click', reloadTaxInvoiceFrame);
      }
    };
    frameReadyTimer = window.setTimeout(tick, 300);
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
    const home = document.getElementById('home');
    const target = home || document.querySelector('.phone') || document.body;
    const existing = document.getElementById('cmsDesktopEntryV3');
    if (existing) {
      if (existing.parentElement !== target) target.appendChild(existing);
      return;
    }
    const entry = document.createElement('div');
    entry.id = 'cmsDesktopEntryV3';
    entry.className = 'cmsDesktopEntryV3';
    entry.setAttribute('data-cms-placement', 'home-bottom');
    entry.innerHTML = [
      '<button type="button" class="cmsDesktopButtonV3" id="cmsOpenTaxInvoiceV3">',
      '<span class="cmsDesktopButtonIconV3" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h3"/><path d="M16 16h3v5"/></svg></span>',
      '<span class="cmsDesktopButtonTextV3"><b>ใบกำกับภาษี</b><small>เปิดระบบออกใบกำกับภาษีสำหรับคอมพิวเตอร์</small></span>',
      '</button>'
    ].join('');
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
      '<small class="cmsTestBadgeV3" id="cmsParentTaxBridgeMarkerV27">V28-NATIVE-PRINT-CUSTOMER-FIX</small>',
      '</div>',
      '<div class="cmsModuleBodyV3">',
      '<div class="cmsModuleStateV3" id="cmsModuleStateV3"><div><b>กำลังโหลดใบกำกับภาษี</b><br><small>ระบบจะแยกหน้าจอและ CSS ผ่าน iframe</small></div></div>',
      '<iframe class="cmsTaxFrameV3" id="cmsTaxInvoiceFrameV3" title="Tax Invoice App" src="about:blank"></iframe>',
      '</div>'
    ].join('');
    document.body.appendChild(modulePage);
    frame = document.getElementById('cmsTaxInvoiceFrameV3');
    stateBox = document.getElementById('cmsModuleStateV3');
    if (window.ChokAnanCMSTaxInvoiceHistoryBridge && typeof window.ChokAnanCMSTaxInvoiceHistoryBridge.init === 'function') {
      window.ChokAnanCMSTaxInvoiceHistoryBridge.init({ getFrame: () => frame, origin: CMS_ORIGIN });
    }
    document.getElementById('cmsBackToStockAlertV3').addEventListener('click', requestClose);
    frame.addEventListener('load', () => {
      markFrameReady();
      if (!bridgeReady) postToFrame('CMS_READY', productsPayload());
      window.ChokAnanCMSTaxInvoiceHistoryBridge?.refresh?.();
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
    resetLoadingState();
    if (!frame.src || frame.src === 'about:blank') frame.src = taxInvoiceUrl();
    else if (frameLooksLoaded()) markFrameReady();
    postToFrame('CMS_READY', productsPayload());
    scheduleFrameReadyCheck();
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
      markFrameReady();
      postToFrame('PRODUCTS_RESPONSE', productsPayload());
      window.ChokAnanCMSTaxInvoiceHistoryBridge?.refresh?.();
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
