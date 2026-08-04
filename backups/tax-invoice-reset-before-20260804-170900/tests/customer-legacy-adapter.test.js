const assert = require('assert');

const memory = new Map();
global.localStorage = {
  getItem(key){ return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value){ memory.set(key, String(value)); },
  removeItem(key){ memory.delete(key); }
};
global.addEventListener = () => {};
global.dispatchEvent = () => {};

const master = require('../modules/customer-master/customer-master.js');

localStorage.setItem('customers', JSON.stringify([
  { code: 'L001', prefix: 'ร้าน', name: 'ลูกค้าเดิม', tax: '0000000000007', address: '10 ตลาด', tel: '0899999999' },
  { customerCode: 'L001', customerName: 'ลูกค้าเดิม', taxId: '0000000000007', address1: '10 ตลาด', phone: '0899999999' },
  { name: 'ไม่มีรหัส', address1: '20 ถนนรอง' }
]));

const preview = master.previewLegacyMigration();
assert.strictEqual(preview.legacyCount, 3, 'preview should read legacy rows without writing migration');
assert.ok(preview.duplicateCount >= 1, 'preview should detect duplicate legacy customers');
assert.ok(preview.missingCodeCount >= 1, 'preview should report missing customer code');
assert.ok(preview.missingTaxIdCount >= 1, 'preview should report missing taxId');
assert.ok(Array.isArray(preview.rollbackMap), 'preview should include rollback map');
assert.strictEqual(localStorage.getItem(master.MASTER_KEY), null, 'preview must not write production migration');

const merged = master.getCustomerMaster({ includeLegacy: true });
assert.strictEqual(merged.filter(row => row.taxId === '0000000000007').length, 1, 'dual-read should merge duplicate legacy rows');

console.log('customer legacy adapter checks passed');
