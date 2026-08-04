(function(root){
  'use strict';

  const STATUS = Object.freeze({
    PROCESSING: 'กำลังดำเนินการ',
    READY_TO_PRINT: 'พร้อมพิมพ์',
    PRINTED: 'พิมพ์แล้ว',
    FAILED: 'สร้างใบกำกับไม่สำเร็จ'
  });

  function readyRequestUpdate(result, actor, at){
    return {
      status: STATUS.READY_TO_PRINT,
      generationState: 'generated',
      generated: true,
      generatedInvoiceIds: result && result.invoiceIds || [],
      generatedInvoiceNumbers: result && result.invoiceNumbers || [],
      generatedAt: at || Date.now(),
      generatedBy: actor && actor.by || 'system',
      generatedByUid: actor && actor.uid || '',
      printedInvoiceCount: 0,
      invoiceBatchSummary: result && result.batch || null
    };
  }

  function printedRequestUpdate(invoices, actor, at){
    const status = root.ChokAnanInvoicePrintService.printBatchStatus(invoices);
    return {
      status: status.status,
      printedInvoiceCount: status.printedCount,
      printedAt: status.allPrinted ? (at || Date.now()) : null,
      printedBy: status.allPrinted ? (actor && actor.by || 'system') : '',
      printedByUid: status.allPrinted ? (actor && actor.uid || '') : '',
      updatedAt: at || Date.now()
    };
  }

  const api = { STATUS, readyRequestUpdate, printedRequestUpdate };
  root.ChokAnanInvoiceStatusService = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
