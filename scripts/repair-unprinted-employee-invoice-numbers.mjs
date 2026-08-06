#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const SERVICE_ACCOUNT_ENV = 'FIREBASE_ADMIN_SERVICE_ACCOUNT';
export const CONFIRMATION_STRING = 'CONFIRM_RENUMBER_UNPRINTED_EMPLOYEE_INVOICES';
export const TARGET_PROJECT_ID = 'check-chokanan';
export const TARGET_MAPPING = Object.freeze({
  IV000115: 'IV000138',
  IV000116: 'IV000139',
  IV000118: 'IV000140'
});

const TAX_INVOICE_COLLECTION = 'taxInvoices';
const REQUEST_COLLECTION = 'invoiceRequests';
const COUNTER_COLLECTION = 'invoiceNumberCounters';
const COUNTER_DOC = 'IV';
const REFERENCE_COLLECTIONS = Object.freeze([
  REQUEST_COLLECTION,
  'taxInvoiceHistory',
  'invoiceHistory',
  'invoices',
  'invoiceNumberReservations',
  'invoiceGenerationIdempotency',
  'invoiceGenerationLocks',
  'invoiceGenerationAuditLogs',
  'invoiceRequestAuditLogs'
]);

const NUMBER_FIELD_NAMES = new Set([
  'invoiceNumber',
  'no',
  'No',
  'invoiceNo',
  'number'
]);

const ID_FIELD_NAMES = new Set([
  'id',
  'invoiceId',
  'historyId'
]);

const REFERENCE_FIELD_NAMES = new Set([
  'generatedInvoiceNumbers',
  'generatedInvoiceIds',
  'nativeInvoiceIds',
  'invoiceNumbers',
  'invoiceIds',
  'nativeImportKey',
  'nativeImportBatchId',
  'deduplicationKey',
  'printRecordId',
  'exportPngFilename',
  'pngFilename',
  'previewInvoiceNumber',
  'sourceInvoiceNumber'
]);

function stamp(){
  const date = new Date();
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function parseInvoiceSequence(value){
  const match = String(value || '').match(/^IV0*(\d+)$/i);
  return match ? Number(match[1]) || 0 : 0;
}

function hasPrintedState(data){
  const status = String(data?.status || '').toLowerCase();
  const printStatus = String(data?.printStatus || '').toLowerCase();
  return data?.printed === true ||
    Number(data?.printCount || 0) > 0 ||
    Boolean(data?.printedAt) ||
    status === 'printed' ||
    printStatus === 'printed';
}

function isEmployeeInvoice(data){
  return data?.source === 'employee-request' ||
    data?.source === 'invoice-request' ||
    Boolean(data?.sourceRequestId || data?.requestId || data?.requestedByUid);
}

function replaceToken(value, mapping){
  if (typeof value !== 'string') return value;
  return mapping[value] || value;
}

function shouldReplaceField(pathParts){
  const name = pathParts[pathParts.length - 1] || '';
  return NUMBER_FIELD_NAMES.has(name) ||
    ID_FIELD_NAMES.has(name) ||
    REFERENCE_FIELD_NAMES.has(name);
}

export function replaceInvoiceReferences(value, mapping, pathParts=[]){
  if (pathParts.includes('items') || pathParts.includes('itemsSnapshot') || pathParts.includes('itemSnapshots')) return value;
  if (Array.isArray(value)) {
    if (!shouldReplaceField(pathParts)) return value.map(item => replaceInvoiceReferences(item, mapping, pathParts));
    return value.map(item => replaceInvoiceReferences(item, mapping, pathParts));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      const nextKey = mapping[key] || key;
      out[nextKey] = replaceInvoiceReferences(child, mapping, [...pathParts, key]);
    }
    return out;
  }
  if (!shouldReplaceField(pathParts)) return value;
  return replaceToken(value, mapping);
}

function diffChangedPaths(before, after, prefix=''){
  const paths = [];
  const beforeKeys = before && typeof before === 'object' ? Object.keys(before) : [];
  const afterKeys = after && typeof after === 'object' ? Object.keys(after) : [];
  const keys = new Set([...beforeKeys, ...afterKeys]);
  for (const key of keys) {
    const pathName = prefix ? `${prefix}.${key}` : key;
    const left = before ? before[key] : undefined;
    const right = after ? after[key] : undefined;
    if (JSON.stringify(left) === JSON.stringify(right)) continue;
    if (left && right && typeof left === 'object' && typeof right === 'object' && !Array.isArray(left) && !Array.isArray(right)) {
      paths.push(...diffChangedPaths(left, right, pathName));
    }
    else {
      paths.push(pathName);
    }
  }
  return paths;
}

