(function(root){
  'use strict';

  const PREFIX = 'IV';
  const WIDTH = 6;
  const MIN_SEQUENCE = 1;
  const MAX_SEQUENCE = 999999;

  function toInt(value){
    const number = Number(value);
    return Number.isInteger(number) ? number : NaN;
  }

  function assertSequence(sequence){
    const number = toInt(sequence);
    if (!Number.isInteger(number) || number < MIN_SEQUENCE || number > MAX_SEQUENCE) {
      throw new Error('invoice-number-out-of-range');
    }
    return number;
  }

  function formatInvoiceNumber(sequence){
    return `${PREFIX}${String(assertSequence(sequence)).padStart(WIDTH, '0')}`;
  }

  function parseInvoiceNumber(value){
    const text = String(value || '').trim();
    const match = text.match(/^IV([0-9]{6})$/);
    if (!match) return null;
    const sequence = Number(match[1]);
    if (sequence < MIN_SEQUENCE || sequence > MAX_SEQUENCE) return null;
    return { prefix: PREFIX, sequence, width: WIDTH, invoiceNumber: text };
  }

  function nextInvoiceNumber(currentLastSequence){
    return formatInvoiceNumber(assertSequence((Number(currentLastSequence) || 0) + 1));
  }

  const api = {
    PREFIX,
    WIDTH,
    MIN_SEQUENCE,
    MAX_SEQUENCE,
    assertSequence,
    formatInvoiceNumber,
    parseInvoiceNumber,
    nextInvoiceNumber
  };

  root.ChokAnanInvoiceNumberFormat = api;

  // Compatibility shim for the single automatic-invoice feature.
  // Some desktop builds call autoSingleBuyerData although the shared helper
  // is named autoBuyerForType. Resolve the buyer only when the button is used,
  // after the rest of the page scripts have finished loading.
  if (typeof root.autoSingleBuyerData !== 'function') {
    root.autoSingleBuyerData = function(type){
      if (typeof root.autoBuyerForType === 'function') {
        const buyer = root.autoBuyerForType(type) || {};
        return {
          buyerName: buyer.buyerName || '',
          buyerAddress: buyer.buyerAddress || '',
          buyerAddress1: buyer.buyerAddress1 || '',
          buyerAddress2: buyer.buyerAddress2 || '',
          buyerTax: buyer.buyerTax || '',
          customerId: buyer.customerId || buyer.customerCode || '',
          customerSnapshot: buyer.customerSnapshot || null
        };
      }

      const value = id => {
        const el = root.document && root.document.getElementById(id);
        return el ? String(el.value || '').trim() : '';
      };
      return {
        buyerName: value('autoBuyerName') || value('autoSingleBuyerName') || value('buyerName'),
        buyerAddress: value('autoBuyerAddress') || value('autoSingleBuyerAddress') || value('buyerAddress'),
        buyerAddress1: value('autoBuyerAddress1') || value('autoSingleBuyerAddress1') || value('buyerAddress1'),
        buyerAddress2: value('autoBuyerAddress2') || value('autoSingleBuyerAddress2') || value('buyerAddress2'),
        buyerTax: value('autoBuyerTax') || value('autoSingleBuyerTax') || value('buyerTax'),
        customerId: value('autoBuyerCustomerId') || value('autoSingleCustomerId')
      };
    };
  }

  // The CMS read-only product banner belongs above the embedded tax app and
  // must scroll away normally instead of covering the app navigation buttons.
  function releaseCmsProductBanner(){
    try{
      const parentDocument = root.parent && root.parent !== root ? root.parent.document : null;
      if (!parentDocument) return;
      const nodes = parentDocument.querySelectorAll('body *');
      for (const node of nodes) {
        const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text.includes('โหมดทดสอบข้อมูลสินค้าแบบอ่านอย่างเดียว')) continue;
        if (node.children.length && text.length > 220) continue;
        node.style.setProperty('position', 'static', 'important');
        node.style.setProperty('top', 'auto', 'important');
        node.style.setProperty('z-index', '1', 'important');
        node.style.setProperty('transform', 'none', 'important');
        node.style.setProperty('width', '100%', 'important');
        break;
      }
    }catch(error){
      console.warn('[tax-invoice banner layout]', error);
    }
  }

  if (root.document && root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', () => {
      setTimeout(releaseCmsProductBanner, 50);
      setTimeout(releaseCmsProductBanner, 800);
    });
  } else {
    setTimeout(releaseCmsProductBanner, 50);
    setTimeout(releaseCmsProductBanner, 800);
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
