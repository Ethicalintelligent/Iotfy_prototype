// Neon Database app (apps/neon-database, port 5176): the developer's own branch database, view-only.
// Dev server only. Before any SQL, every request checks that this computer belongs to one developer
// and that the database it points to is that developer's:
//   1. git config iotify.branch is dev/<name>, and it is the branch checked out;
//   2. the database's owner label (devtools.branch_owner, set by the admin at setup) is <name>.
// The admin (git config iotify.role = admin) works on main: nothing is shown there.
// The connection string never leaves the server, and other branches' addresses are never on this
// computer, so other developers' data can't be reached at all. Changes (update, insert, delete one
// row by its primary key) run as iotify_dev, the developer's full-rights role on their own branch.
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
 * @param {{ cwd: string, url: string, getRunner: () => { query: Function }, getDevRunner: () => { query: Function } }} ctx
 *   getRunner: the locked prototyper role (label check, table list); getDevRunner: the developer's
 *   full-rights role iotify_dev, used only after the label matched.
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
  if (action === 'ddl') {
    // Table structure: create, alter, drop. Runs as iotify_dev, then is kept as a numbered,
    // re-runnable migration file (CORE_RULES rule 7) in db/migrations/<developer>/.
    const op = body?.op;
    const target = tables.find((t) => t.schema === body?.schema && t.name === body?.table);
    if (op !== 'create_table') {
      if (!target)
        return { ...base, error: `No table ${body?.schema}.${body?.table} on your branch.` };
      if (target.kind === 'view') return { ...base, error: 'Views can’t be changed here.' };
    }
    const st = ddlStatement(op, body);
    await ctx.getDevRunner().transaction(st.statements.map((sql) => ({ sql })));
    let migration = null;
    let migrationError = null;
    try {
      const root = ctx.root || (await git(['rev-parse', '--show-toplevel'], ctx.cwd));
      migration = await writeMigration(root, access.developer, base.neonBranch, st);
    } catch (e) {
      migrationError = 'Changed, but the migration file could not be written: ' + e.message;
    }
    return {
      ...base,
      done: st.title,
      migration,
      migrationError,
      schema: st.schema,
      table: st.table,
    };
  }

  const found = tables.find((t) => t.schema === body?.schema && t.name === body?.table);
  if (!found) return { ...base, error: `No table ${body?.schema}.${body?.table} on your branch.` };
  // The developer's own branch: full rights (CORE_RULES rule 1 and 2, DEVELOPER_BRANCHES rule 4).
  const dev = ctx.getDevRunner();
  const columns = await dev.query(COLUMNS_SQL, [found.schema, found.name]);
  const editable = editableReason(found, columns);
  const name = `${quoteIdent(found.schema)}.${quoteIdent(found.name)}`;
  const meta = {
    schema: found.schema,
    table: found.name,
    columns,
    editable: !editable,
    notEditable: editable,
  };

  if (action === 'rows') {
    const rows = await dev.query(`SELECT * FROM ${name} LIMIT ${ROW_LIMIT}`);
    return { ...base, ...meta, rows, limit: ROW_LIMIT };
  }
  if (action === 'update' || action === 'insert' || action === 'delete') {
    if (editable) return { ...base, ...meta, error: editable };
    const st =
      action === 'update'
        ? updateStatement(name, columns, body.key, body.values)
        : action === 'insert'
          ? insertStatement(name, columns, body.values)
          : deleteStatement(name, columns, body.key);
    const rows = await dev.query(st.sql, st.params);
    if (action !== 'insert' && rows.length !== 1)
      return { ...base, ...meta, error: 'That row no longer exists. Reload and try again.' };
    return { ...base, ...meta, row: rows[0] ?? null };
  }
  return { ...base, error: 'Unknown action ' + action };
}

const COLUMNS_SQL = `SELECT a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type,
  NOT a.attnotnull AS nullable,
  (a.atthasdef OR a.attidentity <> '') AS has_default,
  (a.attgenerated <> '') AS generated,
  coalesce(a.attnum = ANY (i.indkey), false) AS pk
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_index i ON i.indrelid = c.oid AND i.indisprimary
WHERE n.nspname = $1 AND c.relname = $2 AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum`;

/**
 * Why a table can't be changed here, or null when it can.
 * @param {{ schema: string, kind: string }} t
 * @param {{ pk: boolean }[]} columns
 */
export function editableReason(t, columns) {
  if (t.schema === 'devtools')
    return 'The owner label is set by the admin and can’t be changed here.';
  if (t.kind === 'view') return 'Views can’t be changed; change the tables behind them.';
  if (!columns.some((c) => c.pk))
    return 'This table has no primary key, so a single row can’t be picked out to change.';
  return null;
}

