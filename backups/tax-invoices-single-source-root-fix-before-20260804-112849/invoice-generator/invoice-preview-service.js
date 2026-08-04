(function(root){
  'use strict';

  function money(value){
    return Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function round2(value){
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  function splitAddressForInvoice(address1='', address2=''){
    const first = String(address1 || '').replace(/\r/g, '').trim();
    const second = String(address2 || '').replace(/\r/g, '').trim();
    if (second) return { address1: first, address2: second };
    const parts = first.split('\n').map(item => item.trim()).filter(Boolean);
    if (parts.length > 1) return { address1: parts[0], address2: parts.slice(1).join(' ') };
    const cut = first.search(/(?:อำเภอ|อําเภอ|อ\.|เขต|จังหวัด|จ\.)/u);
    if (cut > 0) {
      return {
        address1: first.slice(0, cut).trim(),
        address2: first.slice(cut).trim()
      };
    }
    return { address1: first, address2: '' };
  }

  function previewPayload(invoice){
    const row = invoice || {};
    const customer = row.customerSnapshot || {};
    const rawAddress = row.buyerAddress || [customer.address1, customer.address2].filter(Boolean).join('\n') || customer.address || '';
    const addressParts = splitAddressForInvoice(row.buyerAddress1 || customer.address1 || rawAddress, row.buyerAddress2 || customer.address2 || '');
    const buyerAddress = [addressParts.address1, addressParts.address2].filter(Boolean).join('\n') || rawAddress;
    return {
      invoiceId: row.invoiceId || row.id || '',
      invoiceNumber: row.invoiceNumber || row.no || '',
      requestId: row.sourceRequestId || row.requestId || '',
      requestNumber: row.sourceRequestNumber || row.requestNumber || '',
      paperSize: row.paperSize || '9x11',
      vatMode: row.vatMode || 'exclusive',
      vatRate: Number(row.vatRate || 7),
      printed: row.printed === true,
      customerSnapshot: customer,
      customerName: customer.customerName || row.buyerName || '',
      customerTaxId: customer.taxId || row.buyerTax || '',
      buyerName: row.buyerName || customer.customerName || '',
      buyerTax: row.buyerTax || customer.taxId || '',
      buyerAddress,
      buyerAddress1: addressParts.address1,
      buyerAddress2: addressParts.address2,
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

  const api = { previewPayload, requestPreviewPayload, splitAddressForInvoice };
  root.ChokAnanInvoicePreviewService = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
