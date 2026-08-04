(function(root){
  'use strict';

  const MASTER_KEY = 'chokananCustomerMasterV1';
  const LEGACY_KEY = 'customers';
  const PENDING_KEY = 'chokananCustomerMasterPendingV1';
  const FIRESTORE_COLLECTION = 'customers';
  const CHANNEL = 'chokanan-customer-master';
  let remoteBound = false;
  let remoteAuthWaiting = false;
  let remoteUnsubscribe = null;

  function text(value){
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function normalizedName(value){
    return text(value).toLowerCase();
  }

  function normalizedAddress(customer){
    return [customer.address1, customer.address2].map(text).filter(Boolean).join(' ').toLowerCase();
  }

  function taxText(value){
    return String(value == null ? '' : value).replace(/[^\d]/g, '');
  }

  function compact(value){
    return normalizedName(value).replace(/\s+/g, '');
  }

  function simpleHash(value){
    let hash = 0;
    String(value || '').split('').forEach(char => {
      hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    });
    return Math.abs(hash).toString(36);
  }

  function readJson(key, fallback){
    try {
      const value = JSON.parse(root.localStorage?.getItem(key) || JSON.stringify(fallback));
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value){
    root.localStorage?.setItem(key, JSON.stringify(value));
  }

  function legacyId(row){
    const code = text(row.customerCode || row.code);
    const taxId = taxText(row.taxId || row.tax);
    const name = text(row.customerName || row.name);
    const address = text(row.address || [row.address1, row.address2].filter(Boolean).join(' '));
    return row.legacyId || row.id || code || taxId || `${name}|${address}`;
  }

  function nextCustomerCode(rows, prefix='CU', width=5){
    const used = new Set(rows.map(row => text(row.customerCode || row.code)).filter(Boolean));
    let max = 0;
    used.forEach(code => {
      const match = String(code).match(/(\d+)$/);
      if (match) max = Math.max(max, Number(match[1]) || 0);
    });
    let next = `${prefix}${String(max + 1).padStart(width, '0')}`;
    while (used.has(next)) {
      max += 1;
      next = `${prefix}${String(max + 1).padStart(width, '0')}`;
    }
    return next;
  }

  function normalizeCustomer(row={}, options={}){
    const source = row || {};
    const address1 = source.address1 !== undefined ? source.address1 : source.address;
    const taxId = taxText(source.taxId !== undefined ? source.taxId : source.tax);
    const phone = text(source.phone !== undefined ? source.phone : source.tel);
    const name = text(source.customerName || source.name);
    const prefix = text(source.prefix);
    const code = text(source.customerCode || source.code);
    const id = text(source.customerId || source.id || code || taxId || legacyId(source));
    const normalized = {
      customerId: id || `customer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      customerCode: code,
      prefix,
      customerName: name,
      normalizedName: normalizedName([prefix, name].filter(Boolean).join(' ')),
      address1: text(address1),
      address2: text(source.address2),
      taxId,
      phone,
      headOffice: source.headOffice === true || source.headOffice === 'true',
      branchNumber: text(source.branchNumber),
      branch: text(source.branch || source.office || source.headOfficeBranch || (source.headOffice ? 'สำนักงานใหญ่' : '')),
      active: source.active !== false,
      createdAt: source.createdAt || Date.now(),
      createdBy: text(source.createdBy || options.by),
      updatedAt: source.updatedAt || Date.now(),
      updatedBy: text(source.updatedBy || options.by),
      source: text(source.source || options.source || 'customer-master'),
      createdFrom: text(source.createdFrom || options.createdFrom || source.source || 'customer-master'),
      legacyIds: Array.from(new Set([...(Array.isArray(source.legacyIds) ? source.legacyIds : []), legacyId(source)].filter(Boolean))),
      original: source
    };
    normalized.code = normalized.customerCode;
    normalized.name = normalized.customerName;
    normalized.tax = normalized.taxId;
    normalized.tel = normalized.phone;
    normalized.address = [normalized.address1, normalized.address2].filter(Boolean).join(' ').trim();
    return normalized;
  }

  function duplicateKey(customer){
    const c = normalizeCustomer(customer);
    if (c.taxId) return `tax:${c.taxId}`;
    if (c.customerCode) return `code:${c.customerCode.toLowerCase()}`;
    const name = c.normalizedName;
    const address = normalizedAddress(c);
    if (name && address) return `name-address:${name}|${address}`;
    if (name && c.phone) return `name-phone:${name}|${c.phone}`;
    if (c.legacyIds[0]) return `legacy:${c.legacyIds[0]}`;
    return `id:${c.customerId}`;
  }

  function customerDocId(customer){
    const c = normalizeCustomer(customer);
    if (c.customerCode) return `code_${compact(c.customerCode).slice(0, 80)}`;
    if (c.taxId) return `tax_${c.taxId}`;
    return `customer_${simpleHash(`${c.normalizedName}|${normalizedAddress(c)}|${c.phone}`)}`;
  }

  function remoteReady(){
    return !!(root.db && typeof root.db.collection === 'function');
  }

  function serverTimestamp(){
    try {
      return root.firebase && root.firebase.firestore && root.firebase.firestore.FieldValue.serverTimestamp();
    } catch (_) {
      return null;
    }
  }

  function authReady(){
    try {
      if (typeof root.stockAlertAuthReady === 'function') return root.stockAlertAuthReady();
      if (!root.auth) return Promise.resolve(null);
      if (root.auth.currentUser) return Promise.resolve(root.auth.currentUser);
      return new Promise(resolve => {
        let done = false;
        let unsub = () => {};
        const finish = user => {
          if (done) return;
          done = true;
          try { unsub(); } catch (_) {}
          resolve(user || null);
        };
        try {
          unsub = root.auth.onAuthStateChanged(user => {
            if (user) finish(user);
            else if (root.auth.signInAnonymously) root.auth.signInAnonymously().then(cred => finish(cred.user)).catch(() => finish(null));
            else finish(null);
          }, () => finish(null));
        } catch (_) {
          finish(null);
        }
        setTimeout(() => finish(root.auth && root.auth.currentUser), 4500);
      });
    } catch (_) {
      return Promise.resolve(null);
    }
  }

  function remotePayload(customer, options={}){
    const c = normalizeCustomer(customer, options);
    const now = Date.now();
    const serverNow = serverTimestamp();
    const payload = {
      customerId: c.customerId,
      customerCode: c.customerCode,
      code: c.customerCode,
      prefix: c.prefix,
      customerName: c.customerName,
      name: c.customerName,
      normalizedName: c.normalizedName,
      search: compact([c.customerCode, c.prefix, c.customerName, c.taxId, c.phone, c.address1, c.address2].join(' ')),
      address1: c.address1,
      address2: c.address2,
      address: c.address,
      taxId: c.taxId,
      tax: c.taxId,
      phone: c.phone,
      tel: c.phone,
      branch: c.branch,
      headOffice: c.headOffice,
      branchNumber: c.branchNumber,
      active: c.active !== false,
      createdAt: c.createdAt || now,
      createdBy: c.createdBy || text(options.by),
      updatedAt: now,
      updatedBy: text(options.by || c.updatedBy),
      source: c.source || options.source || 'customer-master',
      createdFrom: c.createdFrom || options.createdFrom || c.source || 'customer-master',
      legacyIds: Array.isArray(c.legacyIds) ? c.legacyIds : []
    };
    if (serverNow) payload.updatedAtServer = serverNow;
    return payload;
  }

  async function writeRemoteCustomer(customer, options={}){
    if (!remoteReady() || !customer) return { skipped: true, reason: 'firebase-not-ready' };
    await authReady();
    const payload = remotePayload(customer, options);
    const id = customerDocId(payload);
    await root.db.collection(FIRESTORE_COLLECTION).doc(id).set(payload, { merge: true });
    return { ok: true, collection: FIRESTORE_COLLECTION, docId: id, customerId: payload.customerId, customerCode: payload.customerCode };
  }

  function mergeCustomers(rows){
    const byKey = new Map();
    rows.map(normalizeCustomer).forEach(row => {
      if (!row.customerName && !row.customerCode) return;
      const keys = [
        row.taxId && `tax:${row.taxId}`,
        row.customerCode && `code:${row.customerCode.toLowerCase()}`,
        row.normalizedName && normalizedAddress(row) && `name-address:${row.normalizedName}|${normalizedAddress(row)}`,
        row.normalizedName && row.phone && `name-phone:${row.normalizedName}|${row.phone}`,
        ...row.legacyIds.map(id => `legacy:${id}`)
      ].filter(Boolean);
      const existingKey = keys.find(key => byKey.has(key));
      if (!existingKey) {
        keys.forEach(key => byKey.set(key, row));
        return;
      }
      const existing = byKey.get(existingKey);
      const merged = normalizeCustomer({
        ...row,
        ...existing,
        address1: existing.address1 || row.address1,
        address2: existing.address2 || row.address2,
        taxId: existing.taxId || row.taxId,
        phone: existing.phone || row.phone,
        legacyIds: Array.from(new Set([...(existing.legacyIds || []), ...(row.legacyIds || [])]))
      });
      for (const [key, value] of byKey.entries()) {
        if (value === existing) byKey.set(key, merged);
      }
      keys.forEach(key => byKey.set(key, merged));
    });
    return Array.from(new Set(byKey.values())).sort((a, b) => text(a.customerCode).localeCompare(text(b.customerCode), 'th') || text(a.customerName).localeCompare(text(b.customerName), 'th'));
  }

  function getLegacyTaxInvoiceCustomers(){
    const rows = readJson(LEGACY_KEY, []);
    return Array.isArray(rows) ? rows.map(row => normalizeCustomer(row, { source: 'tax-invoice-legacy', createdFrom: 'tax-invoice-legacy' })) : [];
  }

  function getCustomerMaster(options={}){
    const master = readJson(MASTER_KEY, []);
    const rows = Array.isArray(master) ? master.map(row => normalizeCustomer(row)) : [];
    return options.includeLegacy === false ? rows : mergeCustomers(rows.concat(getLegacyTaxInvoiceCustomers()));
  }

  function setCustomerMaster(rows){
    const normalized = mergeCustomers(rows).map(row => {
      const out = { ...row };
      delete out.original;
      return out;
    });
    writeJson(MASTER_KEY, normalized);
    notify({ type: 'CUSTOMERS_RESPONSE', customers: normalized });
    return normalized;
  }

  function findDuplicateCustomer(customer, rows=getCustomerMaster({ includeLegacy: true })){
    const c = normalizeCustomer(customer);
    return rows.map(normalizeCustomer).find(row => {
      if (c.customerId && row.customerId === c.customerId) return false;
      if (c.taxId && row.taxId === c.taxId) return true;
      if (c.customerCode && row.customerCode && c.customerCode.toLowerCase() === row.customerCode.toLowerCase()) return true;
      if (c.normalizedName && c.normalizedName === row.normalizedName && normalizedAddress(c) && normalizedAddress(c) === normalizedAddress(row)) return true;
      if (c.normalizedName && c.normalizedName === row.normalizedName && c.phone && c.phone === row.phone) return true;
      return c.legacyIds.some(id => row.legacyIds.includes(id));
    }) || null;
  }

  function upsertCustomerMaster(customer, options={}){
    let rows = getCustomerMaster({ includeLegacy: false });
    let item = normalizeCustomer(customer, options);
    if (!item.customerCode) item.customerCode = nextCustomerCode(rows.concat(getLegacyTaxInvoiceCustomers()));
    item.code = item.customerCode;
    const existing = rows.find(row => row.customerId === item.customerId) || findDuplicateCustomer(item, rows);
    if (existing) {
      item = normalizeCustomer({
        ...existing,
        ...item,
        customerId: existing.customerId,
        customerCode: existing.customerCode || item.customerCode,
        createdAt: existing.createdAt,
        createdBy: existing.createdBy,
        updatedAt: Date.now(),
        legacyIds: Array.from(new Set([...(existing.legacyIds || []), ...(item.legacyIds || [])]))
      }, options);
      rows = rows.filter(row => row.customerId !== existing.customerId);
    }
    rows.push(item);
    setCustomerMaster(rows);
    queuePending(item, options);
    syncPendingCustomers();
    notify({ type: existing ? 'CUSTOMER_UPDATED' : 'CUSTOMER_CREATED', customer: item });
    return item;
  }

  function queuePending(customer, options={}){
    if (options.queue === false) return;
    const pending = readJson(PENDING_KEY, []);
    pending.push({ id: customer.customerId, customer, action: 'upsert', at: Date.now(), source: options.createdFrom || options.source || customer.source });
    writeJson(PENDING_KEY, mergePending(pending));
  }

  function mergePending(rows){
    const map = new Map();
    (rows || []).forEach(row => map.set(row.id || row.customer?.customerId, row));
    return Array.from(map.values());
  }

  async function syncPendingCustomers(){
    if (!remoteReady()) return { skipped: true, reason: 'firebase-not-ready' };
    const pending = mergePending(readJson(PENDING_KEY, []));
    if (!pending.length) return { ok: true, attempted: 0, synced: 0, failed: 0 };
    const remaining = [];
    let synced = 0;
    for (const row of pending) {
      try {
        await writeRemoteCustomer(row.customer, { source: row.source, createdFrom: row.source });
        synced += 1;
      } catch (error) {
        remaining.push({ ...row, lastError: error && (error.code || error.message) || String(error), lastTriedAt: Date.now() });
      }
    }
    writeJson(PENDING_KEY, remaining);
    return { ok: remaining.length === 0, attempted: pending.length, synced, failed: remaining.length };
  }

  function previewLegacyMigration(){
    const legacy = getLegacyTaxInvoiceCustomers();
    const master = getCustomerMaster({ includeLegacy: false });
    const creates = [];
    const duplicates = [];
    const conflicts = [];
    const duplicateInPreview = (customer, rows) => {
      const c = normalizeCustomer(customer);
      return rows.map(normalizeCustomer).find(row => {
        if (c.taxId && row.taxId === c.taxId) return true;
        if (c.customerCode && row.customerCode && c.customerCode.toLowerCase() === row.customerCode.toLowerCase()) return true;
        if (c.normalizedName && c.normalizedName === row.normalizedName && normalizedAddress(c) && normalizedAddress(c) === normalizedAddress(row)) return true;
        if (c.normalizedName && c.normalizedName === row.normalizedName && c.phone && c.phone === row.phone) return true;
        return c.legacyIds.some(id => row.legacyIds.includes(id));
      }) || null;
    };
    function conflictReason(customer, duplicate){
      const c = normalizeCustomer(customer);
      const d = normalizeCustomer(duplicate);
      const cNameOnly = normalizedName(c.customerName);
      const dNameOnly = normalizedName(d.customerName);
      const reasons = [];
      if (c.customerCode && d.customerCode && c.customerCode.toLowerCase() === d.customerCode.toLowerCase() && c.taxId && d.taxId && c.taxId !== d.taxId) reasons.push('same customerCode but different taxId');
      if (c.taxId && d.taxId && c.taxId === d.taxId && cNameOnly && dNameOnly && cNameOnly !== dNameOnly) reasons.push('same taxId but different normalizedName');
      if (c.customerCode && d.customerCode && c.customerCode.toLowerCase() === d.customerCode.toLowerCase() && cNameOnly && dNameOnly && cNameOnly !== dNameOnly) reasons.push('same customerCode but different normalizedName');
      return reasons;
    }
    legacy.forEach(customer => {
      const dup = duplicateInPreview(customer, master.concat(creates));
      if (dup) {
        const reasons = conflictReason(customer, dup);
        const row = { legacyId: customer.legacyIds[0], duplicateCustomerId: dup.customerId, reason: duplicateKey(customer) };
        if (reasons.length) conflicts.push({ ...row, reasons });
        else duplicates.push(row);
      }
      else creates.push(customer);
    });
    return {
      legacyCount: legacy.length,
      masterCount: master.length,
      createCount: creates.length,
      duplicateCount: duplicates.length,
      conflictCount: conflicts.length,
      missingCodeCount: legacy.filter(row => !row.customerCode).length,
      missingAddressCount: legacy.filter(row => !row.address1 && !row.address2).length,
      missingTaxIdCount: legacy.filter(row => !row.taxId).length,
      creates,
      duplicates,
      conflicts,
      rollbackMap: creates.map(row => ({ legacyId: row.legacyIds[0], customerId: row.customerId }))
    };
  }

  async function applyLegacyMigration(options={}){
    const preview = previewLegacyMigration();
    const rows = getCustomerMaster({ includeLegacy: false });
    const next = mergeCustomers(rows.concat(preview.creates));
    setCustomerMaster(next);
    preview.creates.forEach(customer => queuePending(customer, { ...options, source: options.source || 'tax-invoice-legacy-migration' }));
    const syncResult = await syncPendingCustomers();
    notify({ type: 'CUSTOMERS_MIGRATED', preview, syncResult });
    return { ...preview, syncResult };
  }

  function bindFirestoreCustomerMaster(){
    if (remoteBound || !remoteReady()) return false;
    if (root.auth && !root.auth.currentUser && !remoteAuthWaiting) {
      remoteAuthWaiting = true;
      authReady().then(() => {
        remoteAuthWaiting = false;
        bindFirestoreCustomerMaster();
      });
      return false;
    }
    remoteBound = true;
    try {
      remoteUnsubscribe = root.db.collection(FIRESTORE_COLLECTION).onSnapshot(snapshot => {
        const remoteRows = snapshot.docs.map(doc => normalizeCustomer({ ...doc.data(), firestoreDocId: doc.id, source: doc.data().source || 'firestore-customers' }));
        const localRows = readJson(MASTER_KEY, []);
        setCustomerMaster(mergeCustomers(remoteRows.concat(Array.isArray(localRows) ? localRows : [])));
        syncPendingCustomers();
      }, error => {
        notify({ type: 'CUSTOMERS_FIRESTORE_ERROR', error: error && (error.code || error.message) || String(error) });
      });
      syncPendingCustomers();
      return true;
    } catch (error) {
      remoteBound = false;
      notify({ type: 'CUSTOMERS_FIRESTORE_ERROR', error: error && (error.code || error.message) || String(error) });
      return false;
    }
  }

  function notify(message){
    try { root.dispatchEvent?.(new CustomEvent('chokanan-customer-master-updated', { detail: message })); } catch (error) {}
    try {
      const channel = new BroadcastChannel(CHANNEL);
      channel.postMessage(message);
      channel.close();
    } catch (error) {}
    try { root.localStorage?.setItem('chokananCustomerMasterLastEventV1', JSON.stringify({ ...message, at: Date.now() })); } catch (error) {}
  }

  function bindRealtime(){
    if (root.__chokananCustomerMasterBound) return;
    root.__chokananCustomerMasterBound = true;
    try {
      const channel = new BroadcastChannel(CHANNEL);
      channel.unref?.();
      channel.onmessage = event => {
        if (!event?.data || !/^CUSTOMER/.test(String(event.data.type || ''))) return;
        root.dispatchEvent?.(new CustomEvent('chokanan-customer-master-updated', { detail: event.data }));
      };
    } catch (error) {}
    root.addEventListener?.('storage', event => {
      if (event.key === MASTER_KEY || event.key === 'chokananCustomerMasterLastEventV1') {
        root.dispatchEvent?.(new CustomEvent('chokanan-customer-master-updated', { detail: { type: 'CUSTOMERS_RESPONSE' } }));
      }
    });
  }

  bindRealtime();

  root.ChokAnanCustomerMaster = {
    MASTER_KEY,
    LEGACY_KEY,
    PENDING_KEY,
    FIRESTORE_COLLECTION,
    normalizeCustomer,
    normalizeLegacyCustomer: normalizeCustomer,
    getLegacyTaxInvoiceCustomers,
    getCustomerMaster,
    upsertCustomerMaster,
    setCustomerMaster,
    findDuplicateCustomer,
    previewLegacyMigration,
    applyLegacyMigration,
    bindFirestoreCustomerMaster,
    syncPendingCustomers,
    writeRemoteCustomer,
    customerDocId,
    nextCustomerCode,
    mergeCustomers
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.ChokAnanCustomerMaster;
  if (root.setTimeout) root.setTimeout(bindFirestoreCustomerMaster, 0);
})(typeof window !== 'undefined' ? window : globalThis);
