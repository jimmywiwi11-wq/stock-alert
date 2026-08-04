(function(root){
  'use strict';

  const REQUEST_COLLECTION = 'invoiceRequests';
  const INVOICE_COLLECTION = 'taxInvoices';
  const HISTORY_COLLECTION = 'taxInvoiceHistory';
  const IDEMPOTENCY_COLLECTION = 'invoiceGenerationIdempotency';

  function firestoreReady(){
    return !!(root.db && typeof root.db.collection === 'function' && typeof root.db.runTransaction === 'function');
  }

  function ref(db, collection, id){
    return db.collection(collection).doc(id);
  }

  function dateText(){
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  function actor(){
    const user = root.auth && root.auth.currentUser;
    const uid = user && user.uid || root.localStorage && root.localStorage.getItem('stockAlertUserUid') || '';
    const by = root.nickname || root.localStorage && root.localStorage.getItem('stockAlertNickname') || 'system';
    return { uid, by, generationVersion: 'v1' };
  }

  function idempotencyKey(requestId, generationVersion){
    return `${requestId}:${generationVersion || 'v1'}`;
  }

  const api = {
    REQUEST_COLLECTION,
    INVOICE_COLLECTION,
    HISTORY_COLLECTION,
    IDEMPOTENCY_COLLECTION,
    firestoreReady,
    ref,
    dateText,
    actor,
    idempotencyKey
  };

  root.ChokAnanInvoiceGeneratorStore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
