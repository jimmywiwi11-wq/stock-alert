(function(root){
  'use strict';

  const MASTER_KEY = 'stockAlertProductsV730';
  const LEGACY_TAX_PRODUCTS_KEY = 'products';
  const CODE_PREFIX = 'PM';
  const CODE_WIDTH = 5;
  let storageGuardInstalled = false;
  let normalizing = false;

  function text(value){
    return String(value == null ? '' : value).trim();
  }

  function compact(value){
    return text(value).toLowerCase().replace(/[\s\u200b\-_/.,()]+/g, '');
  }

  function parseNumber(value){
    if (value === 0 || value === '0') return 0;
    const raw = text(value).replace(/,/g, '');
    if (!raw) return null;
    const number = Number(raw);
    return Number.isFinite(number) ? number : null;
  }

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

  function productId(row, index){
    const raw = row || {};
    const existing = text(raw.id || raw.productId);
    if (existing) return existing;
    const code = text(raw.productCode || raw.code);
    if (code) return `pm_code_${compact(code)}`;
    const name = text(raw.productName || raw.name);
    const safe = compact(name).replace(/[^\u0E00-\u0E7Fa-z0-9]/gi, '').slice(0, 90);
    return `pm_name_${safe || index + 1}`;
  }

  function nextGeneratedCode(used){
    let n = 1;
    let code = '';
    do {
      code = `${CODE_PREFIX}${String(n).padStart(CODE_WIDTH, '0')}`;
      n += 1;
    } while (used.has(code.toLowerCase()));
    used.add(code.toLowerCase());
    return code;
  }

  function sourceMeta(row){
    return row && (row.source || row.createdFrom || row._source) || 'stock-alert-product-master';
  }

  function normalizeRow(row, index, usedCodes, now){
    const raw = row || {};
    const name = text(raw.productName || raw.name || raw.itemName);
    if (!name) return null;
    const existingCode = text(raw.productCode || raw.code);
    const code = existingCode || nextGeneratedCode(usedCodes);
    if (existingCode) usedCodes.add(existingCode.toLowerCase());
    const salePrice = parseNumber(raw.salePrice != null ? raw.salePrice : raw.price);
    const costPrice = parseNumber(raw.costPrice != null ? raw.costPrice : raw.cost);
    const id = productId(raw, index);
    const active = raw.active !== false && raw.archived !== true && raw.cleared !== true;
    return {
      ...raw,
      id,
      productId: id,
      code,
      productCode: code,
      name,
      productName: name,
      search: compact(name),
      unit: text(raw.unit || raw.unitName || raw.uom),
      cost: costPrice,
      costPrice,
      price: salePrice,
      salePrice,
      active,
      createdAt: raw.createdAt || raw.createdDate || now,
      createdDate: raw.createdDate || raw.createdAt || now,
      updatedAt: raw.updatedAt || raw.updatedDate || now,
      updatedDate: raw.updatedDate || raw.updatedAt || now,
      createdFrom: raw.createdFrom || sourceMeta(raw),
      liveProductMaster: true
    };
  }

  function dedupeRows(rows){
    const byKey = new Map();
    rows.filter(Boolean).forEach(row => {
      const key = row.code ? `code:${compact(row.code)}` : `name:${compact(row.name)}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, row);
        return;
      }
      byKey.set(key, {
        ...existing,
        ...row,
        id: existing.id || row.id,
        productId: existing.productId || row.productId,
        code: existing.code || row.code,
        productCode: existing.productCode || row.productCode,
        unit: existing.unit || row.unit,
        cost: existing.cost != null ? existing.cost : row.cost,
        costPrice: existing.costPrice != null ? existing.costPrice : row.costPrice,
        price: existing.price != null ? existing.price : row.price,
        salePrice: existing.salePrice != null ? existing.salePrice : row.salePrice,
        createdAt: existing.createdAt || row.createdAt,
        createdDate: existing.createdDate || row.createdDate,
        updatedAt: Math.max(Number(existing.updatedAt) || 0, Number(row.updatedAt) || 0) || existing.updatedAt || row.updatedAt,
        updatedDate: Math.max(Number(existing.updatedDate) || 0, Number(row.updatedDate) || 0) || existing.updatedDate || row.updatedDate,
        legacySources: Array.from(new Set([...(existing.legacySources || []), ...(row.legacySources || []), row.createdFrom, existing.createdFrom].filter(Boolean)))
      });
    });
    return Array.from(byKey.values());
  }

  function normalizeRows(inputRows){
    const rows = Array.isArray(inputRows) ? inputRows : [];
    const used = new Set(rows.map(row => text(row && (row.productCode || row.code)).toLowerCase()).filter(Boolean));
    const now = Date.now();
    const normalized = rows.map((row, index) => normalizeRow(row, index, used, now)).filter(Boolean);
    return dedupeRows(normalized);
  }

  function legacyTaxRows(){
    const rows = readJson(LEGACY_TAX_PRODUCTS_KEY, []);
    return Array.isArray(rows) ? rows.map(row => ({ ...row, createdFrom: 'tax-invoice-legacy-products' })) : [];
  }

  function loadMaster(options){
    const opts = options || {};
    const rows = readJson(MASTER_KEY, []);
    const sourceRows = Array.isArray(rows) ? rows : [];
    const merged = opts.includeLegacyTax === false ? sourceRows : sourceRows.concat(legacyTaxRows());
    const normalized = normalizeRows(merged);
    if (opts.persist !== false && JSON.stringify(sourceRows) !== JSON.stringify(normalized)) {
      normalizing = true;
      try { writeJson(MASTER_KEY, normalized); } finally { normalizing = false; }
    }
    return normalized;
  }

  function saveMaster(rows){
    const normalized = normalizeRows(rows);
    normalizing = true;
    try { writeJson(MASTER_KEY, normalized); } finally { normalizing = false; }
    return normalized;
  }

  function listAll(){
    return loadMaster({ persist: true });
  }

  function listActive(){
    return listAll().filter(row => row.active !== false);
  }

  function listTaxInvoiceProducts(){
    return listActive()
      .filter(row => text(row.unit))
      .map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        unit: row.unit,
        cost: row.costPrice,
        price: row.salePrice,
        active: row.active !== false,
        liveProductMaster: true
      }));
  }

  function needUnit(){
    return listActive().filter(row => !text(row.unit));
  }

  function upsert(product){
    const rows = listAll();
    const nextRow = normalizeRows([product])[0];
    const index = rows.findIndex(row => String(row.id) === String(nextRow.id) || compact(row.code) === compact(nextRow.code));
    if (index >= 0) rows[index] = { ...rows[index], ...nextRow, code: rows[index].code || nextRow.code, productCode: rows[index].productCode || nextRow.productCode, updatedAt: Date.now(), updatedDate: Date.now() };
    else rows.push(nextRow);
    return saveMaster(rows);
  }

  function createProduct(product, meta){
    const rows = listAll();
    const now = Date.now();
    const raw = product || {};
    const usedCodes = new Set(rows.map(row => text(row.code || row.productCode).toLowerCase()).filter(Boolean));
    const code = text(raw.productCode || raw.code) || nextGeneratedCode(usedCodes);
    const id = text(raw.productId || raw.id) || `pm_${now}_${Math.random().toString(16).slice(2, 8)}`;
    const row = normalizeRows([{
      ...raw,
      id,
      productId: id,
      code,
      productCode: code,
      active: raw.active !== false,
      createdAt: raw.createdAt || now,
      createdDate: raw.createdDate || now,
      updatedAt: now,
      updatedDate: now,
      createdFrom: raw.createdFrom || 'invoice-request-production',
      createdBy: meta && meta.by || raw.createdBy || '',
      requestedBranch: meta && meta.branch || raw.requestedBranch || ''
    }])[0];
    const existing = rows.find(item => String(item.id) === String(row.id) || compact(item.code) === compact(row.code));
    if (existing) return existing;
    rows.push(row);
    saveMaster(rows);
    return row;
  }

  function setActive(id, active){
    const rows = listAll();
    const row = rows.find(item => String(item.id) === String(id) || compact(item.code) === compact(id));
    if (row) {
      row.active = !!active;
      row.updatedAt = Date.now();
      row.updatedDate = row.updatedAt;
      saveMaster(rows);
    }
    return row || null;
  }

  function updateUnit(id, unit){
    const rows = listAll();
    const row = rows.find(item => String(item.id) === String(id) || compact(item.code) === compact(id));
    if (row) {
      row.unit = text(unit);
      row.updatedAt = Date.now();
      row.updatedDate = row.updatedAt;
      saveMaster(rows);
    }
    return row || null;
  }

  function stats(){
    const rows = listAll();
    const codes = new Map();
    rows.forEach(row => {
      const key = compact(row.code);
      if (!key) return;
      codes.set(key, (codes.get(key) || 0) + 1);
    });
    return {
      productCount: rows.length,
      generatedCodeCount: rows.filter(row => /^PM\d{5}$/.test(text(row.code))).length,
      duplicateCount: Array.from(codes.values()).filter(count => count > 1).length,
      needUnitCount: needUnit().length,
      taxInvoiceProductCount: listTaxInvoiceProducts().length
    };
  }

  function installStorageGuard(){
    if (storageGuardInstalled || !root.localStorage) return;
    storageGuardInstalled = true;
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key, value){
      if (key === MASTER_KEY && !normalizing) {
        try {
          const parsed = JSON.parse(String(value));
          if (Array.isArray(parsed)) {
            value = JSON.stringify(normalizeRows(parsed));
          }
        } catch (_) {}
      }
      return original(key, value);
    };
  }

  const api = {
    MASTER_KEY,
    LEGACY_TAX_PRODUCTS_KEY,
    CODE_PREFIX,
    normalizeRows,
    loadMaster,
    saveMaster,
    listAll,
    listActive,
    listTaxInvoiceProducts,
    needUnit,
    upsert,
    createProduct,
    setActive,
    updateUnit,
    stats,
    installStorageGuard
  };

  root.ChokAnanProductMaster = api;
  installStorageGuard();
  if (root.localStorage) setTimeout(() => loadMaster({ persist: true }), 0);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
