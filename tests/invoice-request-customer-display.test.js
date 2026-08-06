const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requestSource = fs.readFileSync(path.join(root, 'modules/invoice-request/invoice-request.js'), 'utf8');
const search = require('../modules/invoice-request/invoice-request-customer-search.js');
const generator = require('../modules/invoice-generator/invoice-generator.js');

assert.ok(requestSource.includes('cmsInvoiceSelectedCustomerV42'), 'employee request page should render a compact selected-customer box');
assert.ok(requestSource.includes('<label>ลูกค้าที่เลือก</label>'), 'selected customer label should be visible');

const panelSource = requestSource.slice(requestSource.indexOf('function renderCustomerPanel'), requestSource.indexOf('function renderProductPanel'));
[
  'c?.taxId',
  'c?.phone',
  'c?.address1',
  'c?.address2'
].forEach(text => assert.strictEqual(panelSource.includes(text), false, `employee UI should not render ${text}`));
[
  'cmsNewCustomerPrefixV42',
  'cmsNewCustomerAddress1V42',
  'cmsNewCustomerAddress2V42',
  'cmsNewCustomerTaxV42',
  'await customerCodeNow()'
].forEach(text => assert.ok(requestSource.includes(text), `employee customer creation should keep ${text}`));
assert.ok(!requestSource.slice(requestSource.indexOf('async function customerCodeNow'), requestSource.indexOf('function newCustomerValue')).includes('getSeconds'), 'employee customer code must not be timestamp-based');

assert.ok(requestSource.includes('customerSnapshot()'), 'request submit must still use full customerSnapshot');
const snapshotSource = requestSource.slice(requestSource.indexOf('function customerSnapshot'), requestSource.indexOf('function itemSnapshot'));
['customerId', 'customerCode', 'prefix', 'customerName', 'address1', 'address2', 'taxId', 'phone', 'headOffice', 'branchNumber'].forEach(field => {
  assert.ok(snapshotSource.includes(field), `customerSnapshot should keep ${field}`);
});

const customer = {
  customerCode: 'CUST-001',
  prefix: 'บริษัท',
  customerName: 'เคเอ็ม ชัตเตอร์ แอนด์ คอนสตรัคชั่น จำกัด (สำนักงานใหญ่)',
  taxId: '0123456789012',
  phone: '0812345678',
  address1: '123 ถนนสุขุมวิท',
  address2: 'กรุงเทพฯ'
};
assert.strictEqual(search.fullName(customer), 'บริษัท เคเอ็ม ชัตเตอร์ แอนด์ คอนสตรัคชั่น จำกัด (สำนักงานใหญ่)');
assert.strictEqual(search.shortMeta(customer), 'CUST-001 | เลขภาษี ...9012');
assert.strictEqual(search.shortMeta(customer).includes(customer.address1), false, 'search result meta should not show full address');
assert.strictEqual(search.shortMeta(customer).includes(customer.phone), false, 'search result meta should not show phone');
assert.strictEqual(search.shortMeta(customer).includes(customer.taxId), false, 'search result meta should mask full taxId');

const legacyInvoice = generator.legacyInvoiceShape({
  invoiceId: 'IV-ID-1',
  invoiceNumber: 'IV000001',
  invoiceDate: '2026-08-03',
  customerSnapshot: customer,
  itemsSnapshot: [{ productCode: 'P001', productName: 'สินค้า', unit: 'ชิ้น', salePrice: 100, quantity: 1 }],
  beforeVat: 100,
  vatAmount: 7,
  grandTotal: 107
});
assert.strictEqual(legacyInvoice.buyerTax, '0123456789012');
assert.strictEqual(legacyInvoice.buyerAddress1, '123 ถนนสุขุมวิท');
assert.strictEqual(legacyInvoice.buyerAddress2, 'กรุงเทพฯ');

console.log('invoice request customer display checks passed');
