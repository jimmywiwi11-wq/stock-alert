(function(root){
  'use strict';

  function text(value){
    return String(value == null ? '' : value).trim();
  }

  function normalize(value){
    return text(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  function compact(value){
    return normalize(value).replace(/\s+/g, '');
  }

  function numberValue(value){
    if (value === 0 || value === '0') return 0;
    const raw = text(value).replace(/,/g, '');
    if (!raw) return null;
    const number = Number(raw);
    return Number.isFinite(number) ? number : null;
  }

  function normalizeProduct(row, source){
    const raw = row || {};
    return {
      productId: text(raw.productId || raw.id || raw.code || raw.productCode || raw.name),
      productCode: text(raw.productCode || raw.code || raw.sku || raw.barcode || raw.itemCode),
      productName: text(raw.productName || raw.name),
      normalizedName: text(raw.normalizedName),
      unit: text(raw.unit),
      salePrice: numberValue(raw.salePrice != null ? raw.salePrice : raw.price),
      source: source || raw.source || 'test-read-only',
      original: raw
    };
  }

  function readProducts(){
    const rows = [];
    if (root.ChokAnanProductMaster && typeof root.ChokAnanProductMaster.listTaxInvoiceProducts === 'function') {
      rows.push(...root.ChokAnanProductMaster.listTaxInvoiceProducts().map(row => normalizeProduct(row, 'live-product-master')));
      return rows.filter(item => item.productName);
    }
    if (root.CMSProductAdapter && typeof root.CMSProductAdapter.sharedProducts === 'function') {
      rows.push(...root.CMSProductAdapter.sharedProducts().map(row => normalizeProduct(row, 'stock-alert-adapter')));
    }
    const store = root.CMSInvoiceRequestStore;
    const taxRows = store ? store.readJson('products', []) : [];
    if (Array.isArray(taxRows)) rows.push(...taxRows.map(row => normalizeProduct(row, 'tax-invoice-products')));
    return rows.filter(item => item.productName);
  }

  function uniqueProducts(rows){
    const map = new Map();
    rows.forEach(item => {
      const key = item.productCode ? `code:${compact(item.productCode)}` : `name:${compact(item.productName)}`;
      if (!map.has(key)) map.set(key, item);
      else {
        const old = map.get(key);
        map.set(key, {
          ...old,
          unit: old.unit || item.unit,
          salePrice: old.salePrice == null ? item.salePrice : old.salePrice,
          source: `${old.source},${item.source}`
        });
      }
    });
    return Array.from(map.values());
  }

  function fuzzyHit(query, value){
    const q = compact(query);
    const v = compact(value);
    if (!q || q.length < 2) return false;
    let pos = 0;
    for (const char of q) {
      pos = v.indexOf(char, pos);
      if (pos < 0) return false;
      pos += 1;
    }
    return true;
  }

  function score(product, query){
    const q = normalize(query);
    const compactQ = compact(query);
    if (!q) return 99;
    const names = [product.productName, product.normalizedName].filter(Boolean).map(normalize);
    const code = normalize(product.productCode);
    const unit = normalize(product.unit);
    const fields = [product.productCode, product.productName, product.normalizedName, product.unit].filter(Boolean);
    if (names.some(value => value === q || compact(value) === compactQ)) return 1;
    if (names.some(value => value.startsWith(q) || compact(value).startsWith(compactQ))) return 2;
    if (names.some(value => value.includes(q) || compact(value).includes(compactQ))) return 3;
    if (code && (code === q || compact(code) === compactQ)) return 4;
    if (code && (code.startsWith(q) || compact(code).startsWith(compactQ))) return 5;
    if (unit && (unit === q || unit.startsWith(q) || unit.includes(q))) return 6;
    if (fields.some(value => fuzzyHit(q, value))) return 7;
    return 99;
  }

  function searchProducts(query, limit){
    if (!normalize(query)) return [];
    return uniqueProducts(readProducts())
      .map(product => ({ product, score: score(product, query) }))
      .filter(row => row.score < 99)
      .sort((a, b) => a.score - b.score || a.product.productName.localeCompare(b.product.productName, 'th'))
      .slice(0, limit || 30)
      .map(row => row.product);
  }

  function similarProducts(name, limit){
    return searchProducts(name, limit || 8).filter(product => compact(product.productName) !== compact(name));
  }

  root.CMSInvoiceProductSearch = {
    normalizeProduct,
    readProducts,
    searchProducts,
    similarProducts
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.CMSInvoiceProductSearch;
})(typeof window !== 'undefined' ? window : globalThis);