export function validateTargetInvoices(targets, targetNumberHits){
  const errors = [];
  const seenTargetNumbers = new Set();
  for (const target of targets) {
    if (!target || !target.oldNumber || !target.newNumber) {
      errors.push('invalid-target-entry');
      continue;
    }
    if (!target.matches || target.matches.length !== 1) {
      errors.push(`${target.oldNumber}: expected exactly one taxInvoices match, found ${target.matches ? target.matches.length : 0}`);
      continue;
    }
    const doc = target.matches[0];
    if (hasPrintedState(doc.data)) errors.push(`${target.oldNumber}: invoice is printed or has printed metadata`);
    if (!isEmployeeInvoice(doc.data)) errors.push(`${target.oldNumber}: invoice is not marked as employee/request-generated`);
    if (seenTargetNumbers.has(target.newNumber)) errors.push(`${target.newNumber}: duplicate proposed target in repair mapping`);
    seenTargetNumbers.add(target.newNumber);
  }
  for (const [number, hits] of Object.entries(targetNumberHits || {})) {
    if (Array.isArray(hits) && hits.length) errors.push(`${number}: target invoice number already exists in ${hits.map(hit => `${hit.collection}/${hit.id}`).join(', ')}`);
  }
  return errors;
}

function projectedTaxInvoiceData(data, newNumber, now='DRY-RUN'){
  const after = replaceInvoiceReferences(data || {}, TARGET_MAPPING);
  after.invoiceNumber = newNumber;
  after.no = newNumber;
  after.invoiceSequence = parseInvoiceSequence(newNumber);
  if (now !== 'DRY-RUN') {
    after.updatedAt = now;
    after.updatedBy = 'repair-unprinted-employee-invoice-numbers';
  }
  return after;
}

function backupPayload({ targets, referencePatches, counterBefore, projectId }){
  return {
    format: 'repair-unprinted-employee-invoice-numbers-backup-v1',
    createdAt: new Date().toISOString(),
    projectId,
    mapping: TARGET_MAPPING,
    taxInvoices: targets.flatMap(target => target.matches.map(match => ({
      oldNumber: target.oldNumber,
      newNumber: target.newNumber,
      collection: TAX_INVOICE_COLLECTION,
      id: match.id,
      data: match.data
    }))),
    references: referencePatches.map(patch => ({
      collection: patch.collection,
      id: patch.id,
      changedPaths: patch.changedPaths,
      before: patch.before
    })),
    counterBefore
  };
}

async function loadAdmin(){
  const serviceAccountPath = process.env[SERVICE_ACCOUNT_ENV];
  if (!serviceAccountPath) throw new Error(`Missing ${SERVICE_ACCOUNT_ENV}. Set it to the Firebase service-account JSON path.`);
  const absolutePath = path.resolve(serviceAccountPath);
  if (!fs.existsSync(absolutePath)) throw new Error(`Service account file was not found: ${absolutePath}`);

  const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  const [{ initializeApp, cert, getApps }, { getFirestore }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/firestore')
  ]);
  if (!getApps().length) initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
  if (serviceAccount.project_id !== TARGET_PROJECT_ID) {
    throw new Error(`Refusing to run on unexpected Firebase project: ${serviceAccount.project_id}`);
  }
  return { db: getFirestore(), projectId: serviceAccount.project_id };
}

function parseArgs(argv){
  const apply = argv.includes('--apply');
  const dryRun = !apply || argv.includes('--dry-run');
  const confirmIndex = argv.indexOf('--confirm');
  const confirmation = confirmIndex >= 0 ? argv[confirmIndex + 1] : process.env.REPAIR_INVOICE_CONFIRMATION || '';
  if (apply && confirmation !== CONFIRMATION_STRING) {
    throw new Error(`Apply mode requires --confirm ${CONFIRMATION_STRING} or REPAIR_INVOICE_CONFIRMATION=${CONFIRMATION_STRING}`);
  }
  return { apply, dryRun: !apply || dryRun };
}

async function docSnapshotToRow(doc){
  return { id: doc.id, data: doc.data() || {} };
}

