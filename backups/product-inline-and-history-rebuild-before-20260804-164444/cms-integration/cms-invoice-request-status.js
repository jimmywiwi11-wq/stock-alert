(function(){
  'use strict';

  const STATUS = Object.freeze({
    PROCESSING: '\u0e01\u0e33\u0e25\u0e31\u0e07\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23',
    READY_TO_PRINT: '\u0e1e\u0e23\u0e49\u0e2d\u0e21\u0e1e\u0e34\u0e21\u0e1e\u0e4c',
    PRINTED: '\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e41\u0e25\u0e49\u0e27'
  });

  const EVENT = Object.freeze({
    SUBMITTED: 'submitted',
    GENERATED: 'generated',
    PRINTED: 'printed'
  });

  const PRINT_SOURCE = Object.freeze({
    SYSTEM: 'system_print_confirmation',
    ADMIN: 'desktop_admin'
  });

  const VALID_STATUSES = new Set(Object.values(STATUS));
  const LEGACY_STATUS_MAP = new Map([
    ['processing', STATUS.PROCESSING],
    ['pending', STATUS.PROCESSING],
    ['draft', STATUS.PROCESSING],
    ['ready', STATUS.READY_TO_PRINT],
    ['ready_to_print', STATUS.READY_TO_PRINT],
    ['issued', STATUS.READY_TO_PRINT],
    ['printed', STATUS.PRINTED],
    ['done', STATUS.PRINTED],
    ['completed', STATUS.PRINTED]
  ]);

  function now(){
    return Date.now();
  }

  function text(value){
    return String(value || '').trim();
  }

  function userName(explicit){
    return text(explicit) ||
      text(window.nickname) ||
      text(localStorage.getItem('stockAlertNickname')) ||
      text(localStorage.getItem('stockAlertUserName')) ||
      '\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38';
  }

  function normalizeStatus(value){
    const raw = text(value);
    if (VALID_STATUSES.has(raw)) return raw;
    return LEGACY_STATUS_MAP.get(raw.toLowerCase()) || STATUS.PROCESSING;
  }

  function auditEvent(type, status, by, at, extra){
    return {
      type,
      status,
      at: at || now(),
      by: userName(by),
      ...(extra || {})
    };
  }

  function splitItemsForInvoices(items, maxItemsPerInvoice){
    const max = Number(maxItemsPerInvoice || 10);
    if (!Number.isFinite(max) || max < 1 || max > 10) {
      throw new Error('Invoice request split size must be between 1 and 10 items.');
    }

    const list = Array.isArray(items) ? items.slice() : [];
    const groups = [];
    for (let i = 0; i < list.length; i += max) {
      groups.push(list.slice(i, i + max));
    }
    return groups;
  }

  function normalizeInvoices(invoices){
    return (Array.isArray(invoices) ? invoices : []).map((invoice, index) => ({
      invoiceId: text(invoice.invoiceId || invoice.id || `invoice_${index + 1}`),
      invoiceNo: text(invoice.invoiceNo || invoice.no),
      itemCount: Number(invoice.itemCount || (Array.isArray(invoice.items) ? invoice.items.length : 0)),
      printed: Boolean(invoice.printed || invoice.printedAt),
      printedAt: invoice.printedAt || null,
      printedBy: invoice.printedBy || ''
    }));
  }

  function createSubmittedRequest(input){
    const data = input || {};
    const submittedAt = data.submittedAt || now();
    const submittedBy = userName(data.submittedBy || data.by);
    const items = Array.isArray(data.items) ? data.items.slice() : [];
    const invoiceItemGroups = splitItemsForInvoices(items, data.maxItemsPerInvoice || 10);

    return {
      ...(data.request || {}),
      requestId: text(data.requestId) || `tax_request_${submittedAt}`,
      status: STATUS.PROCESSING,
      items,
      invoiceItemGroups,
      invoiceIds: [],
      invoices: [],
      submittedAt,
      submittedBy,
      generatedAt: null,
      generatedBy: '',
      printedAt: null,
      printedBy: '',
      statusEditableByStaff: false,
      statusHistory: [
        auditEvent(EVENT.SUBMITTED, STATUS.PROCESSING, submittedBy, submittedAt, {
          itemCount: items.length,
          invoiceCount: invoiceItemGroups.length
        })
      ]
    };
  }

  function markGenerated(request, generatedInvoices, by, at){
    const base = { ...(request || {}) };
    const invoices = normalizeInvoices(generatedInvoices);
    const expected = Array.isArray(base.invoiceItemGroups) ? base.invoiceItemGroups.length : 0;
    if (expected > 0 && invoices.length < expected) {
      throw new Error('Cannot mark ready to print until every split invoice has been created.');
    }

    const generatedAt = at || now();
    const generatedBy = userName(by);
    const statusHistory = Array.isArray(base.statusHistory) ? base.statusHistory.slice() : [];
    statusHistory.push(auditEvent(EVENT.GENERATED, STATUS.READY_TO_PRINT, generatedBy, generatedAt, {
      invoiceCount: invoices.length,
      invoiceIds: invoices.map(invoice => invoice.invoiceId)
    }));

    return {
      ...base,
      status: STATUS.READY_TO_PRINT,
      invoices,
      invoiceIds: invoices.map(invoice => invoice.invoiceId),
      generatedAt,
      generatedBy,
      updatedAt: generatedAt,
      updatedBy: generatedBy,
      statusEditableByStaff: false,
      statusHistory
    };
  }

  function markInvoicePrinted(request, invoiceId, by, options){
    const base = { ...(request || {}) };
    const printedAt = options?.printedAt || now();
    const printedBy = userName(by || options?.by);
    const source = options?.source || PRINT_SOURCE.SYSTEM;
    if (![PRINT_SOURCE.SYSTEM, PRINT_SOURCE.ADMIN].includes(source)) {
      throw new Error('Printed status can only be set by system print confirmation or desktop admin.');
    }

    const targetId = text(invoiceId);
    let matched = false;
    const invoices = normalizeInvoices(base.invoices).map(invoice => {
      if (invoice.invoiceId !== targetId && invoice.invoiceNo !== targetId) return invoice;
      matched = true;
      return { ...invoice, printed: true, printedAt, printedBy };
    });

    if (!matched) {
      throw new Error('Printed invoice was not found in this request.');
    }

    const allPrinted = invoices.length > 0 && invoices.every(invoice => invoice.printed);
    const nextStatus = allPrinted ? STATUS.PRINTED : normalizeStatus(base.status || STATUS.READY_TO_PRINT);
    const statusHistory = Array.isArray(base.statusHistory) ? base.statusHistory.slice() : [];
    statusHistory.push(auditEvent(EVENT.PRINTED, nextStatus, printedBy, printedAt, {
      source,
      invoiceId: targetId,
      printedCount: invoices.filter(invoice => invoice.printed).length,
      invoiceCount: invoices.length
    }));

    return {
      ...base,
      status: nextStatus,
      invoices,
      printedAt: allPrinted ? printedAt : base.printedAt || null,
      printedBy: allPrinted ? printedBy : base.printedBy || '',
      updatedAt: printedAt,
      updatedBy: printedBy,
      statusEditableByStaff: false,
      statusHistory
    };
  }

  function markAllPrintedByAdmin(request, by, at){
    const base = { ...(request || {}) };
    const printedAt = at || now();
    const printedBy = userName(by);
    const invoices = normalizeInvoices(base.invoices).map(invoice => ({
      ...invoice,
      printed: true,
      printedAt: invoice.printedAt || printedAt,
      printedBy: invoice.printedBy || printedBy
    }));

    const statusHistory = Array.isArray(base.statusHistory) ? base.statusHistory.slice() : [];
    statusHistory.push(auditEvent(EVENT.PRINTED, STATUS.PRINTED, printedBy, printedAt, {
      source: PRINT_SOURCE.ADMIN,
      printedCount: invoices.length,
      invoiceCount: invoices.length
    }));

    return {
      ...base,
      status: STATUS.PRINTED,
      invoices,
      printedAt,
      printedBy,
      updatedAt: printedAt,
      updatedBy: printedBy,
      statusEditableByStaff: false,
      statusHistory
    };
  }

  window.CMSInvoiceRequestStatus = Object.freeze({
    STATUS,
    EVENT,
    PRINT_SOURCE,
    normalizeStatus,
    splitItemsForInvoices,
    createSubmittedRequest,
    markGenerated,
    markInvoicePrinted,
    markAllPrintedByAdmin,
    canStaffEditStatus: () => false
  });
})();
