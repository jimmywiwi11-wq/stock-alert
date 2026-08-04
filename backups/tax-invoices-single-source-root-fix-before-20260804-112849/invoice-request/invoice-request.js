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
    idempotencyKey: '',
    selectedProduct: null,
    customerSearchTimer: null,
    productSearchTimer: null,
    customerSearchToken: 0,
    productSearchToken: 0,
    composing: { customer: false, product: false, productName: false },
    realtimeBound: false,
    realtimeUnsubs: []
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
    const nickname = text(window.nickname || localStorage.getItem('stockAlertNickname') || 'ไม่ระบุ');
    const branch = deviceBranch();
    const uid = currentUserUid();
    return {
      requestedBy: text(localStorage.getItem('stockAlertUserId') || nickname),
      requestedByUid: uid,
      ownerUid: uid,
      requestedByNickname: nickname,
      requestedBranch: `สาขา ${branch || 1}`,
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
      ? '<div class="cmsInvoiceBannerV42">Test Mode: เก็บเฉพาะข้อมูลทดสอบในเครื่องนี้ ไม่ส่ง Firestore จริง</div>'
      : '<div class="cmsInvoiceBannerV42 production">Production Mode: ส่งคำขอจริงไปที่ invoiceRequests แต่ยังไม่สร้างใบกำกับภาษีจริงและยังไม่ออกเลข IV</div>';
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
    const home = document.getElementById('home');
    const existing = document.getElementById('cmsInvoiceRequestEntryV42');
    const desktopEntry = document.getElementById('cmsDesktopEntryV3');
    if (existing) {
      if (home && existing.parentElement !== home) home.appendChild(existing);
      if (home && desktopEntry && existing.nextElementSibling !== desktopEntry) home.insertBefore(existing, desktopEntry);
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'cmsInvoiceRequestEntryV42';
    button.className = 'cmsInvoiceEntryV42';
    button.innerHTML = [
      '<span class="cmsInvoiceIconV42" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M10 12h6M10 16h6M10 8h2"/></svg></span>',
      '<span class="cmsInvoiceEntryTextV42"><b>สั่งทำใบกำกับภาษี</b><span>ส่งรายการให้ระบบสร้างใบกำกับภาษีอัตโนมัติ</span></span>',
      '<span class="cmsInvoiceArrowV42">›</span>'
    ].join('');
    button.addEventListener('click', openLanding);
    if (home && desktopEntry) home.insertBefore(button, desktopEntry);
    else if (home) home.appendChild(button);
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
    return `<div class="pageHeader"><button class="back" onclick="${back || 'CMSInvoiceRequest.openLanding()'}">‹</button><div><h2 style="margin:0">${esc(title)}</h2><div class="smallTitle">${esc(sub)}</div></div></div>${modeBanner()}`;
  }

  function renderLanding(){
    ensurePages();
    const page = document.getElementById('cmsInvoiceRequestPageV42');
    page.innerHTML = [
      header('ใบกำกับภาษี', isTestMode() ? 'คำขอสำหรับพนักงาน - Test Mode' : 'คำขอจริงสำหรับพนักงาน', 'CMSInvoiceRequest.backHome()'),
      '<div class="cmsInvoiceMenuV42">',
      '<button class="cmsInvoiceMenuButtonV42" onclick="CMSInvoiceRequest.openForm()"><i>1</i><span><b>สั่งทำใบกำกับภาษี</b><span>เลือกลูกค้า เพิ่มสินค้า บันทึกร่าง และส่งคำขอจริง</span></span><b>›</b></button>',
      '<button class="cmsInvoiceMenuButtonV42" onclick="CMSInvoiceRequest.openStatus()"><i>2</i><span><b>สถานะใบกำกับภาษี</b><span>ดูคำขอที่ส่งแล้วแบบอ่านอย่างเดียว</span></span><b>›</b></button>',
      '<button class="cmsInvoiceMenuButtonV42" onclick="CMSInvoiceRequest.openHistory()"><i>3</i><span><b>ประวัติใบกำกับภาษี</b><span>ดูประวัติคำขอใบกำกับภาษี</span></span><b>›</b></button>',
      '</div>'
    ].join('');
  }

  function renderSenderPanel(){
    const s = sender();
    const now = nowParts();
    return `<div class="cmsInvoicePanelV42"><h3 class="cmsInvoiceSectionTitleV42">ผู้ส่งคำขอ</h3><div class="cmsInvoiceGridV42 two">
      <div><label>ชื่อผู้ส่งคำขอ</label><div class="cmsInvoiceReadOnlyV42">${esc(s.requestedByNickname)}</div></div>
      <div><label>สาขา</label><div class="cmsInvoiceReadOnlyV42">${esc(s.requestedBranch)}</div></div>
      <div><label>วันที่</label><div class="cmsInvoiceReadOnlyV42">${esc(now.date)}</div></div>
      <div><label>เวลา</label><div class="cmsInvoiceReadOnlyV42">${esc(now.time)}</div></div>
    </div></div>`;
  }

  function renderCustomerPanel(){
    const c = state.customer;
    const selectedName = c ? (c.customerName || c.name || '-') : '-';
    return `<div class="cmsInvoicePanelV42"><h3 class="cmsInvoiceSectionTitleV42">ลูกค้า</h3>
      <div class="cmsInvoiceSuggestWrapV42"><label>ค้นหา/เลือกลูกค้า</label><input class="cmsInvoiceInputV42" id="cmsCustomerSearchV42" placeholder="ค้นจากรหัส ชื่อ เลขภาษี หรือที่อยู่" oncompositionstart="CMSInvoiceRequest.beginComposition('customer')" oncompositionend="CMSInvoiceRequest.endComposition('customer', this.value)" oninput="CMSInvoiceRequest.searchCustomer(this.value)" autocomplete="off"><div class="cmsInvoiceSuggestV42" id="cmsCustomerSuggestV42"></div></div>
      <div class="cmsInvoiceSelectedCustomerV42" style="margin-top:10px"><label>ลูกค้าที่เลือก</label><div class="cmsInvoiceReadOnlyV42">${esc(selectedName)}</div></div>
    </div>`;
  }

  function renderProductPanel(){
    return `<div class="cmsInvoicePanelV42"><h3 class="cmsInvoiceSectionTitleV42">สินค้า</h3>
      <div class="cmsInvoiceSubPanelV42"><h3 class="cmsInvoiceSectionTitleV42">เพิ่มสินค้า</h3>
        <div id="cmsSimilarBoxV42"></div>
        <div class="cmsInvoiceGridV42 two">
          <div class="cmsInvoiceSuggestWrapV42"><label>ชื่อสินค้า</label><input class="cmsInvoiceInputV42" id="cmsNewProductNameV42" oninput="CMSInvoiceRequest.productNameChanged(this.value)" onkeydown="CMSInvoiceRequest.productSearchKey(event)" placeholder="เลือกจากรายการหรือพิมพ์สินค้าใหม่"><div class="cmsInvoiceSuggestV42" id="cmsProductSuggestV42"></div></div>
          <div><label>หน่วย</label><input class="cmsInvoiceInputV42" id="cmsNewProductUnitV42" placeholder="หน่วย"></div>
          <div><label>ราคาขาย</label><input class="cmsInvoiceInputV42" id="cmsNewProductPriceV42" inputmode="decimal" placeholder="ราคาขาย"></div>
          <div><label>จำนวน</label><input class="cmsInvoiceInputV42" id="cmsNewProductQtyV42" inputmode="decimal" placeholder="จำนวน"></div>
        </div>
        <button class="cmsInvoiceSecondaryV42" style="width:100%;margin-top:10px" onclick="CMSInvoiceRequest.addNewProduct()">เพิ่มสินค้าใหม่</button>
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
      if (item.isNewProduct) badges.push('สินค้าใหม่');
      if (item.source === 'live-product-master') badges.push('Product Master');
      return `<div class="cmsInvoiceItemCardV42 ${hasError ? 'invalid' : ''}" data-item-index="${index}">
        <div class="cmsInvoiceItemTopV42"><span class="cmsInvoiceItemNoV42">${index + 1}</span><div><strong>${esc(item.productName)}</strong><div>${badges.map(w => `<span class="cmsInvoiceBadgeV42 ${item.isNewProduct ? 'test' : ''}">${esc(w)}</span>`).join('')}</div></div><button class="cmsInvoiceRemoveV42" onclick="CMSInvoiceRequest.removeItem(${index})">ลบ</button></div>
        <div class="cmsInvoiceItemFieldsV42">
          <div class="cmsInvoiceReadOnlyV42 cmsInvoiceItemCodeV42">${esc(item.productCode || '-')}</div>
          <input class="cmsInvoiceItemUnitV42" value="${esc(item.unit)}" oninput="CMSInvoiceRequest.updateItem(${index}, 'unit', this.value)" placeholder="หน่วย">
          <input class="cmsInvoiceItemPriceV42" value="${esc(item.salePrice ?? '')}" inputmode="decimal" oninput="CMSInvoiceRequest.updateItem(${index}, 'salePrice', this.value)" placeholder="ราคาขาย">
          <input class="cmsInvoiceItemQtyV42" value="${esc(item.quantity ?? '')}" inputmode="decimal" oninput="CMSInvoiceRequest.updateItem(${index}, 'quantity', this.value)" onkeydown="CMSInvoiceRequest.quantityKey(event)" placeholder="จำนวน" data-qty-index="${index}">
          <div class="cmsInvoiceReadOnlyV42 cmsInvoiceLineTotalV42">${money(line.lineSubtotal)}</div>
        </div>
        ${Object.values(errors).map(error => `<div class="cmsInvoiceErrorV42">${esc(error)}</div>`).join('')}
      </div>`;
    }).join('');
    const total = totals();
    return `<div class="cmsInvoicePanelV42"><h3 class="cmsInvoiceSectionTitleV42">รายการที่เลือก</h3>
      <div class="cmsInvoiceSummaryV42">
        <div><small>จำนวนรายการ</small><b>${state.items.length}</b></div>
        <div><small>คาดว่าแบ่ง</small><b>${total.expectedInvoiceCount} ใบ</b></div>
        <div><small>ก่อน VAT</small><b>${money(total.subtotal)}</b></div>
        <div><small>VAT 7%</small><b>${money(total.vatAmount)}</b></div>
        <div><small>ยอดรวม</small><b>${money(total.grandTotal)}</b></div>
      </div>
      <div class="cmsInvoiceItemsV42 desktopTable">${rows || '<div class="empty">ยังไม่มีรายการสินค้า</div>'}</div>
    </div>`;
  }

  function renderForm(){
    ensurePages();
    const page = document.getElementById('cmsInvoiceRequestFormPageV42');
    page.innerHTML = [
      header('สั่งทำใบกำกับภาษี', isTestMode() ? 'Test Mode - ยังไม่สร้างใบจริง' : 'Production Request - ยังไม่สร้างใบจริง'),
      renderSenderPanel(),
      renderCustomerPanel(),
      renderProductPanel(),
      renderItems(),
      `<div class="cmsInvoicePanelV42"><label>หมายเหตุ</label><textarea id="cmsInvoiceNoteV42" oninput="CMSInvoiceRequest.setNote(this.value)" placeholder="หมายเหตุเพิ่มเติม">${esc(state.note)}</textarea>
        <div class="cmsInvoiceGridV42 three" style="margin-top:10px">
          <div><label>ประเภทบิล</label><div class="cmsInvoiceReadOnlyV42">ใบกำกับภาษีเต็ม</div></div>
          <div><label>กระดาษ</label><div class="cmsInvoiceReadOnlyV42">9 x 11 นิ้ว</div></div>
          <div><label>VAT</label><div class="cmsInvoiceReadOnlyV42">แยกภาษี 7%</div></div>
        </div>
        <div class="cmsInvoiceActionRowV42">
          <button class="cmsInvoiceSecondaryV42" onclick="CMSInvoiceRequest.saveDraft()">บันทึกร่างคำขอ</button>
          <button class="cmsInvoiceDangerV42" onclick="CMSInvoiceRequest.deleteDraft()">ลบร่าง</button>
          <button class="cmsInvoicePrimaryV42 wide" onclick="CMSInvoiceRequest.confirmRequest()">ยืนยันส่งคำขอ</button>
        </div>
      </div>`
    ].join('');
  }

  function customerSnapshot(){
    const c = state.customer || {};
    const original = c.original || {};
    const address1 = c.address1 || c.buyerAddress1 || c.customerAddress || c.fullAddress || original.address1 || original.buyerAddress1 || original.customerAddress || original.fullAddress || original.address || '';
    const address2 = c.address2 || c.buyerAddress2 || original.address2 || original.buyerAddress2 || '';
    return {
      customerId: c.customerId || '',
      customerCode: c.customerCode || '',
      prefix: c.prefix || '',
      customerName: c.customerName || '',
      address1,
      address2,
      address: [address1, address2].filter(Boolean).join(' ').trim(),
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
      status: 'กำลังดำเนินการ',
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
      header('สถานะใบกำกับภาษี', isTestMode() ? 'Test Requests ในเครื่องนี้' : 'Production Requests แบบอ่านอย่างเดียว'),
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
      header('ประวัติใบกำกับภาษี', 'Read-only Placeholder'),
      '<div class="cmsInvoicePanelV42"><span class="cmsInvoiceBadgeV42 warn">PHASE 5.1</span><h3 class="cmsInvoiceSectionTitleV42">ยังไม่อ่านหรือเขียน Tax Invoice History จริง</h3><p class="muted">หน้านี้ยังเป็นพื้นที่สถานะเท่านั้น ไม่มีการสร้างใบกำกับภาษีจริง ไม่มีเลข IV และไม่มีการบันทึก Invoice History ใน Phase 5.1</p></div>'
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
    box.innerHTML = rows.length ? rows.map((customer, index) => `<button type="button" onmousedown="CMSInvoiceRequest.selectCustomer(${index})"><b>${esc(customerSearch.fullName(customer) || customer.customerName)}</b><small>${esc(customerSearch.shortMeta(customer))}</small></button>`).join('') : '<button type="button"><b>ไม่พบลูกค้า</b><small>อ่านจากฐานลูกค้า Tax Invoice แบบ read-only</small></button>';
    box.dataset.rows = JSON.stringify(rows);
    box.classList.add('show');
  }

  function refreshCustomerSuggestions(){
    const input = document.getElementById('cmsCustomerSearchV42');
    const box = document.getElementById('cmsCustomerSuggestV42');
    if (input && box && box.classList.contains('show')) searchCustomer(input.value);
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
      return `<button type="button" onmousedown="CMSInvoiceRequest.addExistingProduct(${index})"><b>${esc(product.productName)}</b><small>${esc(product.productCode || '-')} | หน่วย ${esc(product.unit || '-')} | ราคาขาย ${product.salePrice == null ? '-' : money(product.salePrice)}</small></button>`;
    }).join('') : '<button type="button"><b>ไม่พบสินค้าเดิม</b><small>เพิ่มเป็นสินค้าใหม่เข้า Product Master ได้</small></button>';
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
    if (similar && confirm(`พบสินค้าใกล้เคียง: ${similar.productName}\nใช่สินค้าเดียวกันหรือไม่?`)) {
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
    if (cards[1]) cards[1].textContent = `${total.expectedInvoiceCount} ใบ`;
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
    alert('บันทึกร่างคำขอแล้ว');
  }

  function deleteDraft(){
    if (!state.draftId) return alert('ยังไม่มีร่างให้ลบ');
    if (isTestMode()) store.deleteDraft(state.draftId);
    else store.deleteProductionDraft(state.draftId);
    state.draftId = '';
    alert('ลบร่างแล้ว');
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
      alert(state.validation.errors[0]?.message || 'กรุณาตรวจรายการสินค้าให้ครบ');
      return;
    }
    if (state.confirmLocked) return;
    const total = totals();
    const ok = confirm(`ยืนยันส่งคำขอออกใบกำกับภาษี?\nรายการ ${state.items.length} รายการ\nคาดว่า ${total.expectedInvoiceCount} ใบ\nก่อน VAT ${money(total.subtotal)}\nVAT ${money(total.vatAmount)}\nยอดรวม ${money(total.grandTotal)}\n\nPhase 5.1 จะยังไม่สร้างใบจริงและยังไม่ออกเลข IV`);
    if (!ok) return;
    state.confirmLocked = true;
    try {
      if (isTestMode()) {
        const row = requestSnapshot({ requestId: testRequestId(), requestNumber: testRequestId(), createdAt: nowIso() });
        store.saveRequest(row);
        alert(`สร้าง Test Request แล้ว\n${row.requestNumber}\nสถานะ: กำลังดำเนินการ`);
      } else {
        const row = requestSnapshot({ idempotencyKey: ensureIdempotencyKey(), createdAt: nowIso() });
        const result = await sync.submit(row);
        const saved = result.request;
        alert(`${result.offline ? 'บันทึกคำขอไว้รอซิงค์ Firebase แล้ว' : 'ส่งคำขอจริงแล้ว'}\n${saved.requestNumber || saved.requestId}\nสถานะ: ${saved.status}`);
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
      alert(`ส่งคำขอไม่สำเร็จ: ${error.message || error}`);
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

  const TAX_INVOICE_HISTORY_KEY = 'cms.invoiceRequest.taxInvoiceHistory';

  function normalizeUiText(value){
    return text(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').trim();
  }

  function thaiBahtTextLocal(value){
    const amount = Math.round((Number(value) || 0) * 100) / 100;
    const [baht, satang] = amount.toFixed(2).split('.');
    const digits = ['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'];
    const places = ['','สิบ','ร้อย','พัน','หมื่น','แสน','ล้าน'];
    function readNumber(raw){
      const n = String(parseInt(raw || '0', 10) || 0);
      if (n === '0') return 'ศูนย์';
      let out = '';
      for (let i = 0; i < n.length; i += 1) {
        const d = Number(n[i]);
        const pos = n.length - i - 1;
        if (!d) continue;
        if (pos === 1 && d === 1) out += 'สิบ';
        else if (pos === 1 && d === 2) out += 'ยี่สิบ';
        else if (pos === 0 && d === 1 && n.length > 1) out += 'เอ็ด';
        else out += digits[d] + places[pos];
      }
      return out;
    }
    const result = `${readNumber(baht)}บาท`;
    return satang === '00' ? `${result}ถ้วน` : `${result}${readNumber(satang)}สตางค์`;
  }

  function beginComposition(kind){
    if (state.composing && kind) state.composing[kind] = true;
  }

  function endComposition(kind, value){
    if (state.composing && kind) state.composing[kind] = false;
    if (kind === 'customer') searchCustomer(value);
    if (kind === 'product') searchProduct(value);
    if (kind === 'productName') productNameChanged(value);
  }

  function hideSuggestionBox(box){
    if (!box) return;
    box.innerHTML = '';
    box.dataset.rows = '[]';
    box.classList.remove('show');
  }

  function normalizedStatus(row){
    const status = text(row?.status).toLowerCase();
    const printStatus = text(row?.printStatus).toLowerCase();
    if (row?.printed === true || status === 'printed' || status === 'print_confirmed' || printStatus === 'printed' || printStatus === 'reprinted') return 'printed';
    if (status === 'partially_printed' || printStatus === 'partially_printed') return 'partially_printed';
    if (status === 'ready_to_print' || status === 'ready' || printStatus === 'ready_to_print' || row?.generationState === 'generated') return 'ready_to_print';
    if (status === 'processing' || status === 'not-started' || row?.generationState === 'not-started') return 'processing';
    if (status.includes('พิมพ์แล้ว') || status.includes('สั่งพิมพ์แล้ว')) return 'printed';
    if (status.includes('พร้อมพิมพ์')) return 'ready_to_print';
    return status || 'processing';
  }

  function readMobileHistory(){
    const rows = store.readJson(TAX_INVOICE_HISTORY_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function saveMobileHistory(row){
    if (!row) return row;
    const rows = readMobileHistory();
    const key = row.invoiceId || row.historyId || row.id || row.invoiceNumber;
    const next = [row, ...rows.filter(item => (item.invoiceId || item.historyId || item.id || item.invoiceNumber) !== key)].slice(0, 200);
    localStorage.setItem(TAX_INVOICE_HISTORY_KEY, JSON.stringify(next));
    return row;
  }

  function renderProductPanel(){
    return `<div class="cmsInvoicePanelV42"><h3 class="cmsInvoiceSectionTitleV42">สินค้า</h3>
      <div class="cmsInvoiceProductEntryRowV42">
        <div class="name cmsInvoiceSuggestWrapV42"><label>ชื่อสินค้า</label><input class="cmsInvoiceInputV42" id="cmsNewProductNameV42" oncompositionstart="CMSInvoiceRequest.beginComposition('productName')" oncompositionend="CMSInvoiceRequest.endComposition('productName', this.value)" oninput="CMSInvoiceRequest.productNameChanged(this.value)" onkeydown="CMSInvoiceRequest.productSearchKey(event)" placeholder="พิมพ์ชื่อสินค้า แล้วเลือกจากรายการ หรือพิมพ์สินค้าใหม่" autocomplete="off"><div class="cmsInvoiceSuggestV42" id="cmsProductSuggestV42"></div></div>
        <div><label>จำนวน</label><input class="cmsInvoiceInputV42" id="cmsNewProductQtyV42" inputmode="decimal" placeholder="0"></div>
        <div><label>หน่วย</label><input class="cmsInvoiceInputV42" id="cmsNewProductUnitV42" placeholder="หน่วย"></div>
        <div><label>ราคาขาย</label><input class="cmsInvoiceInputV42" id="cmsNewProductPriceV42" inputmode="decimal" placeholder="0.00"></div>
        <button class="cmsInvoiceAddProductV42" onclick="CMSInvoiceRequest.addNewProduct()">เพิ่ม</button>
      </div>
      <div id="cmsSimilarBoxV42"></div>
    </div>`;
  }

  function renderItems(){
    const rows = state.items.map((item, index) => {
      const errors = itemErrors(index);
      const line = summary.line(item, SETTINGS);
      const badges = [];
      if (item.isNewProduct) badges.push('สินค้าใหม่');
      if (item.source === 'live-product-master') badges.push('Product Master');
      return `<div class="cmsInvoiceItemCompactV42 ${Object.keys(errors).length ? 'invalid' : ''}" data-item-index="${index}">
        <div class="no">${index + 1}</div>
        <input class="product" value="${esc(item.productName)}" oninput="CMSInvoiceRequest.updateItem(${index}, 'productName', this.value)" placeholder="ชื่อสินค้า">
        <input class="qty" value="${esc(item.quantity ?? '')}" inputmode="decimal" oninput="CMSInvoiceRequest.updateItem(${index}, 'quantity', this.value)" onkeydown="CMSInvoiceRequest.quantityKey(event)" placeholder="จำนวน" data-qty-index="${index}">
        <input class="unit" value="${esc(item.unit)}" oninput="CMSInvoiceRequest.updateItem(${index}, 'unit', this.value)" placeholder="หน่วย">
        <input class="price" value="${esc(item.salePrice ?? '')}" inputmode="decimal" oninput="CMSInvoiceRequest.updateItem(${index}, 'salePrice', this.value)" placeholder="ราคา">
        <div class="total" data-line-total="${index}">${money(line.lineSubtotal)}</div>
        <div class="cmsInvoiceItemMenuWrapV42">
          <button class="menu" type="button" onclick="CMSInvoiceRequest.toggleItemMenu(${index}, event)" aria-label="เมนูรายการ">...</button>
          <div class="cmsInvoiceItemMenuV42" id="cmsInvoiceItemMenuV42-${index}">
            <button type="button" onclick="CMSInvoiceRequest.focusItem(${index});CMSInvoiceRequest.closeItemMenus()">แก้ไข</button>
            <button type="button" class="danger" onclick="CMSInvoiceRequest.removeItem(${index})">ลบ</button>
            <button type="button" onclick="CMSInvoiceRequest.closeItemMenus()">X ปิด</button>
          </div>
        </div>
        <div class="meta">${esc(item.productCode || '-')} ${badges.map(w => `<span class="cmsInvoiceBadgeV42 ${item.isNewProduct ? 'test' : ''}">${esc(w)}</span>`).join('')}</div>
        ${Object.values(errors).map(error => `<div class="cmsInvoiceErrorV42">${esc(error)}</div>`).join('')}
      </div>`;
    }).join('');
    const total = totals();
    return `<div class="cmsInvoicePanelV42"><h3 class="cmsInvoiceSectionTitleV42">รายการที่เลือก</h3>
      <div class="cmsInvoiceSummaryV42">
        <div><small>จำนวนรายการ</small><b>${state.items.length}</b></div>
        <div><small>คาดว่าแบ่ง</small><b>${total.expectedInvoiceCount} ใบ</b></div>
        <div><small>ก่อน VAT</small><b>${money(total.subtotal)}</b></div>
        <div><small>VAT 7%</small><b>${money(total.vatAmount)}</b></div>
        <div><small>ยอดรวม</small><b>${money(total.grandTotal)}</b></div>
      </div>
      <div class="cmsInvoiceItemsV42 compact">${rows || '<div class="empty">ยังไม่มีรายการสินค้า</div>'}</div>
    </div>`;
  }

  function refreshSummaryDom(){
    const cards = document.querySelectorAll('.cmsInvoiceSummaryV42 b');
    const total = totals();
    if (cards[0]) cards[0].textContent = state.items.length;
    if (cards[1]) cards[1].textContent = `${total.expectedInvoiceCount} ใบ`;
    if (cards[2]) cards[2].textContent = money(total.subtotal);
    if (cards[3]) cards[3].textContent = money(total.vatAmount);
    if (cards[4]) cards[4].textContent = money(total.grandTotal);
  }

  function updateItem(index, field, value){
    if (!state.items[index]) return;
    state.items[index][field] = value;
    state.validation = null;
    const line = summary.line(state.items[index], SETTINGS);
    const lineTotal = document.querySelector(`[data-line-total="${index}"]`);
    if (lineTotal) lineTotal.textContent = money(line.lineSubtotal);
    refreshSummaryDom();
  }

  function focusItem(index){
    document.querySelector(`[data-item-index="${index}"] input`)?.focus();
  }

  function closeItemMenus(){
    document.querySelectorAll('.cmsInvoiceItemMenuV42.show').forEach(menu => menu.classList.remove('show'));
  }

  function toggleItemMenu(index, event){
    if (event) event.stopPropagation();
    const menu = document.getElementById(`cmsInvoiceItemMenuV42-${index}`);
    const willShow = menu && !menu.classList.contains('show');
    closeItemMenus();
    if (menu && willShow) menu.classList.add('show');
  }

  function productNameChanged(value){
    if (state.composing?.productName) return;
    if (!state.selectedProduct || normalizeUiText(value) !== normalizeUiText(state.selectedProduct.productName)) {
      state.selectedProduct = null;
    }
    searchProduct(value);
    showSimilar(value);
  }

  function fillProductEntry(product){
    state.selectedProduct = product || null;
    const name = document.getElementById('cmsNewProductNameV42');
    const unit = document.getElementById('cmsNewProductUnitV42');
    const price = document.getElementById('cmsNewProductPriceV42');
    const qty = document.getElementById('cmsNewProductQtyV42');
    if (name) name.value = product?.productName || '';
    if (unit) unit.value = product?.unit || '';
    if (price) price.value = product?.salePrice == null ? '' : product.salePrice;
    if (qty) {
      qty.value = '';
      setTimeout(() => qty.focus(), 20);
    }
  }

  function clearProductEntry(){
    state.selectedProduct = null;
    ['cmsNewProductNameV42', 'cmsNewProductQtyV42', 'cmsNewProductUnitV42', 'cmsNewProductPriceV42'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    hideSuggestionBox(document.getElementById('cmsProductSuggestV42'));
    const similar = document.getElementById('cmsSimilarBoxV42');
    if (similar) similar.innerHTML = '';
  }

  function searchCustomer(query){
    const box = document.getElementById('cmsCustomerSuggestV42');
    if (!box) return;
    if (state.composing?.customer) return;
    if (!normalizeUiText(query)) {
      clearTimeout(state.customerSearchTimer);
      hideSuggestionBox(box);
      return;
    }
    const token = ++state.customerSearchToken;
    clearTimeout(state.customerSearchTimer);
    state.customerSearchTimer = setTimeout(() => {
      if (token !== state.customerSearchToken) return;
      const rows = customerSearch.searchCustomers(query, 20);
      box.innerHTML = rows.length ? rows.map((customer, index) => `<button type="button" onmousedown="CMSInvoiceRequest.selectCustomer(${index})"><b>${esc(customerSearch.fullName(customer) || customer.customerName)}</b><small>${esc(customerSearch.shortMeta(customer))}</small></button>`).join('') : '<button type="button"><b>ไม่พบลูกค้า</b><small>ค้นจากฐาน Customer Master กลางเท่านั้น</small></button>';
      box.dataset.rows = JSON.stringify(rows);
      box.classList.toggle('show', !!normalizeUiText(query));
    }, 160);
  }

  function searchProduct(query){
    const box = document.getElementById('cmsProductSuggestV42');
    if (!box) return;
    if (state.composing?.product) return;
    if (!normalizeUiText(query)) {
      clearTimeout(state.productSearchTimer);
      hideSuggestionBox(box);
      return;
    }
    const token = ++state.productSearchToken;
    clearTimeout(state.productSearchTimer);
    state.productSearchTimer = setTimeout(() => {
      if (token !== state.productSearchToken) return;
      const rows = productSearch.searchProducts(query, 24);
      box.innerHTML = rows.length ? rows.map((product, index) => {
        return `<button type="button" onmousedown="CMSInvoiceRequest.addExistingProduct(${index})"><b>${esc(product.productName)}</b><small>${esc(product.productCode || '-')} | หน่วย ${esc(product.unit || '-')} | ราคาขาย ${product.salePrice == null ? '-' : money(product.salePrice)}</small></button>`;
      }).join('') : '<button type="button"><b>ไม่พบสินค้าเดิม</b><small>พิมพ์ชื่อในแถวเพิ่มสินค้าเพื่อสร้าง Product Master ใหม่</small></button>';
      box.dataset.rows = JSON.stringify(rows);
      box.classList.toggle('show', !!normalizeUiText(query));
    }, 160);
  }

  function addExistingProduct(index){
    const box = document.getElementById('cmsProductSuggestV42');
    const rows = JSON.parse(box?.dataset.rows || '[]');
    const product = rows[index];
    if (!product) return;
    if (box) box.classList.remove('show');
    fillProductEntry(product);
  }

  async function addNewProduct(){
    const name = document.getElementById('cmsNewProductNameV42')?.value || '';
    const unit = document.getElementById('cmsNewProductUnitV42')?.value || '';
    const salePrice = document.getElementById('cmsNewProductPriceV42')?.value || '';
    const quantity = document.getElementById('cmsNewProductQtyV42')?.value || '';
    const selected = state.selectedProduct && normalizeUiText(name) === normalizeUiText(state.selectedProduct.productName) ? state.selectedProduct : null;
    const item = {
      productId: selected?.productId || '',
      productCode: selected?.productCode || '',
      productName: selected?.productName || name,
      unit: unit || selected?.unit || '',
      salePrice: salePrice || selected?.salePrice || '',
      quantity,
      source: selected ? (selected.source || 'existing-product') : 'new-product',
      isNewProduct: !selected
    };
    const result = validation.validateItem(item);
    if (!result.valid) {
      alert(Object.values(result.errors)[0]);
      return;
    }
    let product = selected;
    if (!product) {
      const similar = productSearch.similarProducts(name, 1)[0];
      if (similar && confirm(`พบสินค้าใกล้เคียง: ${similar.productName}\nใช่สินค้าเดียวกันหรือไม่?`)) {
        product = similar;
        item.productId = similar.productId;
        item.productCode = similar.productCode;
        item.productName = similar.productName;
        item.unit = unit || similar.unit;
        item.salePrice = salePrice || similar.salePrice;
        item.source = similar.source || 'existing-product-fuzzy';
        item.isNewProduct = false;
      } else {
        const actor = { uid: sender().requestedByUid, by: sender().requestedByNickname, nickname: sender().requestedByNickname, branch: sender().requestedBranch };
        const payload = { productName: name, name, unit, salePrice, price: salePrice, createdFrom: 'invoice-request', costPrice: null };
        product = window.ChokAnanProductMaster && typeof window.ChokAnanProductMaster.createProductAsync === 'function'
          ? await window.ChokAnanProductMaster.createProductAsync(payload, actor)
          : (window.ChokAnanProductMaster && typeof window.ChokAnanProductMaster.createProduct === 'function'
            ? window.ChokAnanProductMaster.createProduct(payload, actor)
            : null);
        item.productId = product?.productId || product?.id || newId('product-missing-master');
        item.productCode = product?.productCode || product?.code || '';
        item.productName = product?.productName || name;
        item.source = product ? 'live-product-master-new' : 'new-product-local-fallback';
      }
    }
    state.items.push({
      requestItemId: newId('req-item'),
      ...item,
      addedByUid: sender().requestedByUid,
      addedBy: sender().requestedByNickname,
      addedAt: nowIso()
    });
    state.validation = null;
    clearProductEntry();
    renderForm();
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

  function requestIsReady(row){
    return normalizedStatus(row) === 'ready_to_print';
  }

  function requestIsPrinted(row){
    const status = normalizedStatus(row);
    return status === 'printed' || status === 'partially_printed';
  }

  function statusClass(row){
    const status = normalizedStatus(row);
    if (status === 'printed') return 'printed';
    if (status === 'partially_printed') return 'partial';
    if (status === 'ready_to_print') return 'ready';
    return '';
  }

  function statusText(row){
    const status = normalizedStatus(row);
    if (status === 'printed') return 'พิมพ์แล้ว';
    if (status === 'partially_printed') return 'พิมพ์บางส่วน';
    if (requestIsReady(row)) return 'พร้อมพิมพ์';
    return text(row?.status) || 'กำลังดำเนินการ';
  }

  function saveRequestSnapshotFromDoc(doc){
    const row = { ...(doc.data ? doc.data() : doc), requestId: doc.id || doc.requestId };
    store.saveProductionRequest(row);
    return row;
  }

  function bindRealtime(){
    if (state.realtimeBound || !sync.firestoreReady()) return;
    const uid = sender().requestedByUid;
    if (!uid || !window.db) return;
    state.realtimeBound = true;
    const rerender = () => {
      const active = document.querySelector('#cmsInvoiceRequestStatusPageV42.active, #cmsInvoiceRequestHistoryPageV42.active');
      if (!active) return;
      if (active.id === 'cmsInvoiceRequestStatusPageV42') renderStatus();
      if (active.id === 'cmsInvoiceRequestHistoryPageV42') renderHistory();
    };
    state.realtimeUnsubs.push(window.db.collection('invoiceRequests').where('requestedByUid', '==', uid).onSnapshot(snapshot => {
      snapshot.forEach(saveRequestSnapshotFromDoc);
      rerender();
    }, error => console.warn('[invoice-request] request listener failed', error)));
    state.realtimeUnsubs.push(window.db.collection('taxInvoiceHistory').where('requestedByUid', '==', uid).onSnapshot(snapshot => {
      snapshot.forEach(doc => saveMobileHistory({ ...(doc.data() || {}), historyId: doc.id }));
      rerender();
    }, error => console.warn('[invoice-request] history listener failed', error)));
  }

  function renderStatus(){
    ensurePages();
    bindRealtime();
    const rows = isTestMode() ? store.listRequests() : store.listProductionRequests();
    document.getElementById('cmsInvoiceRequestStatusPageV42').innerHTML = [
      header('สถานะใบกำกับภาษี', isTestMode() ? 'Test Mode' : 'อัปเดตจากฐานข้อมูลกลางแบบ realtime'),
      '<div class="cmsInvoiceListV42">',
      rows.length ? rows.map(row => statusRowHtml(row)).join('') : '<div class="empty">ยังไม่มีคำขอในเครื่องนี้</div>',
      '</div>'
    ].join('');
  }

  function statusRowHtml(row){
    const generated = Array.isArray(row.generatedInvoiceNumbers) && row.generatedInvoiceNumbers.length
      ? `<br>เลขที่ใบกำกับ: ${row.generatedInvoiceNumbers.map(esc).join(', ')}`
      : '';
    const preview = (requestIsReady(row) || requestIsPrinted(row)) && Array.isArray(row.generatedInvoiceIds) && row.generatedInvoiceIds.length
      ? `<button class="cmsInvoicePreviewButtonV42" style="width:100%;margin-top:10px" onclick="CMSInvoiceRequest.openPreview('${esc(row.requestId)}')">ดูตัวอย่างใบกำกับภาษี</button>`
      : '';
    const action = canGenerateInvoice(row)
      ? `<button class="cmsInvoiceSecondaryV42" style="width:100%;margin-top:10px" onclick="CMSInvoiceRequest.generateInvoice('${esc(row.requestId)}')">สร้างใบกำกับ</button>`
      : '';
    return `<div class="cmsInvoiceListRowV42"><b>${esc(row.requestNumber || row.requestId)}</b><span class="cmsInvoiceListMetaV42">ลูกค้า: ${esc(row.customerDisplayName || row.customerSnapshot?.customerName || '-')}<br>เวลา: ${esc(row.requestedAt || row.sender?.requestedAt || '-')}<br>รายการ: ${row.itemCount || 0} | คาดว่า ${row.expectedInvoiceCount || 0} ใบ | ยอด ${money(row.grandTotal || row.subtotalPreview)}<br>สถานะ: <strong class="cmsInvoiceStatusTextV42 ${statusClass(row)}">${esc(statusText(row))}</strong>${generated}</span>${preview}${action}</div>`;
  }

  function renderHistory(){
    ensurePages();
    bindRealtime();
    const rows = readMobileHistory();
    document.getElementById('cmsInvoiceRequestHistoryPageV42').innerHTML = [
      header('ประวัติใบกำกับภาษี', 'อ่านจาก taxInvoiceHistory ฐานกลาง'),
      '<div class="cmsInvoiceListV42">',
      rows.length ? rows.map(row => `<div class="cmsInvoiceListRowV42"><b>${esc(row.invoiceNumber || row.no || row.historyId || '-')}</b><span class="cmsInvoiceListMetaV42">ลูกค้า: ${esc(row.customerSnapshot?.customerName || row.buyerName || '-')}<br>ยอดรวม: ${money(row.grandTotal || row.total)}<br>สถานะ: <strong class="cmsInvoiceStatusTextV42 ${row.printed ? 'printed' : 'ready'}">${row.printed ? 'พิมพ์แล้ว' : 'พร้อมพิมพ์'}</strong></span></div>`).join('') : '<div class="empty">ยังไม่มีประวัติใบกำกับภาษีจากฐานกลาง</div>',
      '</div>'
    ].join('');
  }

  function openStatus(){ renderStatus(); showPage('cmsInvoiceRequestStatusPageV42'); }
  function openHistory(){ renderHistory(); showPage('cmsInvoiceRequestHistoryPageV42'); }

  async function fetchPreviewInvoices(row){
    if (!row || !sync.firestoreReady() || !window.db) return [];
    const ids = Array.isArray(row.generatedInvoiceIds) ? row.generatedInvoiceIds.filter(Boolean) : [];
    if (ids.length) {
      const snaps = await Promise.all(ids.map(id => window.db.collection('taxInvoices').doc(id).get()));
      return snaps.filter(snap => snap.exists).map(snap => ({ ...(snap.data() || {}), invoiceId: snap.id }));
    }
    const uid = sender().requestedByUid;
    const snap = await window.db.collection('taxInvoices').where('requestedByUid', '==', uid).where('sourceRequestId', '==', row.requestId).get();
    return snap.docs.map(doc => ({ ...(doc.data() || {}), invoiceId: doc.id }));
  }

  function previewAddressParts(invoice, customer){
    const raw = invoice.buyerAddress || [customer.address1, customer.address2].filter(Boolean).join('\n') || customer.address || '';
    if (window.ChokAnanInvoicePreviewService && typeof window.ChokAnanInvoicePreviewService.splitAddressForInvoice === 'function') {
      const parts = window.ChokAnanInvoicePreviewService.splitAddressForInvoice(invoice.buyerAddress1 || customer.address1 || raw, invoice.buyerAddress2 || customer.address2 || '');
      return [parts.address1, parts.address2].filter(Boolean);
    }
    return String(raw || '-').split('\n').map(item => item.trim()).filter(Boolean);
  }

  function previewInvoiceHtml(invoice, index, totalCount){
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const settings = store.readJson('settings', {});
    const shopName = invoice.shopName || settings.shopName || 'โชคอนันต์ ฮาร์ดแวร์ (สำนักงานใหญ่)';
    const shopAddress = invoice.shopAddress || settings.shopAddress || '';
    const shopTax = invoice.shopTax || settings.shopTax || '';
    const invoiceDate = invoice.invoiceDate || invoice.date || invoice.requestedAt || new Date().toISOString().slice(0, 10);
    const invoiceNo = invoice.invoiceNumber || invoice.no || invoice.invoiceId || '-';
    const customer = invoice.customerSnapshot || {};
    const buyerName = invoice.customerName || invoice.buyerName || customer.customerName || customer.name || '-';
    const buyerTax = invoice.customerTaxId || invoice.buyerTax || customer.taxId || '-';
    const buyerAddressLines = previewAddressParts(invoice, customer);
    const beforeVat = +invoice.beforeVat || +invoice.subtotal || 0;
    const vatAmount = +invoice.vatAmount || +invoice.vat || 0;
    const grandTotal = +invoice.grandTotal || +invoice.total || beforeVat + vatAmount;
    const creditDays = invoice.creditDays ?? invoice.paymentCreditDays ?? customer.creditDays ?? 0;
    const totalText = typeof window.thaiBahtText === 'function' ? window.thaiBahtText(grandTotal) : thaiBahtTextLocal(grandTotal);
    const pageLabel = totalCount > 1 ? `<div class="cmsInvoicePreviewPageLabelV42">ใบที่ ${index + 1}</div>` : '';
    return `<article class="cmsInvoicePreviewSheetV42">
      ${pageLabel}
      <section class="cmsInvoicePreviewPaperV42" aria-label="ตัวอย่างใบกำกับภาษี ${esc(invoiceNo)}">
        <div class="cmsInvoicePreviewShopV42">
          <b>${esc(shopName)}</b>
          <span>${esc(shopAddress || '-')}</span>
          ${shopTax ? `<span>เลขผู้เสียภาษี ${esc(shopTax)}</span>` : ''}
        </div>
        <div class="cmsInvoicePreviewRightMetaV42">
          <span>${esc(String(invoiceDate).slice(0, 10))}</span>
          <b>${esc(invoiceNo)}</b>
        </div>
        <div class="cmsInvoicePreviewBuyerTaxV42">${esc(buyerTax)}</div>
        <div class="cmsInvoicePreviewBuyerV42">
          <b>${esc(buyerName)}</b>
          ${buyerAddressLines.length ? buyerAddressLines.map(line => `<span>${esc(line)}</span>`).join('') : '<span>-</span>'}
          <span>${esc(buyerTax)}</span>
        </div>
        <div class="cmsInvoicePreviewDueV42">
          <span>${esc(String(invoiceDate).slice(0, 10))}</span>
          <b>เครดิต ${esc(creditDays || 0)} วัน</b>
        </div>
        <div class="cmsInvoicePreviewTableV42">
          ${items.map((item, itemIndex) => {
            const qty = item.quantity ?? item.qty ?? '';
            const price = +(item.salePrice ?? item.price ?? 0);
            const lineTotal = +(item.lineSubtotal ?? item.total ?? ((+qty || 0) * price));
            return `<div class="seq">${itemIndex + 1}</div><div>${esc(item.productName || item.name || '-')}</div><div class="num">${esc(qty)}</div><div>${esc(item.unit || '')}</div><div class="num">${money(price)}</div><div class="num">${money(lineTotal)}</div>`;
          }).join('')}
        </div>
        <div class="cmsInvoicePreviewWordsV42">${esc(totalText)}</div>
        <div class="cmsInvoicePreviewTotalsV42">
          <span>${money(beforeVat)}</span>
          <span><small>7 %</small>${money(vatAmount)}</span>
          <b>${money(grandTotal)}</b>
        </div>
      </section>
    </article>`;
  }

  async function openPreview(requestId){
    const row = store.listProductionRequests().find(item => item.requestId === requestId);
    if (!requestIsReady(row) && !requestIsPrinted(row)) return alert('เปิด Preview ได้เฉพาะสถานะพร้อมพิมพ์หรือพิมพ์แล้ว');
    try {
      const invoices = await fetchPreviewInvoices(row);
      const payload = window.ChokAnanInvoicePreviewService && typeof window.ChokAnanInvoicePreviewService.requestPreviewPayload === 'function'
        ? window.ChokAnanInvoicePreviewService.requestPreviewPayload(row, invoices)
        : { invoices };
      const modal = document.getElementById('cmsInvoicePreviewModalV42') || document.createElement('div');
      modal.id = 'cmsInvoicePreviewModalV42';
      modal.className = 'cmsInvoicePreviewModalV42';
      modal.innerHTML = `<button class="cmsInvoicePreviewCloseV42" onclick="CMSInvoiceRequest.closePreview()" aria-label="ปิด">X</button><div class="cmsInvoicePreviewScrollV42">${payload.invoices.length ? payload.invoices.map((invoice, index) => previewInvoiceHtml(invoice, index, payload.invoices.length)).join('') : '<div class="cmsInvoicePreviewEmptyV42">ยังไม่พบข้อมูลใบกำกับสำหรับ Preview</div>'}</div>`;
      if (!modal.parentElement) document.body.appendChild(modal);
      document.documentElement.classList.add('cmsInvoicePreviewOpenV42');
    } catch (error) {
      alert(`เปิด Preview ไม่สำเร็จ: ${error.message || error}`);
    }
  }

  function closePreview(){
    document.getElementById('cmsInvoicePreviewModalV42')?.remove();
    document.documentElement.classList.remove('cmsInvoicePreviewOpenV42');
  }

  async function confirmRequest(){
    state.note = document.getElementById('cmsInvoiceNoteV42')?.value || state.note;
    state.validation = validation.validateRequest({ customer: state.customer, items: state.items });
    if (!state.validation.valid) {
      renderForm();
      const first = state.validation.firstInvalidIndex >= 0 ? document.querySelector(`[data-item-index="${state.validation.firstInvalidIndex}"]`) : document.getElementById('cmsCustomerSearchV42');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      alert(state.validation.errors[0]?.message || 'กรุณาตรวจรายการสินค้าให้ครบ');
      return;
    }
    if (state.confirmLocked) return;
    const total = totals();
    if (!confirm(`ยืนยันส่งคำขอออกใบกำกับภาษี?\nรายการ ${state.items.length} รายการ\nคาดว่า ${total.expectedInvoiceCount} ใบ\nก่อน VAT ${money(total.subtotal)}\nVAT ${money(total.vatAmount)}\nยอดรวม ${money(total.grandTotal)}`)) return;
    state.confirmLocked = true;
    try {
      if (isTestMode()) {
        const row = requestSnapshot({ requestId: testRequestId(), requestNumber: testRequestId(), createdAt: nowIso() });
        store.saveRequest(row);
        alert(`สร้าง Test Request แล้ว\n${row.requestNumber}\nสถานะ: กำลังดำเนินการ`);
      } else {
        const row = requestSnapshot({ idempotencyKey: ensureIdempotencyKey(), createdAt: nowIso() });
        const result = await sync.submit(row);
        const saved = result.request;
        bindRealtime();
        alert(`${result.offline ? 'บันทึกคำขอไว้รอซิงก์ Firebase แล้ว' : 'ส่งคำขอเข้าฐานกลางแล้ว'}\n${saved.requestNumber || saved.requestId}\nสถานะ: ${saved.status}`);
      }
      if (state.draftId) {
        if (isTestMode()) store.deleteDraft(state.draftId);
        else store.deleteProductionDraft(state.draftId);
      }
      state.items = [];
      state.customer = null;
      state.selectedProduct = null;
      state.note = '';
      state.draftId = '';
      state.validation = null;
      state.idempotencyKey = '';
      openStatus();
    } catch (error) {
      alert(`ส่งคำขอไม่สำเร็จ: ${error.message || error}`);
    } finally {
      state.confirmLocked = false;
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
    beginComposition,
    endComposition,
    searchCustomer,
    selectCustomer,
    searchProduct,
    productSearchKey,
    addExistingProduct,
    productNameChanged,
    showSimilar,
    addNewProduct,
    updateItem,
    focusItem,
    closeItemMenus,
    toggleItemMenu,
    quantityKey,
    removeItem,
    setNote,
    saveDraft,
    deleteDraft,
    confirmRequest,
    generateInvoice,
    openPreview,
    closePreview,
    expectedInvoiceCount: () => expectedInvoiceCount(),
    requestSnapshot,
    testState: state
  };

  window.addEventListener('chokanan-customer-master-updated', refreshCustomerSuggestions);
  document.addEventListener('click', event => {
    if (!event.target?.closest?.('.cmsInvoiceItemMenuWrapV42')) closeItemMenus();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
