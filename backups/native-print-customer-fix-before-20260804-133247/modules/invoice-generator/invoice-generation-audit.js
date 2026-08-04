(function(root){
  'use strict';

  const AUDIT_COLLECTION = 'invoiceGenerationAuditLogs';

  function event(request, action, actor, metadata){
    return {
      requestId: request && request.requestId || '',
      requestNumber: request && request.requestNumber || '',
      action,
      actorUid: actor && actor.uid || '',
      by: actor && actor.by || 'system',
      at: Date.now(),
      metadata: metadata || {}
    };
  }

  const api = { AUDIT_COLLECTION, event };
  root.ChokAnanInvoiceGenerationAudit = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
