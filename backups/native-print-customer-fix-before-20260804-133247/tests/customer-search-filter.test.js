const assert = require('assert');

const memory = new Map();
global.localStorage = {
  getItem(key){ return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value){ memory.set(key, String(value)); },
  removeItem(key){ memory.delete(key); }
};

global.ChokAnanCustomerMaster = {
  getCustomerMaster(){
    return [
      { customerCode: 'CU-AEON', customerName: 'Aeon Hardware', normalizedName: 'aeonhardware', taxId: '0100000000001', phone: '0811111111', address1: 'Bangkok' },
      { customerCode: 'CU-ABC', customerName: 'ABC Cement', normalizedName: 'abccement', taxId: '0100000000002', phone: '0822222222', address1: 'Saraburi' },
      { customerCode: 'CU-XYZ', customerName: 'XYZ Steel', normalizedName: 'xyzsteel', taxId: '0100000000003', phone: '0833333333', address1: 'Chiang Mai' }
    ];
  }
};

const search = require('../modules/invoice-request/invoice-request-customer-search.js');

assert.deepStrictEqual(search.searchCustomers('', 10), []);
assert.deepStrictEqual(search.searchCustomers('NO_MATCH', 10), []);
assert.deepStrictEqual(search.searchCustomers('ABC', 10).map(row => row.customerCode), ['CU-ABC']);
assert.deepStrictEqual(search.searchCustomers('0100000000002', 10).map(row => row.customerCode), ['CU-ABC']);
assert.deepStrictEqual(search.searchCustomers('08', 10).map(row => row.customerCode), ['CU-ABC', 'CU-AEON', 'CU-XYZ']);
assert.deepStrictEqual(search.searchCustomers('Z', 10).map(row => row.customerCode), ['CU-XYZ']);

console.log('customer search filter checks passed');
