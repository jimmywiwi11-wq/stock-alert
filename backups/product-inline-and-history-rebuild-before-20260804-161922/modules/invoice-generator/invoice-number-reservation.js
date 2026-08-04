(function(root){
  'use strict';

  const RESERVATION_COLLECTION = 'invoiceNumberReservations';

  function reservationId(requestId, chunkIndex){
    return `${String(requestId || '').trim()}:chunk:${Number(chunkIndex) || 0}`;
  }

  function createReservation(request, chunk, invoiceNumber, sequence){
    return {
      reservationId: reservationId(request.requestId, chunk.chunkIndex),
      requestId: request.requestId,
      requestNumber: request.requestNumber,
      chunkIndex: chunk.chunkIndex,
      invoiceNumber,
      sequence,
      status: 'reserved'
    };
  }

  const api = { RESERVATION_COLLECTION, reservationId, createReservation };
  root.ChokAnanInvoiceNumberReservation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
