const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve(__dirname, '../cash-reconciliation.js'), 'utf8');

const dashboard = source.match(/function salesDashboardHtml\(list\)\{[\s\S]*?\n  \}/);
assert.ok(dashboard, 'salesDashboardHtml must exist');
assert.strictEqual(dashboard[0].includes('ยังไม่มีข้อมูล'), false, 'dashboard numeric cards should show 0.00 บาท instead of empty text');
assert.ok(dashboard[0].includes('const t=total(list),value=v=>`${money(v)} บาท`;'), 'dashboard values should always render money');

const branchBreakdown = source.match(/function salesBranchBreakdownHtml\(list\)\{[\s\S]*?return `<section class="salesBreakdownV769"/);
assert.ok(branchBreakdown, 'salesBranchBreakdownHtml must exist');
assert.strictEqual(branchBreakdown[0].includes("t.days.size?money"), false, 'branch breakdown numeric fields should not switch to empty text');
assert.ok(branchBreakdown[0].includes('ยอดขายรวม ${money(t.sales)} บาท'), 'branch sales should always render money');
assert.ok(source.includes('สาขา 2\\nยอดขายรวม: ${money(b2.sales)} บาท'), 'copied monthly summary should show 0.00 บาท for branch 2 with no data');

console.log('sales summary checks passed');
