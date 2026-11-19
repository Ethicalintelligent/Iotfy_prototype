// Shared Vite setup for the three apps. Each app's vite.config.ts calls appConfig('<app>').
//
// Normal use (pnpm dev):  ports 5173/5174/5175, database DATABASE_URL.
// Tests (IOTIFY_TEST=1):  ports 6173/6174/6175, database TEST_DATABASE_URL only. Tests never
// fall back to DATABASE_URL, so they can't write to the shared main branch by mistake.
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { neonDevSql } from '../../packages/data/server/vite-plugin.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const TEST = process.env.IOTIFY_TEST === '1';
const BASE = TEST ? 6173 : 5173;
export const PORTS = { admin: BASE, partner: BASE + 1, customer: BASE + 2 };

/** @param {'admin' | 'partner' | 'customer'} app */
export function appConfig(app) {
  const port = PORTS[app];
  const urls = Object.fromEntries(
    Object.entries(PORTS).map(([k, p]) => [k, `http://localhost:${p}`]),
  );
  return defineConfig({
    plugins: [react(), neonDevSql({ databaseKey: TEST ? 'TEST_DATABASE_URL' : 'DATABASE_URL' })],
    envDir: ROOT,
    // Where the other apps live (cross-app support links). Not secrets.
    define: { 'import.meta.env.VITE_APP_URLS': JSON.stringify(JSON.stringify(urls)) },
    server: { port, strictPort: true },
    preview: { port, strictPort: true },
  });
}
