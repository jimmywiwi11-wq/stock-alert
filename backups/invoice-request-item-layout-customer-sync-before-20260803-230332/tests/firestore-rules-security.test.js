const assert = require('assert');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} = require('@firebase/rules-unit-testing');
const {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} = require('firebase/firestore');

const projectId = 'check-chokanan-security-test';

function employee(uid, branch){
  return {
    uid,
    role: 'employee',
    branch,
    active: true,
    permissions: ['invoice-request:create', 'product:create']
  };
}

function admin(uid){
  return {
    uid,
    role: 'owner',
    branch: 'ทุกสาขา',
    active: true,
    permissions: ['admin']
  };
}

function generatedInvoicePayload(uid = 'employee-branch-1'){
  return {
    invoiceId: 'IV000001',
    id: 'IV000001',
    invoiceNumber: 'IV000001',
    no: 'IV000001',
    invoiceSequence: 1,
    invoiceType: 'full-tax-invoice',
    paperSize: '9x11',
    vatMode: 'exclusive',
    vatRate: 7,
    source: 'invoice-request',
    requestId: 'req-security-1',
    requestNumber: 'REQ-20260803-000001',
    sourceRequestId: 'req-security-1',
    sourceRequestNumber: 'REQ-20260803-000001',
    ownerUid: uid,
    requestedByUid: uid,
    requestedBranch: 'สาขา 1',
    chunkIndex: 1,
    sequenceInBatch: 1,
    totalInvoicesInBatch: 1,
    itemsInThisInvoice: 1,
    totalItemsInRequest: 1,
    customerSnapshot: { customerName: 'Security Customer', taxId: '0123456789012' },
    itemsSnapshot: [itemSnapshot(uid)],
    beforeVat: 120,
    subtotal: 120,
    vatAmount: 8.4,
    grandTotal: 128.4,
    status: 'พร้อมพิมพ์',
    printed: false,
    printedAt: null,
    printedBy: '',
    printStatus: 'unprinted',
    printCount: 0,
    createdAt: 1785763600000,
    createdByUid: 'admin-owner',
    createdBy: 'admin-owner',
    appVersion: '7.75'
  };
}

function productPayload(uid, id = 'pm_5_1_security_1', code = 'PM01001'){
  return {
    id,
    productId: id,
    code,
    productCode: code,
    name: 'Phase 5.1 Security Product',
    productName: 'Phase 5.1 Security Product',
    search: 'phase5.1securityproduct',
    unit: 'pc',
    price: 120,
    salePrice: 120,
    cost: null,
    costPrice: null,
    active: true,
    createdFrom: 'invoice-request',
    source: 'invoice-request',
    createdByUid: uid,
    ownerUid: uid,
    createdBy: uid,
    nickname: uid,
    requestedBranch: 'สาขา 1',
    branch: 'สาขา 1',
    createdAt: 1785763600000,
    createdDate: 1785763600000,
    updatedByUid: uid,
    updatedBy: uid,
    updatedAt: 1785763600000,
    updatedDate: 1785763600000,
    liveProductMaster: true
  };
}

function draftPayload(uid, branch = 'สาขา 1'){
  return {
    draftId: 'draft-security-1',
    idempotencyKey: 'idem-security-1',
    testMode: false,
    ownerUid: uid,
    requestedByUid: uid,
    requestedBy: uid,
    requestedByNickname: uid,
    requestedBranch: branch,
    requestedAt: '2026-08-03T13:30:00.000Z',
    createdAt: '2026-08-03T13:30:00.000Z',
    updatedAt: '2026-08-03T13:30:00.000Z',
    customerSnapshot: { customerName: 'Security Customer', taxId: '0123456789012' },
    customer: { customerName: 'Security Customer', taxId: '0123456789012' },
    invoiceSettings: { vatRate: 0.07 },
    items: [itemSnapshot(uid)],
    itemCount: 1,
    expectedInvoiceCount: 1,
    subtotal: 120,
    subtotalPreview: 120,
    vatAmount: 8.4,
    grandTotal: 128.4,
    note: '',
    generationState: 'not-started',
    generatedInvoiceIds: [],
    printedInvoiceCount: 0,
    createdFrom: 'invoice-request-production',
    appVersion: '7.74',
    status: 'กำลังดำเนินการ',
    auditLog: [{ action: 'draft-created', actorUid: uid, by: uid, branch, at: '2026-08-03T13:30:00.000Z' }]
  };
}

