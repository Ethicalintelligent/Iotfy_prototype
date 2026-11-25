// Shared Vite setup for the three apps. Each app's vite.config.ts calls appConfig('<app>').
//
// Normal use (pnpm dev):  ports 5173/5174/5175 (+ 5176 Neon Database), database DATABASE_URL.
// Tests (IOTIFY_TEST=1):  ports 6173/6174/6175, database TEST_DATABASE_URL only. Tests never
// fall back to DATABASE_URL, so they can't write to the shared main branch by mistake.
// Demo (pnpm build:demo, mode "demo"): one self-contained HTML file per app for claude.ai.
//   Data goes through the page's Neon connector (claude-mcp) and routes use #/… addresses.
//   Each app needs its Neon branch (see demoBranch below and .env.demo.example).
// Staging (pnpm build:staging, mode "staging"): the normal apps under /admin, /partner and
//   /customer of one site; data through the site's /api/sql function (docs/STAGING.md).
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { neonDevSql } from '../../packages/data/server/vite-plugin.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const TEST = process.env.IOTIFY_TEST === '1';
const BASE = TEST ? 6173 : 5173;
/** neondb: the Neon Database app (a developer's own branch database, dev server only). */
export const PORTS = { admin: BASE, partner: BASE + 1, customer: BASE + 2, neondb: BASE + 3 };
/** Neon's main branch. Only the Admin Console may maintain core data there (CORE_RULES rule 6). */
export const MAIN_BRANCH = 'br-polished-moon-bdwryps8';

/**
 * The Neon branch a demo build uses. Admin Console: VITE_NEON_BRANCH_ADMIN, else main (the rule 6
 * exception). Partner portal and customer apps: their own variable, never main.
 * @param {'admin' | 'partner' | 'customer'} app
 * @param {Record<string, string>} env
 */
export function demoBranch(app, env) {
  const key = `VITE_NEON_BRANCH_${app.toUpperCase()}`;
  const branch = env[key] || (app === 'admin' ? MAIN_BRANCH : '');
  if (!branch)
    throw new Error(
      `Demo build for the ${app} app needs ${key} in .env.demo.local (a Neon branch id). ` +
        'Partner and customer demos may not use main (docs/CORE_RULES.md rule 6).',
    );
  if (app !== 'admin' && branch === MAIN_BRANCH)
    throw new Error(`${key} is the main branch. Only the Admin Console may use main (rule 6).`);
  return branch;
}

/** @param {'admin' | 'partner' | 'customer' | 'neondb'} app */
export function appConfig(app) {
  const port = PORTS[app];
  return defineConfig(({ mode }) => {
    const demo = mode === 'demo';
    const staging = mode === 'staging';
    const env = loadEnv(mode, ROOT, 'VITE_');
    // Where the other apps live (cross-app support links). Not secrets. Demos: optional
    // VITE_DEMO_URL_<APP> (the other apps' published claude.ai links).
    const urls = Object.fromEntries(
      Object.entries(PORTS).map(([k, p]) => [
        k,
        demo
          ? env[`VITE_DEMO_URL_${k.toUpperCase()}`] || ''
          : staging
            ? `/${k}`
            : `http://localhost:${p}`,
      ]),
    );
    const define = { 'import.meta.env.VITE_APP_URLS': JSON.stringify(JSON.stringify(urls)) };
    if (demo)
      Object.assign(define, {
        'import.meta.env.VITE_DATA_MODE': JSON.stringify('claude-mcp'),
        'import.meta.env.VITE_ROUTER': JSON.stringify('hash'),
        'import.meta.env.VITE_NEON_BRANCH': JSON.stringify(demoBranch(app, env)),
      });
    if (staging)
      Object.assign(define, {
        'import.meta.env.VITE_DATA_MODE': JSON.stringify('neon-dev'),
        'import.meta.env.VITE_SQL_ENDPOINT': JSON.stringify('/api/sql'),
      });
    return {
      base: staging ? `/${app}/` : '/',
      plugins: demo
        ? [react(), viteSingleFile()]
        : [react(), neonDevSql({ databaseKey: TEST ? 'TEST_DATABASE_URL' : 'DATABASE_URL' })],
      envDir: ROOT,
      define,
      build: demo
        ? { outDir: 'dist-demo', emptyOutDir: true }
        : staging
          ? { outDir: 'dist-staging', emptyOutDir: true }
          : undefined,
      server: { port, strictPort: true },
      preview: { port, strictPort: true },
    };
  });
}
