const assert = require('assert');
const preview = require('../modules/cms-integration/cms-product-master-preview.js');

const stockAlertProducts = [
  { id: 'p1', code: '00123', name: 'ท่อ PVC 2 นิ้ว', unit: 'เส้น', costPrice: '', salePrice: '120', supplier: 'SCG / ThaiPipe', category: 'ประปา' },
  { id: 'p2', code: 'A200', name: 'สีน้ำมัน TOA สีดำ', unit: 'กระป๋อง', costPrice: '80', salePrice: '100', supplier: 'TOA' },
  { id: 'p3', code: '', name: 'เทปพันเกลียว', unit: 'ม้วน', costPrice: '0', salePrice: '15', supplier: 'SCG' },
  { id: 'p4', code: 'MIX01', name: 'ค้อนเหล็ก', unit: 'อัน', costPrice: '70', salePrice: 'ค้อน', supplier: 'Tools Co' }
];

const stockAlertShortages = [
  { id: 's1', name: 'ท่อ PVC 2นิ้ว', branch: 1, status: 'out', unit: 'เส้น', supplier: 'SCG' },
  { id: 's2', name: 'กาวทาท่อ PVC', branch: 2, status: 'low', qty: '3', unit: '', supplier: 'SCG' }
];

const taxInvoiceProducts = [
  { code: '00123', name: 'ท่อ PVC 2 นิ้ว', unit: 'เส้น', cost: '90', price: '120' },
  { code: 'A200', name: 'สีน้ำมัน TOA ดำ', unit: 'กระป๋อง', cost: '80', price: '100' },
  { code: 'B001', name: 'เทปพันเกลียว', unit: 'ม้วน', cost: '', price: '15' },
  { code: 'C999', name: 'ค้อนเหล็ก', unit: 'อัน', cost: '75', price: '130' },
  { code: 'G100', name: 'กาวทาท่อ PVC 100 กรัม', unit: 'กระปุก', cost: '25', price: '35' },
  { code: '', name: 'ลูกลอย', unit: 'ตัว', cost: '20', price: '' }
];

const full = preview.normalizeTaxProduct({ code: '00001', name: 'ข้อต่อ (PVC) 1/2', unit: 'ตัว', cost: '1,200', price: '0' }, 0);
assert.strictEqual(full.productCode, '00001');
assert.strictEqual(full.productName, 'ข้อต่อ (PVC) 1/2');
assert.strictEqual(full.unit, 'ตัว');
assert.strictEqual(full.costPrice, 1200);
assert.strictEqual(full.salePrice, 0);

const blankCost = preview.normalizeTaxProduct({ code: 'C1', name: 'สินค้า A', unit: 'ชิ้น', cost: '', price: '5' }, 0);
assert.strictEqual(blankCost.costPrice, null);
assert.strictEqual(blankCost.salePrice, 5);

const blankSale = preview.normalizeStockProduct({ code: 'S1', name: 'สินค้า B', unit: 'ชิ้น', costPrice: '2', salePrice: '' }, 0);
assert.strictEqual(blankSale.salePrice, null);

const blankUnit = preview.normalizeStockProduct({ code: 'U1', name: 'สินค้า C', unit: '', costPrice: '2', salePrice: '5' }, 0);
assert.deepStrictEqual(preview.isProductEligibleForTaxInvoice(blankUnit), {
  eligible: false,
  reasons: ['MISSING_UNIT'],
  missingFields: ['unit']
});

const withNameAndUnit = preview.normalizeStockProduct({ code: '', name: 'สินค้า D', unit: 'กล่อง', costPrice: '', salePrice: '' }, 0);
assert.strictEqual(preview.isProductEligibleForTaxInvoice(withNameAndUnit).eligible, true);

const result = preview.createMigrationPreview({ stockAlertProducts, stockAlertShortages, taxInvoiceProducts });
const summary = preview.summarizePreview(result);

assert.strictEqual(result.sourceCounts.stockAlertProducts, 4);
assert.strictEqual(result.sourceCounts.stockAlertShortages, 2);
assert.strictEqual(result.sourceCounts.taxInvoiceProducts, 6);
assert.strictEqual(result.sourceCounts.total, 12);
assert.ok(result.conflictCounts.sameCodeSameName >= 1);
assert.ok(result.conflictCounts.sameCodeDifferentName >= 1);
assert.ok(result.conflictCounts.sameNameDifferentCode >= 1);
assert.ok(result.conflictCounts.fuzzyName >= 1);
assert.ok(summary.missingCode >= 2);
assert.ok(summary.missingUnit >= 1);
assert.ok(summary.missingSalePrice >= 2);
assert.ok(summary.missingCostPrice >= 3);
assert.ok(result.rows.some(row => row.existingProductCode === '00123'));
assert.ok(result.rows.some(row => row.proposedAction === preview.ACTION.NEED_UNIT));
assert.ok(result.rows.some(row => row.proposedAction === preview.ACTION.REVIEW_CONFLICT));

console.log(JSON.stringify({
  status: 'PASS',
  sourceCounts: result.sourceCounts,
  summary,
  conflictCounts: result.conflictCounts
}, null, 2));
