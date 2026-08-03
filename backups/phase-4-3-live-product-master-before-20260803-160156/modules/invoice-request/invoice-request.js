(function(){
  'use strict';

  const store = window.CMSInvoiceRequestStore;
  const customerSearch = window.CMSInvoiceCustomerSearch;
  const productSearch = window.CMSInvoiceProductSearch;
  const validation = window.CMSInvoiceRequestValidation;
  const SETTINGS = Object.freeze({
    invoiceType: 'full-tax-invoice',
    paperSize: '9x11',
    vatMode: 'exclusive',
    vatRate: 7,
    itemsPerInvoice: 10
  });

  const state = {
    page: 'landing',
    customer: null,
    items: [],
    note: '',
    draftId: '',
    validation: null,
    confirmLocked: false
  };

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function money(value){
    const number = Number(value || 0);
    return number.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function nowParts(){
    const now = new Date();
    return {
      iso: now.toISOString(),
      date: now.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }),
      time: now.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })
    };
  }

  function sender(){
    const nickname = validation.text(window.nickname || localStorage.getItem('stockAlertNickname') || 'ไม่ระบุ');
    const branch = window.StockAlertDeviceBranch && window.StockAlertDeviceBranch.get ? window.StockAlertDeviceBranch.get() : (window.currentDeviceBranch || 1);
    return {
      userId: validation.text(localStorage.getItem('stockAlertUserId') || ''),
      requestedBy: nickname,
      nickname,
      branch: `สาขา ${branch || 1}`,
      requestedAt: nowParts().iso
    };
  }

  function subtotal(){
    return state.items.reduce((sum, item) => sum + validation.lineTotal(item), 0);
  }

  function expectedInvoiceCount(){
    return Math.max(1, Math.ceil(state.items.length / SETTINGS.itemsPerInvoice));
  }

  function tempId(){
    if (window.crypto && window.crypto.randomUUID) return `tmp-${window.crypto.randomUUID()}`;
    return `tmp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function requestId(){
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const seq = String(store.listRequests().length + 1).padStart(4, '0');
    return `TEST-REQ-${date}-${seq}`;
  }

  function invoiceBanner(){
    return '<div class="cmsInvoiceBannerV42">โหมดทดสอบ: ยังไม่ส่งข้อมูลไปสร้างใบกำกับภาษีจริง</div>';
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
    button.innerHTML = '<span class="cmsInvoiceIconV42">ภ</span><span><b>สั่งทำใบกำกับภาษี</b><span>ส่งรายการให้ระบบสร้างใบกำกับภาษีอัตโนมัติ</span></span><span class="cmsInvoiceArrowV42">›</span>';
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
    return `<div class="pageHeader"><button class="back" onclick="${back || 'CMSInvoiceRequest.openLanding()'}">‹</button><div><h2 style="margin:0">${esc(title)}</h2><div class="smallTitle">${esc(sub)}</div></div></div>${invoiceBanner()}`;
  }

  function renderLanding(){
    ensurePages();
    const page = document.getElementById('cmsInvoiceRequestPageV42');
    page.innerHTML = [
      header('ใบกำกับภาษี', 'คำขอสำหรับพนักงาน - Test Mode', 'CMSInvoiceRequest.backHome()'),
      '<div class="cmsInvoiceMenuV42">',
      '<button class="cmsInvoiceMenuButtonV42" onclick="CMSInvoiceRequest.openForm()"><i>1</i><span><b>สั่งทำใบกำกับภาษี</b><span>เลือกบริษัทลูกค้า เพิ่มสินค้า และสร้างคำขอทดสอบ</span></span><b>›</b></button>',
      '<button class="cmsInvoiceMenuButtonV42" onclick="CMSInvoiceRequest.openStatus()"><i>2</i><span><b>สถานะใบกำกับภาษี</b><span>ดู Test Requests ที่สร้างในเครื่องนี้แบบอ่านอย่างเดียว</span></span><b>›</b></button>',
      '<button class="cmsInvoiceMenuButtonV42" onclick="CMSInvoiceRequest.openHistory()"><i>3</i><span><b>ประวัติใบกำกับภาษี</b><span>Placeholder แบบอ่านอย่างเดียว ยังไม่ใช่ประวัติจริง</span></span><b>›</b></button>',
      '</div>'
    ].join('');
  }

  function renderSenderPanel(){
    const s = sender();
    const now = nowParts();
    return `<div class="cmsInvoicePanelV42"><h3 class="cmsInvoiceSectionTitleV42">ผู้ส่งคำขอ</h3><div class="cmsInvoiceGridV42 two">
      <div><label>ชื่อผู้ส่งคำขอ</label><div class="cmsInvoiceReadOnlyV42">${esc(s.requestedBy)}</div></div>
      <div><label>ชื่อเล่น</label><div class="cmsInvoiceReadOnlyV42">${esc(s.nickname)}</div></div>
      <div><label>สาขา</label><div class="cmsInvoiceReadOnlyV42">${esc(s.branch)}</div></div>
      <div><label>userId</label><div class="cmsInvoiceReadOnlyV42">${esc(s.userId || '-')}</div></div>
      <div><label>วันที่</label><div class="cmsInvoiceReadOnlyV42">${esc(now.date)}</div></div>
      <div><label>เวลา</label><div class="cmsInvoiceReadOnlyV42">${esc(now.time)}</div></div>
    </div></div>`;
  }

  function renderCustomerPanel(){
    const c = state.customer;
    return `<div class="cmsInvoicePanelV42"><h3 class="cmsInvoiceSectionTitleV42">ลูกค้า</h3>
      <div class="cmsInvoiceSuggestWrapV42"><label>ค้นหา/เลือกลูกค้า</label><input class="cmsInvoiceInputV42" id="cmsCustomerSearchV42" placeholder="ค้นจากรหัส ชื่อ เลขภาษี หรือที่อยู่" oninput="CMSInvoiceRequest.searchCustomer(this.value)" autocomplete="off"><div class="cmsInvoiceSuggestV42" id="cmsCustomerSuggestV42"></div></div>
      <div class="cmsInvoiceGridV42 two" style="margin-top:10px">
        <div><label>customerCode</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.customerCode || '-')}</div></div>
        <div><label>prefix</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.prefix || '-')}</div></div>
        <div><label>customerName</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.customerName || '-')}</div></div>
        <div><label>taxId</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.taxId || '-')}</div></div>
        <div><label>phone</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.phone || '-')}</div></div>
        <div><label>headOffice/branch</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.branch || '-')}</div></div>
        <div><label>address1</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.address1 || '-')}</div></div>
        <div><label>address2</label><div class="cmsInvoiceReadOnlyV42">${esc(c?.address2 || '-')}</div></div>
      </div>
    </div>`;
  }

  function renderProductPanel(){
    return `<div class="cmsInvoicePanelV42"><h3 class="cmsInvoiceSectionTitleV42">สินค้า</h3>
      <div class="cmsInvoiceSuggestWrapV42"><label>ค้นหาสินค้าเดิม</label><input class="cmsInvoiceInputV42" id="cmsProductSearchV42" placeholder="ค้นจากชื่อ รหัส หน่วย ตัวเลข หรือคำใกล้เคียง" oninput="CMSInvoiceRequest.searchProduct(this.value)" onkeydown="CMSInvoiceRequest.productSearchKey(event)" autocomplete="off"><div class="cmsInvoiceSuggestV42" id="cmsProductSuggestV42"></div></div>
      <div class="cmsInvoicePanelV42" style="box-shadow:none;margin:10px 0 0;background:#f8fbff"><h3 class="cmsInvoiceSectionTitleV42">เพิ่มเป็นสินค้าใหม่</h3>
        <div id="cmsSimilarBoxV42"></div>
        <div class="cmsInvoiceGridV42 two">
          <div><label>ชื่อสินค้า</label><input class="cmsInvoiceInputV42" id="cmsNewProductNameV42" oninput="CMSInvoiceRequest.showSimilar(this.value)" placeholder="ชื่อสินค้าใหม่"></div>
          <div><label>หน่วย</label><input class="cmsInvoiceInputV42" id="cmsNewProductUnitV42" placeholder="หน่วย"></div>
          <div><label>ราคาขาย</label><input class="cmsInvoiceInputV42" id="cmsNewProductPriceV42" inputmode="decimal" placeholder="ราคาขาย"></div>
          <div><label>จำนวน</label><input class="cmsInvoiceInputV42" id="cmsNewProductQtyV42" inputmode="decimal" placeholder="จำนวน"></div>
        </div>
        <button class="cmsInvoiceSecondaryV42" style="width:100%;margin-top:10px" onclick="CMSInvoiceRequest.addNewProduct()">เพิ่มเป็นสินค้าใหม่</button>
      </div>
    </div>`;
  }

  function itemErrors(index){
    return state.validation?.itemResults?.[index]?.errors || {};
  }

  function renderItems(){
    const rows = state.items.map((item, index) => {
      const errors = itemErrors(index);
      const hasError = Object.keys(errors).length > 0;
      const warnings = [];
      if (!validation.text(item.unit)) warnings.push('ไม่มีหน่วย');
      if (item.salePrice == null || item.salePrice === '') warnings.push('ไม่มีราคาขาย');
      if (item.isNewProduct) warnings.push('สินค้าใหม่ - โหมดทดสอบ');
      return `<div class="cmsInvoiceItemCardV42 ${hasError ? 'invalid' : ''}" data-item-index="${index}">
        <div class="cmsInvoiceItemTopV42"><span class="cmsInvoiceItemNoV42">${index + 1}</span><div><strong>${esc(item.productName)}</strong><div>${warnings.map(w => `<span class="cmsInvoiceBadgeV42 ${item.isNewProduct ? 'test' : 'warn'}">${esc(w)}</span>`).join('')}</div></div><button class="cmsInvoiceRemoveV42" onclick="CMSInvoiceRequest.removeItem(${index})">ลบ</button></div>
        <div class="cmsInvoiceItemFieldsV42">
          ${item.isNewProduct ? `<input value="${esc(item.productName)}" oninput="CMSInvoiceRequest.updateItem(${index}, 'productName', this.value)" placeholder="ชื่อสินค้า">` : `<div class="cmsInvoiceReadOnlyV42">${esc(item.productCode || '-')}</div>`}
          <input value="${esc(item.unit)}" oninput="CMSInvoiceRequest.updateItem(${index}, 'unit', this.value)" placeholder="หน่วย">
          <input value="${esc(item.salePrice ?? '')}" inputmode="decimal" oninput="CMSInvoiceRequest.updateItem(${index}, 'salePrice', this.value)" placeholder="ราคาขาย">
          <input value="${esc(item.quantity ?? '')}" inputmode="decimal" oninput="CMSInvoiceRequest.updateItem(${index}, 'quantity', this.value)" onkeydown="CMSInvoiceRequest.quantityKey(event, ${index})" placeholder="จำนวน" data-qty-index="${index}">
          <div class="cmsInvoiceReadOnlyV42">${money(validation.lineTotal(item))}</div>
        </div>
        ${Object.values(errors).map(error => `<div class="cmsInvoiceErrorV42">${esc(error)}</div>`).join('')}
      </div>`;
    }).join('');
    return `<div class="cmsInvoicePanelV42"><h3 class="cmsInvoiceSectionTitleV42">รายการที่เลือก</h3>
      <div class="cmsInvoiceSummaryV42"><div><small>จำนวนรายการ</small><b>${state.items.length}</b></div><div><small>คาดว่าจะถูกแบ่ง</small><b>${expectedInvoiceCount()} ใบ</b></div><div><small>ยอดรวมเบื้องต้น</small><b>${money(subtotal())}</b></div></div>
      <div class="cmsInvoiceItemsV42 desktopTable">${rows || '<div class="empty">ยังไม่มีรายการสินค้า</div>'}</div>
    </div>`;
  }

  function renderForm(){
    ensurePages();
    const page = document.getElementById('cmsInvoiceRequestFormPageV42');
    page.innerHTML = [
      header('สั่งทำใบกำกับภาษี', 'Test Mode - ยังไม่สร้างใบจริง'),
      renderSenderPanel(),
      renderCustomerPanel(),
      renderProductPanel(),
      renderItems(),
      `<div class="cmsInvoicePanelV42"><label>หมายเหตุ</label><textarea id="cmsInvoiceNoteV42" oninput="CMSInvoiceRequest.setNote(this.value)" placeholder="หมายเหตุเพิ่มเติม">${esc(state.note)}</textarea>
        <div class="cmsInvoiceGridV42 three" style="margin-top:10px">
          <div><label>ประเภทบิล</label><div class="cmsInvoiceReadOnlyV42">ใบกำกับภาษีเต็ม</div></div>
          <div><label>กระดาษ</label><div class="cmsInvoiceReadOnlyV42">9 × 11 นิ้ว</div></div>
          <div><label>VAT</label><div class="cmsInvoiceReadOnlyV42">แยกภาษี 7%</div></div>
        </div>
        <div class="cmsInvoiceActionRowV42">
          <button class="cmsInvoiceSecondaryV42" onclick="CMSInvoiceRequest.saveDraft()">บันทึกร่างคำขอ</button>
          <button class="cmsInvoiceDangerV42" onclick="CMSInvoiceRequest.deleteDraft()">ลบร่าง</button>
          <button class="cmsInvoicePrimaryV42 wide" onclick="CMSInvoiceRequest.confirmRequest()">ยืนยันขอออกใบกำกับภาษี</button>
        </div>
      </div>`
    ].join('');
  }

  function snapshot(base){
    const s = sender();
    return {
      ...base,
      sender: s,
      customer: state.customer,
      items: state.items.map(item => ({
        productId: item.productId || '',
        temporaryProductId: item.temporaryProductId || '',
        productCode: item.productCode || '',
        productName: validation.text(item.productName),
        unit: validation.text(item.unit),
        salePrice: validation.parseNumber(item.salePrice),
        quantity: validation.parseNumber(item.quantity),
        lineTotal: validation.lineTotal(item),
        source: item.source,
        isNewProduct: !!item.isNewProduct
      })),
      itemCount: state.items.length,
      expectedInvoiceCount: expectedInvoiceCount(),
      subtotalPreview: subtotal(),
      note: validation.text(state.note),
      status: 'กำลังดำเนินการ',
      testMode: true,
      invoiceType: SETTINGS.invoiceType,
      paperSize: SETTINGS.paperSize,
      vatMode: SETTINGS.vatMode,
      vatRate: SETTINGS.vatRate,
      itemsPerInvoice: SETTINGS.itemsPerInvoice
    };
  }

  function renderStatus(){
    ensurePages();
    const rows = store.listRequests();
    document.getElementById('cmsInvoiceRequestStatusPageV42').innerHTML = [
      header('สถานะใบกำกับภาษี', 'Read-only Placeholder - Test Requests'),
      '<div class="cmsInvoiceListV42">',
      rows.length ? rows.map(row => `<div class="cmsInvoiceListRowV42"><b>${esc(row.requestId)}</b><span class="cmsInvoiceBadgeV42 test">TEST</span><span class="cmsInvoiceListMetaV42">ลูกค้า: ${esc(row.customer?.customerName || '-')}<br>ผู้ส่ง: ${esc(row.sender?.nickname || '-')} / ${esc(row.sender?.branch || '-')}<br>วันเวลา: ${esc(row.sender?.requestedAt || '-')}<br>รายการ: ${row.itemCount || 0} | คาดว่า ${row.expectedInvoiceCount || 0} ใบ | ยอด ${money(row.subtotalPreview)}<br>สถานะ: ${esc(row.status || 'กำลังดำเนินการ')}</span></div>`).join('') : '<div class="empty">ยังไม่มี Test Request ในเครื่องนี้</div>',
      '</div>'
    ].join('');
  }

  function renderHistory(){
    ensurePages();
    document.getElementById('cmsInvoiceRequestHistoryPageV42').innerHTML = [
      header('ประวัติใบกำกับภาษี', 'Read-only Placeholder'),
      '<div class="cmsInvoicePanelV42"><span class="cmsInvoiceBadgeV42 test">TEST MODE</span><h3 class="cmsInvoiceSectionTitleV42">ยังไม่สร้างประวัติใบกำกับภาษีจริง</h3><p class="muted">Phase นี้แสดงเฉพาะพื้นที่ placeholder เพื่อทดสอบทางเข้าเมนูเท่านั้น ไม่มีการเขียน Tax Invoice History และไม่มีเลขบิลจริง</p></div>'
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
    box.innerHTML = rows.length ? rows.map((customer, index) => `<button type="button" onmousedown="CMSInvoiceRequest.selectCustomer(${index})" data-customer-pick="${index}"><b>${esc(customerSearch.fullName(customer) || customer.customerName)}</b><small>${esc(customer.customerCode || '-')} | ${esc(customer.taxId || '-')} | ${esc(customerSearch.fullAddress(customer) || '-')}</small></button>`).join('') : '<button type="button"><b>ไม่พบลูกค้า</b><small>อ่านจากฐานลูกค้า Tax Invoice แบบ read-only</small></button>';
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
      const warn = [!product.unit ? 'ไม่มีหน่วย' : '', product.salePrice == null ? 'ไม่มีราคาขาย' : ''].filter(Boolean).join(' / ');
      return `<button type="button" onmousedown="CMSInvoiceRequest.addExistingProduct(${index})"><b>${esc(product.productName)}</b><small>${esc(product.productCode || '-')} | หน่วย ${esc(product.unit || '-')} | ราคาขาย ${product.salePrice == null ? '-' : money(product.salePrice)}${warn ? ' | ' + esc(warn) : ''}</small></button>`;
    }).join('') : '<button type="button"><b>ไม่พบสินค้าเดิม</b><small>สามารถเพิ่มเป็นสินค้าใหม่แบบ Temporary ได้</small></button>';
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
      productId: product.productId,
      productCode: product.productCode,
      productName: product.productName,
      unit: product.unit,
      salePrice: product.salePrice,
      quantity: '',
      lineTotal: 0,
      source: 'existing-product',
      isNewProduct: false
    });
    state.validation = null;
    renderForm();
    setTimeout(() => document.querySelector(`[data-qty-index="${state.items.length - 1}"]`)?.focus(), 30);
  }

  function showSimilar(name){
    const box = document.getElementById('cmsSimilarBoxV42');
    if (!box) return;
    const rows = productSearch.similarProducts(name, 5);
    box.innerHTML = rows.length ? `<div style="margin:8px 0">${rows.map(row => `<span class="cmsInvoiceBadgeV42 warn">${esc(row.productName)}</span>`).join('')}</div>` : '';
  }

  function addNewProduct(){
    const name = document.getElementById('cmsNewProductNameV42')?.value || '';
    const unit = document.getElementById('cmsNewProductUnitV42')?.value || '';
    const salePrice = document.getElementById('cmsNewProductPriceV42')?.value || '';
    const quantity = document.getElementById('cmsNewProductQtyV42')?.value || '';
    const item = { temporaryProductId: tempId(), productCode: '', productName: name, unit, salePrice, quantity, source: 'new-product-preview', isNewProduct: true };
    const result = validation.validateItem(item);
    if (!result.valid) {
      alert(Object.values(result.errors)[0]);
      return;
    }
    state.items.push(item);
    state.validation = null;
    renderForm();
  }

  function updateItem(index, field, value){
    if (!state.items[index]) return;
    state.items[index][field] = value;
    state.items[index].lineTotal = validation.lineTotal(state.items[index]);
    const totals = document.querySelectorAll('.cmsInvoiceSummaryV42 b');
    if (totals[0]) totals[0].textContent = state.items.length;
    if (totals[1]) totals[1].textContent = `${expectedInvoiceCount()} ใบ`;
    if (totals[2]) totals[2].textContent = money(subtotal());
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
    const row = store.saveDraft(snapshot({ draftId: state.draftId }));
    state.draftId = row.draftId;
    alert('บันทึกร่างทดสอบแล้ว');
  }

  function deleteDraft(){
    if (!state.draftId) return alert('ยังไม่มีร่างทดสอบให้ลบ');
    store.deleteDraft(state.draftId);
    state.draftId = '';
    alert('ลบร่างทดสอบแล้ว');
  }

  function loadLatestDraft(){
    if (state.items.length || state.customer || state.draftId) return;
    const draft = store.listDrafts()[0];
    if (!draft) return;
    state.draftId = draft.draftId || '';
    state.customer = draft.customer || null;
    state.items = Array.isArray(draft.items) ? draft.items.map(item => ({ ...item, salePrice: item.salePrice ?? '', quantity: item.quantity ?? '' })) : [];
    state.note = draft.note || '';
  }

  function confirmRequest(){
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
    const ok = confirm(`ยืนยันสร้าง Test Request?\nรายการ ${state.items.length} รายการ\nคาดว่าจะถูกแบ่ง ${expectedInvoiceCount()} ใบ\nยอดรวม ${money(subtotal())}\n\nยังไม่สร้างใบกำกับภาษีจริง`);
    if (!ok) return;
    state.confirmLocked = true;
    const row = snapshot({ requestId: requestId(), createdAt: new Date().toISOString() });
    store.saveRequest(row);
    state.items = [];
    state.customer = null;
    state.note = '';
    state.draftId = '';
    state.validation = null;
    state.confirmLocked = false;
    alert(`สร้าง Test Request แล้ว\n${row.requestId}\nสถานะ: กำลังดำเนินการ`);
    openStatus();
  }

  function init(){
    ensurePages();
    ensureHomeButton();
  }

  window.CMSInvoiceRequest = {
    SETTINGS,
    storageKeys: { draft: store.DRAFT_KEY, request: store.REQUEST_KEY },
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
    expectedInvoiceCount: () => expectedInvoiceCount(),
    testState: state
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
