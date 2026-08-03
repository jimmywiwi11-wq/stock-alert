(function(root){
  'use strict';

  const REQUEST_COLLECTION = 'invoiceRequests';
  const COUNTER_COLLECTION = 'invoiceRequestCounters';
  const IDEMPOTENCY_COLLECTION = 'invoiceRequestIdempotency';
  const AUDIT_COLLECTION = 'invoiceRequestAuditLogs';

  function text(value){
    return String(value == null ? '' : value).trim();
  }

  function firestoreReady(){
    return !!(root.db && root.firebase && typeof root.db.collection === 'function');
  }

  function bangkokDateKey(date){
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date || new Date()).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    return `${parts.year}${parts.month}${parts.day}`;
  }

  function requestNumber(dateKey, sequence){
    return `REQ-${dateKey}-${String(sequence).padStart(6, '0')}`;
  }

  function localRequestId(){
    if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
    return `local_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  }

  async function submit(snapshot){
    const store = root.CMSInvoiceRequestStore;
    const idempotencyKey = text(snapshot && snapshot.idempotencyKey) || `idem_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const payloadBase = {
      ...(snapshot || {}),
      idempotencyKey,
      testMode: false,
      ownerUid: text(snapshot && (snapshot.ownerUid || snapshot.requestedByUid)),
      requestedByUid: text(snapshot && (snapshot.requestedByUid || snapshot.ownerUid)),
      status: 'กำลังดำเนินการ',
      generationState: 'not-started',
      generatedInvoiceIds: [],
      printedInvoiceCount: 0,
      updatedAt: new Date().toISOString()
    };

    if (!firestoreReady()) {
      const queued = {
        ...payloadBase,
        requestId: payloadBase.requestId || `PENDING-${localRequestId()}`,
        requestNumber: payloadBase.requestNumber || 'PENDING-FIREBASE-SYNC',
        syncStatus: 'pending'
      };
      return { offline: true, request: store.queueProductionRequest(queued) };
    }

    const dateKey = bangkokDateKey(new Date());
    const db = root.db;
    const requestRef = db.collection(REQUEST_COLLECTION).doc();
    const counterRef = db.collection(COUNTER_COLLECTION).doc(dateKey);
    const idemRef = db.collection(IDEMPOTENCY_COLLECTION).doc(idempotencyKey);
    const auditRef = db.collection(AUDIT_COLLECTION).doc();

    const result = await db.runTransaction(async transaction => {
      const idemSnap = await transaction.get(idemRef);
      if (idemSnap.exists) {
        const existing = idemSnap.data() || {};
        return { duplicate: true, requestId: existing.requestId, requestNumber: existing.requestNumber };
      }

      const counterSnap = await transaction.get(counterRef);
      const nextSeq = (counterSnap.exists ? Number(counterSnap.data().lastSequence || 0) : 0) + 1;
      const number = requestNumber(dateKey, nextSeq);
      const now = new Date().toISOString();
      const request = {
        ...payloadBase,
        requestId: requestRef.id,
        requestNumber: number,
        requestedAt: payloadBase.requestedAt || now,
        updatedAt: now,
        syncStatus: 'synced'
      };

      transaction.set(counterRef, {
        dateKey,
        lastSequence: nextSeq,
        updatedAt: now
      }, { merge: true });
      transaction.set(requestRef, request);
      transaction.set(idemRef, {
        idempotencyKey,
        requestId: requestRef.id,
        requestNumber: number,
        ownerUid: request.ownerUid || request.requestedByUid || '',
        requestedByUid: request.requestedByUid || request.ownerUid || '',
        createdAt: now
      });
      transaction.set(auditRef, {
        requestId: requestRef.id,
        requestNumber: number,
        action: 'submitted',
        actorUid: request.requestedByUid || request.ownerUid || '',
        by: request.requestedByNickname || request.requestedBy || '',
        branch: request.requestedBranch || '',
        at: now
      });
      return { duplicate: false, request };
    });

    if (result.duplicate) {
      const mirror = {
        ...payloadBase,
        requestId: result.requestId,
        requestNumber: result.requestNumber,
        syncStatus: 'synced-duplicate'
      };
      store.saveProductionRequest(mirror);
      return { duplicate: true, request: mirror };
    }

    store.saveProductionRequest(result.request);
    store.removePendingProductionRequest(idempotencyKey);
    return { request: result.request };
  }

  root.CMSInvoiceRequestSync = {
    REQUEST_COLLECTION,
    COUNTER_COLLECTION,
    IDEMPOTENCY_COLLECTION,
    AUDIT_COLLECTION,
    firestoreReady,
    bangkokDateKey,
    requestNumber,
    submit
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.CMSInvoiceRequestSync;
})(typeof window !== 'undefined' ? window : globalThis);
