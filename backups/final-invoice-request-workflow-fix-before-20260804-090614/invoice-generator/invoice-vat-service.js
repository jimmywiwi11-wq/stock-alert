(function(root){
  'use strict';

  const VAT_RATE = 7;

  function number(value){
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function round2(value){
    return Math.round((number(value) + Number.EPSILON) * 100) / 100;
  }

  function quantityOf(item){
    return number(item && (item.quantity != null ? item.quantity : item.qty));
  }

  function priceOf(item){
    return number(item && (item.salePrice != null ? item.salePrice : item.price));
  }

  function lineSubtotal(item){
    return round2(quantityOf(item) * priceOf(item));
  }

  function invoiceTotals(items, vatRate){
    const rate = number(vatRate == null ? VAT_RATE : vatRate);
    const beforeVat = round2((Array.isArray(items) ? items : []).reduce((sum, item) => sum + lineSubtotal(item), 0));
    const vatAmount = round2(beforeVat * rate / 100);
    const grandTotal = round2(beforeVat + vatAmount);
    return { vatMode: 'exclusive', vatRate: rate, beforeVat, subtotal: beforeVat, vatAmount, grandTotal };
  }

  function batchTotals(invoices){
    const rows = Array.isArray(invoices) ? invoices : [];
    return {
      invoiceCount: rows.length,
      beforeVat: round2(rows.reduce((sum, invoice) => sum + number(invoice.beforeVat || invoice.subtotal), 0)),
      vatAmount: round2(rows.reduce((sum, invoice) => sum + number(invoice.vatAmount), 0)),
      grandTotal: round2(rows.reduce((sum, invoice) => sum + number(invoice.grandTotal || invoice.total), 0))
    };
  }

  const api = { VAT_RATE, round2, lineSubtotal, invoiceTotals, batchTotals };
  root.ChokAnanInvoiceVatService = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
