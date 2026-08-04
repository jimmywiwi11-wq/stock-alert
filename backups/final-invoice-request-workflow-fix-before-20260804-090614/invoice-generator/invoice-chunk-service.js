(function(root){
  'use strict';

  const DEFAULT_ITEMS_PER_INVOICE = 10;

  function chunkItems(items, size){
    const list = Array.isArray(items) ? items.slice() : [];
    const max = Number(size == null ? DEFAULT_ITEMS_PER_INVOICE : size);
    if (!Number.isInteger(max) || max < 1 || max > DEFAULT_ITEMS_PER_INVOICE) {
      throw new Error('invalid-items-per-invoice');
    }
    const chunks = [];
    for (let index = 0; index < list.length; index += max) {
      chunks.push({
        chunkIndex: chunks.length + 1,
        startItemIndex: index + 1,
        endItemIndex: Math.min(index + max, list.length),
        items: list.slice(index, index + max)
      });
    }
    return chunks;
  }

  function withBatchMetadata(chunks, request){
    const totalInvoices = chunks.length;
    const totalItems = Number(request && request.itemCount) || chunks.reduce((sum, chunk) => sum + chunk.items.length, 0);
    return chunks.map(chunk => ({
      ...chunk,
      sequenceInBatch: chunk.chunkIndex,
      totalInvoicesInBatch: totalInvoices,
      itemsInThisInvoice: chunk.items.length,
      totalItemsInRequest: totalItems
    }));
  }

  const api = { DEFAULT_ITEMS_PER_INVOICE, chunkItems, withBatchMetadata };
  root.ChokAnanInvoiceChunkService = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
