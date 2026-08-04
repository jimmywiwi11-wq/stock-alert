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

  function dateParts(value){
    const raw = value || new Date().toISOString();
    const date = raw instanceof Date ? raw : new Date(raw);
    if (!Number.isFinite(date.getTime())) return { date: String(raw).slice(0, 10), time: '' };
    return { date: date.toISOString().slice(0, 10), time: date.toTimeString().slice(0, 5) };
  }

  function historyToDesktopInvoice(row){
    const source = row || {};
    const parts = dateParts(source.dateTime || source.createdAt || source.generatedAt || source.updatedAt);
    const customer = source.customerSnapshot || {};
    const items = Array.isArray(source.itemsSnapshot) ? source.itemsSnapshot : (Array.isArray(source.items) ? source.items : []);
    return {
      id: source.id || source.invoiceId || source.historyId || source.invoiceNumber || `remote-${Date.now()}`,
      invoiceId: source.invoiceId || source.id || '',
      historyId: source.historyId || '',
      no: source.no || source.invoiceNumber || '',
      date: source.date || parts.date,
      time: source.time || parts.time,
      type: source.type || source.invoiceType || 'ใบกำกับภาษีเต็ม',
      vatMode: source.vatMode || 'excluded',
      paperSize: source.paperSize || '9x11',
      buyerName: source.buyerName || customer.customerName || customer.name || '',
      buyerTax: source.buyerTax || customer.taxId || customer.tax || '',
      buyerAddress: source.buyerAddress || [customer.address1, customer.address2].filter(Boolean).join(' '),
      customerId: source.customerId || customer.customerId || '',
      items: items.map(item => ({
        code: item.code || item.productCode || '',
        name: item.name || item.productName || '',
        qty: item.qty || item.quantity || '',
        unit: item.unit || '',
        price: item.price ?? item.salePrice ?? '',
        cost: item.cost ?? item.costPrice ?? ''
      })),
      beforeVat: source.beforeVat ?? source.subtotal ?? 0,
      vat: source.vat ?? source.vatAmount ?? 0,
      total: source.total ?? source.grandTotal ?? 0,
      sourceRequestId: source.sourceRequestId || source.requestId || '',
      sourceRequestNumber: source.sourceRequestNumber || source.requestNumber || '',
      requestedByUid: source.requestedByUid || source.ownerUid || '',
      ownerUid: source.ownerUid || source.requestedByUid || '',
      printed: source.printed === true,
      printCount: Number(source.printCount || (source.printed ? 1 : 0)),
      printStatus: source.printStatus || (source.printed ? 'printed' : 'unprinted'),
      syncedFromTaxInvoiceHistory: true
    };
  }

  function firestoreReady(){
    return !!(root.db && typeof root.db.collection === 'function');
  }

  let historyUnsubscribe = null;

  function bindFirestoreHistory(options={}){
    if (historyUnsubscribe || !firestoreReady()) return historyUnsubscribe;
    const render = typeof options.render === 'function' ? options.render : function(){};
    historyUnsubscribe = root.db.collection('taxInvoiceHistory').onSnapshot(snapshot => {
      const incoming = snapshot.docs.map(doc => historyToDesktopInvoice({ ...(doc.data() || {}), historyId: doc.id }));
      mergeLocalInvoices(incoming);
      render({ source: 'taxInvoiceHistory', count: incoming.length });
    }, error => console.warn('[invoice-history-adapter] Firestore history listener failed', error));
    return historyUnsubscribe;
  }

  async function markPrinted(invoice, actor={}){
    if (!firestoreReady() || !invoice) return { skipped: true, reason: 'firestore-not-ready' };
    const invoiceId = invoice.invoiceId || invoice.id || '';
    const requestId = invoice.sourceRequestId || invoice.requestId || '';
    if (!invoiceId && !requestId) return { skipped: true, reason: 'missing-central-ids' };
    const now = new Date().toISOString();
    const printedInvoice = root.ChokAnanInvoicePrintService && typeof root.ChokAnanInvoicePrintService.markInvoicePrinted === 'function'
      ? root.ChokAnanInvoicePrintService.markInvoicePrinted(invoice, actor, now)
      : { printed: true, printedAt: now, printedBy: actor.by || 'tax-invoice-desktop', printedByUid: actor.uid || '', updatedAt: now };
    if (invoiceId) {
      await root.db.collection('taxInvoices').doc(invoiceId).set(printedInvoice, { merge: true });
      await root.db.collection('taxInvoiceHistory').doc(invoiceId).set(printedInvoice, { merge: true });
    }
    if (requestId) {
      const requestRef = root.db.collection('invoiceRequests').doc(requestId);
      const requestSnap = await requestRef.get();
      if (requestSnap.exists) {
        const data = requestSnap.data() || {};
        const ids = Array.isArray(data.generatedInvoiceIds) ? data.generatedInvoiceIds : [];
        let printedCount = Math.max(Number(data.printedInvoiceCount || 0), invoiceId ? 1 : 0);
        if (ids.length) {
          const invoiceSnaps = await Promise.all(ids.map(id => root.db.collection('taxInvoices').doc(id).get()));
          printedCount = invoiceSnaps.filter(snap => snap.exists && (snap.data() || {}).printed === true).length;
        }
        const allPrinted = ids.length > 0 ? printedCount >= ids.length : true;
        await requestRef.set({
          status: allPrinted ? 'พิมพ์แล้ว' : 'พร้อมพิมพ์',
          printedInvoiceCount: printedCount,
          printedAt: allPrinted ? now : (data.printedAt || null),
          printedBy: allPrinted ? (actor.by || 'tax-invoice-desktop') : (data.printedBy || ''),
          printedByUid: allPrinted ? (actor.uid || '') : (data.printedByUid || ''),
          updatedAt: now
        }, { merge: true });
      }
    }
    return { ok: true, invoiceId, requestId };
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

  const api = { HISTORY_COLLECTIONS, readLocalInvoices, writeLocalInvoices, mergeLocalInvoices, historyToDesktopInvoice, bindFirestoreHistory, markPrinted, manualHistorySummary };
  root.ChokAnanInvoiceHistoryAdapter = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
