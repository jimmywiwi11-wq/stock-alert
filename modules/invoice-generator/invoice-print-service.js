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
   * History buttons are rendered by the legacy page with an inline argument such as
   * onclick="viewInvoice("IV000118")". The nested double quotes make the inline
   * handler invalid, so every action in that row silently fails. Keep the legacy
   * renderer untouched and handle those actions safely by event delegation.
   */
  function invoiceNumberFromHistoryRow(button){
    const row = button && button.closest ? button.closest('tr') : null;
    if (!row) return '';
    const cells = Array.from(row.cells || []);
    if (cells.length < 2) return '';
    return String(cells[1].textContent || '').trim();
  }

  function isInvoiceHistoryAction(button){
    if (!button || !button.closest) return false;
    const historyPage = button.closest('#history');
    if (!historyPage) return false;
    const label = String(button.textContent || '').trim();
    return ['พิมพ์','ดู/พิมพ์ซ้ำ','ออกซ้ำ','แก้ไข','ลบ'].includes(label);
  }

  function runHistoryAction(button){
    const label = String(button.textContent || '').trim();
    const invoiceNumber = invoiceNumberFromHistoryRow(button);
    if (!invoiceNumber) {
      if (typeof root.alert === 'function') root.alert('ไม่พบเลขที่บิลในรายการนี้');
      return;
    }

    // Both actions must first open the invoice editor/preview. Printing is then
    // performed from the existing invoice page, exactly like normal invoices.
    if (label === 'พิมพ์' || label === 'ดู/พิมพ์ซ้ำ') {
      if (typeof root.viewInvoice === 'function') root.viewInvoice(invoiceNumber);
      else if (typeof root.editInvoice === 'function') root.editInvoice(invoiceNumber);
      return;
    }
    if (label === 'ออกซ้ำ' && typeof root.duplicateInvoice === 'function') {
      root.duplicateInvoice(invoiceNumber);
      return;
    }
    if (label === 'แก้ไข' && typeof root.editInvoice === 'function') {
      root.editInvoice(invoiceNumber);
      return;
    }
    if (label === 'ลบ' && typeof root.deleteInvoice === 'function') {
      root.deleteInvoice(invoiceNumber);
    }
  }

  function installHistoryActionFix(){
    if (!root.document || root.__invoiceHistoryActionFixInstalled) return;
    root.__invoiceHistoryActionFixInstalled = true;
    root.document.addEventListener('click', function(event){
      const button = event.target && event.target.closest ? event.target.closest('button') : null;
      if (!isInvoiceHistoryAction(button)) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      runHistoryAction(button);
    }, true);
  }

  installHistoryActionFix();

  const api = { markInvoicePrinted, printBatchStatus, installHistoryActionFix };
  root.ChokAnanInvoicePrintService = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
