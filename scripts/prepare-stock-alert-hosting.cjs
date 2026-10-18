// Local packaging only: no Firebase SDK, network, database or deployment calls.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const out = path.join(root, '.hosting-stock-alert');
const files = new Set(['index.html', 'app.js', 'sw.js', 'version.json', 'manifest.json', 'cash-reconciliation.js', 'vendor/html2canvas.min.js',
  // Existing embedded CMS dependency. Copy unchanged; never include desktop backups/installers.
  'desktop/tax-invoice/tax_invoice_app.html', 'desktop/tax-invoice/manifest.json',
  'desktop/tax-invoice/history-v2.js', 'desktop/tax-invoice/history-v2.css']);
function addTree(dir, extensions) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const name = `${dir}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Symlink rejected: ${name}`);
    if (entry.isDirectory()) addTree(name, extensions);
    else if (extensions.includes(path.extname(entry.name))) files.add(name);
  }
}
addTree('modules', ['.js', '.css']);
addTree('icons', ['.png', '.ico']);
addTree('desktop/tax-invoice/assets/icons', ['.png', '.ico']);
const secrets = /-----BEGIN [A-Z ]*PRIVATE KEY-----|["'](?:private_key|refresh_token|client_secret)["']\s*:\s*["'][^"']+|\bGOCSPX-[\w-]+|\bgh[pousr]_[\w]+/;
let bytes = 0;
for (const name of files) {
  const data = fs.readFileSync(path.join(root, name));
  bytes += data.length;
  if (/\.(html|js|json|css)$/.test(name)) {
    const text = data.toString('utf8');
    if (secrets.test(text)) throw new Error(`Potential secret in ${name}; packaging stopped`);
    if (name.endsWith('.json')) JSON.parse(text);
    if (name.endsWith('.js')) new vm.Script(text, { filename: name });
    if (name.endsWith('.html')) {
      for (const match of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (!/\bsrc\s*=|application\/|\bmodule\b/i.test(match[1])) new vm.Script(match[2], { filename: name });
      }
      for (const match of text.matchAll(/<(?:script|link|img)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi)) {
        const url = match[1];
        if (/^(https?:|data:|blob:|#)|\$\{/.test(url)) continue;
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), url.split(/[?#]/)[0]));
        if (!files.has(target)) throw new Error(`Missing packaged dependency: ${name} -> ${target}`);
      }
    }
  }
}
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
for (const match of sw.match(/const APP_SHELL=\[([\s\S]*?)\]/)[1].matchAll(/'\.\/([^']+)'/g)) {
  if (!files.has(match[1])) throw new Error(`Missing service worker dependency: ${match[1]}`);
}
// Only replace this dedicated generated directory; reject a redirected output path.
if (fs.existsSync(out) && fs.lstatSync(out).isSymbolicLink()) throw new Error('Output symlink rejected');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const name of files) {
  const destination = path.join(out, name);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, name), destination);
  const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  if (hash(destination) !== hash(path.join(root, name))) throw new Error(`Copy verification failed: ${name}`);
}
console.log(`Prepared ${files.size} files, ${bytes} bytes. Syntax, JSON, local HTML/SW dependencies, secret patterns and copy hashes passed. No deploy performed.`);
