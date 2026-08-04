(function(root){
  'use strict';

  const BUILD = 'V33-HISTORY-V2';

  function repo(){
    return root.NativeInvoiceRepository;
  }

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function money(value){
    if (typeof root.money === 'function') return root.money(value);
    return Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function keyOf(row){
    return String(row && (row.invoiceId || row.id || row.historyId || row.no || row.invoiceNumber) || '');
  }

  function isPrinted(row){
    return row && (row.printed === true || Number(row.printCount || 0) > 0 || ['printed','reprinted'].includes(String(row.printStatus || '').toLowerCase()));
  }

  function statusText(row){
    return isPrinted(row) ? 'พิมพ์แล้ว' : 'พร้อมพิมพ์';
  }

  function ensureControls(){
    const summary = root.historySummary;
    if (!summary) return;
    if (root.historyStatusFilterV2) return;
    summary.innerHTML = `
      <div class="historyV2Toolbar">
        <div><label>สถานะพิมพ์</label><select id="historyStatusFilterV2" onchange="renderHistory()"><option value="all">ทั้งหมด</option><option value="ready">พร้อมพิมพ์</option><option value="printed">พิมพ์แล้ว</option></select></div>
        <div><label>ชนิดบิล</label><select id="historyTypeFilterV2" onchange="renderHistory()"><option value="all">ทั้งหมด</option><option value="ใบกำกับภาษีเต็ม">ใบกำกับภาษีเต็ม</option><option value="ใบกำกับภาษีย่อ">ใบกำกับภาษีย่อ</option></select></div>
        <button class="btn secondary" onclick="refreshHistoryV2()">รีเฟรชประวัติบิล</button>
        <span class="pill">${BUILD}</span>
      </div>
      <div id="historyV2SummaryCards"></div>
      <div id="historyV2Diagnostics"></div>`;
  }

  function filters(){
    return {
      search: root.historySearch && root.historySearch.value || '',
      month: root.summaryMonth && root.summaryMonth.value || '',
      year: root.summaryYear && root.summaryYear.value || '',
      type: root.historyTypeFilterV2 && root.historyTypeFilterV2.value || 'all',
      printStatus: root.historyStatusFilterV2 && root.historyStatusFilterV2.value || 'all'
    };
  }

  function actionButtons(row){
    const arg = JSON.stringify(keyOf(row));
    const print = !isPrinted(row) ? `<button class="btn green" onclick="printHistoryInvoice(${arg})">สั่งพิมพ์</button>` : `<button class="btn" onclick="printHistoryInvoice(${arg})">พิมพ์ซ้ำ</button>`;
    return `${print} <button onclick="viewInvoice(${arg})">เปิด</button> <button onclick="editInvoice(${arg})">แก้ไข</button>`;
  }

  function renderHistoryV2(){
    if (!repo()) {
      if (root.historyTable) root.historyTable.innerHTML = '<div class="notice">กำลังโหลดประวัติบิล...</div>';
      return;
    }
    try { if (typeof root.initHistorySummaryDefaults === 'function') root.initHistorySummaryDefaults(); } catch (error) {}
    try { if (typeof root.updateInvoiceNumberSettingUI === 'function') root.updateInvoiceNumberSettingUI(); } catch (error) {}
    ensureControls();
    const all = repo().list();
    const rows = repo().list(filters()).filter(row => !row.deleted);
    const monthKey = root.summaryMonth && root.summaryMonth.value || '';
    const yearKey = root.summaryYear && root.summaryYear.value || '';
    const monthRows = all.filter(row => String(row.date || '').slice(0, 7) === monthKey && !row.deleted);
    const yearRows = all.filter(row => String(row.date || '').slice(0, 4) === String(yearKey) && !row.deleted);
    const cards = root.document.getElementById('historyV2SummaryCards');
    if (cards) cards.innerHTML = `<div class="grid3"><div class="card"><b>ยอดรวมรายเดือน</b><br><span class="small">เดือน ${esc(monthKey || '-')} จำนวน ${monthRows.length} บิล</span><h2>${money(monthRows.reduce((s,row)=>s+(+row.total||0),0))} บาท</h2></div><div class="card"><b>ยอดรวมรายปี</b><br><span class="small">ปี ${esc(yearKey || '-')} จำนวน ${yearRows.length} บิล</span><h2>${money(yearRows.reduce((s,row)=>s+(+row.total||0),0))} บาท</h2></div><div class="card"><b>รายการที่แสดง</b><br><span class="small">จำนวน ${rows.length} บิล</span><h2>${money(rows.reduce((s,row)=>s+(+row.total||0),0))} บาท</h2></div></div>`;
    if (root.historyTable) {
      root.historyTable.innerHTML = rows.length ? `<table><tr><th>วันที่</th><th>เลขบิล</th><th>ลูกค้า</th><th>ชนิด</th><th>ที่มา</th><th>ยอดรวม</th><th>สถานะ</th><th></th></tr>${rows.map(row => `<tr><td>${esc(row.date || '')}${row.time ? ' '+esc(row.time) : ''}</td><td>${esc(row.no || row.invoiceNumber || '')}</td><td>${esc(row.buyerName || '-')}<div class="small">${esc(row.buyerTax || '')}</div></td><td>${esc(row.type || row.invoiceType || '-')}</td><td>${esc(row.source || row.sourceCollection || '-')}</td><td class="right">${money(row.total)}</td><td><span class="${isPrinted(row) ? 'historyV2Printed' : 'historyV2Ready'}">${statusText(row)}</span></td><td>${actionButtons(row)}</td></tr>`).join('')}</table>` : '<div class="notice">ยังไม่มีประวัติบิลตามเงื่อนไขนี้</div>';
    }
    const diagBox = root.document.getElementById('historyV2Diagnostics');
    if (diagBox && new URLSearchParams(root.location.search).get('historyDebug') === '1') {
      const d = repo().diagnostics();
      diagBox.innerHTML = `<pre class="small" style="white-space:pre-wrap">${esc(JSON.stringify({ build: BUILD, primaryCount: d.primaryCount, legacyCount: d.legacyCount, mergedCount: d.mergedCount, duplicateCount: d.duplicateCount, lastError: d.lastError }, null, 2))}</pre>`;
    }
  }

  async function refreshHistoryV2(){
    if (repo() && typeof repo().refresh === 'function') await repo().refresh();
    renderHistoryV2();
  }

  function install(){
    root.renderHistory = renderHistoryV2;
    root.refreshHistoryV2 = refreshHistoryV2;
    root.desktopHistoryRows = function(){ return repo() ? repo().list() : []; };
    root.findInvoiceRecord = function(id){
      const key = String(id || '');
      return repo() && (repo().getById(key) || repo().getByInvoiceNumber(key)) || null;
    };
    if (repo() && typeof repo().subscribe === 'function') repo().subscribe(() => { try { renderHistoryV2(); } catch (error) {} });
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', refreshHistoryV2);
    else setTimeout(refreshHistoryV2, 0);
  }

  root.ChokAnanHistoryV2 = { BUILD, render: renderHistoryV2, refresh: refreshHistoryV2, install };
  install();
})(typeof window !== 'undefined' ? window : globalThis);
