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

  function invoiceKey(invoice){
    const row = invoice || {};
    return String(row.id || row.invoiceId || row.historyId || row.invoiceNumber || row.no || '').trim();
  }

  function mergeLocalInvoices(invoices){
    const incoming = Array.isArray(invoices) ? invoices : [];
    const existing = readLocalInvoices();
    const ids = new Set(incoming.map(invoiceKey).filter(Boolean));
    writeLocalInvoices([...incoming, ...existing.filter(invoice => !ids.has(invoiceKey(invoice)))]);
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
    const buyerAddress = source.buyerAddress || [customer.address1, customer.address2].filter(Boolean).join('\n') || customer.address || source.buyerAddress1 || '';
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
      buyerAddress,
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
      printStatus: source.printStatus || (source.printed ? 'printed' : 'ready_to_print'),
      status: source.status || (source.printed ? 'printed' : 'ready_to_print'),
      syncedFromTaxInvoiceHistory: true
    };
  }

  function firestoreReady(){
    return !!(root.db && typeof root.db.collection === 'function');
  }

  function firestoreTransactionReady(){
    return firestoreReady() && typeof root.db.runTransaction === 'function';
  }

  let historyUnsubscribes = [];
  let historyRetryTimer = null;

  function snapshotRows(snapshot){
    if (!snapshot || !snapshot.docs) return [];
    return snapshot.docs.map(doc => historyToDesktopInvoice({ ...(doc.data() || {}), historyId: doc.id }));
  }

  function bindFirestoreHistory(options={}){
    if (historyUnsubscribes.length) return function(){};
    if (!firestoreReady()) {
      if (!historyRetryTimer) {
        historyRetryTimer = root.setTimeout ? root.setTimeout(() => {
          historyRetryTimer = null;
          bindFirestoreHistory(options);
        }, 800) : null;
      }
      return function cancelPendingFirestoreHistoryBind(){
        if (historyRetryTimer && root.clearTimeout) root.clearTimeout(historyRetryTimer);
        historyRetryTimer = null;
      };
    }
    const render = typeof options.render === 'function' ? options.render : function(){};
    const collections = HISTORY_COLLECTIONS;
    historyUnsubscribes = collections.map(collectionName => root.db.collection(collectionName).onSnapshot(snapshot => {
      const incoming = snapshotRows(snapshot);
      mergeLocalInvoices(incoming);
      render({ source: collectionName, count: incoming.length });
    }, error => console.warn(`[invoice-history-adapter] Firestore ${collectionName} listener failed`, error)));
    return function unsubscribeFirestoreHistory(){
      historyUnsubscribes.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
      historyUnsubscribes = [];
    };
  }

  async function refreshFirestoreHistoryOnce(options={}){
    if (!firestoreReady()) return { skipped: true, reason: 'firestore-not-ready', count: 0 };
    const collections = options.collections || HISTORY_COLLECTIONS;
    const snapshots = await Promise.all(collections.map(collectionName => root.db.collection(collectionName).get()
      .then(snapshot => ({ collectionName, rows: snapshotRows(snapshot) }))
      .catch(error => {
        console.warn(`[invoice-history-adapter] Firestore ${collectionName} refresh failed`, error);
        return { collectionName, rows: [] };
      })));
    const byKey = new Map();
    snapshots.forEach(result => result.rows.forEach(row => {
      const key = invoiceKey(row);
      if (key) byKey.set(key, row);
    }));
    const rows = Array.from(byKey.values());
    mergeLocalInvoices(rows);
    if (typeof options.render === 'function') options.render({ source: 'firestore-refresh', count: rows.length });
    return { ok: true, count: rows.length, collections };
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
          status: allPrinted ? 'printed' : 'ready_to_print',
          printStatus: allPrinted ? 'printed' : 'partially_printed',
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

  function desktopInvoiceToCentral(invoice, options={}){
    const row = invoice || {};
    const now = options.now || new Date().toISOString();
    const invoiceId = row.invoiceId || options.invoiceId || `desktop-${row.id || Date.now()}`;
    const invoiceNumber = options.invoiceNumber || row.invoiceNumber || row.no || '';
    const customerSnapshot = row.customerSnapshot || {
      customerId: row.customerId || '',
      customerName: row.buyerName || '',
      taxId: row.buyerTax || '',
      address1: row.buyerAddress || ''
    };
    const itemsSnapshot = Array.isArray(row.itemsSnapshot) ? row.itemsSnapshot : (Array.isArray(row.items) ? row.items.map(item => ({
      productCode: item.productCode || item.code || '',
      productName: item.productName || item.name || '',
      quantity: item.quantity || item.qty || '',
      unit: item.unit || '',
      salePrice: item.salePrice ?? item.price ?? '',
      costPrice: item.costPrice ?? item.cost ?? '',
      lineSubtotal: Number(item.lineSubtotal ?? ((Number(item.price || item.salePrice || 0) || 0) * (Number(item.qty || item.quantity || 0) || 0)))
    })) : []);
    return {
      ...row,
      id: row.id || invoiceId,
      invoiceId,
      historyId: invoiceId,
      invoiceNumber,
      no: invoiceNumber,
      source: row.source || (row.sourceRequestId || row.requestId ? 'employee-request' : 'desktop-manual'),
      sourceRequestId: row.sourceRequestId || row.requestId || '',
      sourceRequestNumber: row.sourceRequestNumber || row.requestNumber || '',
      customerSnapshot,
      itemsSnapshot,
      items: itemsSnapshot,
      invoiceDate: row.invoiceDate || row.date || now.slice(0, 10),
      date: row.date || now.slice(0, 10),
      time: row.time || now.slice(11, 16),
      subtotal: row.subtotal ?? row.beforeVat ?? 0,
      beforeVat: row.beforeVat ?? row.subtotal ?? 0,
      vatAmount: row.vatAmount ?? row.vat ?? 0,
      vat: row.vat ?? row.vatAmount ?? 0,
      grandTotal: row.grandTotal ?? row.total ?? 0,
      total: row.total ?? row.grandTotal ?? 0,
      status: row.status || (row.printed ? 'printed' : 'ready_to_print'),
      printStatus: row.printStatus || (row.printed ? 'printed' : 'ready_to_print'),
      printed: row.printed === true,
      printedAt: row.printedAt || null,
      printedBy: row.printedBy || '',
      paperSize: row.paperSize || '9x11',
      invoiceType: row.invoiceType || row.type || 'ใบกำกับภาษีเต็ม',
      type: row.type || row.invoiceType || 'ใบกำกับภาษีเต็ม',
      vatMode: row.vatMode || 'excluded',
      createdAt: row.createdAt || now,
      createdBy: row.createdBy || options.by || 'tax-invoice-desktop',
      createdByUid: row.createdByUid || options.uid || '',
      updatedAt: now,
      updatedBy: options.by || row.updatedBy || 'tax-invoice-desktop',
      updatedByUid: options.uid || row.updatedByUid || ''
    };
  }

  async function syncDesktopManualInvoices(invoices, actor={}){
    const rows = Array.isArray(invoices) ? invoices : [];
    if (!rows.length) return [];
    if (!firestoreTransactionReady()) return rows.map(row => ({ ...row, centralSyncStatus: 'skipped-firestore-not-ready' }));
    const now = new Date().toISOString();
    const db = root.db;
    const counterRef = db.collection('invoiceNumberCounters').doc('IV');
    const result = await db.runTransaction(async transaction => {
      const missing = rows.filter(row => !(row.invoiceId || '').trim() || !(row.no || row.invoiceNumber || '').trim());
      let reserved = [];
      if (missing.length) {
        const counterSnap = await transaction.get(counterRef);
        const last = counterSnap.exists ? Number((counterSnap.data() || {}).lastSequence || 0) : 0;
        if (!root.ChokAnanInvoiceNumberService || typeof root.ChokAnanInvoiceNumberService.reserveRange !== 'function') throw new Error('invoice-number-service-not-loaded');
        const range = root.ChokAnanInvoiceNumberService.reserveRange(last, missing.length);
        reserved = range.invoiceNumbers;
        transaction.set(counterRef, {
          prefix: 'IV',
          lastSequence: range.endSequence,
          updatedAt: now
        }, { merge: true });
      }
      let reserveIndex = 0;
      const synced = rows.map(row => {
        const needsNumber = !(row.invoiceId || '').trim() || !(row.no || row.invoiceNumber || '').trim();
        const invoiceNumber = needsNumber ? reserved[reserveIndex++] : (row.no || row.invoiceNumber || '');
        const invoiceId = row.invoiceId || invoiceNumber || `desktop-${now.replace(/\D/g, '')}-${reserveIndex + 1}`;
        const central = desktopInvoiceToCentral(row, { ...actor, invoiceId, invoiceNumber, now });
        transaction.set(db.collection('taxInvoices').doc(invoiceId), central, { merge: true });
        transaction.set(db.collection('taxInvoiceHistory').doc(invoiceId), central, { merge: true });
        return historyToDesktopInvoice(central);
      });
      return synced;
    });
    mergeLocalInvoices(result);
    return result;
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

  const api = { HISTORY_COLLECTIONS, readLocalInvoices, writeLocalInvoices, mergeLocalInvoices, historyToDesktopInvoice, desktopInvoiceToCentral, bindFirestoreHistory, refreshFirestoreHistoryOnce, markPrinted, syncDesktopManualInvoices, manualHistorySummary };
  root.ChokAnanInvoiceHistoryAdapter = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
