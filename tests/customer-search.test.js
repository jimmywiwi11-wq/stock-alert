const assert = require('assert');

const memory = new Map();
global.localStorage = {
  getItem(key){ return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value){ memory.set(key, String(value)); },
  removeItem(key){ memory.delete(key); }
};
global.addEventListener = () => {};
global.dispatchEvent = () => {};

require('../modules/customer-master/customer-master.js');
const search = require('../modules/invoice-request/invoice-request-customer-search.js');

global.ChokAnanCustomerMaster.upsertCustomerMaster({
  customerCode: 'C009',
  prefix: 'บริษัท',
  customerName: 'ค้นหาเจอ จำกัด',
  taxId: '0123456789012',
  address1: '123 ถนนสุขุมวิท',
  address2: 'ชลบุรี 20000',
  phone: '0801234567',
  headOffice: true
}, { createdFrom: 'tax-invoice-desktop' });

assert.strictEqual(search.searchCustomers('C009', 5)[0].customerName, 'ค้นหาเจอ จำกัด');
assert.strictEqual(search.searchCustomers('012345', 5)[0].taxId, '0123456789012');
assert.strictEqual(search.searchCustomers('080123', 5)[0].customerCode, 'C009');
assert.ok(search.fullAddress(search.searchCustomers('สุขุมวิท', 5)[0]).includes('ชลบุรี'));

console.log('customer search checks passed');
