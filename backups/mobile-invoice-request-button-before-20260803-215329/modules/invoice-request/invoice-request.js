(function(){
  'use strict';

  const store = window.CMSInvoiceRequestStore;
  const customerSearch = window.CMSInvoiceCustomerSearch;
  const productSearch = window.CMSInvoiceProductSearch;
  const validation = window.CMSInvoiceRequestValidation;
  const summary = window.CMSInvoiceRequestSummary;
  const sync = window.CMSInvoiceRequestSync;
  const SETTINGS = summary.DEFAULT_SETTINGS;

  const state = {
    page: 'landing',
    customer: null,
    items: [],
    note: '',
    draftId: '',
    validation: null,
    confirmLocked: false,
    idempotencyKey: ''
  };

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function money(value){
    return Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function text(value){
    return validation.text(value);
  }

  function isTestMode(){
    return localStorage.getItem('invoiceRequestTestMode') === 'true';
  }

  function nowIso(){
    return new Date().toISOString();
  }

  function nowParts(){
    const now = new Date();
    return {
      iso: now.toISOString(),
      date: now.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }),
      time: now.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })
    };
  }

  function deviceBranch(){
    if (window.StockAlertDeviceBranch && typeof window.StockAlertDeviceBranch.get === 'function') return window.StockAlertDeviceBranch.get();
    return window.currentDeviceBranch || localStorage.getItem('stockAlertDeviceBranchV764') || 1;
  }

  function currentUserUid(){
    return text(window.auth && window.auth.currentUser && window.auth.currentUser.uid || localStorage.getItem('stockAlertUserUid') || '');
  }

  function sender(){
    const nickname = text(window.nickname || localStorage.getItem('stockAlertNickname') || 'เนเธกเนเธฃเธฐเธเธธ');
    const branch = deviceBranch();
    const uid = currentUserUid();
    return {
      requestedBy: text(localStorage.getItem('stockAlertUserId') || nickname),
      requestedByUid: uid,
      ownerUid: uid,
      requestedByNickname: nickname,
      requestedBranch: `เธชเธฒเธเธฒ ${branch || 1}`,
      requestedAt: nowIso()
    };
  }

  function totals(){
    return summary.summarize(state.items, SETTINGS);
  }

  function expectedInvoiceCount(){
    return totals().expectedInvoiceCount;
  }

  function newId(prefix){
    if (window.crypto && window.crypto.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function ensureIdempotencyKey(){
    if (!state.idempotencyKey) state.idempotencyKey = newId('invoice-request');
    return state.idempotencyKey;
  }

  function testRequestId(){
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const seq = String(store.listRequests().length + 1).padStart(4, '0');
    return `TEST-REQ-${date}-${seq}`;
  }

  function modeBanner(){
    return isTestMode()
      ? '<div class="cmsInvoiceBannerV42">Test Mode: เน€เธเนเธเน€เธเธเธฒเธฐเธเนเธญเธกเธนเธฅเธ—เธ”เธชเธญเธเนเธเน€เธเธฃเธทเนเธญเธเธเธตเน เนเธกเนเธชเนเธ Firestore เธเธฃเธดเธ</div>'
      : '<div class="cmsInvoiceBannerV42 production">Production Mode: เธชเนเธเธเธณเธเธญเธเธฃเธดเธเนเธเธ—เธตเน invoiceRequests เนเธ•เนเธขเธฑเธเนเธกเนเธชเธฃเนเธฒเธเนเธเธเธณเธเธฑเธเธ เธฒเธฉเธตเธเธฃเธดเธเนเธฅเธฐเธขเธฑเธเนเธกเนเธญเธญเธเน€เธฅเธ IV</div>';
  }

  function showPage(id){
    ensurePages();
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    window.scrollTo(0, 0);
  }

  function ensureHomeButton(){
    if (document.getElementById('cmsInvoiceRequestEntryV42')) return;
    const grid = document.getElementById('mainGrid');
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'cmsInvoiceRequestEntryV42';
    button.className = 'cmsInvoiceEntryV42';
    button.innerHTML = '<span class="cmsInvoiceIconV42">เธ </span><span><b>เธชเธฑเนเธเธ—เธณเนเธเธเธณเธเธฑเธเธ เธฒเธฉเธต</b><span>เธชเธฃเนเธฒเธเธเธณเธเธญเธเธฃเธดเธเนเธซเนเธเนเธฒเธขเธญเธญเธเนเธเธเธณเธเธฑเธเธ เธฒเธฉเธต</span></span><span class="cmsInvoiceArrowV42">โ€บ</span>';
    button.addEventListener('click', openLanding);
    if (grid) grid.insertAdjacentElement('beforebegin', button);
  }

  function ensurePages(){
    const phone = document.querySelector('.phone');
    if (!phone || document.getElementById('cmsInvoiceRequestPageV42')) return;
    phone.insertAdjacentHTML('beforeend', [
      '<section id="cmsInvoiceRequestPageV42" class="page cmsInvoicePageV42"></section>',
      '<section id="cmsInvoiceRequestFormPageV42" class="page cmsInvoicePageV42"></section>',
      '<section id="cmsInvoiceRequestStatusPageV42" class="page cmsInvoicePageV42"></section>',
      '<section id="cmsInvoiceRequestHistoryPageV42" class="page cmsInvoicePageV42"></section>'
    ].join(''));
  }

  function header(title, sub, back){
    return `<div class="pageHeader"><button class="back" onclick="${back || 'CMSInvoiceRequest.openLanding()'}">โ€น</button><div><h2 style="margin:0">${esc(title)}</h2><div class="smallTitle">${esc(sub)}</div></div></div>${modeBanner()}`;
  }

  function renderLanding(){
    ensurePages();
    const page = document.getElementById('cmsInvoiceRequestPageV42');
    page.innerHTML = [
      header('เนเธเธเธณเธเธฑเธเธ เธฒเธฉเธต', isTestMode() ? 'เธเธณเธเธญเธชเธณเธซเธฃเธฑเธเธเธเธฑเธเธเธฒเธ - Test Mode' : 'เธเธณเธเธญเธเธฃเธดเธเธชเธณเธซเธฃเธฑเธเธเธเธฑเธเธเธฒเธ', 'CMSInvoiceRequest.backHome()'),
      '<div class="cmsInvoiceMenuV42">',
      '<button class="cmsInvoiceMenuButtonV42" onclick="CMSInvoiceRequest.openForm()"><i>1</i><span><b>เธชเธฑเนเธเธ—เธณเนเธเธเธณเธเธฑเธเธ เธฒเธฉเธต</b><span>เน€เธฅเธทเธญเธเธฅเธนเธเธเนเธฒ เน€เธเธดเนเธกเธชเธดเธเธเนเธฒ เธเธฑเธเธ—เธถเธเธฃเนเธฒเธ เนเธฅเธฐเธชเนเธเธเธณเธเธญเธเธฃเธดเธ</span></span><b>โ€บ</b></button>',
      '<button class="cmsInvoiceMenuButtonV42" onclick="CMSInvoiceRequest.openStatus()"><i>2</i><span><b>เธชเธ–เธฒเธเธฐเนเธเธเธณเธเธฑเธเธ เธฒเธฉเธต</b><span>เธ”เธนเธเธณเธเธญเธ—เธตเนเธชเนเธเนเธฅเนเธงเนเธเธเธญเนเธฒเธเธญเธขเนเธฒเธเน€เธ”เธตเธขเธง</span></span><b>โ€บ</b></button>',
      '<button class="cmsInvoiceMenuButtonV42" onclick="CMSInvoiceRequest.openHistory()"><i>3</i><span><b>เธเธฃเธฐเธงเธฑเธ•เธดเนเธเธเธณเธเธฑเธเธ เธฒเธฉเธต</b><span>เธขเธฑเธเนเธกเนเนเธเน Tax Invoice History เธเธฃเธดเธเนเธ Phase 5.1</span></span><b>โ€บ</b></button>',
      '</div>'
    ].join('');
  }

  function renderSenderPanel(){
    const s = sender();
    const now = nowParts();
    return `<div class="cmsInvoicePanelV42"><h3 class="cmsInvoiceSectionTitleV42">เธเธนเนเธชเนเธเธเธณเธเธญ</h3><div class="cmsInvoiceGridV42 two">
      <div><label>เธเธทเนเธญเธเธนเนเธชเนเธเธเธณเธเธญ</label><div class="cmsInvoiceReadOnlyV42">${esc(s.requestedByNickname)}</div></div>
      <div><label>เธชเธฒเธเธฒ</label><div class="cmsInvoiceReadOnlyV42">${esc(s.requestedBranch)}</div></div>
      <div><label>เธงเธฑเธเธ—เธตเน</label><div class="cmsInvoiceReadOnlyV42">${esc(now.date)}</div></div>
      <div><label>เน€เธงเธฅเธฒ</label><div class="cmsInvoiceReadOnlyV42">${esc(now.time)}</div></div>
    </div></div>`;
  }

  function renderCustomerPanel(){
    const c = state.customer;
    return `<div class="cmsInvoicePanelV42"><h3 class="cmsInvoiceSectionTitleV42">เธฅเธนเธเธเนเธฒ</h3>
      <div class="cmsInvoiceSuggestWrapV42"><label>เธเนเธเธซเธฒ/เน€เธฅเธทเธญเธเธฅเธนเธเธเนเธฒ</label><input class="cmsInvoiceInputV42" id="cmsCustomerSearchV42" placeholder="เธเนเธเธเธฒเธเธฃเธซเธฑเธช เธเธทเนเธญ เน€เธฅเธเธ เธฒเธฉเธต เธซเธฃเธทเธญเธ—เธตเนเธญเธขเธนเน" oninput="CMSInvoiceRequest.searchCustomer(this.value)" autocomplete="off"><div class="cmsInvoiceSuggestV42" id="cmsCustomerSuggestV42"></div></div>
      <div class="cmsInvoiceGridV42 two" style="margin-top:10px">
        <div><label>เธฃเธซเธฑเธชเธฅเธนเธเธเนเธฒ</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.customerCode || '-')}</div></div>
        <div><label>เธเธณเธเธณเธซเธเนเธฒ</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.prefix || '-')}</div></div>
        <div><label>เธเธทเนเธญเธฅเธนเธเธเนเธฒ</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.customerName || '-')}</div></div>
        <div><label>เน€เธฅเธเธ เธฒเธฉเธต</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.taxId || '-')}</div></div>
        <div><label>เนเธ—เธฃเธจเธฑเธเธ—เน</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.phone || '-')}</div></div>
        <div><label>เธชเธณเธเธฑเธเธเธฒเธเนเธซเธเน/เธชเธฒเธเธฒ</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.branch || '-')}</div></div>
        <div><label>เธ—เธตเนเธญเธขเธนเน 1</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.address1 || '-')}</div></div>
        <div><label>เธ—เธตเนเธญเธขเธนเน 2</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.address2 || '-')}</div></div>
      </div>
    </div>`;
  }

  function renderProductPanel(){
    return `<div class="cmsInvoicePanelV42"><h3 class="cmsInvoiceSectionTitleV42">เธชเธดเธเธเนเธฒ</h3>
      <div class="cmsInvoiceSuggestWrapV42"><label>เธเนเธเธซเธฒเธชเธดเธเธเนเธฒเน€เธ”เธดเธก</label><input class="cmsInvoiceInputV42" id="cmsProductSearchV42" placeholder="เธเนเธเธเธฒเธเธเธทเนเธญ เธฃเธซเธฑเธช เธซเธเนเธงเธข เธฃเธฒเธเธฒ เธซเธฃเธทเธญเธเธณเนเธเธฅเนเน€เธเธตเธขเธ" oninput="CMSInvoiceRequest.searchProduct(this.value)" onkeydown="CMSInvoiceRequest.productSearchKey(event)" autocomplete="off"><div class="cmsInvoiceSuggestV42" id="cmsProductSuggestV42"></div></div>
      <div class="cmsInvoiceSubPanelV42"><h3 class="cmsInvoiceSectionTitleV42">เน€เธเธดเนเธกเธชเธดเธเธเนเธฒเนเธซเธกเนเน€เธเนเธฒ Product Master</h3>
        <div id="cmsSimilarBoxV42"></div>
        <div class="cmsInvoiceGridV42 two">
          <div><label>เธเธทเนเธญเธชเธดเธเธเนเธฒ</label><input class="cmsInvoiceInputV42" id="cmsNewProductNameV42" oninput="CMSInvoiceRequest.showSimilar(this.value)" placeholder="เธเธทเนเธญเธชเธดเธเธเนเธฒเนเธซเธกเน"></div>
          <div><label>เธซเธเนเธงเธข</label><input class="cmsInvoiceInputV42" id="cmsNewProductUnitV42" placeholder="เธซเธเนเธงเธข"></div>
          <div><label>เธฃเธฒเธเธฒเธเธฒเธข</label><input class="cmsInvoiceInputV42" id="cmsNewProductPriceV42" inputmode="decimal" placeholder="เธฃเธฒเธเธฒเธเธฒเธข"></div>
          <div><label>เธเธณเธเธงเธ</label><input class="cmsInvoiceInputV42" id="cmsNewProductQtyV42" inputmode="decimal" placeholder="เธเธณเธเธงเธ"></div>
        </div>
        <button class="cmsInvoiceSecondaryV42" style="width:100%;margin-top:10px" onclick="CMSInvoiceRequest.addNewProduct()">เน€เธเธดเนเธกเธชเธดเธเธเนเธฒเนเธซเธกเน</button>
      </div>
    </div>`;
  }

  function itemErrors(index){
    return state.validation?.itemResults?.[index]?.errors || {};
  }

  function renderItems(){
    const rows = state.items.map((item, index) => {
      const errors = itemErrors(index);
      const line = summary.line(item, SETTINGS);
      const hasError = Object.keys(errors).length > 0;
      const badges = [];
      if (item.isNewProduct) badges.push('เธชเธดเธเธเนเธฒเนเธซเธกเน');
      if (item.source === 'live-product-master') badges.push('Product Master');
      return `<div class="cmsInvoiceItemCardV42 ${hasError ? 'invalid' : ''}" data-item-index="${index}">
        <div class="cmsInvoiceItemTopV42"><span class="cmsInvoiceItemNoV42">${index + 1}</span><div><strong>${esc(item.productName)}</strong><div>${badges.map(w => `<span class="cmsInvoiceBadgeV42 ${item.isNewProduct ? 'test' : ''}">${esc(w)}</span>`).join('')}</div></div><button class="cmsInvoiceRemoveV42" onclick="CMSInvoiceRequest.removeItem(${index})">เธฅเธ</button></div>
        <div class="cmsInvoiceItemFieldsV42">
          <div class="cmsInvoiceReadOnlyV42">${esc(item.productCode || '-')}</div>
          <input value="${esc(item.unit)}" oninput="CMSInvoiceRequest.updateItem(${index}, 'unit', this.value)" placeholder="เธซเธเนเธงเธข">
          <input value="${esc(item.salePrice ?? '')}" inputmode="decimal" oninput="CMSInvoiceRequest.updateItem(${index}, 'salePrice', this.value)" placeholder="เธฃเธฒเธเธฒเธเธฒเธข">
          <input value="${esc(item.quantity ?? '')}" inputmode="decimal" oninput="CMSInvoiceRequest.updateItem(${index}, 'quantity', this.value)" onkeydown="CMSInvoiceRequest.quantityKey(event)" placeholder="เธเธณเธเธงเธ" data-qty-index="${index}">
          <div class="cmsInvoiceReadOnlyV42">${money(line.lineSubtotal)}</div>
        </div>
        ${Object.values(errors).map(error => `<div class="cmsInvoiceErrorV42">${esc(error)}</div>`).join('')}
      </div>`;
    }).join('');
    const total = totals();
    return `<div class="cmsInvoicePanelV42"><h3 class="cmsInvoiceSectionTitleV42">เธฃเธฒเธขเธเธฒเธฃเธ—เธตเนเน€เธฅเธทเธญเธ</h3>
      <div class="cmsInvoiceSummaryV42">
        <div><small>เธเธณเธเธงเธเธฃเธฒเธขเธเธฒเธฃ</small><b>${state.items.length}</b></div>
        <div><small>เธเธฒเธ”เธงเนเธฒเนเธเนเธ</small><b>${total.expectedInvoiceCount} เนเธ</b></div>
        <div><small>เธเนเธญเธ VAT</small><b>${money(total.subtotal)}</b></div>
        <div><small>VAT 7%</small><b>${money(total.vatAmount)}</b></div>
        <div><small>เธขเธญเธ”เธฃเธงเธก</small><b>${money(total.grandTotal)}</b></div>
      </div>
      <div class="cmsInvoiceItemsV42 desktopTable">${rows || '<div class="empty">เธขเธฑเธเนเธกเนเธกเธตเธฃเธฒเธขเธเธฒเธฃเธชเธดเธเธเนเธฒ</div>'}</div>
    </div>`;
  }

  function renderForm(){
    ensurePages();
    const page = document.getElementById('cmsInvoiceRequestFormPageV42');
    page.innerHTML = [
      header('เธชเธฑเนเธเธ—เธณเนเธเธเธณเธเธฑเธเธ เธฒเธฉเธต', isTestMode() ? 'Test Mode - เธขเธฑเธเนเธกเนเธชเธฃเนเธฒเธเนเธเธเธฃเธดเธ' : 'Production Request - เธขเธฑเธเนเธกเนเธชเธฃเนเธฒเธเนเธเธเธฃเธดเธ'),
      renderSenderPanel(),
      renderCustomerPanel(),
      renderProductPanel(),
      renderItems(),
      `<div class="cmsInvoicePanelV42"><label>เธซเธกเธฒเธขเน€เธซเธ•เธธ</label><textarea id="cmsInvoiceNoteV42" oninput="CMSInvoiceRequest.setNote(this.value)" placeholder="เธซเธกเธฒเธขเน€เธซเธ•เธธเน€เธเธดเนเธกเน€เธ•เธดเธก">${esc(state.note)}</textarea>
        <div class="cmsInvoiceGridV42 three" style="margin-top:10px">
          <div><label>เธเธฃเธฐเน€เธ เธ—เธเธดเธฅ</label><div class="cmsInvoiceReadOnlyV42">เนเธเธเธณเธเธฑเธเธ เธฒเธฉเธตเน€เธ•เนเธก</div></div>
          <div><label>เธเธฃเธฐเธ”เธฒเธฉ</label><div class="cmsInvoiceReadOnlyV42">9 x 11 เธเธดเนเธง</div></div>
          <div><label>VAT</label><div class="cmsInvoiceReadOnlyV42">เนเธขเธเธ เธฒเธฉเธต 7%</div></div>
        </div>
        <div class="cmsInvoiceActionRowV42">
          <button class="cmsInvoiceSecondaryV42" onclick="CMSInvoiceRequest.saveDraft()">เธเธฑเธเธ—เธถเธเธฃเนเธฒเธเธเธณเธเธญ</button>
          <button class="cmsInvoiceDangerV42" onclick="CMSInvoiceRequest.deleteDraft()">เธฅเธเธฃเนเธฒเธ</button>
          <button class="cmsInvoicePrimaryV42 wide" onclick="CMSInvoiceRequest.confirmRequest()">เธขเธทเธเธขเธฑเธเธชเนเธเธเธณเธเธญ</button>
        </div>
      </div>`
    ].join('');
  }

  function customerSnapshot(){
    const c = state.customer || {};
    return {
      customerId: c.customerId || '',
      customerCode: c.customerCode || '',
      prefix: c.prefix || '',
      customerName: c.customerName || '',
      address1: c.address1 || '',
      address2: c.address2 || '',
      taxId: c.taxId || '',
      phone: c.phone || '',
      headOffice: c.branch || '',
      branchNumber: c.branchNumber || ''
    };
  }

  function itemSnapshot(item, index){
    const line = summary.line(item, SETTINGS);
    return {
      requestItemId: item.requestItemId || newId('req-item'),
      rowNumber: index + 1,
      productId: item.productId || '',
      productCode: item.productCode || '',
      productName: text(item.productName),
      unit: text(item.unit),
      salePrice: line.salePrice,
      quantity: line.quantity,
      lineSubtotal: line.lineSubtotal,
      vatAmount: line.vatAmount,
      lineGrandTotal: line.lineGrandTotal,
      isNewProduct: !!item.isNewProduct,
      source: item.source || '',
      addedByUid: item.addedByUid || sender().requestedByUid || '',
      addedBy: item.addedBy || sender().requestedByNickname,
      addedAt: item.addedAt || nowIso()
    };
  }

  function requestSnapshot(base){
    const s = sender();
    const total = totals();
    return {
      ...(base || {}),
      testMode: isTestMode(),
      requestedBy: s.requestedBy,
      requestedByUid: s.requestedByUid,
      ownerUid: s.ownerUid,
      requestedByNickname: s.requestedByNickname,
      requestedBranch: s.requestedBranch,
      requestedAt: base?.requestedAt || s.requestedAt,
      updatedAt: nowIso(),
      customerSnapshot: customerSnapshot(),
      customer: customerSnapshot(),
      invoiceSettings: { ...SETTINGS },
      items: state.items.map(itemSnapshot),
      itemCount: total.itemCount,
      expectedInvoiceCount: total.expectedInvoiceCount,
      subtotal: total.subtotal,
      subtotalPreview: total.subtotal,
      vatAmount: total.vatAmount,
      grandTotal: total.grandTotal,
      note: text(state.note),
      generationState: 'not-started',
      generatedInvoiceIds: [],
      printedInvoiceCount: 0,
      createdFrom: isTestMode() ? 'invoice-request-test-mode' : 'invoice-request-production',
      appVersion: window.STOCK_ALERT_APP_VERSION || window.APP_VERSION_LABEL || window.APP_VERSION || 'unknown',
      status: 'เธเธณเธฅเธฑเธเธ”เธณเน€เธเธดเธเธเธฒเธฃ',
      auditLog: [{
        action: isTestMode() ? 'test-submitted' : 'submitted',
        actorUid: s.requestedByUid,
        by: s.requestedByNickname,
        branch: s.requestedBranch,
        at: nowIso()
      }]
    };
  }

  function renderStatus(){
    ensurePages();
    const rows = isTestMode() ? store.listRequests() : store.listProductionRequests();
    document.getElementById('cmsInvoiceRequestStatusPageV42').innerHTML = [
      header('เธชเธ–เธฒเธเธฐเนเธเธเธณเธเธฑเธเธ เธฒเธฉเธต', isTestMode() ? 'Test Requests เนเธเน€เธเธฃเธทเนเธญเธเธเธตเน' : 'Production Requests เนเธเธเธญเนเธฒเธเธญเธขเนเธฒเธเน€เธ”เธตเธขเธง'),
      '<div class="cmsInvoiceListV42">',
      rows.length ? rows.map(row => statusRowHtml(row)).join('') : '<div class="empty">ยังไม่มีคำขอในเครื่องนี้</div>',
      '</div>'
    ].join('');
  }

  function canGenerateInvoice(row){
    const processing = '\u0e01\u0e33\u0e25\u0e31\u0e07\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23';
    return !isTestMode()
      && row
      && row.testMode !== true
      && row.syncStatus !== 'pending'
      && row.requestId
      && (row.status === processing || String(row.status || '').toLowerCase() === 'processing')
      && (row.generationState || 'not-started') === 'not-started'
      && (!Array.isArray(row.generatedInvoiceIds) || row.generatedInvoiceIds.length === 0);
  }

  function statusRowHtml(row){
    const action = canGenerateInvoice(row)
      ? `<button class="cmsInvoiceSecondaryV42" style="width:100%;margin-top:10px" onclick="CMSInvoiceRequest.generateInvoice('${esc(row.requestId)}')">สร้างใบกำกับ</button>`
      : '';
    const generated = Array.isArray(row.generatedInvoiceIds) && row.generatedInvoiceIds.length
      ? `<br>IV: ${esc((row.generatedInvoiceNumbers || row.generatedInvoiceIds).join ? (row.generatedInvoiceNumbers || row.generatedInvoiceIds).join(', ') : (row.generatedInvoiceNumbers || row.generatedInvoiceIds))}`
      : '';
    return `<div class="cmsInvoiceListRowV42"><b>${esc(row.requestNumber || row.requestId)}</b><span class="cmsInvoiceBadgeV42 ${row.testMode ? 'test' : ''}">${row.testMode ? 'TEST' : (row.syncStatus === 'pending' ? 'รอซิงค์' : 'จริง')}</span><span class="cmsInvoiceListMetaV42">ลูกค้า: ${esc(row.customerSnapshot?.customerName || row.customer?.customerName || '-')}<br>ผู้ส่ง: ${esc(row.requestedByNickname || row.sender?.nickname || '-')} / ${esc(row.requestedBranch || row.sender?.branch || '-')}<br>วันเวลา: ${esc(row.requestedAt || row.sender?.requestedAt || '-')}<br>รายการ: ${row.itemCount || 0} | คาดว่า ${row.expectedInvoiceCount || 0} ใบ | ยอด ${money(row.grandTotal || row.subtotalPreview)}<br>สถานะ: ${esc(row.status || '\u0e01\u0e33\u0e25\u0e31\u0e07\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23')}${generated}</span>${action}</div>`;
  }

  function renderHistory(){
    ensurePages();
    document.getElementById('cmsInvoiceRequestHistoryPageV42').innerHTML = [
      header('เธเธฃเธฐเธงเธฑเธ•เธดเนเธเธเธณเธเธฑเธเธ เธฒเธฉเธต', 'Read-only Placeholder'),
      '<div class="cmsInvoicePanelV42"><span class="cmsInvoiceBadgeV42 warn">PHASE 5.1</span><h3 class="cmsInvoiceSectionTitleV42">เธขเธฑเธเนเธกเนเธญเนเธฒเธเธซเธฃเธทเธญเน€เธเธตเธขเธ Tax Invoice History เธเธฃเธดเธ</h3><p class="muted">เธซเธเนเธฒเธเธตเนเธขเธฑเธเน€เธเนเธเธเธทเนเธเธ—เธตเนเธชเธ–เธฒเธเธฐเน€เธ—เนเธฒเธเธฑเนเธ เนเธกเนเธกเธตเธเธฒเธฃเธชเธฃเนเธฒเธเนเธเธเธณเธเธฑเธเธ เธฒเธฉเธตเธเธฃเธดเธ เนเธกเนเธกเธตเน€เธฅเธ IV เนเธฅเธฐเนเธกเนเธกเธตเธเธฒเธฃเธเธฑเธเธ—เธถเธ Invoice History เนเธ Phase 5.1</p></div>'
    ].join('');
  }

  function openLanding(){ renderLanding(); showPage('cmsInvoiceRequestPageV42'); }
  function openForm(){ loadLatestDraft(); renderForm(); showPage('cmsInvoiceRequestFormPageV42'); }
  function openStatus(){ renderStatus(); showPage('cmsInvoiceRequestStatusPageV42'); }
  function openHistory(){ renderHistory(); showPage('cmsInvoiceRequestHistoryPageV42'); }
  function backHome(){ if (typeof window.go === 'function') window.go('home'); else showPage('home'); }

  function searchCustomer(query){
    const box = document.getElementById('cmsCustomerSuggestV42');
    if (!box) return;
    const rows = customerSearch.searchCustomers(query, 12);
    box.innerHTML = rows.length ? rows.map((customer, index) => `<button type="button" onmousedown="CMSInvoiceRequest.selectCustomer(${index})"><b>${esc(customerSearch.fullName(customer) || customer.customerName)}</b><small>${esc(customer.customerCode || '-')} | ${esc(customer.taxId || '-')} | ${esc(customerSearch.fullAddress(customer) || '-')}</small></button>`).join('') : '<button type="button"><b>เนเธกเนเธเธเธฅเธนเธเธเนเธฒ</b><small>เธญเนเธฒเธเธเธฒเธเธเธฒเธเธฅเธนเธเธเนเธฒ Tax Invoice เนเธเธ read-only</small></button>';
    box.dataset.rows = JSON.stringify(rows);
    box.classList.add('show');
  }

  function selectCustomer(index){
    const box = document.getElementById('cmsCustomerSuggestV42');
    const rows = JSON.parse(box?.dataset.rows || '[]');
    state.customer = rows[index] || null;
    state.validation = null;
    if (box) box.classList.remove('show');
    renderForm();
  }

  function searchProduct(query){
    const box = document.getElementById('cmsProductSuggestV42');
    if (!box) return;
    const rows = productSearch.searchProducts(query, 16);
    box.innerHTML = rows.length ? rows.map((product, index) => {
      return `<button type="button" onmousedown="CMSInvoiceRequest.addExistingProduct(${index})"><b>${esc(product.productName)}</b><small>${esc(product.productCode || '-')} | เธซเธเนเธงเธข ${esc(product.unit || '-')} | เธฃเธฒเธเธฒเธเธฒเธข ${product.salePrice == null ? '-' : money(product.salePrice)}</small></button>`;
    }).join('') : '<button type="button"><b>เนเธกเนเธเธเธชเธดเธเธเนเธฒเน€เธ”เธดเธก</b><small>เน€เธเธดเนเธกเน€เธเนเธเธชเธดเธเธเนเธฒเนเธซเธกเนเน€เธเนเธฒ Product Master เนเธ”เน</small></button>';
    box.dataset.rows = JSON.stringify(rows);
    box.classList.add('show');
  }

  function productSearchKey(event){
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    const box = document.getElementById('cmsProductSuggestV42');
    const rows = JSON.parse(box?.dataset.rows || '[]');
    if (rows.length) {
      event.preventDefault();
      addExistingProduct(0);
    }
  }

  function addExistingProduct(index){
    const box = document.getElementById('cmsProductSuggestV42');
    const rows = JSON.parse(box?.dataset.rows || '[]');
    const product = rows[index];
    if (!product) return;
    state.items.push({
      requestItemId: newId('req-item'),
      productId: product.productId,
      productCode: product.productCode,
      productName: product.productName,
      unit: product.unit,
      salePrice: product.salePrice,
      quantity: '',
      source: product.source || 'existing-product',
      isNewProduct: false,
      addedByUid: sender().requestedByUid,
      addedBy: sender().requestedByNickname,
      addedAt: nowIso()
    });
    state.validation = null;
    renderForm();
    setTimeout(() => document.querySelector(`[data-qty-index="${state.items.length - 1}"]`)?.focus(), 30);
  }

  function showSimilar(name){
    const box = document.getElementById('cmsSimilarBoxV42');
    if (!box) return;
    const rows = productSearch.similarProducts(name, 5);
    box.innerHTML = rows.length ? `<div class="cmsInvoiceSimilarV42">${rows.map(row => `<span class="cmsInvoiceBadgeV42 warn">${esc(row.productName)}</span>`).join('')}</div>` : '';
  }

  async function addNewProduct(){
    const name = document.getElementById('cmsNewProductNameV42')?.value || '';
    const unit = document.getElementById('cmsNewProductUnitV42')?.value || '';
    const salePrice = document.getElementById('cmsNewProductPriceV42')?.value || '';
    const quantity = document.getElementById('cmsNewProductQtyV42')?.value || '';
    const item = { productName: name, unit, salePrice, quantity, source: 'new-product', isNewProduct: true };
    const result = validation.validateItem(item);
    if (!result.valid) {
      alert(Object.values(result.errors)[0]);
      return;
    }
    const similar = productSearch.similarProducts(name, 1)[0];
    if (similar && confirm(`เธเธเธชเธดเธเธเนเธฒเนเธเธฅเนเน€เธเธตเธขเธ: ${similar.productName}\nเนเธเนเธชเธดเธเธเนเธฒเน€เธ”เธตเธขเธงเธเธฑเธเธซเธฃเธทเธญเนเธกเน?`)) {
      state.items.push({
        requestItemId: newId('req-item'),
        productId: similar.productId,
        productCode: similar.productCode,
        productName: similar.productName,
        unit: unit || similar.unit,
        salePrice: salePrice || similar.salePrice,
        quantity,
        source: similar.source || 'existing-product-fuzzy',
        isNewProduct: false,
        addedByUid: sender().requestedByUid,
        addedBy: sender().requestedByNickname,
        addedAt: nowIso()
      });
      renderForm();
      return;
    }
    const created = window.ChokAnanProductMaster && typeof window.ChokAnanProductMaster.createProductAsync === 'function'
      ? await window.ChokAnanProductMaster.createProductAsync({ productName: name, name, unit, salePrice, price: salePrice, createdFrom: 'invoice-request' }, { uid: sender().requestedByUid, by: sender().requestedByNickname, nickname: sender().requestedByNickname, branch: sender().requestedBranch })
      : (window.ChokAnanProductMaster && typeof window.ChokAnanProductMaster.createProduct === 'function'
        ? window.ChokAnanProductMaster.createProduct({ productName: name, name, unit, salePrice, price: salePrice, createdFrom: 'invoice-request' }, { uid: sender().requestedByUid, by: sender().requestedByNickname, nickname: sender().requestedByNickname, branch: sender().requestedBranch })
        : null);
    state.items.push({
      requestItemId: newId('req-item'),
      productId: created?.productId || created?.id || newId('product-missing-master'),
      productCode: created?.productCode || created?.code || '',
      productName: created?.productName || name,
      unit,
      salePrice,
      quantity,
      source: created ? 'live-product-master-new' : 'new-product-local-fallback',
      isNewProduct: true,
      addedByUid: sender().requestedByUid,
      addedBy: sender().requestedByNickname,
      addedAt: nowIso()
    });
    state.validation = null;
    renderForm();
  }

  function updateItem(index, field, value){
    if (!state.items[index]) return;
    state.items[index][field] = value;
    state.validation = null;
    const cards = document.querySelectorAll('.cmsInvoiceSummaryV42 b');
    const total = totals();
    if (cards[0]) cards[0].textContent = state.items.length;
    if (cards[1]) cards[1].textContent = `${total.expectedInvoiceCount} เนเธ`;
    if (cards[2]) cards[2].textContent = money(total.subtotal);
    if (cards[3]) cards[3].textContent = money(total.vatAmount);
    if (cards[4]) cards[4].textContent = money(total.grandTotal);
  }

  function quantityKey(event){
    if (event.key === 'Enter') event.currentTarget.blur();
  }

  function removeItem(index){
    state.items.splice(index, 1);
    state.validation = null;
    renderForm();
  }

  function setNote(value){ state.note = value; }

  function saveDraft(){
    state.note = document.getElementById('cmsInvoiceNoteV42')?.value || state.note;
    const row = isTestMode()
      ? store.saveDraft(requestSnapshot({ draftId: state.draftId }))
      : store.saveProductionDraft(requestSnapshot({ draftId: state.draftId, idempotencyKey: ensureIdempotencyKey() }));
    state.draftId = row.draftId;
    alert('เธเธฑเธเธ—เธถเธเธฃเนเธฒเธเธเธณเธเธญเนเธฅเนเธง');
  }

  function deleteDraft(){
    if (!state.draftId) return alert('เธขเธฑเธเนเธกเนเธกเธตเธฃเนเธฒเธเนเธซเนเธฅเธ');
    if (isTestMode()) store.deleteDraft(state.draftId);
    else store.deleteProductionDraft(state.draftId);
    state.draftId = '';
    alert('เธฅเธเธฃเนเธฒเธเนเธฅเนเธง');
  }

  function loadLatestDraft(){
    if (state.items.length || state.customer || state.draftId) return;
    const draft = isTestMode() ? store.listDrafts()[0] : store.listProductionDrafts()[0];
    if (!draft) return;
    state.draftId = draft.draftId || '';
    state.customer = draft.customerSnapshot || draft.customer || null;
    state.items = Array.isArray(draft.items) ? draft.items.map(item => ({ ...item, salePrice: item.salePrice ?? '', quantity: item.quantity ?? '' })) : [];
    state.note = draft.note || '';
    state.idempotencyKey = draft.idempotencyKey || '';
  }

  async function confirmRequest(){
    state.note = document.getElementById('cmsInvoiceNoteV42')?.value || state.note;
    state.validation = validation.validateRequest({ customer: state.customer, items: state.items });
    if (!state.validation.valid) {
      renderForm();
      const first = state.validation.firstInvalidIndex >= 0 ? document.querySelector(`[data-item-index="${state.validation.firstInvalidIndex}"]`) : document.getElementById('cmsCustomerSearchV42');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      alert(state.validation.errors[0]?.message || 'เธเธฃเธธเธ“เธฒเธ•เธฃเธงเธเธฃเธฒเธขเธเธฒเธฃเธชเธดเธเธเนเธฒเนเธซเนเธเธฃเธ');
      return;
    }
    if (state.confirmLocked) return;
    const total = totals();
    const ok = confirm(`เธขเธทเธเธขเธฑเธเธชเนเธเธเธณเธเธญเธญเธญเธเนเธเธเธณเธเธฑเธเธ เธฒเธฉเธต?\nเธฃเธฒเธขเธเธฒเธฃ ${state.items.length} เธฃเธฒเธขเธเธฒเธฃ\nเธเธฒเธ”เธงเนเธฒ ${total.expectedInvoiceCount} เนเธ\nเธเนเธญเธ VAT ${money(total.subtotal)}\nVAT ${money(total.vatAmount)}\nเธขเธญเธ”เธฃเธงเธก ${money(total.grandTotal)}\n\nPhase 5.1 เธเธฐเธขเธฑเธเนเธกเนเธชเธฃเนเธฒเธเนเธเธเธฃเธดเธเนเธฅเธฐเธขเธฑเธเนเธกเนเธญเธญเธเน€เธฅเธ IV`);
    if (!ok) return;
    state.confirmLocked = true;
    try {
      if (isTestMode()) {
        const row = requestSnapshot({ requestId: testRequestId(), requestNumber: testRequestId(), createdAt: nowIso() });
        store.saveRequest(row);
        alert(`เธชเธฃเนเธฒเธ Test Request เนเธฅเนเธง\n${row.requestNumber}\nเธชเธ–เธฒเธเธฐ: เธเธณเธฅเธฑเธเธ”เธณเน€เธเธดเธเธเธฒเธฃ`);
      } else {
        const row = requestSnapshot({ idempotencyKey: ensureIdempotencyKey(), createdAt: nowIso() });
        const result = await sync.submit(row);
        const saved = result.request;
        alert(`${result.offline ? 'เธเธฑเธเธ—เธถเธเธเธณเธเธญเนเธงเนเธฃเธญเธเธดเธเธเน Firebase เนเธฅเนเธง' : 'เธชเนเธเธเธณเธเธญเธเธฃเธดเธเนเธฅเนเธง'}\n${saved.requestNumber || saved.requestId}\nเธชเธ–เธฒเธเธฐ: ${saved.status}`);
      }
      if (state.draftId) {
        if (isTestMode()) store.deleteDraft(state.draftId);
        else store.deleteProductionDraft(state.draftId);
      }
      state.items = [];
      state.customer = null;
      state.note = '';
      state.draftId = '';
      state.validation = null;
      state.idempotencyKey = '';
      openStatus();
    } catch (error) {
      alert(`เธชเนเธเธเธณเธเธญเนเธกเนเธชเธณเน€เธฃเนเธ: ${error.message || error}`);
    } finally {
      state.confirmLocked = false;
    }
  }

  async function generateInvoice(requestId){
    const row = store.listProductionRequests().find(item => item.requestId === requestId);
    if (!canGenerateInvoice(row)) return alert('คำขอนี้ยังไม่พร้อมสร้างใบกำกับ');
    if (!window.ChokAnanInvoiceGenerator || typeof window.ChokAnanInvoiceGenerator.generateFromRequest !== 'function') return alert('ยังโหลดตัวสร้างใบกำกับไม่ครบ');
    if (!confirm('ยืนยันสร้างใบกำกับจริงจากคำขอนี้?\n\nระบบจะออกเลข IV และบันทึกประวัติ แต่จะไม่พิมพ์อัตโนมัติ')) return;
    try {
      const result = await window.ChokAnanInvoiceGenerator.generateFromRequest(requestId);
      store.saveProductionRequest({
        ...row,
        status: 'พร้อมพิมพ์',
        generationState: 'generated',
        generatedInvoiceIds: result.invoiceIds || row.generatedInvoiceIds || [],
        generatedInvoiceNumbers: result.invoiceNumbers || [],
        invoiceBatchSummary: result.batch || null,
        printedInvoiceCount: 0
      });
      renderStatus();
      alert(`${result.duplicate ? 'พบการสร้างเดิม' : 'สร้างใบกำกับแล้ว'}\n${(result.invoiceNumbers || []).join(', ')}\nสถานะ: พร้อมพิมพ์`);
    } catch (error) {
      alert(`สร้างใบกำกับไม่สำเร็จ: ${error.message || error}`);
    }
  }

  function init(){
    ensurePages();
    ensureHomeButton();
  }

  window.CMSInvoiceRequest = {
    SETTINGS,
    storageKeys: {
      draft: store.DRAFT_KEY,
      request: store.REQUEST_KEY,
      productionDraft: store.PRODUCTION_DRAFT_KEY,
      productionRequest: store.PRODUCTION_REQUEST_KEY
    },
    openLanding,
    openForm,
    openStatus,
    openHistory,
    backHome,
    searchCustomer,
    selectCustomer,
    searchProduct,
    productSearchKey,
    addExistingProduct,
    showSimilar,
    addNewProduct,
    updateItem,
    quantityKey,
    removeItem,
    setNote,
    saveDraft,
    deleteDraft,
    confirmRequest,
    generateInvoice,
    expectedInvoiceCount: () => expectedInvoiceCount(),
    requestSnapshot,
    testState: state
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
