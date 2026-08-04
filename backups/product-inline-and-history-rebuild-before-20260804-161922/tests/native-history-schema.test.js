const assert = require('assert');
const fs = require('fs');

const bridge = fs.readFileSync('modules/cms-integration/cms-tax-invoice-history-bridge.js', 'utf8');
const adapter = fs.readFileSync('modules/invoice-generator/invoice-history-adapter.js', 'utf8');

for (const field of ['invoiceId', 'invoiceNumber', 'sourceRequestId', 'requestId', 'customerSnapshot', 'itemsSnapshot', 'buyerName', 'buyerTax', 'buyerAddress', 'grandTotal', 'printStatus']) {
  assert.ok(bridge.includes(field), `bridge invoice payload must include ${field}`);
  assert.ok(adapter.includes(field), `desktop adapter schema must include ${field}`);
}
assert.ok(bridge.includes("source: 'employee-request'"), 'employee request invoices must keep source marker');
assert.ok(bridge.includes("importedToNativeHistory: true"), 'employee request invoices must be marked as native history imports');

console.log('native history schema static passed');
