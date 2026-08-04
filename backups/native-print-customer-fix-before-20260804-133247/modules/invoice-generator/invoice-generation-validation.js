(function(root){
  'use strict';

  const STATUS_PROCESSING = '\u0e01\u0e33\u0e25\u0e31\u0e07\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23';
  const STATUS_READY = '\u0e1e\u0e23\u0e49\u0e2d\u0e21\u0e1e\u0e34\u0e21\u0e1e\u0e4c';
  const SETTINGS = Object.freeze({
    invoiceType: 'full-tax-invoice',
    paperSize: '9x11',
    vatMode: 'exclusive',
    vatRate: 7,
    itemsPerInvoice: 10
  });

  function text(value){
    return String(value == null ? '' : value).trim();
  }

  function normalizeStatus(value){
    const raw = text(value);
    if (raw === STATUS_PROCESSING || raw.toLowerCase() === 'processing') return STATUS_PROCESSING;
    if (raw === STATUS_READY || raw.toLowerCase() === 'ready-to-print') return STATUS_READY;
    return raw;
  }

  function itemsOf(request){
    return Array.isArray(request && request.itemSnapshots) ? request.itemSnapshots :
      (Array.isArray(request && request.items) ? request.items : []);
  }

  function assertFixedSettings(request){
    const settings = request && request.invoiceSettings || {};
    const invalid = [];
    if (settings.invoiceType !== SETTINGS.invoiceType) invalid.push('invoiceType');
    if (settings.paperSize !== SETTINGS.paperSize) invalid.push('paperSize');
    if (settings.vatMode !== SETTINGS.vatMode) invalid.push('vatMode');
    if (Number(settings.vatRate) !== SETTINGS.vatRate) invalid.push('vatRate');
    if (Number(settings.itemsPerInvoice) !== SETTINGS.itemsPerInvoice) invalid.push('itemsPerInvoice');
    if (invalid.length) throw new Error(`invalid-invoice-settings:${invalid.join(',')}`);
  }

  function validateRequest(request){
    if (!request || typeof request !== 'object') throw new Error('request-not-found');
    if (!text(request.requestId)) throw new Error('missing-request-id');
    if (!text(request.requestNumber)) throw new Error('missing-request-number');
    if (request.testMode === true) throw new Error('test-request-not-eligible');
    if (normalizeStatus(request.status) !== STATUS_PROCESSING) throw new Error('request-status-not-processing');
    if (text(request.generationState || 'not-started') !== 'not-started') throw new Error('generation-already-started');
    if (Array.isArray(request.generatedInvoiceIds) && request.generatedInvoiceIds.length > 0) throw new Error('request-already-generated');
    if (request.generated === true) throw new Error('request-already-generated');
    if (request.generationLock && text(request.generationLock.status) === 'locked') throw new Error('request-locked');
    const customer = request.customerSnapshot || request.customer;
    if (!customer || !text(customer.customerName || customer.name)) throw new Error('missing-customer-snapshot');
    const items = itemsOf(request);
    if (!items.length) throw new Error('missing-item-snapshots');
    if (Number(request.itemCount || items.length) !== items.length) throw new Error('item-count-mismatch');
    assertFixedSettings(request);
    return { valid: true, items, customer, settings: { ...SETTINGS } };
  }

  const api = { STATUS_PROCESSING, STATUS_READY, SETTINGS, normalizeStatus, itemsOf, assertFixedSettings, validateRequest };
  root.ChokAnanInvoiceGenerationValidation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
