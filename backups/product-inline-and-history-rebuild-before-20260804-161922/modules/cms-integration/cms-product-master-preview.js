(function(root){
  'use strict';

  const PLACEHOLDER_SUPPLIERS = new Set([
    'ยังไม่ได้ระบุ',
    'ไม่ระบุบริษัท',
    'ไม่มีที่สั่ง',
    'not specified',
    'unknown'
  ]);

  const SOURCE = Object.freeze({
    STOCK_PRODUCTS: 'stock-alert-products',
    STOCK_SHORTAGES: 'stock-alert-shortages',
    TAX_PRODUCTS: 'tax-invoice-products'
  });

  const ACTION = Object.freeze({
    KEEP: 'KEEP',
    MERGE_AFTER_APPROVAL: 'MERGE_AFTER_APPROVAL',
    CREATE_NEW: 'CREATE_NEW',
    NEED_UNIT: 'NEED_UNIT',
    NEED_CODE: 'NEED_CODE',
    REVIEW_CONFLICT: 'REVIEW_CONFLICT',
    SKIP_INVALID: 'SKIP_INVALID'
  });

  function text(value){
    return String(value == null ? '' : value).trim();
  }

  function normalizeName(value){
    return text(value).toLowerCase().replace(/\s+/g, ' ');
  }

  function compact(value){
    return normalizeName(value).replace(/[\s\u200b\-_/.,()]+/g, '');
  }

  function tokens(value){
    return Array.from(new Set(normalizeName(value).split(/[\s\u200b\-_/.,()]+/).filter(Boolean)));
  }

  function parseNumber(value){
    if (value === 0 || value === '0') return 0;
    const raw = text(value).replace(/,/g, '');
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function splitSuppliers(value){
    const raw = text(value);
    if (!raw || PLACEHOLDER_SUPPLIERS.has(raw.toLowerCase()) || PLACEHOLDER_SUPPLIERS.has(raw)) return [];
    return Array.from(new Set(raw.split(/[\/,]/).map(text).filter(Boolean)));
  }

  function stableId(prefix, value){
    const safe = compact(value).replace(/[^\u0E00-\u0E7Fa-z0-9]/gi, '').slice(0, 80);
    return `${prefix}_${safe || 'unknown'}`;
  }

  function normalizeRecord(row, source, index){
    const raw = row || {};
    const productName = text(raw.productName || raw.name || raw.itemName || raw.description);
    const productCode = text(raw.productCode || raw.code || raw.sku || raw.barcode || raw.barCode || raw.itemCode);
    const unit = text(raw.unit || raw.unitName || raw.uom);
    const costPrice = parseNumber(raw.costPrice != null ? raw.costPrice : raw.cost);
    const salePrice = parseNumber(raw.salePrice != null ? raw.salePrice : raw.price);
    const legacyId = text(raw.id || raw.productId || raw.productID || raw.product_id || productCode || `${source}_${index + 1}`);
    const suppliers = [
      ...splitSuppliers(raw.supplier),
      ...(Array.isArray(raw.suppliers) ? raw.suppliers.map(text).filter(Boolean) : [])
    ];

    return {
      source,
      legacyId,
      productId: '',
      productCode,
      productName,
      normalizedName: normalizeName(productName),
      compactName: compact(productName),
      unit,
      costPrice,
      salePrice,
      category: text(raw.category),
      suppliers: Array.from(new Set(suppliers)),
      active: raw.active !== false && raw.archived !== true && raw.cleared !== true,
      createdAt: raw.createdAt || raw.created_at || null,
      createdBy: text(raw.createdBy || raw.by),
      updatedAt: raw.updatedAt || raw.updated_at || null,
      updatedBy: text(raw.updatedBy),
      sourceBranch: raw.branch == null ? '' : String(raw.branch),
      shortageStatus: text(raw.status || raw.shortageStatus),
      original: raw
    };
  }

  function normalizeStockProduct(row, index){
    return normalizeRecord(row, SOURCE.STOCK_PRODUCTS, index);
  }

  function normalizeStockShortage(row, index){
    return normalizeRecord(row, SOURCE.STOCK_SHORTAGES, index);
  }

  function normalizeTaxProduct(row, index){
    const base = normalizeRecord(row, SOURCE.TAX_PRODUCTS, index);
    return {
      ...base,
      costPrice: parseNumber(row && row.cost),
      salePrice: parseNumber(row && row.price)
    };
  }

  function isProductEligibleForTaxInvoice(product){
    const missingFields = [];
    if (!text(product && product.productName)) missingFields.push('productName');
    if (!text(product && product.unit)) missingFields.push('unit');
    const eligible = missingFields.length === 0;
    return {
      eligible,
      reasons: eligible ? ['HAS_NAME_AND_UNIT'] : missingFields.map(field => `MISSING_${field.toUpperCase()}`),
      missingFields
    };
  }

  function proposeProductId(record){
    if (record.productCode) return stableId('pm_code', record.productCode);
    return stableId('pm_name', record.productName || record.legacyId);
  }

  function analyzeConflicts(records){
    const groups = {
      sameCodeSameName: [],
      sameCodeDifferentName: [],
      sameNameDifferentCode: [],
      fuzzyName: [],
      spacingDifference: [],
      caseDifference: [],
      unitConflict: [],
      salePriceConflict: [],
      costPriceConflict: [],
      stockAlertOnly: [],
      taxInvoiceOnly: [],
      missingCode: [],
      missingUnit: [],
      missingSalePrice: [],
      missingCostPrice: [],
      invalidRecord: []
    };

    const byCode = new Map();
    const byName = new Map();
    const byCompactName = new Map();
    records.forEach(record => {
      if (!record.productName) groups.invalidRecord.push(record);
      if (!record.productCode) groups.missingCode.push(record);
      if (!record.unit) groups.missingUnit.push(record);
      if (record.salePrice == null) groups.missingSalePrice.push(record);
      if (record.costPrice == null) groups.missingCostPrice.push(record);
      if (record.productCode) {
        const key = record.productCode.toLowerCase();
        byCode.set(key, [...(byCode.get(key) || []), record]);
      }
      if (record.normalizedName) byName.set(record.normalizedName, [...(byName.get(record.normalizedName) || []), record]);
      if (record.compactName) byCompactName.set(record.compactName, [...(byCompactName.get(record.compactName) || []), record]);
    });

    byCode.forEach(list => {
      if (list.length < 2) return;
      const names = new Set(list.map(record => record.compactName));
      if (names.size === 1) groups.sameCodeSameName.push(list);
      else groups.sameCodeDifferentName.push(list);
    });

    byName.forEach(list => {
      if (list.length > 1 && new Set(list.map(record => record.productCode).filter(Boolean)).size > 1) {
        groups.sameNameDifferentCode.push(list);
      }
    });

    byCompactName.forEach(list => {
      if (list.length > 1) {
        const normalized = new Set(list.map(record => record.normalizedName));
        const raw = new Set(list.map(record => record.productName));
        if (normalized.size > 1) groups.spacingDifference.push(list);
        if (raw.size > 1 && new Set([...raw].map(value => value.toLowerCase())).size === 1) groups.caseDifference.push(list);
        if (new Set(list.map(record => record.unit).filter(Boolean)).size > 1) groups.unitConflict.push(list);
        if (new Set(list.map(record => record.salePrice).filter(value => value != null)).size > 1) groups.salePriceConflict.push(list);
        if (new Set(list.map(record => record.costPrice).filter(value => value != null)).size > 1) groups.costPriceConflict.push(list);
      }
    });

    const stockKeys = new Set(records.filter(record => record.source !== SOURCE.TAX_PRODUCTS).map(record => record.productCode ? `c:${record.productCode.toLowerCase()}` : `n:${record.compactName}`));
    const taxKeys = new Set(records.filter(record => record.source === SOURCE.TAX_PRODUCTS).map(record => record.productCode ? `c:${record.productCode.toLowerCase()}` : `n:${record.compactName}`));
    records.forEach(record => {
      const key = record.productCode ? `c:${record.productCode.toLowerCase()}` : `n:${record.compactName}`;
      if (record.source === SOURCE.TAX_PRODUCTS && !stockKeys.has(key)) groups.taxInvoiceOnly.push(record);
      if (record.source !== SOURCE.TAX_PRODUCTS && !taxKeys.has(key)) groups.stockAlertOnly.push(record);
    });

    const compactRows = records.filter(record => record.compactName);
    for (let i = 0; i < compactRows.length; i += 1) {
      for (let j = i + 1; j < compactRows.length; j += 1) {
        const a = compactRows[i];
        const b = compactRows[j];
        if (a.compactName === b.compactName) continue;
        if (a.compactName.includes(b.compactName) || b.compactName.includes(a.compactName)) {
          groups.fuzzyName.push([a, b]);
        }
      }
    }

    return groups;
  }

  function conflictStatusFor(record, conflicts){
    if (!record.productName) return 'invalid-record';
    const hasCodeConflict = conflicts.sameCodeDifferentName.some(list => list.includes(record));
    const hasNameCodeConflict = conflicts.sameNameDifferentCode.some(list => list.includes(record));
    const hasUnitConflict = conflicts.unitConflict.some(list => list.includes(record));
    const hasPriceConflict = conflicts.salePriceConflict.some(list => list.includes(record)) || conflicts.costPriceConflict.some(list => list.includes(record));
    if (hasCodeConflict) return 'code-conflict';
    if (hasNameCodeConflict) return 'name-code-conflict';
    if (hasUnitConflict) return 'unit-conflict';
    if (hasPriceConflict) return 'price-conflict';
    if (!record.productCode) return 'missing-code';
    if (!record.unit) return 'missing-unit';
    return 'ok';
  }

  function proposedAction(record, eligibility, conflictStatus){
    if (!record.productName) return ACTION.SKIP_INVALID;
    if (conflictStatus.includes('conflict')) return ACTION.REVIEW_CONFLICT;
    if (!record.unit) return ACTION.NEED_UNIT;
    if (!record.productCode) return ACTION.NEED_CODE;
    if (!eligibility.eligible) return ACTION.REVIEW_CONFLICT;
    return record.source === SOURCE.TAX_PRODUCTS ? ACTION.KEEP : ACTION.CREATE_NEW;
  }

  function createMigrationPreview(input){
    const stockProducts = (input && input.stockAlertProducts || []).map(normalizeStockProduct);
    const stockShortages = (input && input.stockAlertShortages || []).map(normalizeStockShortage);
    const taxProducts = (input && input.taxInvoiceProducts || []).map(normalizeTaxProduct);
    const records = [...stockProducts, ...stockShortages, ...taxProducts].filter(Boolean);
    const conflicts = analyzeConflicts(records);
    const rows = records.map(record => {
      const eligibility = isProductEligibleForTaxInvoice(record);
      const conflictStatus = conflictStatusFor(record, conflicts);
      const proposedActionValue = proposedAction(record, eligibility, conflictStatus);
      return {
        source: record.source,
        legacyId: record.legacyId,
        proposedProductId: proposeProductId(record),
        existingProductCode: record.productCode,
        proposedProductCode: record.productCode || '',
        productName: record.productName,
        unit: record.unit,
        costPrice: record.costPrice,
        salePrice: record.salePrice,
        supplier: record.suppliers.join(' / '),
        eligibility,
        duplicateGroup: record.productCode ? `code:${record.productCode}` : `name:${record.compactName}`,
        conflictStatus,
        proposedAction: proposedActionValue
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      mode: 'read-only-preview',
      sourceCounts: {
        stockAlertProducts: stockProducts.length,
        stockAlertShortages: stockShortages.length,
        taxInvoiceProducts: taxProducts.length,
        total: records.length
      },
      conflictCounts: Object.fromEntries(Object.entries(conflicts).map(([key, value]) => [key, value.length])),
      rows
    };
  }

  function summarizePreview(preview){
    const rows = preview.rows || [];
    const count = key => rows.filter(row => row.proposedAction === key).length;
    return {
      total: rows.length,
      withCode: rows.filter(row => row.existingProductCode).length,
      missingCode: rows.filter(row => !row.existingProductCode).length,
      missingUnit: rows.filter(row => !row.unit).length,
      missingSalePrice: rows.filter(row => row.salePrice == null).length,
      missingCostPrice: rows.filter(row => row.costPrice == null).length,
      keep: count(ACTION.KEEP),
      createNew: count(ACTION.CREATE_NEW),
      needUnit: count(ACTION.NEED_UNIT),
      needCode: count(ACTION.NEED_CODE),
      reviewConflict: count(ACTION.REVIEW_CONFLICT),
      skipInvalid: count(ACTION.SKIP_INVALID)
    };
  }

  const api = Object.freeze({
    SOURCE,
    ACTION,
    normalizeName,
    compact,
    tokens,
    parseNumber,
    splitSuppliers,
    normalizeStockProduct,
    normalizeStockShortage,
    normalizeTaxProduct,
    isProductEligibleForTaxInvoice,
    analyzeConflicts,
    createMigrationPreview,
    summarizePreview
  });

  root.CMSProductMasterPreview = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
