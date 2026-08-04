(function(root){
  'use strict';

  const VERSION = 'phase-5.2-v1';

  function requireDeps(){
    const names = [
      'ChokAnanInvoiceGenerationValidation',
      'ChokAnanInvoiceChunkService',
      'ChokAnanInvoiceVatService',
      'ChokAnanInvoiceNumberFormat',
      'ChokAnanInvoiceNumberService',
      'ChokAnanInvoiceNumberReservation',
      'ChokAnanInvoiceGenerationLock',
      'ChokAnanInvoiceGenerationAudit',
      'ChokAnanInvoiceGeneratorStore'
    ];
    const missing = names.filter(name => !root[name]);
    if (missing.length) throw new Error(`missing-invoice-generator-dependencies:${missing.join(',')}`);
  }

  function text(value){
    return String(value == null ? '' : value).trim();
  }

  function itemSnapshot(item, lineNumber){
    return {
      requestItemId: item.requestItemId || '',
      productId: item.productId || '',
      productCode: item.productCode || item.code || '',
      code: item.productCode || item.code || '',
      productName: item.productName || item.name || '',
      name: item.productName || item.name || '',
      quantity: Number(item.quantity != null ? item.quantity : item.qty) || 0,
      qty: Number(item.quantity != null ? item.quantity : item.qty) || 0,
      unit: item.unit || '',
      salePrice: Number(item.salePrice != null ? item.salePrice : item.price) || 0,
      price: Number(item.salePrice != null ? item.salePrice : item.price) || 0,
      lineNumber
    };
  }

  function customerSnapshot(customer){
    const c = customer || {};
    return {
      customerId: c.customerId || c.id || '',
      customerCode: c.customerCode || c.code || '',
      customerName: c.customerName || c.name || '',
      name: c.customerName || c.name || '',
      taxId: c.taxId || c.tax || '',
      phone: c.phone || c.tel || '',
      branch: c.branch || '',
      address1: c.address1 || c.buyerAddress1 || c.address || '',
      address2: c.address2 || c.buyerAddress2 || ''
    };
  }

  function legacyInvoiceShape(invoice){
    return {
      id: invoice.invoiceId,
      no: invoice.invoiceNumber,
      date: invoice.invoiceDate,
      type: '\u0e43\u0e1a\u0e01\u0e33\u0e01\u0e31\u0e1a\u0e20\u0e32\u0e29\u0e35\u0e40\u0e15\u0e47\u0e21',
      vatMode: 'excluded',
      paperSize: '9x11',
      buyerName: invoice.customerSnapshot.customerName,
      buyerTax: invoice.customerSnapshot.taxId,
      buyerAddress: [invoice.customerSnapshot.address1, invoice.customerSnapshot.address2].filter(Boolean).join('\n'),
      buyerAddress1: invoice.customerSnapshot.address1,
      buyerAddress2: invoice.customerSnapshot.address2,
      customerId: invoice.customerSnapshot.customerId,
      items: invoice.itemsSnapshot.map(item => ({
        code: item.productCode,
        name: item.productName,
        qty: item.quantity,
        unit: item.unit,
        price: item.salePrice
      })),
      beforeVat: invoice.beforeVat,
      vat: invoice.vatAmount,
      total: invoice.grandTotal,
      sourceRequestId: invoice.sourceRequestId,
      sourceRequestNumber: invoice.sourceRequestNumber,
      printStatus: 'unprinted',
      printCount: 0
    };
  }

  function invoicePayload(request, chunk, invoiceNumber, sequence, actor){
    const validation = root.ChokAnanInvoiceGenerationValidation;
    const vat = root.ChokAnanInvoiceVatService.invoiceTotals(chunk.items, validation.SETTINGS.vatRate);
    const invoiceId = invoiceNumber;
    const customer = customerSnapshot(request.customerSnapshot || request.customer);
    const items = chunk.items.map((item, index) => itemSnapshot(item, chunk.startItemIndex + index));
    return {
      invoiceId,
      id: invoiceId,
      invoiceNumber,
      no: invoiceNumber,
      invoiceSequence: sequence,
      invoiceDate: root.ChokAnanInvoiceGeneratorStore.dateText(),
      invoiceType: validation.SETTINGS.invoiceType,
      type: '\u0e43\u0e1a\u0e01\u0e33\u0e01\u0e31\u0e1a\u0e20\u0e32\u0e29\u0e35\u0e40\u0e15\u0e47\u0e21',
      paperSize: validation.SETTINGS.paperSize,
      vatMode: validation.SETTINGS.vatMode,
      vatRate: validation.SETTINGS.vatRate,
      source: 'invoice-request',
      sourceRequestId: request.requestId,
      sourceRequestNumber: request.requestNumber,
      requestId: request.requestId,
      requestNumber: request.requestNumber,
      ownerUid: request.ownerUid || '',
      requestedByUid: request.requestedByUid || '',
      requestedBranch: request.requestedBranch || '',
      generationVersion: VERSION,
      chunkKey: `${request.requestId}:chunk:${chunk.chunkIndex}`,
      chunkIndex: chunk.chunkIndex,
      sequenceInBatch: chunk.sequenceInBatch,
      totalInvoicesInBatch: chunk.totalInvoicesInBatch,
      itemsInThisInvoice: chunk.itemsInThisInvoice,
      totalItemsInRequest: chunk.totalItemsInRequest,
      customerSnapshot: customer,
      buyerName: customer.customerName,
      buyerTax: customer.taxId,
      buyerAddress: [customer.address1, customer.address2].filter(Boolean).join('\n'),
      buyerAddress1: customer.address1,
      buyerAddress2: customer.address2,
      itemsSnapshot: items,
      items: legacyInvoiceShape({ invoiceId, invoiceNumber, invoiceDate: root.ChokAnanInvoiceGeneratorStore.dateText(), customerSnapshot: customer, itemsSnapshot: items, beforeVat: vat.beforeVat, vatAmount: vat.vatAmount, grandTotal: vat.grandTotal }).items,
      beforeVat: vat.beforeVat,
      subtotal: vat.subtotal,
      vatAmount: vat.vatAmount,
      vat: vat.vatAmount,
      grandTotal: vat.grandTotal,
      total: vat.grandTotal,
      status: validation.STATUS_READY,
      printed: false,
      printedAt: null,
      printedBy: '',
      printStatus: 'unprinted',
      printCount: 0,
      createdAt: Date.now(),
      createdByUid: actor.uid || '',
      createdBy: actor.by || 'system',
      appVersion: root.STOCK_ALERT_APP_VERSION || root.APP_VERSION_LABEL || root.APP_VERSION || 'unknown'
    };
  }

  function buildPlan(request, currentLastSequence, actor){
    requireDeps();
    const validationResult = root.ChokAnanInvoiceGenerationValidation.validateRequest(request);
    const chunks = root.ChokAnanInvoiceChunkService.withBatchMetadata(
      root.ChokAnanInvoiceChunkService.chunkItems(validationResult.items, validationResult.settings.itemsPerInvoice),
      request
    );
    const reservation = root.ChokAnanInvoiceNumberService.reserveRange(currentLastSequence, chunks.length);
    const invoices = chunks.map((chunk, index) => invoicePayload(request, chunk, reservation.invoiceNumbers[index], reservation.startSequence + index, actor || {}));
    const batch = root.ChokAnanInvoiceVatService.batchTotals(invoices);
    return { request, chunks, invoices, batch, reservation };
  }

  async function generateFromRequest(requestId, options){
    requireDeps();
    const store = root.ChokAnanInvoiceGeneratorStore;
    if (!store.firestoreReady()) throw new Error('firestore-not-ready');
    const db = root.db;
    const actor = { ...store.actor(), ...(options && options.actor || {}) };
    const generationVersion = options && options.generationVersion || 'v1';
    const idemKey = store.idempotencyKey(requestId, generationVersion);
    const result = await db.runTransaction(async transaction => {
      const requestRef = store.ref(db, store.REQUEST_COLLECTION, requestId);
      const idemRef = store.ref(db, store.IDEMPOTENCY_COLLECTION, idemKey);
      const lockRef = store.ref(db, root.ChokAnanInvoiceGenerationLock.LOCK_COLLECTION, requestId);
      const counterRef = store.ref(db, root.ChokAnanInvoiceNumberService.COUNTER_COLLECTION, root.ChokAnanInvoiceNumberService.COUNTER_DOC);

      const idemSnap = await transaction.get(idemRef);
      if (idemSnap.exists) return { duplicate: true, ...(idemSnap.data() || {}) };

      const requestSnap = await transaction.get(requestRef);
      if (!requestSnap.exists) throw new Error('request-not-found');
      const request = { requestId, ...(requestSnap.data() || {}) };
      root.ChokAnanInvoiceGenerationValidation.validateRequest(request);

      const lockSnap = await transaction.get(lockRef);
      if (lockSnap.exists && root.ChokAnanInvoiceGenerationLock.isActiveLock(lockSnap.data())) throw new Error('request-generation-locked');

      const counterSnap = await transaction.get(counterRef);
      const currentLastSequence = root.ChokAnanInvoiceNumberService.currentSequenceFromCounter(counterSnap.exists ? counterSnap.data() : {});
      const plan = buildPlan(request, currentLastSequence, actor);
      const invoiceIds = plan.invoices.map(invoice => invoice.invoiceId);
      const now = Date.now();

      transaction.set(lockRef, root.ChokAnanInvoiceGenerationLock.createLockPayload(requestId, actor, now), { merge: true });
      plan.invoices.forEach((invoice, index) => {
        const invoiceRef = store.ref(db, store.INVOICE_COLLECTION, invoice.invoiceId);
        const historyRef = store.ref(db, store.HISTORY_COLLECTION, invoice.invoiceId);
        const reservationRef = store.ref(db, root.ChokAnanInvoiceNumberReservation.RESERVATION_COLLECTION, invoice.chunkKey);
        transaction.set(invoiceRef, invoice);
        transaction.set(historyRef, { ...invoice, historyId: invoice.invoiceId, historySource: 'taxInvoiceHistory' });
        transaction.set(reservationRef, root.ChokAnanInvoiceNumberReservation.createReservation(request, plan.chunks[index], invoice.invoiceNumber, invoice.invoiceSequence));
      });
      transaction.set(counterRef, {
        prefix: 'IV',
        lastSequence: plan.reservation.endSequence,
        updatedAt: now,
        updatedByUid: actor.uid || '',
        updatedBy: actor.by || 'system',
        source: 'invoice-request'
      }, { merge: true });
      transaction.set(idemRef, {
        idempotencyKey: idemKey,
        requestId,
        requestNumber: request.requestNumber,
        generationVersion,
        invoiceIds,
        invoiceNumbers: plan.invoices.map(invoice => invoice.invoiceNumber),
        batch: plan.batch,
        createdAt: now,
        createdByUid: actor.uid || '',
        ownerUid: request.ownerUid || '',
        requestedByUid: request.requestedByUid || ''
      });
      transaction.update(requestRef, {
        status: root.ChokAnanInvoiceGenerationValidation.STATUS_READY,
        generationState: 'generated',
        generated: true,
        generatedInvoiceIds: invoiceIds,
        generatedInvoiceNumbers: plan.invoices.map(invoice => invoice.invoiceNumber),
        generatedAt: now,
        generatedBy: actor.by || 'system',
        generatedByUid: actor.uid || '',
        printedInvoiceCount: 0,
        invoiceBatchSummary: plan.batch,
        updatedAt: now
      });
      transaction.set(lockRef, root.ChokAnanInvoiceGenerationLock.completedLockPayload({ invoiceIds }, now), { merge: true });
      transaction.set(store.ref(db, root.ChokAnanInvoiceGenerationAudit.AUDIT_COLLECTION, `${requestId}-${now}`), root.ChokAnanInvoiceGenerationAudit.event(request, 'generated', actor, { invoiceIds, batch: plan.batch }));
      return { duplicate: false, requestId, requestNumber: request.requestNumber, invoiceIds, invoiceNumbers: plan.invoices.map(invoice => invoice.invoiceNumber), batch: plan.batch };
    });
    return result;
  }

  const api = { VERSION, buildPlan, generateFromRequest, invoicePayload, legacyInvoiceShape };
  root.ChokAnanInvoiceGenerator = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
