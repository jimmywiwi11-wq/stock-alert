
const firebaseConfig={apiKey:"AIzaSyArOggsR6vLn0AeVx-TdqHiLSd6LElfrEc",authDomain:"check-chokanan.firebaseapp.com",projectId:"check-chokanan",storageBucket:"check-chokanan.firebasestorage.app",messagingSenderId:"637683943443",appId:"1:637683943443:web:db64ac24fd66b93474d7e6"};
let db=null, online=false;try{firebase.initializeApp(firebaseConfig);db=firebase.firestore();online=true;}catch(e){console.warn(e)}
const COLLECTION='stock_alert_beta1_items';const ACT='stock_alert_beta1_activity';let items=[], activities=[], currentBranch=1, currentStatus='out', listMode='all', editId=null, transferTarget=null;let currentPOSupplier='', poManualItems={};let purchaseOrders=JSON.parse(localStorage.getItem('stockAlertPurchaseOrders')||'[]');let deliveryHistory=JSON.parse(localStorage.getItem('stockAlertDeliveryHistory')||'[]');let currentOrderSupplier='', currentReceiveOrderId='', currentHistoryId='';let currentCategory='เบ็ดเตล็ด', selectedCategory='';let categories=JSON.parse(localStorage.getItem('stockAlertCategories')||'null')||['ไฟฟ้า','ประปา','สี','เครื่องมือ','เบ็ดเตล็ด'];let suppliersMaster=JSON.parse(localStorage.getItem('stockAlertSuppliers')||'[]');let nickname=localStorage.getItem('stockAlertNickname')||'';
const icons={pen:'<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13 7l4 4"/></svg>',list:'<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',truck:'<svg viewBox="0 0 24 24"><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',swap:'<svg viewBox="0 0 24 24"><path d="M7 7h13M17 4l3 3-3 3M17 17H4M7 14l-3 3 3 3"/></svg>',chart:'<svg viewBox="0 0 24 24"><path d="M4 19h16"/><path d="M7 16v-5M12 16V7M17 16v-9"/><path d="M6 10l5-4 4 3 4-5"/></svg>',category:'<svg viewBox="0 0 24 24"><path d="M4 6.5h7l2 2h7v9.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M7 12h10M7 16h7"/></svg>',box:'<svg viewBox="0 0 24 24"><path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/></svg>'};
const menu=[['ลงของขาด<br>สาขา 1','b1','pen',()=>openForm(1)],['ลงของขาด<br>สาขา 2','b2','pen',()=>openForm(2)],['รายการของขาด<br>สาขา 1','p1','list',()=>openList('branch1')],['รายการของขาด<br>สาขา 2','p2','list',()=>openList('branch2')],['ต้องสั่งเข้าใหม่','r1','truck',()=>go('orderPage')],['แบ่งของ<br>ระหว่างสาขา','s1','swap',()=>go('transferMenuPage')],['ของมาส่งแล้ว','g1','box',()=>go('deliveredPage')],['ข้อมูล','p1','chart',()=>go('summaryPage')]];
function init(){document.getElementById('mainGrid').innerHTML=menu.map((m,i)=>`<div class="tile ${m[4]||''}" onclick="menu[${i}][3]()"><div class="ico ${m[1]}">${icons[m[2]]}</div><b>${m[0]}</b></div>`).join('');if(!nickname)document.getElementById('nameModal').classList.add('show'); else document.getElementById('syncText').textContent='ผู้ใช้งานเครื่องนี้: '+nickname;bindSearch();listen();}
function listen(){if(online&&db){db.collection(COLLECTION).onSnapshot(s=>{items=s.docs.map(d=>({id:d.id,...d.data()}));renderAll();document.getElementById('syncText').textContent='Sync Firebase พร้อมใช้งาน';},e=>{online=false;loadLocal();});db.collection(ACT).orderBy('time','desc').limit(80).onSnapshot(s=>{activities=s.docs.map(d=>({id:d.id,...d.data()}));renderActivity();});}else loadLocal()}
function loadLocal(){items=JSON.parse(localStorage.getItem(COLLECTION)||'[]');activities=JSON.parse(localStorage.getItem(ACT)||'[]');document.getElementById('syncText').textContent='โหมดออฟไลน์ / ตัวอย่าง';renderAll();}
function persist(){localStorage.setItem(COLLECTION,JSON.stringify(items));localStorage.setItem(ACT,JSON.stringify(activities));localStorage.setItem('stockAlertPurchaseOrders',JSON.stringify(purchaseOrders));localStorage.setItem('stockAlertDeliveryHistory',JSON.stringify(deliveryHistory));renderAll()}
function persistOrders(){localStorage.setItem('stockAlertPurchaseOrders',JSON.stringify(purchaseOrders));localStorage.setItem('stockAlertDeliveryHistory',JSON.stringify(deliveryHistory));renderAll()}
function saveNickname(){const v=document.getElementById('nicknameInput').value.trim();if(!v)return toast('กรุณาใส่ชื่อเล่น');nickname=v;localStorage.setItem('stockAlertNickname',v);document.getElementById('nameModal').classList.remove('show');document.getElementById('syncText').textContent='ผู้ใช้งานเครื่องนี้: '+v}
function go(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));if(id==='home')document.querySelector('.tab').classList.add('active');if(id==='transferMenuPage')renderTransferStatus();if(id==='transferStatusPage')renderTransferStatus();if(id==='transferStatusDetailPage')renderTransferStatusDetail();if(id==='orderPage')renderOrders();if(id==='poBuilderPage')renderPOBuilder();if(id==='poSupplierPage')renderPOSupplier();if(id==='activityPage')renderActivity();if(id==='pendingPage')renderPending();if(id==='categoryPage')renderCategoryPage();if(id==='categoryDetailPage')renderCategoryDetail();if(id==='managePage')renderManagePage();if(id==='orderedCompaniesPage')renderOrderedCompanies();if(id==='receiveCompaniesPage')renderReceiveCompanies();if(id==='orderSupplierPage')renderOrderSupplier();if(id==='receiveSupplierPage')renderReceiveSupplier();if(id==='partialReceivePage')renderPartialReceive();if(id==='deliveredPage')renderDeliveredPage();if(id==='deliveredSupplierPage')renderDeliveredSupplier();if(id==='deliveryHistoryPage')renderDeliveryHistory();if(id==='deliveryHistoryDetailPage')renderDeliveryHistoryDetail();if(id==='bestSellerPage')renderBestSellers();window.scrollTo(0,0)}
function setStatus(s){currentStatus=s;document.getElementById('outBtn').className=s==='out'?'active out':'';document.getElementById('lowBtn').className=s==='low'?'active low':'';const q=document.getElementById('qtyField');if(q)q.style.display=s==='low'?'block':'none';}
function openForm(b,it=null){currentBranch=b;editId=it?it.id:null;currentCategory=it?.category||currentCategory||'เบ็ดเตล็ด';go('formPage');document.getElementById('formTitle').textContent=(editId?'แก้ไข':'ลงของขาด')+' สาขา '+b;document.getElementById('nameInput').value=it?.name||'';renderCategoryChips();renderSupplierOptions();setStatus(it?.status||'out');document.getElementById('qtyInput').value=it?.qty||'';document.getElementById('unitInput').value=it?.unit||'';document.getElementById('supplierInput').value=it?.supplier||'';document.getElementById('noteInput').value=it?.note||'';}
async function saveItem(){const name=nameInput.value.trim();if(!name)return toast('กรุณาใส่ชื่อสินค้า');if(currentStatus==='low'&&!qtyInput.value.trim())return toast('กรุณาใส่จำนวนคงเหลือ');const now=Date.now();let supplierVal=supplierInput.value.trim()||'ยังไม่ได้ระบุ'; if(supplierVal!=='ยังไม่ได้ระบุ'&&!suppliersMaster.includes(supplierVal)){suppliersMaster.push(supplierVal);localStorage.setItem('stockAlertSuppliers',JSON.stringify(suppliersMaster));} let data={name,search:norm(name),branch:currentBranch,status:currentStatus,qty:currentStatus==='low'?qtyInput.value.trim():'',unit:unitInput.value.trim(),supplier:supplierVal,category:currentCategory||'เบ็ดเตล็ด',note:noteInput.value.trim(),updatedAt:now,updatedBy:nickname||'ไม่ระบุ'};if(editId){await updateDoc(editId,data);log('แก้ไขรายการ',name)}else{data.createdAt=now;data.createdBy=nickname||'ไม่ระบุ';data.transferPrepared=false;data.transferDone=false;await addDoc(data);log('ลงของขาด',name)}go('home');toast('บันทึกแล้ว')}
async function addDoc(data){if(online&&db){await db.collection(COLLECTION).add(data)}else{items.push({id:'local_'+Date.now(),...data});persist()}}
async function updateDoc(id,data){if(online&&db){await db.collection(COLLECTION).doc(id).update(data)}else{items=items.map(x=>x.id===id?{...x,...data}:x);persist()}}
async function delDoc(id){const it=items.find(x=>x.id===id);if(!confirm('ลบรายการนี้ใช่ไหม?'))return;if(online&&db)await db.collection(COLLECTION).doc(id).delete();else{items=items.filter(x=>x.id!==id);persist()}log('ลบรายการ',it?.name||'')}
function openList(mode){listMode=mode;go('listPage');document.getElementById('listTitle').textContent=mode==='branch1'?'รายการของขาด สาขา 1':mode==='branch2'?'รายการของขาด สาขา 2':'ของขาดทั้งหมด';document.getElementById('listSub').textContent=mode==='all'?'รวมรายการจากสาขา 1 และสาขา 2':'ดู / แก้ไข / ลบ';const act=document.getElementById('listTopActions');if(act){act.innerHTML=mode==='all'?`<div class="categoryShortcut" onclick="go('categoryPage')"><div class="ico cat1">${icons.category}</div><div><b>หมวดหมู่</b><div class="muted">แยกดูสินค้าของขาดตามหมวดหมู่</div></div></div>`:'';}renderList()}
function groupItemHtml(g){const b1=branchText(g.b1), b2=branchText(g.b2);let total=0, unit='', hasLow=false, hasOut=false;[g.b1,g.b2].forEach(x=>{if(!x)return;if(x.status==='out')hasOut=true;else{hasLow=true;unit=unit||x.unit||'';const n=parseFloat(String(x.qty||'').replace(/,/g,''));if(!isNaN(n))total+=n;}});let pill=hasLow&&total>0?`<span class="pill yellow">เหลือรวม ${formatNumber(total)} ${unit}</span>`:hasOut?'<span class="pill red">หมดเกลี้ยง</span>':'<span class="pill blue">ดูรายละเอียด</span>';return `<div class="item"><div class="itemTop"><div><b>${g.name}</b><div class="muted">สาขา 1: ${b1}</div><div class="muted">สาขา 2: ${b2}</div></div>${pill}</div></div>`}
function renderList(){let arr=items;const q=norm(document.getElementById('listSearch').value||'');let compactNames=[];if(listMode==='all'){let gs=groups();if(q)gs=gs.filter(g=>norm(g.name).includes(q));compactNames=gs.map(g=>g.name);document.getElementById('listBox').innerHTML=(gs.length?`<div class="topMiniActions"><button class="miniViewBtn" onclick="showCompactList('ของขาดทั้งหมด', groups().map(g=>g.name))">ดูรายการทั้งหมด</button></div>`+gs.sort((a,b)=>a.name.localeCompare(b.name,'th')).map(groupItemHtml).join(''):'<div class="empty">ยังไม่มีรายการ</div>');return;}if(listMode==='branch1')arr=items.filter(x=>x.branch==1);if(listMode==='branch2')arr=items.filter(x=>x.branch==2);if(q)arr=arr.filter(x=>norm(x.name).includes(q));const title=listMode==='branch1'?'ของขาดสาขา 1':'ของขาดสาขา 2';document.getElementById('listBox').innerHTML=arr.length?`<div class="topMiniActions"><button class="miniViewBtn" onclick="showCompactList('${title}', items.filter(x=>x.branch==${listMode==='branch1'?1:2}).map(x=>x.name))">ดูรายการทั้งหมด</button></div>`+arr.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).map(itemHtml).join(''):'<div class="empty">ยังไม่มีรายการ</div>'}
function itemHtml(x){return `<div class="item"><div class="itemTop"><div><b>${x.name}</b><div class="muted">สาขา ${x.branch} • บริษัท: ${x.supplier||'ยังไม่ได้ระบุ'}</div><div class="muted">ผู้ลง: ${x.createdBy||'-'} • แก้ไขล่าสุด: ${fmt(x.updatedAt||x.createdAt)}</div></div>${statusPill(x)}</div><div class="rowBtns"><button class="btn gray" onclick='openForm(${x.branch},${JSON.stringify(x).replace(/'/g,"&#39;")})'>แก้ไข</button><button class="btn danger" onclick="delDoc('${x.id}')">ลบ</button></div></div>`}
function statusPill(x){return x.status==='out'?'<span class="pill red">หมดเกลี้ยง</span>':`<span class="pill yellow">เหลือ ${x.qty||'-'} ${x.unit||''}</span>`}
function groups(){const map={};items.forEach(x=>{const k=norm(x.name);map[k]=map[k]||{name:x.name,b1:null,b2:null};map[k]['b'+x.branch]=x});return Object.values(map)}
function transferTasks(){return groups().flatMap(g=>{let out=[];if(g.b1&&!g.b2)out.push({need:g.b1,from:2,to:1,key:norm(g.name)});if(g.b2&&!g.b1)out.push({need:g.b2,from:1,to:2,key:norm(g.name)});return out})}
function orderGroups(){return groups().filter(g=>g.b1&&g.b2)}
function renderAll(){const total=items.length, orders=orderGroups().length, transfers=transferTasks().length, unknown=items.filter(x=>(x.supplier||'ยังไม่ได้ระบุ')==='ยังไม่ได้ระบุ').length;statShortage.textContent=total;statOrder.textContent=orders;statTransfer.textContent=transfers;statSupplier.textContent=unknown;bellBadge.textContent=activities.length||0;renderHomeSearch();renderAllShortage();renderTransferAlerts();renderList();renderTransfers();renderTransferStatus();renderOrders();renderPOBuilder();renderOrderSupplier();renderDeliveredPage();renderDeliveryHistory();renderPending();renderCategoryPage();renderManagePage();renderSupplierOptions();}

function renderAllShortage(){
 const hint=document.getElementById('allShortageHint');
 if(hint)hint.textContent=`รวม ${groups().length} รายการ จาก 2 สาขา`;
}

