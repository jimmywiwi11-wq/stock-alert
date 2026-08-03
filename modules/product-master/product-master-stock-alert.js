(function(){
  'use strict';

  const master = window.ChokAnanProductMaster;
  if (!master) return;

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function ensureNeedUnitButton(){
    const page = document.getElementById('productDbPage');
    if (!page || document.getElementById('needUnitProductButtonV43')) return;
    const search = page.querySelector('.productSearchCard') || page.querySelector('.card');
    const filter = page.querySelector('.productFilterToggle');
    let tools = page.querySelector('.productToolsGridV43');
    if (!tools) {
      tools = document.createElement('div');
      tools.className = 'productToolsGridV43';
      if (filter) filter.insertAdjacentElement('beforebegin', tools);
      else if (search) search.insertAdjacentElement('afterend', tools);
      else page.appendChild(tools);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'needUnitProductButtonV43';
    button.className = 'categoryShortcut needUnitProductButtonV43';
    button.onclick = openNeedUnitPage;
    button.innerHTML = '<div class="ico productDbIcon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v10"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg></div><div><b>ต้องระบุหน่วย</b><div class="muted" id="needUnitProductCountV43">สินค้าที่รอหน่วย</div></div>';
    tools.appendChild(button);
    if (filter) tools.appendChild(filter);
    ensureNeedUnitStyles();
  }

  function ensureNeedUnitPage(){
    if (document.getElementById('needUnitProductPageV43')) return;
    const page = document.createElement('section');
    page.id = 'needUnitProductPageV43';
    page.className = 'page';
    page.innerHTML = '<div class="pageHeader"><button class="back" id="needUnitBackV43" onclick="ChokAnanProductMasterStockAlert.backToProducts()">‹</button><div><h2 style="margin:0">ต้องระบุหน่วย</h2><div class="smallTitle">สินค้าใน Product Master ที่ยังไม่มีหน่วย</div></div></div><div id="needUnitProductListV43"></div>';
    (document.querySelector('.phone') || document.body).appendChild(page);
    document.getElementById('needUnitBackV43').addEventListener('click', () => {
      backToProducts();
    });
    bindNeedUnitBrowserBack();
    ensureNeedUnitStyles();
  }

  function ensureNeedUnitStyles(){
    if (document.getElementById('needUnitProductStylesV43')) return;
    const style = document.createElement('style');
    style.id = 'needUnitProductStylesV43';
    style.textContent = [
      '.productToolsGridV43{display:grid;grid-template-columns:1fr;gap:10px;margin:0 0 12px}',
      '.productToolsGridV43 .categoryShortcut{width:100%;margin:0;border:1px solid #edf2f7;text-align:left;min-width:0}',
      '.productToolsGridV43 .ico svg{width:28px;height:28px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}',
      '.needUnitProductButtonV43{min-height:76px}',
      '#needUnitProductPageV43{padding-bottom:96px}',
      '@media(min-width:560px){.productToolsGridV43{grid-template-columns:1fr 1fr}.productToolsGridV43 .categoryShortcut{height:100%}}'
    ].join('');
    document.head.appendChild(style);
  }

  function bindNeedUnitBrowserBack(){
    if (window.__needUnitBrowserBackV43) return;
    window.__needUnitBrowserBackV43 = true;
    window.addEventListener('popstate', () => {
      const page = document.getElementById('needUnitProductPageV43');
      if (page && page.classList.contains('active') && typeof window.go === 'function') {
        window.go('productDbPage');
      }
    });
  }

  function updateNeedUnitCount(){
    const label = document.getElementById('needUnitProductCountV43');
    if (label) label.textContent = `${master.needUnit().length} รายการที่รอหน่วย`;
  }

  function renderNeedUnitPage(){
    ensureNeedUnitPage();
    const box = document.getElementById('needUnitProductListV43');
    const rows = master.needUnit();
    if (!box) return;
    box.innerHTML = rows.length ? rows.map(row => `
      <div class="card needUnitRowV43">
        <b>${esc(row.name)}</b>
        <div class="muted">รหัสสินค้าใช้ใน Tax Invoice: ${esc(row.code)}</div>
        <label>หน่วย</label>
        <div class="needUnitEditV43">
          <input class="input" id="needUnitInput_${esc(row.id)}" placeholder="เช่น อัน / เส้น / ถุง">
          <button class="btn primary" onclick="ChokAnanProductMasterStockAlert.saveUnit('${esc(row.id)}')">บันทึกหน่วย</button>
        </div>
      </div>
    `).join('') : '<div class="empty">ไม่มีสินค้าที่รอระบุหน่วย</div>';
    updateNeedUnitCount();
  }

  function openNeedUnitPage(){
    ensureNeedUnitPage();
    if (window.history && window.history.pushState) {
      window.history.pushState({ stockAlertPage: 'needUnitProductPageV43' }, '', window.location.href);
    }
    if (typeof window.go === 'function') window.go('needUnitProductPageV43');
    renderNeedUnitPage();
  }

  function backToProducts(){
    if (typeof window.go === 'function') window.go('productDbPage');
  }

  function saveUnit(id){
    const input = document.getElementById(`needUnitInput_${id}`);
    const unit = (input && input.value || '').trim();
    if (!unit) {
      if (typeof toast === 'function') toast('กรุณาระบุหน่วย');
      else alert('กรุณาระบุหน่วย');
      return;
    }
    master.updateUnit(id, unit);
    renderNeedUnitPage();
    if (window.StockAlertProducts && typeof window.StockAlertProducts.list === 'function') {
      window.dispatchEvent(new CustomEvent('chokanan-product-master-updated'));
    }
    if (typeof toast === 'function') toast('บันทึกหน่วยแล้ว');
  }

  function refreshHooks(){
    ensureNeedUnitButton();
    updateNeedUnitCount();
  }

  const baseGo = window.go;
  if (typeof baseGo === 'function' && !baseGo.productMasterV43) {
    const wrapped = function(id){
      const result = baseGo.apply(this, arguments);
      if (id === 'productDbPage') refreshHooks();
      if (id === 'needUnitProductPageV43') renderNeedUnitPage();
      return result;
    };
    wrapped.productMasterV43 = true;
    window.go = wrapped;
  }

  const baseRenderAll = window.renderAll;
  if (typeof baseRenderAll === 'function' && !baseRenderAll.productMasterV43) {
    const wrappedRender = function(){
      const result = baseRenderAll.apply(this, arguments);
      refreshHooks();
      return result;
    };
    wrappedRender.productMasterV43 = true;
    window.renderAll = wrappedRender;
  }

  window.addEventListener('chokanan-product-master-updated', refreshHooks);
  document.addEventListener('click', event => {
    if (event.target && event.target.closest && event.target.closest('#productDbHomeTile')) {
      setTimeout(refreshHooks, 60);
    }
  }, true);
  window.ChokAnanProductMasterStockAlert = { openNeedUnitPage, renderNeedUnitPage, saveUnit, refreshHooks, backToProducts };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshHooks);
  else refreshHooks();
})();
