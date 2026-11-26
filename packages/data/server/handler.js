// The staging server's SQL endpoint (/api/sql), as a plain Web Request → Response function.
// Vercel runs it (api/sql.js); `pnpm staging:preview` runs the same code on the laptop.
// The connection string comes from the host's secret DATABASE_URL, never from the browser.
import { createRunner, errorBody } from './runner.js';
import { refuseBody } from './allow.js';

const MAX_BODY = 5 * 1024 * 1024;
const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

let runner = null;
let runnerUrl = '';
let tables = null;

/**
 * @param {Request} request
 * @param {string | undefined} url the Neon connection string (staging branch)
 */
export async function handleSql(request, url) {
  if (request.method !== 'POST') return json(405, { error: 'POST only' });
  if (request.headers.get('x-iotify-sql') !== '1')
    return json(403, { error: 'Missing x-iotify-sql header' });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return json(403, { error: 'Not allowed from ' + origin });
  if (!url?.trim())
    return json(503, {
      error: 'Not connected: DATABASE_URL is not set on the staging server.',
      code: 'no_database_url',
    });
  if (!runner || url !== runnerUrl) {
    runner = createRunner(url.trim());
    runnerUrl = url;
    tables = null;
  }

  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return json(413, { error: 'Request too large' });
    body = JSON.parse(text);
  } catch (e) {
    return json(400, { error: 'Bad request: ' + e.message });
  }
  try {
    // The core and prototype table names, read once (the statement check accepts only these).
    tables ??= new Set(
      (
        await runner.query(
          "SELECT table_name AS t FROM information_schema.tables WHERE table_schema IN ('core', 'gps', 'telematics') OR left(table_schema, 6) = 'proto_'",
        )
      ).map((r) => r.t),
    );
    const why = refuseBody(body, tables);
    if (why) return json(400, { error: why, code: 'refused' });
    if (Array.isArray(body.statements))
      return json(200, { results: await runner.transaction(body.statements) });
    return json(200, { rows: await runner.query(body.sql, body.params ?? []) });
  } catch (err) {
    return json(400, errorBody(err));
  }
}
