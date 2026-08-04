(function(root){
  'use strict';

  function text(value){
    return String(value == null ? '' : value).trim();
  }

  function parseNumber(value){
    if (value === 0 || value === '0') return 0;
    const raw = text(value).replace(/,/g, '');
    if (!raw) return null;
    const number = Number(raw);
    return Number.isFinite(number) ? number : NaN;
  }

  function lineTotal(item){
    const price = parseNumber(item.salePrice);
    const qty = parseNumber(item.quantity);
    return Number.isFinite(price) && Number.isFinite(qty) ? price * qty : 0;
  }

  function validateItem(item){
    const errors = {};
    if (!text(item.productName)) errors.productName = 'กรุณาระบุชื่อสินค้า';
    if (!text(item.unit)) errors.unit = 'กรุณาระบุหน่วย';

    const salePrice = parseNumber(item.salePrice);
    if (salePrice === null) errors.salePrice = 'กรุณาระบุราคาขาย';
    else if (!Number.isFinite(salePrice)) errors.salePrice = 'ราคาขายต้องเป็นตัวเลข';
    else if (salePrice < 0) errors.salePrice = 'ราคาขายห้ามติดลบ';

    const quantity = parseNumber(item.quantity);
    if (quantity === null) errors.quantity = 'กรุณาระบุจำนวน';
    else if (!Number.isFinite(quantity)) errors.quantity = 'จำนวนต้องเป็นตัวเลข';
    else if (quantity <= 0) errors.quantity = 'จำนวนต้องมากกว่า 0';

    return { valid: Object.keys(errors).length === 0, errors };
  }

  function duplicateKeys(items){
    const seen = new Map();
    const duplicate = new Set();
    items.forEach((item, index) => {
      const key = text(item.productCode) ? `code:${text(item.productCode).toLowerCase()}` : `name:${text(item.productName).toLowerCase().replace(/\s+/g, '')}`;
      if (seen.has(key)) {
        duplicate.add(index);
        duplicate.add(seen.get(key));
      } else {
        seen.set(key, index);
      }
    });
    return duplicate;
  }

  function validateRequest(request){
    const errors = [];
    if (!request.customer || !text(request.customer.customerName)) errors.push({ field: 'customer', message: 'กรุณาเลือกลูกค้า' });
    if (!Array.isArray(request.items) || request.items.length === 0) errors.push({ field: 'items', message: 'กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ' });
    const duplicates = duplicateKeys(request.items || []);
    const itemResults = (request.items || []).map((item, index) => {
      const result = validateItem(item);
      if (duplicates.has(index)) result.errors.duplicate = 'พบสินค้าซ้ำในคำขอนี้';
      result.valid = result.valid && !duplicates.has(index);
      return result;
    });
    const firstInvalidIndex = itemResults.findIndex(result => !result.valid);
    return {
      valid: errors.length === 0 && firstInvalidIndex === -1,
      errors,
      itemResults,
      firstInvalidIndex
    };
  }

  root.CMSInvoiceRequestValidation = {
    text,
    parseNumber,
    lineTotal,
    validateItem,
    validateRequest
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.CMSInvoiceRequestValidation;
})(typeof window !== 'undefined' ? window : globalThis);
