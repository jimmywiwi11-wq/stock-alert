const assert = require('assert');

const memory = new Map();
global.localStorage = {
  getItem(key){ return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value){ memory.set(key, String(value)); },
  removeItem(key){ memory.delete(key); },
  key(index){ return Array.from(memory.keys())[index] || null; },
  get length(){ return memory.size; }
};
global.addEventListener = () => {};
global.dispatchEvent = () => {};

const master = require('../modules/customer-master/customer-master.js');

localStorage.setItem('customers', JSON.stringify([
  { code: 'D001', prefix: 'บริษัท', name: 'เดสก์ท็อป จำกัด', taxId: '0100000000001', address1: '1 ถนนหลัก', address2: 'กรุงเทพฯ', phone: '0811111111' }
]));

const created = master.upsertCustomerMaster({
  prefix: 'บริษัท',
  name: 'ลูกค้าใหม่ จำกัด',
  taxId: '0012345678901',
  address1: '99 ถนนใหม่',
  address2: 'นนทบุรี',
  phone: '0822222222'
}, { createdFrom: 'tax-invoice-desktop', source: 'tax-invoice-desktop' });

assert.ok(created.customerId, 'customerId should be generated');
assert.ok(created.customerCode, 'customerCode should be generated if missing');
assert.strictEqual(created.taxId, '0012345678901', 'taxId must preserve leading zero');

const rows = master.getCustomerMaster({ includeLegacy: true });
assert.ok(rows.some(row => row.customerName === 'เดสก์ท็อป จำกัด'), 'legacy desktop customer should be dual-read');
assert.ok(rows.some(row => row.customerName === 'ลูกค้าใหม่ จำกัด'), 'desktop-created customer should be in master');

const updated = master.upsertCustomerMaster({ ...created, name: 'ลูกค้าใหม่ แก้ไขชื่อ จำกัด', phone: '0833333333' }, { createdFrom: 'tax-invoice-desktop' });
assert.strictEqual(updated.customerId, created.customerId, 'editing should preserve customerId');
assert.strictEqual(updated.customerCode, created.customerCode, 'editing should preserve customerCode');
assert.strictEqual(master.getCustomerMaster({ includeLegacy: true }).filter(row => row.taxId === '0012345678901').length, 1, 'editing must not duplicate customer');

assert.ok(memory.has(master.PENDING_KEY), 'offline pending queue should be created for later sync');

console.log('customer master sync checks passed');
