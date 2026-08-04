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

  const api = { markInvoicePrinted, printBatchStatus };
  root.ChokAnanInvoicePrintService = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
