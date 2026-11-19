// Vite dev-server endpoint for the `neon-dev` connection.
// The browser POSTs SQL to /__sql; it runs here, in Node, with DATABASE_URL from .env.local.
// Dev server only (`apply: 'serve'`): builds never contain it. No security layer yet, by design
// (docs/ARCHITECTURE.md), but it only answers this app's own pages:
//   - the request must carry the `x-iotify-sql: 1` header (a cross-site page can't send it without
//     a CORS preflight, which this endpoint never approves), and
//   - any Origin must be this dev server's own localhost address.
import { loadEnv } from 'vite';
import { createRunner, errorBody } from './runner.js';

const MAX_BODY = 5 * 1024 * 1024;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) reject(new Error('Request too large'));
      else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/**
 * @param {{ databaseKey?: string }} [options] Which .env.local key holds the connection string
 *   (DATABASE_URL; tests use TEST_DATABASE_URL and never fall back).
 * @returns {import('vite').Plugin}
 */
export function neonDevSql({ databaseKey = 'DATABASE_URL' } = {}) {
  let runner = null;
  let runnerUrl = '';
  return {
    name: 'iotify-neon-dev-sql',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__sql', async (req, res) => {
        if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
        if (req.headers['x-iotify-sql'] !== '1')
          return send(res, 403, { error: 'Missing x-iotify-sql header' });
        const origin = req.headers.origin;
        if (origin && !LOCAL_ORIGIN.test(origin))
          return send(res, 403, { error: 'Not allowed from ' + origin });

        // Read .env.local on every request, so pasting the connection string needs no restart.
        const env = loadEnv(server.config.mode, server.config.envDir || process.cwd(), '');
        const url = (env[databaseKey] || '').trim();
        if (!url) {
          return send(res, 503, {
            error: `Not connected: ${databaseKey} is empty in .env.local (project folder).`,
            code: 'no_database_url',
          });
        }
        if (!runner || url !== runnerUrl) {
          runner = createRunner(url);
          runnerUrl = url;
        }

        let body;
        try {
          body = JSON.parse(await readBody(req));
        } catch (e) {
          return send(res, 400, { error: 'Bad request: ' + e.message });
        }
        try {
          if (Array.isArray(body.statements)) {
            const results = await runner.transaction(body.statements);
            return send(res, 200, { results });
          }
          if (typeof body.sql === 'string') {
            const rows = await runner.query(body.sql, body.params ?? []);
            return send(res, 200, { rows });
          }
          return send(res, 400, { error: 'Send { sql, params } or { statements }' });
        } catch (err) {
          return send(res, 400, errorBody(err));
        }
      });
    },
  };
}
