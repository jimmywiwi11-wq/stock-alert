const assert = require('assert');
const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

(async () => {
  const base = process.env.RUNTIME_URL || 'http://127.0.0.1:8765';
  const index = await get(base + '/index.html?runtimeMarkerTest=1');
  assert.strictEqual(index.status, 200);
  assert.ok(index.body.includes('Stock Alert V8.04'));
  assert.ok(index.body.includes('cms-tax-invoice-history-bridge.js?v=8.04'));
  assert.ok(index.body.includes('cms-integration.js?v=8.04'));
  assert.ok(index.body.includes('invoice-generator.js?v=8.04'));

  const desktop = await get(base + '/desktop/tax-invoice/tax_invoice_app.html?runtimeMarkerTest=1');
  assert.strictEqual(desktop.status, 200);
  assert.ok(desktop.body.includes('Tax Invoice App V33'));
  assert.ok(desktop.body.includes('V33-HISTORY-V2'));
  assert.ok(desktop.body.includes('invoice-history-adapter.js?v=8.04'));

  const version = await get(base + '/version.json?runtimeMarkerTest=1');
  assert.strictEqual(version.status, 200);
  const parsed = JSON.parse(version.body);
  assert.strictEqual(parsed.version, '8.04');
  assert.strictEqual(parsed.label, 'V8.04');

  const sw = await get(base + '/sw.js?runtimeMarkerTest=1');
  assert.strictEqual(sw.status, 200);
  assert.ok(sw.body.includes("stock-alert-v8_04-product-inline-history-v2"));
  assert.ok(sw.body.includes("version:'8.04'"));

  console.log('runtime build marker passed: ' + base);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
