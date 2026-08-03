(function(){
  'use strict';

  const master = window.ChokAnanProductMaster;
  if (!master || typeof store === 'undefined') return;

  const originalGet = store.get.bind(store);
  const originalSet = store.set.bind(store);

  function mapTaxProduct(row){
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      unit: row.unit,
      cost: row.costPrice != null ? row.costPrice : row.cost,
      price: row.salePrice != null ? row.salePrice : row.price,
      active: row.active !== false,
      liveProductMaster: true
    };
  }

  function mergeProducts(rows){
    const current = master.listAll();
    const byKey = new Map(current.map(row => [row.id, row]));
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const normalized = master.normalizeRows([{ ...row, createdFrom: 'tax-invoice-product-edit' }])[0];
      if (!normalized) return;
      const old = current.find(item => String(item.id) === String(normalized.id) || String(item.code) === String(normalized.code));
      byKey.set((old || normalized).id, {
        ...(old || {}),
        ...normalized,
        code: old?.code || normalized.code,
        productCode: old?.productCode || normalized.productCode,
        updatedAt: Date.now(),
        updatedDate: Date.now()
      });
    });
    master.saveMaster(Array.from(byKey.values()));
  }

  store.get = function(key, fallback){
    if (key === 'products') return master.listTaxInvoiceProducts().map(mapTaxProduct);
    return originalGet(key, fallback);
  };

  store.set = function(key, value){
    if (key === 'products') {
      mergeProducts(value);
      return;
    }
    return originalSet(key, value);
  };

  const basePreviewProductCode = window.previewProductCode;
  window.previewProductCode = function(){
    if (typeof editProductIndex !== 'undefined' && editProductIndex !== null) return;
    const rows = master.listAll();
    if (window.pCode) pCode.value = nextCode(thaiInitials(window.pName ? pName.value : 'PM'), rows, 5);
    else if (typeof basePreviewProductCode === 'function') basePreviewProductCode();
  };

  const baseDeleteProduct = window.deleteProduct;
  window.deleteProduct = function(index){
    const product = store.get('products', [])[index];
    if (!product) return;
    if (!confirm('ปิดใช้งานสินค้านี้? สินค้าจะไม่แสดงใน Tax Invoice แต่ยังอยู่ใน Product Master')) return;
    master.setActive(product.id || product.code, false);
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof refreshInvoiceSelects === 'function') refreshInvoiceSelects();
  };

  window.ChokAnanTaxInvoiceProductMasterBridge = {
    mode: 'live-product-master',
    list: () => store.get('products', []),
    stats: () => master.stats()
  };

  master.loadMaster({ persist: true });
  if (typeof renderProducts === 'function') setTimeout(renderProducts, 0);
})();
