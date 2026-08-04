(function(){
  'use strict';

  const PLACEHOLDER_SUPPLIERS = new Set(['ยังไม่ได้ระบุ', 'ไม่ระบุบริษัท', 'ไม่มีที่สั่ง']);

  function text(value){
    return String(value == null ? '' : value).trim();
  }

  function clean(value){
    return text(value).toLowerCase().replace(/[\s\u200b\-_/.,()]+/g, '');
  }

  function readJson(key, fallback){
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function numberOrZero(value){
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function supplierList(value){
    const raw = text(value);
    if (!raw || PLACEHOLDER_SUPPLIERS.has(raw)) return [];
    return raw.split(/[\/,]/).map(text).filter(Boolean);
  }

  function idFromName(name){
    const key = clean(name).replace(/[^\u0E00-\u0E7Fa-z0-9]/gi, '').slice(0, 120);
    return key ? `p_${key}` : `p_${Date.now()}`;
  }

  function normalizeStockProduct(row, source){
    const name = text(row && row.name);
    if (!name) return null;
    const code = text(row.code || row.productCode || row.sku || row.barcode || row.itemCode);
    return {
      productId: text(row.id) || (code ? `code_${code}` : idFromName(name)),
      code,
      name,
      unit: text(row.unit),
      costPrice: numberOrZero(row.costPrice != null ? row.costPrice : row.cost),
      salePrice: numberOrZero(row.salePrice != null ? row.salePrice : row.price),
      active: row.active !== false && row.archived !== true && row.cleared !== true,
      suppliers: supplierList(row.supplier),
      source,
      original: row
    };
  }

  function normalizeTaxProduct(row, index){
    const name = text(row && row.name);
    if (!name) return null;
    const code = text(row.code);
    return {
      productId: code ? `tax_${code}` : `tax_${index}_${idFromName(name)}`,
      code,
      name,
      unit: text(row.unit),
      costPrice: numberOrZero(row.cost),
      salePrice: numberOrZero(row.price),
      active: true,
      suppliers: [],
      source: 'tax-invoice-local',
      original: row
    };
  }

  function uniqueProducts(rows){
    const byKey = new Map();
    rows.filter(Boolean).forEach(row => {
      const key = row.code ? `code:${clean(row.code)}` : `name:${clean(row.name)}`;
      const existing = byKey.get(key);
      if (!existing) byKey.set(key, row);
      else byKey.set(key, {
        ...existing,
        unit: existing.unit || row.unit,
        costPrice: existing.costPrice || row.costPrice,
        salePrice: existing.salePrice || row.salePrice,
        suppliers: Array.from(new Set([...(existing.suppliers || []), ...(row.suppliers || [])])),
        source: `${existing.source},${row.source}`
      });
    });
    return Array.from(byKey.values());
  }

  function getStockAlertProducts(){
    const cacheProducts = readJson('stockAlertProductsV730', []);
    const shortageRows = Array.isArray(window.items) ? window.items : readJson('stock_alert_beta1_items', []);
    const rows = [
      ...(Array.isArray(cacheProducts) ? cacheProducts.map(row => normalizeStockProduct(row, 'stock-alert-products')) : []),
      ...(Array.isArray(shortageRows) ? shortageRows.map(row => normalizeStockProduct(row, 'stock-alert-shortages')) : [])
    ];
    return uniqueProducts(rows);
  }

  function getTaxInvoiceProducts(){
    const rows = readJson('products', []);
    return Array.isArray(rows) ? rows.map(normalizeTaxProduct).filter(Boolean) : [];
  }

  function sharedProducts(){
    return getStockAlertProducts().map(row => ({
      productId: row.productId,
      code: row.code,
      name: row.name,
      unit: row.unit,
      costPrice: row.costPrice,
      salePrice: row.salePrice,
      active: row.active
    }));
  }

  function conflictReport(){
    const stock = getStockAlertProducts();
    const tax = getTaxInvoiceProducts();
    const stockByCode = new Map(stock.filter(x => x.code).map(x => [clean(x.code), x]));
    const taxByCode = new Map(tax.filter(x => x.code).map(x => [clean(x.code), x]));
    const stockByName = new Map(stock.map(x => [clean(x.name), x]));
    const taxByName = new Map(tax.map(x => [clean(x.name), x]));
    const report = {
      generatedAt: new Date().toISOString(),
      stockAlertProducts: stock.length,
      taxInvoiceProducts: tax.length,
      sameCodeSameName: [],
      sameCodeDifferentName: [],
      sameNameDifferentCode: [],
      missingUnit: [],
      missingCostPrice: [],
      missingSalePrice: [],
      duplicates: [],
      stockAlertOnly: [],
      taxInvoiceOnly: []
    };

    stock.forEach(row => {
      const taxMatch = row.code ? taxByCode.get(clean(row.code)) : null;
      if (taxMatch) {
        if (clean(row.name) === clean(taxMatch.name)) report.sameCodeSameName.push({ code: row.code, name: row.name });
        else report.sameCodeDifferentName.push({ code: row.code, stockAlertName: row.name, taxInvoiceName: taxMatch.name });
      }
      const nameMatch = taxByName.get(clean(row.name));
      if (nameMatch && clean(row.code) !== clean(nameMatch.code)) {
        report.sameNameDifferentCode.push({ name: row.name, stockAlertCode: row.code, taxInvoiceCode: nameMatch.code });
      }
      if (!taxMatch && !nameMatch) report.stockAlertOnly.push({ code: row.code, name: row.name, unit: row.unit });
    });

    tax.forEach(row => {
      const stockMatch = row.code ? stockByCode.get(clean(row.code)) : null;
      const nameMatch = stockByName.get(clean(row.name));
      if (!stockMatch && !nameMatch) report.taxInvoiceOnly.push({ code: row.code, name: row.name, unit: row.unit });
    });

    uniqueProducts([...stock, ...tax]).forEach(row => {
      if (!row.unit) report.missingUnit.push({ code: row.code, name: row.name, source: row.source });
      if (!row.costPrice) report.missingCostPrice.push({ code: row.code, name: row.name, source: row.source });
      if (!row.salePrice) report.missingSalePrice.push({ code: row.code, name: row.name, source: row.source });
    });

    const seen = new Map();
    [...stock, ...tax].forEach(row => {
      const key = row.code ? `code:${clean(row.code)}` : `name:${clean(row.name)}`;
      const list = seen.get(key) || [];
      list.push({ code: row.code, name: row.name, source: row.source });
      seen.set(key, list);
    });
    seen.forEach(list => {
      if (list.length > 1) report.duplicates.push(list);
    });

    return report;
  }

  window.CMSProductAdapter = {
    mode: 'test-read-only',
    getStockAlertProducts,
    getTaxInvoiceProducts,
    sharedProducts,
    conflictReport
  };
})();