function renderHomeSearch(){const q=norm(homeSearch.value||'');const box=homeResults;const card=document.getElementById('homeResultsCard');if(!q){if(card)card.style.display='none';box.className='empty';box.textContent='';return}if(card)card.style.display='block';const arr=groups().filter(g=>norm(g.name).includes(q));box.className='';box.innerHTML=arr.length?arr.map(g=>`<div class="item"><b>${g.name}</b><div class="muted">สาขา 1: ${branchText(g.b1)}</div><div class="muted">สาขา 2: ${branchText(g.b2)}</div></div>`).join(''):'<div class="empty">ไม่พบรายการ</div>'}
function branchText(x){if(!x)return'ไม่มีรายการของขาด';return x.status==='out'?'หมดเกลี้ยง':`เหลือ ${x.qty||'-'} ${x.unit||''}`}
function transferTasksByDirection(from,to){return transferTasks().filter(t=>t.from==from&&t.to==to)}
function transferSummary(from,to){const tasks=transferTasksByDirection(from,to);const done=tasks.filter(t=>t.need.transferPrepared).length;return {from,to,total:tasks.length,done,remain:Math.max(0,tasks.length-done),complete:tasks.length>0&&done===tasks.length,started:done>0}}
function renderTransferAlerts(){const dirs=[transferSummary(1,2),transferSummary(2,1)];const active=dirs.filter(d=>d.started);transferAlerts.innerHTML=active.map(d=>`<div class="alertCard ${d.complete?'done':''}" onclick="openStatusDirection(${d.from},${d.to})"><h3>สาขา ${d.from} ${d.complete?'แบ่งของครบทุกรายการแล้ว':'เริ่มแบ่งของบางส่วนแล้ว'}</h3><p>กดดูสถานะการแบ่งของ</p></div>`).join('')}
function openTransferDirection(from,to){transferFrom=from;transferTo=to;transferDetailTitle.textContent=`สาขา ${from} แบ่งให้สาขา ${to}`;go('transferDetailPage');renderTransfers()}
function renderTransfers(){const from=transferFrom||1,to=transferTo||2;const tasks=transferTasksByDirection(from,to);transferBox.innerHTML=tasks.length?tasks.map(t=>`<div class="item"><div class="itemTop"><div><b>${t.need.name}</b><div class="muted">สาขา ${t.from} → สาขา ${t.to}</div><div class="muted">สถานะของสาขา ${t.to}: ${branchText(t.need)}</div>${t.need.transferPrepared?`<div class="muted">แบ่งแล้ว: ${t.need.transferQty||'-'} ${t.need.transferUnit||''} โดย ${t.need.transferBy||'-'} เวลา ${fmt(t.need.transferAt)}</div>`:''}</div>${t.need.transferPrepared?'<span class="pill green">แบ่งแล้ว</span>':'<span class="pill blue">รอแบ่ง</span>'}</div><div class="rowBtns"><button class="btn ok" onclick="openTransfer('${t.need.id}',${t.from},${t.to})">${t.need.transferPrepared?'แก้ไขจำนวน':'แบ่งแล้ว'}</button></div></div>`).join(''):'<div class="empty">ยังไม่มีรายการที่ต้องแบ่งในทิศทางนี้</div>'}
function renderTransferStatus(){return}
function openStatusDirection(from,to){statusFrom=from;statusTo=to;document.getElementById('statusDetailTitle').textContent=`สถานะการแบ่ง สาขา ${from} → สาขา ${to}`;go('transferStatusDetailPage')}
function statusColor(pct,complete){if(complete)return 'green'; if(pct>=70)return 'yellow'; return 'orange'}
function renderTransferStatusDetail(){const d=transferSummary(statusFrom||1,statusTo||2);const pct=d.total?Math.round((d.done/d.total)*100):0;const color=statusColor(pct,d.complete);let statusText='ยังไม่ได้เริ่มแบ่ง';if(d.complete)statusText='แบ่งของครบทุกรายการแล้ว';else if(d.started)statusText='เริ่มแบ่งแล้วบางส่วน';const tasks=transferTasksByDirection(d.from,d.to);const details=tasks.map(t=>`<div class="item"><div class="itemTop"><div><b>${t.need.name}</b><div class="muted">${t.need.transferPrepared?`แบ่งแล้ว ${t.need.transferQty||'-'} ${t.need.transferUnit||''} โดย ${t.need.transferBy||'-'} เวลา ${fmt(t.need.transferAt)}`:'ยังไม่ได้แบ่ง'}</div></div>${t.need.transferPrepared?'<span class="pill green">แบ่งแล้ว</span>':'<span class="pill blue">ยังไม่แบ่ง</span>'}</div></div>`).join('');transferStatusDetailBox.innerHTML=`<div class="statusHero"><div class="statusIcon ${color}">↔</div><div class="smallTitle">สาขา ${d.from} → สาขา ${d.to}</div><h2 style="margin:8px 0 6px">${statusText}</h2><div class="progressOuter"><div class="progressBar ${color}" style="width:${pct}%"></div></div><div class="bigPercent">${pct}%</div><div class="statusRows"><div class="statusRow"><span>ทั้งหมด</span><span>${d.total} รายการ</span></div><div class="statusRow"><span>แบ่งแล้ว</span><span>${d.done} รายการ</span></div><div class="statusRow"><span>ยังไม่แบ่ง</span><span>${d.remain} รายการ</span></div></div><button class="btn cleanListBtn" onclick="document.getElementById('statusDetailList').style.display=document.getElementById('statusDetailList').style.display==='none'?'block':'none'">ดูรายการทั้งหมด</button></div><div id="statusDetailList" style="display:none;margin-top:12px">${details||'<div class="empty">ยังไม่มีรายการ</div>'}</div>`}
function openTransfer(id,from,to){const it=items.find(x=>x.id===id);transferTarget={id,from,to};tmTitle.textContent=it.name;tmSub.textContent=`สาขา ${from} → สาขา ${to}`;tmQty.value=it.transferQty||'';tmUnit.value=it.transferUnit||it.unit||'';document.getElementById('transferModal').classList.add('show')}
async function confirmTransfer(){if(!transferTarget)return;const q=tmQty.value.trim(),u=tmUnit.value.trim();await updateDoc(transferTarget.id,{transferPrepared:true,transferDone:false,transferQty:q,transferUnit:u,transferBy:nickname||'ไม่ระบุ',transferAt:Date.now()});const it=items.find(x=>x.id===transferTarget.id);log(`สาขา ${transferTarget.from} แบ่งของ`,it?.name||'');closeModal('transferModal');toast('บันทึกการแบ่งแล้ว')}
async function markTransferDone(id){await updateDoc(id,{transferPrepared:true,transferDone:true,transferDoneBy:nickname||'ไม่ระบุ',transferDoneAt:Date.now()});const it=items.find(x=>x.id===id);log('แบ่งของครบทุกรายการแล้ว',it?.name||'');toast('แบ่งครบแล้ว')}
function orderedItemNames(){const set=new Set();purchaseOrders.filter(o=>o.status!=='delivered').forEach(o=>(o.items||[]).forEach(i=>set.add(norm(i.name))));return set}
function renderOrders(){const box=document.getElementById('orderBox');if(!box)return;const ordered=orderedItemNames();const arr=orderGroups();const needHtml=arr.length?`<div class="sectionTitle">รายการที่ต้องสั่ง <button class="miniViewBtn" style="float:right" onclick="showCompactList('รายการที่ต้องสั่ง', orderGroups().map(g=>g.name))">ดูรายการทั้งหมด</button></div>${arr.map(g=>{const isOrdered=ordered.has(norm(g.name));return `<div class="item"><div class="itemTop"><div><b>${g.name}</b><div class="muted">สาขา 1: ${branchText(g.b1)}</div><div class="muted">สาขา 2: ${branchText(g.b2)}</div><div class="muted">บริษัท: ${g.b1?.supplier||g.b2?.supplier||'ยังไม่ได้ระบุ'}</div></div>${isOrdered?'<span class="pill blue">สั่งแล้ว</span>':''}</div></div>`}).join('')}`:'<div class="empty">ยังไม่มีรายการที่ต้องสั่ง</div>';box.innerHTML=needHtml}
function activeSupplierNames(){return [...new Set(purchaseOrders.filter(o=>o.status!=='delivered').map(o=>o.supplier||'ไม่ระบุบริษัท'))].sort((a,b)=>a.localeCompare(b,'th'))}
function renderOrderedCompanies(){const box=document.getElementById('orderedCompaniesBox');if(!box)return;const names=activeSupplierNames();box.innerHTML=names.length?`<div class="supplierList">${names.map(n=>{const count=purchaseOrders.filter(o=>(o.supplier||'ไม่ระบุบริษัท')===n&&o.status!=='delivered').reduce((sum,o)=>sum+(o.items||[]).length,0);return `<button class="supplierBtn" onclick="openOrderSupplier('${encodeURIComponent(n)}')"><span>${n}</span><span class="count">${count} รายการ</span></button>`}).join('')}</div>`:'<div class="empty">ยังไม่มีสินค้าที่สั่งไปแล้ว</div>'}
function renderReceiveCompanies(){const box=document.getElementById('receiveCompaniesBox');if(!box)return;const names=activeSupplierNames();box.innerHTML=names.length?`<div class="supplierList">${names.map(n=>{const count=purchaseOrders.filter(o=>(o.supplier||'ไม่ระบุบริษัท')===n&&o.status!=='delivered').reduce((sum,o)=>sum+(o.items||[]).length,0);return `<button class="supplierBtn" onclick="openReceiveSupplier('${encodeURIComponent(n)}')"><span>${n}</span><span class="count">${count} รายการ</span></button>`}).join('')}</div>`:'<div class="empty">ยังไม่มีรายการที่รอตรวจรับสินค้า</div>'}
function openOrderSupplier(encoded){currentOrderSupplier=decodeURIComponent(encoded);go('orderSupplierPage')}
function openReceiveSupplier(encoded){currentOrderSupplier=decodeURIComponent(encoded);go('receiveSupplierPage')}
function renderOrderSupplier(){const title=document.getElementById('orderSupplierTitle'),box=document.getElementById('orderSupplierBox');if(!box)return;const supplier=currentOrderSupplier||'';title.textContent=`สินค้าที่สั่งไปแล้ว ${supplier}`;const orders=purchaseOrders.filter(o=>(o.supplier||'ไม่ระบุบริษัท')===supplier&&o.status!=='delivered').sort((a,b)=>b.orderAt-a.orderAt);box.innerHTML=orders.length?orders.map(o=>`<div class="batchCard"><div class="batchHead"><div><b>${supplier}</b><div class="muted">ยืนยันสั่ง: ${fmt(o.orderAt)}</div>${o.status==='partial'?'<div class="batchTag hold" style="display:inline-block;margin-top:6px">มีสินค้าค้างส่ง</div>':'<div class="batchTag" style="display:inline-block;margin-top:6px">สั่งไปแล้ว</div>'}</div><span class="batchTag">${o.items.length} รายการ</span></div><div class="batchItems">${o.items.map(x=>`<div class="batchItem"><span>${x.name}</span><span>${x.qty||'-'} ${x.unit||''}</span></div>`).join('')}</div></div>`).join(''):'<div class="empty">ไม่มีรายการที่สั่งไปแล้วของบริษัทนี้</div>'}
function renderReceiveSupplier(){const title=document.getElementById('receiveSupplierTitle'),box=document.getElementById('receiveSupplierBox');if(!box)return;const supplier=currentOrderSupplier||'';title.textContent=`สินค้ามาส่ง ${supplier}`;const orders=purchaseOrders.filter(o=>(o.supplier||'ไม่ระบุบริษัท')===supplier&&o.status!=='delivered').sort((a,b)=>b.orderAt-a.orderAt);box.innerHTML=orders.length?orders.map(o=>{const submitted=o.receiveSubmitted;return `<div class="batchCard" id="receiveCard_${o.id}"><div class="batchHead"><div><b>${supplier}</b><div class="muted">ยืนยันสั่ง: ${fmt(o.orderAt)}</div>${submitted?'<div class="batchTag green" style="display:inline-block;margin-top:6px">ส่งข้อมูลแล้ว</div>':(o.status==='partial'?'<div class="batchTag hold" style="display:inline-block;margin-top:6px">มีสินค้าค้างส่ง</div>':'<div class="batchTag" style="display:inline-block;margin-top:6px">รอรับสินค้า</div>')}</div><span class="batchTag">${o.items.length} รายการ</span></div><div class="batchItems">${o.items.map(x=>`<div class="batchItem"><span>${x.name}</span><span>${x.qty||'-'} ${x.unit||''}</span></div>`).join('')}</div><div class="receiveActions" id="receiveActions_${o.id}">${submitted?`<div class="sentWrap"><div class="sentBox">ส่งข้อมูลแล้ว</div><button class="editMini" onclick="editReceiveOrder('${o.id}')">แก้ไข</button></div>`:`<button class="btn ok" onclick="receiveOrderComplete('${o.id}', this)">สินค้ามาครบ</button><button class="btn gray" onclick="openPartialReceive('${o.id}')">มาไม่ครบ</button>`}</div></div>`}).join(''):'<div class="empty">ไม่มีรายการที่รอตรวจรับของบริษัทนี้</div>'}
function persistOrders(){localStorage.setItem('stockAlertPurchaseOrders',JSON.stringify(purchaseOrders));localStorage.setItem('stockAlertDeliveryHistory',JSON.stringify(deliveryHistory));renderAll()}
function openPartialReceive(id){currentReceiveOrderId=id;go('partialReceivePage')}
function renderPartialReceive(){const box=document.getElementById('partialItemsBox');if(!box)return;const o=purchaseOrders.find(x=>x.id===currentReceiveOrderId);box.innerHTML=o?`<p class="muted">ติ๊กเลือกรายการที่ยังไม่มาส่ง</p>${o.items.map((x,i)=>`<label class="checkRow"><input type="checkbox" value="${i}"><span><b>${x.name}</b><div class="muted">${x.qty||'-'} ${x.unit||''}</div></span></label>`).join('')}`:'<div class="empty">ไม่พบรายการ</div>'}
function removeDeliveredShortages(deliveredItems,supplier){const names=new Set(deliveredItems.map(x=>norm(x.name)));items=items.filter(it=>!(names.has(norm(it.name))&&(it.supplier||'ยังไม่ได้ระบุ')===(supplier||'ไม่ระบุบริษัท')));persist()}
function deliveredArchive(supplier,deliveredItems,missingItems,orderAt,orderId){if(!deliveredItems.length&&!missingItems.length)return;if(orderId&&deliveryHistory.some(d=>d.orderId===orderId))return;deliveryHistory.unshift({id:'del_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),orderId,supplier,deliveredItems,missingItems,orderAt,receivedAt:Date.now(),by:nickname||'ไม่ระบุ'});removeDeliveredShortages(deliveredItems,supplier)}
function markReceiveSent(id){const box=document.getElementById('receiveActions_'+id);if(box)box.innerHTML=`<div class="sentWrap"><div class="sentBox">ส่งข้อมูลแล้ว</div><button class="editMini" onclick="editReceiveOrder('${id}')">แก้ไข</button></div>`;toast('ส่งข้อมูลแล้ว')}
function editReceiveOrder(id){const o=purchaseOrders.find(x=>x.id===id);if(!o)return toast('รายการนี้บันทึกเรียบร้อยแล้ว');o.receiveSubmitted=false;o.receiveResult='';persistOrders();renderReceiveSupplier();toast('กลับมาแก้ไขได้แล้ว')}
function receiveOrderComplete(id,btn){const o=purchaseOrders.find(x=>x.id===id);if(!o)return;if(o.receiveSubmitted)return toast('รายการนี้ส่งข้อมูลแล้ว');o.receiveSubmitted=true;o.receiveResult='complete';deliveredArchive(o.supplier,o.items,[],o.orderAt,o.id);o.status='delivered';persistOrders();markReceiveSent(id)}
function confirmPartialReceive(){const o=purchaseOrders.find(x=>x.id===currentReceiveOrderId);if(!o)return;if(o.receiveSubmitted)return toast('รายการนี้ส่งข้อมูลแล้ว');const missingIdx=new Set(Array.from(document.querySelectorAll('#partialItemsBox input:checked')).map(x=>Number(x.value)));const missing=o.items.filter((_,i)=>missingIdx.has(i));const delivered=o.items.filter((_,i)=>!missingIdx.has(i));deliveredArchive(o.supplier,delivered,missing,o.orderAt,o.id);o.receiveSubmitted=true;o.receiveResult='partial';if(missing.length){o.items=missing;o.status='partial';o.updatedAt=Date.now()}else{o.status='delivered'}persistOrders();currentOrderSupplier=o.supplier;go('receiveSupplierPage');toast('ส่งข้อมูลแล้ว')}
function renderDeliveredPage(){const box=document.getElementById('deliveredBox');if(!box)return;const names=[...new Set(deliveryHistory.map(x=>x.supplier||'ไม่ระบุบริษัท'))].sort((a,b)=>a.localeCompare(b,'th'));box.innerHTML=names.length?`<div class="supplierList">${names.map(n=>{const count=deliveryHistory.filter(d=>(d.supplier||'ไม่ระบุบริษัท')===n).reduce((s,d)=>s+d.deliveredItems.length,0);return `<button class="supplierBtn" onclick="openDeliveredSupplier('${encodeURIComponent(n)}')"><span>${n}</span><span class="count">${count} รายการ</span></button>`}).join('')}</div>`:'<div class="empty">ยังไม่มีข้อมูลของมาส่งแล้ว</div>'}
function openDeliveredSupplier(encoded){currentOrderSupplier=decodeURIComponent(encoded);go('deliveredSupplierPage')}
function renderDeliveredSupplier(){const title=document.getElementById('deliveredSupplierTitle'),box=document.getElementById('deliveredSupplierBox');if(!box)return;const supplier=currentOrderSupplier||'';title.textContent=`ของมาส่งแล้ว ${supplier}`;const rows=deliveryHistory.filter(d=>(d.supplier||'ไม่ระบุบริษัท')===supplier);box.innerHTML=rows.length?rows.map(d=>`<div class="batchCard"><div class="batchHead"><div><b>${supplier}</b><div class="muted">มาส่ง: ${fmt(d.receivedAt)}</div><div class="muted">สั่งเมื่อ: ${fmt(d.orderAt)}</div></div><span class="batchTag green">มาแล้ว</span></div><div class="batchItems">${d.deliveredItems.map(x=>`<div class="batchItem"><span>${x.name}</span><span>${x.qty||'-'} ${x.unit||''}</span></div>`).join('')}</div>${d.missingItems?.length?`<div class="sectionTitle">ค้างส่ง</div><div class="batchItems">${d.missingItems.map(x=>`<div class="batchItem"><span>${x.name}</span><span>${x.qty||'-'} ${x.unit||''}</span></div>`).join('')}</div>`:''}</div>`).join(''):'<div class="empty">ยังไม่มีรายการของบริษัทนี้</div>'}
function renderDeliveryHistory(){const box=document.getElementById('deliveryHistoryBox');if(!box)return;box.innerHTML=deliveryHistory.length?deliveryHistory.map(d=>`<button class="historyRow" onclick="openDeliveryHistoryDetail('${d.id}')"><b>${d.supplier}</b><div class="meta">มาส่ง ${fmt(d.receivedAt)} • มาแล้ว ${d.deliveredItems.length} รายการ${d.missingItems?.length?' • ค้างส่ง '+d.missingItems.length+' รายการ':''}</div></button>`).join(''):'<div class="empty">ยังไม่มีประวัติการส่งสินค้า</div>'}
function openDeliveryHistoryDetail(id){currentHistoryId=id;go('deliveryHistoryDetailPage')}
function renderDeliveryHistoryDetail(){const box=document.getElementById('deliveryHistoryDetailBox'),title=document.getElementById('deliveryHistoryTitle');if(!box)return;const d=deliveryHistory.find(x=>x.id===currentHistoryId);if(!d){box.innerHTML='<div class="empty">ไม่พบข้อมูล</div>';return}title.textContent=d.supplier;box.innerHTML=`<div class="card"><div class="muted">ยืนยันสั่ง: ${fmt(d.orderAt)}</div><div class="muted">มาส่ง: ${fmt(d.receivedAt)}</div><div class="muted">บันทึกโดย: ${d.by||'-'}</div></div><div class="sectionTitle">สินค้าที่มาส่ง</div>${d.deliveredItems.map(x=>`<div class="miniItem"><b>${x.name}</b><span class="meta">${x.qty||'-'} ${x.unit||''}</span></div>`).join('')||'<div class="empty">ไม่มี</div>'}${d.missingItems?.length?`<div class="sectionTitle">สินค้าค้างส่ง</div>${d.missingItems.map(x=>`<div class="miniItem"><b>${x.name}</b><span class="meta">${x.qty||'-'} ${x.unit||''}</span></div>`).join('')}`:''}`}
function openPOBuilder(){go('poBuilderPage');renderPOBuilder()}
function orderSupplierName(g){return (g.b1?.supplier && g.b1.supplier!=='ยังไม่ได้ระบุ')?g.b1.supplier:((g.b2?.supplier&&g.b2.supplier!=='ยังไม่ได้ระบุ')?g.b2.supplier:'')}
function supplierGroupsForPO(){const map={};orderGroups().forEach(g=>{const sp=orderSupplierName(g); if(!sp)return; map[sp]=map[sp]||[]; map[sp].push(g)});return map}
function renderPOBuilder(){const box=document.getElementById('poSupplierBox');if(!box)return;const map=supplierGroupsForPO();const names=Object.keys(map).sort((a,b)=>a.localeCompare(b,'th'));box.innerHTML=names.length?`<div class="supplierList">${names.map(n=>`<button class="supplierBtn" onclick="openPOSupplier('${encodeURIComponent(n)}')"><span>${n}</span><span class="count">${map[n].length} รายการ</span></button>`).join('')}</div>`:'<div class="empty">ยังไม่มีข้อมูลบริษัท<br><br>ถ้าตอนลงของขาดมีการใส่ชื่อบริษัท บริษัทนั้นจะมาเป็นตัวเลือกในหน้านี้</div>'}
function openPOSupplier(encoded){currentPOSupplier=decodeURIComponent(encoded);go('poSupplierPage');renderPOSupplier()}
function renderPOSupplier(){const title=document.getElementById('poSupplierTitle'),box=document.getElementById('poItemsBox');if(!box)return;const supplier=currentPOSupplier||'';title.textContent=`ใบสั่งสินค้า ${supplier}`;const groups=supplierGroupsForPO()[supplier]||[];const manual=poManualItems[supplier]||[];const lines=groups.map((g,i)=>{const unit=(g.b1?.unit||g.b2?.unit||'');return `<div class="poLine" data-name="${g.name.replace(/"/g,'&quot;')}"><div><b>${g.name}</b><div class="muted">สาขา 1: ${branchText(g.b1)}<br>สาขา 2: ${branchText(g.b2)}</div></div><input class="poQty" type="text" inputmode="text" placeholder="จำนวน"><input class="poUnit" value="${unit}" placeholder="หน่วย"></div>`}).join('');const manualLines=manual.map((x,i)=>`<div class="poLine" data-name="${String(x.name).replace(/"/g,'&quot;')}"><div><b>${x.name}</b><div class="muted">สินค้าเพิ่มเองในใบสั่งนี้</div><button class="removeMini" onclick="removeManualPOItem(${i})">ลบ</button></div><input class="poQty" type="text" inputmode="text" value="${x.qty||''}" placeholder="จำนวน"><input class="poUnit" value="${x.unit||''}" placeholder="หน่วย"></div>`).join('');box.innerHTML=`<div class="poPanel"><div class="switchRow"><input type="checkbox" id="poShowCompany" checked><label for="poShowCompany" style="margin:0">แสดงชื่อบริษัทบนหัวกระดาษ</label></div><div class="manualAdd"><h3>เพิ่มสินค้า</h3><div class="manualGrid"><input id="manualPOName" placeholder="ชื่อสินค้า"><input id="manualPOQty" type="text" inputmode="text" placeholder="จำนวน"><input id="manualPOUnit" placeholder="หน่วย"></div><button class="btn gray" style="width:100%;margin-top:10px" onclick="addManualPOItem()">+ เพิ่มเข้ารายการใบสั่ง</button></div>${lines}${manualLines}${(!lines&&!manualLines)?'<div class="empty">ยังไม่มีรายการของบริษัทนี้</div>':''}<div class="poActions"><button class="btn primary" onclick="copyPOText()">คัดลอกรายการสินค้า</button><button class="btn ok" onclick="exportPOImage()">ส่งออกเป็นรูปภาพ</button></div><button class="btn primary" style="width:100%;margin-top:10px" onclick="confirmPOOrder()">ยืนยันสั่งแล้ว</button><div class="paperPreview" id="poPreview"></div></div>`;updatePOPreview();document.querySelectorAll('.poQty,.poUnit,#poShowCompany').forEach(el=>el.addEventListener('input',updatePOPreview));}
function confirmPOOrder(){const lines=collectPOLines();if(!lines.length)return toast('กรุณาใส่จำนวนสินค้าที่ต้องการสั่ง');const supplier=currentPOSupplier||'ไม่ระบุบริษัท';purchaseOrders.unshift({id:'po_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),supplier,items:lines,orderAt:Date.now(),status:'ordered',by:nickname||'ไม่ระบุ'});poManualItems[supplier]=[];persistOrders();currentOrderSupplier=supplier;go('orderPage');toast('บันทึกการสั่งสินค้าแล้ว')}
function addManualPOItem(){const name=document.getElementById('manualPOName')?.value.trim();const qty=document.getElementById('manualPOQty')?.value.trim();const unit=document.getElementById('manualPOUnit')?.value.trim();if(!name)return toast('กรุณาใส่ชื่อสินค้า');const sp=currentPOSupplier||'ไม่ระบุบริษัท';poManualItems[sp]=poManualItems[sp]||[];poManualItems[sp].push({name,qty,unit});renderPOSupplier();toast('เพิ่มสินค้าในใบสั่งแล้ว')}
function removeManualPOItem(i){const sp=currentPOSupplier||'ไม่ระบุบริษัท';poManualItems[sp]=(poManualItems[sp]||[]).filter((_,idx)=>idx!==i);renderPOSupplier()}
function collectPOLines(){return Array.from(document.querySelectorAll('.poLine')).map(row=>({name:row.dataset.name,qty:row.querySelector('.poQty').value.trim(),unit:row.querySelector('.poUnit').value.trim()})).filter(x=>x.qty||x.unit)}
function poText(){const show=document.getElementById('poShowCompany')?.checked;const lines=collectPOLines();let out=[];if(show&&currentPOSupplier)out.push(`ใบสั่งสินค้า: ${currentPOSupplier}`);out.push(`วันที่ ${new Date().toLocaleDateString('th-TH')}`);lines.forEach((x,i)=>out.push(`${i+1}. ${x.name} ${x.qty||'-'} ${x.unit||''}`.trim()));return out.join('\n')}
function updatePOPreview(){const p=document.getElementById('poPreview');if(!p)return;const lines=collectPOLines();const show=document.getElementById('poShowCompany')?.checked;p.innerHTML=`${show?`<h3>${currentPOSupplier||''}</h3>`:''}<div style="text-align:center;font-weight:900">ใบสั่งสินค้า</div><ol>${lines.length?lines.map(x=>`<li>${x.name} ${x.qty||'-'} ${x.unit||''}</li>`).join(''):'<li>กรอกจำนวนสินค้าที่ต้องการสั่ง</li>'}</ol>`}
async function copyPOText(){const text=poText();try{await navigator.clipboard.writeText(text);toast('คัดลอกรายการแล้ว')}catch(e){toast('คัดลอกไม่ได้ กรุณาคัดลอกจากตัวอย่างด้านล่าง')}}
function exportPOImage(){updatePOPreview();toast('Beta นี้แสดงตัวอย่างกระดาษแล้ว รุ่นถัดไปจะบันทึกเข้าอัลบั้มมือถือ')}
function renderPending(){const arr=items.filter(x=>(x.supplier||'ยังไม่ได้ระบุ')==='ยังไม่ได้ระบุ');pendingBox.innerHTML=arr.length?arr.map(itemHtml).join(''):'<div class="empty">ไม่มีรายการค้างระบุบริษัท</div>'}
function renderActivity(){activityBox.innerHTML=activities.length?activities.map(a=>`<div class="item"><b>${a.action}</b><div class="muted">${a.detail||''}</div><div class="muted">โดย ${a.by||'-'} • ${fmt(a.time)}</div></div>`).join(''):'<div class="empty">ยังไม่มีกิจกรรม</div>'}
async function log(action,detail){const data={action,detail,by:nickname||'ไม่ระบุ',time:Date.now()};if(online&&db)await db.collection(ACT).add(data);else{activities.unshift({id:'a'+Date.now(),...data});persist()}}

function showCompactList(title,names){const clean=[...new Set((names||[]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'th'));document.getElementById('compactListTitle').textContent=title||'รายการสินค้าทั้งหมด';document.getElementById('compactListContent').innerHTML=clean.length?clean.map(n=>`<span class="compactNameChip">${n}</span>`).join(''):'<div class="empty">ไม่มีรายการ</div>';document.getElementById('compactListModal').classList.add('show')}
function renderCategoryChips(){const box=document.getElementById('categoryChips');if(!box)return;box.innerHTML=categories.map(c=>`<button type="button" class="chip ${c===currentCategory?'active':''}" onclick="currentCategory='${c.replace(/'/g,"\\'")}';renderCategoryChips()">${c}</button>`).join('')}
function renderSupplierOptions(){const dl=document.getElementById('supplierOptions');if(!dl)return;const set=new Set([...suppliersMaster,...items.map(x=>x.supplier).filter(x=>x&&x!=='ยังไม่ได้ระบุ')]);dl.innerHTML=[...set].sort((a,b)=>a.localeCompare(b,'th')).map(s=>`<option value="${String(s).replace(/"/g,'&quot;')}"></option>`).join('')}
function openManagePage(){go('managePage')}
function addCategory(){const v=document.getElementById('newCategoryInput').value.trim();if(!v)return toast('กรุณาใส่ชื่อหมวดหมู่');if(!categories.includes(v))categories.push(v);localStorage.setItem('stockAlertCategories',JSON.stringify(categories));document.getElementById('newCategoryInput').value='';currentCategory=v;renderManagePage();renderCategoryChips();toast('เพิ่มหมวดหมู่แล้ว')}
function addSupplier(){const v=document.getElementById('newSupplierInput').value.trim();if(!v)return toast('กรุณาใส่ชื่อบริษัท');if(!suppliersMaster.includes(v))suppliersMaster.push(v);localStorage.setItem('stockAlertSuppliers',JSON.stringify(suppliersMaster));document.getElementById('newSupplierInput').value='';renderManagePage();renderSupplierOptions();toast('เพิ่มบริษัทแล้ว')}
function renderManagePage(){const c=document.getElementById('manageCategories'),s=document.getElementById('manageSuppliers');if(c)c.innerHTML=categories.map(x=>`<div class="miniItem"><b>${x}</b><span class="meta">หมวดหมู่</span></div>`).join('')||'<div class="empty">ยังไม่มีหมวดหมู่</div>';if(s){const all=[...new Set([...suppliersMaster,...items.map(x=>x.supplier).filter(x=>x&&x!=='ยังไม่ได้ระบุ')])];s.innerHTML=all.map(x=>`<div class="miniItem"><b>${x}</b><span class="meta">บริษัท</span></div>`).join('')||'<div class="empty">ยังไม่มีบริษัท</div>'}}
function renderCategoryPage(){const box=document.getElementById('categoryBox');if(!box)return;box.innerHTML=categories.map(c=>{const count=items.filter(x=>(x.category||'เบ็ดเตล็ด')===c).length;return `<button class="catBig" onclick="openCategoryDetail('${c.replace(/'/g,"\\'")}')">${c}<span>${count} รายการ</span></button>`}).join('')||'<div class="empty">ยังไม่มีหมวดหมู่</div>'}
function openCategoryDetail(c){selectedCategory=c;document.getElementById('categoryTitle').textContent=c;go('categoryDetailPage')}
function renderCategoryDetail(){const box=document.getElementById('categoryItemsBox');if(!box)return;const arr=items.filter(x=>(x.category||'เบ็ดเตล็ด')===selectedCategory);box.innerHTML=arr.length?arr.map(x=>`<div class="miniItem"><div><b>${x.name}</b><div class="meta">สาขา ${x.branch} • ${x.status==='out'?'หมดเกลี้ยง':'เหลือ '+(x.qty||'-')+' '+(x.unit||'')}</div></div><span class="pill ${x.status==='out'?'red':'yellow'}">${x.status==='out'?'หมด':'เหลือน้อย'}</span></div>`).join(''):'<div class="empty">ยังไม่มีสินค้าในหมวดหมู่นี้</div>'}

function bindSearch(){homeSearch.addEventListener('input',renderHomeSearch)}function closeModal(id){document.getElementById(id).classList.remove('show')}function reloadApp(){renderAll();toast('อัปเดตข้อมูลล่าสุดแล้ว')}function toast(t){const el=document.getElementById('toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)}function formatNumber(n){return Number.isInteger(n)?String(n):String(n).replace(/\.?0+$/,'')}function norm(s){return String(s||'').toLowerCase().replace(/\s+/g,'').trim()}function fmt(t){if(!t)return'-';const d=new Date(t);return d.toLocaleString('th-TH',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}

/* === Stock Alert Beta 2.0 override layer === */
const ORDERS='stock_alert_beta1_purchase_orders';
const DELIVERIES='stock_alert_beta1_delivery_history';
const CATEGORIES='stock_alert_beta1_categories';
const SUPPLIERS='stock_alert_beta1_suppliers';
const TRANSFER_HISTORY='stock_alert_beta1_transfer_history';
let transferHistory=JSON.parse(localStorage.getItem('stockAlertTransferHistory')||'[]');
let transferDecision='remove';
let shortageSameTarget=null;
let listDetailed=false;
let orderDetailed=false;
let lastFormReturn='home';
function todayKey(ts=Date.now()){const d=new Date(ts);return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`}
function dayDiff(ts){const a=new Date();a.setHours(0,0,0,0);const b=new Date(ts||Date.now());b.setHours(0,0,0,0);return Math.round((a-b)/86400000)}
function thaiDate(ts){return new Date(ts||Date.now()).toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'numeric'})}
function relDate(ts){const d=dayDiff(ts);if(d===0)return `<b>วันนี้</b> <span>${thaiDate(ts)}</span>`;if(d===1)return `<b>เมื่อวาน</b> <span>${thaiDate(ts)}</span>`;return `<span>${thaiDate(ts)}</span>`}
function escapeHtml(v){return String(v??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function splitSuppliers(v){return String(v||'').split(/[\/,C、]/).map(x=>x.trim()).filter(x=>x&&x!=='ยังไม่ได้ระบุ')}
function orderCompaniesForName(name){const n=norm(name);const set=new Set();purchaseOrders.forEach(o=>{(o.items||[]).forEach(it=>{if(norm(it.name)===n)set.add(o.supplier||'ไม่ระบุบริษัท')})});return [...set]}
function isOrderedName(name){return orderCompaniesForName(name).length>0}
function saveCloudArray(coll, arr){localStorage.setItem(coll, JSON.stringify(arr)); if(online&&db){return db.collection(coll).doc('main').set({items:arr,updatedAt:Date.now()},{merge:true}).catch(()=>{})}}
function persistOrders(){localStorage.setItem('stockAlertPurchaseOrders',JSON.stringify(purchaseOrders));localStorage.setItem('stockAlertDeliveryHistory',JSON.stringify(deliveryHistory));localStorage.setItem('stockAlertTransferHistory',JSON.stringify(transferHistory));if(online&&db){db.collection(ORDERS).doc('main').set({items:purchaseOrders,updatedAt:Date.now()},{merge:true}).catch(()=>{});db.collection(DELIVERIES).doc('main').set({items:deliveryHistory,updatedAt:Date.now()},{merge:true}).catch(()=>{});db.collection(TRANSFER_HISTORY).doc('main').set({items:transferHistory,updatedAt:Date.now()},{merge:true}).catch(()=>{});}renderAll()}
function listen(){if(online&&db){db.collection(COLLECTION).onSnapshot(s=>{items=s.docs.map(d=>({id:d.id,...d.data()}));renderAll();document.getElementById('syncText').textContent='Sync Firebase พร้อมใช้งาน';},e=>{online=false;loadLocal();});db.collection(ACT).orderBy('time','desc').limit(80).onSnapshot(s=>{activities=s.docs.map(d=>({id:d.id,...d.data()}));renderActivity();});db.collection(ORDERS).doc('main').onSnapshot(d=>{if(d.exists){purchaseOrders=d.data().items||[];localStorage.setItem('stockAlertPurchaseOrders',JSON.stringify(purchaseOrders));renderAll();}});db.collection(DELIVERIES).doc('main').onSnapshot(d=>{if(d.exists){deliveryHistory=d.data().items||[];localStorage.setItem('stockAlertDeliveryHistory',JSON.stringify(deliveryHistory));renderAll();}});db.collection(CATEGORIES).doc('main').onSnapshot(d=>{if(d.exists){categories=d.data().items||categories;localStorage.setItem('stockAlertCategories',JSON.stringify(categories));renderAll();}});db.collection(SUPPLIERS).doc('main').onSnapshot(d=>{if(d.exists){suppliersMaster=d.data().items||suppliersMaster;localStorage.setItem('stockAlertSuppliers',JSON.stringify(suppliersMaster));renderAll();}});db.collection(TRANSFER_HISTORY).doc('main').onSnapshot(d=>{if(d.exists){transferHistory=d.data().items||[];localStorage.setItem('stockAlertTransferHistory',JSON.stringify(transferHistory));renderAll();}});}else loadLocal()}
function addCategory(){const v=document.getElementById('newCategoryInput').value.trim();if(!v)return toast('กรุณาใส่ชื่อหมวดหมู่');if(!categories.includes(v))categories.push(v);localStorage.setItem('stockAlertCategories',JSON.stringify(categories));if(online&&db)db.collection(CATEGORIES).doc('main').set({items:categories,updatedAt:Date.now()},{merge:true});document.getElementById('newCategoryInput').value='';currentCategory=v;renderManagePage();renderCategoryChips();toast('เพิ่มหมวดหมู่แล้ว')}
function addSupplier(){const v=document.getElementById('newSupplierInput').value.trim();if(!v)return toast('กรุณาใส่ชื่อบริษัท');if(!suppliersMaster.includes(v))suppliersMaster.push(v);localStorage.setItem('stockAlertSuppliers',JSON.stringify(suppliersMaster));if(online&&db)db.collection(SUPPLIERS).doc('main').set({items:suppliersMaster,updatedAt:Date.now()},{merge:true});document.getElementById('newSupplierInput').value='';renderManagePage();renderSupplierOptions();toast('เพิ่มบริษัทแล้ว')}
function renderAll(){const total=items.length, orders=orderGroups().length, transfers=transferTasks().length, unknown=items.filter(x=>(x.supplier||'ยังไม่ได้ระบุ')==='ยังไม่ได้ระบุ').length;if(typeof statShortage!='undefined'){statShortage.textContent=total;statOrder.textContent=orders;statTransfer.textContent=transfers;statSupplier.textContent=unknown;}bellBadge.textContent=activities.length||0;renderHomeSearch();renderAllShortage();renderTransferAlerts();try{renderList()}catch(e){};renderTransfers();renderTransferStatus();renderOrders();renderPOBuilder();renderOrderSupplier();renderDeliveredPage();renderDeliveryHistory();renderPending();renderCategoryPage();renderManagePage();renderSupplierOptions();}
function openList(mode, detailed=false){listMode=mode;listDetailed=!!detailed;go('listPage');document.getElementById('listTitle').textContent=mode==='branch1'?'รายการของขาด สาขา 1':mode==='branch2'?'รายการของขาด สาขา 2':'ของขาดทั้งหมด';document.getElementById('listSub').textContent=mode==='all'?'รวมรายการจากสาขา 1 และสาขา 2':'ดูรายการแบบย่อ';const act=document.getElementById('listTopActions');if(act){act.innerHTML=mode==='all'?`<div class="categoryShortcut" onclick="go('categoryPage')"><div class="ico cat1">${icons.category}</div><div><b>หมวดหมู่</b><div class="muted">แยกดูสินค้าของขาดตามหมวดหมู่</div></div></div>`:'';}renderList()}
function compactItemHtml(x){const sp=orderCompaniesForName(x.name);const sLine=sp.length?`สั่ง: ${sp.join(', ')}`:((x.supplier&&x.supplier!=='ยังไม่ได้ระบุ')?`สั่ง: ${x.supplier}`:'สั่ง: ยังไม่ได้ระบุ');return `<div class="compactItemCard"><div><b>${escapeHtml(x.name)}</b><div class="tiny">สาขา ${x.branch}: ${x.status==='out'?'หมดเกลี้ยง':'เหลือ '+(x.qty||'-')+' '+(x.unit||'')}</div><div class="tiny">${escapeHtml(sLine)}</div></div><span class="pill ${x.status==='out'?'red':'yellow'}">${x.status==='out'?'หมด':'เหลือน้อย'}</span></div>`}
function compactGroupHtml(g){const b1=branchText(g.b1), b2=branchText(g.b2);let pill='';let unit='',total=0,hasLow=false,hasOut=false;[g.b1,g.b2].forEach(x=>{if(!x)return;if(x.status==='out')hasOut=true;else{hasLow=true;unit=unit||x.unit||'';let n=parseFloat(String(x.qty||'').replace(/,/g,''));if(!isNaN(n))total+=n;}});pill=hasLow?`<span class="pill yellow">เหลือรวม ${formatNumber(total)} ${unit}</span>`:(hasOut?'<span class="pill red">หมดเกลี้ยง</span>':'');return `<div class="compactItemCard"><div><b>${escapeHtml(g.name)}</b><div class="tiny">สาขา 1: ${b1}</div><div class="tiny">สาขา 2: ${b2}</div></div>${pill}</div>`}
function itemHtmlLite(x){return compactItemHtml(x)}
function renderList(){let arr=items;const searchEl=document.getElementById('listSearch');const q=norm(searchEl?.value||'');const detailBtn=`<button class="detailLink detailModeBtn" onclick="listDetailed=!listDetailed;renderList()">${listDetailed?'แบบย่อ':'รายละเอียด'}</button>`;if(listMode==='all'){let gs=groups();if(q)gs=gs.filter(g=>norm(g.name).includes(q));const quick=`<div class="topMiniActions"><button class="miniViewBtn" onclick="showCompactList('ของขาดทั้งหมด', groups().map(g=>g.name))">ดูรายการทั้งหมด</button>${detailBtn}</div>`;document.getElementById('listBox').innerHTML=gs.length?quick+gs.sort((a,b)=>a.name.localeCompare(b.name,'th')).map(g=>listDetailed?groupItemHtml(g):compactGroupHtml(g)).join(''):'<div class="empty">ยังไม่มีรายการ</div>';return}if(listMode==='branch1')arr=items.filter(x=>x.branch==1);if(listMode==='branch2')arr=items.filter(x=>x.branch==2);if(q)arr=arr.filter(x=>norm(x.name).includes(q));const br=listMode==='branch1'?1:2;const title=`ของขาดสาขา ${br}`;document.getElementById('listBox').innerHTML=arr.length?`<div class="topMiniActions"><button class="miniViewBtn" onclick="showCompactList('${title}', items.filter(x=>x.branch==${br}).map(x=>x.name))">ดูรายการทั้งหมด</button>${detailBtn}</div>`+arr.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).map(x=>listDetailed?itemHtml(x):compactItemHtml(x)).join(''):'<div class="empty">ยังไม่มีรายการ</div>'}
function renderOrders(){const box=document.getElementById('orderBox');if(!box)return;const gs=orderGroups();const list=gs.map(g=>{const ordered=isOrderedName(g.name);const sp=[...new Set([...(g.b1?splitSuppliers(g.b1.supplier):[]),...(g.b2?splitSuppliers(g.b2.supplier):[]),...orderCompaniesForName(g.name)])];const sup=sp.length?`สั่ง: ${sp.join(', ')}`:'สั่ง: ยังไม่ได้ระบุ';return `<div class="compactItemCard"><div><b>${escapeHtml(g.name)}</b><div class="tiny">สาขา 1: ${branchText(g.b1)}</div><div class="tiny">สาขา 2: ${branchText(g.b2)}</div><div class="tiny">${escapeHtml(sup)}</div></div><span class="miniStatus ${ordered?'ordered':'notordered'}">${ordered?'สั่งแล้ว':'ยังไม่สั่ง'}</span></div>`}).join('');box.innerHTML=`<div class="listHeadLine"><div><h3>รายการที่ต้องสั่ง</h3><small>หมดทั้ง 2 สาขา</small></div><button class="miniViewBtn" onclick="showCompactList('รายการที่ต้องสั่ง', orderGroups().map(g=>g.name))">ดูรายการทั้งหมด</button></div>${list||'<div class="empty">ยังไม่มีรายการที่ต้องสั่ง</div>'}`}
function renderPOBuilder(){const box=document.getElementById('poSupplierBox');if(!box)return;const map=supplierGroupsForPO();const names=Object.keys(map).sort((a,b)=>a.localeCompare(b,'th'));box.innerHTML=names.length?`<div class="supplierList">${names.map(n=>`<button class="supplierBtn" onclick="openPOSupplier('${encodeURIComponent(n)}')"><span>${escapeHtml(n)}</span><span class="count">${map[n].length} รายการ</span></button>`).join('')}</div>`:'<div class="empty">ยังไม่มีข้อมูลบริษัท<br><br>ถ้าตอนลงของขาดมีการใส่ชื่อบริษัท บริษัทนั้นจะมาเป็นตัวเลือกในหน้านี้</div>'}
function confirmPOOrder(){const lines=collectPOLines();if(!lines.length)return toast('กรุณาใส่จำนวนสินค้าที่ต้องการสั่ง');const supplier=currentPOSupplier||'ไม่ระบุบริษัท';const order={id:'po_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),supplier,items:lines,orderAt:Date.now(),status:'ordered',by:nickname||'ไม่ระบุ'};purchaseOrders.unshift(order);poManualItems[supplier]=[];persistOrders();currentOrderSupplier=supplier;go('orderPage');toast('บันทึกการสั่งสินค้าแล้ว')}
function receiveLabel(o){return o.receiveSubmitted?'<div class="sentWrap"><div class="sentBox">ส่งข้อมูลแล้ว</div><button class="editMini" onclick="editReceiveOrder(\''+o.id+'\')">แก้ไข</button></div>':`<button class="btn ok" onclick="receiveOrderComplete('${o.id}', this)">สินค้ามาครบ</button><button class="btn gray" onclick="openPartialReceive('${o.id}')">มาไม่ครบ</button>`}
function renderReceiveSupplier(){const title=document.getElementById('receiveSupplierTitle'),box=document.getElementById('receiveSupplierBox');if(!box)return;const supplier=currentOrderSupplier||'';title.textContent=`สินค้ามาส่ง ${supplier}`;const rows=purchaseOrders.filter(o=>(o.supplier||'ไม่ระบุบริษัท')===supplier&&o.status!=='delivered');box.innerHTML=rows.length?rows.map(o=>`<div class="batchCard"><div class="batchHead"><div><b>${escapeHtml(supplier)}</b><div class="muted">ยืนยันสั่ง: ${fmt(o.orderAt)}</div>${o.receiveSubmitted?'<div class="batchTag" style="display:inline-block;margin-top:6px">ส่งข้อมูลแล้ว</div>':'<div class="batchTag" style="display:inline-block;margin-top:6px">รอรับสินค้า</div>'}</div><span class="batchTag">${o.items.length} รายการ</span></div><div class="batchItems">${o.items.map(x=>`<div class="batchItem"><span>${escapeHtml(x.name)}</span><span>${x.qty||'-'} ${x.unit||''}</span></div>`).join('')}</div><div class="receiveActions" id="receiveActions_${o.id}">${receiveLabel(o)}</div></div>`).join(''):'<div class="empty">ไม่มีรายการที่รอตรวจรับของบริษัทนี้</div>'}
function deliveredArchive(supplier,deliveredItems,missingItems,orderAt,orderId){if(!deliveredItems.length&&!missingItems.length)return;if(orderId&&deliveryHistory.some(d=>d.orderId===orderId))return;deliveryHistory.unshift({id:'del_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),orderId,supplier,deliveredItems,missingItems,orderAt,receivedAt:Date.now(),by:nickname||'ไม่ระบุ'});removeDeliveredShortages(deliveredItems,supplier)}
function receiveOrderComplete(id,btn){const o=purchaseOrders.find(x=>x.id===id);if(!o)return;if(o.receiveSubmitted)return toast('รายการนี้ส่งข้อมูลแล้ว');if(!confirm('ยืนยันว่าสินค้ามาครบและส่งข้อมูลใช่ไหม?'))return;o.receiveSubmitted=true;o.receiveResult='complete';markReceiveSent(id);deliveredArchive(o.supplier,o.items,[],o.orderAt,o.id);o.status='delivered';persistOrders();toast('ส่งข้อมูลแล้ว')}
function confirmPartialReceive(){const o=purchaseOrders.find(x=>x.id===currentReceiveOrderId);if(!o)return;if(o.receiveSubmitted)return toast('รายการนี้ส่งข้อมูลแล้ว');const missingIdx=new Set(Array.from(document.querySelectorAll('#partialItemsBox input:checked')).map(x=>Number(x.value)));const missing=o.items.filter((_,i)=>missingIdx.has(i));const delivered=o.items.filter((_,i)=>!missingIdx.has(i));if(!confirm('ยืนยันส่งข้อมูลรับสินค้าไม่ครบใช่ไหม?'))return;deliveredArchive(o.supplier,delivered,missing,o.orderAt,o.id);o.receiveSubmitted=true;o.receiveResult='partial';if(missing.length){o.items=missing;o.status='partial';o.updatedAt=Date.now()}else{o.status='delivered'}persistOrders();currentOrderSupplier=o.supplier;go('receiveSupplierPage');toast('ส่งข้อมูลแล้ว')}
function recentDeliveries(){return deliveryHistory.filter(d=>dayDiff(d.receivedAt)<=1).sort((a,b)=>(b.receivedAt||0)-(a.receivedAt||0))}
function historyDeliveries(){return deliveryHistory.filter(d=>dayDiff(d.receivedAt)>1).sort((a,b)=>(b.receivedAt||0)-(a.receivedAt||0))}
function renderDeliveredPage(){const box=document.getElementById('deliveredBox');if(!box)return;const rows=recentDeliveries();const names=[...new Set(rows.map(x=>x.supplier||'ไม่ระบุบริษัท'))];box.innerHTML=names.length?`<div class="supplierList">${names.map(n=>{const ds=rows.filter(d=>(d.supplier||'ไม่ระบุบริษัท')===n);const latest=ds[0]?.receivedAt;const count=ds.reduce((s,d)=>s+(d.deliveredItems||[]).length,0);return `<button class="supplierBtn" onclick="openDeliveredSupplier('${encodeURIComponent(n)}')"><span><b>${escapeHtml(n)}</b><div class="todayText">${relDate(latest)}</div></span><span class="count">${count} รายการ</span></button>`}).join('')}</div>`:'<div class="empty">ยังไม่มีข้อมูลของมาส่งแล้ว</div>'}
function renderDeliveryHistory(){const box=document.getElementById('deliveryHistoryBox');if(!box)return;const arr=historyDeliveries();box.innerHTML=arr.length?arr.map(d=>`<button class="historyRow" onclick="openDeliveryHistoryDetail('${d.id}')"><b>${escapeHtml(d.supplier)}</b><div class="meta">มาส่ง ${fmt(d.receivedAt)} • มาแล้ว ${d.deliveredItems.length} รายการ${d.missingItems?.length?' • ค้างส่ง '+d.missingItems.length+' รายการ':''}</div></button>`).join(''):'<div class="empty">ยังไม่มีประวัติการส่งสินค้า</div>'}
function transferRound(from,to){return transferHistory.filter(h=>h.from==from&&h.to==to&&todayKey(h.doneAt)===todayKey()).length+1}
function renderTransferAlerts(){const dirs=[transferSummary(1,2),transferSummary(2,1)];const active=dirs.filter(d=>d.started);transferAlerts.innerHTML=active.map(d=>`<div class="alertCard ${d.complete?'done':''}" onclick="openStatusDirection(${d.from},${d.to})"><h3>สาขา ${d.from} ${d.complete?'แบ่งของครบทุกรายการแล้ว':'เริ่มแบ่งของบางส่วนแล้ว'}</h3><p>กดดูสถานะการแบ่งของ</p><div class="transferRound">รอบที่ ${transferRound(d.from,d.to)}</div></div>`).join('')}
function renderTransfers(){const from=transferFrom||1,to=transferTo||2;const tasks=transferTasksByDirection(from,to);transferBox.innerHTML=tasks.length?tasks.map(t=>`<div class="item"><div class="itemTop"><div><b>${escapeHtml(t.need.name)}</b><div class="muted">สาขา ${t.from} → สาขา ${t.to}</div><div class="muted">สถานะของสาขา ${t.to}: ${branchText(t.need)}</div>${t.need.transferPrepared?`<div class="muted">แบ่งแล้ว: ${t.need.transferQty||'-'} ${t.need.transferUnit||''} โดย ${t.need.transferBy||'-'} เวลา ${fmt(t.need.transferAt)}</div>`:''}</div>${t.need.transferPrepared?'<span class="pill green">แบ่งแล้ว</span>':'<span class="pill blue">รอแบ่ง</span>'}</div><div class="rowBtns"><button class="btn ok" onclick="openTransfer('${t.need.id}',${t.from},${t.to})">${t.need.transferPrepared?'แก้ไขจำนวน':'แบ่งแล้ว'}</button><button class="btn gray" onclick="openSameShortage('${t.need.id}',${t.from},${t.to})">หมดเหมือนกัน</button></div></div>`).join(''):'<div class="empty">ยังไม่มีรายการที่ต้องแบ่งในทิศทางนี้</div>'}
function openTransfer(id,from,to){const it=items.find(x=>x.id===id);transferTarget={id,from,to};tmTitle.textContent=it.name;tmSub.textContent=`สาขา ${from} → สาขา ${to}`;tmQty.value=it.transferQty||'';tmUnit.value=it.transferUnit||it.unit||'';let old=document.getElementById('transferDecisionBox');if(!old){const btn=document.querySelector('#transferModal .btn.ok');const div=document.createElement('div');div.id='transferDecisionBox';div.innerHTML=`<label>หลังรับ/ส่งแล้ว รายการนี้</label><div class="choiceBox"><button type="button" id="decRemove" onclick="setTransferDecision('remove')">ไม่ต้องสั่งแล้ว</button><button type="button" id="decKeep" onclick="setTransferDecision('keep')">ยังต้องสั่ง</button></div>`;btn.parentNode.insertBefore(div,btn)}setTransferDecision(it.transferDecision||'remove');document.getElementById('transferModal').classList.add('show')}
function setTransferDecision(v){transferDecision=v;const a=document.getElementById('decRemove'),b=document.getElementById('decKeep');if(a&&b){a.className=v==='remove'?'active':'';b.className=v==='keep'?'active':''}}
async function confirmTransfer(){if(!transferTarget)return;const q=tmQty.value.trim(),u=tmUnit.value.trim();await updateDoc(transferTarget.id,{transferPrepared:true,transferDone:false,transferQty:q,transferUnit:u,transferBy:nickname||'ไม่ระบุ',transferAt:Date.now(),transferDecision});const it=items.find(x=>x.id===transferTarget.id);log(`สาขา ${transferTarget.from} แบ่งของ`,it?.name||'');closeModal('transferModal');toast('บันทึกการแบ่งแล้ว')}
function renderTransferStatusDetail(){const d=transferSummary(statusFrom||1,statusTo||2);const pct=d.total?Math.round((d.done/d.total)*100):0;const color=statusColor(pct,d.complete);let statusText='ยังไม่ได้เริ่มแบ่ง';if(d.complete)statusText='แบ่งของครบทุกรายการแล้ว';else if(d.started)statusText='เริ่มแบ่งแล้วบางส่วน';const tasks=transferTasksByDirection(d.from,d.to);const details=tasks.map(t=>`<div class="item"><div class="itemTop"><div><b>${escapeHtml(t.need.name)}</b><div class="muted">${t.need.transferPrepared?`แบ่งแล้ว ${t.need.transferQty||'-'} ${t.need.transferUnit||''} โดย ${t.need.transferBy||'-'} เวลา ${fmt(t.need.transferAt)}`:'ยังไม่ได้แบ่ง'}</div></div>${t.need.transferPrepared?'<span class="pill green">แบ่งแล้ว</span>':'<span class="pill blue">ยังไม่แบ่ง</span>'}</div></div>`).join('');transferStatusDetailBox.innerHTML=`<div class="statusHero"><div class="statusIcon ${color}">↔</div><div class="smallTitle">สาขา ${d.from} → สาขา ${d.to}</div><h2 style="margin:8px 0 6px">${statusText}</h2><div class="progressOuter"><div class="progressBar ${color}" style="width:${pct}%"></div></div><div class="bigPercent">${pct}%</div><div class="statusRows"><div class="statusRow"><span>ทั้งหมด</span><span>${d.total} รายการ</span></div><div class="statusRow"><span>แบ่งแล้ว</span><span>${d.done} รายการ</span></div><div class="statusRow"><span>ยังไม่แบ่ง</span><span>${d.remain} รายการ</span></div></div><button class="btn cleanListBtn" onclick="document.getElementById('statusDetailList').style.display=document.getElementById('statusDetailList').style.display==='none'?'block':'none'">ดูรายการทั้งหมด</button>${d.complete?`<button class="btn confirmDone" onclick="confirmTransferReceived(${d.from},${d.to})">ยืนยันรับ/ส่งของแล้ว</button>`:''}</div><div id="statusDetailList" style="display:none;margin-top:12px">${details||'<div class="empty">ยังไม่มีรายการ</div>'}</div>`}
async function confirmTransferReceived(from,to){const tasks=transferTasksByDirection(from,to);if(!tasks.length)return;if(!confirm('ยืนยันว่ามีการรับ/ส่งของแล้วใช่ไหม?'))return;const hist={id:'tr_'+Date.now(),from,to,round:transferRound(from,to),doneAt:Date.now(),items:tasks.map(t=>({name:t.need.name,qty:t.need.transferQty,unit:t.need.transferUnit,decision:t.need.transferDecision||'remove',needId:t.need.id}))};transferHistory.unshift(hist);for(const t of tasks){const it=t.need;if((it.transferDecision||'remove')==='remove'){if(online&&db)await db.collection(COLLECTION).doc(it.id).delete();else items=items.filter(x=>x.id!==it.id)}else{const old=parseFloat(it.qty||'0')||0;const add=parseFloat(it.transferQty||'0')||0;await updateDoc(it.id,{qty:String(old+add),status:'low',transferPrepared:false,transferDone:false,transferQty:'',transferUnit:it.unit||it.transferUnit||''})}}persistOrders();log('รับ/ส่งของแบ่งแล้ว',`สาขา ${from} → สาขา ${to}`);go('home');toast('ปิดรอบแบ่งแล้ว')}
function openSameShortage(id,from,to){const it=items.find(x=>x.id===id);if(!it)return;shortageSameTarget={it,branch:from};let m=document.getElementById('sameShortageModal');if(!m){m=document.createElement('div');m.id='sameShortageModal';m.className='modal';document.body.appendChild(m)}const cats=categories.map(c=>`<button type="button" class="chip ${c===(it.category||'เบ็ดเตล็ด')?'active':''}" onclick="document.querySelectorAll('#sameCatChips .chip').forEach(x=>x.classList.remove('active'));this.classList.add('active');this.dataset.sel='1'" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');m.innerHTML=`<div class="sheet"><h2>บันทึกว่าหมดเหมือนกัน</h2><p class="muted">${escapeHtml(it.name)} • สาขา ${from}</p><label>สถานะ</label><div class="seg"><button id="sameOut" class="active out" onclick="sameSetStatus('out')">หมดเกลี้ยง</button><button id="sameLow" onclick="sameSetStatus('low')">เหลือน้อย</button></div><div id="sameQtyField" style="display:none"><label>จำนวนคงเหลือ</label><input class="input" id="sameQty" type="text" inputmode="text"><label>หน่วย</label><input class="input" id="sameUnit" value="${escapeHtml(it.unit||'')}"></div><label>หมวดหมู่</label><div id="sameCatChips" class="chips">${cats}</div><label>บริษัทผู้จำหน่าย</label><input class="input" id="sameSupplier" value="${escapeHtml(it.supplier||'')}" list="supplierOptions"><button class="btn primary" style="width:100%;margin-top:12px" onclick="saveSameShortage()">บันทึก</button><button class="btn gray" style="width:100%;margin-top:8px" onclick="closeModal('sameShortageModal')">ยกเลิก</button></div>`;m.classList.add('show')}
function sameSetStatus(s){document.getElementById('sameOut').className=s==='out'?'active out':'';document.getElementById('sameLow').className=s==='low'?'active low':'';document.getElementById('sameQtyField').style.display=s==='low'?'block':'none'}
async function saveSameShortage(){const it=shortageSameTarget.it;const br=shortageSameTarget.branch;const status=document.getElementById('sameLow').classList.contains('active')?'low':'out';if(status==='low'&&!document.getElementById('sameQty').value.trim())return toast('กรุณาใส่จำนวนคงเหลือ');const active=document.querySelector('#sameCatChips .chip.active');const data={name:it.name,search:norm(it.name),branch:br,status,qty:status==='low'?document.getElementById('sameQty').value.trim():'',unit:status==='low'?document.getElementById('sameUnit').value.trim():(it.unit||''),supplier:document.getElementById('sameSupplier').value.trim()||it.supplier||'ยังไม่ได้ระบุ',category:active?.dataset.cat||it.category||'เบ็ดเตล็ด',note:'บันทึกจากหน้าแบ่งของ',createdAt:Date.now(),createdBy:nickname||'ไม่ระบุ',updatedAt:Date.now(),updatedBy:nickname||'ไม่ระบุ',transferPrepared:false,transferDone:false};await addDoc(data);closeModal('sameShortageModal');toast('เพิ่มเข้าของขาดแล้ว')}

/* === Beta 2.2 overrides: compact chip pages + detail pages + bottom nav === */
function chipNamesHtml(names){
  const clean=[...new Set((names||[]).filter(Boolean).map(x=>String(x).trim()).filter(Boolean))];
  if(!clean.length) return '<div class="empty">ยังไม่มีรายการ</div>';
  return `<div class="nameChipWrap">${clean.map(n=>`<span class="nameChip">${escapeHtml(n)}</span>`).join('')}</div>`;
}
function suppliersForGroup(g){
  const arr=[];
  [g.b1,g.b2].forEach(x=>{ if(x && x.supplier) arr.push(...splitSuppliers(x.supplier)); });
  arr.push(...orderCompaniesForName(g.name));
  return [...new Set(arr.filter(x=>x&&x!=='ยังไม่ได้ระบุ'))];
}
function groupItemHtml(g){
  const b1=branchText(g.b1), b2=branchText(g.b2);
  let total=0, unit='', hasLow=false, hasOut=false;
  [g.b1,g.b2].forEach(x=>{if(!x)return;if(x.status==='out')hasOut=true;else{hasLow=true;unit=unit||x.unit||'';const n=parseFloat(String(x.qty||'').replace(/,/g,''));if(!isNaN(n))total+=n;}});
  const pill=hasLow&&total>0?`<span class="pill yellow">เหลือรวม ${formatNumber(total)} ${unit}</span>`:hasOut?'<span class="pill red">หมดเกลี้ยง</span>':'<span class="pill blue">ดูรายละเอียด</span>';
  const suppliers=suppliersForGroup(g);
  const by1=g.b1?`<div class="muted">สาขา 1: ${b1} • ผู้ลง: ${escapeHtml(g.b1.createdBy||'-')}</div>`:`<div class="muted">สาขา 1: ${b1}</div>`;
  const by2=g.b2?`<div class="muted">สาขา 2: ${b2} • ผู้ลง: ${escapeHtml(g.b2.createdBy||'-')}</div>`:`<div class="muted">สาขา 2: ${b2}</div>`;
  return `<div class="item"><div class="itemTop"><div><b>${escapeHtml(g.name)}</b><div class="branchBlock">${by1}${by2}</div><div class="muted">สั่ง: ${escapeHtml(suppliers.length?suppliers.join(', '):'ยังไม่ได้ระบุ')}</div></div>${pill}</div></div>`;
}
function openList(mode, detailed=false){
  listMode=mode; listDetailed=!!detailed;
  go('listPage');
  document.getElementById('listTitle').textContent=mode==='branch1'?'รายการของขาด สาขา 1':mode==='branch2'?'รายการของขาด สาขา 2':'ของขาดทั้งหมด';
  document.getElementById('listSub').textContent=mode==='all'?'รวมรายการจากสาขา 1 และสาขา 2':'ดูรายชื่อสินค้าแบบย่อ';
  renderList();
}
function renderList(){
  const page=document.getElementById('listPage');
  const searchCard=document.querySelector('#listPage .searchCard');
  const searchEl=document.getElementById('listSearch');
  const q=norm(searchEl?.value||'');
  if(page) page.classList.toggle('listPageCompact',!listDetailed);
  if(searchCard) searchCard.style.display=listDetailed?'block':'none';
  const act=document.getElementById('listTopActions');
  if(act){
    const cat=listMode==='all'?`<div class="categoryShortcut" onclick="go('categoryPage')"><div class="ico cat1">${icons.category}</div><div><b>หมวดหมู่</b><div class="muted">แยกดูสินค้าของขาดตามหมวดหมู่</div></div></div>`:'';
    const btn=`<div class="detailTop"><button class="detailLink" onclick="listDetailed=!listDetailed; if(listDetailed&&listSearch)listSearch.value=''; renderList()">${listDetailed?'แบบย่อ':'รายละเอียด'}</button></div>`;
    act.innerHTML=cat+btn;
  }
  const box=document.getElementById('listBox'); if(!box)return;
  if(listMode==='all'){
    let gs=groups();
    if(q) gs=gs.filter(g=>norm(g.name).includes(q));
    if(!listDetailed){ box.innerHTML=chipNamesHtml(gs.sort((a,b)=>a.name.localeCompare(b.name,'th')).map(g=>g.name)); return; }
    box.innerHTML=gs.length?gs.sort((a,b)=>a.name.localeCompare(b.name,'th')).map(groupItemHtml).join(''):'<div class="empty">ยังไม่มีรายการ</div>';
    return;
  }
  const br=listMode==='branch1'?1:2;
  let arr=items.filter(x=>x.branch==br);
  if(q) arr=arr.filter(x=>norm(x.name).includes(q));
  if(!listDetailed){ box.innerHTML=chipNamesHtml(arr.sort((a,b)=>String(a.name).localeCompare(String(b.name),'th')).map(x=>x.name)); return; }
  box.innerHTML=arr.length?arr.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).map(itemHtml).join(''):'<div class="empty">ยังไม่มีรายการ</div>';
}
function renderOrders(){
  const box=document.getElementById('orderBox'); if(!box)return;
  const gs=orderGroups();
  const btn=`<button class="detailLink miniDetailButton" onclick="orderDetailed=!orderDetailed;renderOrders()">${orderDetailed?'แบบย่อ':'รายละเอียด'}</button>`;
  if(!orderDetailed){
    box.innerHTML=`<div class="cleanTitleRow"><div><h3 style="margin:0">รายการที่ต้องสั่ง</h3><small>หมดทั้ง 2 สาขา</small></div>${btn}</div>${chipNamesHtml(gs.map(g=>g.name))}`;
    return;
  }
  const list=gs.map(g=>{
    const ordered=isOrderedName(g.name);
    const sp=suppliersForGroup(g);
    const sup=sp.length?`สั่ง: ${sp.join(', ')}`:'สั่ง: ยังไม่ได้ระบุ';
    return `<div class="compactItemCard"><div><b>${escapeHtml(g.name)}</b><div class="tiny">สาขา 1: ${branchText(g.b1)}</div><div class="tiny">สาขา 2: ${branchText(g.b2)}</div><div class="tiny">${escapeHtml(sup)}</div></div><span class="miniStatus ${ordered?'ordered':'notordered'}">${ordered?'สั่งแล้ว':'ยังไม่สั่ง'}</span></div>`
  }).join('');
  box.innerHTML=`<div class="cleanTitleRow"><div><h3 style="margin:0">รายการที่ต้องสั่ง</h3><small>หมดทั้ง 2 สาขา</small></div>${btn}</div>${list||'<div class="empty">ยังไม่มีรายการที่ต้องสั่ง</div>'}`;
}



/* === V3.1 summary + delivered bill layout overrides === */
function dateOnly(ts){return ts?new Date(ts).toLocaleDateString('th-TH',{day:'2-digit',month:'2-digit',year:'numeric'}):'-'}
function bestSellerRows(){
  const now=Date.now(), ten=30*24*60*60*1000;
  const map=new Map();
  (items||[]).forEach(it=>{
    const t=it.createdAt||it.updatedAt||0;
    if(now-t>ten) return;
    const key=norm(it.name||''); if(!key) return;
    const old=map.get(key)||{name:it.name,count:0,last:0};
    old.count+=1; old.last=Math.max(old.last,t); old.name=old.name||it.name;
    map.set(key,old);
  });
  return [...map.values()].sort((a,b)=>(b.count-a.count)||(b.last-a.last)).slice(0,5);
}
function renderBestSellers(){
  const box=document.getElementById('bestSellerBox'); if(!box) return;
  const rows=bestSellerRows();
  box.innerHTML=rows.length?rows.map((r,i)=>`<div class="rankCard"><div class="rankNo">${i+1}</div><div class="rankName">${escapeHtml(r.name)}</div><div class="rankCount">${r.count} ครั้ง</div></div>`).join(''):'<div class="empty">ยังไม่มีข้อมูลพอสำหรับจัดอันดับ</div>';
}
function renderDeliveredSupplier(){
  const title=document.getElementById('deliveredSupplierTitle'),box=document.getElementById('deliveredSupplierBox');
  if(!box) return;
  const supplier=currentOrderSupplier||'';
  title.textContent=`ของมาส่งแล้ว ${supplier}`;
  const rows=(typeof recentDeliveries==='function'?recentDeliveries():deliveryHistory).filter(d=>(d.supplier||'ไม่ระบุบริษัท')===supplier).sort((a,b)=>(b.receivedAt||0)-(a.receivedAt||0));
  box.innerHTML=rows.length?rows.map(d=>`<div class="deliveredBillCard"><div class="deliveredDates"><div>วันที่สั่ง: ${dateOnly(d.orderAt)}</div><div>วันที่ส่ง: ${dateOnly(d.receivedAt)}</div></div>${(d.deliveredItems||[]).map(x=>`<div class="billRow"><div class="billName">${escapeHtml(x.name)}</div><div class="billQty">${escapeHtml(x.qty||'-')} ${escapeHtml(x.unit||'')}</div></div>`).join('')}${(d.missingItems||[]).length?`<div class="missingTitle">ค้างส่ง</div>${d.missingItems.map(x=>`<div class="billRow"><div class="billName">${escapeHtml(x.name)}</div><div class="billQty">${escapeHtml(x.qty||'-')} ${escapeHtml(x.unit||'')}</div></div>`).join('')}`:''}</div>`).join(''):'<div class="empty">ยังไม่มีรายการของบริษัทนี้</div>';
}


/* === V3.5 stability overrides: delivered bill, PO workflow, best sellers, reload icon === */
let stockAlertHiddenPO = {};
let stockAlertHoldTimer = null;
function saEscape(s){ return typeof escapeHtml==='function' ? escapeHtml(String(s??'')) : String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function saNormSupplier(s){ return String(s||'ไม่ระบุบริษัท').replace(/\s+/g,'').trim(); }
function saSameSupplier(a,b){ return saNormSupplier(a)===saNormSupplier(b); }
function saNormName(s){ return typeof norm==='function' ? norm(s||'') : String(s||'').trim().toLowerCase(); }
function saDateOnly(ts){ return ts ? new Date(ts).toLocaleDateString('th-TH',{day:'2-digit',month:'2-digit',year:'numeric'}) : '-'; }
function saRecentDeliveries(){ return typeof recentDeliveries==='function' ? recentDeliveries() : (deliveryHistory||[]); }
function saActiveOrderedNames(){ const set=new Set(); (purchaseOrders||[]).filter(o=>o.status!=='delivered').forEach(o=>(o.items||[]).forEach(i=>set.add(saNormName(i.name)))); return set; }

function bestSellerNames(){
  const since=Date.now()-30*24*60*60*1000;
  const counts={};
  (activities||[]).forEach(a=>{
    if((a.time||0)>=since && String(a.action||'').includes('ลงของขาด')){
      const name=String(a.detail||'').trim(); if(name) counts[name]=(counts[name]||0)+1;
    }
  });
  if(!Object.keys(counts).length){
    (items||[]).forEach(x=>{const t=x.createdAt||x.updatedAt||0;if(t>=since&&x.name)counts[x.name]=(counts[x.name]||0)+1;});
  }
  return Object.keys(counts).sort((a,b)=>(counts[b]-counts[a])||a.localeCompare(b,'th')).slice(0,10);
}
function renderBestSellers(){
  const box=document.getElementById('bestSellerBox'); if(!box)return;
  const names=bestSellerNames();
  box.innerHTML=names.length?`<div class="rankList premiumRankList">${names.map((n,i)=>{
    const rank=i+1;
    const special=rank<=5?` rankTop rankTop${rank}`:' rankNormal';
    return `<div class="rankRow${special}"><div class="rankNo">${rank}</div><div class="rankName">${saEscape(n)}</div></div>`;
  }).join('')}</div>`:'<div class="empty">ยังไม่มีข้อมูลพอสำหรับจัดอันดับสินค้าขายดี</div>';
}

function supplierGroupsForPO(){
  const map={};
  const ordered=saActiveOrderedNames();
  (orderGroups()||[]).forEach(g=>{
    if(ordered.has(saNormName(g.name))) return;
    const suppliers=(typeof suppliersForGroup==='function'?suppliersForGroup(g):[g.b1?.supplier||g.b2?.supplier||'ยังไม่ได้ระบุ']).filter(Boolean);
    (suppliers.length?suppliers:['ยังไม่ได้ระบุ']).forEach(sp=>{map[sp]=map[sp]||[]; map[sp].push(g);});
  });
  return map;
}
function renderPOBuilder(){
  const box=document.getElementById('poSupplierBox');if(!box)return;
  const map=supplierGroupsForPO();
  const names=Object.keys(map).sort((a,b)=>a.localeCompare(b,'th'));
  box.innerHTML=names.length?`<div class="supplierList">${names.map(n=>`<button class="supplierBtn" onclick="openPOSupplier('${encodeURIComponent(n)}')"><span>${saEscape(n)}</span><span class="count">${map[n].length} รายการ</span></button>`).join('')}</div>`:'<div class="empty">ยังไม่มีรายการที่ต้องออกใบสั่งสินค้า</div>';
}
function saVisiblePOGroups(supplier){
  const hidden=stockAlertHiddenPO[supplier]||{};
  return (supplierGroupsForPO()[supplier]||[]).filter(g=>!hidden[saNormName(g.name)]);
}
function renderPOSupplier(){
  const title=document.getElementById('poSupplierTitle'),box=document.getElementById('poItemsBox'); if(!box)return;
  const supplier=currentPOSupplier||''; title.textContent=`ใบสั่งสินค้า ${supplier}`;
  const groups=saVisiblePOGroups(supplier);
  const manual=poManualItems[supplier]||[];
  const lines=groups.map((g,i)=>{const unit=(g.b1?.unit||g.b2?.unit||'');return `<div class="poLine" data-name="${saEscape(g.name)}" oncontextmenu="showPODropMenu('${encodeURIComponent(g.name)}');return false" onpointerdown="startPOHold(event,'${encodeURIComponent(g.name)}')" onpointerup="clearPOHold()" onpointerleave="clearPOHold()"><div><b>${saEscape(g.name)}</b><div class="muted">สาขา 1: ${branchText(g.b1)}<br>สาขา 2: ${branchText(g.b2)}</div></div><input class="poQty" type="text" inputmode="text" placeholder="จำนวน"><input class="poUnit" value="${saEscape(unit)}" placeholder="หน่วย"></div>`}).join('');
  const manualLines=manual.map((x,i)=>`<div class="poLine" data-name="${saEscape(x.name)}"><div><b>${saEscape(x.name)}</b><div class="muted">สินค้าเพิ่มเองในใบสั่งนี้</div><button class="removeMini" onclick="removeManualPOItem(${i})">ลบ</button></div><input class="poQty" type="text" inputmode="text" value="${saEscape(x.qty||'')}" placeholder="จำนวน"><input class="poUnit" value="${saEscape(x.unit||'')}" placeholder="หน่วย"></div>`).join('');
  box.innerHTML=`<div class="poPanel"><div class="switchRow"><input type="checkbox" id="poShowCompany" checked><label for="poShowCompany" style="margin:0">แสดงชื่อบริษัทบนหัวกระดาษ</label></div><div class="manualAdd"><h3>เพิ่มสินค้า</h3><div class="manualGrid"><input id="manualPOName" placeholder="ชื่อสินค้า"><input id="manualPOQty" type="text" inputmode="text" placeholder="จำนวน"><input id="manualPOUnit" placeholder="หน่วย"></div><button class="btn gray" style="width:100%;margin-top:10px" onclick="addManualPOItem()">+ เพิ่มเข้ารายการใบสั่ง</button></div>${lines}${manualLines}${(!lines&&!manualLines)?'<div class="empty">ไม่มีรายการรอใส่จำนวน/หน่วยของบริษัทนี้</div>':''}<div class="poActions"><button class="btn primary" onclick="copyPOText()">คัดลอกรายการสินค้า</button><button class="btn ok" onclick="exportPOImage()">ส่งออกเป็นรูปภาพ</button></div><button class="btn primary" style="width:100%;margin-top:10px" onclick="confirmPOOrder()">ยืนยันสั่งแล้ว</button><div class="paperPreview" id="poPreview"></div></div>`;
  updatePOPreview(); document.querySelectorAll('.poQty,.poUnit,#poShowCompany').forEach(el=>el.addEventListener('input',updatePOPreview));
}
function startPOHold(ev,encoded){ clearPOHold(); stockAlertHoldTimer=setTimeout(()=>showPODropMenu(encoded),650); }
function clearPOHold(){ if(stockAlertHoldTimer){clearTimeout(stockAlertHoldTimer); stockAlertHoldTimer=null;} }
function showPODropMenu(encoded){
  const name=decodeURIComponent(encoded);
  let modal=document.getElementById('poDeleteModal');
  if(!modal){modal=document.createElement('div'); modal.id='poDeleteModal'; modal.className='modal'; document.body.appendChild(modal);}
  modal.innerHTML=`<div class="sheet"><h2>จัดการรายการ</h2><p class="muted">${saEscape(name)}</p><div class="rowBtns"><button class="btn danger" style="flex:1" onclick="deletePOCandidate('${encodeURIComponent(name)}')">ลบ</button><button class="btn gray" style="flex:1" onclick="closeModal('poDeleteModal')">ยกเลิก</button></div></div>`;
  modal.classList.add('show');
}
function deletePOCandidate(encoded){
  const name=decodeURIComponent(encoded); const supplier=currentPOSupplier||'';
  if(!confirm(`ต้องการลบ "${name}" ออกจากใบสั่งสินค้ารอบนี้ใช่ไหม?`))return;
  stockAlertHiddenPO[supplier]=stockAlertHiddenPO[supplier]||{}; stockAlertHiddenPO[supplier][saNormName(name)]=true;
  closeModal('poDeleteModal'); renderPOSupplier(); toast('ลบออกจากใบสั่งรอบนี้แล้ว');
}
function collectPOLines(){
  return Array.from(document.querySelectorAll('.poLine')).map(row=>({name:row.dataset.name,qty:row.querySelector('.poQty')?.value.trim()||'',unit:row.querySelector('.poUnit')?.value.trim()||''})).filter(x=>x.qty||x.unit);
}
function poText(){
  const show=document.getElementById('poShowCompany')?.checked; const lines=collectPOLines(); const out=[];
  if(show&&currentPOSupplier) out.push(`ใบสั่งสินค้า: ${currentPOSupplier}`);
  out.push(`วันที่ ${new Date().toLocaleDateString('th-TH')}`);
  lines.forEach(x=>out.push(`${x.name} ${x.qty||'-'} ${x.unit||''}`.trim()));
  return out.join('\n');
}
function updatePOPreview(){
  const p=document.getElementById('poPreview'); if(!p)return;
  const lines=collectPOLines(); const show=document.getElementById('poShowCompany')?.checked;
  p.innerHTML=`${show?`<h3>${saEscape(currentPOSupplier||'')}</h3>`:''}<div class="poPaperTitle">ใบสั่งสินค้า</div><div class="poPaperLines">${lines.length?lines.map(x=>`<div class="poPaperRow"><span>${saEscape(x.name)}</span><b>${saEscape(x.qty||'-')} ${saEscape(x.unit||'')}</b></div>`).join(''):'<div class="muted" style="text-align:center">กรอกจำนวนสินค้าที่ต้องการสั่ง</div>'}</div>`;
}
async function exportPOImage(){
  updatePOPreview();
  const lines=collectPOLines(); if(!lines.length)return toast('กรุณาใส่จำนวนก่อนส่งออก');
  const canvas=document.createElement('canvas'), ctx=canvas.getContext('2d');
  const w=900, rowH=54, h=180+lines.length*rowH; canvas.width=w; canvas.height=h;
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); ctx.fillStyle='#111827'; ctx.textAlign='center'; ctx.font='bold 36px Tahoma';
  if(document.getElementById('poShowCompany')?.checked && currentPOSupplier) ctx.fillText(currentPOSupplier,w/2,54);
  ctx.font='bold 30px Tahoma'; ctx.fillText('ใบสั่งสินค้า',w/2,104); ctx.font='24px Tahoma'; ctx.textAlign='left';
  let y=158; lines.forEach(x=>{ctx.fillStyle='#111827'; ctx.fillText(x.name,60,y); ctx.textAlign='right'; ctx.font='bold 24px Tahoma'; ctx.fillText(`${x.qty||'-'} ${x.unit||''}`,w-60,y); ctx.textAlign='left'; ctx.font='24px Tahoma'; y+=rowH;});
  const blob=await new Promise(res=>canvas.toBlob(res,'image/png'));
  const fileName=`ใบสั่งสินค้า_${currentPOSupplier||'supplier'}_${Date.now()}.png`;
  const file=new File([blob],fileName,{type:'image/png'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:'ใบสั่งสินค้า'}); }
  else{ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fileName; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); }
  toast('สร้างรูปภาพใบสั่งสินค้าแล้ว');
}
function confirmPOOrder(){
  const lines=collectPOLines(); if(!lines.length)return toast('กรุณาใส่จำนวนสินค้าที่ต้องการสั่ง');
  const supplier=currentPOSupplier||'ไม่ระบุบริษัท';
  const order={id:'po_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),supplier,items:lines,orderAt:Date.now(),status:'ordered',by:nickname||'ไม่ระบุ'};
  purchaseOrders.unshift(order); poManualItems[supplier]=[]; stockAlertHiddenPO[supplier]={}; persistOrders(); currentOrderSupplier=supplier; go('orderPage'); toast('บันทึกการสั่งสินค้าแล้ว');
}

function renderDeliveredPage(){
  const box=document.getElementById('deliveredBox'); if(!box)return;
  const rows=saRecentDeliveries(); const names=[]; rows.forEach(x=>{const n=x.supplier||'ไม่ระบุบริษัท'; if(!names.some(y=>saSameSupplier(y,n))) names.push(n);});
  box.innerHTML=names.length?`<div class="supplierList">${names.map(n=>{const ds=rows.filter(d=>saSameSupplier(d.supplier||'ไม่ระบุบริษัท',n));const latest=ds[0]?.receivedAt;const count=ds.reduce((sum,d)=>sum+(d.deliveredItems||[]).length,0);return `<button class="supplierBtn deliveredCompanyBtn" oncontextmenu="showDeliveredDelete('${encodeURIComponent(n)}');return false" onpointerdown="startDeliveredHold(event,'${encodeURIComponent(n)}')" onpointerup="clearDeliveredHold()" onpointerleave="clearDeliveredHold()" onclick="openDeliveredSupplier('${encodeURIComponent(n)}')"><span><b>${saEscape(n)}</b><div class="todayText">${relDate(latest)}</div></span><span class="count">${count} รายการ</span></button>`}).join('')}</div>`:'<div class="empty">ยังไม่มีข้อมูลของมาส่งแล้ว</div>';
}
function startDeliveredHold(ev,encoded){clearDeliveredHold(); window._deliveredHoldTimer=setTimeout(()=>showDeliveredDelete(encoded),650)}
function clearDeliveredHold(){if(window._deliveredHoldTimer){clearTimeout(window._deliveredHoldTimer);window._deliveredHoldTimer=null}}
function showDeliveredDelete(encoded){
  const supplier=decodeURIComponent(encoded);
  let modal=document.getElementById('deliveredDeleteModal'); if(!modal){modal=document.createElement('div');modal.id='deliveredDeleteModal';modal.className='modal';document.body.appendChild(modal);}
  modal.innerHTML=`<div class="sheet"><h2>จัดการรายการ</h2><p class="muted">${saEscape(supplier)}</p><div class="rowBtns"><button class="btn danger" style="flex:1" onclick="deleteDeliveredCompany('${encodeURIComponent(supplier)}')">ลบ</button><button class="btn gray" style="flex:1" onclick="closeModal('deliveredDeleteModal')">ยกเลิก</button></div></div>`; modal.classList.add('show');
}
function deleteDeliveredCompany(encoded){
  const supplier=decodeURIComponent(encoded); if(!confirm(`ยืนยันลบรายการของ "${supplier}" ใช่ไหม?`))return;
  deliveryHistory=deliveryHistory.filter(d=>!saSameSupplier(d.supplier||'ไม่ระบุบริษัท',supplier)); persistOrders(); closeModal('deliveredDeleteModal'); toast('ลบรายการเรียบร้อยแล้ว');
}
function openDeliveredSupplier(encoded){ currentOrderSupplier=decodeURIComponent(encoded); go('deliveredSupplierPage'); }
function renderDeliveredSupplier(){
  const title=document.getElementById('deliveredSupplierTitle'),box=document.getElementById('deliveredSupplierBox'); if(!box)return;
  const supplier=currentOrderSupplier||''; title.textContent=`ของมาส่งแล้ว ${supplier}`;
  const rows=(deliveryHistory||[]).filter(d=>saSameSupplier(d.supplier||'ไม่ระบุบริษัท',supplier)).sort((a,b)=>(b.receivedAt||0)-(a.receivedAt||0));
  if(!rows.length){box.innerHTML='<div class="empty">ยังไม่มีรายการของบริษัทนี้</div>';return;}
  const latest=rows[0]||{}; const seen=new Set(); const delivered=[]; const missing=[];
  rows.forEach(d=>{(d.deliveredItems||[]).forEach(x=>{const k=['d',x.name,x.qty||'',x.unit||''].join('|'); if(!seen.has(k)){seen.add(k); delivered.push(x);}});(d.missingItems||[]).forEach(x=>{const k=['m',x.name,x.qty||'',x.unit||''].join('|'); if(!seen.has(k)){seen.add(k); missing.push(x);}});});
  const deliveredRows=delivered.map((x,i)=>`<div class="billRow"><div class="billNo">${i+1}.</div><div class="billName">${saEscape(x.name)}</div><div class="billQty">${saEscape(x.qty||'-')} ${saEscape(x.unit||'')}</div></div>`).join('');
  const missingRows=missing.length?`<div class="missingTitle">ค้างส่ง</div>`+missing.map((x,i)=>`<div class="billRow"><div class="billNo">${i+1}.</div><div class="billName">${saEscape(x.name)}</div><div class="billQty">${saEscape(x.qty||'-')} ${saEscape(x.unit||'')}</div></div>`).join(''):'';
  box.innerHTML=`<div class="billList"><div class="deliveredDates"><div>วันที่สั่ง: ${saDateOnly(latest.orderAt)}</div><div>วันที่ส่ง: ${saDateOnly(latest.receivedAt)}</div></div>${deliveredRows||'<div class="empty">ไม่มีรายการมาส่ง</div>'}${missingRows}</div>`;
}



/* === V3.6 bugfix: hide numeric supplier names + round reload already in HTML === */
function saValidSupplierName(v){
  const s=String(v||'').trim();
  if(!s || s==='ยังไม่ได้ระบุ' || s==='ไม่ระบุบริษัท') return false;
  if(/^\d+$/.test(s)) return false;
  if(/^[\d\s.,]+$/.test(s)) return false;
  return true;
}
function splitSuppliers(v){
  return String(v||'').split(/[\/,|、，]+/).map(x=>x.trim()).filter(saValidSupplierName);
}
function cleanSupplierList(list){
  return [...new Set((list||[]).map(x=>String(x||'').trim()).filter(saValidSupplierName))];
}
function suppliersForGroup(g){
  const arr=[];
  [g.b1,g.b2].forEach(x=>{ if(x && x.supplier) arr.push(...splitSuppliers(x.supplier)); });
  arr.push(...orderCompaniesForName(g.name));
  return cleanSupplierList(arr);
}
function supplierGroupsForPO(){
  const map={};
  const ordered=saActiveOrderedNames();
  (orderGroups()||[]).forEach(g=>{
    if(ordered.has(saNormName(g.name))) return;
    let suppliers=(typeof suppliersForGroup==='function'?suppliersForGroup(g):[]);
    suppliers=cleanSupplierList(suppliers);
    (suppliers.length?suppliers:['ยังไม่ได้ระบุ']).forEach(sp=>{map[sp]=map[sp]||[]; map[sp].push(g);});
  });
  return map;
}
function renderPOBuilder(){
  const box=document.getElementById('poSupplierBox');if(!box)return;
  const map=supplierGroupsForPO();
  const names=Object.keys(map).filter(n=>n==='ยังไม่ได้ระบุ'||saValidSupplierName(n)).sort((a,b)=>a.localeCompare(b,'th'));
  box.innerHTML=names.length?`<div class="supplierList">${names.map(n=>`<button class="supplierBtn" onclick="openPOSupplier('${encodeURIComponent(n)}')"><span>${saEscape(n)}</span><span class="count">${map[n].length} รายการ</span></button>`).join('')}</div>`:'<div class="empty">ยังไม่มีรายการที่ต้องออกใบสั่งสินค้า</div>';
}



/* === Stock Alert V5.1 fixes: Smart Qty/Unit input + similar product confirmation === */
(function(){
  const ALIAS_KEY='stockAlertProductAliasesV1';
  function aliasMap(){try{return JSON.parse(localStorage.getItem(ALIAS_KEY)||'{}')}catch(e){return {}}}
  function saveAliasMap(m){localStorage.setItem(ALIAS_KEY,JSON.stringify(m||{}));}
  function nrm(v){return (typeof norm==='function'?norm(v):String(v||'').toLowerCase().replace(/\s+/g,'').trim());}
  function tokenSet(s){s=nrm(s); const a=new Set(); for(let i=0;i<s.length-1;i++)a.add(s.slice(i,i+2)); if(!a.size&&s)a.add(s); return a;}
  function sim(a,b){a=nrm(a); b=nrm(b); if(!a||!b)return 0; if(a===b)return 1; if(a.includes(b)||b.includes(a))return Math.min(a.length,b.length)/Math.max(a.length,b.length)+0.12; const A=tokenSet(a),B=tokenSet(b); let inter=0; A.forEach(x=>{if(B.has(x))inter++}); return inter/Math.max(1,(A.size+B.size-inter));}
  function bestSimilarProduct(name){
    const key=nrm(name); if(!key)return null;
    const aliases=aliasMap(); if(aliases[key]) return {name:aliases[key],score:1,alias:true};
    const candidates=[...new Set((items||[]).map(x=>x.name).filter(Boolean))].filter(x=>nrm(x)!==key);
    let best=null; for(const c of candidates){const s=sim(name,c); if(!best||s>best.score) best={name:c,score:s};}
    if(best && best.score>=0.68) return best; return null;
  }
  window.resolveSimilarProductName=function(inputName){
    const m=bestSimilarProduct(inputName); if(!m) return inputName;
    if(m.alias) return m.name;
    const ok=confirm(`ชื่อสินค้า "${inputName}" คล้ายกับ "${m.name}"\n\nใช่สินค้าเดียวกันไหม?\n\nถ้าใช่ ระบบจะจำชื่อนี้ให้เป็นสินค้าเดียวกันในครั้งต่อไป`);
    if(ok){const a=aliasMap(); a[nrm(inputName)]=m.name; saveAliasMap(a); return m.name;}
    return inputName;
  };

  function splitQtyUnit(value){
    const s=String(value||'');
    let qty='', unit='', hitUnit=false;
    for(const ch of s){
      if(!hitUnit && /[0-9.,\/\-\s]/.test(ch)) qty+=ch; else {hitUnit=true; unit+=ch;}
    }
    return {qty:qty.trim(),unit:unit.trim()};
  }
  function setupSmartPair(qtyEl,unitEl,onChange){
    if(!qtyEl||!unitEl||qtyEl.dataset.smartQtyUnit==='1')return;
    qtyEl.dataset.smartQtyUnit='1';
    // ต้องใช้แป้นพิมพ์แบบตัวอักษร ไม่ใช่ numeric keypad เพื่อให้พิมพ์ 6กระป๋อง ได้
    try{qtyEl.type='text'; qtyEl.setAttribute('inputmode','text'); qtyEl.autocomplete='off';}catch(e){}
    let moving=false;
    const moveText=(txt)=>{
      if(!txt)return;
      moving=true;
      unitEl.value=(unitEl.value||'')+txt;
      unitEl.focus();
      try{unitEl.setSelectionRange(unitEl.value.length,unitEl.value.length)}catch(e){}
      setTimeout(()=>{moving=false},0);
      if(onChange)onChange();
    };
    // ใช้ input event อย่างเดียวเพื่อป้องกันอักษรตัวแรกเด้งซ้ำ 2 ตัวบน iOS/Android
    qtyEl.addEventListener('input',()=>{
      if(moving)return;
      const p=splitQtyUnit(qtyEl.value);
      if(p.unit){
        qtyEl.value=p.qty;
        moveText(p.unit);
      }
      if(onChange)onChange();
    });
  }
  window.applySmartQtyUnitInputs=function(){
    const cb=()=>{try{if(typeof updatePOPreview==='function')updatePOPreview()}catch(e){}};
    setupSmartPair(document.getElementById('qtyInput'),document.getElementById('unitInput'));
    setupSmartPair(document.getElementById('tmQty'),document.getElementById('tmUnit'));
    setupSmartPair(document.getElementById('sameQty'),document.getElementById('sameUnit'));
    setupSmartPair(document.getElementById('manualPOQty'),document.getElementById('manualPOUnit'),cb);
    document.querySelectorAll('.poLine').forEach(row=>setupSmartPair(row.querySelector('.poQty'),row.querySelector('.poUnit'),cb));
  };

  const oldOpenForm=window.openForm||openForm;
  window.openForm=openForm=function(b,it=null){oldOpenForm(b,it); setTimeout(applySmartQtyUnitInputs,0);};
  const oldOpenTransfer=window.openTransfer||openTransfer;
  window.openTransfer=openTransfer=function(id,from,to){oldOpenTransfer(id,from,to); setTimeout(applySmartQtyUnitInputs,0);};
  if(typeof openSameShortage==='function'){
    const oldSame=window.openSameShortage||openSameShortage;
    window.openSameShortage=openSameShortage=function(id,from,to){oldSame(id,from,to); setTimeout(applySmartQtyUnitInputs,0);};
  }
  const oldRenderPOSupplier=window.renderPOSupplier||renderPOSupplier;
  window.renderPOSupplier=renderPOSupplier=function(){oldRenderPOSupplier(); applySmartQtyUnitInputs();};

  const oldSaveItem=window.saveItem||saveItem;
  window.saveItem=saveItem=async function(){
    try{
      const el=document.getElementById('nameInput');
      if(el&&el.value.trim()) el.value=resolveSimilarProductName(el.value.trim());
      await oldSaveItem();
    }catch(err){
      console.error('saveItem failed',err);
      toast('บันทึกไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const oldInit=window.init||init;
  window.init=init=function(){oldInit(); setTimeout(applySmartQtyUnitInputs,0);};
})();

if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{})}init();

/* === V4.1 final bestseller ranking visual override === */
function renderBestSellers(){
  const box=document.getElementById('bestSellerBox');
  if(!box) return;
  const names=(typeof bestSellerNames==='function'?bestSellerNames():[]).slice(0,10);
  if(!names.length){
    box.innerHTML='<div class="empty">ยังไม่มีข้อมูลพอสำหรับจัดอันดับสินค้าขายดี</div>';
    return;
  }
  const styleByRank=(rank)=>{
    if(rank===1) return {card:'background:linear-gradient(135deg,#0b63f6,#13b7ff);color:white;min-height:86px;border-radius:28px;box-shadow:0 16px 34px rgba(11,99,246,.22);padding:22px 20px;grid-template-columns:58px 1fr;',no:'background:white;color:#0b63f6;width:48px;height:48px;font-size:25px;box-shadow:0 8px 18px rgba(0,0,0,.18);',name:'font-size:25px;color:white;'};
    if(rank===2) return {card:'background:linear-gradient(135deg,#dcecff,#f4f9ff);min-height:76px;border-radius:26px;box-shadow:0 12px 26px rgba(11,99,246,.12);padding:20px 18px;grid-template-columns:54px 1fr;',no:'background:#0b63f6;color:white;width:43px;height:43px;font-size:22px;',name:'font-size:23px;color:#082553;'};
    if(rank===3) return {card:'background:#edf6ff;min-height:70px;border-radius:24px;box-shadow:0 9px 22px rgba(11,99,246,.09);padding:18px 17px;grid-template-columns:50px 1fr;',no:'background:#2d7df4;color:white;width:39px;height:39px;font-size:20px;',name:'font-size:21px;color:#12315e;'};
    if(rank===4) return {card:'background:#f4f9ff;min-height:64px;border-radius:22px;box-shadow:0 7px 18px rgba(11,99,246,.07);padding:17px;grid-template-columns:48px 1fr;',no:'background:#5b9cf6;color:white;width:36px;height:36px;font-size:19px;',name:'font-size:20px;color:#1d3c68;'};
    if(rank===5) return {card:'background:#f8fbff;min-height:58px;border-radius:20px;box-shadow:0 5px 16px rgba(11,99,246,.05);padding:16px;grid-template-columns:46px 1fr;',no:'background:#8bbcff;color:white;width:34px;height:34px;font-size:18px;',name:'font-size:19px;color:#274569;'};
    return {card:'background:white;min-height:54px;border-radius:18px;border:1px solid #e6edf7;box-shadow:0 5px 16px rgba(17,44,84,.05);padding:14px 16px;grid-template-columns:44px 1fr;',no:'background:#0967f2;color:white;width:32px;height:32px;font-size:17px;',name:'font-size:18px;color:#111827;'};
  };
  box.innerHTML='<div style="display:grid;gap:12px;margin-top:14px">'+names.map((n,i)=>{
    const rank=i+1, s=styleByRank(rank);
    return `<div style="display:grid;align-items:center;gap:12px;font-weight:900;${s.card}"><div style="border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:900;${s.no}">${rank}</div><div style="font-weight:900;${s.name}">${saEscape(n)}</div></div>`;
  }).join('')+'</div>';
}

/* === V4.4 PO Preview + Classic Paper Export + Green Bestseller Final === */
(function(){
  const css = `
    .poPreviewHint{margin-top:12px;background:#fff8e8;border:1px dashed #e0b15a;border-radius:16px;padding:12px;color:#7a4a00;font-weight:800;font-size:13px;text-align:center}
    .poPreviewModal .sheet{height:96vh;max-height:96vh;border-radius:28px 28px 0 0;background:#eef3f7;padding:14px;display:flex;flex-direction:column;gap:10px}
    .poPreviewTop{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .poPreviewTop h2{margin:0;font-size:21px}
    .poModeSwitch{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#dfe8f2;border-radius:16px;padding:5px}
    .poModeSwitch button{border:0;border-radius:13px;padding:10px 8px;font-weight:900;background:transparent;color:#46617e}
    .poModeSwitch button.active{background:#fff;color:#0b56d8;box-shadow:0 4px 12px rgba(13,70,150,.10)}
    .poPaperStage{flex:1;overflow:auto;display:flex;justify-content:center;align-items:flex-start;padding:8px 2px 14px}
    .poClassicPaper{width:100%;max-width:390px;background:#fffdf5;border:1px solid #eadfca;border-radius:7px;box-shadow:0 16px 36px rgba(27,39,56,.18);color:#111827;position:relative;overflow:hidden}
    .poClassicPaper.full{min-height:calc(96vh - 205px)}
    .poClassicPaper:before{content:"";position:absolute;left:0;right:0;top:0;height:12px;background:repeating-linear-gradient(90deg,#fffdf5 0 18px,#efe4cf 18px 20px);opacity:.7}
    .poClassicInner{padding:28px 22px 26px;background:linear-gradient(rgba(255,255,255,.45),rgba(255,255,255,.45)),repeating-linear-gradient(0deg,rgba(20,60,100,.035) 0 1px,transparent 1px 31px)}
    .poClassicHeader{text-align:center;border-bottom:1px solid #d8cbb6;padding-bottom:12px;margin-bottom:14px}
    .poClassicHeader .supplier{font-size:24px;font-weight:950;line-height:1.15}
    .poClassicHeader .docTitle{font-size:19px;font-weight:950;margin-top:4px}
    .poClassicHeader .date{font-size:12px;color:#6b7280;font-weight:800;margin-top:6px}
    .poClassicRows{display:flex;flex-direction:column;gap:0}
    .poClassicRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:baseline;border-bottom:1px dashed #dacfbf;padding:8px 0;font-size:15px;font-weight:850}
    .poClassicRow .name{min-width:0;overflow-wrap:anywhere;line-height:1.25}
    .poClassicRow .amount{text-align:right;white-space:nowrap;font-weight:950;max-width:130px}
    .poClassicFooter{margin-top:20px;padding-top:12px;border-top:1px solid #d8cbb6;display:flex;justify-content:space-between;font-size:12px;color:#6b7280;font-weight:800}
    .poPreviewActions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
    .poPreviewActions .btn{padding:12px 8px}
    .paperPreview{background:#fffdf5;border:1px solid #eadfca;border-radius:18px;padding:14px;margin-top:12px;box-shadow:0 5px 16px rgba(17,44,84,.05)}
    .poPaperRow{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:10px!important;align-items:baseline;border-bottom:1px dashed #d8cbb6;padding:7px 0}.poPaperRow span{overflow-wrap:anywhere}.poPaperRow b{white-space:nowrap;max-width:115px;text-align:right}
  `;
  const style=document.createElement('style'); style.textContent=css; document.head.appendChild(style);
})();

let poExportMode='full';
function saPODate(){return new Date().toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'numeric'});}
function saFormatQtyUnit(x){return `${x.qty||'-'} ${x.unit||''}`.trim();}
function updatePOPreview(){
  const p=document.getElementById('poPreview'); if(!p)return;
  const lines=collectPOLines(); const show=document.getElementById('poShowCompany')?.checked;
  p.innerHTML=`${show?`<h3>${saEscape(currentPOSupplier||'')}</h3>`:''}<div class="poPaperTitle">ใบสั่งสินค้า</div><div class="poPaperLines">${lines.length?lines.map(x=>`<div class="poPaperRow"><span>${saEscape(x.name)}</span><b>${saEscape(saFormatQtyUnit(x))}</b></div>`).join(''):'<div class="muted" style="text-align:center">กรอกจำนวนสินค้าที่ต้องการสั่ง</div>'}</div><div class="poPreviewHint">กด “ส่งออกเป็นรูปภาพ” เพื่อดูตัวอย่างเต็มจอ เลือกเต็มหน้า/ตัดตามรายการ แล้วค่อยบันทึกหรือแชร์</div>`;
}
function poPreviewHTML(mode='full'){
  const lines=collectPOLines();
  const supplier=(document.getElementById('poShowCompany')?.checked?currentPOSupplier:'')||'';
  return `<div class="poClassicPaper ${mode==='full'?'full':'crop'}" id="poClassicPaper"><div class="poClassicInner"><div class="poClassicHeader">${supplier?`<div class="supplier">${saEscape(supplier)}</div>`:''}<div class="docTitle">ใบสั่งสินค้า</div><div class="date">วันที่ ${saPODate()}</div></div><div class="poClassicRows">${lines.length?lines.map(x=>`<div class="poClassicRow"><div class="name">${saEscape(x.name)}</div><div class="amount">${saEscape(saFormatQtyUnit(x))}</div></div>`).join(''):'<div class="empty">กรอกจำนวนสินค้าที่ต้องการสั่ง</div>'}</div><div class="poClassicFooter"><span>รายการทั้งหมด ${lines.length} รายการ</span><span>Stock Alert</span></div></div></div>`;
}
function renderPOExportPreview(){
  const stage=document.getElementById('poPaperStage'); if(stage) stage.innerHTML=poPreviewHTML(poExportMode);
  document.querySelectorAll('.poModeSwitch button').forEach(b=>b.classList.toggle('active',b.dataset.mode===poExportMode));
}
function setPOExportMode(mode){poExportMode=mode; renderPOExportPreview();}
function exportPOImage(){
  updatePOPreview();
  const lines=collectPOLines(); if(!lines.length)return toast('กรุณาใส่จำนวนก่อนส่งออก');
  let modal=document.getElementById('poExportPreviewModal');
  if(!modal){modal=document.createElement('div'); modal.id='poExportPreviewModal'; modal.className='modal poPreviewModal'; document.body.appendChild(modal);}
  modal.innerHTML=`<div class="sheet"><div class="poPreviewTop"><h2>ตัวอย่างใบสั่งสินค้า</h2><button class="btn gray" onclick="closeModal('poExportPreviewModal')">ปิด</button></div><div class="poModeSwitch"><button data-mode="full" onclick="setPOExportMode('full')">เต็มหน้า</button><button data-mode="crop" onclick="setPOExportMode('crop')">ตัดตามรายการ</button></div><div class="poPaperStage" id="poPaperStage"></div><div class="poPreviewActions"><button class="btn gray" onclick="closeModal('poExportPreviewModal')">กลับไปแก้ไข</button><button class="btn primary" onclick="savePOImage()">บันทึกรูป</button><button class="btn ok" onclick="sharePOImage()">แชร์</button></div></div>`;
  modal.classList.add('show'); renderPOExportPreview();
}
function poWrapText(ctx,text,x,y,maxWidth,lineHeight){
  const words=String(text).split(/\s+/); let line='', lines=[];
  for(const word of words){const test=line?line+' '+word:word; if(ctx.measureText(test).width>maxWidth && line){lines.push(line); line=word;} else line=test;}
  if(line) lines.push(line); lines.forEach((ln,i)=>ctx.fillText(ln,x,y+i*lineHeight)); return lines.length*lineHeight;
}
function drawPOCanvas(mode='full'){
  const lines=collectPOLines(); const supplier=(document.getElementById('poShowCompany')?.checked?currentPOSupplier:'')||'';
  const w=1000, rowBase=58; const dynamicH=260+lines.reduce((sum,x)=>sum+(String(x.name).length>28?92:rowBase),0)+90;
  const h=mode==='full'?1450:Math.max(520,dynamicH);
  const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; const ctx=canvas.getContext('2d');
  ctx.fillStyle='#eef3f7'; ctx.fillRect(0,0,w,h);
  const px=70, py=54, pw=w-140, ph=h-108;
  ctx.shadowColor='rgba(0,0,0,.16)'; ctx.shadowBlur=28; ctx.shadowOffsetY=14; ctx.fillStyle='#fffdf5'; ctx.fillRect(px,py,pw,ph); ctx.shadowColor='transparent';
  ctx.strokeStyle='#e5d7bf'; ctx.lineWidth=2; ctx.strokeRect(px,py,pw,ph);
  ctx.fillStyle='rgba(235,225,205,.25)'; for(let yy=py+86; yy<py+ph; yy+=38){ctx.fillRect(px,yy,pw,1);}
  ctx.fillStyle='#111827'; ctx.textAlign='center'; ctx.font='bold 40px Tahoma, sans-serif'; let y=py+82;
  if(supplier){ctx.fillText(supplier,w/2,y); y+=48;}
  ctx.font='bold 34px Tahoma, sans-serif'; ctx.fillText('ใบสั่งสินค้า',w/2,y); y+=34;
  ctx.font='bold 20px Tahoma, sans-serif'; ctx.fillStyle='#6b7280'; ctx.fillText('วันที่ '+saPODate(),w/2,y); y+=42;
  ctx.strokeStyle='#d7c7ad'; ctx.beginPath(); ctx.moveTo(px+50,y); ctx.lineTo(px+pw-50,y); ctx.stroke(); y+=28;
  ctx.textAlign='left'; ctx.font='bold 27px Tahoma, sans-serif'; ctx.fillStyle='#111827';
  const nameX=px+60, amountRight=px+pw-60, amountW=210, nameW=pw-140-amountW;
  for(const x of lines){
    ctx.fillStyle='#111827'; ctx.font='bold 27px Tahoma, sans-serif'; ctx.textAlign='left';
    const beforeY=y; const used=poWrapText(ctx,x.name,nameX,y,nameW,34); 
    ctx.textAlign='right'; ctx.font='bold 28px Tahoma, sans-serif'; ctx.fillText(saFormatQtyUnit(x),amountRight,beforeY);
    y += Math.max(used,34)+18;
    ctx.strokeStyle='#dacfbf'; ctx.setLineDash([7,7]); ctx.beginPath(); ctx.moveTo(px+50,y-6); ctx.lineTo(px+pw-50,y-6); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.textAlign='left'; ctx.fillStyle='#6b7280'; ctx.font='bold 18px Tahoma, sans-serif'; ctx.fillText(`รายการทั้งหมด ${lines.length} รายการ`,px+60,py+ph-38);
  ctx.textAlign='right'; ctx.fillText('Stock Alert',px+pw-60,py+ph-38);
  return canvas;
}
async function poCanvasBlob(mode=poExportMode){const canvas=drawPOCanvas(mode); return await new Promise(res=>canvas.toBlob(res,'image/png',0.95));}
async function savePOImage(){
  try{const blob=await poCanvasBlob(); const fileName=`ใบสั่งสินค้า_${currentPOSupplier||'supplier'}_${Date.now()}.png`; const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fileName; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2500); toast('บันทึกรูปใบสั่งสินค้าแล้ว');}
  catch(e){toast('บันทึกรูปไม่สำเร็จ');}
}
async function sharePOImage(){
  try{const blob=await poCanvasBlob(); const fileName=`ใบสั่งสินค้า_${currentPOSupplier||'supplier'}_${Date.now()}.png`; const file=new File([blob],fileName,{type:'image/png'}); if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'ใบสั่งสินค้า'}); toast('แชร์ใบสั่งสินค้าแล้ว');}else{await savePOImage();}}
  catch(e){toast('แชร์ไม่สำเร็จ');}
}

function renderBestSellers(){
  const box=document.getElementById('bestSellerBox'); if(!box)return;
  const names=(typeof bestSellerNames==='function'?bestSellerNames():[]).slice(0,10);
  if(!names.length){box.innerHTML='<div class="empty">ยังไม่มีข้อมูลพอสำหรับจัดอันดับสินค้าขายดี</div>'; return;}
  const bg=['#0a9b43','#18ad54','#32bd69','#5bcc84','#89dba6','#dff6e8','#e8f9ee','#effbf4','#f5fdf8','#f9fffb'];
  const fg=['#fff','#fff','#073b1f','#073b1f','#073b1f','#123524','#123524','#123524','#123524','#123524'];
  box.innerHTML='<div style="display:grid;gap:12px;margin-top:14px">'+names.map((n,i)=>`<div style="display:grid;grid-template-columns:46px 1fr;gap:13px;align-items:center;background:${bg[i]};color:${fg[i]};border:1px solid rgba(6,95,70,.13);border-radius:${i===0?'26':'20'}px;min-height:${i===0?'76':'62'}px;padding:${i===0?'18px 18px':'14px 16px'};box-shadow:${i===0?'0 14px 30px rgba(10,155,67,.25)':'0 5px 16px rgba(17,44,84,.05)'}"><div style="width:${i===0?'42':'34'}px;height:${i===0?'42':'34'}px;border-radius:999px;display:grid;place-items:center;font-weight:950;background:${i<5?'rgba(255,255,255,.9)':'#0967f2'};color:${i<5?'#076c35':'#fff'};font-size:${i===0?'23':'17'}px">${i+1}</div><div style="font-weight:950;font-size:${i===0?'22':'18'}px">${saEscape(n)}</div></div>`).join('')+'</div>';
}

/* === V5.2 Smart text keyboard + stronger duplicate/similar product handling === */
(function(){
  const ALIAS_KEY='stockAlertProductAliasesV2';
  const ASKED_KEY='stockAlertAskedSimilarV1';
  const colorWords=['ขาว','ดำ','แดง','น้ำเงิน','ฟ้า','เขียว','เหลือง','ส้ม','ชมพู','ม่วง','เทา','เงิน','ทอง','ใส','น้ำตาล','ครีม'];
  function safeNorm(v){
    try{ if(typeof norm==='function') return norm(v); }catch(e){}
    return String(v||'').toLowerCase().replace(/[\s\-_/.,()]+/g,'').trim();
  }
  function getAlias(){try{return JSON.parse(localStorage.getItem(ALIAS_KEY)||'{}')}catch(e){return {}}}
  function setAlias(m){localStorage.setItem(ALIAS_KEY,JSON.stringify(m||{}));}
  function getAsked(){try{return JSON.parse(sessionStorage.getItem(ASKED_KEY)||'{}')}catch(e){return {}}}
  function setAsked(m){sessionStorage.setItem(ASKED_KEY,JSON.stringify(m||{}));}
  function tokens(s){
    s=safeNorm(s); const out=[];
    const nums=(s.match(/\d+(?:\.\d+)?/g)||[]); nums.forEach(n=>out.push('num:'+n));
    for(let i=0;i<s.length-1;i++) out.push(s.slice(i,i+2));
    if(!out.length && s) out.push(s);
    return new Set(out);
  }
  function hasDifferentColor(a,b){
    const ca=colorWords.filter(c=>String(a||'').includes(c));
    const cb=colorWords.filter(c=>String(b||'').includes(c));
    return ca.length&&cb.length&&ca.join('|')!==cb.join('|');
  }
  function similarity(a,b){
    const A=safeNorm(a),B=safeNorm(b); if(!A||!B)return 0; if(A===B)return 1;
    let base=0;
    if(A.includes(B)||B.includes(A)) base=Math.min(A.length,B.length)/Math.max(A.length,B.length)+0.18;
    else{
      const ta=tokens(A),tb=tokens(B); let inter=0; ta.forEach(x=>{if(tb.has(x))inter++});
      base=inter/Math.max(1,(ta.size+tb.size-inter));
    }
    const na=(A.match(/\d+(?:\.\d+)?/g)||[]).join('|'), nb=(B.match(/\d+(?:\.\d+)?/g)||[]).join('|');
    if(na&&nb&&na===nb) base+=0.12;
    if(hasDifferentColor(a,b)) base-=0.30;
    return Math.max(0,Math.min(1,base));
  }
  function currentName(){return (document.getElementById('nameInput')?.value||'').trim();}
  function allCandidates(){return [...new Set((window.items||[]).filter(x=>!window.editId||x.id!==window.editId).map(x=>x.name).filter(Boolean))];}
  function findSimilar(name,branchOnly){
    const key=safeNorm(name); if(!key)return null;
    const aliases=getAlias(); if(aliases[key]) return {name:aliases[key],score:1,alias:true,item:(items||[]).find(x=>x.name===aliases[key])};
    let list=(items||[]).filter(x=>x.name && (!window.editId||x.id!==window.editId));
    if(branchOnly) list=list.filter(x=>String(x.branch)===String(window.currentBranch));
    let best=null;
    for(const it of list){
      if(safeNorm(it.name)===key) {best={name:it.name,score:1,item:it}; break;}
      const sc=similarity(name,it.name);
      if(!best||sc>best.score) best={name:it.name,score:sc,item:it};
    }
    return best&&best.score>=0.62?best:null;
  }
  function smartSetup(qtyEl,unitEl,onChange){
    if(!qtyEl||!unitEl)return;
    // Full text keyboard is required so Thai unit can be typed immediately after digits.
    try{
      qtyEl.type='text'; qtyEl.removeAttribute('inputmode'); qtyEl.inputMode='text'; qtyEl.autocomplete='off';
      qtyEl.pattern=''; qtyEl.setAttribute('enterkeyhint','next');
    }catch(e){}
    if(qtyEl.dataset.v52Smart==='1')return; qtyEl.dataset.v52Smart='1';
    const split=(value)=>{let q='',u='',hit=false; for(const ch of String(value||'')){ if(!hit && /[0-9.,\/\-\s]/.test(ch)) q+=ch; else {hit=true;u+=ch;} } return {q:q.trim(),u:u.trim()};};
    const move=(txt)=>{ if(!txt)return; unitEl.value=(unitEl.value||'')+txt; unitEl.focus(); try{unitEl.setSelectionRange(unitEl.value.length,unitEl.value.length)}catch(e){} if(onChange)onChange(); };
    qtyEl.addEventListener('beforeinput',ev=>{
      const d=ev.data||'';
      if(d && /[^0-9.,\/\-\s]/.test(d)){
        ev.preventDefault(); const p=split(d); if(p.q)qtyEl.value=(qtyEl.value||'')+p.q; move(p.u||d.replace(/[0-9.,\/\-\s]/g,''));
      }
    });
    qtyEl.addEventListener('input',()=>{const p=split(qtyEl.value); if(p.u){qtyEl.value=p.q; move(p.u);} if(onChange)onChange();});
  }
  window.applySmartQtyUnitInputs=function(){
    const cb=()=>{try{if(typeof updatePOPreview==='function')updatePOPreview()}catch(e){}};
    smartSetup(document.getElementById('qtyInput'),document.getElementById('unitInput'));
    smartSetup(document.getElementById('tmQty'),document.getElementById('tmUnit'));
    smartSetup(document.getElementById('sameQty'),document.getElementById('sameUnit'));
    smartSetup(document.getElementById('manualPOQty'),document.getElementById('manualPOUnit'),cb);
    document.querySelectorAll('.poLine').forEach(r=>smartSetup(r.querySelector('.poQty'),r.querySelector('.poUnit'),cb));
  };
  function choiceDialog(title,msg,buttons){
    return new Promise(resolve=>{
      let m=document.getElementById('v52ChoiceModal');
      if(!m){m=document.createElement('div');m.id='v52ChoiceModal';m.className='modal';document.body.appendChild(m);} 
      m.innerHTML=`<div class="sheet"><h2>${escapeHtml(title)}</h2><p class="muted" style="line-height:1.6">${escapeHtml(msg).replace(/\n/g,'<br>')}</p><div class="rowBtns" style="margin-top:14px">${buttons.map(b=>`<button class="btn ${b.cls||'gray'}" data-val="${b.val}">${escapeHtml(b.text)}</button>`).join('')}</div></div>`;
      m.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{m.classList.remove('show');resolve(btn.dataset.val);});
      m.classList.add('show');
    });
  }
  async function resolveBeforeSave(){
    const el=document.getElementById('nameInput'); if(!el)return {ok:true};
    const name=el.value.trim(); if(!name)return {ok:true};
    // Same branch duplicate first.
    const dup=findSimilar(name,true);
    if(dup && dup.item){
      const r=await choiceDialog('สินค้านี้ถูกบันทึกลงไปแล้ว',`รายการที่พิมพ์: ${name}\nใกล้เคียงกับรายการเดิม: ${dup.item.name}\n\nถ้าเป็นรายการเดิมและไม่ได้เหลือน้อยกว่าเดิม ให้กด ตกลง เพื่อไม่บันทึกซ้ำ`,[
        {text:'ตกลง',val:'cancel',cls:'gray'},
        {text:'เหลือน้อยกว่าเดิม',val:'replace',cls:'warn'}
      ]);
      if(r==='cancel'){toast('ไม่บันทึกซ้ำ'); return {ok:false};}
      if(r==='replace'){ window.editId=dup.item.id; el.value=dup.item.name; return {ok:true};}
    }
    // Cross branch / general similar product.
    const simi=findSimilar(name,false);
    if(simi && simi.name && safeNorm(simi.name)!==safeNorm(name)){
      const asked=getAsked(); const k=safeNorm(name)+'__'+safeNorm(simi.name);
      if(!asked[k]){
        asked[k]=1; setAsked(asked);
        const r=await choiceDialog('ใช่สินค้าเดียวกันไหม?',`รายการที่พิมพ์: ${name}\nคล้ายกับ: ${simi.name}\n\nถ้าใช่ ระบบจะจำว่า 2 ชื่อนี้คือสินค้าเดียวกัน และนำไปรวมในหน้าของขาดรวม / ต้องสั่ง`,[
          {text:'ไม่ใช่',val:'no',cls:'gray'},
          {text:'ใช่สินค้าเดียวกัน',val:'yes',cls:'ok'}
        ]);
        if(r==='yes'){const a=getAlias(); a[safeNorm(name)]=simi.name; setAlias(a); el.value=simi.name;}
      }
    }
    return {ok:true};
  }
  // Replace saveItem with a full version so duplicate handling is reliable.
  window.saveItem=saveItem=async function(){
    const r=await resolveBeforeSave(); if(!r.ok)return;
    const name=document.getElementById('nameInput').value.trim();
    if(!name)return toast('กรุณาใส่ชื่อสินค้า');
    if(window.currentStatus==='low'&&!document.getElementById('qtyInput').value.trim())return toast('กรุณาใส่จำนวนคงเหลือ');
    const now=Date.now();
    let supplierVal=document.getElementById('supplierInput').value.trim()||'ยังไม่ได้ระบุ';
    if(supplierVal!=='ยังไม่ได้ระบุ'&&Array.isArray(window.suppliersMaster)&&!window.suppliersMaster.includes(supplierVal)){window.suppliersMaster.push(supplierVal);localStorage.setItem('stockAlertSuppliers',JSON.stringify(window.suppliersMaster));}
    let data={name,search:safeNorm(name),branch:window.currentBranch,status:window.currentStatus,qty:window.currentStatus==='low'?document.getElementById('qtyInput').value.trim():'',unit:window.currentStatus==='low'?document.getElementById('unitInput').value.trim():'',supplier:supplierVal,category:window.currentCategory||'เบ็ดเตล็ด',note:document.getElementById('noteInput').value.trim(),updatedAt:now,updatedBy:window.nickname||'ไม่ระบุ'};
    if(window.editId){await updateDoc(window.editId,data);log('แก้ไขรายการ',name)}
    else{data.createdAt=now;data.createdBy=window.nickname||'ไม่ระบุ';data.transferPrepared=false;data.transferDone=false;await addDoc(data);log('ลงของขาด',name)}
    go('home');toast('บันทึกแล้ว');
  };
  function attachNameWatch(){
    const el=document.getElementById('nameInput'); if(!el||el.dataset.v52NameWatch==='1')return; el.dataset.v52NameWatch='1';
    let timer=null;
    el.addEventListener('input',()=>{clearTimeout(timer); const v=el.value.trim(); if(safeNorm(v).length<4)return; timer=setTimeout(async()=>{
      if(document.activeElement!==el)return;
      const simi=findSimilar(v,false); if(!simi||safeNorm(simi.name)===safeNorm(v))return;
      const asked=getAsked(); const k='live__'+safeNorm(v)+'__'+safeNorm(simi.name); if(asked[k])return; asked[k]=1; setAsked(asked);
      const r=await choiceDialog('อาจเป็นสินค้าเดียวกัน',`รายการที่พิมพ์: ${v}\nคล้ายกับ: ${simi.name}\n\nใช่สินค้าเดียวกันไหม?`,[{text:'ไม่ใช่',val:'no',cls:'gray'},{text:'ใช่',val:'yes',cls:'ok'}]);
      if(r==='yes'){const a=getAlias(); a[safeNorm(v)]=simi.name; setAlias(a); el.value=simi.name;}
    },900);});
  }
  const oldOpenFormV52=window.openForm||openForm;
  window.openForm=openForm=function(b,it=null){oldOpenFormV52(b,it); setTimeout(()=>{applySmartQtyUnitInputs();attachNameWatch();},30);};
  const oldRenderPOV52=window.renderPOSupplier||renderPOSupplier;
  window.renderPOSupplier=renderPOSupplier=function(){oldRenderPOV52();setTimeout(applySmartQtyUnitInputs,0);};
  setTimeout(()=>{applySmartQtyUnitInputs();attachNameWatch();},300);
})();

/* === V5.4 Smart Input V2: stable Thai unit auto-jump (fix duplicate first character) === */
(function(){
  function splitQtyUnitV54(value){
    const s=String(value||'');
    let qty='', unit='', hitUnit=false;
    for(const ch of s){
      if(!hitUnit && /[0-9.,\/\-\s]/.test(ch)) qty+=ch;
      else { hitUnit=true; unit+=ch; }
    }
    return {qty:qty.trim(), unit:unit.trim()};
  }
  function isUnitTextV54(text){
    return !!String(text||'').replace(/[0-9.,\/\-\s]/g,'');
  }
  function cleanAndBindSmartV54(qtyEl, unitEl, onChange){
    if(!qtyEl || !unitEl) return;

    // Remove all older smart-input listeners by cloning the input once.
    if(qtyEl.dataset.v54Cleaned !== '1'){
      const clone = qtyEl.cloneNode(true);
      clone.value = qtyEl.value || '';
      clone.dataset.v54Cleaned = '1';
      qtyEl.parentNode.replaceChild(clone, qtyEl);
      qtyEl = clone;
    }
    if(qtyEl.dataset.v54Smart === '1') return;
    qtyEl.dataset.v54Smart = '1';

    try{
      qtyEl.type = 'text';
      qtyEl.setAttribute('inputmode','text');
      qtyEl.inputMode = 'text';
      qtyEl.autocomplete = 'off';
      qtyEl.pattern = '';
      qtyEl.setAttribute('enterkeyhint','next');
    }catch(e){}

    const moveToUnit = (txt)=>{
      if(!txt) return;
      unitEl.value = (unitEl.value || '') + txt;
      unitEl.focus();
      try{ unitEl.setSelectionRange(unitEl.value.length, unitEl.value.length); }catch(e){}
      if(typeof onChange === 'function') onChange();
    };

    // Main path: prevent the original character from being inserted into qty.
    // This prevents iOS/Android from duplicating the first Thai character.
    qtyEl.addEventListener('beforeinput', function(ev){
      const d = ev.data || '';
      if(!d || !isUnitTextV54(d)) return;
      ev.preventDefault();
      const p = splitQtyUnitV54(d);
      if(p.qty) qtyEl.value = (qtyEl.value || '') + p.qty;
      moveToUnit(p.unit || d.replace(/[0-9.,\/\-\s]/g,''));
    }, {capture:true});

    // Fallback for browsers that do not support beforeinput or paste/autofill.
    qtyEl.addEventListener('input', function(){
      const p = splitQtyUnitV54(qtyEl.value);
      if(p.unit){
        qtyEl.value = p.qty;
        moveToUnit(p.unit);
      }
      if(typeof onChange === 'function') onChange();
    });
  }

  window.applySmartQtyUnitInputs = function(){
    const cb = ()=>{ try{ if(typeof updatePOPreview === 'function') updatePOPreview(); }catch(e){} };
    cleanAndBindSmartV54(document.getElementById('qtyInput'), document.getElementById('unitInput'));
    cleanAndBindSmartV54(document.getElementById('tmQty'), document.getElementById('tmUnit'));
    cleanAndBindSmartV54(document.getElementById('sameQty'), document.getElementById('sameUnit'));
    cleanAndBindSmartV54(document.getElementById('manualPOQty'), document.getElementById('manualPOUnit'), cb);
    document.querySelectorAll('.poLine').forEach(row=>{
      cleanAndBindSmartV54(row.querySelector('.poQty'), row.querySelector('.poUnit'), cb);
    });
  };

  // Make sure newly rendered pages and modals are rebound with the cleaned inputs.
  const oldOpenFormV54 = window.openForm;
  if(typeof oldOpenFormV54 === 'function'){
    window.openForm = function(){
      const r = oldOpenFormV54.apply(this, arguments);
      setTimeout(window.applySmartQtyUnitInputs, 40);
      return r;
    };
  }
  const oldOpenTransferV54 = window.openTransfer;
  if(typeof oldOpenTransferV54 === 'function'){
    window.openTransfer = function(){
      const r = oldOpenTransferV54.apply(this, arguments);
      setTimeout(window.applySmartQtyUnitInputs, 40);
      return r;
    };
  }
  const oldRenderPOV54 = window.renderPOSupplier;
  if(typeof oldRenderPOV54 === 'function'){
    window.renderPOSupplier = function(){
      const r = oldRenderPOV54.apply(this, arguments);
      setTimeout(window.applySmartQtyUnitInputs, 40);
      return r;
    };
  }
  setTimeout(window.applySmartQtyUnitInputs, 300);
})();

/* === V5.6 Stable: final save button + Smart Input V3 no duplicate/no blocking === */
(function(){
  function v56Norm(s){
    try { return norm(s); } catch(e) { return String(s||'').toLowerCase().replace(/\s+/g,'').trim(); }
  }
  function v56Esc(s){
    try { return saEscape(s); } catch(e) { return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  }
  function v56SplitQtyUnit(value){
    const s = String(value||'');
    let qty='', unit='', hit=false;
    for(const ch of s){
      if(!hit && /[0-9.,\/\-\s]/.test(ch)) qty += ch;
      else { hit = true; unit += ch; }
    }
    return { qty: qty.trim(), unit: unit.trim() };
  }
  function v56BindSmart(qtyEl, unitEl, onChange){
    if(!qtyEl || !unitEl) return;
    // Replace the input to remove every older beforeinput/keydown/input handler.
    if(qtyEl.dataset.v56Cleaned !== '1'){
      const clone = qtyEl.cloneNode(true);
      clone.value = qtyEl.value || '';
      clone.dataset.v56Cleaned = '1';
      qtyEl.parentNode.replaceChild(clone, qtyEl);
      qtyEl = clone;
    }
    if(qtyEl.dataset.v56Smart === '1') return;
    qtyEl.dataset.v56Smart = '1';
    try{
      qtyEl.type = 'text';
      qtyEl.inputMode = 'text';
      qtyEl.setAttribute('inputmode','text');
      qtyEl.autocomplete = 'off';
      qtyEl.pattern = '';
      qtyEl.setAttribute('enterkeyhint','next');
    }catch(e){}
    qtyEl.addEventListener('input', function(){
      const p = v56SplitQtyUnit(qtyEl.value);
      if(p.unit){
        qtyEl.value = p.qty;
        unitEl.value = (unitEl.value || '') + p.unit;
        unitEl.focus();
        try{ unitEl.setSelectionRange(unitEl.value.length, unitEl.value.length); }catch(e){}
      }
      if(typeof onChange === 'function') onChange();
    });
  }
  window.applySmartQtyUnitInputs = function(){
    const cb = ()=>{ try{ if(typeof updatePOPreview === 'function') updatePOPreview(); }catch(e){} };
    v56BindSmart(document.getElementById('qtyInput'), document.getElementById('unitInput'));
    v56BindSmart(document.getElementById('tmQty'), document.getElementById('tmUnit'));
    v56BindSmart(document.getElementById('sameQty'), document.getElementById('sameUnit'));
    v56BindSmart(document.getElementById('manualPOQty'), document.getElementById('manualPOUnit'), cb);
    document.querySelectorAll('.poLine').forEach(row=>v56BindSmart(row.querySelector('.poQty'), row.querySelector('.poUnit'), cb));
  };

  function v56Similarity(a,b){
    const x=v56Norm(a), y=v56Norm(b);
    if(!x || !y) return 0;
    if(x===y) return 1;
    if(x.includes(y) || y.includes(x)) return 0.86;
    const grams=s=>{const r=[]; for(let i=0;i<s.length-1;i++) r.push(s.slice(i,i+2)); return r;};
    const A=grams(x), B=grams(y); if(!A.length || !B.length) return 0;
    let hit=0; const used=new Set();
    A.forEach(g=>{const idx=B.findIndex((h,i)=>h===g&&!used.has(i)); if(idx>=0){hit++; used.add(idx);}});
    return (2*hit)/(A.length+B.length);
  }
  function v56Choice(title,msg,buttons){
    return new Promise(resolve=>{
      let m=document.getElementById('v56ChoiceModal');
      if(!m){m=document.createElement('div');m.id='v56ChoiceModal';m.className='modal';document.body.appendChild(m);} 
      m.innerHTML=`<div class="sheet"><h2>${v56Esc(title)}</h2><p class="muted" style="line-height:1.6">${v56Esc(msg).replace(/\n/g,'<br>')}</p><div class="rowBtns" style="margin-top:14px">${buttons.map(b=>`<button type="button" class="btn ${b.cls||'gray'}" data-val="${b.val}">${v56Esc(b.text)}</button>`).join('')}</div></div>`;
      m.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{m.classList.remove('show');resolve(btn.dataset.val);});
      m.classList.add('show');
    });
  }
  function v56BestSimilar(name, branchOnly){
    const key=v56Norm(name); if(key.length<3) return null;
    let list=(items||[]).filter(x=>x && x.name && (!editId || x.id!==editId));
    if(branchOnly) list=list.filter(x=>String(x.branch)===String(currentBranch));
    let best=null;
    for(const it of list){
      const sc=v56Similarity(name,it.name);
      if(!best || sc>best.score) best={item:it, score:sc};
    }
    return best && best.score>=0.62 ? best : null;
  }
  async function v56ResolveDuplicate(){
    const nameEl=document.getElementById('nameInput');
    const name=(nameEl?.value||'').trim();
    if(!name || editId) return true;
    const dup=v56BestSimilar(name,true);
    if(dup && dup.item){
      const r=await v56Choice('สินค้านี้ถูกบันทึกลงไปแล้ว',`รายการที่พิมพ์: ${name}\nใกล้เคียงกับรายการเดิม: ${dup.item.name}\n\nถ้าไม่ต้องการบันทึกซ้ำ ให้กด ตกลง`,[
        {text:'ตกลง',val:'cancel',cls:'gray'},
        {text:'เหลือน้อยกว่าเดิม',val:'replace',cls:'warn'}
      ]);
      if(r==='cancel'){ toast('ไม่บันทึกซ้ำ'); return false; }
      if(r==='replace'){ editId=dup.item.id; nameEl.value=dup.item.name; return true; }
    }
    const sim=v56BestSimilar(name,false);
    if(sim && sim.item && String(sim.item.branch)!==String(currentBranch) && v56Norm(sim.item.name)!==v56Norm(name)){
      const r=await v56Choice('ใช่สินค้าเดียวกันไหม?',`รายการที่พิมพ์: ${name}\nคล้ายกับ: ${sim.item.name}\n\nถ้าใช่ ระบบจะใช้ชื่อเดียวกันเพื่อรวมในหน้าของขาดรวมและหน้าต้องสั่ง`,[
        {text:'ไม่ใช่',val:'no',cls:'gray'},
        {text:'ใช่สินค้าเดียวกัน',val:'yes',cls:'ok'}
      ]);
      if(r==='yes') nameEl.value=sim.item.name;
    }
    return true;
  }

  window.saveItem = saveItem = async function(){
    try{
      if(!(await v56ResolveDuplicate())) return;
      const nameEl=document.getElementById('nameInput'), qtyEl=document.getElementById('qtyInput'), unitEl=document.getElementById('unitInput');
      const supplierEl=document.getElementById('supplierInput'), noteEl=document.getElementById('noteInput');
      const name=(nameEl?.value||'').trim();
      if(!name) return toast('กรุณาใส่ชื่อสินค้า');
      if(currentStatus==='low' && !(qtyEl?.value||'').trim()) return toast('กรุณาใส่จำนวนคงเหลือ');
      const now=Date.now();
      let supplierVal=(supplierEl?.value||'').trim() || 'ยังไม่ได้ระบุ';
      if(supplierVal!=='ยังไม่ได้ระบุ' && Array.isArray(suppliersMaster) && !suppliersMaster.includes(supplierVal)){
        suppliersMaster.push(supplierVal);
        localStorage.setItem('stockAlertSuppliers', JSON.stringify(suppliersMaster));
      }
      const data={
        name,
        search:v56Norm(name),
        branch:currentBranch,
        status:currentStatus,
        qty:currentStatus==='low' ? (qtyEl?.value||'').trim() : '',
        unit:currentStatus==='low' ? (unitEl?.value||'').trim() : '',
        supplier:supplierVal,
        category:currentCategory||'เบ็ดเตล็ด',
        note:(noteEl?.value||'').trim(),
        updatedAt:now,
        updatedBy:nickname||'ไม่ระบุ'
      };
      if(editId){ await updateDoc(editId,data); log('แก้ไขรายการ',name); }
      else { data.createdAt=now; data.createdBy=nickname||'ไม่ระบุ'; data.transferPrepared=false; data.transferDone=false; await addDoc(data); log('ลงของขาด',name); }
      editId=null;
      go('home');
      toast('บันทึกแล้ว');
    }catch(err){
      console.error('V5.6 saveItem error',err);
      toast('บันทึกไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const oldOpenFormV56 = window.openForm;
  if(typeof oldOpenFormV56 === 'function'){
    window.openForm = openForm = function(){
      const r = oldOpenFormV56.apply(this, arguments);
      setTimeout(window.applySmartQtyUnitInputs, 60);
      return r;
    };
  }
  const oldOpenTransferV56 = window.openTransfer;
  if(typeof oldOpenTransferV56 === 'function'){
    window.openTransfer = openTransfer = function(){
      const r = oldOpenTransferV56.apply(this, arguments);
      setTimeout(window.applySmartQtyUnitInputs, 60);
      return r;
    };
  }
  const oldOpenSameV56 = window.openSameShortage;
  if(typeof oldOpenSameV56 === 'function'){
    window.openSameShortage = openSameShortage = function(){
      const r = oldOpenSameV56.apply(this, arguments);
      setTimeout(window.applySmartQtyUnitInputs, 60);
      return r;
    };
  }
  const oldRenderPOV56 = window.renderPOSupplier;
  if(typeof oldRenderPOV56 === 'function'){
    window.renderPOSupplier = renderPOSupplier = function(){
      const r = oldRenderPOV56.apply(this, arguments);
      setTimeout(window.applySmartQtyUnitInputs, 60);
      return r;
    };
  }
  setTimeout(window.applySmartQtyUnitInputs, 500);
})();


/* === V5.7 FINAL Save Button Fix: save then close page reliably === */
(function(){
  async function finalResolveDuplicateIfAvailable(){
    try{
      if(typeof v56ResolveDuplicate === 'function') return await v56ResolveDuplicate();
    }catch(e){ console.warn('duplicate check skipped', e); }
    try{
      if(typeof resolveBeforeSave === 'function'){
        const r = await resolveBeforeSave();
        return !r || r.ok !== false;
      }
    }catch(e){ console.warn('duplicate check skipped', e); }
    return true;
  }
  async function finalWriteItem(data, isEdit, id){
    // Do not let a slow/offline Firebase write block the UI from closing.
    try{
      if(isEdit){
        const p = updateDoc(id, data);
        if(p && typeof p.then === 'function') p.catch(err=>console.error('update after close failed', err));
      }else{
        const p = addDoc(data);
        if(p && typeof p.then === 'function') p.catch(err=>console.error('add after close failed', err));
      }
    }catch(e){
      console.error('write failed, fallback local', e);
      try{
        if(isEdit){ items = items.map(x=>x.id===id ? {...x,...data} : x); }
        else { items.push({id:'local_'+Date.now(),...data}); }
        persist();
      }catch(_){ }
    }
  }
  window.saveItem = saveItem = async function(){
    try{
      const ok = await finalResolveDuplicateIfAvailable();
      if(!ok) return;
      const nameEl=document.getElementById('nameInput');
      const qtyEl=document.getElementById('qtyInput');
      const unitEl=document.getElementById('unitInput');
      const supplierEl=document.getElementById('supplierInput');
      const noteEl=document.getElementById('noteInput');
      const name=(nameEl&&nameEl.value||'').trim();
      if(!name) return toast('กรุณาใส่ชื่อสินค้า');
      if(currentStatus==='low' && !(qtyEl&&qtyEl.value||'').trim()) return toast('กรุณาใส่จำนวนคงเหลือ');
      const now=Date.now();
      let supplierVal=(supplierEl&&supplierEl.value||'').trim() || 'ยังไม่ได้ระบุ';
      if(supplierVal!=='ยังไม่ได้ระบุ' && Array.isArray(suppliersMaster) && !suppliersMaster.includes(supplierVal)){
        suppliersMaster.push(supplierVal);
        localStorage.setItem('stockAlertSuppliers', JSON.stringify(suppliersMaster));
      }
      const data={
        name,
        search:(typeof norm==='function'?norm(name):String(name).toLowerCase()),
        branch:currentBranch,
        status:currentStatus,
        qty:currentStatus==='low' ? (qtyEl&&qtyEl.value||'').trim() : '',
        unit:currentStatus==='low' ? (unitEl&&unitEl.value||'').trim() : '',
        supplier:supplierVal,
        category:currentCategory||'เบ็ดเตล็ด',
        note:(noteEl&&noteEl.value||'').trim(),
        updatedAt:now,
        updatedBy:nickname||'ไม่ระบุ'
      };
      const isEdit=!!editId;
      const id=editId;
      if(isEdit){ log('แก้ไขรายการ',name); }
      else{
        data.createdAt=now;
        data.createdBy=nickname||'ไม่ระบุ';
        data.transferPrepared=false;
        data.transferDone=false;
        log('ลงของขาด',name);
      }
      // close immediately and write in background
      finalWriteItem(data,isEdit,id);
      editId=null;
      go('home');
      toast('บันทึกแล้ว');
      setTimeout(()=>{ try{ renderAll(); }catch(e){} },300);
    }catch(err){
      console.error('V5.7 saveItem error',err);
      toast('บันทึกไม่สำเร็จ กรุณาลองใหม่');
    }
  };
})();

/* === V5.8 FINAL PO Preview + Manual Unit Fix === */
(function(){
  function esc(v){
    if(typeof saEscape === 'function') return saEscape(v);
    return String(v??'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function dateTH(){
    try{return new Date().toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'numeric'});}catch(e){return new Date().toLocaleDateString('th-TH');}
  }
  function qtyUnit(x){return `${x.qty||'-'} ${x.unit||''}`.trim();}
  function attachPOEvents(){
    document.querySelectorAll('.poQty,.poUnit,#poShowCompany').forEach(el=>el.addEventListener('input',()=>{try{updatePOPreview();}catch(e){}}));
    if(typeof applySmartQtyUnitInputs==='function') setTimeout(applySmartQtyUnitInputs,40);
  }

  window.renderPOSupplier = renderPOSupplier = function(){
    const title=document.getElementById('poSupplierTitle'), box=document.getElementById('poItemsBox');
    if(!box) return;
    const supplier=currentPOSupplier||'';
    if(title) title.textContent=`ใบสั่งสินค้า ${supplier}`;
    const groups=(typeof supplierGroupsForPO==='function' ? (supplierGroupsForPO()[supplier]||[]) : []);
    const manual=(poManualItems&&poManualItems[supplier])||[];
    const lines=groups.map((g)=>{
      const nm=String(g.name||'');
      return `<div class="poLine" data-name="${esc(nm)}">
        <div><b>${esc(nm)}</b><div class="muted">สาขา 1: ${esc(branchText(g.b1))}<br>สาขา 2: ${esc(branchText(g.b2))}</div></div>
        <input class="poQty" type="text" inputmode="text" placeholder="จำนวน">
        <input class="poUnit" type="text" inputmode="text" value="" placeholder="หน่วย">
      </div>`;
    }).join('');
    const manualLines=manual.map((x,i)=>`<div class="poLine" data-name="${esc(x.name)}">
        <div><b>${esc(x.name)}</b><div class="muted">สินค้าเพิ่มเองในใบสั่งนี้</div><button class="removeMini" onclick="removeManualPOItem(${i})">ลบ</button></div>
        <input class="poQty" type="text" inputmode="text" value="${esc(x.qty||'')}" placeholder="จำนวน">
        <input class="poUnit" type="text" inputmode="text" value="${esc(x.unit||'')}" placeholder="หน่วย">
      </div>`).join('');
    box.innerHTML=`<div class="poPanel">
      <div class="switchRow"><input type="checkbox" id="poShowCompany" checked><label for="poShowCompany" style="margin:0">แสดงชื่อบริษัทบนหัวกระดาษ</label></div>
      <div class="manualAdd"><h3>เพิ่มสินค้า</h3><div class="manualGrid"><input id="manualPOName" placeholder="ชื่อสินค้า"><input id="manualPOQty" type="text" inputmode="text" placeholder="จำนวน"><input id="manualPOUnit" type="text" inputmode="text" placeholder="หน่วย"></div><button class="btn gray" style="width:100%;margin-top:10px" onclick="addManualPOItem()">+ เพิ่มเข้ารายการใบสั่ง</button></div>
      ${lines}${manualLines}${(!lines&&!manualLines)?'<div class="empty">ไม่มีรายการรอใส่จำนวน/หน่วยของบริษัทนี้</div>':''}
      <div class="poActions"><button class="btn primary" onclick="copyPOText()">คัดลอกรายการสินค้า</button><button class="btn ok" onclick="exportPOImage()">ส่งออกเป็นรูปภาพ</button></div>
      <button class="btn primary" style="width:100%;margin-top:10px" onclick="confirmPOOrder()">ยืนยันสั่งแล้ว</button>
      <div class="paperPreview" id="poPreview"></div>
    </div>`;
    updatePOPreview(); attachPOEvents();
  };

  window.updatePOPreview = updatePOPreview = function(){
    const p=document.getElementById('poPreview'); if(!p) return;
    const lines=(typeof collectPOLines==='function'?collectPOLines():[]);
    const show=document.getElementById('poShowCompany')?.checked;
    p.innerHTML=`<div class="poMiniPaper">
      ${show?`<h3>${esc(currentPOSupplier||'')}</h3>`:''}
      <div class="poPaperTitle">ใบสั่งสินค้า</div>
      <div class="poPaperLines">${lines.length?lines.map(x=>`<div class="poPaperRow"><span>${esc(x.name)}</span><b>${esc(qtyUnit(x))}</b></div>`).join(''):'<div class="muted" style="text-align:center">กรอกจำนวนสินค้าที่ต้องการสั่ง</div>'}</div>
      <div class="poPreviewHint">กด “ส่งออกเป็นรูปภาพ” เพื่อดูตัวอย่างเต็มจอก่อนบันทึก</div>
    </div>`;
  };

  window.poExportMode='full';
  window.setPOExportMode = setPOExportMode = function(mode){ window.poExportMode=mode; renderPOExportPreview(); };
  window.poPreviewHTML = poPreviewHTML = function(mode='full'){
    const lines=(typeof collectPOLines==='function'?collectPOLines():[]);
    const supplier=(document.getElementById('poShowCompany')?.checked?currentPOSupplier:'')||'';
    return `<div class="poClassicPaper ${mode==='full'?'full':'crop'}">
      <div class="poClassicInner">
        <div class="poTear"></div>
        <div class="poClassicHeader">${supplier?`<div class="supplier">${esc(supplier)}</div>`:''}<div class="docTitle">ใบสั่งสินค้า</div><div class="date">วันที่ ${dateTH()}</div></div>
        <div class="poClassicRows">${lines.length?lines.map(x=>`<div class="poClassicRow"><div class="name">${esc(x.name)}</div><div class="amount">${esc(qtyUnit(x))}</div></div>`).join(''):'<div class="empty">กรอกจำนวนสินค้าที่ต้องการสั่ง</div>'}</div>
        <div class="poClassicFooter"><span>รายการทั้งหมด ${lines.length} รายการ</span><span>Stock Alert</span></div>
      </div>
    </div>`;
  };
  window.renderPOExportPreview = renderPOExportPreview = function(){
    const stage=document.getElementById('poPaperStage'); if(stage) stage.innerHTML=poPreviewHTML(window.poExportMode||'full');
    document.querySelectorAll('.poModeSwitch button').forEach(b=>b.classList.toggle('active',b.dataset.mode===(window.poExportMode||'full')));
  };
  window.exportPOImage = exportPOImage = function(){
    updatePOPreview();
    const lines=(typeof collectPOLines==='function'?collectPOLines():[]);
    if(!lines.length) return toast('กรุณาใส่จำนวนก่อนส่งออก');
    let modal=document.getElementById('poExportPreviewModal');
    if(!modal){modal=document.createElement('div'); modal.id='poExportPreviewModal'; modal.className='modal poPreviewModal'; document.body.appendChild(modal);}
    modal.innerHTML=`<div class="sheet poFullSheet"><div class="poPreviewTop"><h2>ตัวอย่างใบสั่งสินค้า</h2><button class="btn gray" onclick="closeModal('poExportPreviewModal')">ปิด</button></div>
      <div class="poModeSwitch"><button data-mode="full" onclick="setPOExportMode('full')">เต็มหน้า</button><button data-mode="crop" onclick="setPOExportMode('crop')">ตัดตามรายการ</button></div>
      <div class="poPaperStage" id="poPaperStage"></div>
      <div class="poPreviewActions"><button class="btn gray" onclick="closeModal('poExportPreviewModal')">กลับไปแก้ไข</button><button class="btn primary" onclick="savePOImage()">บันทึกรูป</button><button class="btn ok" onclick="sharePOImage()">แชร์</button></div></div>`;
    modal.classList.add('show'); renderPOExportPreview();
  };

  function wrap(ctx,text,x,y,maxWidth,lineHeight){
    const s=String(text||''); let lines=[]; let cur='';
    for(const ch of s){ const test=cur+ch; if(ctx.measureText(test).width>maxWidth && cur){lines.push(cur); cur=ch;} else cur=test; }
    if(cur) lines.push(cur); lines.forEach((ln,i)=>ctx.fillText(ln,x,y+i*lineHeight)); return Math.max(1,lines.length)*lineHeight;
  }
  window.drawPOCanvas = drawPOCanvas = function(mode='full'){
    const lines=(typeof collectPOLines==='function'?collectPOLines():[]);
    const supplier=(document.getElementById('poShowCompany')?.checked?currentPOSupplier:'')||'';
    const w=1200, rowMin=64;
    const tmp=document.createElement('canvas').getContext('2d'); tmp.font='bold 30px Tahoma, sans-serif';
    const dynRows=lines.reduce((sum,x)=>sum+Math.max(rowMin,Math.ceil(tmp.measureText(String(x.name||'')).width/610)*36+26),0);
    const h=mode==='full'?1600:Math.max(680,270+dynRows+130);
    const c=document.createElement('canvas'); c.width=w; c.height=h; const ctx=c.getContext('2d');
    ctx.fillStyle='#eef3f7'; ctx.fillRect(0,0,w,h);
    const px=90, py=60, pw=w-180, ph=h-120;
    ctx.shadowColor='rgba(0,0,0,.16)'; ctx.shadowBlur=34; ctx.shadowOffsetY=16;
    ctx.fillStyle='#fffdf4'; ctx.fillRect(px,py,pw,ph); ctx.shadowColor='transparent';
    ctx.strokeStyle='#ddcdb4'; ctx.lineWidth=2; ctx.strokeRect(px,py,pw,ph);
    ctx.fillStyle='rgba(222,210,185,.18)'; for(let yy=py+120; yy<py+ph-70; yy+=40){ctx.fillRect(px+38,yy,pw-76,1);}
    let y=py+84; ctx.textAlign='center'; ctx.fillStyle='#111827';
    if(supplier){ctx.font='bold 44px Tahoma, sans-serif'; ctx.fillText(supplier,w/2,y); y+=54;}
    ctx.font='bold 38px Tahoma, sans-serif'; ctx.fillText('ใบสั่งสินค้า',w/2,y); y+=40;
    ctx.font='bold 22px Tahoma, sans-serif'; ctx.fillStyle='#6b7280'; ctx.fillText('วันที่ '+dateTH(),w/2,y); y+=48;
    ctx.strokeStyle='#d2bea1'; ctx.beginPath(); ctx.moveTo(px+70,y); ctx.lineTo(px+pw-70,y); ctx.stroke(); y+=34;
    const nameX=px+76, amountRight=px+pw-76, nameW=pw-330;
    for(const item of lines){
      const startY=y;
      ctx.textAlign='left'; ctx.fillStyle='#111827'; ctx.font='bold 30px Tahoma, sans-serif';
      const used=wrap(ctx,item.name,nameX,y,nameW,38);
      ctx.textAlign='right'; ctx.font='bold 30px Tahoma, sans-serif'; ctx.fillText(qtyUnit(item),amountRight,startY);
      y += Math.max(used,38)+22;
      ctx.strokeStyle='#ded1bb'; ctx.setLineDash([8,8]); ctx.beginPath(); ctx.moveTo(px+70,y-8); ctx.lineTo(px+pw-70,y-8); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.textAlign='left'; ctx.fillStyle='#6b7280'; ctx.font='bold 20px Tahoma, sans-serif'; ctx.fillText(`รายการทั้งหมด ${lines.length} รายการ`,px+76,py+ph-42);
    ctx.textAlign='right'; ctx.fillText('Stock Alert',px+pw-76,py+ph-42);
    return c;
  };
  window.poCanvasBlob = poCanvasBlob = async function(mode=window.poExportMode||'full'){const c=drawPOCanvas(mode); return await new Promise(res=>c.toBlob(res,'image/png',0.95));};
  window.savePOImage = savePOImage = async function(){
    try{const blob=await poCanvasBlob(); const fileName=`ใบสั่งสินค้า_${currentPOSupplier||'supplier'}_${Date.now()}.png`; const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fileName; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2500); toast('บันทึกรูปใบสั่งสินค้าแล้ว');}
    catch(e){console.error(e); toast('บันทึกรูปไม่สำเร็จ');}
  };
  window.sharePOImage = sharePOImage = async function(){
    try{const blob=await poCanvasBlob(); const fileName=`ใบสั่งสินค้า_${currentPOSupplier||'supplier'}_${Date.now()}.png`; const file=new File([blob],fileName,{type:'image/png'}); if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'ใบสั่งสินค้า'}); toast('แชร์ใบสั่งสินค้าแล้ว');}else{await savePOImage();}}
    catch(e){console.error(e); toast('แชร์ไม่สำเร็จ');}
  };

  const style=document.createElement('style');
  style.textContent=`
  .paperPreview{margin-top:18px}.poMiniPaper{background:#fffdf7;border:1px solid #e4d7c2;border-radius:18px;padding:20px;box-shadow:0 8px 18px rgba(0,0,0,.06)}.poPaperRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:start;border-bottom:1px dashed #ddd0bb;padding:12px 0}.poPaperRow span{min-width:0;overflow-wrap:anywhere}.poPaperRow b{white-space:nowrap}.poPreviewHint{font-size:12px;color:#64748b;text-align:center;margin-top:12px}
  .poPreviewModal{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:none;align-items:stretch;justify-content:center}.poPreviewModal.show{display:flex}.poFullSheet{width:min(100%,760px)!important;max-height:100vh!important;border-radius:0!important;overflow:auto!important;padding:16px!important;background:#f3f6f9!important}.poPreviewTop,.poPreviewActions{display:flex;gap:10px;align-items:center;justify-content:space-between;position:sticky;background:#f3f6f9;z-index:2}.poPreviewTop{top:0;padding-bottom:10px}.poPreviewActions{bottom:0;padding-top:10px}.poModeSwitch{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0 14px}.poModeSwitch button{border:1px solid #dbe5f0;background:white;border-radius:14px;padding:12px;font-weight:900;color:#0f172a}.poModeSwitch button.active{background:#1473ff;color:white;border-color:#1473ff}.poPaperStage{display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:8px 0 16px}.poClassicPaper{width:min(680px,96vw);background:#fffdf4;border:1px solid #ddcdb4;box-shadow:0 18px 38px rgba(0,0,0,.16);position:relative}.poClassicPaper.full{min-height:92vh}.poClassicPaper.crop{min-height:420px}.poClassicInner{padding:42px 42px 54px;background:linear-gradient(rgba(255,255,255,.15),rgba(255,255,255,.15)),repeating-linear-gradient(0deg,transparent 0,transparent 36px,rgba(185,160,120,.12) 37px)}.poTear{height:10px;margin:-42px -42px 24px;background:linear-gradient(135deg,transparent 8px,#fffdf4 0) left,linear-gradient(225deg,transparent 8px,#fffdf4 0) right;background-size:16px 10px;background-repeat:repeat-x}.poClassicHeader{text-align:center;border-bottom:1px solid #d2bea1;padding-bottom:18px;margin-bottom:16px}.poClassicHeader .supplier{font-size:30px;font-weight:950}.poClassicHeader .docTitle{font-size:26px;font-weight:950;margin-top:6px}.poClassicHeader .date{font-size:14px;color:#64748b;font-weight:800;margin-top:8px}.poClassicRow{display:grid;grid-template-columns:minmax(0,1fr) max-content;gap:16px;border-bottom:1px dashed #d7c7ad;padding:12px 0;align-items:start}.poClassicRow .name{font-weight:850;overflow-wrap:anywhere;line-height:1.35}.poClassicRow .amount{font-weight:950;white-space:nowrap}.poClassicFooter{display:flex;justify-content:space-between;color:#64748b;font-size:13px;font-weight:800;margin-top:26px}
  `;
  document.head.appendChild(style);
})();


/* === V6.0 Stable UX Fix: transfer receive returns home + blank transfer unit === */
(function(){
  function safeToast(msg){ try{ if(typeof toast==='function') toast(msg); }catch(e){} }

  // In the transfer modal, do NOT auto-fill unit from the shortage item.
  // Keep an existing transfer unit only when editing an already-prepared transfer.
  window.openTransfer = function(id, from, to){
    const it = (window.items || items || []).find(x => x.id === id);
    if(!it) return safeToast('ไม่พบรายการ');
    window.transferTarget = transferTarget = {id, from, to};
    if(window.tmTitle || document.getElementById('tmTitle')) (window.tmTitle || document.getElementById('tmTitle')).textContent = it.name || '';
    if(window.tmSub || document.getElementById('tmSub')) (window.tmSub || document.getElementById('tmSub')).textContent = `สาขา ${from} → สาขา ${to}`;
    const q = document.getElementById('tmQty');
    const u = document.getElementById('tmUnit');
    if(q) q.value = it.transferQty || '';
    if(u) {
      u.value = it.transferPrepared ? (it.transferUnit || '') : '';
      u.placeholder = 'หน่วย';
    }
    let old=document.getElementById('transferDecisionBox');
    if(!old){
      const btn=document.querySelector('#transferModal .btn.ok');
      if(btn){
        const div=document.createElement('div');
        div.id='transferDecisionBox';
        div.innerHTML=`<label>หลังรับ/ส่งแล้ว รายการนี้</label><div class="choiceBox"><button type="button" id="decRemove" onclick="setTransferDecision('remove')">ไม่ต้องสั่งแล้ว</button><button type="button" id="decKeep" onclick="setTransferDecision('keep')">ยังต้องสั่ง</button></div>`;
        btn.parentNode.insertBefore(div,btn);
      }
    }
    try{ setTransferDecision(it.transferDecision || 'remove'); }catch(e){}
    const m=document.getElementById('transferModal');
    if(m) m.classList.add('show');
  };

  // Confirming a completed transfer closes the transfer batch, records history,
  // updates shortage data, and always returns to Home immediately after OK.
  window.confirmTransferReceived = async function(from,to){
    try{
      const tasks = (typeof transferTasksByDirection==='function') ? transferTasksByDirection(from,to) : [];
      if(!tasks.length) return safeToast('ยังไม่มีรายการที่ต้องปิดรอบ');
      if(!confirm('ยืนยันว่ามีการรับ/ส่งของแล้วใช่ไหม?')) return;
      const hist={
        id:'tr_'+Date.now(),
        from,to,
        round:(typeof transferRound==='function'?transferRound(from,to):1),
        doneAt:Date.now(),
        items:tasks.map(t=>({
          name:t.need.name,
          qty:t.need.transferQty,
          unit:t.need.transferUnit,
          decision:t.need.transferDecision||'remove',
          needId:t.need.id,
          by:t.need.transferBy||'',
          at:t.need.transferAt||''
        }))
      };
      if(!Array.isArray(window.transferHistory || transferHistory)) window.transferHistory = transferHistory = [];
      transferHistory.unshift(hist);
      for(const t of tasks){
        const it=t.need;
        if((it.transferDecision||'remove')==='remove'){
          if(window.online && window.db){
            await db.collection(COLLECTION).doc(it.id).delete();
          }else{
            window.items = items = (items||[]).filter(x=>x.id!==it.id);
            try{ localStorage.setItem('stockAlertItems', JSON.stringify(items)); }catch(e){}
          }
        }else{
          const old=parseFloat(String(it.qty||'0').replace(/,/g,''))||0;
          const add=parseFloat(String(it.transferQty||'0').replace(/,/g,''))||0;
          const newUnit = it.unit || it.transferUnit || '';
          if(typeof updateDoc==='function'){
            await updateDoc(it.id,{qty:String(old+add),status:'low',unit:newUnit,transferPrepared:false,transferDone:false,transferQty:'',transferUnit:'',transferDecision:'keep'});
          }
        }
      }
      if(typeof persistOrders==='function') persistOrders();
      if(typeof log==='function') log('รับ/ส่งของแบ่งแล้ว',`สาขา ${from} → สาขา ${to}`);
      if(typeof renderAll==='function') renderAll();
      if(typeof go==='function') go('home');
      safeToast('รับ/ส่งสินค้าเรียบร้อยแล้ว');
    }catch(err){
      console.error(err);
      safeToast('บันทึกการรับ/ส่งไม่สำเร็จ');
    }
  };
})();

/* === V6.1 UI Consistency Fix: blank transfer units + supplier placeholder === */
(function(){
  function blankIfUnknownSupplier(){
    try{
      var el=document.getElementById('supplierInput');
      if(!el) return;
      if((el.value||'').trim()==='ยังไม่ได้ระบุ') el.value='';
      el.placeholder='ยังไม่ได้ระบุ';
    }catch(e){}
  }

  function clearTransferUnitFields(){
    try{
      var tm=document.getElementById('tmUnit');
      if(tm){ tm.value=''; tm.placeholder='หน่วย'; }
      var same=document.getElementById('sameUnit');
      if(same){ same.value=''; same.placeholder='หน่วย'; }
    }catch(e){}
  }

  // Supplier field should show unknown as placeholder, not editable text.
  var oldOpenForm=window.openForm;
  if(typeof oldOpenForm==='function'){
    window.openForm=openForm=function(){
      var r=oldOpenForm.apply(this,arguments);
      setTimeout(blankIfUnknownSupplier,20);
      return r;
    };
  }

  // Transfer page: unit must always be typed manually.
  var oldOpenTransfer=window.openTransfer;
  if(typeof oldOpenTransfer==='function'){
    window.openTransfer=openTransfer=function(){
      var r=oldOpenTransfer.apply(this,arguments);
      setTimeout(function(){
        clearTransferUnitFields();
        if(typeof applySmartQtyUnitInputs==='function') applySmartQtyUnitInputs();
      },30);
      return r;
    };
  }

  // Same-shortage modal from transfer page: unit starts blank too.
  var oldOpenSame=window.openSameShortage;
  if(typeof oldOpenSame==='function'){
    window.openSameShortage=openSameShortage=function(){
      var r=oldOpenSame.apply(this,arguments);
      setTimeout(function(){
        clearTransferUnitFields();
        if(typeof applySmartQtyUnitInputs==='function') applySmartQtyUnitInputs();
      },30);
      return r;
    };
  }

  // Ensure saving same-shortage never falls back to original item's unit.
  var oldSaveSame=window.saveSameShortage;
  if(typeof oldSaveSame==='function'){
    window.saveSameShortage=saveSameShortage=async function(){
      try{
        var same=document.getElementById('sameUnit');
        if(same && (same.value||'').trim()==='') same.value='';
        return await oldSaveSame.apply(this,arguments);
      }catch(e){ console.error(e); toast&&toast('บันทึกไม่สำเร็จ'); }
    };
  }

  // Initial pass.
  document.addEventListener('DOMContentLoaded',function(){
    blankIfUnknownSupplier();
    clearTransferUnitFields();
  });
})();

/* === V6.4 Unit Conversion Prompt on Transfer Save === */
(function(){
  const UNIT_CONV_KEY='stockAlertUnitConversions';
  const UNIT_CONV_COLL='stock_alert_beta1_unit_conversions';
  function safeNorm(v){
    try{ return (typeof norm==='function'?norm(v):String(v||'').toLowerCase().replace(/\s+/g,'').trim()); }
    catch(e){ return String(v||'').toLowerCase().replace(/\s+/g,'').trim(); }
  }
  function esc(v){
    try{ return typeof escapeHtml==='function'?escapeHtml(v):String(v??''); }
    catch(e){ return String(v??''); }
  }
  function toNum(v){
    const n=parseFloat(String(v||'').replace(/,/g,''));
    return Number.isFinite(n)?n:0;
  }
  function formatQty(n){
    if(!Number.isFinite(n)) return '';
    return String(Math.round(n*1000)/1000).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
  }
  function getStore(){
    try{return JSON.parse(localStorage.getItem(UNIT_CONV_KEY)||'{}')||{};}catch(e){return {};}
  }
  function setStore(obj){
    localStorage.setItem(UNIT_CONV_KEY,JSON.stringify(obj||{}));
    try{
      if(typeof online!=='undefined'&&online&&typeof db!=='undefined'&&db){
        db.collection(UNIT_CONV_COLL).doc('main').set({items:obj||{},updatedAt:Date.now()},{merge:true}).catch(()=>{});
      }
    }catch(e){}
  }
  function convKey(product,fromUnit,toUnit){return [safeNorm(product),safeNorm(fromUnit),safeNorm(toUnit)].join('|');}
  function unitsSame(a,b){return safeNorm(a)===safeNorm(b);}
  function askFactor(product,fromUnit,toUnit){
    const store=getStore();
    const key=convKey(product,fromUnit,toUnit);
    const old=store[key]?.factor;
    if(old){
      const ok=confirm(`พบอัตราแปลงเดิมของสินค้า “${product}”\n\n1 ${fromUnit} = ${old} ${toUnit}\n\nกด OK เพื่อใช้อัตรานี้\nกด Cancel เพื่อแก้ไขอัตรา`);
      if(ok) return old;
    }
    while(true){
      const ans=prompt(`สินค้านี้ใช้หน่วยไม่ตรงกัน\n\n${product}\n\nรายการของขาดเดิมเป็นหน่วย “${toUnit}”\nแต่แบ่งของเป็นหน่วย “${fromUnit}”\n\n1 ${fromUnit} = กี่ ${toUnit}?`, old||'');
      if(ans===null) return null;
      const num=toNum(ans);
      if(num>0){
        store[key]={product,fromUnit,toUnit,factor:num,updatedAt:Date.now(),updatedBy:(window.nickname||nickname||'ไม่ระบุ')};
        setStore(store);
        return num;
      }
      alert('กรุณาใส่จำนวนเป็นตัวเลข เช่น 12');
    }
  }
  function getItem(id){
    try{return (window.items||items||[]).find(x=>String(x.id)===String(id));}catch(e){return null;}
  }
  function setUnitBlankUnlessEditing(it){
    const u=document.getElementById('tmUnit');
    const q=document.getElementById('tmQty');
    if(q) q.value = it && it.transferPrepared ? (it.transferQty||'') : '';
    if(u){
      // New transfer must always start blank. Existing prepared transfer may keep the previously typed unit.
      u.value = it && it.transferPrepared ? (it.transferUnit||'') : '';
      u.placeholder='หน่วย';
      u.setAttribute('inputmode','text');
      u.removeAttribute('readonly');
    }
  }

  // Hard override opening transfer modal so original shortage unit never auto-fills into the unit box.
  window.openTransfer = openTransfer = function(id,from,to){
    const it=getItem(id);
    if(!it){ try{toast('ไม่พบรายการ');}catch(e){} return; }
    window.transferTarget = transferTarget = {id,from,to};
    const title=document.getElementById('tmTitle'), sub=document.getElementById('tmSub');
    if(title) title.textContent=it.name||'';
    if(sub) sub.textContent=`สาขา ${from} → สาขา ${to}`;
    setUnitBlankUnlessEditing(it);
    let old=document.getElementById('transferDecisionBox');
    if(!old){
      const btn=document.querySelector('#transferModal .btn.ok');
      if(btn){
        const div=document.createElement('div');
        div.id='transferDecisionBox';
        div.innerHTML=`<label>หลังรับ/ส่งแล้ว รายการนี้</label><div class="choiceBox"><button type="button" id="decRemove" onclick="setTransferDecision('remove')">ไม่ต้องสั่งแล้ว</button><button type="button" id="decKeep" onclick="setTransferDecision('keep')">ยังต้องสั่ง</button></div>`;
        btn.parentNode.insertBefore(div,btn);
      }
    }
    try{ setTransferDecision(it.transferDecision||'remove'); }catch(e){}
    try{ if(typeof applySmartQtyUnitInputs==='function') applySmartQtyUnitInputs(); }catch(e){}
    document.getElementById('transferModal')?.classList.add('show');
  };

  // Ask unit conversion immediately when saving the transfer, not at the final receive/close step.
  window.confirmTransfer = confirmTransfer = async function(){
    if(!transferTarget) return;
    const it=getItem(transferTarget.id);
    if(!it){ try{toast('ไม่พบรายการ');}catch(e){} return; }
    const q=(document.getElementById('tmQty')?.value||'').trim();
    const u=(document.getElementById('tmUnit')?.value||'').trim();
    if(!q) return toast('กรุณาใส่จำนวนที่แบ่ง');
    if(!u) return toast('กรุณาใส่หน่วย');
    const baseUnit=(it.unit||'').trim();
    const transferQty=toNum(q);
    let baseQty=transferQty;
    let conversionRate='';
    let conversionNote='';
    if(baseUnit && u && !unitsSame(baseUnit,u)){
      const factor=askFactor(it.name||'',u,baseUnit);
      if(factor===null) return;
      baseQty=transferQty*factor;
      conversionRate=factor;
      conversionNote=`1 ${u} = ${factor} ${baseUnit}`;
    }
    await updateDoc(transferTarget.id,{
      transferPrepared:true,
      transferDone:false,
      transferQty:q,
      transferUnit:u,
      transferBaseQty:baseUnit?formatQty(baseQty):q,
      transferBaseUnit:baseUnit||u,
      transferConversionRate:conversionRate,
      transferConversionNote:conversionNote,
      transferBy:(window.nickname||nickname||'ไม่ระบุ'),
      transferAt:Date.now(),
      transferDecision:(typeof transferDecision!=='undefined'?transferDecision:(it.transferDecision||'remove'))
    });
    try{log(`สาขา ${transferTarget.from} แบ่งของ`,it?.name||'');}catch(e){}
    closeModal('transferModal');
    toast('บันทึกการแบ่งแล้ว');
  };

  // Closing round uses already converted transferBaseQty, so it will not ask again.
  window.confirmTransferReceived = confirmTransferReceived = async function(from,to){
    const tasks=transferTasksByDirection(from,to);
    if(!tasks.length) return;
    if(!confirm('ยืนยันว่ามีการรับ/ส่งของแล้วใช่ไหม?')) return;
    const hist={id:'tr_'+Date.now(),from,to,round:transferRound(from,to),doneAt:Date.now(),items:[]};
    for(const t of tasks){
      const it=t.need;
      const decision=it.transferDecision||'remove';
      let histItem={name:it.name,qty:it.transferQty,unit:it.transferUnit,decision,needId:it.id,conversionNote:it.transferConversionNote||''};
      if(decision==='remove'){
        if(typeof online!=='undefined'&&online&&typeof db!=='undefined'&&db) await db.collection(COLLECTION).doc(it.id).delete();
        else items=items.filter(x=>x.id!==it.id);
      }else{
        const baseUnit=(it.unit||it.transferBaseUnit||it.transferUnit||'').trim();
        const oldQty=toNum(it.qty);
        const addQty=toNum(it.transferBaseQty || it.transferQty);
        const newQty=oldQty+addQty;
        histItem={...histItem,baseUnit,addedQty:formatQty(addQty),oldQty:formatQty(oldQty),newQty:formatQty(newQty)};
        await updateDoc(it.id,{qty:formatQty(newQty),status:'low',unit:baseUnit,transferPrepared:false,transferDone:false,transferQty:'',transferUnit:'',transferBaseQty:'',transferBaseUnit:'',transferConversionRate:'',transferConversionNote:'',transferDecision:'remove',updatedAt:Date.now(),updatedBy:(window.nickname||nickname||'ไม่ระบุ')});
      }
      hist.items.push(histItem);
    }
    transferHistory.unshift(hist);
    try{persistOrders();}catch(e){try{localStorage.setItem('stockAlertTransferHistory',JSON.stringify(transferHistory));}catch(_){}}
    try{log('รับ/ส่งของแบ่งแล้ว',`สาขา ${from} → สาขา ${to}`);}catch(e){}
    if(typeof renderAll==='function') renderAll();
    go('home');
    toast('ปิดรอบแบ่งแล้ว');
  };

  // A small helper page for future product detail screens: conversion table is now already stored in localStorage/Firebase.
  window.getUnitConversionsForProduct = function(product){
    const store=getStore(); const p=safeNorm(product);
    return Object.values(store).filter(x=>safeNorm(x.product)===p);
  };
})();
