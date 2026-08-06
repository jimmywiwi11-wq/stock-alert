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

  /*
   * History action repair.
   *
   * The legacy renderer can produce invalid inline onclick markup when the
   * invoice key contains quotes.  Do not depend on that markup.  Capture the
   * click first, find the IV number anywhere in the same table row, resolve the
   * actual unified-history record, and open the existing invoice form/preview.
   */
  const ACTION_LABELS = ['พิมพ์','ดู/พิมพ์ซ้ำ','ออกซ้ำ','แก้ไข','ลบ'];

  function historyButtonLabel(button){
    return String(button && button.textContent || '').replace(/\s+/g,' ').trim();
  }

  function invoiceNumberFromHistoryRow(button){
    const row = button && button.closest ? button.closest('tr') : null;
    if (!row) return '';
    const text = String(row.textContent || '');
    const match = text.match(/\bIV\s*0*([0-9]+)\b/i);
    if (!match) return '';
    return 'IV' + String(Number(match[1]) || 0).padStart(6,'0');
  }

  function isInvoiceHistoryAction(button){
    if (!button || !button.closest) return false;
    const label = historyButtonLabel(button);
    if (!ACTION_LABELS.includes(label)) return false;
    const row = button.closest('tr');
    if (!row) return false;
    return Boolean(invoiceNumberFromHistoryRow(button));
  }

  function unifiedRows(){
    try {
      if (typeof root.desktopHistoryRows === 'function') {
        const rows = root.desktopHistoryRows();
        if (Array.isArray(rows)) return rows;
      }
    } catch (error) {
      console.warn('[invoice history rows]', error);
    }
    try {
      if (root.ChokAnanInvoiceHistoryAdapter && typeof root.ChokAnanInvoiceHistoryAdapter.getUnifiedHistoryRows === 'function') {
        const rows = root.ChokAnanInvoiceHistoryAdapter.getUnifiedHistoryRows();
        if (Array.isArray(rows)) return rows;
      }
    } catch (error) {
      console.warn('[invoice history adapter rows]', error);
    }
    return [];
  }

  function findInvoice(invoiceNumber){
    const key = String(invoiceNumber || '').trim().toUpperCase();
    try {
      if (typeof root.findInvoiceRecord === 'function') {
        const found = root.findInvoiceRecord(key);
        if (found) return found;
      }
    } catch (error) {
      console.warn('[findInvoiceRecord]', error);
    }
    return unifiedRows().find(function(row){
      return [row && row.no,row && row.invoiceNumber,row && row.id,row && row.invoiceId]
        .some(function(value){ return String(value || '').trim().toUpperCase() === key; });
    }) || null;
  }

  function showInvoiceRecord(invoice, editMode){
    if (!invoice) {
      root.alert('ไม่พบบิลนี้ในประวัติ กรุณากดรีเฟรชหน้าประวัติบิลแล้วลองใหม่');
      return false;
    }
    if (typeof root.loadInvoiceToForm !== 'function') {
      root.alert('ไม่พบระบบเปิดบิล กรุณาปิดโปรแกรมแล้วเปิดใหม่');
      return false;
    }
    try {
      root.loadInvoiceToForm(invoice, editMode !== false);
      root.setTimeout(function(){
        try {
          if (typeof root.renderInvoicePreview === 'function') root.renderInvoicePreview();
        } catch (error) {
          console.warn('[invoice preview render]', error);
        }
        const preview = root.document.getElementById('invoicePreview');
        const page = root.document.getElementById('invoice');
        const target = preview || page;
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({behavior:'smooth',block:'start'});
        } else {
          root.scrollTo(0,0);
        }
      },80);
      return true;
    } catch (error) {
      console.error('[open invoice from history]', error);
      root.alert('เปิดบิลไม่สำเร็จ\n' + (error && error.message ? error.message : String(error)));
      return false;
    }
  }

  function runHistoryAction(button){
    const label = historyButtonLabel(button);
    const invoiceNumber = invoiceNumberFromHistoryRow(button);
    if (!invoiceNumber) {
      root.alert('ไม่พบเลขที่บิลในรายการนี้');
      return;
    }
    const invoice = findInvoice(invoiceNumber);

    /* Printing must first show the normal invoice page and preview. */
    if (label === 'พิมพ์' || label === 'ดู/พิมพ์ซ้ำ') {
      showInvoiceRecord(invoice,true);
      return;
    }

    if (label === 'แก้ไข') {
      showInvoiceRecord(invoice,true);
      return;
    }

    if (label === 'ออกซ้ำ') {
      if (showInvoiceRecord(invoice,false)) {
        root.alert('คัดลอกข้อมูลบิลเดิมมาแล้ว โปรแกรมสร้างเลขที่บิลใหม่ให้ สามารถแก้ไขแล้วกดบันทึก/พิมพ์ได้เลย');
      }
      return;
    }

    if (label === 'ลบ') {
      if (!invoice) {
        root.alert('ไม่พบบิลนี้ในประวัติ กรุณารีเฟรชแล้วลองใหม่');
        return;
      }
      if (typeof root.deleteInvoice === 'function') {
        try { root.deleteInvoice(invoiceNumber); }
        catch (error) {
          console.error('[delete invoice from history]', error);
          root.alert('ลบบิลไม่สำเร็จ\n' + (error && error.message ? error.message : String(error)));
        }
      } else {
        root.alert('ไม่พบระบบลบบิล กรุณาปิดโปรแกรมแล้วเปิดใหม่');
      }
    }
  }

  function installHistoryActionFix(){
    if (!root.document || root.__invoiceHistoryActionFixV2Installed) return;
    root.__invoiceHistoryActionFixV2Installed = true;
    root.document.addEventListener('click',function(event){
      const button = event.target && event.target.closest ? event.target.closest('button') : null;
      if (!isInvoiceHistoryAction(button)) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      runHistoryAction(button);
    },true);
  }

  installHistoryActionFix();

  const api = {markInvoicePrinted,printBatchStatus,installHistoryActionFix};
  root.ChokAnanInvoicePrintService = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
