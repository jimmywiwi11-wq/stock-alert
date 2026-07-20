/* Stock Alert V7.55 - Cash Reconciliation */
(function(){
  const APP_VERSION='V7.55';
  const CASH_KEY='stockAlertDailyCashChecksV746';
  const DRAFT_KEY='stockAlertDailyCashDraftsV746';
  const CASH_COLL='stock_alert_beta1_cash_reconciliation';
  const branches={
    1:{name:'โชคอนันต์ สาขา 1',short:'สาขา 1',theme:'blue'},
    2:{name:'โชคอนันต์ สาขา 2',short:'สาขา 2',theme:'green'}
  };
  let cashBranch=1,cashInfoMode='history',cashSalesMode='daily';
  let editingExpenseIndex=-1,editingAddIndex=-1,cashSaving=false,cashUnsub=null;
  let cashDirty=false,cashSuppressDirty=false,cashEditingRecord=null;
  let cashConnectionState='initializing',cashNoticeVisibleUntil=0,cashConnectionStartedAt=Date.now();
  let cashSyncStarting=false,cashRetrying=false,cashToastTimer=null,cashToastText='',cashListenerRun=0,cashActiveListeners=0,cashLastError=null,cashAuthReadyPromise=null;

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function read(key,def){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(def));}catch(e){return def;}}
  function write(key,val){localStorage.setItem(key,JSON.stringify(val));}
  function num(v){const n=Number(String(v??'').replace(/,/g,'').trim());return Number.isFinite(n)&&n>0?n:0;}
  function money(v){return num(v).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function intText(v){return Math.floor(num(v)).toLocaleString('th-TH');}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function timeNow(ts=Date.now()){return new Date(ts).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});}
  function dateText(v){const d=v?new Date(`${v}T00:00:00`):new Date();return d.toLocaleDateString('th-TH',{day:'2-digit',month:'long',year:'numeric'});}
  function monthKey(v){return String(v||'').slice(0,7)||today().slice(0,7);}
  function yearKey(v){return String(v||'').slice(0,4)||today().slice(0,4);}
  function userName(){try{return (typeof nickname!=='undefined'&&nickname)||localStorage.getItem('stockAlertNickname')||localStorage.getItem('stockAlertUserNickname')||'ไม่ระบุ';}catch(e){return 'ไม่ระบุ';}}
  function ready(){return typeof db!=='undefined'&&db&&cashConnectionState==='connected';}
  function firebaseDbReady(){return typeof db!=='undefined'&&db&&typeof db.collection==='function';}
  function isFileMode(){return location.protocol==='file:';}
  function isLocalServer(){return location.hostname==='localhost'||location.hostname==='127.0.0.1';}
  function runtimeMode(){return isFileMode()?'file':isLocalServer()?'localhost':'deployed';}
  function isCashPageActive(){return !!document.querySelector('#cashMenuPage.active,#cashBranchPage.active,#cashInfoPage.active,#cashSalesSummaryPage.active');}
  function debugCash(label,extra={}){
    const auth=typeof firebase!=='undefined'&&firebase.auth?firebase.auth():null;
    console.info('[CashReconciliation]',label,{mode:runtimeMode(),firebaseApps:typeof firebase!=='undefined'&&firebase.apps?firebase.apps.length:0,dbReady:firebaseDbReady(),authAvailable:!!auth,authReady:!auth||!!auth.currentUser,hasUser:!!auth?.currentUser,isAnonymous:!!auth?.currentUser?.isAnonymous,connection:cashConnectionState,activeListeners:cashActiveListeners,...extra});
  }
  function authInstance(){try{return typeof firebase!=='undefined'&&firebase.auth?firebase.auth():null;}catch(e){return null;}}
  function toastCash(msg){
    try{
      const el=document.getElementById('toast');
      if(!el){toast(msg);return;}
      if(cashToastText===msg&&el.classList.contains('show'))return;
      cashToastText=msg;
      clearTimeout(cashToastTimer);
      el.textContent=msg;
      const close=document.createElement('button');
      close.type='button';close.className='cashToastClose';close.textContent='×';
      close.onclick=()=>{el.classList.remove('show');cashToastText='';};
      el.appendChild(close);
      el.classList.add('show');
      cashToastTimer=setTimeout(()=>{el.classList.remove('show');cashToastText='';},4200);
    }catch(e){try{toast(msg);}catch(_){alert(msg);}}
  }
  function clearCashToast(){
    const el=document.getElementById('toast');
    if(el&&cashToastText){el.classList.remove('show');cashToastText='';}
    clearTimeout(cashToastTimer);
  }
  function docId(type,branch,date){return `${type}_${branch}_${date}`;}
  function draftKey(branch,date){return `${branch}_${date}`;}
  function legacyDenomsTotal(map){return Object.entries(map||{}).reduce((s,[d,c])=>s+num(d)*num(c),0);}
  function cleanName(v){return String(v||'ค่าใช้จ่าย').trim().replace(/\s+/g,' ');}

  function emptyRecord(branch=cashBranch,date=today()){
    return {id:`cash_${branch}_${date}`,type:'record',branch:Number(branch),branchId:String(branch),date,
      morningChange:'',eveningChange:'',eveningBank1000Count:0,
      cashAdds:[],expenses:[],sales:'',transfer:'',note:'',createdAt:Date.now(),updatedAt:Date.now(),savedAt:null,savedBy:userName()};
  }
  function normalizeItems(items,kind){
    return (items||[]).map(x=>{
      const base={id:x.id||`${kind}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,amount:num(x.amount)||num(x.denom)*num(x.count),time:x.time||timeNow(x.createdAt||Date.now()),createdAt:x.createdAt||Date.now(),updatedAt:x.updatedAt||Date.now(),by:x.by||x.user||userName()};
      return kind==='expense'?{...base,name:cleanName(x.name||x.detail),note:x.note||''}:{...base,detail:(x.detail||x.note||'เติมเงินทอน').trim()};
    });
  }
  function normalize(row){
    const branch=Number(row?.branch||row?.branchId||1),date=row?.date||today(),base=emptyRecord(branch,date);
    return {...base,...row,id:row?.id||`cash_${branch}_${date}`,type:row?.type||'record',branch,branchId:String(branch),date,
      morningChange:row?.morningChange??legacyDenomsTotal(row?.morningDenoms),
      eveningChange:row?.eveningChange??legacyDenomsTotal(row?.eveningDenoms),
      eveningBank1000Count:num(row?.eveningBank1000Count),
      cashAdds:normalizeItems(row?.cashAdds||row?.morningAdds||[],'add'),
      expenses:normalizeItems(row?.expenses||[],'expense'),
      sales:row?.sales??'',transfer:row?.transfer??'',note:row?.note||'',savedBy:row?.savedBy||row?.by||userName()};
  }
  function rows(){return read(CASH_KEY,[]).map(normalize).filter(r=>r.type!=='draft');}
  function drafts(){return read(DRAFT_KEY,{});}
  function setRows(next){write(CASH_KEY,next.map(normalize).sort((a,b)=>String(b.date).localeCompare(String(a.date))||Number(b.updatedAt||0)-Number(a.updatedAt||0)).slice(0,1500));}
  function getRecord(branch=cashBranch,date=today()){
    const draft=drafts()[draftKey(branch,date)];
    if(draft)return normalize({...draft,type:'draft'});
    return normalize(rows().find(r=>Number(r.branch)===Number(branch)&&r.date===date)||emptyRecord(branch,date));
  }
  function stripMorningBank(row){const out={...row};delete out.morningBank1000Count;return out;}
  function upsertLocal(record){record=stripMorningBank(normalize(record));const next=rows().filter(r=>!(Number(r.branch)===Number(record.branch)&&r.date===record.date));next.unshift({...record,type:'record'});setRows(next);return stripMorningBank(normalize({...record,type:'record'}));}
  function setDraftLocal(record){const all=drafts();all[draftKey(record.branch,record.date)]=stripMorningBank(normalize({...record,type:'draft',updatedAt:Date.now()}));write(DRAFT_KEY,all);}
  function clearDraftLocal(branch,date){const all=drafts();delete all[draftKey(branch,date)];write(DRAFT_KEY,all);}
  async function cloudSet(record,type){if(!ready())throw new Error('firebase-not-ready');record=stripMorningBank(normalize({...record,type,branchId:String(record.branch),updatedAt:Date.now()}));await db.collection(CASH_COLL).doc(docId(type,record.branch,record.date)).set(record,{merge:true});return record;}
  async function cloudDelete(type,branch,date){if(ready())await db.collection(CASH_COLL).doc(docId(type,branch,date)).delete();}
  function setCashConnection(state,temporary=false){
    cashConnectionState=state;
    cashNoticeVisibleUntil=temporary?Date.now()+2600:0;
    if(state==='connected')clearCashToast();
    if(temporary)setTimeout(refreshCashActive,2700);
  }
  function stopCashSync(){
    if(cashUnsub){try{cashUnsub();}catch(e){}cashUnsub=null;cashActiveListeners=Math.max(0,cashActiveListeners-1);}
  }
  function waitForAuthReady(){
    if(cashAuthReadyPromise)return cashAuthReadyPromise;
    const auth=authInstance();
    if(!auth){cashAuthReadyPromise=Promise.resolve({available:false});return cashAuthReadyPromise;}
    if(auth.currentUser){cashAuthReadyPromise=Promise.resolve({available:true,user:auth.currentUser});return cashAuthReadyPromise;}
    cashAuthReadyPromise=new Promise(resolve=>{
      let done=false;
      let unsub=()=>{};
      const finish=user=>{if(done)return;done=true;try{unsub();}catch(e){}resolve({available:true,user});};
      unsub=auth.onAuthStateChanged(user=>{
        if(user)finish(user);
        else if(auth.signInAnonymously)auth.signInAnonymously().then(cred=>finish(cred.user)).catch(error=>resolve({available:true,error}));
        else finish(null);
      },error=>resolve({available:true,error}));
      setTimeout(()=>{if(done)return;done=true;try{unsub();}catch(e){}resolve({available:true,timeout:true});},3500);
    });
    return cashAuthReadyPromise;
  }
  async function startCashSync(force=false){
    if(cashUnsub&&!force)return;
    if(cashSyncStarting)return;
    cashSyncStarting=true;
    try{
      if(force)stopCashSync();
      cashConnectionStartedAt=Date.now();
      if(isFileMode()){
        setCashConnection('file');
        debugCash('file-mode-skip-firebase');
        return;
      }
      if(cashConnectionState==='file')setCashConnection('initializing');
      if(!firebaseDbReady()){
        setCashConnection(navigator.onLine===false?'offline-cache':'error');
        debugCash('db-not-ready');
        return;
      }
      setCashConnection(force?'reconnecting':'initializing');
      const authState=await waitForAuthReady();
      if(authState.error){
        cashLastError=authState.error;
        console.warn('[CashReconciliation] auth error',authState.error.code||authState.error.name,authState.error.message||authState.error);
        cashAuthReadyPromise=null;
        setCashConnection('error');
        return;
      }
      const runId=++cashListenerRun;
      debugCash('listener-start',{runId});
      cashActiveListeners++;
      cashUnsub=db.collection(CASH_COLL).onSnapshot({includeMetadataChanges:true},snap=>{
        if(runId!==cashListenerRun)return;
        cashRetrying=false;
        cashLastError=null;
        const meta=snap.metadata||{};
        setCashConnection(meta.fromCache&&navigator.onLine===false?'offline-cache':'connected',!(meta.fromCache&&navigator.onLine===false));
        debugCash('initial-snapshot-ok',{fromCache:!!meta.fromCache,hasPendingWrites:!!meta.hasPendingWrites,docs:snap.size,runId});
        const remoteRows=[],remoteDrafts={};
        snap.forEach(doc=>{const row=normalize({id:doc.id,...doc.data()});if(row.type==='draft')remoteDrafts[draftKey(row.branch,row.date)]=row;else remoteRows.push(row);});
        if(remoteRows.length)setRows(remoteRows);
        write(DRAFT_KEY,{...drafts(),...remoteDrafts});
        refreshCashActive();
      },err=>{
        if(runId!==cashListenerRun)return;
        cashLastError=err;
        stopCashSync();
        const code=err?.code||err?.name||'unknown';
        console.warn('[CashReconciliation] Firestore listener error',code,err?.message||err);
        setCashConnection(navigator.onLine===false?'offline-cache':'error');
        refreshCashActive();
      });
    }finally{
      cashSyncStarting=false;
    }
  }
  function pollCashSync(){
    if(cashUnsub||cashSyncStarting)return;
    if(Date.now()-cashConnectionStartedAt>3200){
      setCashConnection(navigator.onLine===false?'offline-cache':'error');
      refreshCashActive();
      return;
    }
    startCashSync();
  }
  function calc(record){
    record=normalize(record);
    const morning=num(record.morningChange),evening=num(record.eveningChange);
    const addTotal=(record.cashAdds||[]).reduce((s,x)=>s+num(x.amount),0);
    const expenseTotal=(record.expenses||[]).reduce((s,x)=>s+num(x.amount),0);
    const sales=num(record.sales),transfer=num(record.transfer);
    const expected=morning+addTotal+sales-transfer-expenseTotal,diff=evening-expected;
    const status=Math.abs(diff)<0.005?'พอดี':diff>0?'เกิน':'ขาด';
    return {morning,evening,addTotal,expenseTotal,sales,transfer,cashSales:sales-transfer,expected,diff,status};
  }
  function resultTone(status){return status==='พอดี'?'ok':status==='เกิน'?'over':'short';}
  function resultText(c){return c.status==='พอดี'?'พอดี':`${c.status} ${money(Math.abs(c.diff))} บาท`;}
  function validate(record,soft=false){const c=calc(record);if(c.transfer>c.sales){if(!soft)toastCash('ยอดโอนต้องไม่มากกว่ายอดขายรวม');return false;}return true;}
  function icon(name){
    const p={cash:'<path d="M4 7h16v10H4z"/><path d="M8 11h.01M16 13h.01"/><circle cx="12" cy="12" r="2"/>',chart:'<path d="M4 19h16"/><path d="M7 16v-5M12 16V7M17 16v-9"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',branch:'<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>'};
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${p[name]||p.cash}</svg>`;
  }
  function ensureModal(id){let m=document.getElementById(id);if(!m){m=document.createElement('div');m.id=id;m.className='modal';document.body.appendChild(m);}return m;}
  function actionDisabled(){return cashSaving?'disabled':'';}
  function connectionNotice(){
    if(cashConnectionState==='connected'&&Date.now()>cashNoticeVisibleUntil)return '';
    if(cashConnectionState==='connected')return '<div class="cashSync ok">เชื่อมต่อข้อมูลสำเร็จ</div>';
    if(cashConnectionState==='file'&&isFileMode())return '<div class="cashSync wait">กำลังเปิดเวอร์ชันทดสอบในเครื่อง ควรทดสอบ Firebase ผ่าน localhost หรือ URL ที่ Deploy แล้ว</div>';
    if(cashConnectionState==='file')return '';
    if(cashConnectionState==='offline-cache')return '<div class="cashSync wait">กำลังใช้ข้อมูลที่บันทึกไว้ในเครื่อง รอซิงค์เมื่อออนไลน์ <button type="button" onclick="retryCashConnection()">ลองเชื่อมต่ออีกครั้ง</button></div>';
    if(cashConnectionState==='reconnecting')return '<div class="cashSync wait">กำลังเชื่อมต่ออีกครั้ง...</div>';
    if(cashConnectionState==='error')return `<div class="cashSync error">เชื่อมต่อข้อมูลตรวจสอบเงินไม่สำเร็จ <button type="button" onclick="retryCashConnection()">ลองเชื่อมต่ออีกครั้ง</button></div>`;
    if(cashConnectionState==='unavailable')return '<div class="cashSync wait">ยังไม่ได้เชื่อมต่อ Firebase <button type="button" onclick="retryCashConnection()">ลองเชื่อมต่ออีกครั้ง</button></div>';
    return '<div class="cashSync wait">กำลังเชื่อมต่อข้อมูล...</div>';
  }
  function cleanNumericInput(el,integerOnly=false){const pos=el.selectionStart;let v=String(el.value||'').replace(/[^\d.]/g,'');if(integerOnly)v=v.replace(/\..*/,'');const parts=v.split('.');if(parts.length>2)v=parts.shift()+'.'+parts.join('');el.value=v;if(pos!=null)try{el.setSelectionRange(Math.min(pos,el.value.length),Math.min(pos,el.value.length));}catch(e){}}
  function formatField(el,integerOnly=false){const v=integerOnly?Math.floor(num(el.value)):num(el.value);el.value=v?(integerOnly?intText(v):v.toLocaleString('th-TH',{maximumFractionDigits:2})):'';}
  function collectBranchForm(){
    const date=document.getElementById('cashDateInputV749')?.value||today();
    const base=cashEditingRecord&&cashEditingRecord.date===date&&Number(cashEditingRecord.branch)===Number(cashBranch)?cashEditingRecord:getRecord(cashBranch,date);
    return normalize({...base,type:'record',branch:cashBranch,date,
      morningChange:document.getElementById('cashMorningTotalV749')?.value||'',
      eveningChange:document.getElementById('cashEveningTotalV749')?.value||'',
      eveningBank1000Count:document.getElementById('cashEveningBank1000V749')?.value||0,
      sales:document.getElementById('cashSalesV749')?.value||'',
      transfer:document.getElementById('cashTransferV749')?.value||'',
      note:(document.getElementById('cashNoteV749')?.value||'').trim(),updatedAt:Date.now(),savedBy:userName()});
  }
  function cashFormulaHtml(record){
    const c=calc(record),tone=resultTone(c.status);
    return `<div class="cashFormula"><div><span>ยอดขายรวม</span><b>${money(c.sales)} บาท</b></div><div><span>ยอดโอน</span><b>${money(c.transfer)} บาท</b></div><div><span>เงินทอนตอนเช้า</span><b>${money(c.morning)} บาท</b></div><div><span>เพิ่มเงินทอน</span><b>${money(c.addTotal)} บาท</b></div><div><span>ค่าใช้จ่าย</span><b>${money(c.expenseTotal)} บาท</b></div><hr><div><span>เงินสดที่ควรมี</span><b>${money(c.expected)} บาท</b></div><div><span>เงินทอนตอนเย็น</span><b>${money(c.evening)} บาท</b></div><div><span>แบงค์ 1,000 ตอนเย็น</span><b>${intText(record.eveningBank1000Count)} ใบ</b></div><hr><div class="result ${tone}"><span>ผลลัพธ์</span><b>${resultText(c)}</b></div><small>จำนวนแบงค์ 1,000 ตอนเย็นเป็นข้อมูลประกอบในรายงานเท่านั้น ไม่ถูกนำไปบวกซ้ำ</small></div>`;
  }
  function exportCardHtml(record){
    record=normalize(record);const c=calc(record),tone=resultTone(c.status),mobile=window.innerWidth<720?'mobile':'desktop';
    const row=(label,value,cls='')=>`<div class="cashPaperRow ${cls}"><span>${label}</span><b>${value}</b></div>`;
    const addRows=record.cashAdds.length?record.cashAdds.map(x=>`<div class="cashPaperLine"><span>${esc(x.time||'-')} ${esc(x.detail||'เติมเงินทอน')}</span><b>${money(x.amount)} บาท</b></div>`).join(''):'<div class="cashPaperLine mutedLine"><span>เพิ่มเงินทอน: ไม่มี</span><b></b></div>';
    const expenseRows=record.expenses.length?record.expenses.map(x=>`<div class="cashPaperLine expense"><span>${esc(x.time||'-')} ${esc(x.name||'-')}${x.note?` • ${esc(x.note)}`:''}</span><b>${money(x.amount)} บาท</b></div>`).join(''):'<div class="cashPaperLine mutedLine"><span>ค่าใช้จ่าย: ไม่มี</span><b></b></div>';
    return `<div class="cashExportCard cashPaper ${mobile}" id="cashExportCard"><header><h2>${esc(branches[record.branch]?.name||'โชคอนันต์')}</h2><p>วันที่ ${dateText(record.date)} • ผู้บันทึก ${esc(record.savedBy||userName())} • ${timeNow(record.updatedAt||Date.now())}</p></header><section class="cashPaperTable">${row('ยอดขายรวม',`${money(c.sales)} บาท`,'sales')}${row('ยอดโอน',`${money(c.transfer)} บาท`,'transfer')}${row('ยอดขายเงินสด',`${money(c.cashSales)} บาท`)}${row('เงินทอนตอนเช้า',`${money(c.morning)} บาท`)}${row('เพิ่มเงินทอนรวม',`${money(c.addTotal)} บาท`)}${row('ค่าใช้จ่ายรวม',`${money(c.expenseTotal)} บาท`,'expense')}${row('เงินสดที่ควรมี',`${money(c.expected)} บาท`,'expected')}${row('เงินทอนตอนเย็น',`${money(c.evening)} บาท`)}${row('แบงค์ 1,000 ตอนเย็น',`${intText(record.eveningBank1000Count)} ใบ`)}</section><section class="cashPaperResult ${tone}"><span>ผลการตรวจสอบ</span><b>${resultText(c)}</b></section><section class="cashPaperDetails"><h3>เพิ่มเงินทอน</h3>${addRows}<h3>ค่าใช้จ่าย</h3>${expenseRows}</section><footer><div>หมายเหตุ: ${esc(record.note||'-')}</div><div>ผู้บันทึก: ${esc(record.savedBy||userName())}</div><div>บันทึกเวลา: ${timeNow(record.updatedAt||Date.now())}</div></footer></div>`;
  }
  function summaryPanelHtml(record){return `<div id="cashResultBox">${cashFormulaHtml(record)}<div class="cashExportPreview">${exportCardHtml(record)}</div></div>`;}
  function dayListsHtml(record){
    const c=calc(record);
    const addRows=record.cashAdds.length?record.cashAdds.map((x,i)=>`<div class="cashDayItem cashAddItem"><div class="cashDayMain"><span class="cashDayTime">${esc(x.time||'-')}</span><b class="cashAmountIn">เติมเงินทอน ${money(x.amount)} บาท</b><small>${esc(x.detail||'-')} • ${esc(x.by||'-')}</small></div><button class="cashMoreBtn" onclick="openCashAddMenu(${i})">⋮</button></div>`).join(''):'<div class="empty compact">ยังไม่มีรายการเพิ่มเงินทอน</div>';
    const expenseRows=record.expenses.length?record.expenses.map((x,i)=>`<div class="cashDayItem cashExpenseItem"><div class="cashDayMain"><span class="cashDayTime">${esc(x.time||'-')}</span><b>${esc(x.name)}</b><strong class="cashAmountOut">${money(x.amount)} บาท</strong><small>${esc(x.note||'ไม่มีหมายเหตุ')} • ${esc(x.by||'-')}</small></div><button class="cashMoreBtn expense" onclick="openCashExpenseMenu(${i})">⋮</button></div>`).join(''):'<div class="empty compact">ยังไม่มีรายการค่าใช้จ่าย</div>';
    return `<div class="cashDayCards"><section class="cashDayCard add"><header><div><h4>เงินทอนที่เพิ่มระหว่างวัน</h4><span>${record.cashAdds.length} รายการ</span></div><b>${money(c.addTotal)} บาท</b></header><div class="cashDayList">${addRows}</div></section><section class="cashDayCard expense"><header><div><h4>ค่าใช้จ่ายระหว่างวัน</h4><span>${record.expenses.length} รายการ</span></div><b>${money(c.expenseTotal)} บาท</b></header><div class="cashDayList">${expenseRows}</div></section></div>`;
  }
  function textReport(record){
    record=normalize(record);const c=calc(record);
    const lines=[branches[record.branch]?.name||'โชคอนันต์',`วันที่ ${dateText(record.date)}`,'',`ยอดขายรวม: ${money(c.sales)} บาท`,`ยอดโอน: ${money(c.transfer)} บาท`,`ยอดขายเงินสด: ${money(c.cashSales)} บาท`,`เงินทอนตอนเช้า: ${money(c.morning)} บาท`,`เพิ่มเงินทอนรวม: ${money(c.addTotal)} บาท`,`ค่าใช้จ่ายรวม: ${money(c.expenseTotal)} บาท`,`เงินสดที่ควรมี: ${money(c.expected)} บาท`,`เงินทอนตอนเย็น: ${money(c.evening)} บาท`,`แบงค์ 1,000 ตอนเย็น: ${intText(record.eveningBank1000Count)} ใบ`,'',`ผลลัพธ์: ${resultText(c)}`,'','เพิ่มเงินทอน:'];
    if(record.cashAdds.length)record.cashAdds.forEach(x=>lines.push(`- ${x.time||'-'} ${x.detail||'เติมเงินทอน'} ${money(x.amount)} บาท`));else lines.push('- ไม่มี');
    lines.push('','ค่าใช้จ่าย:');
    if(record.expenses.length)record.expenses.forEach(x=>lines.push(`- ${x.time||'-'} ${x.name||'-'} ${money(x.amount)} บาท${x.note?` — ${x.note}`:''}`));else lines.push('- ไม่มี');
    lines.push('',`หมายเหตุ: ${record.note||'-'}`,`ผู้บันทึก: ${record.savedBy||userName()}`,`เวลา: ${timeNow(record.updatedAt||Date.now())}`);
    return lines.join('\n');
  }
  function ensurePages(){
    const phone=document.querySelector('.phone')||document.body;
    const ensure=(id,html)=>{let p=document.getElementById(id);if(!p){p=document.createElement('section');p.id=id;p.className='page';phone.appendChild(p);}if(p.dataset.cashV749!=='1'){p.innerHTML=html;p.dataset.cashV749='1';}return p;};
    ensure('cashMenuPage',`<div class="pageHeader"><button class="back" onclick="go('home')">‹</button><div><h2 style="margin:0">ตรวจสอบเงิน</h2><div class="smallTitle">บันทึกและตรวจสอบเงินประจำวัน</div></div></div><div class="cashMenuGridV749"><button class="cashMenuCardV749 blue" onclick="openCashBranch(1)"><span>${icon('branch')}</span><b>โชคอนันต์ สาขา 1</b></button><button class="cashMenuCardV749 green" onclick="openCashBranch(2)"><span>${icon('branch')}</span><b>โชคอนันต์ สาขา 2</b></button><button class="cashMenuCardV749 purple" onclick="go('cashInfoPage')"><span>${icon('info')}</span><b>ข้อมูล</b></button><button class="cashMenuCardV749 orange" onclick="go('cashSalesSummaryPage')"><span>${icon('chart')}</span><b>ยอดขายรวม</b></button></div>`);
    ensure('cashBranchPage',`<div class="pageHeader cashBranchHeader"><button class="back" onclick="go('cashMenuPage')">‹</button><div><h2 id="cashBranchTitle" style="margin:0">ตรวจสอบเงิน</h2><div id="cashBranchSub" class="smallTitle">กรอกยอดประจำวัน</div></div></div><div id="cashBranchBox"></div>`);
    ensure('cashInfoPage',`<div class="pageHeader"><button class="back" onclick="go('cashMenuPage')">‹</button><div><h2 style="margin:0">ข้อมูล</h2><div class="smallTitle">ประวัติ รายจ่าย และสรุปขาด/เกิน</div></div></div><div class="cashModeTabs"><button onclick="renderCashInfoSection('history')">ประวัติ</button><button onclick="renderCashInfoSection('monthlyDiff')">ขาด/เกิน รายเดือน</button><button onclick="renderCashInfoSection('expenses')">รายจ่าย</button></div><div id="cashInfoBox"></div>`);
    ensure('cashSalesSummaryPage',`<div class="pageHeader"><button class="back" onclick="go('cashMenuPage')">‹</button><div><h2 style="margin:0">ยอดขายรวม</h2><div class="smallTitle">รายวัน รายเดือน รายปี แยกสาขาและรวม</div></div></div><div class="cashModeTabs cashBigTabs"><button onclick="renderCashSalesSection('daily')">ยอดขายรวมแยกสองสาขารายวัน</button><button onclick="renderCashSalesSection('combined')">ยอดขายรวมสองสาขารายวัน</button><button onclick="renderCashSalesSection('transfer')">ยอดโอน</button><button onclick="renderCashSalesSection('monthly')">ยอดขายรวมรายเดือน</button><button onclick="renderCashSalesSection('yearly')">ยอดขายรวมรายปี</button></div><div id="cashSalesSummaryBox"></div>`);
  }
  function ensureHomeButton(){
    document.getElementById('cashCheckHomeButton')?.remove();
    document.querySelectorAll('.cashTileV748,.cashHomeCardV749').forEach(x=>x.remove());
    const grid=document.getElementById('mainGrid');if(!grid)return;
    const card=document.createElement('button');card.type='button';card.className='cashHomeCardV749';card.onclick=()=>go('cashMenuPage');
    card.innerHTML=`<span class="cashHomeIconV749">${icon('cash')}</span><span><b>ตรวจสอบเงิน</b><small>บันทึกและตรวจสอบเงินประจำวัน</small></span>`;
    grid.parentNode.insertBefore(card,grid.nextSibling);
  }
  function renderBranch(record=getRecord(cashBranch,today())){
    cashSuppressDirty=true;record=normalize(record);cashEditingRecord=record;cashBranch=Number(record.branch)||1;
    const c=calc(record),branch=branches[cashBranch],box=document.getElementById('cashBranchBox');if(!box)return;
    document.getElementById('cashBranchTitle').textContent=branch.name;
    document.getElementById('cashBranchSub').textContent=`${dateText(record.date)} • ${c.status}`;
    box.innerHTML=`<div class="cashBranchPanelV749 ${branch.theme}">${connectionNotice()}<section class="cashInputCard cashMorningCard"><h3>ข้อมูลตอนเช้า</h3><label>วันที่</label><input class="input" id="cashDateInputV749" type="date" value="${esc(record.date)}" onchange="loadCashDate()"><label>เงินทอนตอนเช้า</label><input class="input cashMoneyInput" id="cashMorningTotalV749" inputmode="decimal" value="${esc(record.morningChange||'')}" placeholder="0"><div class="cashQuickActions"><button type="button" class="btn primary cashActionAdd" onclick="openCashAddPopup()">+ เพิ่มเงินทอน</button><button type="button" class="btn cashActionExpense" onclick="openCashExpensePopup()">+ เพิ่มค่าใช้จ่าย</button></div>${dayListsHtml(record)}</section><section class="cashInputCard cashClosingCard"><h3>ข้อมูลตอนปิดร้าน</h3><p>ยอดขายรวมคือยอดรวมทั้งหมดของวัน ยอดโอนคือส่วนที่ลูกค้าจ่ายโอนและต้องหักออกจากเงินสด</p><label>ยอดขายรวม</label><input class="input cashMoneyInput" id="cashSalesV749" inputmode="decimal" value="${esc(record.sales||'')}" placeholder="0"><label>ยอดโอน</label><input class="input cashMoneyInput" id="cashTransferV749" inputmode="decimal" value="${esc(record.transfer||'')}" placeholder="0"><label>เงินทอนตอนเย็น</label><input class="input cashMoneyInput" id="cashEveningTotalV749" inputmode="decimal" value="${esc(record.eveningChange||'')}" placeholder="0"><label>จำนวนแบงค์ 1,000 ตอนเย็น (จำนวนใบ)</label><input class="input cashIntegerInput" id="cashEveningBank1000V749" inputmode="numeric" value="${esc(record.eveningBank1000Count||0)}" placeholder="0"><small>กรอกเป็นจำนวนใบ เช่น 5 = 5 ใบ ไม่ใช่ 5,000 บาท ระบบจะไม่คำนวณยอดเงินจากช่องนี้</small><div class="cashValidation" id="cashValidationV749"></div></section><label>หมายเหตุ</label><textarea id="cashNoteV749" placeholder="ไม่บังคับ">${esc(record.note||'')}</textarea>${summaryPanelHtml(record)}<div class="cashActionsV749"><button class="btn gray" onclick="go('cashMenuPage')">ย้อนกลับ</button><button class="btn gray" onclick="editCashDraft()">แก้ไข</button><button class="btn primary" ${actionDisabled()} onclick="saveCashTemporary()">บันทึกชั่วคราว</button><button class="btn ok" ${actionDisabled()} onclick="saveCashRecord()">บันทึกข้อมูล</button><button class="btn gray" onclick="copyCashText()">ส่งออกข้อความ</button><button class="btn ok" onclick="exportCashImage()">ส่งออกภาพ</button><button class="btn danger" ${actionDisabled()} onclick="startNewCashDay()">เริ่มใหม่</button></div></div>`;
    bindCashInputs();cashDirty=false;cashSuppressDirty=false;
  }
  function refreshSummary(){
    const r=collectBranchForm(),box=document.getElementById('cashResultBox'),warn=document.getElementById('cashValidationV749');
    if(box)box.outerHTML=summaryPanelHtml(r);
    if(warn)warn.textContent=num(r.transfer)>num(r.sales)?'ยอดโอนต้องไม่มากกว่ายอดขายรวม':'';
  }
  function bindCashInputs(){
    document.querySelectorAll('#cashBranchBox input,#cashBranchBox textarea').forEach(el=>{
      el.addEventListener('input',()=>{if(el.classList.contains('cashMoneyInput'))cleanNumericInput(el,false);if(el.classList.contains('cashIntegerInput'))cleanNumericInput(el,true);if(!cashSuppressDirty)cashDirty=true;refreshSummary();});
      el.addEventListener('blur',()=>{if(el.classList.contains('cashMoneyInput'))formatField(el,false);if(el.classList.contains('cashIntegerInput'))formatField(el,true);refreshSummary();});
    });
  }

  window.openCashBranch=function(branch){cashBranch=Number(branch)||1;go('cashBranchPage');renderBranch(getRecord(cashBranch,today()));};
  window.retryCashConnection=async function(){
    if(cashRetrying)return;
    cashRetrying=true;
    cashConnectionStartedAt=Date.now();
    setCashConnection('connecting');
    clearCashToast();
    debugCash('manual-retry-start');
    await startCashSync(true);
    if(cashConnectionState!=='connected'&&cashLastError){
      console.warn('[CashReconciliation] retry failed',cashLastError.code||cashLastError.name||'unknown',cashLastError.message||cashLastError);
    }
    cashRetrying=false;
    refreshCashActive();
  };
  window.loadCashDate=function(){const date=document.getElementById('cashDateInputV749')?.value||today();if(cashDirty&&!confirm('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากวันนี้ใช่หรือไม่?')){renderBranch(cashEditingRecord);return;}renderBranch(getRecord(cashBranch,date));};
  window.openCashAddPopup=function(index=-1){
    const r=collectBranchForm();editingAddIndex=Number(index);const x=editingAddIndex>=0?r.cashAdds[editingAddIndex]:{};
    const m=ensureModal('cashAddModalV749');
    m.innerHTML=`<div class="sheet"><h2>${editingAddIndex>=0?'แก้ไขเงินทอน':'เพิ่มเงินทอน'}</h2><p class="muted">เวลา ${esc(x?.time||timeNow())} • ผู้ทำรายการ ${esc(x?.by||userName())}</p><label>จำนวนเงินที่เพิ่ม</label><input class="input cashMoneyInput" id="cashAddAmountV749" inputmode="decimal" value="${esc(x?.amount||'')}" placeholder="0"><label>รายละเอียดหรือหมายเหตุ</label><input class="input" id="cashAddDetailV749" value="${esc(x?.detail||'')}" placeholder="เช่น เติมแบงค์ 20"><button class="btn primary" style="width:100%;margin-top:12px" onclick="saveCashAdd()">บันทึก</button><button class="btn gray" style="width:100%;margin-top:8px" onclick="closeModal('cashAddModalV749')">ยกเลิก</button></div>`;
    m.classList.add('show');
  };
  window.saveCashAdd=function(){
    const amount=num(document.getElementById('cashAddAmountV749')?.value),detail=(document.getElementById('cashAddDetailV749')?.value||'').trim();
    if(!amount)return toastCash('กรุณากรอกจำนวนเงินที่เพิ่ม');
    const r=collectBranchForm(),old=editingAddIndex>=0?r.cashAdds[editingAddIndex]:null,row={id:old?.id||`add_${Date.now()}`,amount,detail:detail||'เติมเงินทอน',time:old?.time||timeNow(),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now(),by:old?.by||userName()};
    if(editingAddIndex>=0)r.cashAdds[editingAddIndex]=row;else r.cashAdds.push(row);
    cashDirty=true;closeModal('cashAddModalV749');renderBranch(r);
  };
  window.openCashAddMenu=function(index){
    const m=ensureModal('cashAddMenuV749');
    m.innerHTML=`<div class="sheet"><h2>จัดการเงินทอนที่เพิ่ม</h2><button class="btn primary" style="width:100%;margin-top:8px" onclick="closeModal('cashAddMenuV749');openCashAddPopup(${index})">แก้ไข</button><button class="btn danger" style="width:100%;margin-top:8px" onclick="removeCashAdd(${index})">ลบ</button><button class="btn gray" style="width:100%;margin-top:8px" onclick="closeModal('cashAddMenuV749')">ยกเลิก</button></div>`;
    m.classList.add('show');
  };
  window.removeCashAdd=function(index){if(!confirm('ลบรายการเพิ่มเงินทอนนี้ใช่ไหม?'))return;const r=collectBranchForm();r.cashAdds=r.cashAdds.filter((_,i)=>i!==index);cashDirty=true;closeModal('cashAddMenuV749');renderBranch(r);};
  window.openCashExpensePopup=function(index=-1){
    const r=collectBranchForm();editingExpenseIndex=Number(index);const x=editingExpenseIndex>=0?r.expenses[editingExpenseIndex]:{};
    const m=ensureModal('cashExpenseModalV749');
    m.innerHTML=`<div class="sheet"><h2>${editingExpenseIndex>=0?'แก้ไขค่าใช้จ่าย':'เพิ่มค่าใช้จ่าย'}</h2><p class="muted">เวลา ${esc(x?.time||timeNow())} • ผู้ทำรายการ ${esc(x?.by||userName())}</p><label>ชื่อรายการ</label><input class="input" id="cashExpenseNameV749" value="${esc(x?.name||'')}" placeholder="เช่น ซื้อไม้กวาด"><label>จำนวนเงิน</label><input class="input cashMoneyInput" id="cashExpenseAmountV749" inputmode="decimal" value="${esc(x?.amount||'')}" placeholder="0"><label>หมายเหตุ <span class="supplierUnknown">(ไม่บังคับ)</span></label><textarea id="cashExpenseNoteV749" placeholder="ไม่บังคับ">${esc(x?.note||'')}</textarea><button class="btn primary" style="width:100%;margin-top:12px" onclick="saveCashExpense()">บันทึก</button><button class="btn gray" style="width:100%;margin-top:8px" onclick="closeModal('cashExpenseModalV749')">ยกเลิก</button></div>`;
    m.classList.add('show');
  };
  window.saveCashExpense=function(){
    const name=(document.getElementById('cashExpenseNameV749')?.value||'').trim(),amount=num(document.getElementById('cashExpenseAmountV749')?.value),note=(document.getElementById('cashExpenseNoteV749')?.value||'').trim();
    if(!name||!amount)return toastCash('กรุณากรอกชื่อรายการและจำนวนเงิน');
    const r=collectBranchForm(),old=editingExpenseIndex>=0?r.expenses[editingExpenseIndex]:null,row={id:old?.id||`exp_${Date.now()}`,name,amount,note,time:old?.time||timeNow(),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now(),by:old?.by||userName()};
    if(editingExpenseIndex>=0)r.expenses[editingExpenseIndex]=row;else r.expenses.push(row);
    cashDirty=true;closeModal('cashExpenseModalV749');renderBranch(r);
  };
  window.openCashExpenseMenu=function(index){
    const m=ensureModal('cashExpenseMenuV749');
    m.innerHTML=`<div class="sheet"><h2>จัดการค่าใช้จ่าย</h2><button class="btn primary" style="width:100%;margin-top:8px" onclick="closeModal('cashExpenseMenuV749');openCashExpensePopup(${index})">แก้ไข</button><button class="btn danger" style="width:100%;margin-top:8px" onclick="deleteCashExpense(${index})">ลบ</button><button class="btn gray" style="width:100%;margin-top:8px" onclick="closeModal('cashExpenseMenuV749')">ยกเลิก</button></div>`;
    m.classList.add('show');
  };
  window.deleteCashExpense=function(index){if(!confirm('ลบค่าใช้จ่ายรายการนี้ใช่ไหม?'))return;const r=collectBranchForm();r.expenses=r.expenses.filter((_,i)=>i!==index);cashDirty=true;closeModal('cashExpenseMenuV749');renderBranch(r);};
  window.editCashDraft=function(){document.getElementById('cashSalesV749')?.focus();toastCash('แก้ไขข้อมูลได้แล้ว');};
  window.saveCashTemporary=async function(){if(cashSaving)return;const r=collectBranchForm();if(!validate(r))return;if(!ready())return toastCash('กำลังเชื่อมต่อข้อมูล...');cashSaving=true;try{setDraftLocal(r);await cloudSet(r,'draft');cashDirty=false;toastCash('บันทึกชั่วคราวแล้ว');renderBranch(r);}catch(e){console.warn(e);toastCash('บันทึกไม่สำเร็จ กรุณาลองใหม่');}finally{cashSaving=false;refreshCashActive();}};
  window.saveCashRecord=async function(){if(cashSaving)return null;const r=collectBranchForm();if(!validate(r))return null;if(!ready())return toastCash('กำลังเชื่อมต่อข้อมูล...');cashSaving=true;try{const saved=upsertLocal({...r,type:'record',savedAt:Date.now(),savedBy:userName()});await cloudSet(saved,'record');clearDraftLocal(saved.branch,saved.date);await cloudDelete('draft',saved.branch,saved.date).catch(()=>{});cashDirty=false;toastCash('บันทึกข้อมูลแล้ว');renderBranch(saved);return saved;}catch(e){console.warn(e);toastCash('บันทึกไม่สำเร็จ กรุณาลองใหม่');return null;}finally{cashSaving=false;refreshCashActive();}};
  window.startNewCashDay=function(){const r=collectBranchForm();if(!validate(r))return;const m=ensureModal('cashStartNewModalV749');m.innerHTML=`<div class="sheet"><h2>เริ่มใหม่</h2><p class="muted">ต้องการบันทึกข้อมูลวันนี้และเริ่มข้อมูลใหม่ใช่หรือไม่?</p><button class="btn danger" style="width:100%;margin-top:12px" onclick="confirmStartNewCashDay()">ยืนยันเริ่มใหม่</button><button class="btn gray" style="width:100%;margin-top:8px" onclick="closeModal('cashStartNewModalV749')">ยกเลิก</button></div>`;m.classList.add('show');};
  window.confirmStartNewCashDay=async function(){const saved=await saveCashRecord();if(!saved)return;clearDraftLocal(saved.branch,saved.date);await cloudDelete('draft',saved.branch,saved.date).catch(()=>{});cashEditingRecord=emptyRecord(saved.branch,today());cashDirty=false;closeModal('cashStartNewModalV749');renderBranch(cashEditingRecord);toastCash('พร้อมเริ่มวันใหม่แล้ว');};
  window.copyCashText=async function(){const r=collectBranchForm();if(!validate(r))return;const text=textReport(r);try{if(navigator.clipboard&&(window.isSecureContext||location.protocol==='https:'))await navigator.clipboard.writeText(text);else{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.focus();ta.select();document.execCommand('copy');ta.remove();}toastCash('คัดลอกข้อความแล้ว');}catch(e){alert(text);}};
  window.exportCashImage=async function(){const r=collectBranchForm();if(!validate(r))return;refreshSummary();const el=document.getElementById('cashExportCard');if(!el||typeof html2canvas!=='function')return toastCash('ส่งออกภาพไม่ได้');const canvas=await html2canvas(el,{backgroundColor:'#ffffff',scale:Math.max(2,window.devicePixelRatio||1),useCORS:true,logging:false});canvas.toBlob(async blob=>{if(!blob)return;const file=new File([blob],`cash-${r.branch}-${r.date}.png`,{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'ตรวจสอบเงิน',text:`${branches[r.branch].name} ${dateText(r.date)}`});return;}catch(e){}}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),800);toastCash('สร้างภาพแล้ว');},'image/png');};

  function groupBy(list,fn){return list.reduce((map,row)=>{const k=fn(row);(map[k]=map[k]||[]).push(row);return map;},{});}
  function total(list){return list.reduce((a,r)=>{const c=calc(r);a.sales+=c.sales;a.transfer+=c.transfer;a.expenses+=c.expenseTotal;a.expected+=c.expected;a.evening+=c.evening;a.over+=c.diff>0?c.diff:0;a.short+=c.diff<0?Math.abs(c.diff):0;return a;},{sales:0,transfer:0,expenses:0,expected:0,evening:0,over:0,short:0});}
  function statRows(list){const b1=total(list.filter(r=>r.branch===1)),b2=total(list.filter(r=>r.branch===2)),all=total(list),net=all.over-all.short,tone=net===0?'ok':net>0?'over':'short';return `<div class="summaryPageGrid"><div class="stat"><div class="label">ยอดขายรวมสาขา 1</div><div class="metric"><span>${money(b1.sales)}</span></div><div class="muted">โอน ${money(b1.transfer)} • รายจ่าย ${money(b1.expenses)}</div></div><div class="stat"><div class="label">ยอดขายรวมสาขา 2</div><div class="metric"><span>${money(b2.sales)}</span></div><div class="muted">โอน ${money(b2.transfer)} • รายจ่าย ${money(b2.expenses)}</div></div><div class="stat"><div class="label">ยอดรวมสองสาขา</div><div class="metric"><span>${money(all.sales)}</span></div><div class="muted">โอนรวม ${money(all.transfer)}</div></div><div class="stat ${tone}"><div class="label">ผลสุทธิขาด/เกิน</div><div class="metric"><span>${net<0?'-':''}${money(Math.abs(net))}</span></div><div class="muted">เกิน ${money(all.over)} • ขาด ${money(all.short)}</div></div></div>`;}
  function renderGroupedSales(grouped){return Object.keys(grouped).sort().reverse().map(k=>`<div class="card"><h3 style="margin:0 0 8px">${esc(k)}</h3>${statRows(grouped[k])}</div>`).join('')||'<div class="empty">ยังไม่มีข้อมูล</div>';}
  window.renderCashSalesSection=function(mode='daily'){cashSalesMode=mode;const box=document.getElementById('cashSalesSummaryBox');if(!box)return;const all=rows();document.querySelectorAll('#cashSalesSummaryPage .cashModeTabs button').forEach(b=>b.classList.toggle('active',(b.getAttribute('onclick')||'').includes(`'${mode}'`)));if(mode==='monthly'){const m=document.getElementById('cashMonthFilter')?.value||today().slice(0,7);box.innerHTML=`<input class="input" type="month" id="cashMonthFilter" value="${m}" onchange="renderCashSalesSection('monthly')">`+renderGroupedSales(groupBy(all.filter(r=>monthKey(r.date)===m),r=>monthKey(r.date)));}else if(mode==='yearly'){const y=document.getElementById('cashYearFilter')?.value||today().slice(0,4);box.innerHTML=`<input class="input" type="number" id="cashYearFilter" value="${y}" onchange="renderCashSalesSection('yearly')">`+renderGroupedSales(groupBy(all.filter(r=>yearKey(r.date)===y),r=>yearKey(r.date)));}else box.innerHTML=renderGroupedSales(groupBy(all,r=>r.date));};
  window.renderCashSalesSummary=()=>renderCashSalesSection(cashSalesMode);
  function historyHtml(){return rows().slice(0,200).map(r=>{const c=calc(r);return `<div class="cashHistoryRow"><button onclick="openSavedCash(${r.branch},'${esc(r.date)}')"><b>${dateText(r.date)} • ${esc(branches[r.branch]?.name)}</b><span>ยอดขายรวม ${money(c.sales)} • โอน ${money(c.transfer)} • ค่าใช้จ่าย ${money(c.expenseTotal)} • เงินสดควรมี ${money(c.expected)} • เงินเย็น ${money(c.evening)} • ${resultText(c)}</span></button><button class="cashMoreBtn" onclick="openCashHistoryMenu(${r.branch},'${esc(r.date)}')">⋮</button></div>`;}).join('')||'<div class="empty">ยังไม่มีประวัติ</div>';}
  function monthlyDiffHtml(){const grouped=groupBy(rows(),r=>monthKey(r.date));return Object.keys(grouped).sort().reverse().map(k=>{const t=total(grouped[k]),net=t.over-t.short,tone=net===0?'ok':net>0?'over':'short';return `<div class="card"><h3 style="margin:0 0 8px">${esc(k)}</h3><div class="cashFormula"><div><span>เงินเกินรวม</span><b>${money(t.over)} บาท</b></div><div><span>เงินขาดรวม</span><b>${money(t.short)} บาท</b></div><div class="result ${tone}"><span>ผลสุทธิ</span><b>${net<0?'-':''}${money(Math.abs(net))} บาท</b></div></div></div>`;}).join('')||'<div class="empty">ยังไม่มีข้อมูล</div>';}
  function expensesHtml(){const all=rows(),month=today().slice(0,7),daily=all.flatMap(r=>(r.expenses||[]).map(x=>({...x,branch:r.branch,date:r.date}))).sort((a,b)=>String(b.date).localeCompare(String(a.date)));const monthRows=all.filter(r=>monthKey(r.date)===month);const grouped={};monthRows.forEach(r=>(r.expenses||[]).forEach(x=>{const k=cleanName(x.name).toLowerCase();grouped[k]=grouped[k]||{name:x.name,count:0,total:0,b1:0,b2:0};grouped[k].count++;grouped[k].total+=num(x.amount);grouped[k][r.branch===1?'b1':'b2']+=num(x.amount);}));return `<div class="sectionTitle">รายจ่ายรายวัน</div>${daily.length?daily.map(x=>`<div class="miniItem"><div><b>${dateText(x.date)} • ${esc(branches[x.branch]?.short)} • ${esc(x.name)}</b><div class="meta">${esc(x.time||'-')} • ${esc(x.by||'-')}</div></div><span>${money(x.amount)} บาท</span></div>`).join(''):'<div class="empty">ยังไม่มีรายจ่าย</div>'}<div class="sectionTitle">รายจ่ายรายเดือน ${esc(month)}</div>${Object.values(grouped).map(x=>`<div class="miniItem"><div><b>${esc(x.name)}</b><div class="meta">${x.count} ครั้ง • สาขา1 ${money(x.b1)} • สาขา2 ${money(x.b2)}</div></div><span>${money(x.total)} บาท</span></div>`).join('')||'<div class="empty">เดือนนี้ยังไม่มีรายจ่าย</div>'}`;}
  window.renderCashInfoSection=function(mode='history'){cashInfoMode=mode;const box=document.getElementById('cashInfoBox');if(!box)return;document.querySelectorAll('#cashInfoPage .cashModeTabs button').forEach(b=>b.classList.toggle('active',(b.getAttribute('onclick')||'').includes(`'${mode}'`)));box.innerHTML=mode==='history'?historyHtml():mode==='monthlyDiff'?monthlyDiffHtml():expensesHtml();};
  window.renderCashHistory=()=>renderCashInfoSection(cashInfoMode);
  window.openCashHistoryMenu=function(branch,date){const m=ensureModal('cashHistoryMenuV749');m.innerHTML=`<div class="sheet"><h2>${dateText(date)}</h2><button class="btn primary" style="width:100%;margin-top:8px" onclick="closeModal('cashHistoryMenuV749');openSavedCash(${branch},'${esc(date)}')">แก้ไข</button><button class="btn danger" style="width:100%;margin-top:8px" onclick="deleteCashHistory(${branch},'${esc(date)}')">ลบ</button><button class="btn gray" style="width:100%;margin-top:8px" onclick="closeModal('cashHistoryMenuV749')">ยกเลิก</button></div>`;m.classList.add('show');};
  window.deleteCashHistory=async function(branch,date){if(!confirm('ลบประวัติรายการนี้ใช่ไหม?'))return;setRows(rows().filter(r=>!(Number(r.branch)===Number(branch)&&r.date===date)));clearDraftLocal(branch,date);try{await cloudDelete('record',branch,date);await cloudDelete('draft',branch,date);}catch(e){toastCash('ลบในเครื่องแล้ว แต่ซิงค์ Firebase ไม่สำเร็จ');}closeModal('cashHistoryMenuV749');renderCashInfoSection(cashInfoMode);};
  window.openSavedCash=function(branch,date){cashBranch=Number(branch)||1;go('cashBranchPage');renderBranch(getRecord(cashBranch,date));};
  function refreshCashActive(){ensureHomeButton();if(document.getElementById('cashBranchPage')?.classList.contains('active'))renderBranch(collectBranchForm());if(document.getElementById('cashInfoPage')?.classList.contains('active'))renderCashInfoSection(cashInfoMode);if(document.getElementById('cashSalesSummaryPage')?.classList.contains('active'))renderCashSalesSection(cashSalesMode);}

  const oldGo=window.go||go;
  window.go=go=function(id){
    ensurePages();ensureHomeButton();
    if(cashDirty&&document.getElementById('cashBranchPage')?.classList.contains('active')&&id!=='cashBranchPage'&&!confirm('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้ใช่หรือไม่?'))return;
    if(id==='cashBranchPage'||id==='cashInfoPage'||id==='cashSalesSummaryPage')startCashSync();
    else clearCashToast();
    const r=oldGo.apply(this,arguments);
    if(id==='cashBranchPage')renderBranch(getRecord(cashBranch,today()));
    if(id==='cashInfoPage')renderCashInfoSection(cashInfoMode);
    if(id==='cashSalesSummaryPage')renderCashSalesSection(cashSalesMode);
    return r;
  };
  const oldRenderAll=window.renderAll||renderAll;
  window.renderAll=renderAll=function(){const r=oldRenderAll.apply(this,arguments);ensurePages();ensureHomeButton();return r;};
  window.addEventListener('beforeunload',e=>{if(cashDirty){e.preventDefault();e.returnValue='';}});
  window.addEventListener('online',()=>setTimeout(()=>{if(isCashPageActive())startCashSync(true);refreshCashActive();},600));
  window.addEventListener('offline',()=>{if(isCashPageActive()){setCashConnection('offline-cache');refreshCashActive();}});

  const style=document.createElement('style');
  style.textContent=`.cashHomeCardV749{width:100%;border:0;border-radius:22px;margin:14px 0 4px;padding:18px;display:flex;align-items:center;gap:14px;text-align:left;color:#fff;background:linear-gradient(135deg,#0f766e,#2563eb);box-shadow:0 14px 30px rgba(37,99,235,.24);font-family:inherit}.cashHomeCardV749 b{display:block;font-size:24px}.cashHomeCardV749 small{display:block;font-size:13px;font-weight:800;opacity:.92;margin-top:3px}.cashHomeIconV749{width:56px;height:56px;border-radius:18px;background:rgba(255,255,255,.18);display:grid;place-items:center;flex:0 0 56px}.cashHomeCardV749 svg,.cashMenuCardV749 svg{width:30px;height:30px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}.cashMenuGridV749{display:grid;grid-template-columns:1fr;gap:14px;margin:12px 0 90px}.cashMenuCardV749{border:0;border-radius:22px;min-height:112px;padding:18px;color:#fff;text-align:left;display:flex;align-items:center;gap:14px;font:inherit;box-shadow:0 12px 26px rgba(15,23,42,.13)}.cashMenuCardV749 span{width:54px;height:54px;border-radius:18px;background:rgba(255,255,255,.2);display:grid;place-items:center}.cashMenuCardV749 b{font-size:21px}.cashMenuCardV749.blue{background:linear-gradient(135deg,#0967f2,#38bdf8)}.cashMenuCardV749.green{background:linear-gradient(135deg,#0f9f6e,#7ddf95)}.cashMenuCardV749.purple{background:linear-gradient(135deg,#7c3aed,#c084fc)}.cashMenuCardV749.orange{background:linear-gradient(135deg,#f97316,#facc15);color:#382100}.cashBranchPanelV749{padding-bottom:92px}.cashBranchPanelV749.blue{--cash:#0967f2}.cashBranchPanelV749.green{--cash:#0f9f6e}.cashInputCard,.cashFormula,.cashExportCard{background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px;margin:12px 0}.cashInputCard h3{margin:0 0 8px;color:var(--cash);font-size:18px}.cashInputCard p,.cashInputCard small{color:#64748b;font-weight:800}.cashQuickActions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}.cashQuickActions .btn{min-height:54px;width:100%;font-weight:950}.cashActionAdd{background:linear-gradient(135deg,#0967f2,#38bdf8)!important}.cashActionExpense{background:linear-gradient(135deg,#f97316,#fb7185)!important;color:#fff!important}.cashWideBtn{width:100%;min-height:52px;margin:10px 0}.cashWideBtn.expense{background:#7c3aed}.cashDayCards{display:grid;grid-template-columns:1fr;gap:12px;margin:12px 0}.cashDayCard{border-radius:18px;padding:12px;border:1px solid #dbeafe;background:#eff6ff}.cashDayCard.expense{border-color:#fed7aa;background:#fff7ed}.cashDayCard header{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px}.cashDayCard h4{margin:0;font-size:16px;color:#0b3b80}.cashDayCard.expense h4{color:#9a3412}.cashDayCard header span{display:block;color:#64748b;font-size:12px;font-weight:900;margin-top:3px}.cashDayCard header>b{white-space:nowrap;color:#0967f2;font-size:17px}.cashDayCard.expense header>b{color:#c2410c}.cashDayList{display:grid;gap:8px}.cashDayItem{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;background:#fff;border-radius:14px;border:1px solid rgba(37,99,235,.18);padding:10px}.cashExpenseItem{border-color:rgba(249,115,22,.24)}.cashDayMain{min-width:0}.cashDayMain b,.cashDayMain strong,.cashDayMain small,.cashDayTime{display:block}.cashDayTime{font-size:12px;color:#64748b;font-weight:900}.cashAmountIn{color:#0967f2}.cashAmountOut{color:#c2410c;font-size:17px}.cashMoreBtn.expense{background:#fff1e8;color:#c2410c}.cashLogList{display:grid;gap:8px;margin:8px 0 12px}.cashLogItem{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;background:#f8fbff;border:1px solid #e2eaf3;border-radius:16px;padding:9px}.cashLogItem>button:first-child{border:0;background:transparent;text-align:left;color:inherit;font:inherit}.cashLogItem b,.cashLogItem span{display:block}.cashLogItem span{font-size:12px;color:#64748b;font-weight:800;margin-top:2px}.cashMoreBtn{border:0;border-radius:12px;background:#eef5ff;color:#0967f2;font-size:22px;font-weight:950;width:40px;height:40px}.cashModeTabs{display:flex;gap:8px;overflow:auto;margin:4px 0 12px}.cashModeTabs button{border:1px solid #dbe5f0;background:#fff;color:#334155;border-radius:16px;padding:11px 13px;font-weight:900;white-space:nowrap}.cashModeTabs button.active{background:#0967f2;color:#fff;border-color:#0967f2}.cashBigTabs{display:grid;grid-template-columns:1fr;overflow:visible}.cashFormula div{display:flex;justify-content:space-between;gap:12px;padding:7px 0;font-weight:900}.cashFormula hr{border:0;border-top:1px solid #dbe5f0;margin:7px 0}.cashFormula .result{font-size:20px}.cashFormula .ok b,.stat.ok .metric,.cashExportResult.ok{color:#16a34a}.cashFormula .short b,.stat.short .metric,.cashExportResult.short{color:#dc2626}.cashFormula .over b,.stat.over .metric,.cashExportResult.over{color:#0967f2}.cashSync{border-radius:14px;padding:10px 12px;margin:8px 0;font-weight:900}.cashSync.ok{background:#eafaf0;color:#15803d}.cashSync.wait{background:#fff7d6;color:#a16207}.cashSync.error{background:#fee2e2;color:#b91c1c}.cashToastClose{border:0;background:transparent;color:#fff;font-size:18px;font-weight:950;margin-left:10px;line-height:1;cursor:pointer}.cashValidation{color:#dc2626;font-weight:900;margin-top:8px}.cashActionsV749{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.cashActionsV749 .btn{min-height:46px}.cashExportPreview{overflow:auto}.cashExportCard{background:#fff;border-radius:20px;border:1px solid #dbe5f0;padding:18px;margin:12px auto;color:#0f172a;max-width:780px}.cashExportCard.mobile{max-width:430px}.cashExportCard header h2{margin:0;font-size:22px;color:#0b3b80}.cashExportHero{border-radius:16px;padding:14px;margin:10px 0}.cashExportHero span,.cashExportGrid span{display:block;font-weight:900;font-size:13px}.cashExportHero b{font-size:28px}.cashExportHero.sales{background:#dcfce7;color:#166534}.cashExportHero.transfer{background:#fef3c7;color:#92400e}.cashExportGrid{display:grid;grid-template-columns:1fr;gap:8px}.cashExportGrid div{background:#eaf3ff;border-radius:14px;padding:11px;color:#0b3b80;font-weight:900}.cashExportResult{font-size:28px;font-weight:950;text-align:center;margin:12px 0;padding:13px;border-radius:16px;background:#f8fbff}.cashExportCard h3{color:#0b3b80;margin:12px 0 6px}.cashExportCard p{margin:4px 0;font-weight:800}.cashExportCard footer{border-top:1px solid #dbe5f0;margin-top:12px;padding-top:10px;color:#64748b;font-weight:900}.cashPaper{box-sizing:border-box;width:min(100%,1080px);max-width:1080px;border:0!important;border-radius:0!important;padding:30px!important;margin:10px auto!important;background:#fff!important;color:#0f172a!important;box-shadow:0 1px 0 rgba(15,23,42,.06)}.cashPaper.mobile{max-width:430px;padding:18px!important}.cashPaper header{border-bottom:2px solid #dbe5f0;padding-bottom:10px;margin-bottom:8px}.cashPaper header h2{font-size:23px!important;margin:0 0 4px!important;color:#0b3b80!important}.cashPaper header p{margin:0!important;color:#64748b!important;font-weight:800!important;font-size:13px!important}.cashPaperTable{display:block;border:1px solid #dbe5f0;border-radius:10px;overflow:hidden}.cashPaperRow,.cashPaperLine,.cashPaperResult{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;min-height:34px;padding:7px 10px;border-bottom:1px solid #e8eef6;font-weight:900}.cashPaperRow:nth-child(even){background:#f8fbff}.cashPaperRow span,.cashPaperLine span{min-width:0;overflow-wrap:anywhere}.cashPaperRow b,.cashPaperLine b{white-space:nowrap;text-align:right}.cashPaperRow.sales span,.cashPaperRow.sales b{color:#15803d}.cashPaperRow.transfer span,.cashPaperRow.transfer b{color:#a16207}.cashPaperRow.expense span,.cashPaperRow.expense b,.cashPaperLine.expense b{color:#c2410c}.cashPaperRow.expected span,.cashPaperRow.expected b{color:#0b3b80}.cashPaperResult{border:0;border-radius:10px;margin:10px 0;font-size:18px}.cashPaperResult.ok{background:#dcfce7;color:#166534}.cashPaperResult.short{background:#fee2e2;color:#b91c1c}.cashPaperResult.over{background:#dbeafe;color:#1d4ed8}.cashPaperDetails h3{font-size:15px;color:#0b3b80;margin:10px 0 4px}.cashPaperLine{border:0;border-bottom:1px dashed #dbe5f0;min-height:30px;padding:5px 2px}.cashPaperLine.mutedLine{color:#64748b}.cashPaper footer{border-top:1px solid #dbe5f0;margin-top:10px;padding-top:8px;color:#64748b;font-weight:800;font-size:13px;display:grid;gap:3px}.cashHistoryRow{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:16px;padding:10px;margin:8px 0}.cashHistoryRow>button:first-child{border:0;background:transparent;text-align:left;color:inherit}.cashHistoryRow b,.cashHistoryRow span{display:block}.cashHistoryRow span{font-size:12px;color:#64748b;font-weight:800;margin-top:3px}.summaryPageGrid{display:grid;grid-template-columns:1fr;gap:10px}.miniItem{display:flex;justify-content:space-between;gap:10px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px;margin:7px 0}.compact{padding:10px}.sectionTitle{font-weight:950;margin:12px 0 8px;color:#0b3b80}@media(max-width:360px){.cashQuickActions{grid-template-columns:1fr}}@media(min-width:720px){.cashDayCards{grid-template-columns:1fr 1fr}.cashMenuGridV749{grid-template-columns:1fr 1fr}.cashBigTabs{grid-template-columns:1fr 1fr}.cashActionsV749{grid-template-columns:repeat(4,1fr)}.cashExportGrid,.summaryPageGrid{grid-template-columns:repeat(2,1fr)}.cashExportCard.desktop .cashExportGrid{grid-template-columns:repeat(3,1fr)}}`;
  document.head.appendChild(style);
  function labels(){document.title='Stock Alert V7.55';const sub=document.getElementById('updateStatusSub');if(sub)sub.textContent=APP_VERSION;const b=document.querySelector('#updateModalVersionBox b');if(b)b.textContent=APP_VERSION;}
  ensurePages();ensureHomeButton();labels();setTimeout(()=>{ensurePages();ensureHomeButton();labels();if(isCashPageActive())pollCashSync();},500);setTimeout(()=>{if(isCashPageActive())pollCashSync();refreshCashActive();},3600);
})();
