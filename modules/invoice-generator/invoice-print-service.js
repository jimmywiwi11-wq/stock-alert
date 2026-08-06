(function(root){
  'use strict';

  function markInvoicePrinted(invoice, actor, at){
    const now = at || Date.now();
    const count = Number(invoice && invoice.printCount || 0);
    return {
      ...(invoice || {}),
      printed: true,
      printedAt: (invoice && invoice.printedAt) || now,
      printedBy: actor && actor.by || 'system',
      printedByUid: actor && actor.uid || '',
      printStatus: count > 0 ? 'reprinted' : 'printed',
      printCount: count + 1,
      updatedAt: now
    };
  }

  function printBatchStatus(invoices){
    const rows = Array.isArray(invoices) ? invoices : [];
    const printedCount = rows.filter(invoice => invoice && invoice.printed === true).length;
    return {
      invoiceCount: rows.length,
      printedCount,
      allPrinted: rows.length > 0 && printedCount === rows.length,
      status: rows.length > 0 && printedCount === rows.length ? 'printed' : 'partially_printed'
    };
  }

  const ACTION_LABELS = ['พิมพ์','ดู/พิมพ์ซ้ำ','ออกซ้ำ','แก้ไข','ลบ'];

  function normalizeKey(value){
    return String(value == null ? '' : value).trim();
  }

  function escapeAttribute(value){
    return normalizeKey(value).replace(/[&<>"']/g,function(char){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }

  function invoiceRecordKey(invoice){
    return normalizeKey(invoice && (invoice.id || invoice.invoiceId || invoice.historyId || invoice.no || invoice.invoiceNumber));
  }

  function historyButtonLabel(button){
    return normalizeKey(button && button.textContent).replace(/\s+/g,' ');
  }

  function invoiceNumberFromHistoryRow(button){
    const explicit = normalizeKey(button && button.dataset && (button.dataset.invoiceKey || button.dataset.invoiceNumber));
    if (explicit) return explicit;
    const row = button && button.closest ? button.closest('tr') : null;
    if (!row) return '';
    const text = normalizeKey(row.textContent);
    const match = text.match(/IV\s*0*([0-9]+)/i);
    if (!match) return '';
    return 'IV' + String(Number(match[1]) || 0).padStart(6,'0');
  }

  function unifiedRows(){
    try {
      if (typeof root.desktopHistoryRows === 'function') {
        const rows = root.desktopHistoryRows();
        if (Array.isArray(rows)) return rows;
      }
    } catch (error) {
      console.warn('[invoice history rows]',error);
    }
    try {
      if (root.ChokAnanInvoiceHistoryAdapter && typeof root.ChokAnanInvoiceHistoryAdapter.getUnifiedHistoryRows === 'function') {
        const rows = root.ChokAnanInvoiceHistoryAdapter.getUnifiedHistoryRows();
        if (Array.isArray(rows)) return rows;
      }
    } catch (error) {
      console.warn('[invoice history adapter rows]',error);
    }
    try {
      if (root.store && typeof root.store.get === 'function') {
        const rows = root.store.get('invoices',[]);
        if (Array.isArray(rows)) return rows;
      }
    } catch (error) {
      console.warn('[invoice local rows]',error);
    }
    return [];
  }

  function findInvoice(key){
    const wanted = normalizeKey(key).toUpperCase();
    if (!wanted) return null;
    try {
      if (typeof root.findInvoiceRecord === 'function') {
        const found = root.findInvoiceRecord(key);
        if (found) return found;
      }
    } catch (error) {
      console.warn('[findInvoiceRecord]',error);
    }
    return unifiedRows().find(function(row){
      return [row && row.no,row && row.invoiceNumber,row && row.id,row && row.invoiceId,row && row.historyId]
        .some(function(value){ return normalizeKey(value).toUpperCase() === wanted; });
    }) || null;
  }

  function showInvoiceRecord(invoice,editMode){
    if (!invoice) {
      root.alert('ไม่พบบิลนี้ในประวัติ กรุณากดรีเฟรชหน้าประวัติบิลแล้วลองใหม่');
      return false;
    }
    if (typeof root.loadInvoiceToForm !== 'function') {
      root.alert('ไม่พบระบบเปิดบิล กรุณาปิดโปรแกรมแล้วเปิดใหม่');
      return false;
    }
    try {
      root.loadInvoiceToForm(invoice,editMode !== false);
      root.setTimeout(function(){
        try {
          if (typeof root.renderInvoicePreview === 'function') root.renderInvoicePreview();
        } catch (error) {
          console.warn('[invoice preview render]',error);
        }
        const page = root.document && root.document.getElementById('invoice');
        if (page && typeof page.scrollIntoView === 'function') page.scrollIntoView({block:'start'});
        else if (typeof root.scrollTo === 'function') root.scrollTo(0,0);
      },50);
      return true;
    } catch (error) {
      console.error('[open invoice from history]',error);
      root.alert('เปิดบิลไม่สำเร็จ\n' + (error && error.message ? error.message : String(error)));
      return false;
    }
  }

  function runAction(action,key,button){
    const invoiceKey = normalizeKey(key) || invoiceNumberFromHistoryRow(button);
    if (!invoiceKey) {
      root.alert('ไม่พบเลขที่บิลในรายการนี้');
      return;
    }
    const invoice = findInvoice(invoiceKey);

    if (action === 'print' || action === 'view' || action === 'edit') {
      showInvoiceRecord(invoice,true);
      return;
    }
    if (action === 'duplicate') {
      if (showInvoiceRecord(invoice,false)) {
        root.alert('คัดลอกข้อมูลบิลเดิมมาแล้ว โปรแกรมสร้างเลขที่บิลใหม่ให้ สามารถแก้ไขแล้วกดบันทึก/พิมพ์ได้เลย');
      }
      return;
    }
    if (action === 'delete') {
      if (!invoice) {
        root.alert('ไม่พบบิลนี้ในประวัติ กรุณารีเฟรชแล้วลองใหม่');
        return;
      }
      if (typeof root.deleteInvoice !== 'function') {
        root.alert('ไม่พบระบบลบบิล กรุณาปิดโปรแกรมแล้วเปิดใหม่');
        return;
      }
      try { root.deleteInvoice(invoiceRecordKey(invoice) || invoiceKey); }
      catch (error) {
        console.error('[delete invoice from history]',error);
        root.alert('ลบบิลไม่สำเร็จ\n' + (error && error.message ? error.message : String(error)));
      }
    }
  }

  function actionFromLabel(label){
    return {'พิมพ์':'print','ดู/พิมพ์ซ้ำ':'view','ออกซ้ำ':'duplicate','แก้ไข':'edit','ลบ':'delete'}[label] || '';
  }

  function safeHistoryActionButtons(invoice){
    const key = escapeAttribute(invoiceRecordKey(invoice));
    const ready = typeof root.invoiceIsReadyToPrint === 'function' ? root.invoiceIsReadyToPrint(invoice) : true;
    const print = ready ? '<button type="button" class="btn green" data-invoice-history-action="print" data-invoice-key="'+key+'">พิมพ์</button> ' : '';
    return print
      + '<button type="button" data-invoice-history-action="view" data-invoice-key="'+key+'">ดู/พิมพ์ซ้ำ</button> '
      + '<button type="button" data-invoice-history-action="duplicate" data-invoice-key="'+key+'">ออกซ้ำ</button> '
      + '<button type="button" data-invoice-history-action="edit" data-invoice-key="'+key+'">แก้ไข</button> '
      + '<button type="button" data-invoice-history-action="delete" data-invoice-key="'+key+'">ลบ</button>';
  }

  function installSafeRenderer(){
    if (typeof root.historyActionButtons !== 'function') return false;
    if (root.historyActionButtons.__safeInvoiceHistoryActions) return true;
    safeHistoryActionButtons.__safeInvoiceHistoryActions = true;
    root.historyActionButtons = safeHistoryActionButtons;
    try {
      if (typeof root.renderHistory === 'function') root.renderHistory();
    } catch (error) {
      console.warn('[rerender safe invoice history actions]',error);
    }
    return true;
  }

  function installHistoryActionFix(){
    if (!root.document || root.__invoiceHistoryActionFixV3Installed) return;
    root.__invoiceHistoryActionFixV3Installed = true;
    root.document.addEventListener('click',function(event){
      const button = event.target && event.target.closest ? event.target.closest('button') : null;
      if (!button) return;
      let action = normalizeKey(button.dataset && button.dataset.invoiceHistoryAction);
      if (!action) {
        const label = historyButtonLabel(button);
        if (!ACTION_LABELS.includes(label) || !invoiceNumberFromHistoryRow(button)) return;
        action = actionFromLabel(label);
      }
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      runAction(action,button.dataset && button.dataset.invoiceKey,button);
    },true);

    let attempts = 0;
    const timer = root.setInterval(function(){
      attempts += 1;
      if (installSafeRenderer() || attempts >= 100) root.clearInterval(timer);
    },100);
  }

  installHistoryActionFix();

  const api = {
    markInvoicePrinted,
    printBatchStatus,
    installHistoryActionFix,
    installSafeRenderer,
    runHistoryAction:runAction
  };
  root.ChokAnanInvoicePrintService = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
