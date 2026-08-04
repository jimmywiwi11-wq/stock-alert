(function(root){
  'use strict';

  const DRAFT_KEY = 'cms.invoiceRequest.testDrafts';
  const REQUEST_KEY = 'cms.invoiceRequest.testRequests';

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

  function saveDraft(snapshot){
    const drafts = listDrafts();
    const draftId = snapshot.draftId || `TEST-DRAFT-${Date.now()}`;
    const row = { ...snapshot, draftId, testMode: true, savedAt: new Date().toISOString() };
    const next = [row, ...drafts.filter(item => item.draftId !== draftId)].slice(0, 20);
    writeJson(DRAFT_KEY, next);
    return row;
  }

  function deleteDraft(draftId){
    writeJson(DRAFT_KEY, listDrafts().filter(item => item.draftId !== draftId));
  }

  function listRequests(){
    const rows = readJson(REQUEST_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function saveRequest(snapshot){
    const requests = listRequests();
    const next = [snapshot, ...requests.filter(item => item.requestId !== snapshot.requestId)].slice(0, 100);
    writeJson(REQUEST_KEY, next);
    return snapshot;
  }

  function clearTestData(){
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(REQUEST_KEY);
  }

  root.CMSInvoiceRequestStore = {
    DRAFT_KEY,
    REQUEST_KEY,
    readJson,
    listDrafts,
    saveDraft,
    deleteDraft,
    listRequests,
    saveRequest,
    clearTestData
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.CMSInvoiceRequestStore;
})(typeof window !== 'undefined' ? window : globalThis);
