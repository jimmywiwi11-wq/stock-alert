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
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