function itemSnapshot(uid){
  return {
    requestItemId: 'req-item-security-1',
    rowNumber: 1,
    productId: 'pm_5_1_security_1',
    productCode: 'PM01001',
    productName: 'Phase 5.1 Security Product',
    unit: 'pc',
    salePrice: 120,
    quantity: 1,
    lineSubtotal: 120,
    vatAmount: 8.4,
    lineGrandTotal: 128.4,
    isNewProduct: false,
    source: 'existing-product',
    addedByUid: uid,
    addedBy: uid,
    addedAt: '2026-08-03T13:30:00.000Z'
  };
}

function requestPayload(uid, requestId = 'req-security-1', branch = 'สาขา 1'){
  return {
    idempotencyKey: 'idem-security-1',
    testMode: false,
    ownerUid: uid,
    requestedByUid: uid,
    requestedBy: uid,
    requestedByNickname: uid,
    requestedBranch: branch,
    requestedAt: '2026-08-03T13:30:00.000Z',
    createdAt: '2026-08-03T13:30:00.000Z',
    updatedAt: '2026-08-03T13:30:00.000Z',
    customerSnapshot: { customerName: 'Security Customer', taxId: '0123456789012' },
    customer: { customerName: 'Security Customer', taxId: '0123456789012' },
    invoiceSettings: { vatRate: 0.07 },
    items: [itemSnapshot(uid)],
    itemCount: 1,
    expectedInvoiceCount: 1,
    subtotal: 120,
    subtotalPreview: 120,
    vatAmount: 8.4,
    grandTotal: 128.4,
    note: '',
    generationState: 'not-started',
    generatedInvoiceIds: [],
    printedInvoiceCount: 0,
    createdFrom: 'invoice-request-production',
    appVersion: '7.74',
    status: 'กำลังดำเนินการ',
    auditLog: [{ action: 'submitted', actorUid: uid, by: uid, branch, at: '2026-08-03T13:30:00.000Z' }],
    requestId,
    requestNumber: 'REQ-20260803-000001',
    syncStatus: 'synced'
  };
}

function idempotencyPayload(uid){
  return {
    idempotencyKey: 'idem-security-1',
    requestId: 'req-security-1',
    requestNumber: 'REQ-20260803-000001',
    ownerUid: uid,
    requestedByUid: uid,
    createdAt: '2026-08-03T13:30:00.000Z'
  };
}

function auditPayload(uid){
  return {
    requestId: 'req-security-1',
    requestNumber: 'REQ-20260803-000001',
    action: 'submitted',
    actorUid: uid,
    by: uid,
    branch: 'สาขา 1',
    at: '2026-08-03T13:30:00.000Z'
  };
}

