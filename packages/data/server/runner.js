// Server-side SQL runner (Node only: the Vite dev endpoint and `pnpm db:types`).
// Never imported by browser code, so the connection string never reaches the browser.
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';
import { neon, types } from '@neondatabase/serverless';

// Node tries each of Neon's addresses for only 250 ms by default; on a slow link every attempt is
// cut off ("fetch failed"). Give each 2 s, for the dev server and `pnpm db:types` alike.
setDefaultAutoSelectFamilyAttemptTimeout(2000);

/** Every statement runs as the locked prototyper role (docs/CORE_RULES.md, rule 1). */
export const PROTOTYPER_ROLE = 'iotify_prototyper';
/** The developer's full-rights role on their own branch iotfy_<name> (DEVELOPER_BRANCHES rule 4).
 *  Used only by the Neon Database app, after the branch's owner label matched (branch-db.js). */
export const DEV_ROLE = 'iotify_dev';
const ROLES = new Set([PROTOTYPER_ROLE, DEV_ROLE]);

const NUMERIC = new Set([20, 21, 23, 700, 701, 1700]); // int8, int2, int4, float4, float8, numeric
const KEEP_TEXT = new Set([1082, 1083, 1114, 1184]); // date, time, timestamp, timestamptz: keep as sent

/** Numbers as numbers; dates and timestamps as the exact text Postgres sent (no time-zone shifts). */
const typeParsers = {
  getTypeParser(id, format) {
    if (NUMERIC.has(id)) return (v) => (v === null ? null : Number(v));
    if (KEEP_TEXT.has(id)) return (v) => v;
    return types.getTypeParser(id, format);
  },
};

/**
 * @param {string} url Neon connection string (from .env.local).
 * @param {string} [role] PROTOTYPER_ROLE (default, every app) or DEV_ROLE (Neon Database app).
 */
export function createRunner(url, role = PROTOTYPER_ROLE) {
  if (!ROLES.has(role)) throw new Error('Unknown role ' + role);
  const sql = neon(url);
  // The driver applies custom type parsers only when given per query (checked 19 Nov 2026,
  // @neondatabase/serverless 1.2.1): options on neon() or on transaction() are ignored.
  const q = (text, params = []) => sql.query(text, params, { types: typeParsers });
  const asRole = () => q(`SET LOCAL ROLE ${role}`);
  return {
    /** One statement. Returns its rows. */
    async query(text, params = []) {
      const res = await sql.transaction([asRole(), q(text, params)]);
      return res[1];
    },
    /**
     * Several statements in one transaction (all or nothing). Foreign keys are checked at
     * the end, so related rows can be saved in any order. Returns each statement's rows.
     * @param {{ sql: string, params?: unknown[] }[]} statements
     */
    async transaction(statements) {
      const res = await sql.transaction([
        asRole(),
        q('SET CONSTRAINTS ALL DEFERRED'),
        ...statements.map((s) => q(s.sql, s.params ?? [])),
      ]);
      return res.slice(2);
    },
  };
}

/** Neon's error, unchanged, as plain JSON. */
export function errorBody(err) {
  return {
    error: String(err?.message ?? err),
    code: err?.code,
    detail: err?.detail,
    hint: err?.hint,
    constraint: err?.constraint,
    table: err?.table,
  };
}
