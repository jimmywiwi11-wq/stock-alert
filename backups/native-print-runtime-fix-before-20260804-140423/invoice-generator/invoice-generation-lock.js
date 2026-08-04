(function(root){
  'use strict';

  const LOCK_COLLECTION = 'invoiceGenerationLocks';
  const DEFAULT_TTL_MS = 120000;

  function nowMs(){
    return Date.now();
  }

  function lockId(requestId){
    return String(requestId || '').trim();
  }

  function isActiveLock(lock, at){
    const data = lock || {};
    return data.status === 'locked' && Number(data.expiresAt || 0) > (at || nowMs());
  }

  function createLockPayload(requestId, actor, at, ttlMs){
    const startedAt = at || nowMs();
    return {
      requestId: lockId(requestId),
      status: 'locked',
      lockedAt: startedAt,
      expiresAt: startedAt + (ttlMs || DEFAULT_TTL_MS),
      lockedByUid: String(actor && actor.uid || ''),
      lockedBy: String(actor && actor.by || 'system'),
      generationVersion: String(actor && actor.generationVersion || 'v1')
    };
  }

  function completedLockPayload(result, at){
    return {
      status: 'completed',
      completedAt: at || nowMs(),
      invoiceIds: Array.isArray(result && result.invoiceIds) ? result.invoiceIds : []
    };
  }

  const api = { LOCK_COLLECTION, DEFAULT_TTL_MS, lockId, isActiveLock, createLockPayload, completedLockPayload };
  root.ChokAnanInvoiceGenerationLock = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
