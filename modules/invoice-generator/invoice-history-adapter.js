(function(root){
  'use strict';

  const HISTORY_COLLECTIONS = Object.freeze(['invoices', 'taxInvoices', 'invoiceHistory', 'taxInvoiceHistory']);

  function localStorageAvailable(){
    try {
      return !!root.localStorage;
    } catch (error) {
      return false;
    }
  }

  function readLocalInvoices(){
    if (!localStorageAvailable()) return [];
    try {
      return JSON.parse(root.localStorage.getItem('invoices') || '[]') || [];
    } catch (error) {
      return [];
    }
  }

  function writeLocalInvoices(invoices){
    if (!localStorageAvailable()) return;
    root.localStorage.setItem('invoices', JSON.stringify(Array.isArray(invoices) ? invoices : []));
  }

  function mergeLocalInvoices(invoices){
    const incoming = Array.isArray(invoices) ? invoices : [];
    const existing = readLocalInvoices();
    const ids = new Set(incoming.map(invoice => invoice.id || invoice.invoiceId || invoice.invoiceNumber));
    writeLocalInvoices([...incoming, ...existing.filter(invoice => !ids.has(invoice.id || invoice.invoiceId || invoice.invoiceNumber))]);
  }

  function manualHistorySummary(){
    const rows = readLocalInvoices();
    let latestSequence = 0;
    rows.forEach(row => {
      const parsed = root.ChokAnanInvoiceNumberFormat && root.ChokAnanInvoiceNumberFormat.parseInvoiceNumber(row.no || row.invoiceNumber);
      if (parsed) latestSequence = Math.max(latestSequence, parsed.sequence);
    });
    return { source: 'localStorage:invoices', count: rows.length, latestSequence };
  }

  const api = { HISTORY_COLLECTIONS, readLocalInvoices, writeLocalInvoices, mergeLocalInvoices, manualHistorySummary };
  root.ChokAnanInvoiceHistoryAdapter = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
