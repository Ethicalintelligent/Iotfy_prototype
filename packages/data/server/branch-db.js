// Neon Database app (apps/neon-database, port 5176): the developer's own branch database, view-only.
// Dev server only. Before any SQL, every request checks that this computer belongs to one developer
// and that the database it points to is that developer's:
//   1. git config iotify.branch is dev/<name>, and it is the branch checked out;
//   2. the database's owner label (devtools.branch_owner, set by the admin at setup) is <name>.
// The admin (git config iotify.role = admin) works on main: nothing is shown there.
// The connection string never leaves the server, and other branches' addresses are never on this
// computer, so other developers' data can't be reached at all. Nothing here writes.
import { execFile } from 'node:child_process';

/** Most rows one table read returns. */
export const ROW_LIMIT = 200;

const DEV_BRANCH = /^dev\/([a-z0-9][a-z0-9_-]*)$/;

/**
 * The access decision, from facts only (no I/O), so it can be tested.
 * @param {{ role?: string, branch?: string, checkedOut?: string, hasUrl: boolean, owners?: string[] | null }} f
 *   owners: the owner label rows (null when the label table is missing)
 * @returns {{ state: 'hidden' | 'ok' | 'locked', reason?: string, developer?: string }}
 */
export function decideAccess(f) {
  if (f.role === 'admin') return { state: 'hidden' };
  const m = DEV_BRANCH.exec(f.branch ?? '');
  if (!m) return { state: 'locked', reason: 'no_branch' };
  const developer = m[1];
  if (f.checkedOut !== f.branch) return { state: 'locked', reason: 'wrong_checkout', developer };
  if (!f.hasUrl) return { state: 'locked', reason: 'no_database', developer };
  if (f.owners === undefined) return { state: 'locked', reason: 'not_checked', developer };
  if (f.owners === null || f.owners.length === 0)
    return { state: 'locked', reason: 'no_label', developer };
  if (f.owners.length !== 1 || f.owners[0] !== developer)
    return { state: 'locked', reason: 'mismatch', developer };
  return { state: 'ok', developer };
}

function git(args, cwd) {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, windowsHide: true }, (err, out) =>
      resolve(err ? '' : String(out).trim()),
    );
  });
}

/** Git facts of this computer's project folder. */
export async function gitFacts(cwd) {
  const [role, branch, checkedOut] = await Promise.all([
    git(['config', 'iotify.role'], cwd),
    git(['config', 'iotify.branch'], cwd),
    git(['branch', '--show-current'], cwd),
  ]);
  return { role, branch, checkedOut };
}

/** The owner label rows, or null when the label table doesn't exist on this database. */
async function readOwners(runner) {
  try {
    const rows = await runner.query('SELECT owner FROM devtools.branch_owner LIMIT 2');
    return rows.map((r) => String(r.owner));
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '3F000') return null; // no such table / schema
    throw err;
  }
}

const TABLES_SQL = `SELECT n.nspname AS schema, c.relname AS name,
  CASE c.relkind WHEN 'v' THEN 'view' WHEN 'm' THEN 'view' ELSE 'table' END AS kind,
  greatest(c.reltuples, 0)::bigint AS approx_rows
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p', 'v', 'm')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema') AND n.nspname NOT LIKE 'pg\\_%'
ORDER BY 1, 2`;

const quoteIdent = (s) => '"' + String(s).replace(/"/g, '""') + '"';

/**
 * Handles one request body. Returns the JSON reply.
 * @param {{ action?: string, schema?: string, table?: string }} body
 * @param {{ cwd: string, url: string, getRunner: () => { query: Function } }} ctx
 */
export async function handleBranchDb(body, ctx) {
  const facts = await gitFacts(ctx.cwd);
  const hasUrl = !!ctx.url;
  let access = decideAccess({ ...facts, hasUrl });
  if (access.state === 'hidden') return access;
  if (access.state === 'locked' && access.reason !== 'not_checked') return withNames(access, facts);

  const runner = ctx.getRunner();
  access = decideAccess({ ...facts, hasUrl, owners: await readOwners(runner) });
  if (access.state !== 'ok') return withNames(access, facts);

  const base = withNames(access, facts);
  const action = body?.action ?? 'status';
  if (action === 'status') return base;

  const tables = await runner.query(TABLES_SQL);
  if (action === 'overview') {
    const [info] = await runner.query('SELECT current_database() AS database');
    return { ...base, database: info?.database, tables };
  }
  if (action === 'rows') {
    const found = tables.find((t) => t.schema === body.schema && t.name === body.table);
    if (!found) return { ...base, error: `No table ${body.schema}.${body.table} on your branch.` };
    const rows = await runner.query(
      `SELECT * FROM ${quoteIdent(found.schema)}.${quoteIdent(found.name)} LIMIT ${ROW_LIMIT}`,
    );
    return { ...base, schema: found.schema, table: found.name, rows, limit: ROW_LIMIT };
  }
  return { ...base, error: 'Unknown action ' + action };
}

/** Adds the branch names a developer may see: their own, never another one. */
function withNames(access, facts) {
  if (!access.developer) return access;
  return {
    ...access,
    gitBranch: facts.branch,
    neonBranch: 'iotfy_' + access.developer,
  };
}
