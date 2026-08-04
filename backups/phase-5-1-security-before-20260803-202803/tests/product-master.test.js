const assert = require('assert');

const memory = new Map();
global.localStorage = {
  getItem(key){ return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value){ memory.set(key, String(value)); },
  removeItem(key){ memory.delete(key); }
};

const master = require('../modules/product-master/product-master.js');

localStorage.setItem(master.MASTER_KEY, JSON.stringify([
  { id: 'p-a', name: 'ท่อ PVC 2 นิ้ว', unit: 'เส้น', price: '120', cost: '80', active: true, createdAt: 1 },
  { id: 'p-b', code: 'AA00001', name: 'กาวทาท่อ PVC', unit: '', price: '45', cost: '30', active: true },
  { id: 'p-c', name: 'สีขาว', unit: 'ถัง', price: '450', cost: '300', active: false }
]));
localStorage.setItem('products', JSON.stringify([
  { code: 'TX00001', name: 'ค้อนเหล็ก', unit: 'อัน', price: 199, cost: 120 }
]));

const all = master.loadMaster({ persist: true });
assert.strictEqual(all.length, 4);
assert.ok(all.find(row => row.name === 'ท่อ PVC 2 นิ้ว').code);
assert.strictEqual(all.find(row => row.name === 'กาวทาท่อ PVC').code, 'AA00001');
assert.strictEqual(new Set(all.map(row => row.code)).size, all.length);
assert.strictEqual(master.needUnit().length, 1);
assert.strictEqual(master.listTaxInvoiceProducts().some(row => row.name === 'กาวทาท่อ PVC'), false);
assert.strictEqual(master.listTaxInvoiceProducts().some(row => row.name === 'สีขาว'), false);
assert.strictEqual(master.listTaxInvoiceProducts().some(row => row.name === 'ค้อนเหล็ก'), true);

master.updateUnit('p-b', 'กระป๋อง');
assert.strictEqual(master.needUnit().length, 0);
assert.strictEqual(master.listTaxInvoiceProducts().some(row => row.name === 'กาวทาท่อ PVC'), true);

const beforeCode = master.listAll().find(row => row.id === 'p-a').code;
master.upsert({ id: 'p-a', name: 'ท่อ PVC เปลี่ยนชื่อ', unit: 'เส้น', price: 130, cost: 90 });
const updated = master.listAll().find(row => row.id === 'p-a');
assert.strictEqual(updated.code, beforeCode);
assert.strictEqual(updated.name, 'ท่อ PVC เปลี่ยนชื่อ');
assert.strictEqual(updated.salePrice, 130);
assert.strictEqual(updated.costPrice, 90);

const stats = master.stats();
assert.strictEqual(stats.duplicateCount, 0);
assert.strictEqual(stats.productCount, 4);
assert.ok(stats.generatedCodeCount >= 1);

console.log('product master checks passed', JSON.stringify(stats));