async function collectInvoiceMatches(db, invoiceNumber){
  const refs = new Map();
  const addSnap = snap => {
    if (snap && snap.exists) refs.set(snap.id, docSnapshotToRow(snap));
  };
  await addSnap(await db.collection(TAX_INVOICE_COLLECTION).doc(invoiceNumber).get());
  for (const field of ['invoiceNumber', 'no', 'No', 'invoiceNo', 'number', 'invoiceId', 'id']) {
    const snap = await db.collection(TAX_INVOICE_COLLECTION).where(field, '==', invoiceNumber).get();
    snap.docs.forEach(doc => refs.set(doc.id, docSnapshotToRow(doc)));
  }
  return Promise.all([...refs.values()]);
}

async function collectTargetNumberHits(db, numbers, oldDocIds){
  const hits = {};
  for (const number of numbers) {
    const rows = await collectInvoiceMatches(db, number);
    hits[number] = rows.filter(row => !oldDocIds.has(row.id)).map(row => ({ collection: TAX_INVOICE_COLLECTION, id: row.id }));
  }
  return hits;
}

async function readCollection(db, name){
  const snap = await db.collection(name).get();
  return Promise.all(snap.docs.map(docSnapshotToRow));
}

function referencePatch(collection, row, mapping){
  const before = row.data || {};
  const after = replaceInvoiceReferences(before, mapping);
  const changedPaths = diffChangedPaths(before, after);
  if (!changedPaths.length) return null;
  return { collection, id: row.id, before, after, changedPaths };
}

async function collectReferencePatches(db, mapping){
  const patches = [];
  for (const collection of REFERENCE_COLLECTIONS) {
    const rows = await readCollection(db, collection).catch(error => {
      console.warn(`[dry-run] Skipping ${collection}: ${error.message || error}`);
      return [];
    });
    rows.map(row => referencePatch(collection, row, mapping)).filter(Boolean).forEach(patch => patches.push(patch));
  }
  return patches;
}

async function readCounter(db){
  const snap = await db.collection(COUNTER_COLLECTION).doc(COUNTER_DOC).get();
  return snap.exists ? snap.data() || {} : null;
}

function buildReport({ targets, referencePatches, targetNumberHits, counterBefore, backupPath, mode }){
  return {
    mode,
    projectId: TARGET_PROJECT_ID,
    mapping: TARGET_MAPPING,
    backupPath,
    documentsFound: targets.map(target => {
      const match = target.matches[0] || null;
      const changedPaths = match ? diffChangedPaths(match.data, projectedTaxInvoiceData(match.data, target.newNumber)) : [];
      return {
        oldInvoiceNumber: target.oldNumber,
        proposedNewInvoiceNumber: target.newNumber,
        firestoreDocumentId: match && match.id || null,
        requestId: match && (match.data.sourceRequestId || match.data.requestId || '') || '',
        requestNumber: match && (match.data.sourceRequestNumber || match.data.requestNumber || '') || '',
        printStatus: match && (match.data.printStatus || match.data.status || '') || '',
        printedAt: match && (match.data.printedAt || null) || null,
        matches: target.matches.length,
        changedPaths
      };
    }),
    duplicateTargetNumberHits: targetNumberHits,
    referencesThatWouldChange: referencePatches.map(patch => ({
      collection: patch.collection,
      firestoreDocumentId: patch.id,
      changedPaths: patch.changedPaths
    })),
    counterBefore,
    counterAfterMinimum: {
      collection: COUNTER_COLLECTION,
      documentId: COUNTER_DOC,
      lastSequence: Math.max(Number(counterBefore && counterBefore.lastSequence || 0), ...Object.values(TARGET_MAPPING).map(parseInvoiceSequence))
    }
  };
}

async function writeBackup(payload){
  const backupDir = path.join(process.cwd(), 'backups', `repair-unprinted-employee-invoice-numbers-${stamp()}`);
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, 'backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2), 'utf8');
  JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  return backupPath;
}

