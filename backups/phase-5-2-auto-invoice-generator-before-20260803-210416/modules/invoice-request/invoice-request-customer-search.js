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

  function score(customer, query){
    const q = normalizeSearch(query);
    const compactQ = compact(query);
    if (!q) return 0;
    const rows = fields(customer);
    const normalized = rows.map(normalizeSearch);
    if (normalized.some(value => value === q)) return 1;
    if (normalizeSearch(customer.customerCode) === q) return 2;
    if (customer.taxId && customer.taxId.replace(/\D/g, '').includes(q.replace(/\D/g, ''))) return 3;
    if (normalized.some(value => value.startsWith(q))) return 4;
    if (normalized.some(value => value.includes(q) || compact(value).includes(compactQ))) return 5;
    return 99;
  }

  function listCustomers(){
    const store = root.CMSInvoiceRequestStore;
    const rows = store ? store.readJson('customers', []) : [];
    return Array.isArray(rows) ? rows.map(normalizeCustomer).filter(item => item.customerName || item.customerCode) : [];
  }

  function searchCustomers(query, limit){
    const rows = listCustomers().map(customer => ({ customer, score: score(customer, query) }))
      .filter(row => !query || row.score < 99)
      .sort((a, b) => a.score - b.score || fullName(a.customer).localeCompare(fullName(b.customer), 'th'));
    return rows.slice(0, limit || 20).map(row => row.customer);
  }

  root.CMSInvoiceCustomerSearch = {
    normalizeCustomer,
    listCustomers,
    searchCustomers,
    fullName,
    fullAddress
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.CMSInvoiceCustomerSearch;
})(typeof window !== 'undefined' ? window : globalThis);
