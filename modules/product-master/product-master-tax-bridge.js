(function(){
  'use strict';

  const master = window.ChokAnanProductMaster;
  if (!master || typeof store === 'undefined') return;

  const originalGet = store.get.bind(store);
  const originalSet = store.set.bind(store);

  function mapTaxProduct(row){
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      unit: row.unit,
      cost: row.costPrice != null ? row.costPrice : row.cost,
      price: row.salePrice != null ? row.salePrice : row.price,
      active: row.active !== false,
      liveProductMaster: true
    };
  }

  function mergeProducts(rows){
    const current = master.listAll();
    const byKey = new Map(current.map(row => [row.id, row]));
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const normalized = master.normalizeRows([{ ...row, createdFrom: 'tax-invoice-product-edit' }])[0];
      if (!normalized) return;
      const old = current.find(item => String(item.id) === String(normalized.id) || String(item.code) === String(normalized.code));
      byKey.set((old || normalized).id, {
        ...(old || {}),
        ...normalized,
        code: old?.code || normalized.code,
        productCode: old?.productCode || normalized.productCode,
        updatedAt: Date.now(),
        updatedDate: Date.now()
      });
    });
    master.saveMaster(Array.from(byKey.values()));
  }

  store.get = function(key, fallback){
    if (key === 'products') return master.listTaxInvoiceProducts().map(mapTaxProduct);
    return originalGet(key, fallback);
  };

  store.set = function(key, value){
    if (key === 'products') {
      mergeProducts(value);
      return;
    }
    return originalSet(key, value);
  };

  const basePreviewProductCode = window.previewProductCode;
  window.previewProductCode = function(){
    if (typeof editProductIndex !== 'undefined' && editProductIndex !== null) return;
    const rows = master.listAll();
    if (window.pCode) pCode.value = nextCode(thaiInitials(window.pName ? pName.value : 'PM'), rows, 5);
    else if (typeof basePreviewProductCode === 'function') basePreviewProductCode();
  };

  window.deleteProduct = function(index){
    const product = store.get('products', [])[index];
    if (!product) return;
    if (!confirm('ปิดใช้งานสินค้านี้? สินค้าจะไม่แสดงใน Tax Invoice แต่ยังอยู่ใน Product Master')) return;
    master.setActive(product.id || product.code, false);
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof refreshInvoiceSelects === 'function') refreshInvoiceSelects();
  };

  window.ChokAnanTaxInvoiceProductMasterBridge = {
    mode: 'live-product-master',
    list: () => store.get('products', []),
    stats: () => master.stats()
  };

  master.loadMaster({ persist: true });
  if (typeof renderProducts === 'function') setTimeout(renderProducts, 0);

  /* V34.1: reliable automatic single-invoice generator.
     The legacy exact-price solver can legitimately find no mathematical
     combination for a requested total. This fallback keeps the selected
     products realistic and adjusts only the final line price so the invoice
     total, item count, customer and invoice number always remain exact. */
  function shuffleRows(rows){
    const copy = rows.slice();
    for(let i=copy.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy;
  }

  function amountCents(value){
    return Math.max(0,Math.round((Number(value)||0)*100));
  }

  function calcGrandTotalCents(subtotalCents,vatMode){
    if(vatMode==='included') return subtotalCents;
    return subtotalCents + Math.round(subtotalCents*7/100);
  }

  function subtotalForGrandTotal(targetCents,vatMode){
    if(vatMode==='included') return targetCents;
    const center=Math.round(targetCents/1.07);
    for(let delta=0;delta<=300;delta++){
      const candidates=delta===0?[center]:[center-delta,center+delta];
      for(const cents of candidates){
        if(cents>0 && calcGrandTotalCents(cents,vatMode)===targetCents) return cents;
      }
    }
    return Math.max(1,center);
  }

  function makeReliableLines(products,itemCount,subtotalCents){
    const usable=products.filter(p=>Number(p.price)>0 && String(p.name||'').trim());
    if(!usable.length || itemCount<1 || subtotalCents<itemCount) return null;

    let pool=shuffleRows(usable);
    while(pool.length<itemCount) pool=pool.concat(shuffleRows(usable));
    const chosen=pool.slice(0,itemCount);
    const minimumLast=1;
    let remaining=subtotalCents;
    const lines=[];

    for(let i=0;i<itemCount;i++){
      const p=chosen[i];
      const remainingRows=itemCount-i-1;
      let qty=1;
      let lineCents;

      if(i===itemCount-1){
        lineCents=remaining;
      }else{
        const actual=amountCents(p.price);
        const maxAllowed=Math.max(1,remaining-remainingRows-minimumLast);
        const softCap=Math.max(1,Math.floor(remaining/(remainingRows+1)*1.35));
        lineCents=Math.max(1,Math.min(actual,maxAllowed,softCap));
        remaining-=lineCents;
      }

      if(i===itemCount-1) remaining=0;
      lines.push({
        id:p.id||p.code||('auto-'+i),
        productId:p.id||'',
        code:p.code||'',
        name:p.name||'',
        unit:p.unit||'',
        cost:Number(p.cost)||0,
        qty,
        price:lineCents/100,
        liveProductMaster:p.liveProductMaster===true,
        autoAdjustedPrice:i===itemCount-1 && lineCents!==amountCents(p.price)
      });
    }
    return lines;
  }

  function installReliableSingleInvoiceGenerator(){
    if(typeof buildSingleTrainingDraft!=='function' || typeof buildTrainingInvoice!=='function') return false;
    if(window.__reliableSingleInvoiceGeneratorInstalled) return true;
    window.__reliableSingleInvoiceGeneratorInstalled=true;

    const exactBuilder=buildSingleTrainingDraft;
    buildSingleTrainingDraft=async function({reroll=false}={}){
      const products=store.get('products',[]).filter(p=>Number(p.price)>0);
      if(!products.length){alert('กรุณาบันทึกสินค้าที่มีราคาขายอย่างน้อย 1 รายการก่อนสร้างบิล');return null;}

      const date=autoDate.value;
      const target=Number(autoTarget.value)||0;
      const itemCount=parseInt(autoSingleItemCount.value||'0',10);
      const vatMode=autoVat.value;
      const type=selectedAutoInvoiceType();
      const paper=autoPaper.value;
      const maxItems=paper==='9x11'?15:8;

      if(!date){alert('กรุณาเลือกวันที่ออกบิล');return null;}
      if(!(target>0)){alert('กรุณาระบุยอดรวมของบิล');return null;}
      if(!(itemCount>=1&&itemCount<=maxItems)){alert(`กรุณาระบุจำนวนรายการตั้งแต่ 1 ถึง ${maxItems} รายการสำหรับกระดาษขนาดนี้`);return null;}

      const buyer=autoSingleBuyerData(type);
      if(type==='ใบกำกับภาษีเต็ม'&&!buyer.buyerName){alert('กรุณาเลือกหรือกรอกชื่อบริษัท/ชื่อลูกค้า');return null;}

      const signature=singleDraftInputSignature();
      let numberPlan;
      if(reroll&&singleTrainingDraft&&singleTrainingDraft.signature===signature){
        numberPlan=singleTrainingDraft.numberPlan;
      }else{
        numberPlan=getAutoInvoiceStartPlan(type,1);
        if(!numberPlan)return null;
      }

      const targetCents=amountCents(target);
      let items=null;

      /* Give the exact real-price solver a short chance first. */
      try{
        const exactPromise=makeSingleTrainingItemsExact(targetCents,products,itemCount,vatMode);
        items=await Promise.race([
          exactPromise,
          new Promise(resolve=>setTimeout(()=>resolve(null),1200))
        ]);
      }catch(error){
        console.warn('[auto invoice exact solver]',error);
      }

      if(!items||items.length!==itemCount){
        const subtotalCents=subtotalForGrandTotal(targetCents,vatMode);
        items=makeReliableLines(products,itemCount,subtotalCents);
      }
      if(!items||items.length!==itemCount){
        setSingleDraftStatus('ไม่สามารถสร้างรายการตามจำนวนและยอดที่กำหนดได้ กรุณาตรวจยอดรวมอีกครั้ง','error');
        return null;
      }

      let calculated=calcTrainingInvoiceAmounts(items,vatMode);
      /* Guard against one-satang rounding differences in excluded VAT mode. */
      let difference=targetCents-amountCents(calculated.total);
      if(difference!==0 && items.length){
        const last=items[items.length-1];
        const qty=Math.max(1,Number(last.qty)||1);
        for(let step=0;step<12 && difference!==0;step++){
          last.price=Math.max(0.01,Math.round((Number(last.price)+(difference/100/qty))*100)/100);
          calculated=calcTrainingInvoiceAmounts(items,vatMode);
          difference=targetCents-amountCents(calculated.total);
        }
      }

      const time=autoRandomTime.checked?makeTrainingTimes(1,true)[0]:(autoTimeStart.value||'08:00');
      const previousMatches=singleTrainingDraft&&singleTrainingDraft.signature===signature;
      const base=previousMatches?singleTrainingDraft.invoice.id:Date.now();
      const batchId=previousMatches?singleTrainingDraft.invoice.trainingBatchId:'TRS-'+Date.now();
      const no=numberPlan.numbers[0];
      const grossTarget=targetCents;
      const inv=buildTrainingInvoice({
        id:base,no,date,time,type,vatMode,paperSize:paper,items,calculated,
        trainingMode:'single',theme:null,
        category:typeof amountKindFromCents==='function'?amountKindFromCents(grossTarget,Math.round((Number(autoMin.value)||50)*100),Math.round((Number(autoMax.value)||5000)*100)):null,
        batchId,buyer
      });
      inv.total=target;
      if(vatMode==='included'){
        inv.beforeVat=Math.round((target/1.07)*100)/100;
        inv.vat=Math.round((target-inv.beforeVat)*100)/100;
      }
      singleTrainingDraft={invoice:inv,numberPlan,signature};
      renderSingleTrainingDraftPreview();
      return singleTrainingDraft;
    };

    window.buildSingleTrainingDraft=buildSingleTrainingDraft;
    console.info('[Tax Invoice] reliable automatic single-invoice generator installed');
    return true;
  }

  if(!installReliableSingleInvoiceGenerator()){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(installReliableSingleInvoiceGenerator()||attempts>40)clearInterval(timer);
    },100);
  }
})();