/** The value Postgres gets: '' means empty (NULL) where the column allows it. */
function valueFor(col, v) {
  if (v === undefined || v === null) return null;
  if (v === '' && col.nullable) return null;
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

function pick(columns, values, { skipEmptyDefaults = false } = {}) {
  const out = [];
  for (const col of columns) {
    if (col.generated || !values || !Object.prototype.hasOwnProperty.call(values, col.name))
      continue;
    const v = values[col.name];
    if (skipEmptyDefaults && (v === '' || v == null) && col.has_default) continue;
    out.push([col, valueFor(col, v)]);
  }
  return out;
}

function keyWhere(columns, key, start) {
  const pks = columns.filter((c) => c.pk);
  if (!key || pks.some((c) => key[c.name] === undefined || key[c.name] === null))
    throw Object.assign(new Error('The row’s key is missing.'), { code: 'no_key' });
  return {
    sql: pks.map((c, i) => `${quoteIdent(c.name)} = $${start + i}`).join(' AND '),
    params: pks.map((c) => valueFor({ ...c, nullable: false }, key[c.name])),
  };
}

/** UPDATE one row, found by its primary key. Only the columns sent change. */
export function updateStatement(name, columns, key, values) {
  const set = pick(columns, values);
  if (!set.length) throw Object.assign(new Error('Nothing to save.'), { code: 'no_changes' });
  const where = keyWhere(columns, key, set.length + 1);
  return {
    sql: `UPDATE ${name} SET ${set.map(([c], i) => `${quoteIdent(c.name)} = $${i + 1}`).join(', ')} WHERE ${where.sql} RETURNING *`,
    params: [...set.map(([, v]) => v), ...where.params],
  };
}

/** INSERT one row. Empty fields with a default are left out, so the default applies. */
export function insertStatement(name, columns, values) {
  const cols = pick(columns, values, { skipEmptyDefaults: true });
  if (!cols.length) return { sql: `INSERT INTO ${name} DEFAULT VALUES RETURNING *`, params: [] };
  return {
    sql: `INSERT INTO ${name} (${cols.map(([c]) => quoteIdent(c.name)).join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    params: cols.map(([, v]) => v),
  };
}

/** DELETE one row, found by its primary key. */
export function deleteStatement(name, columns, key) {
  const where = keyWhere(columns, key, 1);
  return { sql: `DELETE FROM ${name} WHERE ${where.sql} RETURNING *`, params: where.params };
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

// ------------------------------------------------------------------ table structure (DDL)

/** Column types offered when creating or changing a column. */
export const COLUMN_TYPES = [
  'text',
  'integer',
  'bigint',
  'numeric',
  'boolean',
  'date',
  'timestamptz',
  'jsonb',
  'uuid',
];
/** Defaults that are SQL, not a value. Anything else is used as a quoted value. */
const DEFAULT_SQL = new Set(['now()', 'gen_random_uuid()', 'true', 'false']);
/** snake_case names only (CORE_RULES rule 8). */
const NAME = /^[a-z_][a-z0-9_]{0,62}$/;
/** Schemas the app never changes: the owner label and Postgres's own. */
const LOCKED_SCHEMA = /^(devtools|information_schema|pg_.*)$/;

const quoteLiteral = (s) => "'" + String(s).replace(/'/g, "''") + "'";

function bad(message) {
  return Object.assign(new Error(message), { code: 'bad_change' });
}
function checkName(kind, v) {
  if (typeof v !== 'string' || !NAME.test(v))
    throw bad(
      `${kind} "${v ?? ''}" isn’t allowed: use lower-case letters, digits and _ (snake_case).`,
    );
  return v;
}
function checkType(v) {
  if (!COLUMN_TYPES.includes(v)) throw bad(`Type "${v ?? ''}" isn’t offered here.`);
  return v;
}
function columnSql(c) {
  const name = checkName('Column name', c?.name);
  let sql = `${quoteIdent(name)} ${checkType(c.type)}`;
  if (c.required || c.pk) sql += ' NOT NULL';
  const d = c.default == null ? '' : String(c.default).trim();
  if (d)
    sql += ' DEFAULT ' + (DEFAULT_SQL.has(d.toLowerCase()) ? d.toLowerCase() : quoteLiteral(d));
  return sql;
}

/**
 * The SQL for one structure change, safe to run twice (it becomes a migration file as is).
 * @returns {{ statements: string[], title: string, slug: string, schema: string, table: string, core: boolean }}
 */
export function ddlStatement(op, a) {
  const schema = checkName('Schema name', a?.schema);
  if (LOCKED_SCHEMA.test(schema)) throw bad(`Schema ${schema} can’t be changed here.`);
  const table = checkName('Table name', a?.table);
  const t = `${quoteIdent(schema)}.${quoteIdent(table)}`;
  const done = (statements, title, slug, extra = {}) => ({
    statements,
    title,
    slug,
    schema,
    table,
    core: schema === 'core',
    ...extra,
  });
  const ifColumn = (col, sql) =>
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ${quoteLiteral(schema)} AND table_name = ${quoteLiteral(table)} AND column_name = ${quoteLiteral(col)}) THEN ${sql}; END IF; END $$`;

  switch (op) {
    case 'create_table': {
      const cols = Array.isArray(a.columns) ? a.columns : [];
      if (!cols.length) throw bad('Add at least one column.');
      const names = cols.map((c) => checkName('Column name', c?.name));
      if (new Set(names).size !== names.length) throw bad('Two columns have the same name.');
      const pk = cols.filter((c) => c.pk).map((c) => quoteIdent(c.name));
      const lines = cols.map((c) => '  ' + columnSql(c));
      if (pk.length) lines.push(`  PRIMARY KEY (${pk.join(', ')})`);
      return done(
        [
          `CREATE SCHEMA IF NOT EXISTS ${quoteIdent(schema)}`,
          `CREATE TABLE IF NOT EXISTS ${t} (\n${lines.join(',\n')}\n)`,
        ],
        `Create table ${schema}.${table}`,
        `create_${schema}_${table}`,
      );
    }
    case 'add_column': {
      const sql = columnSql(a.column);
      return done(
        [`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS ${sql}`],
        `Add column ${a.column.name} to ${schema}.${table}`,
        `add_${table}_${a.column.name}`,
      );
    }
    case 'rename_column': {
      const from = checkName('Column name', a.column);
      const to = checkName('New column name', a.to);
      return done(
        [ifColumn(from, `ALTER TABLE ${t} RENAME COLUMN ${quoteIdent(from)} TO ${quoteIdent(to)}`)],
        `Rename column ${schema}.${table}.${from} to ${to}`,
        `rename_${table}_${from}_to_${to}`,
      );
    }
    case 'alter_type': {
      const col = checkName('Column name', a.column);
      const type = checkType(a.type);
      return done(
        [
          `ALTER TABLE ${t} ALTER COLUMN ${quoteIdent(col)} TYPE ${type} USING ${quoteIdent(col)}::${type}`,
        ],
        `Change type of ${schema}.${table}.${col} to ${type}`,
        `type_${table}_${col}_${type}`,
      );
    }
    case 'drop_column': {
      const col = checkName('Column name', a.column);
      return done(
        [`ALTER TABLE ${t} DROP COLUMN IF EXISTS ${quoteIdent(col)}`],
        `Drop column ${schema}.${table}.${col}`,
        `drop_${table}_${col}`,
      );
    }
    case 'rename_table': {
      const to = checkName('New table name', a.to);
      return done(
        [
          `DO $$ BEGIN IF to_regclass(${quoteLiteral(t)}) IS NOT NULL THEN ALTER TABLE ${t} RENAME TO ${quoteIdent(to)}; END IF; END $$`,
        ],
        `Rename table ${schema}.${table} to ${to}`,
        `rename_${table}_to_${to}`,
        { table: to },
      );
    }
    case 'drop_table':
      return done(
        [`DROP TABLE IF EXISTS ${t}`],
        `Drop table ${schema}.${table}`,
        `drop_${schema}_${table}`,
      );
    default:
      throw bad('Unknown change ' + op);
  }
}

/** The text of a migration file for one change. */
export function migrationText(st, neonBranch, date) {
  const head = [
    `-- ${st.title}`,
    `-- Made in the Neon Database app on ${date}, on branch ${neonBranch}. Safe to run twice.`,
  ];
  if (st.core)
    head.push(
      '-- Core change: it stays on your branch. To reach main it needs a core change request',
      '-- (docs/CORE_RULES.md rule 9).',
    );
  return head.join('\n') + '\n\n' + st.statements.map((s) => s + ';').join('\n\n') + '\n';
}

/** Writes the next numbered file in db/migrations/<developer>/. Returns its path from the root. */
async function writeMigration(root, developer, neonBranch, st) {
  const { mkdir, readdir, writeFile } = await import('node:fs/promises');
  const path = await import('node:path');
  if (!root) throw new Error('project folder not found');
  const dir = path.join(root, 'db', 'migrations', developer);
  await mkdir(dir, { recursive: true });
  const used = (await readdir(dir))
    .map((f) => /^(\d{3})_/.exec(f)?.[1])
    .filter(Boolean)
    .map(Number);
  const n = String((used.length ? Math.max(...used) : 0) + 1).padStart(3, '0');
  const file = `${n}_${st.slug}.sql`.slice(0, 120);
  const text = migrationText(st, neonBranch, new Date().toISOString().slice(0, 10));
  await writeFile(path.join(dir, file), text, { flag: 'wx' });
  return `db/migrations/${developer}/${file}`;
}
