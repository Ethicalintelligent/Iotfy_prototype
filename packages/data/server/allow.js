// The staging server's statement check: it accepts only the kinds of SQL the apps themselves send
// (packages/data/src/repository.ts and useConnectionInfo), and refuses anything else, before it
// reaches Neon. Every statement also runs as the locked iotify_prototyper role (runner.js), so
// this is a second lock, not the only one.

/** The one fixed statement outside repository.ts (the avatar's "Live from Neon" dot). */
export const INFO_SQL =
  "SELECT current_database() AS database, current_user AS role, session_user AS login, current_setting('server_version') AS server_version";

const STARTS = /^(SELECT |INSERT INTO core\.|UPDATE core\.|DELETE FROM core\.|WITH k AS \()/;
const BANNED =
  /\b(DROP|ALTER|CREATE|GRANT|REVOKE|TRUNCATE|COPY|EXECUTE|PREPARE|CALL|LISTEN|NOTIFY|LOCK|VACUUM|ANALYZE|RESET|SET\s+(ROLE|SESSION|LOCAL))\b/i;
/** Words allowed right before "(": the functions and keywords repository.ts uses. */
const BEFORE_PAREN = new Set([
  'count',
  'json_build_object',
  'json_populate_recordset',
  'now',
  'repeat',
  'any',
  'as',
  'conflict',
  'then',
  'else',
  'when',
  'from',
  'select',
  'and',
]);
/** Left side of a dotted name: the core schema, or repository.ts's aliases. */
const QUALIFIERS = new Set(['core', 'x', 'k', 'excluded']);
export const MAX_STATEMENTS = 50;

/**
 * Why a statement is refused, or null when it is allowed.
 * @param {string} sql
 * @param {ReadonlySet<string>} tables the core table names
 */
export function refusal(sql, tables) {
  if (typeof sql !== 'string') return 'not text';
  if (sql === INFO_SQL) return null;
  if (!STARTS.test(sql)) return 'not one of the statements the apps make';
  if (/;|--|\/\*|\$\$|"|\\/.test(sql)) return 'contains ; comments, quotes or escapes';

  // Text in quotes: only table names (row counts), and the "Not found" message plus '' (updates).
  for (const m of sql.matchAll(/'([^']*)'/g)) {
    if (m[1] && !tables.has(m[1]) && !m[1].startsWith('Not found: '))
      return `unexpected text '${m[1]}'`;
  }
  const bare = sql.replace(/'[^']*'/g, "''");
  if (BANNED.test(bare)) return `uses ${bare.match(BANNED)[0].toUpperCase()}`;

  for (const m of bare.matchAll(/\b([A-Za-z_]\w*)\.([A-Za-z_]\w*)/g)) {
    const [, left, right] = m;
    if (!QUALIFIERS.has(left.toLowerCase())) return `uses ${left}.${right}`;
    if (left === 'core' && !tables.has(right)) return `unknown table core.${right}`;
  }
  for (const m of bare.matchAll(/\b([A-Za-z_]\w*)\s*\(/g)) {
    const w = m[1];
    if (!BEFORE_PAREN.has(w.toLowerCase()) && !tables.has(w)) return `calls ${w}()`;
  }
  return null;
}

/**
 * Checks a request body ({ sql, params } or { statements }) and returns the refusal, or null.
 * @param {unknown} body
 * @param {ReadonlySet<string>} tables
 */
export function refuseBody(body, tables) {
  if (!body || typeof body !== 'object') return 'Send { sql, params } or { statements }';
  const list = Array.isArray(body.statements)
    ? body.statements
    : typeof body.sql === 'string'
      ? [body]
      : null;
  if (!list) return 'Send { sql, params } or { statements }';
  if (list.length > MAX_STATEMENTS) return `At most ${MAX_STATEMENTS} statements at once`;
  for (const s of list) {
    const why = refusal(s?.sql, tables);
    if (why) return `Refused by the staging server (${why}).`;
    if (s.params !== undefined && !Array.isArray(s.params)) return 'params must be a list';
  }
  return null;
}
