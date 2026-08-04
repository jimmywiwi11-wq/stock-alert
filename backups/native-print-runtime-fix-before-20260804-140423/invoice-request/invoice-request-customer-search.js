(function(root){
  'use strict';

  function text(value){
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function normalizeSearch(value){
    return text(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  function compact(value){
    return normalizeSearch(value).replace(/\s+/g, '');
  }

  function normalizeCustomer(row){
    const source = row || {};
    const address1 = source.address1 !== undefined ? source.address1 : source.address;
    const taxId = source.taxId !== undefined ? source.taxId : source.tax;
    const phone = source.phone !== undefined ? source.phone : source.tel;
    return {
      customerId: text(source.customerId || source.id || source.code || taxId || source.name),
      customerCode: text(source.customerCode || source.code),
      prefix: text(source.prefix),
      customerName: text(source.customerName || source.name),
      normalizedName: text(source.normalizedName),
      address1: text(address1),
      address2: text(source.address2),
      taxId: text(taxId),
      phone: text(phone),
      branch: text(source.branch || source.office || source.headOfficeBranch),
      original: source
    };
  }

  function fullName(customer){
    return [customer.prefix, customer.customerName].filter(Boolean).join(' ').trim();
  }

  function fullAddress(customer){
    return [customer.address1, customer.address2].filter(Boolean).join(' ').trim();
  }

  function shortTaxId(taxId){
    const digits = String(taxId || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.length > 4 ? `เลขภาษี ...${digits.slice(-4)}` : `เลขภาษี ${digits}`;
  }

  function shortMeta(customer){
    return [customer.customerCode, shortTaxId(customer.taxId)].filter(Boolean).join(' | ') || 'ลูกค้าในระบบ';
  }

  function fields(customer){
    return [
      customer.customerCode,
      customer.prefix,
      customer.customerName,
      fullName(customer),
      customer.taxId,
      customer.phone,
      customer.address1,
      customer.address2,
      fullAddress(customer),
      customer.branch
    ].filter(Boolean);
  }

  function strictFuzzyHit(query, value){
    const q = compact(query);
    const v = compact(value);
    if (q.length < 2 || !v || q.length > v.length) return false;
    let pos = 0;
    let gaps = 0;
    for (const char of q) {
      const next = v.indexOf(char, pos);
      if (next < 0) return false;
      gaps += Math.max(0, next - pos);
      pos = next + 1;
    }
    return gaps <= Math.max(1, Math.floor(q.length / 2));
  }

  function score(customer, query){
    const q = normalizeSearch(query);
    const compactQ = compact(query);
    if (!q) return 99;
    const nameFields = [customer.customerName, fullName(customer), customer.normalizedName].filter(Boolean);
    const names = nameFields.map(normalizeSearch);
    const code = normalizeSearch(customer.customerCode);
    const taxQuery = q.replace(/\D/g, '');
    const tax = String(customer.taxId || '').replace(/\D/g, '');
    const phone = String(customer.phone || '').replace(/\D/g, '');
    const addressFields = [customer.address1, customer.address2, fullAddress(customer)].filter(Boolean);
    const addresses = addressFields.map(normalizeSearch);
    if (names.some(value => value === q || compact(value) === compactQ)) return 1;
    if (names.some(value => value.startsWith(q) || compact(value).startsWith(compactQ))) return 2;
    if (names.some(value => value.includes(q) || compact(value).includes(compactQ))) return 3;
    if (code && (code === q || compact(code) === compactQ)) return 4;
    if (code && (code.startsWith(q) || compact(code).startsWith(compactQ))) return 5;
    if (taxQuery && tax && (tax === taxQuery || tax.startsWith(taxQuery) || tax.includes(taxQuery))) return 6;
    if (taxQuery && phone && phone.includes(taxQuery)) return 7;
    if (addresses.some(value => value.includes(q) || compact(value).includes(compactQ))) return 8;
    if (fields(customer).some(value => strictFuzzyHit(query, value))) return 9;
    return 99;
  }

  function listCustomers(){
    if (root.ChokAnanCustomerMaster && typeof root.ChokAnanCustomerMaster.getCustomerMaster === 'function') {
      return root.ChokAnanCustomerMaster.getCustomerMaster({ includeLegacy: false }).map(normalizeCustomer).filter(item => item.customerName || item.customerCode);
    }
    const store = root.CMSInvoiceRequestStore;
    const rows = store ? store.readJson('customers', []) : [];
    return Array.isArray(rows) ? rows.map(normalizeCustomer).filter(item => item.customerName || item.customerCode) : [];
  }

  function searchCustomers(query, limit){
    if (!normalizeSearch(query)) return [];
    const rows = listCustomers().map(customer => ({ customer, score: score(customer, query) }))
      .filter(row => row.score < 99)
      .sort((a, b) => a.score - b.score || fullName(a.customer).localeCompare(fullName(b.customer), 'th'));
    return rows.slice(0, limit || 20).map(row => row.customer);
  }

  root.CMSInvoiceCustomerSearch = {
    normalizeCustomer,
    listCustomers,
    searchCustomers,
    fullName,
    fullAddress,
    shortTaxId,
    shortMeta
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.CMSInvoiceCustomerSearch;
})(typeof window !== 'undefined' ? window : globalThis);
