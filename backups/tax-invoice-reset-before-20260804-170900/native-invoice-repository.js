(function(root){
  'use strict';

  const PRIMARY_COLLECTION = 'taxInvoices';
  const LEGACY_LOCAL_KEYS = ['invoices', 'taxInvoiceHistory', 'invoiceHistory'];
  const BUILD = 'V33-HISTORY-V2';
  let cache = [];
  let meta = {
    build: BUILD,
    primaryCount: 0,
    legacyCount: 0,
    mergedCount: 0,
    duplicateCount: 0,
    conflicts: [],
    lastSaveResult: '',
    lastPrintStatusUpdate: '',
    lastError: '',
    updatedAt: null
  };
  const subscribers = new Set();
  let firestoreUnsubscribe = null;

  function localStorageAvailable(){
    try { return !!root.localStorage; } catch (error) { return false; }
  }

  function readLocalKey(key){
    if (!localStorageAvailable()) return [];
    try {
      const rows = JSON.parse(root.localStorage.getItem(key) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      return [];
    }
  }

  function writeLocalInvoices(rows){
    if (!localStorageAvailable()) return;
    root.localStorage.setItem('invoices', JSON.stringify(Array.isArray(rows) ? rows : []));
  }

  function adapter(){
    return root.ChokAnanInvoiceHistoryAdapter || null;
  }

  function normalize(row, sourceCollection='unknown'){
    if (adapter() && typeof adapter().normalizeInvoiceRecord === 'function') {
      return adapter().normalizeInvoiceRecord(row || {}, sourceCollection);
    }
    const src = row || {};
    const invoiceId = src.invoiceId || src.id || src.historyId || src.invoiceNumber || src.no || '';
    const invoiceNumber = src.invoiceNumber || src.no || invoiceId || '';
    const customer = src.customerSnapshot || src.customer || {};
    const items = Array.isArray(src.itemsSnapshot) ? src.itemsSnapshot : (Array.isArray(src.items) ? src.items : []);
    const printed = src.printed === true || String(src.printStatus || '').toLowerCase() === 'printed' || Number(src.printCount || 0) > 0;
    return {
      ...src,
      id: invoiceId,
      invoiceId,
      historyId: src.historyId || invoiceId,
      invoiceNumber,
      no: invoiceNumber,
      date: src.date || src.invoiceDate || String(src.createdAt || new Date().toISOString()).slice(0, 10),
      time: src.time || String(src.createdAt || '').slice(11, 16),
      buyerName: src.buyerName || src.customerName || customer.customerName || customer.name || '',
      buyerTax: src.buyerTax || src.customerTaxId || customer.taxId || customer.tax || '',
      buyerAddress: src.buyerAddress || [customer.address1, customer.address2].filter(Boolean).join('\n') || customer.address || '',
      items,
      total: src.total ?? src.grandTotal ?? 0,
      grandTotal: src.grandTotal ?? src.total ?? 0,
      source: src.source || (src.sourceRequestId || src.requestId ? 'employee-request' : 'desktop-manual'),
      sourceRequestId: src.sourceRequestId || src.requestId || '',
      status: src.status || (printed ? 'printed' : 'ready_to_print'),
      printStatus: src.printStatus || (printed ? 'printed' : 'ready_to_print'),
      printed,
      printCount: Number(src.printCount || (printed ? 1 : 0)),
      sourceCollection
    };
  }

  function keyOf(row){
    const src = row || {};
    return String(src.invoiceId || src.id || src.historyId || src.invoiceNumber || src.no || src.billNo || '').trim();
  }

  function keysOf(row){
    const src = row || {};
    return [src.invoiceId, src.id, src.historyId, src.invoiceNumber, src.no, src.billNo]
      .map(value => String(value || '').trim())
      .filter(Boolean);
  }

  function sameRecord(a, b){
    const bKeys = new Set(keysOf(b));
    return keysOf(a).some(key => bKeys.has(key));
  }

  function seqOf(row){
    const number = String(row && (row.no || row.invoiceNumber) || '');
    const match = number.match(/(\d+)$/);
    return match ? Number(match[1]) : 0;
  }

  function priority(row){
    const source = String(row && row.sourceCollection || '');
    if (source === PRIMARY_COLLECTION || source === 'parentBridge:taxInvoices') return 5;
    if (source.includes('taxInvoiceHistory')) return 3;
    if (source.includes('localStorage:invoices')) return 2;
    return 1;
  }

  function deduplicate(rows){
    const byKey = new Map();
    const duplicateRows = [];
    (Array.isArray(rows) ? rows : []).forEach(raw => {
      const row = normalize(raw, raw && raw.sourceCollection || 'unknown');
      const keys = keysOf(row);
      if (!keys.length) return;
      const existingKey = keys.find(key => byKey.has(key));
      const existing = existingKey ? byKey.get(existingKey) : null;
      if (!existing || priority(row) >= priority(existing)) {
        if (existing) {
          duplicateRows.push({ key: existingKey, kept: row.sourceCollection, dropped: existing.sourceCollection });
          keysOf(existing).forEach(key => byKey.delete(key));
        }
        keys.forEach(key => byKey.set(key, row));
      } else {
        duplicateRows.push({ key: existingKey, kept: existing.sourceCollection, dropped: row.sourceCollection });
      }
    });
    const rowsOut = Array.from(new Set(byKey.values())).sort((a,b) =>
      String(b.date || '').localeCompare(String(a.date || '')) ||
      (seqOf(b) - seqOf(a)) ||
      String(b.no || '').localeCompare(String(a.no || ''))
    );
    return { rows: rowsOut, duplicates: duplicateRows };
  }

  function migrateLegacyReadOnly(){
    return LEGACY_LOCAL_KEYS.flatMap(key => readLocalKey(key).map(row => ({ ...row, sourceCollection: `localStorage:${key}` })));
  }

  function upsertLocal(row){
    const normalized = normalize(row, row && row.sourceCollection || 'localStorage:invoices');
    const rows = readLocalKey('invoices');
    const next = [normalized, ...rows.filter(item => !sameRecord(item, normalized))];
    writeLocalInvoices(next);
  }

  function updateCache(primaryRows=[], legacyRows=migrateLegacyReadOnly()){
    const primary = (Array.isArray(primaryRows) ? primaryRows : []).map(row => normalize(row, row.sourceCollection || PRIMARY_COLLECTION));
    const legacy = Array.isArray(legacyRows) ? legacyRows : [];
    const merged = deduplicate([...primary, ...legacy]);
    cache = merged.rows;
    meta = {
      ...meta,
      primaryCount: primary.length,
      legacyCount: legacy.length,
      mergedCount: cache.length,
      duplicateCount: merged.duplicates.length,
      conflicts: merged.duplicates,
      lastError: '',
      updatedAt: new Date().toISOString()
    };
    subscribers.forEach(listener => {
      try { listener(cache.slice(), { ...meta }); } catch (error) {}
    });
    return { rows: cache.slice(), meta: { ...meta } };
  }

  async function fetchPrimary(){
    if (!(root.db && typeof root.db.collection === 'function')) return [];
    const snap = await root.db.collection(PRIMARY_COLLECTION).get();
    return (snap.docs || []).map(doc => normalize({ ...(doc.data() || {}), invoiceId: (doc.data() || {}).invoiceId || doc.id, historyId: doc.id, sourceCollection: PRIMARY_COLLECTION }, PRIMARY_COLLECTION));
  }

  async function refresh(){
    try {
      const primaryRows = await fetchPrimary();
      return updateCache(primaryRows, migrateLegacyReadOnly());
    } catch (error) {
      meta = { ...meta, lastError: error && (error.message || error.code) || String(error) };
      return updateCache([], migrateLegacyReadOnly());
    }
  }

  async function save(invoice, actor={}){
    const now = new Date().toISOString();
    const central = adapter() && typeof adapter().desktopInvoiceToCentral === 'function'
      ? adapter().desktopInvoiceToCentral(invoice || {}, { ...actor, now })
      : normalize({ ...(invoice || {}), updatedAt: now }, PRIMARY_COLLECTION);
    const invoiceId = central.invoiceId || central.id || central.no || central.invoiceNumber;
    const row = normalize({ ...central, invoiceId, id: central.id || invoiceId, historyId: central.historyId || invoiceId, sourceCollection: PRIMARY_COLLECTION }, PRIMARY_COLLECTION);
    upsertLocal(row);
    if (root.db && typeof root.db.collection === 'function' && invoiceId) {
      await root.db.collection(PRIMARY_COLLECTION).doc(String(invoiceId)).set({ ...row, updatedAt: now }, { merge: true });
      if (row.sourceRequestId) {
        await root.db.collection('invoiceRequests').doc(String(row.sourceRequestId)).set({
          status: 'ready_to_print',
          printStatus: 'ready_to_print',
          generationState: 'native-saved',
          nativeImportState: 'native-saved',
          importedToNativeHistory: true,
          nativeInvoiceIds: root.firebase && root.firebase.firestore && root.firebase.firestore.FieldValue
            ? root.firebase.firestore.FieldValue.arrayUnion(invoiceId)
            : [invoiceId],
          generatedInvoiceIds: root.firebase && root.firebase.firestore && root.firebase.firestore.FieldValue
            ? root.firebase.firestore.FieldValue.arrayUnion(invoiceId)
            : [invoiceId],
          updatedAt: now
        }, { merge: true });
      }
    }
    meta = { ...meta, lastSaveResult: `saved:${invoiceId || keyOf(row)}` };
    updateCache([row, ...cache.filter(item => !sameRecord(item, row) && item.sourceCollection === PRIMARY_COLLECTION)], migrateLegacyReadOnly());
    return row;
  }

  function list(filters={}){
    if (!cache.length) updateCache([], migrateLegacyReadOnly());
    let rows = cache.slice();
    if (filters.search) {
      const q = String(filters.search).toLowerCase();
      rows = rows.filter(row => String([row.no, row.invoiceNumber, row.buyerName, row.buyerTax, row.sourceRequestId, row.requestNumber].join(' ')).toLowerCase().includes(q));
    }
    if (filters.date) rows = rows.filter(row => String(row.date || '').slice(0, 10) === filters.date);
    if (filters.month) rows = rows.filter(row => String(row.date || '').slice(0, 7) === filters.month);
    if (filters.year) rows = rows.filter(row => String(row.date || '').slice(0, 4) === String(filters.year));
    if (filters.type && filters.type !== 'all') rows = rows.filter(row => String(row.type || row.invoiceType || '') === String(filters.type));
    if (filters.printStatus && filters.printStatus !== 'all') {
      rows = rows.filter(row => filters.printStatus === 'printed' ? row.printed || Number(row.printCount || 0) > 0 : !(row.printed || Number(row.printCount || 0) > 0));
    }
    return rows;
  }

  function search(query, limit=50){
    return list({ search: query }).slice(0, limit);
  }

  function getById(id){
    const wanted = String(id || '');
    return list().find(row => keysOf(row).includes(wanted)) || null;
  }

  function getByInvoiceNumber(invoiceNumber){
    const wanted = String(invoiceNumber || '');
    return list().find(row => String(row.no || row.invoiceNumber || '') === wanted) || null;
  }

  async function update(id, patch={}, actor={}){
    const existing = getById(id) || {};
    return save({ ...existing, ...(patch || {}) }, actor);
  }

  async function markPrinted(invoice, actor={}){
    const row = typeof invoice === 'string' ? getById(invoice) : normalize(invoice || {}, invoice && invoice.sourceCollection || PRIMARY_COLLECTION);
    if (!row) return { skipped: true, reason: 'missing-invoice' };
    if (adapter() && typeof adapter().markPrinted === 'function') await adapter().markPrinted(row, actor).catch(() => null);
    const now = new Date().toISOString();
    const printCount = Number(row.printCount || 0) + 1;
    const printedRow = { ...row, printed: true, printCount, printStatus: printCount > 1 ? 'reprinted' : 'printed', status: 'printed', printedAt: now, updatedAt: now };
    upsertLocal(printedRow);
    if (root.db && typeof root.db.collection === 'function' && printedRow.invoiceId) {
      await root.db.collection(PRIMARY_COLLECTION).doc(String(printedRow.invoiceId)).set(printedRow, { merge: true });
      if (printedRow.sourceRequestId) {
        await root.db.collection('invoiceRequests').doc(String(printedRow.sourceRequestId)).set({
          status: 'printed',
          printStatus: 'printed',
          printedAt: now,
          printedBy: actor.by || actor.uid || 'tax-invoice-desktop',
          printedInvoiceCount: printCount,
          updatedAt: now
        }, { merge: true });
      }
    }
    meta = { ...meta, lastPrintStatusUpdate: `printed:${printedRow.invoiceId || keyOf(printedRow)}` };
    updateCache([printedRow, ...cache.filter(item => !sameRecord(item, printedRow) && item.sourceCollection === PRIMARY_COLLECTION)], migrateLegacyReadOnly());
    return { ok: true, invoiceId: printedRow.invoiceId, requestId: printedRow.sourceRequestId || '' };
  }

  async function remove(id){
    return update(id, { deleted: true, deletedAt: new Date().toISOString() });
  }

  function subscribe(listener){
    if (typeof listener !== 'function') return function(){};
    subscribers.add(listener);
    listener(list(), { ...meta });
    if (!firestoreUnsubscribe && root.db && typeof root.db.collection === 'function') {
      firestoreUnsubscribe = root.db.collection(PRIMARY_COLLECTION).onSnapshot(snapshot => {
        const primaryRows = (snapshot.docs || []).map(doc => normalize({ ...(doc.data() || {}), invoiceId: (doc.data() || {}).invoiceId || doc.id, historyId: doc.id, sourceCollection: PRIMARY_COLLECTION }, PRIMARY_COLLECTION));
        updateCache(primaryRows, migrateLegacyReadOnly());
      }, error => {
        meta = { ...meta, lastError: error && (error.message || error.code) || String(error) };
      });
    } else {
      refresh();
    }
    return function unsubscribe(){
      subscribers.delete(listener);
    };
  }

  const api = {
    BUILD,
    PRIMARY_COLLECTION,
    save,
    update,
    getById,
    getByInvoiceNumber,
    list,
    search,
    markPrinted,
    delete: remove,
    subscribe,
    refresh,
    migrateLegacyReadOnly,
    deduplicate,
    normalize,
    diagnostics: () => ({ ...meta, rows: cache.length })
  };

  root.NativeInvoiceRepository = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
