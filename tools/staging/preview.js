// `pnpm staging:preview`: runs the built staging site (dist-staging) on the laptop the way Vercel
// serves it: the same password gate, the same /api/sql function and the same page rewrites.
// Database: STAGING_DATABASE_URL from .env.local, else TEST_DATABASE_URL (never DATABASE_URL, so
// a preview can't write to the shared main branch). Password: STAGING_PASSWORD, else "preview".
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { loadEnv } from 'vite';
import { handleSql } from '../../packages/data/server/handler.js';
import { passwordGate } from './password.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DIST = path.join(ROOT, 'dist-staging');
const PORT = Number(process.env.PORT || 4180);
const env = loadEnv('', ROOT, '');
const dbKey = env.STAGING_DATABASE_URL ? 'STAGING_DATABASE_URL' : 'TEST_DATABASE_URL';
const password = env.STAGING_PASSWORD || 'preview';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

if (!fs.existsSync(DIST)) {
  console.error('Build it first: pnpm build:staging');
  process.exit(1);
}

/** vercel.json rewrites: any address inside an app shows that app's index.html. */
function fileFor(pathname) {
  const f = path.join(DIST, decodeURIComponent(pathname));
  if (!f.startsWith(DIST)) return null;
  if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  if (pathname === '/') return path.join(DIST, 'index.html');
  const app = pathname.match(/^\/(admin|partner|customer)(\/|$)/)?.[1];
  return app ? path.join(DIST, app, 'index.html') : null;
}

async function send(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

http
  .createServer(async (req, res) => {
    const url = `http://localhost:${PORT}${req.url}`;
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
    });
    const blocked = passwordGate(request, password);
    if (blocked) return send(res, blocked);
    const { pathname } = new URL(url);
    if (pathname === '/api/sql') return send(res, await handleSql(request, env[dbKey]));
    const file = fileFor(pathname);
    if (!file) return send(res, new Response('Not found', { status: 404 }));
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
    });
    res.end(fs.readFileSync(file));
  })
  .listen(PORT, () =>
    console.log(
      `Staging preview on http://localhost:${PORT} (database: ${dbKey}; password from ` +
        `${env.STAGING_PASSWORD ? 'STAGING_PASSWORD' : 'the default "preview"'})`,
    ),
  );
