(function(root){
  'use strict';

  const DRAFT_KEY = 'cms.invoiceRequest.testDrafts';
  const REQUEST_KEY = 'cms.invoiceRequest.testRequests';
  const PRODUCTION_DRAFT_KEY = 'cms.invoiceRequest.productionDrafts';
  const PRODUCTION_REQUEST_KEY = 'cms.invoiceRequest.productionRequests';
  const PRODUCTION_PENDING_KEY = 'cms.invoiceRequest.productionPending';

  function readJson(key, fallback){
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function listDrafts(){
    const rows = readJson(DRAFT_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function listProductionDrafts(){
    const rows = readJson(PRODUCTION_DRAFT_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function saveDraft(snapshot){
    const drafts = listDrafts();
    const draftId = snapshot.draftId || `TEST-DRAFT-${Date.now()}`;
    const row = { ...snapshot, draftId, testMode: true, savedAt: new Date().toISOString() };
    const next = [row, ...drafts.filter(item => item.draftId !== draftId)].slice(0, 20);
    writeJson(DRAFT_KEY, next);
    return row;
  }

  function saveProductionDraft(snapshot){
    const drafts = listProductionDrafts();
    const draftId = snapshot.draftId || `DRAFT-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const row = { ...snapshot, draftId, testMode: false, savedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const next = [row, ...drafts.filter(item => item.draftId !== draftId)].slice(0, 20);
    writeJson(PRODUCTION_DRAFT_KEY, next);
    return row;
  }

  function deleteDraft(draftId){
    writeJson(DRAFT_KEY, listDrafts().filter(item => item.draftId !== draftId));
  }

  function deleteProductionDraft(draftId){
    writeJson(PRODUCTION_DRAFT_KEY, listProductionDrafts().filter(item => item.draftId !== draftId));
  }

  function listRequests(){
    const rows = readJson(REQUEST_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function listProductionRequests(){
    const rows = readJson(PRODUCTION_REQUEST_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function saveRequest(snapshot){
    const requests = listRequests();
    const next = [snapshot, ...requests.filter(item => item.requestId !== snapshot.requestId)].slice(0, 100);
    writeJson(REQUEST_KEY, next);
    return snapshot;
  }

  function saveProductionRequest(snapshot){
    const requests = listProductionRequests();
    const key = snapshot.requestId || snapshot.idempotencyKey;
    const next = [snapshot, ...requests.filter(item => (item.requestId || item.idempotencyKey) !== key)].slice(0, 100);
    writeJson(PRODUCTION_REQUEST_KEY, next);
    return snapshot;
  }

  function listPendingProductionRequests(){
    const rows = readJson(PRODUCTION_PENDING_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function queueProductionRequest(snapshot){
    const pending = listPendingProductionRequests();
    const key = snapshot.idempotencyKey || `pending-${Date.now()}`;
    const row = { ...snapshot, idempotencyKey: key, queuedAt: new Date().toISOString(), syncStatus: 'pending' };
    const next = [row, ...pending.filter(item => item.idempotencyKey !== key)].slice(0, 50);
    writeJson(PRODUCTION_PENDING_KEY, next);
    saveProductionRequest(row);
    return row;
  }

  function removePendingProductionRequest(idempotencyKey){
    writeJson(PRODUCTION_PENDING_KEY, listPendingProductionRequests().filter(item => item.idempotencyKey !== idempotencyKey));
  }

  function clearTestData(){
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(REQUEST_KEY);
  }

  root.CMSInvoiceRequestStore = {
    DRAFT_KEY,
    REQUEST_KEY,
    PRODUCTION_DRAFT_KEY,
    PRODUCTION_REQUEST_KEY,
    PRODUCTION_PENDING_KEY,
    readJson,
    listDrafts,
    saveDraft,
    deleteDraft,
    listRequests,
    saveRequest,
    listProductionDrafts,
    saveProductionDraft,
    deleteProductionDraft,
    listProductionRequests,
    saveProductionRequest,
    listPendingProductionRequests,
    queueProductionRequest,
    removePendingProductionRequest,
    clearTestData
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.CMSInvoiceRequestStore;
})(typeof window !== 'undefined' ? window : globalThis);
