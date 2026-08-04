const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requestSource = fs.readFileSync(path.join(root, 'modules/invoice-request/invoice-request.js'), 'utf8');
const searchSource = fs.readFileSync(path.join(root, 'modules/invoice-request/invoice-request-customer-search.js'), 'utf8');
const desktopSource = fs.readFileSync(path.join(root, 'desktop/tax-invoice/tax_invoice_app.html'), 'utf8');
const masterSource = fs.readFileSync(path.join(root, 'modules/customer-master/customer-master.js'), 'utf8');

assert.ok(searchSource.includes('getCustomerMaster({ includeLegacy: false })'), 'employee Invoice Request should read shared Customer Master as primary source');
assert.strictEqual(requestSource.includes('upsertCustomerMaster'), false, 'employee Invoice Request must not write Customer Master');
assert.ok(desktopSource.includes("upsertCustomerMaster(item,{createdFrom:'tax-invoice-desktop'"), 'Tax Invoice Desktop should write through Customer Master adapter');
assert.ok(masterSource.includes('findDuplicateCustomer'), 'Customer Master should provide duplicate prevention');
assert.ok(masterSource.includes('taxText'), 'Customer Master should keep taxId as digit string');
assert.ok(masterSource.includes('PENDING_KEY'), 'offline writes should be queued for later sync');
assert.ok(masterSource.includes("FIRESTORE_COLLECTION = 'customers'"), 'Customer Master should use shared Firestore customers collection');
assert.ok(masterSource.includes('bindFirestoreCustomerMaster'), 'Customer Master should listen to shared Firestore customers collection');
assert.ok(masterSource.includes('applyLegacyMigration'), 'Customer Master should provide preview-confirmed legacy migration');

console.log('customer security contract checks passed');
