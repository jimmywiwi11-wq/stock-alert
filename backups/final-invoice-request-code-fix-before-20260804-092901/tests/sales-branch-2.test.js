const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve(__dirname, '../cash-reconciliation.js'), 'utf8');

assert.ok(source.includes("const branch=normalizeBranchId(row?.branch??row?.branchId??row?.branchKey??row?.branchName??1)"), 'records should normalize legacy branch fields');
assert.ok(source.includes('branch:record.branch,branchId:String(record.branch)'), 'sales cloud payload should write normalized numeric branch');
assert.ok(source.includes("window.loadSalesOnlyDate=function(){const date=document.getElementById('salesOnlyDateV768')?.value||today(),record=salesRecord(salesBranch,date);"), 'sales date loader should load existing branch/date record');
assert.ok(source.includes('renderSalesEntry(record,{isNew:!hasSalesData(record)&&!hasCashCheck(record)})'), 'sales date loader should only show new state when no record exists');
assert.ok(source.includes("upsertLocal(saved);toastCash('บันทึกยอดขายเรียบร้อยแล้ว');renderSalesEntry(saved);refreshCashActive();"), 'saved sales record should stay visible immediately after save');
assert.ok(source.includes("toastCash('บันทึกในเครื่องแล้ว แต่ซิงค์ Firebase ไม่สำเร็จ')"), 'sales save should keep a local Branch 2 record if Firebase is temporarily unavailable');
assert.strictEqual(/salesBranch=Number\(record\.branch\)/.test(source), false, 'sales branch must not fall back through Number(record.branch)');
assert.strictEqual(/openSalesEntryFor=function\(branch,date\)\{salesBranch=Number\(branch\)/.test(source), false, 'opening Branch 2 sales history must preserve normalized branch 2');

console.log('sales branch 2 checks passed');
