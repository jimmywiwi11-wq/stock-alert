const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cash-reconciliation.js','utf8');
const handler=source.slice(source.indexOf('  window.saveCashMorning=async function(){'),source.indexOf('  window.saveCashTemporary=async function(){'));
async function morning(fail=false){
  const messages=[],writes=[];
  const old={branch:1,date:'2026-10-18',morningChange:100,sales:20,transfer:0,eveningChange:0};
  const remote={...old,sales:900,expenses:[{amount:50}],cashAdds:[{amount:10}]};
  const ctx={window:{},cashSaving:false,cashDirty:true,cashEditingRecord:old,collectBranchForm:()=>({...old,morningChange:200}),normalize:x=>x,getRecord:()=>old,ready:()=>true,num:Number,toastCash:x=>messages.push(x),CASH_COLL:'cash',docId:(type,b,d)=>type+b+d,stripMorningBank:x=>x,emptyRecord:()=>({}),userName:()=> 'test',setDraftLocal:r=>{ctx.saved=r},refreshCashActive:()=>{},console:{warn:()=>{}},db:{collection:()=>({doc:id=>({id})}),runTransaction:async fn=>{if(fail)throw Error('denied');return fn({get:async ref=>({exists:ref.id.startsWith('record'),data:()=>remote}),set:(ref,data)=>writes.push(data)});}}};
  vm.createContext(ctx);vm.runInContext(handler,ctx);await ctx.window.saveCashMorning();
  if(fail){assert.equal(writes.length,0);assert.equal(ctx.cashDirty,true);assert.ok(messages.at(-1).includes('ไม่สำเร็จ'));}
  else{assert.equal(writes.length,1);assert.equal(writes[0].morningChange,200);assert.equal(writes[0].sales,900);assert.deepEqual(writes[0].expenses,remote.expenses);assert.equal(ctx.cashDirty,false);}
}
function refresh(dirty,saving){
  const rendered=[];
  const ctx={ensureHomeButton(){},ensureSummarySalesEntry(){},document:{getElementById:id=>id==='cashBranchPage'?{classList:{contains:()=>true}}:id==='cashDateInputV749'?{value:'2026-10-18'}:null},cashDirty:dirty,cashSaving:saving,cashBranch:1,getRecord:(b,d)=>({branch:b,date:d,morningChange:999}),renderBranch:r=>rendered.push(r)};
  vm.createContext(ctx);vm.runInContext(source.match(/  function refreshCashActive\(\)\{[^\n]+/)[0]+'\nrefreshCashActive();',ctx);
  assert.equal(rendered.length,dirty||saving?0:1);
  if(rendered.length)assert.equal(rendered[0].morningChange,999);
}
(async()=>{await morning();await morning(true);refresh(false,false);refresh(true,false);refresh(false,true);console.log('Cash save: remote values preserved, failure leaves edits intact, clean forms receive shared values, dirty/saving forms protected.');})().catch(e=>{console.error(e);process.exitCode=1});
