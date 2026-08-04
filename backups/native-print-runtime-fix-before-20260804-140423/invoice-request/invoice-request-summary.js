(function(root){
  'use strict';

  const DEFAULT_SETTINGS = Object.freeze({
    invoiceType: 'full-tax-invoice',
    paperSize: '9x11',
    vatMode: 'exclusive',
    vatRate: 7,
    itemsPerInvoice: 10
  });

  function number(value){
    if (value === 0 || value === '0') return 0;
    const raw = String(value == null ? '' : value).replace(/,/g, '').trim();
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function round(value){
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function line(item, settings){
    const cfg = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    const quantity = number(item && item.quantity);
    const salePrice = number(item && item.salePrice);
    const lineSubtotal = round(quantity * salePrice);
    const vatAmount = cfg.vatMode === 'exclusive' ? round(lineSubtotal * (cfg.vatRate / 100)) : 0;
    const lineGrandTotal = round(lineSubtotal + vatAmount);
    return { quantity, salePrice, lineSubtotal, vatAmount, lineGrandTotal };
  }

  function summarize(items, settings){
    const cfg = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    const rows = Array.isArray(items) ? items : [];
    const lines = rows.map(item => line(item, cfg));
    const subtotal = round(lines.reduce((sum, item) => sum + item.lineSubtotal, 0));
    const vatAmount = cfg.vatMode === 'exclusive' ? round(lines.reduce((sum, item) => sum + item.vatAmount, 0)) : 0;
    const grandTotal = round(subtotal + vatAmount);
    return {
      itemCount: rows.length,
      expectedInvoiceCount: Math.max(1, Math.ceil(rows.length / cfg.itemsPerInvoice)),
      subtotal,
      vatAmount,
      grandTotal,
      settings: cfg
    };
  }

  root.CMSInvoiceRequestSummary = {
    DEFAULT_SETTINGS,
    number,
    round,
    line,
    summarize
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.CMSInvoiceRequestSummary;
})(typeof window !== 'undefined' ? window : globalThis);