async function applyRepair(db, { targets, referencePatches, counterBefore }){
  const mapping = TARGET_MAPPING;
  const now = new Date().toISOString();
  const renameTargets = targets.map(target => {
    const match = target.matches[0];
    const after = projectedTaxInvoiceData(match.data, target.newNumber, now);
    return {
      oldNumber: target.oldNumber,
      newNumber: target.newNumber,
      oldId: match.id,
      newId: mapping[match.id] || (match.id.includes(target.oldNumber) ? match.id.replaceAll(target.oldNumber, target.newNumber) : match.id),
      before: match.data,
      after
    };
  });

  const createBatch = db.batch();
  const sameIdUpdates = [];
  for (const target of renameTargets) {
    if (target.oldId === target.newId) {
      sameIdUpdates.push(target);
    }
    else {
      createBatch.set(db.collection(TAX_INVOICE_COLLECTION).doc(target.newId), {
        ...target.after,
        invoiceId: target.newId,
        id: target.newId
      });
    }
  }
  await createBatch.commit();

  for (const target of renameTargets.filter(target => target.oldId !== target.newId)) {
    const verifySnap = await db.collection(TAX_INVOICE_COLLECTION).doc(target.newId).get();
    if (!verifySnap.exists) throw new Error(`Verification failed after creating ${TAX_INVOICE_COLLECTION}/${target.newId}`);
    const verifyData = verifySnap.data() || {};
    if (verifyData.invoiceNumber !== target.newNumber && verifyData.no !== target.newNumber) {
      throw new Error(`Verification failed: ${target.newId} does not contain ${target.newNumber}`);
    }
  }

  let batch = db.batch();
  let count = 0;
  const queueSet = (ref, data, options) => {
    batch.set(ref, data, options);
    count += 1;
  };
  const queueDelete = ref => {
    batch.delete(ref);
    count += 1;
  };
  const flush = async () => {
    if (!count) return;
    await batch.commit();
    batch = db.batch();
    count = 0;
  };

  for (const target of sameIdUpdates) {
    queueSet(db.collection(TAX_INVOICE_COLLECTION).doc(target.oldId), target.after, { merge: true });
  }
  for (const patch of referencePatches) {
    queueSet(db.collection(patch.collection).doc(patch.id), patch.after, { merge: true });
    if (count >= 450) await flush();
  }
  for (const target of renameTargets.filter(target => target.oldId !== target.newId)) {
    queueDelete(db.collection(TAX_INVOICE_COLLECTION).doc(target.oldId));
    if (count >= 450) await flush();
  }

  const targetHighest = Math.max(...Object.values(mapping).map(parseInvoiceSequence));
  const nextCounter = Math.max(Number(counterBefore && counterBefore.lastSequence || 0), targetHighest);
  queueSet(db.collection(COUNTER_COLLECTION).doc(COUNTER_DOC), {
    prefix: 'IV',
    lastSequence: nextCounter,
    updatedAt: now,
    updatedBy: 'repair-unprinted-employee-invoice-numbers',
    source: 'admin-repair-unprinted-employee-invoices'
  }, { merge: true });
  await flush();
}

async function verifyRepair(db){
  const rows = {};
  for (const [oldNumber, newNumber] of Object.entries(TARGET_MAPPING)) {
    rows[oldNumber] = {
      oldMatches: await collectInvoiceMatches(db, oldNumber),
      newMatches: await collectInvoiceMatches(db, newNumber)
    };
  }
  const counter = await readCounter(db);
  return { rows, counter };
}

async function main(){
  const args = parseArgs(process.argv.slice(2));
  const { db, projectId } = await loadAdmin();
  const mapping = TARGET_MAPPING;
  const targets = [];
  for (const [oldNumber, newNumber] of Object.entries(mapping)) {
    targets.push({ oldNumber, newNumber, matches: await collectInvoiceMatches(db, oldNumber) });
  }
  const oldDocIds = new Set(targets.flatMap(target => target.matches.map(match => match.id)));
  const targetNumberHits = await collectTargetNumberHits(db, Object.values(mapping), oldDocIds);
  const errors = validateTargetInvoices(targets, targetNumberHits);
  const referencePatches = await collectReferencePatches(db, mapping);
  const counterBefore = await readCounter(db);
  const backupPath = await writeBackup(backupPayload({ targets, referencePatches, counterBefore, projectId }));
  const report = buildReport({ targets, referencePatches, targetNumberHits, counterBefore, backupPath, mode: args.apply ? 'apply' : 'dry-run' });

  console.log(JSON.stringify(report, null, 2));
  if (errors.length) {
    console.error(JSON.stringify({ refused: true, errors }, null, 2));
    process.exitCode = 2;
    return;
  }
  if (!args.apply) {
    console.log('DRY RUN ONLY. No Firestore documents were modified.');
    return;
  }

  await applyRepair(db, { targets, referencePatches, counterBefore });
  const verification = await verifyRepair(db);
  console.log(JSON.stringify({ applied: true, verification }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(error => {
    console.error(error && error.stack || error);
    process.exit(1);
  });
}
