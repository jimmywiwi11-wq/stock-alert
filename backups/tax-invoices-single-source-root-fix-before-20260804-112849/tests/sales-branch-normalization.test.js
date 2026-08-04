const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve(__dirname, '../cash-reconciliation.js'), 'utf8');
const match = source.match(/function normalizeBranchId\(value, fallback=1\)\{[\s\S]*?\n  \}/);
assert.ok(match, 'normalizeBranchId function must exist');

const normalizeBranchId = new Function(`${match[0]}; return normalizeBranchId;`)();

[
  [1, 1],
  ['1', 1],
  ['branch-1', 1],
  ['branch_1', 1],
  ['สาขา 1', 1],
  ['สาขา1', 1],
  [2, 2],
  ['2', 2],
  ['branch-2', 2],
  ['branch_2', 2],
  ['branch2', 2],
  ['สาขา 2', 2],
  ['สาขา2', 2]
].forEach(([input, expected]) => {
  assert.strictEqual(normalizeBranchId(input), expected, `branch ${input} should normalize to ${expected}`);
});

assert.strictEqual(normalizeBranchId('', 2), 2, 'fallback branch 2 should be preserved');
assert.ok(source.includes('window.StockAlertCashReconciliation'), 'normalizer should be exposed for diagnostics/tests');

console.log('sales branch normalization checks passed');
