#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const CONFIRM_FLAG = '--confirm-tax-invoice-reset';
const TARGET_PROJECT = 'check-chokanan';
const NEXT_SEQUENCE = 110;
const COUNTER_LAST_SEQUENCE = NEXT_SEQUENCE - 1;

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyArOggsR6vLn0AeVx-TdqHiLSd6LElfrEc',
  authDomain: 'check-chokanan.firebaseapp.com',
  projectId: TARGET_PROJECT,
  storageBucket: 'check-chokanan.firebasestorage.app',
  messagingSenderId: '637683943443',
  appId: '1:637683943443:web:db64ac24fd66b93474d7e6'
};

const COLLECTIONS_TO_DELETE = [
  'invoiceRequests',
  'taxInvoices',
  'taxInvoiceHistory',
  'invoices',
  'invoiceHistory',
  'invoiceRequestCounters',
  'invoiceRequestIdempotency',
  'invoiceRequestAuditLogs',
  'invoiceNumberReservations',
  'invoiceGenerationIdempotency',
  'invoiceGenerationLocks',
  'invoiceGenerationAuditLogs'
];

const COUNTER_COLLECTION = 'invoiceNumberCounters';
const COUNTER_DOC = 'IV';
const PRODUCT_COLLECTIONS = ['stock_alert_beta1_products'];
const CUSTOMER_COLLECTIONS = ['customers'];

function stamp(){
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function invoiceNumber(seq){
  return `IV${String(seq).padStart(6, '0')}`;
}

async function loadFirebase(){
  const firebase = require('firebase/compat/app');
  require('firebase/compat/auth');
  require('firebase/compat/firestore');
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  await firebase.auth().signInAnonymously().catch(() => null);
  return { firebase, db: firebase.firestore() };
}

async function getRows(db, collectionName){
  const snap = await db.collection(collectionName).get();
  return snap.docs.map(doc => ({ id: doc.id, data: doc.data() || {} }));
}

async function countCollection(db, collectionName){
  const rows = await getRows(db, collectionName);
  return rows.length;
}

async function deleteCollection(db, collectionName){
  const rows = await getRows(db, collectionName);
  let batch = db.batch();
  let pending = 0;
  for (const row of rows) {
    batch.delete(db.collection(collectionName).doc(row.id));
    pending += 1;
    if (pending >= 450) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending) await batch.commit();
  return rows.length;
}

async function main(){
  const confirmed = process.argv.includes(CONFIRM_FLAG);
  const { firebase, db } = await loadFirebase();
  const projectId = firebase.app().options.projectId;
  if (projectId !== TARGET_PROJECT) throw new Error(`Refusing reset on unexpected Firebase project: ${projectId}`);

  const root = path.resolve(__dirname, '..');
  const backupDir = path.join(root, 'backups', `tax-invoice-reset-before-${stamp()}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const backup = {
    format: 'tax-invoice-reset-backup-v1',
    createdAt: new Date().toISOString(),
    projectId,
    confirmed,
    nextInvoiceNumberAfterReset: invoiceNumber(NEXT_SEQUENCE),
    collections: {},
    protectedCountsBefore: {},
    protectedCountsAfter: {},
    browserOnlyKeys: [
      'invoices',
      'taxInvoiceHistory',
      'invoiceHistory',
      'cms.invoiceRequest.taxInvoiceHistory',
      'cms.invoiceRequest.productionRequests',
      'cms.invoiceRequest.productionDrafts',
      'invoiceNumberSettings'
    ]
  };

  for (const name of [...COLLECTIONS_TO_DELETE, COUNTER_COLLECTION]) {
    backup.collections[name] = await getRows(db, name).catch(error => ({ error: error.message || String(error) }));
  }
  for (const name of PRODUCT_COLLECTIONS) backup.protectedCountsBefore[name] = await countCollection(db, name).catch(() => null);
  for (const name of CUSTOMER_COLLECTIONS) backup.protectedCountsBefore[name] = await countCollection(db, name).catch(() => null);

  const backupPath = path.join(backupDir, 'tax-invoice-data-backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
  JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  const plannedDeletes = {};
  for (const name of COLLECTIONS_TO_DELETE) {
    plannedDeletes[name] = Array.isArray(backup.collections[name]) ? backup.collections[name].length : 0;
  }

  if (!confirmed) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      projectId,
      backupPath,
      plannedDeletes,
      counterAfterReset: { collection: COUNTER_COLLECTION, doc: COUNTER_DOC, lastSequence: COUNTER_LAST_SEQUENCE, nextInvoiceNumber: invoiceNumber(NEXT_SEQUENCE) },
      protectedCountsBefore: backup.protectedCountsBefore,
      message: `Re-run with ${CONFIRM_FLAG} to delete invoice data.`
    }, null, 2));
    return;
  }

  const deleted = {};
  for (const name of COLLECTIONS_TO_DELETE) deleted[name] = await deleteCollection(db, name);
  await db.collection(COUNTER_COLLECTION).doc(COUNTER_DOC).set({
    prefix: 'IV',
    lastSequence: COUNTER_LAST_SEQUENCE,
    updatedAt: new Date().toISOString(),
    updatedBy: 'reset-tax-invoice-data-to-110',
    source: 'maintenance-reset'
  }, { merge: true });

  const countsAfter = {};
  for (const name of COLLECTIONS_TO_DELETE) countsAfter[name] = await countCollection(db, name);
  for (const name of PRODUCT_COLLECTIONS) backup.protectedCountsAfter[name] = await countCollection(db, name).catch(() => null);
  for (const name of CUSTOMER_COLLECTIONS) backup.protectedCountsAfter[name] = await countCollection(db, name).catch(() => null);

  const result = {
    mode: 'confirmed-reset',
    projectId,
    backupPath,
    deleted,
    countsAfter,
    protectedCountsBefore: backup.protectedCountsBefore,
    protectedCountsAfter: backup.protectedCountsAfter,
    counter: { collection: COUNTER_COLLECTION, doc: COUNTER_DOC, lastSequence: COUNTER_LAST_SEQUENCE, nextInvoiceNumber: invoiceNumber(NEXT_SEQUENCE) }
  };
  fs.writeFileSync(path.join(backupDir, 'tax-invoice-reset-result.json'), JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exit(1);
});