(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Run with Firebase Emulator Suite.');

  const env = await initializeTestEnvironment({ projectId });

  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', 'employee-branch-1'), employee('employee-branch-1', 'สาขา 1'));
    await setDoc(doc(db, 'users', 'employee-branch-2'), employee('employee-branch-2', 'สาขา 2'));
    await setDoc(doc(db, 'users', 'admin-owner'), admin('admin-owner'));
    await setDoc(doc(db, 'users', 'unauthorized-user'), {
      uid: 'unauthorized-user',
      role: 'visitor',
      branch: 'สาขา 1',
      active: false,
      permissions: []
    });
    await setDoc(doc(db, 'invoiceRequestDrafts', 'other-draft'), draftPayload('employee-branch-2', 'สาขา 2'));
  });

  const branch1 = env.authenticatedContext('employee-branch-1').firestore();
  const branch2 = env.authenticatedContext('employee-branch-2').firestore();
  const owner = env.authenticatedContext('admin-owner').firestore();
  const unauthorized = env.authenticatedContext('unauthorized-user').firestore();
  const anon = env.unauthenticatedContext().firestore();

  await assertSucceeds(getDoc(doc(branch1, 'users', 'employee-branch-1')));
  await assertFails(getDoc(doc(anon, 'users', 'employee-branch-1')));

  await assertSucceeds(setDoc(doc(branch1, 'productCodeCounters', 'PM'), {
    prefix: 'PM',
    lastSequence: 1001,
    updatedAt: 1785763600000
  }));
  await assertSucceeds(setDoc(doc(branch1, 'stock_alert_beta1_products', 'pm_5_1_security_1'), productPayload('employee-branch-1')));
  await assertSucceeds(getDoc(doc(branch1, 'stock_alert_beta1_products', 'pm_5_1_security_1')));
  await assertFails(updateDoc(doc(branch1, 'stock_alert_beta1_products', 'pm_5_1_security_1'), { productCode: 'PM99999' }));
  await assertFails(deleteDoc(doc(branch1, 'stock_alert_beta1_products', 'pm_5_1_security_1')));
  await assertFails(setDoc(doc(branch1, 'stock_alert_beta1_products', 'pm_bad_type'), productPayload('employee-branch-1', 'pm_bad_type', 'BADCODE')));
  await assertFails(setDoc(doc(branch1, 'productCodeCounters', 'PM'), {
    prefix: 'PM',
    lastSequence: 1000,
    updatedAt: 1785763600001
  }, { merge: false }));
  await assertSucceeds(updateDoc(doc(branch1, 'productCodeCounters', 'PM'), {
    prefix: 'PM',
    lastSequence: 1002,
    updatedAt: 1785763600002
  }));

  await assertSucceeds(setDoc(doc(branch1, 'invoiceRequestDrafts', 'own-draft'), draftPayload('employee-branch-1')));
  await assertSucceeds(getDoc(doc(branch1, 'invoiceRequestDrafts', 'own-draft')));
  await assertSucceeds(updateDoc(doc(branch1, 'invoiceRequestDrafts', 'own-draft'), { note: 'updated', updatedAt: '2026-08-03T13:31:00.000Z' }));
  await assertSucceeds(deleteDoc(doc(branch1, 'invoiceRequestDrafts', 'own-draft')));
  await assertFails(getDoc(doc(branch1, 'invoiceRequestDrafts', 'other-draft')));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequestDrafts', 'other-draft'), { note: 'tamper' }));

  await assertSucceeds(setDoc(doc(branch1, 'invoiceRequestCounters', '20260803'), {
    dateKey: '20260803',
    lastSequence: 1,
    updatedAt: '2026-08-03T13:30:00.000Z'
  }));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequestCounters', '20260803'), {
    dateKey: '20260803',
    lastSequence: 0,
    updatedAt: '2026-08-03T13:31:00.000Z'
  }));

  await assertSucceeds(setDoc(doc(branch1, 'invoiceRequests', 'req-security-1'), requestPayload('employee-branch-1')));
  await assertSucceeds(getDoc(doc(branch1, 'invoiceRequests', 'req-security-1')));
  await assertFails(getDoc(doc(branch2, 'invoiceRequests', 'req-security-1')));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequests', 'req-security-1'), { status: 'อนุมัติแล้ว' }));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequests', 'req-security-1'), { generationState: 'generated' }));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequests', 'req-security-1'), { generatedInvoiceIds: ['IV-20260803-000001'] }));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequests', 'req-security-1'), { printedInvoiceCount: 1 }));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequests', 'req-security-1'), { requestedBy: 'someone-else' }));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequests', 'req-security-1'), { requestedAt: '2026-08-04T00:00:00.000Z' }));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequests', 'req-security-1'), { requestedBranch: 'สาขา 2' }));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequests', 'req-security-1'), { requestNumber: 'REQ-20260803-999999' }));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequests', 'req-security-1'), { customerSnapshot: { customerName: 'Changed' } }));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequests', 'req-security-1'), { items: [] }));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequests', 'req-security-1'), { vatAmount: 0 }));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequests', 'req-security-1'), { printedAt: '2026-08-03T13:32:00.000Z' }));
  await assertFails(deleteDoc(doc(branch1, 'invoiceRequests', 'req-security-1')));

  await assertSucceeds(setDoc(doc(branch1, 'invoiceRequestIdempotency', 'idem-security-1'), idempotencyPayload('employee-branch-1')));
  await assertSucceeds(getDoc(doc(branch1, 'invoiceRequestIdempotency', 'idem-security-1')));
  await assertFails(getDoc(doc(branch2, 'invoiceRequestIdempotency', 'idem-security-1')));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequestIdempotency', 'idem-security-1'), { requestId: 'other-request' }));

  await assertSucceeds(setDoc(doc(branch1, 'invoiceRequestAuditLogs', 'audit-security-1'), auditPayload('employee-branch-1')));
  await assertSucceeds(getDoc(doc(branch1, 'invoiceRequestAuditLogs', 'audit-security-1')));
  await assertFails(updateDoc(doc(branch1, 'invoiceRequestAuditLogs', 'audit-security-1'), { action: 'changed' }));
  await assertFails(deleteDoc(doc(branch1, 'invoiceRequestAuditLogs', 'audit-security-1')));
  await assertFails(setDoc(doc(branch1, 'invoiceRequestAuditLogs', 'audit-spoof'), {
    ...auditPayload('employee-branch-1'),
    actorUid: 'employee-branch-2'
  }));

  await assertFails(setDoc(doc(branch1, 'invoiceRequests', 'req-with-generated-fields'), {
    ...requestPayload('employee-branch-1', 'req-with-generated-fields'),
    generatedInvoiceIds: ['IV-20260803-000001']
  }));
  await assertFails(setDoc(doc(branch1, 'invoices', 'IV-20260803-000001'), { invoiceNumber: 'IV-20260803-000001' }));
  await assertFails(setDoc(doc(branch1, 'taxInvoices', 'IV000001'), generatedInvoicePayload('employee-branch-1')));
  await assertFails(setDoc(doc(branch1, 'invoiceNumberCounters', 'IV'), { prefix: 'IV', lastSequence: 1 }));
  await assertFails(setDoc(doc(branch1, 'invoiceGenerationLocks', 'req-security-1'), { requestId: 'req-security-1', status: 'locked' }));
  await assertFails(setDoc(doc(branch1, 'invoiceGenerationAuditLogs', 'audit-gen-employee'), { requestId: 'req-security-1', action: 'generated' }));
  await assertFails(setDoc(doc(branch1, 'taxInvoiceHistory', 'hist-1'), { invoiceNumber: 'IV-20260803-000001' }));

  await assertFails(getDoc(doc(unauthorized, 'stock_alert_beta1_products', 'pm_5_1_security_1')));
  await assertFails(setDoc(doc(unauthorized, 'invoiceRequests', 'req-unauthorized'), requestPayload('unauthorized-user', 'req-unauthorized')));
  await assertFails(setDoc(doc(anon, 'invoiceRequests', 'req-anon'), requestPayload('anonymous-user', 'req-anon')));

  await assertSucceeds(getDoc(doc(owner, 'invoiceRequests', 'req-security-1')));
  await assertSucceeds(updateDoc(doc(owner, 'invoiceRequests', 'req-security-1'), {
    status: 'สร้างใบกำกับแล้ว',
    generationState: 'generated',
    generatedInvoiceIds: ['IV-20260803-000001'],
    printedInvoiceCount: 1,
    generatedAt: '2026-08-03T13:40:00.000Z',
    printedAt: '2026-08-03T13:45:00.000Z',
    printedBy: 'admin-owner',
    updatedAt: '2026-08-03T13:45:00.000Z'
  }));
  await assertSucceeds(setDoc(doc(owner, 'invoiceNumberCounters', 'IV'), {
    prefix: 'IV',
    lastSequence: 1,
    updatedAt: 1785763600000,
    source: 'invoice-request'
  }));
  await assertSucceeds(setDoc(doc(owner, 'taxInvoices', 'IV000001'), generatedInvoicePayload('employee-branch-1')));
  await assertSucceeds(setDoc(doc(owner, 'taxInvoiceHistory', 'IV000001'), {
    ...generatedInvoicePayload('employee-branch-1'),
    historyId: 'IV000001'
  }));
  await assertSucceeds(setDoc(doc(owner, 'invoiceGenerationLocks', 'req-security-1'), {
    requestId: 'req-security-1',
    status: 'completed',
    completedAt: 1785763600000,
    invoiceIds: ['IV000001']
  }));
  await assertSucceeds(setDoc(doc(owner, 'invoiceGenerationIdempotency', 'req-security-1:v1'), {
    idempotencyKey: 'req-security-1:v1',
    requestId: 'req-security-1',
    requestNumber: 'REQ-20260803-000001',
    invoiceIds: ['IV000001'],
    invoiceNumbers: ['IV000001'],
    createdAt: 1785763600000
  }));
  await assertSucceeds(setDoc(doc(owner, 'invoiceGenerationAuditLogs', 'audit-gen-owner'), {
    requestId: 'req-security-1',
    requestNumber: 'REQ-20260803-000001',
    action: 'generated',
    actorUid: 'admin-owner',
    by: 'admin-owner',
    at: 1785763600000
  }));
  await assertSucceeds(getDoc(doc(branch1, 'taxInvoices', 'IV000001')));
  await assertFails(updateDoc(doc(branch1, 'taxInvoices', 'IV000001'), { printed: true }));
  await assertSucceeds(getDoc(doc(owner, 'invoiceRequestAuditLogs', 'audit-security-1')));

  await env.cleanup();
  console.log('firestore rules security tests passed');
})().catch(async error => {
  console.error(error);
  process.exit(1);
});
