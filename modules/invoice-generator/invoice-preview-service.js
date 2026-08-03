(function(root){
  'use strict';

  function money(value){
    return Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function round2(value){
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  function previewPayload(invoice){
    const row = invoice || {};
    const customer = row.customerSnapshot || {};
    return {
      invoiceId: row.invoiceId || row.id || '',
      invoiceNumber: row.invoiceNumber || row.no || '',
      requestId: row.sourceRequestId || row.requestId || '',
      requestNumber: row.sourceRequestNumber || row.requestNumber || '',
      paperSize: row.paperSize || '9x11',
      vatMode: row.vatMode || 'exclusive',
      vatRate: Number(row.vatRate || 7),
      printed: row.printed === true,
      customerName: customer.customerName || row.buyerName || '',
      customerTaxId: customer.taxId || row.buyerTax || '',
      items: Array.isArray(row.itemsSnapshot) ? row.itemsSnapshot : (row.items || []),
      beforeVat: Number(row.beforeVat || row.subtotal || 0),
      vatAmount: Number(row.vatAmount || row.vat || 0),
      grandTotal: Number(row.grandTotal || row.total || 0),
      summaryText: `${row.invoiceNumber || row.no || ''} | ${money(row.grandTotal || row.total || 0)}`
    };
  }

  function requestPreviewPayload(request, invoices){
    const list = Array.isArray(invoices) ? invoices.map(previewPayload) : [];
    return {
      requestId: request && request.requestId || '',
      requestNumber: request && request.requestNumber || '',
      status: request && request.status || '',
      readOnly: true,
      invoiceCount: list.length,
      invoices: list,
      batchBeforeVat: round2(list.reduce((sum, invoice) => sum + invoice.beforeVat, 0)),
      batchVatAmount: round2(list.reduce((sum, invoice) => sum + invoice.vatAmount, 0)),
      batchGrandTotal: round2(list.reduce((sum, invoice) => sum + invoice.grandTotal, 0))
    };
  }

  const api = { previewPayload, requestPreviewPayload };
  root.ChokAnanInvoicePreviewService = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
