const assert = require('assert');

const store = {};
global.localStorage = {
  getItem: key => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
  setItem: (key, value) => { store[key] = String(value); }
};

const repo = require('../modules/invoice-generator/native-invoice-repository.js');

localStorage.setItem('invoices', JSON.stringify([
  { id: 'local-1', no: 'IV000002', buyerName: 'Legacy', total: 100, date: '2026-08-04' },
  { id: 'dup', invoiceId: 'IV000010', no: 'IV000010', buyerName: 'Legacy duplicate', total: 1, date: '2026-08-04' }
]));

const merged = repo.deduplicate([
  ...repo.migrateLegacyReadOnly(),
  { invoiceId: 'IV000010', no: 'IV000010', buyerName: 'Primary wins', total: 500, date: '2026-08-04', sourceCollection: 'taxInvoices' },
  { invoiceId: 'IV000003', no: 'IV000003', buyerName: 'Primary 3', total: 300, date: '2026-08-04', sourceCollection: 'taxInvoices' }
]);

assert.strictEqual(merged.rows.length, 3, 'repository must merge primary and legacy rows without duplicate invoice numbers');
assert.strictEqual(merged.rows.find(row => row.no === 'IV000010').buyerName, 'Primary wins', 'taxInvoices must win over legacy duplicates');
assert.deepStrictEqual(merged.rows.map(row => row.no), ['IV000010', 'IV000003', 'IV000002'], 'invoice numbers must sort by numeric suffix');

(async () => {
  const saved = await repo.save({ id: 'manual-1', no: 'IV000011', buyerName: 'Manual', items: [], total: 123, date: '2026-08-04' });
  assert.ok(saved.invoiceId, 'save must normalize invoiceId');
  assert.ok(repo.getByInvoiceNumber('IV000011'), 'saved invoice must be readable immediately from repository');
  await repo.markPrinted(saved, { by: 'test' });
  assert.strictEqual(repo.getByInvoiceNumber('IV000011').printStatus, 'printed', 'markPrinted must update repository status');
  console.log('native invoice repository v2 passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
