(function(root){
  'use strict';

  const BRIDGE_BUILD = 'V25-PARENT-TAX-BRIDGE';
  const SOURCE_PARENT = 'chokanan-cms';
  const SOURCE_IFRAME = 'tax-invoice-app';
  const PRIMARY_COLLECTION = 'taxInvoices';
  const REQUEST_COLLECTION = 'invoiceRequests';
  const ALLOWED_TYPES = new Set([
    'TAX_HISTORY_BRIDGE_READY',
    'REQUEST_TAX_INVOICE_HISTORY',
    'REQUEST_TAX_INVOICE_DETAIL',
    'REQUEST_MARK_INVOICE_PRINTED',
    'REQUEST_REFRESH_TAX_HISTORY'
  ]);
  const STATUSES = new Set(['ready_to_print', 'partially_printed', 'printed']);

  let frameGetter = function(){ return null; };
  let targetOrigin = root.location && root.location.origin !== 'null' ? root.location.origin : '*';
  let unsubscribe = null;
  let cache = [];
  let lastError = '';
  let lastUpdateAt = '';
  let initialized = false;

  function safeText(value){
    return String(value == null ? '' : value).trim();
  }

  function firestoreReady(){
    return !!(root.db && typeof root.db.collection === 'function');
  }

  function activeUser(){
    return root.auth && root.auth.currentUser || null;
  }

  function normalizeInvoice(row, id){
    const source = row || {};
    const customer = source.customerSnapshot || {};
    const invoiceId = safeText(source.invoiceId || source.id || id || source.invoiceNumber || source.no);
    const invoiceNumber = safeText(source.invoiceNumber || source.no || invoiceId);
    const status = safeText(source.status || source.printStatus || (source.printed ? 'printed' : 'ready_to_print')).toLowerCase();
    return {
      ...source,
      invoiceId,
      id: invoiceId,
      invoiceNumber,
      no: invoiceNumber,
      requestId: safeText(source.requestId || source.sourceRequestId),
      sourceRequestId: safeText(source.sourceRequestId || source.requestId),
      requestNumber: safeText(source.requestNumber || source.sourceRequestNumber),
      sourceRequestNumber: safeText(source.sourceRequestNumber || source.requestNumber),
      source: safeText(source.source || (source.requestId || source.sourceRequestId ? 'employee-request' : 'desktop-manual')),
      customerSnapshot: customer,
      buyerName: safeText(source.buyerName || customer.customerName || customer.name),
      buyerTax: safeText(source.buyerTax || customer.taxId || customer.tax),
      buyerAddress: source.buyerAddress || [customer.address1, customer.address2].filter(Boolean).join('\n') || customer.address || '',
      items: Array.isArray(source.items) ? source.items : (Array.isArray(source.itemsSnapshot) ? source.itemsSnapshot : []),
      itemsSnapshot: Array.isArray(source.itemsSnapshot) ? source.itemsSnapshot : (Array.isArray(source.items) ? source.items : []),
      subtotal: Number(source.subtotal || source.beforeVat || 0),
      beforeVat: Number(source.beforeVat || source.subtotal || 0),
      vatAmount: Number(source.vatAmount || source.vat || 0),
      vat: Number(source.vat || source.vatAmount || 0),
      grandTotal: Number(source.grandTotal || source.total || 0),
      total: Number(source.total || source.grandTotal || 0),
      invoiceDate: source.invoiceDate || source.date || source.createdAt || '',
      date: source.date || source.invoiceDate || '',
      invoiceType: source.invoiceType || source.type || '',
      type: source.type || source.invoiceType || '',
      paperSize: source.paperSize || '9x11',
      vatMode: source.vatMode || 'excluded',
      printStatus: safeText(source.printStatus || status || 'ready_to_print'),
      status: safeText(source.status || status || 'ready_to_print'),
      printedAt: source.printedAt || null,
      printedBy: source.printedBy || '',
      createdAt: source.createdAt || null,
      createdBy: source.createdBy || '',
      sourceCollection: 'parentBridge:taxInvoices',
      bridgedFromParent: true
    };
  }

  function shouldInclude(invoice){
    const source = safeText(invoice.source).toLowerCase();
    const status = safeText(invoice.status || invoice.printStatus).toLowerCase();
    return source === 'employee-request' || !!invoice.requestId || !!invoice.sourceRequestId || STATUSES.has(status);
  }

  function message(type, payload){
    return { source: SOURCE_PARENT, type, payload: payload || {}, version: 1, bridgeBuild: BRIDGE_BUILD };
  }

  function frameWindow(){
    const frame = frameGetter && frameGetter();
    return frame && frame.contentWindow || null;
  }

  function post(type, payload){
    const win = frameWindow();
    if (!win) return false;
    win.postMessage(message(type, payload), targetOrigin);
    return true;
  }

  function payload(extra={}){
    return {
      bridgeBuild: BRIDGE_BUILD,
      projectId: root.firebase && root.firebase.app && root.firebase.app().options && root.firebase.app().options.projectId || '',
      authUid: activeUser() && activeUser().uid || '',
      invoiceCount: cache.length,
      employeeInvoiceCount: cache.filter(row => row.source === 'employee-request').length,
      invoices: cache.slice(),
      updatedAt: lastUpdateAt,
      lastError,
      ...extra
    };
  }

  function setError(error, context){
    lastError = `${context || 'bridge'}:${error && (error.code || error.message) || error}`;
    console.error('[CMS Tax Invoice History Bridge]', lastError, error);
    post('TAX_HISTORY_BRIDGE_ERROR', payload({ error: lastError }));
  }

  function applySnapshot(snapshot){
    cache = (snapshot.docs || [])
      .map(doc => normalizeInvoice({ ...(doc.data() || {}) }, doc.id))
      .filter(shouldInclude)
      .sort((a, b) => String(b.invoiceDate || b.date || '').localeCompare(String(a.invoiceDate || a.date || '')) || String(b.invoiceNumber).localeCompare(String(a.invoiceNumber)));
    lastUpdateAt = new Date().toISOString();
    lastError = '';
    console.info('PARENT_BRIDGE_INVOICE_COUNT', cache.length);
    post('TAX_INVOICE_HISTORY_UPDATE', payload());
    return cache;
  }

  async function refresh(){
    if (!firestoreReady()) {
      setError(new Error('parent-firestore-not-ready'), 'refresh');
      return payload();
    }
    try {
      const snapshot = await root.db.collection(PRIMARY_COLLECTION).get();
      applySnapshot(snapshot);
      post('TAX_INVOICE_HISTORY_RESPONSE', payload({ refreshed: true }));
      return payload();
    } catch (error) {
      setError(error, 'refresh');
      return payload();
    }
  }

  function subscribe(){
    if (unsubscribe) return;
    if (!firestoreReady()) {
      setError(new Error('parent-firestore-not-ready'), 'subscribe');
      return;
    }
    try {
      unsubscribe = root.db.collection(PRIMARY_COLLECTION).onSnapshot(snapshot => {
        applySnapshot(snapshot);
      }, error => setError(error, 'onSnapshot'));
    } catch (error) {
      setError(error, 'subscribe');
    }
  }

  async function markPrinted(data){
    const invoiceId = safeText(data && data.invoiceId);
    const requestId = safeText(data && (data.requestId || data.sourceRequestId));
    if (!invoiceId || data.confirmation !== true) return { ok: false, error: 'invalid-print-payload' };
    if (!firestoreReady()) return { ok: false, error: 'parent-firestore-not-ready' };
    const user = activeUser();
    const now = data.printedAt || new Date().toISOString();
    const actorName = root.nickname || root.localStorage && root.localStorage.getItem('stockAlertNickname') || 'tax-invoice-desktop';
    try {
      await root.db.collection(PRIMARY_COLLECTION).doc(invoiceId).set({
        printed: true,
        printStatus: 'printed',
        printedAt: now,
        printedBy: actorName,
        printedByUid: user && user.uid || '',
        updatedAt: now
      }, { merge: true });

      if (requestId) {
        const requestRef = root.db.collection(REQUEST_COLLECTION).doc(requestId);
        const requestSnap = await requestRef.get();
        if (requestSnap.exists) {
          const request = requestSnap.data() || {};
          const ids = Array.isArray(request.generatedInvoiceIds) ? request.generatedInvoiceIds : [];
          const snaps = await Promise.all(ids.map(id => root.db.collection(PRIMARY_COLLECTION).doc(id).get()));
          const printedCount = snaps.filter(snap => snap.exists && (snap.data() || {}).printed === true).length;
          const allPrinted = ids.length > 0 ? printedCount >= ids.length : true;
          await requestRef.set({
            status: allPrinted ? 'printed' : 'partially_printed',
            printStatus: allPrinted ? 'printed' : 'partially_printed',
            printedInvoiceCount: printedCount,
            printedAt: allPrinted ? now : (request.printedAt || null),
            printedBy: allPrinted ? actorName : (request.printedBy || ''),
            printedByUid: allPrinted ? (user && user.uid || '') : (request.printedByUid || ''),
            updatedAt: now
          }, { merge: true });
        }
      }
      await refresh();
      return { ok: true, invoiceId, requestId };
    } catch (error) {
      setError(error, 'markPrinted');
      return { ok: false, invoiceId, requestId, error: error && (error.code || error.message) || String(error) };
    }
  }

  function validIncoming(event){
    const frame = frameGetter && frameGetter();
    if (!frame || event.source !== frame.contentWindow) return false;
    if (targetOrigin !== '*' && event.origin !== root.location.origin) return false;
    const data = event.data || {};
    return data.source === SOURCE_IFRAME && ALLOWED_TYPES.has(data.type);
  }

  async function onMessage(event){
    if (!validIncoming(event)) return;
    const data = event.data || {};
    if (data.type === 'TAX_HISTORY_BRIDGE_READY') {
      subscribe();
      post('TAX_INVOICE_HISTORY_RESPONSE', payload({ ready: true }));
      if (!cache.length) refresh();
    }
    if (data.type === 'REQUEST_TAX_INVOICE_HISTORY' || data.type === 'REQUEST_REFRESH_TAX_HISTORY') {
      subscribe();
      await refresh();
    }
    if (data.type === 'REQUEST_TAX_INVOICE_DETAIL') {
      const id = safeText(data.payload && data.payload.invoiceId);
      const invoice = cache.find(row => row.invoiceId === id || row.invoiceNumber === id) || null;
      post('TAX_INVOICE_DETAIL_RESPONSE', { invoiceId: id, invoice, found: !!invoice, bridgeBuild: BRIDGE_BUILD });
    }
    if (data.type === 'REQUEST_MARK_INVOICE_PRINTED') {
      const result = await markPrinted(data.payload || {});
      post('MARK_INVOICE_PRINTED_RESULT', { ...(result || {}), requestKey: data.payload && data.payload.requestKey || '' });
    }
  }

  function init(options={}){
    frameGetter = typeof options.getFrame === 'function' ? options.getFrame : frameGetter;
    targetOrigin = options.origin || targetOrigin;
    if (!initialized) {
      root.addEventListener('message', onMessage);
      initialized = true;
    }
    subscribe();
    return api;
  }

  function diagnostics(){
    return {
      bridgeBuild: BRIDGE_BUILD,
      parentProjectId: root.firebase && root.firebase.app && root.firebase.app().options && root.firebase.app().options.projectId || '',
      parentAuthUid: activeUser() && activeUser().uid || '',
      parentTaxInvoicesCount: cache.length,
      employeeInvoiceCount: cache.filter(row => row.source === 'employee-request').length,
      lastBridgeUpdateAt: lastUpdateAt,
      lastError
    };
  }

  const api = {
    BRIDGE_BUILD,
    init,
    subscribe,
    refresh,
    markPrinted,
    diagnostics,
    normalizeInvoice,
    _state: () => ({ cache: cache.slice(), lastError, lastUpdateAt })
  };

  root.ChokAnanCMSTaxInvoiceHistoryBridge = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
