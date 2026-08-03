(function(root){
  'use strict';

  const COUNTER_COLLECTION = 'invoiceNumberCounters';
  const COUNTER_DOC = 'IV';

  function currentSequenceFromCounter(counterData){
    const data = counterData || {};
    return Number(data.lastSequence || data.nextSequence - 1 || 0) || 0;
  }

  function reserveRange(currentLastSequence, count){
    const total = Number(count);
    if (!Number.isInteger(total) || total < 1) throw new Error('invalid-invoice-count');
    const startSequence = currentSequenceFromCounter({ lastSequence: currentLastSequence }) + 1;
    const endSequence = startSequence + total - 1;
    root.ChokAnanInvoiceNumberFormat.assertSequence(startSequence);
    root.ChokAnanInvoiceNumberFormat.assertSequence(endSequence);
    const invoiceNumbers = [];
    for (let seq = startSequence; seq <= endSequence; seq += 1) {
      invoiceNumbers.push(root.ChokAnanInvoiceNumberFormat.formatInvoiceNumber(seq));
    }
    return { startSequence, endSequence, invoiceNumbers };
  }

  const api = { COUNTER_COLLECTION, COUNTER_DOC, currentSequenceFromCounter, reserveRange };
  root.ChokAnanInvoiceNumberService = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
