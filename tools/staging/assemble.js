// After the apps' staging builds: puts them together as one site in dist-staging/
//   /admin/…  /partner/…  /customer/…  and a start page at /
// and checks no database secret ended up in the files sent to browsers.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const APPS = { admin: 'admin-console', partner: 'partner-portal', customer: 'customer-apps' };
const OUT = path.join(ROOT, 'dist-staging');
const SECRET = /postgres(ql)?:\/\/[^\s"'`]*@|npg_[A-Za-z0-9]{8,}/;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const [app, dir] of Object.entries(APPS)) {
  fs.cpSync(path.join(ROOT, 'apps', dir, 'dist-staging'), path.join(OUT, app), { recursive: true });
}
fs.copyFileSync(path.join(import.meta.dirname, 'index.html'), path.join(OUT, 'index.html'));

const bad = [];
const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const f = path.join(d, e.name);
    if (e.isDirectory()) return walk(f);
    if (/\.(html|js|css|json|map)$/.test(e.name) && SECRET.test(fs.readFileSync(f, 'utf8')))
      bad.push(path.relative(ROOT, f));
  });
walk(OUT);
if (bad.length) {
  console.error('✗ What looks like a database password is in: ' + bad.join(', '));
  fs.rmSync(OUT, { recursive: true, force: true });
  process.exit(1);
}
console.log('✓ dist-staging: /admin, /partner, /customer and the start page');
