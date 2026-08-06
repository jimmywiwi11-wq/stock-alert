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
    editingItemIndex: -1,
    customerSearchTimer: null,
    productSearchTimer: null,
    customerSearchToken: 0,
    productSearchToken: 0,
    productEntryErrors: {},
    composing: { customer: false, product: false, productName: false },
    realtimeBound: false,
    realtimeBranchKey: '',
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

  function normalizeBranchKey(value){
    const raw = String(value == null ? '' : value).trim();
    const compact = raw.toLowerCase().replace(/\s+/g, '');
    if (!compact) return '';
    if (compact === '1' || compact === 'b1' || compact === 'branch1' || compact === 'สาขา1') return 'branch1';
    if (compact === '2' || compact === 'b2' || compact === 'branch2' || compact === 'สาขา2') return 'branch2';
    if ((compact.includes('branch') || compact.includes('สาขา')) && compact.includes('1')) return 'branch1';
    if ((compact.includes('branch') || compact.includes('สาขา')) && compact.includes('2')) return 'branch2';
    return compact;
  }

  function branchLabelFromKey(key){
    if (key === 'branch2') return 'สาขา 2';
    if (key === 'branch1') return 'สาขา 1';
    return text(deviceBranch()) || 'สาขา 1';
  }

  function currentBranchKey(){
    return normalizeBranchKey(deviceBranch());
  }

  function currentBranchLabel(){
    return branchLabelFromKey(currentBranchKey());
  }

  function rowBranchKey(row){
    if (!row) return '';
    return normalizeBranchKey(
      row.branchKey ||
      row.requestedBranch ||
      row.branch ||
      row.branchName ||
      row.sender?.branchKey ||
      row.sender?.requestedBranch ||
      row.sender?.branch ||
      row.customerSnapshot?.branchKey ||
      row.customerSnapshot?.branch ||
      row.customer?.branchKey ||
      row.customer?.branch ||
      ''
    );
  }

  function rowMatchesCurrentBranch(row){
    const key = rowBranchKey(row);
    return !!key && key === currentBranchKey();
  }

  function pairMatchesCurrentBranch(pair){
    const requestKey = rowBranchKey(pair && pair.request);
    const invoiceKey = rowBranchKey(pair && pair.invoice);
    const currentKey = currentBranchKey();
    return !!currentKey && (requestKey === currentKey || (!requestKey && invoiceKey === currentKey));
  }

  function recordIsCentrallyHidden(row){
    return !!(row && (
      row.statusHidden === true ||
      row.mobileStatusHidden === true ||
      row.hiddenFromMobileStatus === true ||
      row.clearedFromMobileStatus === true
    ));
  }

  function requestHiddenFromStatus(row){
    if (recordIsCentrallyHidden(row)) return true;
    return isTestMode() && requestIsLocallyHidden(row, true);
  }

  function pairHiddenFromStatus(pair, includeStatusHidden){
    if (recordIsCentrallyHidden(pair && pair.request) || recordIsCentrallyHidden(pair && pair.invoice)) return true;
    return isTestMode() && localPairIsHidden(pair && pair.invoice, pair && pair.request, includeStatusHidden);
  }

  function currentUserUid(){
    return text(window.auth && window.auth.currentUser && window.auth.currentUser.uid || localStorage.getItem('stockAlertUserUid') || '');
  }

  function sender(){
    const nickname = text(window.nickname || localStorage.getItem('stockAlertNickname') || 'ไม่ระบุ');
    const branch = deviceBranch();
    const branchKey = normalizeBranchKey(branch);
    const uid = currentUserUid();
    return {
      requestedBy: text(localStorage.getItem('stockAlertUserId') || nickname),
      requestedByUid: uid,
      ownerUid: uid,
      requestedByNickname: nickname,
      requestedBranch: branchLabelFromKey(branchKey),
      branch: branchKey,
      branchKey,
      branchName: branchLabelFromKey(branchKey),
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
      : '<div class="cmsInvoiceBannerV42 production">Production Mode: สถานะและตัวอย่างใบกำกับภาษีซิงก์จากฐานข้อมูลกลางแบบ realtime</div>';
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
    const selectedName = c ? ([c.prefix, c.customerName || c.name].filter(Boolean).join(' ').trim() || '-') : '-';
    return `<div class="cmsInvoicePanelV42">
      <div class="cmsInvoiceCustomerTitleRowV42">
        <h3 class="cmsInvoiceSectionTitleV42">ลูกค้า</h3>
        <button type="button" class="cmsInvoiceAddCustomerV42" onclick="CMSInvoiceRequest.openAddCustomer()">เพิ่ม</button>
      </div>
      <div class="cmsInvoiceSuggestWrapV42"><label>ค้นหา/เลือกลูกค้า</label><input class="cmsInvoiceInputV42" id="cmsCustomerSearchV42" placeholder="ค้นจากรหัส ชื่อ เลขภาษี หรือที่อยู่" oncompositionstart="CMSInvoiceRequest.beginComposition('customer')" oncompositionend="CMSInvoiceRequest.endComposition('customer', this.value)" oninput="CMSInvoiceRequest.searchCustomer(this.value)" autocomplete="off"><div class="cmsInvoiceSuggestV42" id="cmsCustomerSuggestV42"></div></div>
      <div class="cmsInvoiceSelectedCustomerV42" style="margin-top:10px"><label>ลูกค้าที่เลือก</label><div class="cmsInvoiceReadOnlyV42">${esc(selectedName)}</div></div>
    </div>`;
  }
  function openAddCustomer(){
    closeAddCustomer();
    const modal = document.createElement('div');
    modal.id = 'cmsInvoiceCustomerModalV42';
    modal.className = 'cmsInvoiceCustomerModalV42';
    modal.innerHTML = `<div class="cmsInvoiceCustomerDialogV42" role="dialog" aria-modal="true" aria-labelledby="cmsInvoiceCustomerDialogTitleV42">
      <div class="cmsInvoiceCustomerDialogHeadV42">
        <h3 id="cmsInvoiceCustomerDialogTitleV42">เพิ่มบริษัทลูกค้า</h3>
        <button type="button" onclick="CMSInvoiceRequest.closeAddCustomer()" aria-label="ปิด">×</button>
      </div>
      <div class="cmsInvoiceCustomerDialogBodyV42">
        <div class="cmsInvoiceCustomerGridV42">
          <div>
            <label>คำนำหน้า</label>
            <select id="cmsNewCustomerPrefixV42" class="cmsInvoiceInputV42">
              <option value="บริษัท">บริษัท</option>
              <option value="ห้างหุ้นส่วนจำกัด">ห้างหุ้นส่วนจำกัด</option>
              <option value="นาย">นาย</option>
              <option value="นาง">นาง</option>
              <option value="นางสาว">นางสาว</option>
              <option value="คุณ">คุณ</option>
              <option value="">ไม่ระบุ</option>
            </select>
          </div>
          <div>
            <label>ชื่อบริษัท/ชื่อลูกค้า</label>
            <input id="cmsNewCustomerNameV42" class="cmsInvoiceInputV42" autocomplete="organization" placeholder="ชื่อบริษัท">
          </div>
          <div class="wide">
            <label>ที่อยู่ 1</label>
            <input id="cmsNewCustomerAddress1V42" class="cmsInvoiceInputV42" autocomplete="street-address" placeholder="บ้านเลขที่ หมู่ ถนน ตำบล">
          </div>
          <div class="wide">
            <label>ที่อยู่ 2</label>
            <input id="cmsNewCustomerAddress2V42" class="cmsInvoiceInputV42" placeholder="อำเภอ จังหวัด รหัสไปรษณีย์">
          </div>
          <div class="wide">
            <label>เลขประจำตัวผู้เสียภาษี</label>
            <input id="cmsNewCustomerTaxV42" class="cmsInvoiceInputV42" inputmode="numeric" maxlength="13" placeholder="13 หลัก">
          </div>
        </div>
        <div id="cmsNewCustomerErrorV42" class="cmsInvoiceCustomerErrorV42"></div>
      </div>
      <div class="cmsInvoiceCustomerDialogFootV42">
        <button type="button" class="cancel" onclick="CMSInvoiceRequest.closeAddCustomer()">ยกเลิก</button>
        <button type="button" class="save" id="cmsSaveCustomerV42" onclick="CMSInvoiceRequest.saveNewCustomer()">บันทึก</button>
      </div>
    </div>`;
    modal.addEventListener('click', event => {
      if (event.target === modal) closeAddCustomer();
    });
    document.body.appendChild(modal);
    document.documentElement.classList.add('cmsInvoiceCustomerModalOpenV42');
    setTimeout(() => document.getElementById('cmsNewCustomerNameV42')?.focus(), 50);
  }

  function closeAddCustomer(){
    document.getElementById('cmsInvoiceCustomerModalV42')?.remove();
    document.documentElement.classList.remove('cmsInvoiceCustomerModalOpenV42');
  }

  function localCustomerRowsForCode(){
    const rows = [];
    try {
      if (window.ChokAnanCustomerMaster && typeof window.ChokAnanCustomerMaster.getCustomerMaster === 'function') {
        rows.push(...(window.ChokAnanCustomerMaster.getCustomerMaster({ includeLegacy: true }) || []));
      }
    } catch (error) {}
    try {
      const recent = JSON.parse(localStorage.getItem('chokananCustomerMasterRecentV1') || '[]');
      if (Array.isArray(recent)) rows.push(...recent);
    } catch (error) {}
    return rows;
  }

  async function remoteCustomerRowsForCode(){
    if (!window.db || typeof window.db.collection !== 'function') return [];
    try {
      const snap = await window.db.collection('customers').get();
      return snap.docs.map(doc => ({ ...(doc.data() || {}), firestoreDocId: doc.id }));
    } catch (error) {
      console.warn('[employee customer code] cannot read customers for code allocation', error);
      return [];
    }
  }

  function customerRowCode(row){
    return String(row?.customerCode || row?.code || row?.customerId || row?.id || '').trim();
  }

  function fallbackNextCustomerCode(rows, prefix='CM', width=3){
    const used = new Set((rows || []).map(customerRowCode).filter(Boolean));
    let max = 0;
    used.forEach(code => {
      const match = String(code).match(new RegExp(`^${prefix}0*(\\d+)$`, 'i'));
      if (match) max = Math.max(max, Number(match[1]) || 0);
    });
    let next = `${prefix}${String(max + 1).padStart(width, '0')}`;
    while (used.has(next)) {
      max += 1;
      next = `${prefix}${String(max + 1).padStart(width, '0')}`;
    }
    return next;
  }

  async function customerCodeExists(code, rows){
    const wanted = String(code || '').trim().toLowerCase();
    if (!wanted) return false;
    if ((rows || []).some(row => customerRowCode(row).toLowerCase() === wanted)) return true;
    if (!window.db || typeof window.db.collection !== 'function') return false;
    try {
      const [byCustomerCode, byCode, byId] = await Promise.all([
        window.db.collection('customers').where('customerCode', '==', code).get().catch(() => null),
        window.db.collection('customers').where('code', '==', code).get().catch(() => null),
        window.db.collection('customers').doc(code).get().catch(() => null)
      ]);
      return !!(byCustomerCode?.docs?.length || byCode?.docs?.length || byId?.exists);
    } catch (error) {
      console.warn('[employee customer code] duplicate check failed', error);
      return false;
    }
  }

  async function customerCodeNow(){
    const generator = window.ChokAnanCustomerMaster && typeof window.ChokAnanCustomerMaster.nextCustomerCode === 'function'
      ? window.ChokAnanCustomerMaster.nextCustomerCode
      : fallbackNextCustomerCode;
    const rows = localCustomerRowsForCode().concat(await remoteCustomerRowsForCode());
    let code = generator(rows, 'CM', 3);
    for (let attempt = 0; attempt < 100 && await customerCodeExists(code, rows); attempt += 1) {
      rows.push({ customerCode: code });
      code = generator(rows, 'CM', 3);
    }
    if (await customerCodeExists(code, rows)) throw new Error('customer-code-allocation-failed');
    return code;
  }

  function newCustomerValue(id){
    return String(document.getElementById(id)?.value || '').trim();
  }

  function setNewCustomerError(message){
    const box = document.getElementById('cmsNewCustomerErrorV42');
    if (box) box.textContent = message || '';
  }

  async function saveNewCustomer(){
    const prefix = newCustomerValue('cmsNewCustomerPrefixV42');
    const customerName = newCustomerValue('cmsNewCustomerNameV42');
    const address1 = newCustomerValue('cmsNewCustomerAddress1V42');
    const address2 = newCustomerValue('cmsNewCustomerAddress2V42');
    const taxId = newCustomerValue('cmsNewCustomerTaxV42').replace(/\D/g, '');
    const saveButton = document.getElementById('cmsSaveCustomerV42');

    setNewCustomerError('');
    if (!customerName) {
      setNewCustomerError('กรุณากรอกชื่อบริษัทหรือชื่อลูกค้า');
      document.getElementById('cmsNewCustomerNameV42')?.focus();
      return;
    }
    if (!address1) {
      setNewCustomerError('กรุณากรอกที่อยู่ 1');
      document.getElementById('cmsNewCustomerAddress1V42')?.focus();
      return;
    }
    if (!address2) {
      setNewCustomerError('กรุณากรอกที่อยู่ 2');
      document.getElementById('cmsNewCustomerAddress2V42')?.focus();
      return;
    }
    if (taxId && taxId.length !== 13) {
      setNewCustomerError('เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก');
      document.getElementById('cmsNewCustomerTaxV42')?.focus();
      return;
    }
    if (!window.db || typeof window.db.collection !== 'function') {
      setNewCustomerError('ยังไม่เชื่อมต่อฐานข้อมูลกลาง กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง');
      return;
    }

    const existing = customerSearch.searchCustomers(taxId || customerName, 50);
    const duplicate = existing.find(customer => {
      const existingTax = String(customer.taxId || customer.customerTaxId || '').replace(/\D/g, '');
      const existingName = normalizeUiText(customer.customerName || customer.name || '');
      return (taxId && existingTax === taxId) || (existingName && existingName === normalizeUiText(customerName));
    });
    if (duplicate) {
      state.customer = duplicate;
      closeAddCustomer();
      renderForm();
      alert('ลูกค้านี้มีอยู่แล้ว ระบบเลือกข้อมูลเดิมให้ทันที');
      return;
    }

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = 'กำลังบันทึก...';
    }

    try {
      const customerCode = await customerCodeNow();
      const fullName = [prefix, customerName].filter(Boolean).join(' ').trim();
      const address = [address1, address2].filter(Boolean).join(' ').trim();
      const now = nowIso();
      const customer = {
        id: customerCode,
        customerId: customerCode,
        code: customerCode,
        customerCode,
        prefix,
        customerPrefix: prefix,
        name: customerName,
        customerName,
        companyName: customerName,
        fullName,
        address1,
        address2,
        address,
        customerAddress: address,
        customerAddress1: address1,
        customerAddress2: address2,
        taxId,
        customerTaxId: taxId,
        phone: '',
        headOffice: '',
        branchNumber: '',
        createdAt: now,
        updatedAt: now,
        createdBy: sender().requestedByNickname,
        createdByUid: sender().requestedByUid,
        createdFrom: 'employee-invoice-request',
        source: 'customer-master'
      };

      await window.db.collection('customers').doc(customerCode).set(customer, { merge: true });

      state.customer = customer;
      try {
        const localKey = 'chokananCustomerMasterRecentV1';
        const recent = JSON.parse(localStorage.getItem(localKey) || '[]');
        localStorage.setItem(localKey, JSON.stringify([customer, ...recent.filter(row => row.customerCode !== customerCode)].slice(0, 100)));
      } catch (error) {}

      try {
        window.dispatchEvent(new CustomEvent('chokanan-customer-master-updated', {
          detail: { customer, source: 'employee-invoice-request' }
        }));
      } catch (error) {}

      closeAddCustomer();
      renderForm();
      alert(`บันทึกลูกค้าใหม่แล้ว\n${fullName}\nระบบเลือกบริษัทนี้ให้เรียบร้อย`);
    } catch (error) {
      setNewCustomerError(`บันทึกลูกค้าไม่สำเร็จ: ${error.message || error}`);
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'บันทึก';
      }
    }
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
      branch: s.branch,
      branchKey: s.branchKey,
      branchName: s.branchName,
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
    if (window.CMS_INVOICE_NATIVE_IMPORT_REQUIRED !== false) return false;
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
  function closeStatusMore(){
    document.getElementById('cmsInvoiceStatusMoreMenuV42')?.classList.remove('show');
  }

  function toggleStatusMore(event){
    if (event) event.stopPropagation();
    const menu = document.getElementById('cmsInvoiceStatusMoreMenuV42');
    if (!menu) return;
    const show = !menu.classList.contains('show');
    closeStatusMore();
    if (show) menu.classList.add('show');
  }

  function closeLocalClearDialog(){
    document.getElementById('cmsInvoiceLocalClearModalV42')?.remove();
    document.documentElement.classList.remove('cmsInvoiceLocalClearOpenV42');
  }

  function currentStatusPairsForClear(){
    const pairs = mobileStatusInvoiceRows();
    if (pairs.length) return pairs;
    return (isTestMode() ? store.listRequests() : store.listProductionRequests())
      .filter(requestVisibleInCurrentStatus)
      .filter(request => !requestHiddenFromStatus(request))
      .map(request => ({ invoice: {}, request }));
  }

  function centralHidePayload(){
    const s = sender();
    return {
      statusHidden: true,
      mobileStatusHidden: true,
      hiddenFromMobileStatus: true,
      hiddenBranchKey: currentBranchKey(),
      hiddenBranch: currentBranchLabel(),
      hiddenByUid: s.requestedByUid || '',
      hiddenBy: s.requestedByNickname || '',
      hiddenAt: nowIso(),
      updatedAt: nowIso()
    };
  }

  async function hideCentralPair(pair){
    if (!pairMatchesCurrentBranch(pair)) return false;
    const requestId = String(
      pair?.request?.requestId ||
      pair?.request?.id ||
      pair?.invoice?.sourceRequestId ||
      pair?.invoice?.requestId ||
      ''
    ).trim();
    if (!requestId || !sync.firestoreReady() || !window.db) return false;
    const patch = centralHidePayload();
    await window.db.collection('invoiceRequests').doc(requestId).set(patch, { merge: true });
    store.saveProductionRequest({ ...(pair.request || {}), requestId, ...patch });
    return true;
  }

  function clearPairLabel(pair, index){
    const invoice = pair.invoice || {};
    const request = pair.request || {};
    const requestNumber = invoice.requestNumber || invoice.sourceRequestNumber || request.requestNumber || `รายการ ${index + 1}`;
    const invoiceNumber = invoice.invoiceNumber || invoice.no || '';
    const customer = invoiceCustomerName(invoice, request);
    const status = invoice.invoiceNumber || invoice.no ? invoiceStatusText(invoice) : statusText(request);
    return `${requestNumber}${invoiceNumber ? ` • ${invoiceNumber}` : ''} • ${customer} • ${status}`;
  }

  function openClearStatusDialog(){
    closeStatusMore();
    closeLocalClearDialog();
    const pairs = currentStatusPairsForClear();
    if (!pairs.length) {
      alert('ไม่มีข้อมูลในหน้าสถานะให้ล้าง');
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'cmsInvoiceLocalClearModalV42';
    modal.className = 'cmsInvoiceLocalClearModalV42';
    modal.innerHTML = `<div class="cmsInvoiceLocalClearDialogV42">
      <div class="cmsInvoiceLocalClearHeadV42"><h3>ล้างสถานะในมือถือ</h3><button type="button" onclick="CMSInvoiceRequest.closeLocalClearDialog()">×</button></div>
      <div class="cmsInvoiceLocalClearBodyV42">
        <p>ข้อมูลจะถูกซ่อนเฉพาะในแอปมือถือเครื่องนี้ ไม่กระทบโปรแกรมออกใบกำกับภาษีหรือ Firestore ส่วนกลาง</p>
        <label class="cmsInvoiceClearChoiceV42"><input type="radio" name="cmsClearModeV42" value="all" checked onchange="CMSInvoiceRequest.clearStatusModeChanged()"> ล้างทั้งหมด</label>
        <label class="cmsInvoiceClearChoiceV42"><input type="radio" name="cmsClearModeV42" value="selected" onchange="CMSInvoiceRequest.clearStatusModeChanged()"> เลือกบางรายการ</label>
        <div id="cmsInvoiceClearSelectionV42" class="cmsInvoiceClearSelectionV42" hidden>
          <label class="cmsInvoiceClearSelectAllV42"><input type="checkbox" id="cmsInvoiceClearSelectAllV42" onchange="CMSInvoiceRequest.toggleClearSelectAll(this.checked)"> เลือกทั้งหมด</label>
          ${pairs.map((pair, index) => `<label><input type="checkbox" class="cmsInvoiceClearRowV42" value="${index}"> <span>${esc(clearPairLabel(pair, index))}</span></label>`).join('')}
        </div>
      </div>
      <div class="cmsInvoiceLocalClearFootV42"><button type="button" class="cancel" onclick="CMSInvoiceRequest.closeLocalClearDialog()">ยกเลิก</button><button type="button" class="danger" onclick="CMSInvoiceRequest.confirmClearStatus()">ล้างสถานะ</button></div>
    </div>`;
    modal._clearPairs = pairs;
    document.body.appendChild(modal);
    document.documentElement.classList.add('cmsInvoiceLocalClearOpenV42');
  }

  function clearStatusModeChanged(){
    const mode = document.querySelector('input[name="cmsClearModeV42"]:checked')?.value || 'all';
    const selection = document.getElementById('cmsInvoiceClearSelectionV42');
    if (selection) selection.hidden = mode !== 'selected';
  }

  function toggleClearSelectAll(checked){
    document.querySelectorAll('.cmsInvoiceClearRowV42').forEach(input => { input.checked = !!checked; });
  }

  async function confirmClearStatus(){
    const modal = document.getElementById('cmsInvoiceLocalClearModalV42');
    const pairs = modal?._clearPairs || [];
    const mode = document.querySelector('input[name="cmsClearModeV42"]:checked')?.value || 'all';
    const selected = mode === 'all'
      ? pairs
      : [...document.querySelectorAll('.cmsInvoiceClearRowV42:checked')].map(input => pairs[Number(input.value)]).filter(Boolean);

    if (!selected.length) {
      alert('กรุณาเลือกรายการที่ต้องการล้าง');
      return;
    }

    const message = `ยืนยันล้างสถานะ ${selected.length} รายการ?\n\nล้างเฉพาะหน้าสถานะบนมือถือเครื่องนี้\nไม่ลบข้อมูลจากโปรแกรมออกใบกำกับภาษี`;
    if (!confirm(message)) return;

    if (isTestMode()) {
      hideLocalPairs(selected, MOBILE_STATUS_HIDDEN_KEY);
      closeLocalClearDialog();
      renderStatus();
      return;
    }

    try {
      const written = await Promise.all(selected.map(hideCentralPair));
      if (!written.some(Boolean)) {
        alert('ไม่สามารถล้างสถานะจากฐานข้อมูลกลางได้ในขณะนี้');
        return;
      }
      closeLocalClearDialog();
      renderStatus();
    } catch (error) {
      alert(`ล้างสถานะไม่สำเร็จ: ${error.message || error}`);
    }
  }

  function openClearAllDialog(){
    closeStatusMore();
    closeLocalClearDialog();
    const modal = document.createElement('div');
    modal.id = 'cmsInvoiceLocalClearModalV42';
    modal.className = 'cmsInvoiceLocalClearModalV42';
    modal.innerHTML = `<div class="cmsInvoiceLocalClearDialogV42 danger">
      <div class="cmsInvoiceLocalClearHeadV42"><h3>ล้างสถานะและประวัติทั้งหมด</h3><button type="button" onclick="CMSInvoiceRequest.closeLocalClearDialog()">×</button></div>
      <div class="cmsInvoiceLocalClearBodyV42">
        <div class="cmsInvoiceClearWarningV42">การล้างนี้มีผลเฉพาะแอปมือถือเครื่องนี้เท่านั้น โปรแกรมออกใบกำกับภาษีและข้อมูลส่วนกลางยังอยู่ครบ</div>
        <p><b>ขั้นที่ 1:</b> ทำเครื่องหมายยืนยันว่าคุณเข้าใจ</p>
        <label class="cmsInvoiceClearChoiceV42"><input type="checkbox" id="cmsInvoiceClearUnderstandV42" onchange="CMSInvoiceRequest.clearAllValidationChanged()"> ฉันเข้าใจว่าจะล้างหน้าสถานะและประวัติบนมือถือ</label>
        <p><b>ขั้นที่ 2:</b> พิมพ์คำว่า <strong>ลบทั้งหมด</strong></p>
        <input class="cmsInvoiceInputV42" id="cmsInvoiceClearPhraseV42" autocomplete="off" placeholder="พิมพ์ ลบทั้งหมด" oninput="CMSInvoiceRequest.clearAllValidationChanged()">
        <p><b>ขั้นที่ 3:</b> กดปุ่มสีแดงด้านล่างเพื่อยืนยันครั้งสุดท้าย</p>
      </div>
      <div class="cmsInvoiceLocalClearFootV42"><button type="button" class="cancel" onclick="CMSInvoiceRequest.closeLocalClearDialog()">ยกเลิก</button><button type="button" class="danger" id="cmsInvoiceClearAllFinalV42" onclick="CMSInvoiceRequest.confirmClearAll()" disabled>ลบทั้งหมด</button></div>
    </div>`;
    document.body.appendChild(modal);
    document.documentElement.classList.add('cmsInvoiceLocalClearOpenV42');
  }

  function clearAllValidationChanged(){
    const understood = !!document.getElementById('cmsInvoiceClearUnderstandV42')?.checked;
    const phrase = String(document.getElementById('cmsInvoiceClearPhraseV42')?.value || '').trim();
    const button = document.getElementById('cmsInvoiceClearAllFinalV42');
    if (button) button.disabled = !(understood && phrase === 'ลบทั้งหมด');
  }

  async function confirmClearAll(){
    const understood = !!document.getElementById('cmsInvoiceClearUnderstandV42')?.checked;
    const phrase = String(document.getElementById('cmsInvoiceClearPhraseV42')?.value || '').trim();
    if (!understood || phrase !== 'ลบทั้งหมด') return;

    if (!confirm('ยืนยันครั้งสุดท้าย?\n\nสถานะและประวัติใบกำกับภาษีในมือถือเครื่องนี้จะหายทั้งหมด\nข้อมูลในโปรแกรมออกใบกำกับภาษีจะไม่ถูกลบ')) return;

    if (!isTestMode()) {
      try {
        const written = await Promise.all(currentStatusPairsForClear().map(hideCentralPair));
        if (!written.some(Boolean)) {
          alert('ไม่สามารถล้างสถานะจากฐานข้อมูลกลางได้ในขณะนี้');
          return;
        }
        closeLocalClearDialog();
        renderStatus();
      } catch (error) {
        alert(`ล้างสถานะไม่สำเร็จ: ${error.message || error}`);
      }
      return;
    }

    const requests = new Map((isTestMode() ? store.listRequests() : store.listProductionRequests()).map(row => [String(row.requestId || ''), row]));
    const allPairs = readMobileHistory().map(invoice => ({ invoice, request: requests.get(invoiceRequestKey(invoice)) || {} }));
    hideLocalPairs(allPairs, MOBILE_ALL_HIDDEN_KEY);

    // Also hide request-only cards that do not yet have a taxInvoices record.
    const allHidden = localAllHiddenSet();
    for (const request of (isTestMode() ? store.listRequests() : store.listProductionRequests())) {
      requestLocalKeys(request).forEach(key => allHidden.add(key));
    }
    writeLocalHiddenSet(MOBILE_ALL_HIDDEN_KEY, allHidden);

    localStorage.removeItem(TAX_INVOICE_HISTORY_KEY);
    closeLocalClearDialog();
    renderStatus();
    alert('ล้างสถานะและประวัติในมือถือเครื่องนี้แล้ว\nข้อมูลในโปรแกรมออกใบกำกับภาษียังอยู่ครบ');
  }

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
    if (!normalizeUiText(query)) {
      hideProductSuggestions();
      return;
    }
    const rows = productSearch.searchProducts(query, 16);
    box.classList.toggle('inlineHint', !rows.length);
    box.innerHTML = rows.length ? rows.map((product, index) => {
      return `<button type="button" onmousedown="CMSInvoiceRequest.addExistingProduct(${index})"><b>${esc(product.productName)}</b><small>${esc(product.productCode || '-')} | หน่วย ${esc(product.unit || '-')} | ราคาขาย ${product.salePrice == null ? '-' : money(product.salePrice)}</small></button>`;
    }).join('') : '<div class="cmsInvoiceProductHintV42"><b>ไม่พบสินค้าเดิม</b><small>กรอกจำนวน หน่วย และราคา แล้วกดเพิ่มเพื่อสร้าง Product Master ใหม่</small></div>';
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
      setProductEntryErrors(result.errors || {});
      focusFirstProductError(result.errors || {});
      return;
    }
    const similar = findExactProductByName(name);
    if (similar) {
      state.items.push({
        requestItemId: newId('req-item'),
        productId: similar.productId,
        productCode: similar.productCode,
        productName: similar.productName,
        unit: unit || similar.unit,
        salePrice: salePrice || similar.salePrice,
        quantity,
        source: similar.source || 'existing-product-exact',
        isNewProduct: false,
        addedByUid: sender().requestedByUid,
        addedBy: sender().requestedByNickname,
        addedAt: nowIso()
      });
      renderForm();
      return;
    }
    const created = window.ChokAnanProductMaster && typeof window.ChokAnanProductMaster.createProductAsync === 'function'
      ? await window.ChokAnanProductMaster.createProductAsync({ productName: name, name, unit, salePrice, price: salePrice, createdFrom: 'employee-invoice-request', source: 'employee-invoice-request', costPrice: null }, { uid: sender().requestedByUid, by: sender().requestedByNickname, nickname: sender().requestedByNickname, branch: sender().requestedBranch })
      : (window.ChokAnanProductMaster && typeof window.ChokAnanProductMaster.createProduct === 'function'
        ? window.ChokAnanProductMaster.createProduct({ productName: name, name, unit, salePrice, price: salePrice, createdFrom: 'employee-invoice-request', source: 'employee-invoice-request', costPrice: null }, { uid: sender().requestedByUid, by: sender().requestedByNickname, nickname: sender().requestedByNickname, branch: sender().requestedBranch })
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
    if (state.editingItemIndex === index) state.editingItemIndex = -1;
    else if (state.editingItemIndex > index) state.editingItemIndex -= 1;
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
        generationState: 'completed',
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
  const MOBILE_STATUS_HIDDEN_KEY = 'cmsInvoiceMobileStatusHiddenV1';
  const MOBILE_ALL_HIDDEN_KEY = 'cmsInvoiceMobileAllHiddenV1';


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
    const generationState = text(row?.generationState).toLowerCase();

    // Firestore status is the source of truth. A request may already have a real
    // taxInvoices document even when legacy generatedInvoiceIds arrays are empty.
    if (
      row?.printed === true ||
      status === 'printed' ||
      status === 'print_confirmed' ||
      printStatus === 'printed' ||
      printStatus === 'reprinted' ||
      status.includes('พิมพ์แล้ว') ||
      status.includes('สั่งพิมพ์แล้ว')
    ) return 'printed';

    if (status === 'partially_printed' || printStatus === 'partially_printed') return 'partially_printed';

    if (
      status === 'ready_to_print' ||
      status === 'ready' ||
      printStatus === 'ready_to_print' ||
      generationState === 'generated' ||
      generationState === 'completed' ||
      generationState === 'native-imported' ||
      status.includes('พร้อมพิมพ์')
    ) return 'ready_to_print';

    if (
      status === 'processing' ||
      status === 'not-started' ||
      generationState === 'not-started'
    ) return 'processing';

    return status || 'processing';
  }

  function readLocalHiddenSet(storageKey){
    try {
      const values = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return new Set(Array.isArray(values) ? values.map(String) : []);
    } catch (error) {
      return new Set();
    }
  }

  function writeLocalHiddenSet(storageKey, set){
    localStorage.setItem(storageKey, JSON.stringify([...set]));
  }

  function localStatusHiddenSet(){
    return readLocalHiddenSet(MOBILE_STATUS_HIDDEN_KEY);
  }

  function localAllHiddenSet(){
    return readLocalHiddenSet(MOBILE_ALL_HIDDEN_KEY);
  }

  function localRecordKeys(invoice, request){
    const keys = new Set();
    const add = value => {
      const textValue = String(value || '').trim();
      if (textValue) keys.add(textValue);
    };
    add(invoiceRecordKey(invoice));
    add(invoice?.invoiceId);
    add(invoice?.historyId);
    add(invoice?.id);
    add(invoice?.invoiceNumber);
    add(invoice?.no);
    add(invoice?.No);
    add(invoice?.sourceRequestId);
    add(invoice?.requestId);
    add(invoice?.requestNumber);
    add(invoice?.sourceRequestNumber);
    add(request?.requestId);
    add(request?.id);
    add(request?.requestNumber);
    return [...keys];
  }

  function localPairIsHidden(invoice, request, includeStatusHidden){
    const allHidden = localAllHiddenSet();
    const statusHidden = includeStatusHidden ? localStatusHiddenSet() : new Set();
    return localRecordKeys(invoice, request).some(key => allHidden.has(key) || statusHidden.has(key));
  }

  function hideLocalPairs(pairs, storageKey){
    const hidden = readLocalHiddenSet(storageKey);
    for (const pair of pairs || []) {
      localRecordKeys(pair.invoice || {}, pair.request || {}).forEach(key => hidden.add(key));
    }
    writeLocalHiddenSet(storageKey, hidden);
  }

  function requestLocalKeys(request){
    return localRecordKeys({}, request || {});
  }

  function requestIsLocallyHidden(request, includeStatusHidden){
    const allHidden = localAllHiddenSet();
    const statusHidden = includeStatusHidden ? localStatusHiddenSet() : new Set();
    return requestLocalKeys(request).some(key => allHidden.has(key) || statusHidden.has(key));
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
    const editing = Number.isInteger(state.editingItemIndex) && state.editingItemIndex >= 0;
    return `<div class="cmsInvoicePanelV42" id="cmsInvoiceProductEditorV42"><h3 class="cmsInvoiceSectionTitleV42">${editing ? `แก้ไขรายการที่ ${state.editingItemIndex + 1}` : 'สินค้า'}</h3>
      <div class="cmsInvoiceProductEntryRowV42">
        <div class="name cmsInvoiceSuggestWrapV42"><label>ชื่อสินค้า</label><input class="cmsInvoiceInputV42" id="cmsNewProductNameV42" oncompositionstart="CMSInvoiceRequest.beginComposition('productName')" oncompositionend="CMSInvoiceRequest.endComposition('productName', this.value)" oninput="CMSInvoiceRequest.productNameChanged(this.value)" onkeydown="CMSInvoiceRequest.productSearchKey(event)" placeholder="พิมพ์ชื่อสินค้า แล้วเลือกจากรายการ หรือพิมพ์สินค้าใหม่" autocomplete="off"><div class="cmsInvoiceSuggestV42" id="cmsProductSuggestV42"></div><div class="cmsInvoiceFieldErrorV42" id="cmsNewProductNameErrorV42">${esc(state.productEntryErrors.productName || '')}</div></div>
        <div><label>จำนวน</label><input class="cmsInvoiceInputV42" id="cmsNewProductQtyV42" inputmode="decimal" placeholder="0" onfocus="CMSInvoiceRequest.hideProductSuggestions()"><div class="cmsInvoiceFieldErrorV42" id="cmsNewProductQtyErrorV42">${esc(state.productEntryErrors.quantity || '')}</div></div>
        <div><label>หน่วย</label><input class="cmsInvoiceInputV42" id="cmsNewProductUnitV42" placeholder="หน่วย" onfocus="CMSInvoiceRequest.hideProductSuggestions()"><div class="cmsInvoiceFieldErrorV42" id="cmsNewProductUnitErrorV42">${esc(state.productEntryErrors.unit || '')}</div></div>
        <div><label>ราคาขาย</label><input class="cmsInvoiceInputV42" id="cmsNewProductPriceV42" inputmode="decimal" placeholder="0.00" onfocus="CMSInvoiceRequest.hideProductSuggestions()"><div class="cmsInvoiceFieldErrorV42" id="cmsNewProductPriceErrorV42">${esc(state.productEntryErrors.salePrice || '')}</div></div>
        <button class="cmsInvoiceAddProductV42 ${editing ? 'editing' : ''}" onclick="CMSInvoiceRequest.addNewProduct()">${editing ? 'บันทึกแก้ไข' : 'เพิ่ม'}</button>
      </div>
      ${editing ? '<button type="button" class="cmsInvoiceCancelEditV42" onclick="CMSInvoiceRequest.cancelEditItem()">ยกเลิกแก้ไข</button>' : ''}
      <div id="cmsSimilarBoxV42"></div>
    </div>`;
  }

  function renderItems(){
    const rows = state.items.map((item, index) => {
      const errors = itemErrors(index);
      return `<div class="cmsInvoiceItemSlimV42 ${Object.keys(errors).length ? 'invalid' : ''}" data-item-index="${index}">
        <div class="no">${index + 1}</div>
        <div class="product" title="${esc(item.productName)}">${esc(item.productName)}</div>
        <div class="qty">${esc(item.quantity ?? '')}</div>
        <div class="unit">${esc(item.unit || '-')}</div>
        <div class="price">${money(item.salePrice ?? 0)}</div>
        <div class="cmsInvoiceItemMenuWrapV42">
          <button class="menu" type="button" onclick="CMSInvoiceRequest.toggleItemMenu(${index}, event)" aria-label="เมนูรายการ">⋯</button>
          <div class="cmsInvoiceItemMenuV42" id="cmsInvoiceItemMenuV42-${index}">
            <button type="button" onclick="CMSInvoiceRequest.editItem(${index});CMSInvoiceRequest.closeItemMenus()">แก้ไข</button>
            <button type="button" class="danger" onclick="CMSInvoiceRequest.removeItem(${index})">ลบ</button>
          </div>
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
      <div class="cmsInvoiceItemsV42 slim">${rows || '<div class="empty">ยังไม่มีรายการสินค้า</div>'}</div>
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

  function editItem(index){
    const item = state.items[index];
    if (!item) return;
    state.editingItemIndex = index;
    state.selectedProduct = {
      productId: item.productId || '',
      productCode: item.productCode || '',
      productName: item.productName || '',
      unit: item.unit || '',
      salePrice: item.salePrice ?? '',
      source: item.source || ''
    };
    state.productEntryErrors = {};
    renderForm();
    const name = document.getElementById('cmsNewProductNameV42');
    const qty = document.getElementById('cmsNewProductQtyV42');
    const unit = document.getElementById('cmsNewProductUnitV42');
    const price = document.getElementById('cmsNewProductPriceV42');
    if (name) name.value = item.productName || '';
    if (qty) qty.value = item.quantity ?? '';
    if (unit) unit.value = item.unit || '';
    if (price) price.value = item.salePrice ?? '';
    document.getElementById('cmsInvoiceProductEditorV42')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => qty?.focus(), 250);
  }

  function cancelEditItem(){
    state.editingItemIndex = -1;
    clearProductEntry();
    renderForm();
  }

  function focusItem(index){
    editItem(index);
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
    clearProductEntryErrors();
    if (!state.selectedProduct || normalizeUiText(value) !== normalizeUiText(state.selectedProduct.productName)) {
      state.selectedProduct = null;
    }
    searchProduct(value);
    showSimilar(value);
  }

  function fillProductEntry(product){
    clearProductEntryErrors();
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
    state.productEntryErrors = {};
    ['cmsNewProductNameV42', 'cmsNewProductQtyV42', 'cmsNewProductUnitV42', 'cmsNewProductPriceV42'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    hideProductSuggestions();
    const similar = document.getElementById('cmsSimilarBoxV42');
    if (similar) similar.innerHTML = '';
  }

  function hideProductSuggestions(){
    clearTimeout(state.productSearchTimer);
    const box = document.getElementById('cmsProductSuggestV42');
    if (!box) return;
    box.classList.remove('show', 'inlineHint');
    box.innerHTML = '';
    box.dataset.rows = '[]';
  }

  function clearProductEntryErrors(){
    if (!Object.keys(state.productEntryErrors || {}).length) return;
    state.productEntryErrors = {};
    setProductEntryErrors({});
  }

  function setProductEntryErrors(errors){
    state.productEntryErrors = errors || {};
    const map = {
      productName: 'cmsNewProductNameErrorV42',
      quantity: 'cmsNewProductQtyErrorV42',
      unit: 'cmsNewProductUnitErrorV42',
      salePrice: 'cmsNewProductPriceErrorV42'
    };
    Object.keys(map).forEach(key => {
      const el = document.getElementById(map[key]);
      if (el) el.textContent = state.productEntryErrors[key] || '';
    });
  }

  function focusFirstProductError(errors){
    const order = [
      ['productName', 'cmsNewProductNameV42'],
      ['quantity', 'cmsNewProductQtyV42'],
      ['unit', 'cmsNewProductUnitV42'],
      ['salePrice', 'cmsNewProductPriceV42']
    ];
    const pair = order.find(([key]) => errors && errors[key]);
    if (pair) setTimeout(() => document.getElementById(pair[1])?.focus(), 20);
  }

  function findExactProductByName(name){
    const key = normalizeUiText(name);
    if (!key) return null;
    return productSearch.searchProducts(name, 32).find(product => normalizeUiText(product.productName) === key || normalizeUiText(product.name) === key) || null;
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
      hideProductSuggestions();
      return;
    }
    const token = ++state.productSearchToken;
    clearTimeout(state.productSearchTimer);
    state.productSearchTimer = setTimeout(() => {
      if (token !== state.productSearchToken) return;
      const rows = productSearch.searchProducts(query, 24);
      box.classList.toggle('inlineHint', !rows.length);
      box.innerHTML = rows.length ? rows.map((product, index) => {
        return `<button type="button" onmousedown="CMSInvoiceRequest.addExistingProduct(${index})"><b>${esc(product.productName)}</b><small>${esc(product.productCode || '-')} | หน่วย ${esc(product.unit || '-')} | ราคาขาย ${product.salePrice == null ? '-' : money(product.salePrice)}</small></button>`;
      }).join('') : '<div class="cmsInvoiceProductHintV42"><b>ไม่พบสินค้าเดิม</b><small>กรอกจำนวน หน่วย และราคา แล้วกดเพิ่มเพื่อสร้าง Product Master ใหม่</small></div>';
      box.dataset.rows = JSON.stringify(rows);
      box.classList.toggle('show', !!normalizeUiText(query));
    }, 160);
  }

  function addExistingProduct(index){
    const box = document.getElementById('cmsProductSuggestV42');
    const rows = JSON.parse(box?.dataset.rows || '[]');
    const product = rows[index];
    if (!product) return;
    hideProductSuggestions();
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
      setProductEntryErrors(result.errors || {});
      focusFirstProductError(result.errors || {});
      return;
    }
    let product = selected;
    if (!product) {
      const exact = findExactProductByName(name);
      if (exact) {
        product = exact;
        item.productId = exact.productId;
        item.productCode = exact.productCode;
        item.productName = exact.productName;
        item.unit = unit || exact.unit;
        item.salePrice = salePrice || exact.salePrice;
        item.source = exact.source || 'existing-product-exact';
        item.isNewProduct = false;
      } else {
        const actor = { uid: sender().requestedByUid, by: sender().requestedByNickname, nickname: sender().requestedByNickname, branch: sender().requestedBranch };
        const payload = { productName: name, name, unit, salePrice, price: salePrice, createdFrom: 'employee-invoice-request', source: 'employee-invoice-request', costPrice: null };
        product = window.ChokAnanProductMaster && typeof window.ChokAnanProductMaster.createProductAsync === 'function'
          ? await window.ChokAnanProductMaster.createProductAsync(payload, actor)
          : (window.ChokAnanProductMaster && typeof window.ChokAnanProductMaster.createProduct === 'function'
            ? window.ChokAnanProductMaster.createProduct(payload, actor)
            : null);
        item.productId = product?.productId || product?.id || newId('product-missing-master');
        item.productCode = product?.productCode || product?.code || '';
        item.productName = product?.productName || name;
        item.source = product ? 'live-product-master-new' : 'new-product-local-fallback';
        try { window.dispatchEvent(new CustomEvent('chokanan-product-master-updated', { detail: { product, source: 'employee-invoice-request' } })); } catch (error) {}
      }
    }
    const editingIndex = Number.isInteger(state.editingItemIndex) ? state.editingItemIndex : -1;
    if (editingIndex >= 0 && state.items[editingIndex]) {
      const original = state.items[editingIndex];
      state.items[editingIndex] = {
        ...original,
        ...item,
        requestItemId: original.requestItemId || newId('req-item'),
        addedByUid: original.addedByUid || sender().requestedByUid,
        addedBy: original.addedBy || sender().requestedByNickname,
        addedAt: original.addedAt || nowIso(),
        updatedAt: nowIso()
      };
    } else {
      state.items.push({
        requestItemId: newId('req-item'),
        ...item,
        addedByUid: sender().requestedByUid,
        addedBy: sender().requestedByNickname,
        addedAt: nowIso()
      });
    }
    state.editingItemIndex = -1;
    state.validation = null;
    clearProductEntry();
    renderForm();
  }

  function productSearchKey(event){
    if (event.key === 'Escape') {
      hideProductSuggestions();
      return;
    }
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    const box = document.getElementById('cmsProductSuggestV42');
    const rows = JSON.parse(box?.dataset.rows || '[]');
    if (rows.length) {
      event.preventDefault();
      addExistingProduct(0);
    }
  }

  function productEntryDismissHandler(event){
    const target = event && event.target;
    if (!target) return;
    const wrap = document.getElementById('cmsProductSuggestV42')?.closest('.cmsInvoiceSuggestWrapV42');
    if (wrap && wrap.contains(target)) return;
    hideProductSuggestions();
  }

  function bindProductEntryDismiss(){
    if (state.productEntryDismissBound) return;
    state.productEntryDismissBound = true;
    document.addEventListener('click', productEntryDismissHandler, true);
    document.addEventListener('touchstart', productEntryDismissHandler, true);
    document.addEventListener('focusin', productEntryDismissHandler, true);
  }

  function requestIsReady(row){
    return normalizedStatus(row) === 'ready_to_print';
  }

  function thaiDateKey(value){
    if (!value) return '';
    let date = value;
    if (value && typeof value.toDate === 'function') date = value.toDate();
    if (!(date instanceof Date)) date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }

  function currentThaiDateKey(){
    return thaiDateKey(new Date());
  }

  function countArrayValue(row, keys){
    return keys.reduce((max, key) => {
      const value = row?.[key];
      return Math.max(max, Array.isArray(value) ? value.filter(Boolean).length : 0);
    }, 0);
  }

  function generatedInvoiceCount(row){
    return Math.max(
      countArrayValue(row, ['generatedInvoiceIds', 'nativeInvoiceIds', 'generatedInvoiceNumbers', 'invoiceIds', 'invoiceNumbers']),
      Number(row?.expectedInvoiceCount || 0),
      row?.invoiceNumber || row?.invoiceId || row?.no || row?.historyId ? 1 : 0
    );
  }

  function printedInvoiceCount(row){
    const explicit = Number(row?.printedInvoiceCount || row?.printedCount || row?.printCount || 0);
    if (explicit > 0) return explicit;
    const printedArray = countArrayValue(row, ['printedInvoiceIds', 'printedInvoiceNumbers']);
    if (printedArray > 0) return printedArray;
    const status = normalizedStatus(row);
    return row?.printed === true || status === 'printed' ? Math.max(generatedInvoiceCount(row), 1) : 0;
  }

  function printedTimestamp(row){
    return row?.printedAt || row?.printConfirmedAt || row?.trainingPrintedAt || row?.lastPrintedAt || row?.completedAt || '';
  }

  function isFullyPrinted(row){
    if (!row) return false;
    const status = normalizedStatus(row);
    if (status === 'partially_printed') return false;
    if (status !== 'printed' && row.printed !== true) return false;
    if (!printedTimestamp(row)) return false;
    const generated = generatedInvoiceCount(row);
    if (generated <= 0) return false;
    return printedInvoiceCount(row) >= generated;
  }

  function requestIsPrinted(row){
    return isFullyPrinted(row);
  }

  function requestVisibleInCurrentStatus(row){
    if (!isTestMode() && (!rowMatchesCurrentBranch(row) || requestHiddenFromStatus(row))) return false;
    if (isTestMode() && requestHiddenFromStatus(row)) return false;
    if (!isFullyPrinted(row)) return true;
    return thaiDateKey(printedTimestamp(row)) === currentThaiDateKey();
  }

  function requestCanPreview(row){
    if (!row) return false;
    const status = normalizedStatus(row);
    const rawStatus = text(row.status).toLowerCase();
    const rawPrintStatus = text(row.printStatus).toLowerCase();
    return status === 'ready_to_print'
      || status === 'printed'
      || status === 'partially_printed'
      || rawStatus === 'ready_to_print'
      || rawPrintStatus === 'ready_to_print';
  }

  function invoiceRecordKey(row){
    return String(row?.invoiceId || row?.historyId || row?.id || row?.invoiceNumber || row?.no || '').trim();
  }

  function invoiceRequestKey(row){
    return String(row?.sourceRequestId || row?.requestId || '').trim();
  }

  function invoiceIndex(row){
    return Number(row?.pageIndex || row?.invoiceIndex || row?.batchIndex || row?.sequenceInBatch || row?.chunkIndex || 1) || 1;
  }

  function invoiceTotalInRequest(row, request){
    return Number(row?.totalInvoicesInRequest || row?.totalInvoicesInBatch || row?.batchTotal || request?.expectedInvoiceCount || generatedInvoiceCount(request) || 1) || 1;
  }

  function invoiceItemCount(row){
    if (Array.isArray(row?.itemsSnapshot)) return row.itemsSnapshot.length;
    if (Array.isArray(row?.items)) return row.items.length;
    return Number(row?.itemsInThisInvoice || row?.itemCount || 0) || 0;
  }

  function invoiceCustomerName(row, request){
    return row?.customerName || row?.buyerName || row?.customerSnapshot?.customerName || request?.customerDisplayName || request?.customerSnapshot?.customerName || '-';
  }

  function invoiceStatusClass(row){
    const status = normalizedStatus(row);
    if (status === 'printed') return 'printed';
    if (status === 'ready_to_print') return 'ready';
    return status === 'partially_printed' ? 'partial' : '';
  }

  function invoiceStatusText(row){
    return normalizedStatus(row) === 'printed' ? 'สั่งพิมพ์แล้ว' : 'พร้อมพิมพ์';
  }

  function requestSortStamp(request){
    return String(request?.requestedAt || request?.createdAt || request?.updatedAt || '');
  }

  function statusDuplicateText(value){
    return String(value == null ? '' : value)
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[().,\-_/\\]/g, '');
  }

  function statusDuplicateItems(row){
    const items = Array.isArray(row?.items) ? row.items : (Array.isArray(row?.itemsSnapshot) ? row.itemsSnapshot : []);
    return items.map(item => [
      statusDuplicateText(item.productCode || item.code || ''),
      statusDuplicateText(item.productName || item.name || ''),
      Number(item.quantity ?? item.qty ?? 0),
      Number(item.salePrice ?? item.price ?? 0),
      statusDuplicateText(item.unit || '')
    ].join(':')).sort().join('|');
  }

  function statusDuplicateKey(invoice, request){
    const requestNumber = String(
      invoice?.requestNumber ||
      invoice?.sourceRequestNumber ||
      request?.requestNumber ||
      ''
    ).trim();

    const requestId = String(
      invoice?.sourceRequestId ||
      invoice?.requestId ||
      request?.requestId ||
      request?.id ||
      ''
    ).trim();

    const customerTax = String(
      invoice?.buyerTax ||
      invoice?.customerSnapshot?.taxId ||
      invoice?.customerSnapshot?.customerTaxId ||
      request?.customerSnapshot?.taxId ||
      request?.customerSnapshot?.customerTaxId ||
      ''
    ).replace(/\D/g, '');

    const customerName = statusDuplicateText(
      invoice?.buyerName ||
      invoice?.customerSnapshot?.customerName ||
      invoice?.customerSnapshot?.companyName ||
      request?.customerDisplayName ||
      request?.customerSnapshot?.customerName ||
      request?.customerSnapshot?.companyName ||
      ''
    );

    const total = Number(invoice?.grandTotal ?? invoice?.total ?? request?.grandTotal ?? request?.subtotalPreview ?? 0);
    const itemCount = Number(invoiceItemCount(invoice) || request?.itemCount || 0);
    const date = previewDateKey(invoice?.invoiceDate || invoice?.date || invoice?.createdAt || request?.requestedAt || '');
    const items = statusDuplicateItems(invoice);

    // The request number/id identifies the business action, while the remaining
    // fields prevent legitimate multi-invoice splits from being collapsed.
    const requestPart = requestNumber || requestId || 'NO_REQUEST';
    return [
      requestPart,
      customerTax,
      customerName,
      Number.isFinite(total) ? total.toFixed(2) : '0.00',
      itemCount,
      date,
      items
    ].join('||');
  }

  function statusRecordPriority(pair){
    const status = normalizedStatus(pair.invoice);
    const statusRank = status === 'printed' ? 30 : status === 'partially_printed' ? 20 : status === 'ready_to_print' ? 10 : 0;
    const linkedRank = (pair.invoice?.sourceRequestId || pair.invoice?.requestId) ? 5 : 0;
    const itemRank = Array.isArray(pair.invoice?.items) ? Math.min(pair.invoice.items.length, 9) : 0;
    const timestamp = Date.parse(
      printedTimestamp(pair.invoice) ||
      pair.invoice?.updatedAt ||
      pair.invoice?.createdAt ||
      pair.invoice?.invoiceDate ||
      ''
    ) || 0;
    return { statusRank, linkedRank, itemRank, timestamp };
  }

  function preferStatusRecord(current, candidate){
    if (!current) return candidate;
    const a = statusRecordPriority(current);
    const b = statusRecordPriority(candidate);
    if (b.statusRank !== a.statusRank) return b.statusRank > a.statusRank ? candidate : current;
    if (b.linkedRank !== a.linkedRank) return b.linkedRank > a.linkedRank ? candidate : current;
    if (b.itemRank !== a.itemRank) return b.itemRank > a.itemRank ? candidate : current;
    return b.timestamp >= a.timestamp ? candidate : current;
  }

  function dedupeStatusPairs(pairs){
    const unique = new Map();
    for (const pair of pairs || []) {
      const key = statusDuplicateKey(pair.invoice, pair.request);
      unique.set(key, preferStatusRecord(unique.get(key), pair));
    }
    return [...unique.values()];
  }

  function mobileStatusInvoiceRows(){
    const requests = new Map((isTestMode() ? store.listRequests() : store.listProductionRequests()).map(row => [String(row.requestId || ''), row]));
    const pairs = readMobileHistory()
      .filter(row => {
        const status = normalizedStatus(row);
        if (status === 'printed') return thaiDateKey(printedTimestamp(row)) === currentThaiDateKey();
        return status === 'ready_to_print' || status === 'partially_printed';
      })
      .map(row => ({ invoice: row, request: requests.get(invoiceRequestKey(row)) || {} }))
      .filter(pair => isTestMode() || pairMatchesCurrentBranch(pair))
      .filter(pair => !pairHiddenFromStatus(pair, true));

    return dedupeStatusPairs(pairs).sort((a, b) =>
      requestSortStamp(b.request).localeCompare(requestSortStamp(a.request)) ||
      invoiceIndex(a.invoice) - invoiceIndex(b.invoice) ||
      String(a.invoice.invoiceNumber || a.invoice.no || '').localeCompare(String(b.invoice.invoiceNumber || b.invoice.no || ''))
    );
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
    if (status === 'printed') return 'สั่งพิมพ์แล้ว';
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
    if (!sync.firestoreReady() || !window.db) return;
    const branchKey = currentBranchKey();
    if (!branchKey) return;
    if (state.realtimeBound && state.realtimeBranchKey === branchKey) return;
    state.realtimeUnsubs.splice(0).forEach(unsub => {
      try { if (typeof unsub === 'function') unsub(); } catch (_) {}
    });
    state.realtimeBound = true;
    state.realtimeBranchKey = branchKey;
    const rerender = () => {
      const active = document.querySelector('#cmsInvoiceRequestStatusPageV42.active, #cmsInvoiceRequestHistoryPageV42.active');
      if (!active) return;
      if (active.id === 'cmsInvoiceRequestStatusPageV42') renderStatus();
      if (active.id === 'cmsInvoiceRequestHistoryPageV42') renderHistory();
    };
    state.realtimeUnsubs.push(window.db.collection('invoiceRequests').onSnapshot(snapshot => {
      snapshot.forEach(doc => {
        const data = { ...(doc.data ? doc.data() : doc), requestId: doc.id || doc.requestId };
        if (rowMatchesCurrentBranch(data)) saveRequestSnapshotFromDoc(doc);
      });
      rerender();
    }, error => console.warn('[invoice-request] request listener failed', error)));
    state.realtimeUnsubs.push(window.db.collection('taxInvoices').onSnapshot(snapshot => {
      const requestIds = new Set((isTestMode() ? store.listRequests() : store.listProductionRequests())
        .filter(rowMatchesCurrentBranch)
        .map(row => String(row.requestId || row.id || '').trim()).filter(Boolean));
      const rows = [];
      snapshot.forEach(doc => {
        const data = { ...(doc.data() || {}), invoiceId: (doc.data() || {}).invoiceId || doc.id, historyId: doc.id };
        const sourceRequestId = String(data.sourceRequestId || data.requestId || '').trim();
        const request = sourceRequestId ? store.listProductionRequests().find(item => String(item.requestId || item.id || '').trim() === sourceRequestId) : null;
        if (rowMatchesCurrentBranch(data) || (sourceRequestId && requestIds.has(sourceRequestId)) || pairMatchesCurrentBranch({ invoice: data, request })) rows.push(data);
      });
      localStorage.setItem(TAX_INVOICE_HISTORY_KEY, JSON.stringify(rows));
      // Repair legacy request snapshots whose generatedInvoiceIds were never written back by the desktop app.
      // A matching taxInvoices document is the source of truth that generation is complete.
      const requestUpdates = new Map();
      rows.forEach(invoice => {
        const requestId = String(invoice.sourceRequestId || invoice.requestId || '').trim();
        if (!requestId) return;
        const current = requestUpdates.get(requestId) || { ids: [], numbers: [] };
        const invoiceId = String(invoice.invoiceId || invoice.historyId || invoice.id || '').trim();
        const invoiceNumber = String(invoice.invoiceNumber || invoice.no || '').trim();
        if (invoiceId && !current.ids.includes(invoiceId)) current.ids.push(invoiceId);
        if (invoiceNumber && !current.numbers.includes(invoiceNumber)) current.numbers.push(invoiceNumber);
        requestUpdates.set(requestId, current);
      });
      const productionRows = store.listProductionRequests();
      requestUpdates.forEach((value, requestId) => {
        const request = productionRows.find(item => String(item.requestId || item.id || '').trim() === requestId);
        if (!request) return;
        store.saveProductionRequest({
          ...request,
          requestId,
          generationState: 'completed',
          importedToNativeHistory: true,
          generatedInvoiceIds: value.ids,
          nativeInvoiceIds: value.ids,
          generatedInvoiceNumbers: value.numbers,
          status: request.status === 'printed' ? 'printed' : 'ready_to_print',
          printStatus: request.printStatus === 'printed' ? 'printed' : 'ready_to_print'
        });
      });
      rerender();
    }, error => console.warn('[invoice-request] taxInvoices listener failed', error)));
  }

  function renderStatus(){
    ensurePages();
    bindRealtime();
    const rows = (isTestMode() ? store.listRequests() : store.listProductionRequests()).filter(requestVisibleInCurrentStatus);
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
    const hasGeneratedInvoice = (Array.isArray(row.generatedInvoiceIds) && row.generatedInvoiceIds.length)
      || (Array.isArray(row.generatedInvoiceNumbers) && row.generatedInvoiceNumbers.length)
      || generatedInvoiceCount(row) > 0
      || row.importedToNativeHistory === true;
    const preview = requestCanPreview(row)
      ? `<button class="cmsInvoicePreviewButtonV42" style="width:100%;margin-top:10px" onclick="CMSInvoiceRequest.openPreview('${esc(row.requestId)}')">ดูตัวอย่างใบกำกับภาษี</button>`
      : '';
    const action = canGenerateInvoice(row)
      ? `<button class="cmsInvoiceSecondaryV42" style="width:100%;margin-top:10px" onclick="CMSInvoiceRequest.generateInvoice('${esc(row.requestId)}')">สร้างใบกำกับ</button>`
      : '';
    return `<div class="cmsInvoiceListRowV42"><b>${esc(row.requestNumber || row.requestId)}</b><span class="cmsInvoiceListMetaV42">ลูกค้า: ${esc(row.customerDisplayName || row.customerSnapshot?.customerName || '-')}<br>เวลา: ${esc(row.requestedAt || row.sender?.requestedAt || '-')}<br>รายการ: ${row.itemCount || 0} | คาดว่า ${row.expectedInvoiceCount || 0} ใบ | ยอด ${money(row.grandTotal || row.subtotalPreview)}<br>สถานะ: <strong class="cmsInvoiceStatusTextV42 ${statusClass(row)}">${esc(statusText(row))}</strong>${generated}</span>${preview}${action}</div>`;
  }

  function statusInvoiceRowHtml(invoice, request){
    const key = invoiceRecordKey(invoice);
    const index = invoiceIndex(invoice);
    const total = invoiceTotalInRequest(invoice, request);
    const requestNumber = invoice.requestNumber || invoice.sourceRequestNumber || request.requestNumber || invoice.sourceRequestId || invoice.requestId || '-';
    return `<div class="cmsInvoiceListRowV42"><b>${esc(requestNumber)}</b><span class="cmsInvoiceListMetaV42">เลขใบกำกับภาษี: ${esc(invoice.invoiceNumber || invoice.no || key || '-')}<br>ใบที่ ${index}/${total}<br>ลูกค้า: ${esc(invoiceCustomerName(invoice, request))}<br>รายการในใบนี้: ${invoiceItemCount(invoice)} | ยอด ${money(invoice.grandTotal || invoice.total)}<br>สถานะ: <strong class="cmsInvoiceStatusTextV42 ${invoiceStatusClass(invoice)}">${esc(invoiceStatusText(invoice))}</strong></span><button class="cmsInvoicePreviewButtonV42" style="width:100%;margin-top:10px" onclick="CMSInvoiceRequest.openPreview('${esc(key)}', 'invoice')">ดูตัวอย่างใบกำกับภาษี</button></div>`;
  }

  function renderStatus(){
    ensurePages();
    bindRealtime();
    const invoiceRows = mobileStatusInvoiceRows();
    const rows = invoiceRows.length ? [] : (isTestMode() ? store.listRequests() : store.listProductionRequests())
      .filter(requestVisibleInCurrentStatus)
      .filter(request => !requestHiddenFromStatus(request));
    document.getElementById('cmsInvoiceRequestStatusPageV42').innerHTML = [
      header('สถานะใบกำกับภาษี', isTestMode() ? 'Test Mode' : 'อัปเดตจาก taxInvoices แบบ realtime'),
      '<div class="cmsInvoicePageMoreWrapV42"><button type="button" class="cmsInvoicePageMoreV42" onclick="CMSInvoiceRequest.toggleStatusMore(event)" aria-label="เมนูเพิ่มเติม">⋮</button><div class="cmsInvoicePageMoreMenuV42" id="cmsInvoiceStatusMoreMenuV42"><button type="button" onclick="CMSInvoiceRequest.openClearStatusDialog()">ล้างสถานะ</button><button type="button" class="danger" onclick="CMSInvoiceRequest.openClearAllDialog()">ล้างประวัติทั้งหมด</button></div></div>',
      '<div class="cmsInvoiceListV42">',
      invoiceRows.length ? invoiceRows.map(pair => statusInvoiceRowHtml(pair.invoice, pair.request)).join('') : (rows.length ? rows.map(row => statusRowHtml(row)).join('') : '<div class="empty">ยังไม่มีใบกำกับภาษีในสถานะปัจจุบัน</div>'),
      '</div>'
    ].join('');
  }

  function renderHistory(){
    ensurePages();
    bindRealtime();
    const requestMap = new Map((isTestMode() ? store.listRequests() : store.listProductionRequests()).map(row => [String(row.requestId || ''), row]));
    const rows = dedupeStatusPairs(
      readMobileHistory()
        .filter(isFullyPrinted)
        .map(invoice => ({ invoice, request: requestMap.get(invoiceRequestKey(invoice)) || {} }))
        .filter(pair => isTestMode() || pairMatchesCurrentBranch(pair))
        .filter(pair => !pairHiddenFromStatus(pair, false))
    ).map(pair => pair.invoice)
      .sort((a,b)=>String(printedTimestamp(b)||b.updatedAt||b.createdAt||'').localeCompare(String(printedTimestamp(a)||a.updatedAt||a.createdAt||'')));
    document.getElementById('cmsInvoiceRequestHistoryPageV42').innerHTML = [
      header('ประวัติใบกำกับภาษี', 'อ่านจาก taxInvoices ฐานกลาง'),
      '<div class="cmsInvoiceListV42">',
      rows.length ? rows.map(row => `<div class="cmsInvoiceListRowV42"><b>${esc(row.invoiceNumber || row.no || row.historyId || '-')}</b><span class="cmsInvoiceListMetaV42">ลูกค้า: ${esc(row.customerSnapshot?.customerName || row.buyerName || '-')}<br>ยอดรวม: ${money(row.grandTotal || row.total)}<br>สถานะ: <strong class="cmsInvoiceStatusTextV42 printed">สั่งพิมพ์แล้ว</strong></span></div>`).join('') : '<div class="empty">ยังไม่มีประวัติใบกำกับภาษีจากฐานกลาง</div>',
      '</div>'
    ].join('');
  }

  function renderHistory(){
    ensurePages();
    bindRealtime();
    const requestMap = new Map((isTestMode() ? store.listRequests() : store.listProductionRequests()).map(row => [String(row.requestId || ''), row]));
    const rows = dedupeStatusPairs(
      readMobileHistory()
        .filter(isFullyPrinted)
        .map(invoice => ({ invoice, request: requestMap.get(invoiceRequestKey(invoice)) || {} }))
        .filter(pair => isTestMode() || pairMatchesCurrentBranch(pair))
        .filter(pair => !pairHiddenFromStatus(pair, false))
    ).map(pair => pair.invoice)
      .sort((a,b)=>String(printedTimestamp(b)||b.updatedAt||b.createdAt||'').localeCompare(String(printedTimestamp(a)||a.updatedAt||a.createdAt||'')));
    document.getElementById('cmsInvoiceRequestHistoryPageV42').innerHTML = [
      header('ประวัติใบกำกับภาษี', 'อ่านจาก taxInvoices ฐานกลาง'),
      '<div class="cmsInvoiceListV42">',
      rows.length ? rows.map(row => {
        const key = invoiceRecordKey(row);
        return `<div class="cmsInvoiceListRowV42"><b>${esc(row.invoiceNumber || row.no || row.historyId || '-')}</b><span class="cmsInvoiceListMetaV42">ลูกค้า: ${esc(row.customerSnapshot?.customerName || row.buyerName || '-')}<br>ยอดรวม: ${money(row.grandTotal || row.total)}<br>สถานะ: <strong class="cmsInvoiceStatusTextV42 printed">สั่งพิมพ์แล้ว</strong></span><button class="cmsInvoicePreviewButtonV42" style="width:100%;margin-top:10px" onclick="CMSInvoiceRequest.openPreview('${esc(key)}', 'invoice')">ดูตัวอย่างใบกำกับภาษี</button></div>`;
      }).join('') : '<div class="empty">ยังไม่มีประวัติใบกำกับภาษีจากฐานกลาง</div>',
      '</div>'
    ].join('');
  }

  function openStatus(){ renderStatus(); showPage('cmsInvoiceRequestStatusPageV42'); }
  function openHistory(){ renderHistory(); showPage('cmsInvoiceRequestHistoryPageV42'); }

  function previewComparableText(value){
    return String(value == null ? '' : value)
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[().,\-_/\\]/g, '');
  }

  function previewRequestNumber(row){
    return String(row?.requestNumber || row?.sourceRequestNumber || '').trim();
  }

  function previewCustomerTax(row){
    return String(
      row?.buyerTax ||
      row?.customerSnapshot?.taxId ||
      row?.customerSnapshot?.customerTaxId ||
      row?.customer?.taxId ||
      row?.customer?.customerTaxId ||
      ''
    ).replace(/\D/g, '');
  }

  function previewCustomerName(row){
    return previewComparableText(
      row?.buyerName ||
      row?.customerDisplayName ||
      row?.customerSnapshot?.customerName ||
      row?.customerSnapshot?.companyName ||
      row?.customer?.customerName ||
      row?.customer?.companyName ||
      ''
    );
  }

  function previewGrandTotal(row){
    const value = Number(row?.grandTotal ?? row?.total ?? row?.subtotalPreview ?? 0);
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
  }

  function previewDateKey(value){
    const raw = String(value || '').trim();
    if (!raw) return '';
    const direct = raw.match(/^\d{4}-\d{2}-\d{2}/);
    if (direct) return direct[0];
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }

  function invoiceMatchesPreviewRequest(invoice, row){
    const requestId = String(row?.requestId || row?.id || '').trim();
    const requestNumber = previewRequestNumber(row);
    const sourceId = String(invoice?.sourceRequestId || invoice?.requestId || invoice?.employeeRequestId || '').trim();
    const sourceNumber = String(invoice?.sourceRequestNumber || invoice?.requestNumber || '').trim();

    if (requestId && sourceId === requestId) return true;
    if (requestNumber && sourceNumber === requestNumber) return true;

    const requestTax = previewCustomerTax(row);
    const invoiceTax = previewCustomerTax(invoice);
    const requestName = previewCustomerName(row);
    const invoiceName = previewCustomerName(invoice);
    const requestTotal = previewGrandTotal(row);
    const invoiceTotal = previewGrandTotal(invoice);
    const requestDate = previewDateKey(row?.requestedAt || row?.createdAt || row?.updatedAt);
    const invoiceDate = previewDateKey(invoice?.invoiceDate || invoice?.date || invoice?.createdAt || invoice?.updatedAt);

    let score = 0;
    if (requestTax && invoiceTax && requestTax === invoiceTax) score += 5;
    if (requestName && invoiceName && (requestName === invoiceName || requestName.includes(invoiceName) || invoiceName.includes(requestName))) score += 3;
    if (requestTotal > 0 && invoiceTotal > 0 && Math.abs(requestTotal - invoiceTotal) < 0.01) score += 4;
    if (requestDate && invoiceDate && requestDate === invoiceDate) score += 2;

    // Customer identity + total is strong enough to identify the generated bill.
    return score >= 7;
  }

  function requestSnapshotPreviewInvoice(row){
    const items = Array.isArray(row?.items) ? row.items : [];
    const customer = row?.customerSnapshot || row?.customer || {};
    const invoiceNumber = Array.isArray(row?.generatedInvoiceNumbers) && row.generatedInvoiceNumbers[0]
      ? row.generatedInvoiceNumbers[0]
      : (row?.invoiceNumber || row?.no || '');
    return {
      invoiceId: `request-preview-${row?.requestId || row?.id || Date.now()}`,
      sourceRequestId: row?.requestId || row?.id || '',
      sourceRequestNumber: row?.requestNumber || '',
      requestId: row?.requestId || row?.id || '',
      requestNumber: row?.requestNumber || '',
      invoiceNumber,
      no: invoiceNumber,
      invoiceDate: previewDateKey(row?.updatedAt || row?.requestedAt || new Date().toISOString()),
      date: previewDateKey(row?.updatedAt || row?.requestedAt || new Date().toISOString()),
      invoiceType: row?.invoiceSettings?.invoiceType === 'full-tax-invoice' ? 'ใบกำกับภาษีเต็ม' : (row?.invoiceType || 'ใบกำกับภาษีเต็ม'),
      type: row?.invoiceSettings?.invoiceType === 'full-tax-invoice' ? 'ใบกำกับภาษีเต็ม' : (row?.invoiceType || 'ใบกำกับภาษีเต็ม'),
      paperSize: row?.invoiceSettings?.paperSize || row?.paperSize || '9x11',
      vatMode: row?.invoiceSettings?.vatMode || row?.vatMode || 'excluded',
      buyerName: row?.customerDisplayName || [customer.prefix, customer.customerName || customer.companyName].filter(Boolean).join(' ').trim(),
      buyerTax: customer.taxId || customer.customerTaxId || '',
      buyerAddress: customer.address || customer.customerAddress || [customer.address1, customer.address2].filter(Boolean).join(' '),
      buyerAddress1: customer.address1 || '',
      buyerAddress2: customer.address2 || '',
      customerSnapshot: customer,
      items: items.map(item => ({
        ...item,
        name: item.name || item.productName || '',
        productName: item.productName || item.name || '',
        qty: item.qty ?? item.quantity ?? 0,
        quantity: item.quantity ?? item.qty ?? 0,
        price: item.price ?? item.salePrice ?? 0,
        salePrice: item.salePrice ?? item.price ?? 0
      })),
      subtotal: Number(row?.subtotal ?? row?.subtotalPreview ?? 0),
      beforeVat: Number(row?.subtotal ?? row?.subtotalPreview ?? 0),
      vatAmount: Number(row?.vatAmount ?? 0),
      grandTotal: Number(row?.grandTotal ?? 0),
      total: Number(row?.grandTotal ?? 0),
      printStatus: row?.printStatus || row?.status || 'ready_to_print',
      status: row?.status || 'ready_to_print',
      previewSource: 'request-snapshot-fallback'
    };
  }

  function previewInvoiceMatchScore(invoice, row){
    if (!invoice || !row) return -1;

    const requestId = String(row.requestId || row.id || '').trim();
    const requestNumber = previewRequestNumber(row);
    const invoiceSourceId = String(invoice.sourceRequestId || invoice.requestId || invoice.employeeRequestId || '').trim();
    const invoiceSourceNumber = String(invoice.sourceRequestNumber || invoice.requestNumber || '').trim();

    const wantedIds = [
      ...(Array.isArray(row.generatedInvoiceIds) ? row.generatedInvoiceIds : []),
      ...(Array.isArray(row.nativeInvoiceIds) ? row.nativeInvoiceIds : []),
      ...(Array.isArray(row.invoiceIds) ? row.invoiceIds : [])
    ].map(String).map(v => v.trim()).filter(Boolean);

    const wantedNumbers = [
      ...(Array.isArray(row.generatedInvoiceNumbers) ? row.generatedInvoiceNumbers : []),
      ...(Array.isArray(row.invoiceNumbers) ? row.invoiceNumbers : [])
    ].map(String).map(v => v.trim().toUpperCase()).filter(Boolean);

    const invoiceId = String(invoiceRecordKey(invoice) || invoice.invoiceId || invoice.id || '').trim();
    const invoiceNo = String(invoice.invoiceNumber || invoice.no || invoice.No || '').trim().toUpperCase();

    if (requestId && invoiceSourceId === requestId) return 1000;
    if (requestNumber && invoiceSourceNumber === requestNumber) return 900;
    if (wantedIds.includes(invoiceId)) return 800;
    if (wantedNumbers.includes(invoiceNo)) return 700;
    if (invoiceMatchesPreviewRequest(invoice, row)) return 100;
    return -1;
  }

  function selectBestPreviewInvoices(rows, row){
    const expected = Math.max(
      1,
      Number(row?.expectedInvoiceCount || row?.invoiceCount || 1) || 1
    );

    const ranked = mergePreviewInvoiceRows(rows)
      .map(invoice => ({ invoice, score: previewInvoiceMatchScore(invoice, row) }))
      .filter(item => item.score >= 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aTime = Date.parse(a.invoice.updatedAt || a.invoice.createdAt || a.invoice.invoiceDate || '') || 0;
        const bTime = Date.parse(b.invoice.updatedAt || b.invoice.createdAt || b.invoice.invoiceDate || '') || 0;
        return bTime - aTime;
      });

    if (!ranked.length) return [];

    // When an exact request-linked invoice exists, never mix in fuzzy legacy matches.
    const bestScore = ranked[0].score;
    const minimumAcceptedScore = bestScore >= 800 ? 700 : bestScore;
    return ranked
      .filter(item => item.score >= minimumAcceptedScore)
      .slice(0, expected)
      .map(item => item.invoice);
  }

  async function fetchPreviewInvoices(row){
    if (!row) return [];

    const requestId = String(row.requestId || row.id || row.sourceRequestId || '').trim();
    const requestNumber = previewRequestNumber(row);
    const invoiceIds = [
      ...(Array.isArray(row.generatedInvoiceIds) ? row.generatedInvoiceIds : []),
      ...(Array.isArray(row.nativeInvoiceIds) ? row.nativeInvoiceIds : []),
      ...(Array.isArray(row.invoiceIds) ? row.invoiceIds : [])
    ].map(String).map(value => value.trim()).filter(Boolean);
    const invoiceNumbers = [
      ...(Array.isArray(row.generatedInvoiceNumbers) ? row.generatedInvoiceNumbers : []),
      ...(Array.isArray(row.invoiceNumbers) ? row.invoiceNumbers : [])
    ].map(String).map(value => value.trim()).filter(Boolean);

    const embedded = [];
    for (const value of [row.generatedInvoices, row.invoices, row.invoiceSnapshots, row.nativeInvoices]) {
      if (Array.isArray(value)) embedded.push(...value.filter(item => item && typeof item === 'object'));
    }

    // Fast path: use the realtime cache already downloaded by the listener.
    const cached = readMobileHistory().filter(invoice => {
      const no = String(invoice.invoiceNumber || invoice.no || '').trim();
      const id = String(invoiceRecordKey(invoice) || '').trim();
      return invoiceMatchesPreviewRequest(invoice, row) || invoiceIds.includes(id) || invoiceNumbers.includes(no);
    });
    const fastRows = selectBestPreviewInvoices([...embedded, ...cached], row);
    if (fastRows.length) return fastRows;

    if (!sync.firestoreReady() || !window.db) {
      return [requestSnapshotPreviewInvoice(row)];
    }

    const remote = [];
    const addQuery = snap => {
      if (snap && Array.isArray(snap.docs)) {
        snap.docs.forEach(doc => remote.push({ ...(doc.data() || {}), invoiceId: (doc.data() || {}).invoiceId || doc.id, historyId: doc.id }));
      }
    };
    const addDoc = snap => {
      if (snap && snap.exists) remote.push({ ...(snap.data() || {}), invoiceId: (snap.data() || {}).invoiceId || snap.id, historyId: snap.id });
    };

    const jobs = [];
    invoiceIds.slice(0, 20).forEach(id => {
      jobs.push(window.db.collection('taxInvoices').doc(id).get().then(addDoc).catch(() => {}));
    });
    if (requestId) {
      jobs.push(window.db.collection('taxInvoices').where('sourceRequestId', '==', requestId).get().then(addQuery).catch(() => {}));
      jobs.push(window.db.collection('taxInvoices').where('requestId', '==', requestId).get().then(addQuery).catch(() => {}));
    }
    if (requestNumber) {
      jobs.push(window.db.collection('taxInvoices').where('sourceRequestNumber', '==', requestNumber).get().then(addQuery).catch(() => {}));
      jobs.push(window.db.collection('taxInvoices').where('requestNumber', '==', requestNumber).get().then(addQuery).catch(() => {}));
    }
    invoiceNumbers.slice(0, 10).forEach(number => {
      jobs.push(window.db.collection('taxInvoices').where('invoiceNumber', '==', number).get().then(addQuery).catch(() => {}));
      jobs.push(window.db.collection('taxInvoices').where('no', '==', number).get().then(addQuery).catch(() => {}));
    });

    await Promise.all(jobs);
    let matched = selectBestPreviewInvoices(remote.filter(invoice =>
      invoiceMatchesPreviewRequest(invoice, row)
      || invoiceIds.includes(invoiceRecordKey(invoice))
      || invoiceNumbers.includes(String(invoice.invoiceNumber || invoice.no || '').trim())
    ), row);
    if (matched.length) return matched;

    // One final collection read for legacy documents that omitted request-link fields.
    try {
      const allSnap = await window.db.collection('taxInvoices').get();
      const legacyMatches = [];
      (allSnap.docs || []).forEach(doc => {
        const data = { ...(doc.data() || {}), invoiceId: (doc.data() || {}).invoiceId || doc.id, historyId: doc.id };
        if (invoiceMatchesPreviewRequest(data, row)) legacyMatches.push(data);
      });
      matched = selectBestPreviewInvoices(legacyMatches, row);
      if (matched.length) return matched;
    } catch (error) {
      console.warn('[invoice-request] preview legacy matching failed', error);
    }

    // Never show a dead modal when the request already says the bill is ready.
    // The request contains customer/items/totals and can render a faithful preview
    // while the next realtime sync repairs the direct taxInvoices link.
    return [requestSnapshotPreviewInvoice(row)];
  }

  function mergePreviewInvoiceRows(rows){
    const merged = new Map();

    for (const invoice of (rows || [])) {
      if (!invoice || typeof invoice !== 'object') continue;

      const invoiceNo = String(invoice.invoiceNumber || invoice.no || invoice.No || '').trim().toUpperCase();
      const requestId = String(invoice.sourceRequestId || invoice.requestId || invoice.employeeRequestId || '').trim();
      const recordId = String(invoiceRecordKey(invoice) || invoice.invoiceId || invoice.id || '').trim();

      // One real invoice may be present under Firestore document id, invoiceId,
      // realtime cache and request snapshot. Prefer invoice number as the stable key.
      const key = invoiceNo
        ? `NO:${invoiceNo}`
        : requestId
          ? `REQ:${requestId}:${previewGrandTotal(invoice)}`
          : `ID:${recordId}`;

      if (!key || key === 'ID:') continue;

      const previous = merged.get(key);
      if (!previous) {
        merged.set(key, invoice);
        continue;
      }

      const previousScore =
        (Array.isArray(previous.items) ? previous.items.length : 0) * 10 +
        (previous.invoiceNumber || previous.no ? 5 : 0) +
        (previous.sourceRequestId || previous.requestId ? 3 : 0) +
        (previous.previewSource === 'request-snapshot-fallback' ? -20 : 0);

      const currentScore =
        (Array.isArray(invoice.items) ? invoice.items.length : 0) * 10 +
        (invoice.invoiceNumber || invoice.no ? 5 : 0) +
        (invoice.sourceRequestId || invoice.requestId ? 3 : 0) +
        (invoice.previewSource === 'request-snapshot-fallback' ? -20 : 0);

      if (currentScore > previousScore) merged.set(key, { ...previous, ...invoice });
      else merged.set(key, { ...invoice, ...previous });
    }

    const result = [...merged.values()].sort((a,b)=>invoiceIndex(a)-invoiceIndex(b));
    result.forEach(saveMobileHistory);
    return result;
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
    const pageLabel = `<div class="cmsInvoicePreviewPageHeadV42"><div class="cmsInvoicePreviewPageLabelV42">${totalCount > 1 ? `ใบที่ ${index + 1}` : `เลขที่ ${esc(invoiceNo)}`}</div><button class="cmsInvoiceExportOneV42" onclick="CMSInvoiceRequest.exportPreviewOne(${index})">ส่งออกรูปนี้</button></div>`;
    return `<article class="cmsInvoicePreviewSheetV42" data-preview-index="${index}" data-invoice-no="${esc(invoiceNo)}">
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

  async function openPreview(requestId, mode='request'){
    const row = mode === 'invoice'
      ? readMobileHistory().find(item => invoiceRecordKey(item) === String(requestId))
      : store.listProductionRequests().find(item => String(item.requestId || item.id || '').trim() === String(requestId).trim());
    if (!row) return alert('ไม่พบข้อมูลใบกำกับภาษี');
    if (mode !== 'invoice' && !requestCanPreview(row)) return alert('เปิด Preview ได้เฉพาะสถานะพร้อมพิมพ์หรือพิมพ์แล้ว');
    try {
      const invoices = mode === 'invoice' ? [row] : await fetchPreviewInvoices(row);
      const previewRequest = mode === 'invoice' ? { requestId: invoiceRequestKey(row), requestNumber: row.requestNumber || row.sourceRequestNumber || '' } : row;
      const payload = window.ChokAnanInvoicePreviewService && typeof window.ChokAnanInvoicePreviewService.requestPreviewPayload === 'function'
        ? window.ChokAnanInvoicePreviewService.requestPreviewPayload(previewRequest, invoices)
        : { invoices };
      const modal = document.getElementById('cmsInvoicePreviewModalV42') || document.createElement('div');
      modal.id = 'cmsInvoicePreviewModalV42';
      modal.className = 'cmsInvoicePreviewModalV42';
      modal.innerHTML = `<div class="cmsInvoicePreviewTopActionsV42"><button class="cmsInvoiceExportAllV42" onclick="CMSInvoiceRequest.exportPreviewAll()">ส่งออกทั้งชุด</button><button class="cmsInvoicePreviewCloseV42" onclick="CMSInvoiceRequest.closePreview()" aria-label="ปิด">X</button></div><div class="cmsInvoicePreviewScrollV42">${payload.invoices.length ? payload.invoices.map((invoice, index) => previewInvoiceHtml(invoice, index, payload.invoices.length)).join('') : `<div class="cmsInvoicePreviewEmptyV42">ยังไม่พบข้อมูลบิลจริงในฐานกลางสำหรับ ${esc(previewRequest.requestNumber || previewRequest.requestId || 'คำขอนี้')}</div>`}</div>`;
      if (!modal.parentElement) document.body.appendChild(modal);
      document.documentElement.classList.add('cmsInvoicePreviewOpenV42');
    } catch (error) {
      alert(`เปิด Preview ไม่สำเร็จ: ${error.message || error}`);
    }
  }

  function previewFileName(sheet, index){
    const raw = String(sheet?.dataset?.invoiceNo || `invoice-${index + 1}`);
    return raw.replace(/[\/:*?"<>|]+/g, '-').trim() || `invoice-${index + 1}`;
  }

  async function capturePreviewPaper(paper){
    if (!paper) throw new Error('ไม่พบตัวอย่างใบกำกับภาษี');
    if (typeof window.captureExportPaper === 'function') return window.captureExportPaper(paper);
    if (window.html2canvas) {
      const canvas = await window.html2canvas(paper, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('สร้างรูปภาพไม่สำเร็จ')), 'image/png'));
    }
    throw new Error('ระบบสร้างรูปภาพยังไม่พร้อม กรุณารีโหลดแอป');
  }

  let previewShareBusy = false;

  async function downloadPreviewFiles(files){
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2500);
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }

  async function saveOrSharePreviewFiles(files){
    if (!files.length) return;

    // file:// and desktop browsers are unreliable with Web Share files.
    // Download PNG directly there. On a real mobile HTTPS/PWA session, use Share.
    const canUseShare = location.protocol !== 'file:'
      && !previewShareBusy
      && navigator.share
      && navigator.canShare
      && navigator.canShare({ files });

    if (canUseShare) {
      previewShareBusy = true;
      try {
        await navigator.share({ files, title: 'ใบกำกับภาษี' });
        return;
      } catch (error) {
        // User cancellation is not an export failure.
        if (error && error.name === 'AbortError') return;

        // InvalidStateError means another share sheet is still open.
        // Fall back to download instead of showing a dead-end alert.
        console.warn('[invoice-request] share failed, using download fallback', error);
      } finally {
        previewShareBusy = false;
      }
    }

    await downloadPreviewFiles(files);
  }

  async function exportPreviewOne(index){
    const sheet = document.querySelector(`.cmsInvoicePreviewSheetV42[data-preview-index="${index}"]`);
    const button = sheet?.querySelector('.cmsInvoiceExportOneV42');
    if (button?.disabled || previewShareBusy) return;
    try {
      if (button) { button.disabled = true; button.textContent = 'กำลังสร้าง...'; }
      const paper = sheet?.querySelector('.cmsInvoicePreviewPaperV42');
      const blob = await capturePreviewPaper(paper);
      const file = new File([blob], `${previewFileName(sheet, index)}.png`, { type: 'image/png' });
      await saveOrSharePreviewFiles([file]);
    } catch (error) {
      alert(`ส่งออกรูปภาพไม่สำเร็จ: ${error.message || error}`);
    } finally {
      if (button) { button.disabled = false; button.textContent = 'ส่งออกรูปนี้'; }
    }
  }

  async function exportPreviewAll(){
    const sheets = [...document.querySelectorAll('.cmsInvoicePreviewSheetV42')];
    if (!sheets.length) return alert('ยังไม่มีตัวอย่างใบกำกับภาษีให้ส่งออก');
    const button = document.querySelector('.cmsInvoiceExportAllV42');
    if (button?.disabled || previewShareBusy) return;
    try {
      if (button) { button.disabled = true; button.textContent = `กำลังสร้าง 0/${sheets.length}`; }
      const files = [];
      for (let index = 0; index < sheets.length; index++) {
        if (button) button.textContent = `กำลังสร้าง ${index + 1}/${sheets.length}`;
        const blob = await capturePreviewPaper(sheets[index].querySelector('.cmsInvoicePreviewPaperV42'));
        files.push(new File([blob], `${previewFileName(sheets[index], index)}.png`, { type: 'image/png' }));
      }
      await saveOrSharePreviewFiles(files);
      if (button) { button.disabled = false; button.textContent = 'ส่งออกทั้งชุด'; }
    } catch (error) {
      const button = document.querySelector('.cmsInvoiceExportAllV42');
      if (button) { button.disabled = false; button.textContent = 'ส่งออกทั้งชุด'; }
      alert(`ส่งออกทั้งชุดไม่สำเร็จ: ${error.message || error}`);
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
      state.editingItemIndex = -1;
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
    bindProductEntryDismiss();
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
    toggleStatusMore,
    closeStatusMore,
    openClearStatusDialog,
    openClearAllDialog,
    closeLocalClearDialog,
    clearStatusModeChanged,
    toggleClearSelectAll,
    confirmClearStatus,
    clearAllValidationChanged,
    confirmClearAll,
    backHome,
    beginComposition,
    endComposition,
    searchCustomer,
    selectCustomer,
    openAddCustomer,
    closeAddCustomer,
    saveNewCustomer,
    searchProduct,
    productSearchKey,
    hideProductSuggestions,
    addExistingProduct,
    productNameChanged,
    showSimilar,
    addNewProduct,
    updateItem,
    focusItem,
    editItem,
    cancelEditItem,
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
    exportPreviewOne,
    exportPreviewAll,
    closePreview,
    expectedInvoiceCount: () => expectedInvoiceCount(),
    requestSnapshot,
    testState: state
  };

  window.addEventListener('chokanan-customer-master-updated', refreshCustomerSuggestions);
  document.addEventListener('click', event => {
    if (!event.target?.closest?.('.cmsInvoiceItemMenuWrapV42')) closeItemMenus();
    if (!event.target?.closest?.('.cmsInvoicePageMoreWrapV42')) closeStatusMore();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
