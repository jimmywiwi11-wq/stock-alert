const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('desktop/tax-invoice/tax_invoice_app.html', 'utf8');
const historyV2 = fs.readFileSync('desktop/tax-invoice/history-v2.js', 'utf8');
const repo = fs.readFileSync('modules/invoice-generator/native-invoice-repository.js', 'utf8');

assert.ok(html.includes('native-invoice-repository.js?v=8.04'), 'desktop must load NativeInvoiceRepository');
assert.ok(html.includes('history-v2.js?v=8.04'), 'desktop must load History V2 renderer');
assert.ok(html.includes('NativeInvoiceRepository.save'), 'save path must call NativeInvoiceRepository');
assert.ok(html.includes('NativeInvoiceRepository.markPrinted'), 'print confirmation must mark through NativeInvoiceRepository');
assert.ok(html.includes('await saveInvoice(true,true)'), 'print path must wait for save before print');
assert.ok(historyV2.includes('root.renderHistory = renderHistoryV2'), 'History V2 must replace old renderHistory');
assert.ok(historyV2.includes('root.desktopHistoryRows = function(){ return repo() ? repo().list() : []; };'), 'desktop history rows must read from repository');
assert.ok(historyV2.includes('historyDateFilterV2'), 'History V2 must expose a date filter');
assert.ok(historyV2.includes('date: root.historyDateFilterV2'), 'History V2 date filter must be passed to repository list filters');
assert.ok(repo.includes("const PRIMARY_COLLECTION = 'taxInvoices'"), 'repository primary source must be taxInvoices');
assert.ok(repo.includes('migrateLegacyReadOnly'), 'repository must keep legacy migration read-only path');

console.log('desktop history v2 wiring static passed');
