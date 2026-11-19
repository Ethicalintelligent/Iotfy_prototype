// pnpm --filter @iotify/core snapshot: saves the demo data of every core table from Neon to
// test/fixtures/demo-core.json, so rule tests run offline against the real demo customers.
// Demo data only (docs/CORE_RULES.md). Re-run after the demo data changes.
import fs from 'node:fs';
import path from 'node:path';
import { createRunner } from '../../data/server/runner.js';

const here = import.meta.dirname;
const root = path.resolve(here, '..', '..', '..');
const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const url = (process.env.DATABASE_URL || '').trim();
if (!url) {
  console.error('DATABASE_URL is empty. Paste your Neon connection string into .env.local first.');
  process.exit(1);
}
const db = createRunner(url);

const tables = (
  await db.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'core' AND table_type = 'BASE TABLE' ORDER BY table_name`,
  )
).map((r) => r.table_name);
const parts = tables.map(
  (t) =>
    `'${t}', (SELECT coalesce(json_agg(to_jsonb(x) - 'created_at' - 'updated_at' ORDER BY x.id), '[]'::json) FROM core.${t} x)`,
);
const [{ data }] = await db.query(`SELECT json_build_object(${parts.join(', ')}) AS data`);
const out = path.join(here, '..', 'test', 'fixtures', 'demo-core.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(data, null, 1) + '\n');
const rows = Object.values(data).reduce((n, r) => n + r.length, 0);
console.log(`Saved ${tables.length} tables, ${rows} rows to test/fixtures/demo-core.json`);
