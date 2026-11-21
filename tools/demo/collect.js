// After `pnpm build:demo`: copies each app's single HTML file to demo/iotify-<app>.html and checks
// it is truly self-contained and carries no database secrets. Publish those files on claude.ai.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const APPS = { admin: 'admin-console', partner: 'partner-portal', customer: 'customer-apps' };
const out = path.join(ROOT, 'demo');
fs.mkdirSync(out, { recursive: true });

let failed = false;
for (const [app, dir] of Object.entries(APPS)) {
  const src = path.join(ROOT, 'apps', dir, 'dist-demo', 'index.html');
  const html = fs.readFileSync(src, 'utf8');
  const problems = [];
  if (/<script[^>]+\ssrc=/i.test(html)) problems.push('loads an outside script');
  if (/<link[^>]+rel=["']?stylesheet[^>]+href=/i.test(html)) problems.push('loads an outside stylesheet');
  if (/postgres(ql)?:\/\/[^\s"'`]*@/i.test(html) || /npg_[A-Za-z0-9]{8,}/.test(html))
    problems.push('contains what looks like a database password');
  if (!html.includes('claude-mcp')) problems.push('is not using the claude-mcp connection');
  const file = path.join(out, `iotify-${app}.html`);
  if (problems.length) {
    failed = true;
    console.error(`✗ ${app}: ${problems.join('; ')} (not copied)`);
    continue;
  }
  fs.writeFileSync(file, html);
  console.log(`✓ ${path.relative(ROOT, file)}  ${(html.length / 1024).toFixed(0)} KB`);
}
if (failed) process.exit(1);
