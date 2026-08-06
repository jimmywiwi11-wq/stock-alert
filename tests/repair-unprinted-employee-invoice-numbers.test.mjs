import assert from 'node:assert/strict';

import {
  replaceInvoiceReferences,
  TARGET_MAPPING,
  validateTargetInvoices
} from '../scripts/repair-unprinted-employee-invoice-numbers.mjs';

function target(oldNumber, newNumber, data){
  return {
    oldNumber,
    newNumber,
    matches: [{ id: oldNumber, data }]
  };
}

{
  const data = {
    invoiceNumber: 'IV000115',
    no: 'IV000115',
    invoiceId: 'IV000115',
    generatedInvoiceNumbers: ['IV000115'],
    nativeInvoiceIds: ['IV000115'],
    requestSnapshot: {
      generatedInvoiceNumbers: ['IV000115', 'IV999999'],
      nativeInvoiceIds: ['IV000115']
    },
    items: [{ productId: 'IV000115', name: 'Keep item values unchanged' }],
    itemsSnapshot: [{ requestItemId: 'IV000115' }]
  };
  const next = replaceInvoiceReferences(data, TARGET_MAPPING);
  assert.equal(next.invoiceNumber, 'IV000138');
  assert.equal(next.no, 'IV000138');
  assert.equal(next.invoiceId, 'IV000138');
  assert.deepEqual(next.generatedInvoiceNumbers, ['IV000138']);
  assert.deepEqual(next.nativeInvoiceIds, ['IV000138']);
  assert.deepEqual(next.requestSnapshot.generatedInvoiceNumbers, ['IV000138', 'IV999999']);
  assert.deepEqual(next.requestSnapshot.nativeInvoiceIds, ['IV000138']);
  assert.equal(next.items[0].productId, 'IV000115');
  assert.equal(next.itemsSnapshot[0].requestItemId, 'IV000115');
}

{
  const errors = validateTargetInvoices([
    target('IV000115', 'IV000138', {
      invoiceNumber: 'IV000115',
      no: 'IV000115',
      source: 'employee-request',
      printStatus: 'ready_to_print',
      printed: false
    })
  ], {});
  assert.deepEqual(errors, []);
}

{
  const errors = validateTargetInvoices([
    target('IV000115', 'IV000138', {
      invoiceNumber: 'IV000115',
      no: 'IV000115',
      source: 'employee-request',
      printStatus: 'printed',
      printedAt: '2026-08-06T00:00:00.000Z'
    })
  ], {});
  assert.ok(errors.some(error => error.includes('printed')));
}

{
  const errors = validateTargetInvoices([
    target('IV000115', 'IV000138', {
      invoiceNumber: 'IV000115',
      no: 'IV000115',
      source: 'employee-request',
      printStatus: 'ready_to_print'
    })
  ], {
    IV000138: [{ collection: 'taxInvoices', id: 'IV000138' }]
  });
  assert.ok(errors.some(error => error.includes('target invoice number already exists')));
}

{
  const errors = validateTargetInvoices([
    { oldNumber: 'IV000115', newNumber: 'IV000138', matches: [] }
  ], {});
  assert.ok(errors.some(error => error.includes('expected exactly one')));
}

console.log('repair unprinted employee invoice number helper tests passed');
