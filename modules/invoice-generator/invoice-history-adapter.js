(function(root){
  'use strict';

  const PRIMARY_INVOICE_COLLECTION = 'taxInvoices';
  const HISTORY_INDEX_COLLECTION = 'taxInvoiceHistory';
  const LEGACY_INVOICE_COLLECTION = 'invoices';
  const LEGACY_HISTORY_COLLECTION = 'invoiceHistory';
  const HISTORY_COLLECTIONS = Object.freeze([
    PRIMARY_INVOICE_COLLECTION,
    HISTORY_INDEX_COLLECTION,
    LEGACY_INVOICE_COLLECTION,
    LEGACY_HISTORY_COLLECTION
  ]);
  const DESKTOP_HISTORY_BUILD = 'V32-SAVE-HISTORY-PRINT-STATUS';
  const FULL_TAX_TYPE = '\u0e43\u0e1a\u0e01\u0e33\u0e01\u0e31\u0e1a\u0e20\u0e32\u0e29\u0e35\u0e40\u0e15\u0e47\u0e21';

  let unifiedHistoryCache = [];
  let bridgeHistoryCache = [];
  let bridgeHistoryMeta = { connected: false, count: 0, receivedAt: null, lastError: '' };
  let unifiedHistoryMeta = { counts: {}, duplicates: 0, duplicateRows: [], filtered: [], updatedAt: null };
  let historyUnsubscribes = [];
  let historyRetryTimer = null;

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
    const requestId = row.sourceRequestId || row.requestId || '';
    return String(
      row.invoiceId ||
      row.id ||
      row.historyId ||
      row.invoiceNumber ||
      row.no ||
      row.billNo ||
      (row.invoiceNumber && requestId ? `${row.invoiceNumber}:${requestId}` : '')
    ).trim();
  }

  function mergeLocalInvoices(invoices){
    const incoming = Array.isArray(invoices) ? invoices : [];
    const existing = readLocalInvoices();
    const ids = new Set(incoming.map(invoiceKey).filter(Boolean));
    writeLocalInvoices([...incoming, ...existing.filter(invoice => !ids.has(invoiceKey(invoice)))]);
  }

  function firestoreReady(){
    return !!(root.db && typeof root.db.collection === 'function');
  }

  function firestoreTransactionReady(){
    return firestoreReady() && typeof root.db.runTransaction === 'function';
  }

  function timestampToDate(value){
    if (value && typeof value.toDate === 'function') return value.toDate();
    if (value && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    return value;
  }

  function dateParts(value){
    const raw = timestampToDate(value) || new Date().toISOString();
    const date = raw instanceof Date ? raw : new Date(raw);
    if (!Number.isFinite(date.getTime())) return { date: String(raw).slice(0, 10), time: '' };
    return { date: date.toISOString().slice(0, 10), time: date.toTimeString().slice(0, 5) };
  }

  function normalizeInvoiceRecord(row, sourceCollection='unknown'){
    const source = row || {};
    const customer = source.customerSnapshot || source.customer || {};
    const items = Array.isArray(source.itemsSnapshot) ? source.itemsSnapshot : (Array.isArray(source.items) ? source.items : []);
    const parts = dateParts(source.invoiceDate || source.date || source.dateTime || source.createdAt || source.generatedAt || source.updatedAt);
    const invoiceId = source.invoiceId || source.id || source.historyId || source.invoiceNumber || source.no || source.billNo || '';
    const invoiceNumber = source.invoiceNumber || source.no || source.billNo || invoiceId || '';
    const printed = source.printed === true || String(source.printStatus || '').toLowerCase() === 'printed';
    const printStatus = source.printStatus || (printed ? 'printed' : 'ready_to_print');
    const buyerAddress = source.buyerAddress || [customer.address1, customer.address2].filter(Boolean).join('\n') || customer.address || source.buyerAddress1 || '';
    const sourceRequestId = source.sourceRequestId || source.requestId || '';
    return {
      ...source,
      id: invoiceId || `remote-${sourceCollection}-${Date.now()}`,
      invoiceId,
      historyId: source.historyId || '',
      invoiceNumber,
      no: invoiceNumber,
      invoiceDate: source.invoiceDate || source.date || parts.date,
      date: source.date || source.invoiceDate || parts.date,
      time: source.time || parts.time,
      type: source.type || source.invoiceType || FULL_TAX_TYPE,
      invoiceType: source.invoiceType || source.type || FULL_TAX_TYPE,
      vatMode: source.vatMode || 'excluded',
      paperSize: source.paperSize || '9x11',
      buyerName: source.buyerName || source.customerName || customer.customerName || customer.name || '',
      buyerTax: source.buyerTax || source.customerTaxId || customer.taxId || customer.tax || '',
      buyerAddress,
      customerId: source.customerId || customer.customerId || '',
      customerSnapshot: customer,
      items: items.map(item => ({
        code: item.code || item.productCode || '',
        name: item.name || item.productName || '',
        qty: item.qty || item.quantity || '',
        unit: item.unit || '',
        price: item.price ?? item.salePrice ?? '',
        cost: item.cost ?? item.costPrice ?? ''
      })),
      itemsSnapshot: Array.isArray(source.itemsSnapshot) ? source.itemsSnapshot : items,
      beforeVat: source.beforeVat ?? source.subtotal ?? 0,
      subtotal: source.subtotal ?? source.beforeVat ?? 0,
      vat: source.vat ?? source.vatAmount ?? 0,
      vatAmount: source.vatAmount ?? source.vat ?? 0,
      total: source.total ?? source.grandTotal ?? 0,
      grandTotal: source.grandTotal ?? source.total ?? 0,
      sourceRequestId,
      requestId: source.requestId || sourceRequestId,
      sourceRequestNumber: source.sourceRequestNumber || source.requestNumber || '',
      requestNumber: source.requestNumber || source.sourceRequestNumber || '',
      requestedByUid: source.requestedByUid || source.ownerUid || '',
      ownerUid: source.ownerUid || source.requestedByUid || '',
      source: source.source || (sourceRequestId ? 'employee-request' : 'desktop-manual'),
      printed,
      printCount: Number(source.printCount || (printed ? 1 : 0)),
      printStatus,
      status: source.status || (printed ? 'printed' : 'ready_to_print'),
      printedAt: source.printedAt || null,
      printedBy: source.printedBy || '',
      sourceCollection,
      syncedFromPrimaryInvoice: sourceCollection === PRIMARY_INVOICE_COLLECTION,
      syncedFromTaxInvoiceHistory: sourceCollection === HISTORY_INDEX_COLLECTION
    };
  }

  function normalizeTaxInvoiceForDesktop(row, sourceCollection=PRIMARY_INVOICE_COLLECTION){
    return normalizeInvoiceRecord(row, sourceCollection);
  }

  function historyToDesktopInvoice(row){
    return normalizeInvoiceRecord(row, row && (row.sourceCollection || row.historySource) || 'unknown');
  }

  function recordPriority(row){
    if (row.sourceCollection === 'parentBridge:taxInvoices') return 5;
    if (row.sourceCollection === PRIMARY_INVOICE_COLLECTION) return 4;
    if (row.sourceCollection === HISTORY_INDEX_COLLECTION) return 3;
    if (row.sourceCollection === LEGACY_INVOICE_COLLECTION) return 2;
    return 1;
  }

  function mergeInvoiceHistorySources(sourceGroups={}){
    const byKey = new Map();
    const duplicates = [];
    const filtered = [];
    const counts = {};
    Object.keys(sourceGroups).forEach(sourceName => {
      const rows = Array.isArray(sourceGroups[sourceName]) ? sourceGroups[sourceName] : [];
      counts[sourceName] = rows.length;
      rows.forEach(raw => {
        const row = normalizeInvoiceRecord(raw, raw.sourceCollection || sourceName);
        const key = invoiceKey(row);
        if (!key) {
          filtered.push({ reason: 'missing-invoice-key', source: sourceName });
          return;
        }
        if (!row.no && !row.invoiceNumber) {
          filtered.push({ reason: 'missing-invoice-number', source: sourceName, invoiceId: row.invoiceId || key });
          return;
        }
        const existing = byKey.get(key);
        if (!existing || recordPriority(row) >= recordPriority(existing)) {
          if (existing) duplicates.push({ key, kept: row.sourceCollection, dropped: existing.sourceCollection });
          byKey.set(key, row);
        } else {
          duplicates.push({ key, kept: existing.sourceCollection, dropped: row.sourceCollection });
        }
      });
    });
    const rows = Array.from(byKey.values()).sort((a,b) =>
      String(b.date || '').localeCompare(String(a.date || '')) ||
      String(b.no || '').localeCompare(String(a.no || ''))
    );
    unifiedHistoryCache = rows;
    unifiedHistoryMeta = { counts, duplicates: duplicates.length, duplicateRows: duplicates, filtered, updatedAt: new Date().toISOString() };
    return { rows, counts, duplicates, filtered };
  }

  function mergeLegacyAndFirestoreInvoices(taxInvoices=[], legacyGroups={}){
    return mergeInvoiceHistorySources({
      [PRIMARY_INVOICE_COLLECTION]: Array.isArray(taxInvoices) ? taxInvoices : [],
      ...(legacyGroups || {})
    });
  }

  function getUnifiedHistoryRows(options={}){
    const localRows = options.includeLocal === false ? [] : readLocalInvoices().map(row => ({ ...row, sourceCollection: row.sourceCollection || 'localStorage:invoices' }));
    if (!unifiedHistoryCache.length && !bridgeHistoryCache.length) return mergeInvoiceHistorySources({ 'localStorage:invoices': localRows }).rows;
    return mergeInvoiceHistorySources({
      unifiedCache: unifiedHistoryCache,
      'parentBridge:taxInvoices': bridgeHistoryCache,
      'localStorage:invoices': localRows
    }).rows;
  }

  function getUnifiedHistoryMeta(){
    return { ...unifiedHistoryMeta, bridge: { ...bridgeHistoryMeta } };
  }

  function receiveBridgeHistory(payload={}){
    const rows = Array.isArray(payload.invoices) ? payload.invoices : (Array.isArray(payload.rows) ? payload.rows : []);
    bridgeHistoryCache = rows.map(row => normalizeInvoiceRecord({ ...row, sourceCollection: 'parentBridge:taxInvoices' }, 'parentBridge:taxInvoices'));
    bridgeHistoryMeta = {
      connected: true,
      count: bridgeHistoryCache.length,
      receivedAt: payload.receivedAt || payload.updatedAt || new Date().toISOString(),
      lastError: ''
    };
    const merged = mergeInvoiceHistorySources({
      unifiedCache: unifiedHistoryCache,
      'parentBridge:taxInvoices': bridgeHistoryCache,
      'localStorage:invoices': readLocalInvoices().map(row => ({ ...row, sourceCollection: 'localStorage:invoices' }))
    });
    mergeLocalInvoices(merged.rows);
    return { ok: true, count: bridgeHistoryCache.length, rendered: merged.rows.length, rows: merged.rows };
  }

  function setBridgeError(error){
    bridgeHistoryMeta = { ...bridgeHistoryMeta, connected: false, lastError: error && (error.code || error.message) || String(error || 'bridge-error') };
    return { ...bridgeHistoryMeta };
  }

  function snapshotRows(snapshot, collectionName='unknown'){
    if (!snapshot || !snapshot.docs) return [];
    return snapshot.docs.map(doc => normalizeInvoiceRecord({ ...(doc.data() || {}), historyId: doc.id, sourceCollection: collectionName }, collectionName));
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
    const latestSnapshots = {};
    historyUnsubscribes = HISTORY_COLLECTIONS.map(collectionName => root.db.collection(collectionName).onSnapshot(snapshot => {
      const incoming = snapshotRows(snapshot, collectionName);
      latestSnapshots[collectionName] = incoming;
      const merged = mergeInvoiceHistorySources({
        ...latestSnapshots,
        'localStorage:invoices': readLocalInvoices().map(row => ({ ...row, sourceCollection: 'localStorage:invoices' }))
      });
      mergeLocalInvoices(merged.rows);
      render({ source: collectionName, count: incoming.length, rendered: merged.rows.length });
    }, error => console.warn(`[invoice-history-adapter] Firestore ${collectionName} listener failed`, error)));
    return function unsubscribeFirestoreHistory(){
      historyUnsubscribes.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
      historyUnsubscribes = [];
    };
  }

  function subscribeTaxInvoices(options={}){
    if (!firestoreReady()) return bindFirestoreHistory(options);
    const render = typeof options.render === 'function' ? options.render : function(){};
    return root.db.collection(PRIMARY_INVOICE_COLLECTION).onSnapshot(snapshot => {
      const primaryRows = snapshotRows(snapshot, PRIMARY_INVOICE_COLLECTION);
      const merged = mergeLegacyAndFirestoreInvoices(primaryRows, {
        'localStorage:invoices': readLocalInvoices().map(row => ({ ...row, sourceCollection: 'localStorage:invoices' }))
      });
      mergeLocalInvoices(merged.rows);
      render({ source: PRIMARY_INVOICE_COLLECTION, count: primaryRows.length, rendered: merged.rows.length });
    }, error => console.warn(`[invoice-history-adapter] Firestore ${PRIMARY_INVOICE_COLLECTION} listener failed`, error));
  }

  async function loadUnifiedInvoiceHistory(options={}){
    if (!firestoreReady()) return { skipped: true, reason: 'firestore-not-ready', count: 0, rows: getUnifiedHistoryRows() };
    const collections = options.collections || HISTORY_COLLECTIONS;
    const snapshots = await Promise.all(collections.map(collectionName => root.db.collection(collectionName).get()
      .then(snapshot => ({ collectionName, rows: snapshotRows(snapshot, collectionName) }))
      .catch(error => {
        console.warn(`[invoice-history-adapter] Firestore ${collectionName} refresh failed`, error);
        return { collectionName, rows: [] };
      })));
    const sourceGroups = {
      'localStorage:invoices': readLocalInvoices().map(row => ({ ...row, sourceCollection: 'localStorage:invoices' }))
    };
    snapshots.forEach(result => { sourceGroups[result.collectionName] = result.rows; });
    const merged = mergeInvoiceHistorySources(sourceGroups);
    mergeLocalInvoices(merged.rows);
    if (typeof options.render === 'function') options.render({ source: 'firestore-refresh', count: merged.rows.length });
    return { ok: true, count: merged.rows.length, collections, rows: merged.rows, counts: merged.counts, duplicates: merged.duplicates.length, filtered: merged.filtered };
  }

  async function loadTaxInvoicesFromFirestore(options={}){
    if (!firestoreReady()) return { skipped: true, reason: 'firestore-not-ready', count: 0, rows: getUnifiedHistoryRows() };
    const snap = await root.db.collection(PRIMARY_INVOICE_COLLECTION).get();
    const primaryRows = snapshotRows(snap, PRIMARY_INVOICE_COLLECTION);
    const merged = mergeLegacyAndFirestoreInvoices(primaryRows, {
      'localStorage:invoices': readLocalInvoices().map(row => ({ ...row, sourceCollection: 'localStorage:invoices' }))
    });
    mergeLocalInvoices(merged.rows);
    if (typeof options.render === 'function') options.render({ source: PRIMARY_INVOICE_COLLECTION, count: merged.rows.length });
    return { ok: true, source: PRIMARY_INVOICE_COLLECTION, count: merged.rows.length, rows: merged.rows, primaryCount: primaryRows.length, duplicates: merged.duplicates.length, filtered: merged.filtered };
  }

  function refreshFirestoreHistoryOnce(options={}){
    return loadTaxInvoicesFromFirestore(options);
  }

  async function diagnoseEmployeeInvoiceHistory(options={}){
    if (!firestoreReady()) return { skipped: true, reason: 'firestore-not-ready' };
    const history = await loadUnifiedInvoiceHistory(options);
    const requestSnap = await root.db.collection('invoiceRequests').get().catch(() => ({ docs: [] }));
    const requests = (requestSnap.docs || []).map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
    const completed = requests.filter(row => Array.isArray(row.generatedInvoiceIds) && row.generatedInvoiceIds.length && (
      row.generationState === 'generated' ||
      row.generationState === 'completed' ||
      row.generated === true ||
      String(row.status || '').toLowerCase() === 'ready_to_print'
    ));
    const generatedIds = completed.flatMap(row => row.generatedInvoiceIds || []);
    const renderedKeys = new Set((history.rows || []).map(invoiceKey));
    const generatedNotRendered = generatedIds.filter(id => !renderedKeys.has(String(id)));
    return {
      ok: true,
      runtimeMarker: DESKTOP_HISTORY_BUILD,
      invoiceRequestsCompleted: completed.length,
      generatedInvoiceIds: generatedIds.length,
      taxInvoicesFound: history.counts && history.counts[PRIMARY_INVOICE_COLLECTION] || 0,
      employeeRequestInvoicesFound: (history.rows || []).filter(row => row.source === 'employee-request').length,
      taxInvoiceHistoryFound: history.counts && history.counts[HISTORY_INDEX_COLLECTION] || 0,
      invoicesLegacyFound: history.counts && history.counts[LEGACY_INVOICE_COLLECTION] || 0,
      rendered: history.count || 0,
      duplicates: history.duplicates || 0,
      filtered: (history.filtered || []).length + generatedNotRendered.length,
      filteredReasons: [
        ...(history.filtered || []).map(row => row.reason),
        ...generatedNotRendered.map(id => `generated-id-not-rendered:${id}`)
      ].slice(0, 20),
      sample: (history.rows || []).slice(0, 20).map(row => ({
        invoiceId: row.invoiceId,
        invoiceNumber: row.no,
        status: row.status,
        printStatus: row.printStatus,
        source: row.source,
        sourceCollection: row.sourceCollection
      }))
    };
  }

  async function markPrinted(invoice, actor={}){
    if (!firestoreReady() || !invoice) return { skipped: true, reason: 'firestore-not-ready' };
    const invoiceId = invoice.invoiceId || invoice.id || '';
    const requestId = invoice.sourceRequestId || invoice.requestId || '';
    if (!invoiceId && !requestId) return { skipped: true, reason: 'missing-central-ids' };
    const now = new Date().toISOString();
    const printedInvoice = root.ChokAnanInvoicePrintService && typeof root.ChokAnanInvoicePrintService.markInvoicePrinted === 'function'
      ? root.ChokAnanInvoicePrintService.markInvoicePrinted(invoice, actor, now)
      : { printed: true, printedAt: now, printedBy: actor.by || 'tax-invoice-desktop', printedByUid: actor.uid || '', updatedAt: now, printStatus: 'printed' };
    if (invoiceId) {
      await root.db.collection(PRIMARY_INVOICE_COLLECTION).doc(invoiceId).set(printedInvoice, { merge: true });
    }
    if (requestId) {
      const requestRef = root.db.collection('invoiceRequests').doc(requestId);
      const requestSnap = await requestRef.get();
      if (requestSnap.exists) {
        const data = requestSnap.data() || {};
        const ids = (Array.isArray(data.generatedInvoiceIds) && data.generatedInvoiceIds.length ? data.generatedInvoiceIds : data.nativeInvoiceIds) || [];
        let printedCount = Math.max(Number(data.printedInvoiceCount || 0), invoiceId ? 1 : 0);
        if (ids.length) {
          const invoiceSnaps = await Promise.all(ids.map(id => root.db.collection(PRIMARY_INVOICE_COLLECTION).doc(id).get()));
          printedCount = invoiceSnaps.filter(snap => snap.exists && (snap.data() || {}).printed === true).length;
          const printedIds = invoiceSnaps.filter(snap => snap.exists && (snap.data() || {}).printed === true).map(snap => snap.id);
          const printedNumbers = invoiceSnaps.filter(snap => snap.exists && (snap.data() || {}).printed === true).map(snap => (snap.data() || {}).invoiceNumber || (snap.data() || {}).no || snap.id).filter(Boolean);
          data.printedInvoiceIds = printedIds;
          data.printedInvoiceNumbers = printedNumbers;
        }
        const allPrinted = ids.length > 0 ? printedCount >= ids.length : true;
        await requestRef.set({
          status: allPrinted ? 'printed' : 'partially_printed',
          printStatus: allPrinted ? 'printed' : 'partially_printed',
          printedInvoiceCount: printedCount,
          printedInvoiceIds: data.printedInvoiceIds || [],
          printedInvoiceNumbers: data.printedInvoiceNumbers || [],
          printedAt: allPrinted ? now : (data.printedAt || null),
          printedBy: allPrinted ? (actor.by || 'tax-invoice-desktop') : (data.printedBy || ''),
          printedByUid: allPrinted ? (actor.uid || '') : (data.printedByUid || ''),
          updatedAt: now
        }, { merge: true });
      }
    }
    await loadUnifiedInvoiceHistory().catch(() => {});
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
      invoiceType: row.invoiceType || row.type || FULL_TAX_TYPE,
      type: row.type || row.invoiceType || FULL_TAX_TYPE,
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
        reserved = root.ChokAnanInvoiceNumberService.reserveRange(last, missing.length).invoiceNumbers;
        transaction.set(counterRef, {
          prefix: 'IV',
          lastSequence: last + missing.length,
          updatedAt: now
        }, { merge: true });
      }
      let reserveIndex = 0;
      return rows.map(row => {
        const needsNumber = !(row.invoiceId || '').trim() || !(row.no || row.invoiceNumber || '').trim();
        const invoiceNumber = needsNumber ? reserved[reserveIndex++] : (row.no || row.invoiceNumber || '');
        const invoiceId = row.invoiceId || invoiceNumber || `desktop-${now.replace(/\D/g, '')}-${reserveIndex + 1}`;
        const central = desktopInvoiceToCentral(row, { ...actor, invoiceId, invoiceNumber, now });
        transaction.set(db.collection(PRIMARY_INVOICE_COLLECTION).doc(invoiceId), central, { merge: true });
        return normalizeInvoiceRecord(central, PRIMARY_INVOICE_COLLECTION);
      });
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

  const api = {
    DESKTOP_HISTORY_BUILD,
    PRIMARY_INVOICE_COLLECTION,
    HISTORY_INDEX_COLLECTION,
    LEGACY_INVOICE_COLLECTION,
    LEGACY_HISTORY_COLLECTION,
    HISTORY_COLLECTIONS,
    readLocalInvoices,
    writeLocalInvoices,
    mergeLocalInvoices,
    normalizeInvoiceRecord,
    normalizeTaxInvoiceForDesktop,
    receiveBridgeHistory,
    setBridgeError,
    historyToDesktopInvoice,
    mergeInvoiceHistorySources,
    mergeLegacyAndFirestoreInvoices,
    loadUnifiedInvoiceHistory,
    loadTaxInvoicesFromFirestore,
    getUnifiedHistoryRows,
    getUnifiedHistoryMeta,
    desktopInvoiceToCentral,
    bindFirestoreHistory,
    subscribeTaxInvoices,
    refreshFirestoreHistoryOnce,
    diagnoseEmployeeInvoiceHistory,
    markPrinted,
    syncDesktopManualInvoices,
    manualHistorySummary
  };
  root.ChokAnanInvoiceHistoryAdapter = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
