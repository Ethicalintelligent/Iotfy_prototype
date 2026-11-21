// Builds SQL for core tables. Table and column names are checked against the generated
// schema (TABLES), so nothing typed by a user ever becomes part of an identifier.
import { TABLES, TABLE_NAMES, type RowOf, type TableName } from './schema.gen';
import { DataError, type Statement } from './types';

/** Equal-to conditions. A list means "any of these"; null means "is empty". */
export type Filter<T extends TableName> = {
  [K in keyof RowOf<T>]?: RowOf<T>[K] | NonNullable<RowOf<T>[K]>[];
};

const SYSTEM = new Set(['created_at', 'updated_at']);

function meta(table: TableName) {
  const m = TABLES[table];
  if (!m) throw new DataError(`Unknown core table: ${String(table)}`, { code: 'unknown_table' });
  return m as { columns: readonly string[]; pk: readonly string[] };
}
function column(table: TableName, col: string) {
  if (!meta(table).columns.includes(col))
    throw new DataError(`Unknown column ${table}.${col}`, { code: 'unknown_column' });
  return col;
}

function whereOf<T extends TableName>(table: T, filter?: Filter<T>) {
  const where: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(filter ?? {})) {
    if (v === undefined) continue;
    const c = column(table, k);
    if (v === null) where.push(`${c} IS NULL`);
    else if (Array.isArray(v)) {
      params.push(v);
      where.push(`${c} = ANY($${params.length})`);
    } else {
      params.push(v);
      where.push(`${c} = $${params.length}`);
    }
  }
  return { where, params };
}

/** SELECT rows of one table, optionally filtered, ordered by primary key. */
export function selectStatement<T extends TableName>(table: T, filter?: Filter<T>): Statement {
  const { pk } = meta(table);
  const { where, params } = whereOf(table, filter);
  const order = pk.length ? ` ORDER BY ${pk.join(', ')}` : '';
  return {
    sql: `SELECT * FROM core.${table}${where.length ? ' WHERE ' + where.join(' AND ') : ''}${order}`,
    params,
  };
}

/**
 * Delete every row matching a filter (a record's own rows, deleted together with it).
 * Refuses an empty filter, so it can never empty a table.
 */
export function deleteWhereStatement<T extends TableName>(table: T, filter: Filter<T>): Statement {
  const { where, params } = whereOf(table, filter);
  if (!where.length)
    throw new DataError(`Refusing to delete every row of ${table}: give a filter.`, {
      code: 'no_filter',
    });
  return { sql: `DELETE FROM core.${table} WHERE ${where.join(' AND ')}`, params };
}

/** Row count of every core table, in one query. */
export function countsStatement(): Statement {
  const parts = TABLE_NAMES.map((t) => `'${t}', (SELECT count(*) FROM core.${t})`);
  return { sql: `SELECT json_build_object(${parts.join(', ')}) AS counts`, params: [] };
}

/**
 * Insert or update rows (matched on the primary key). Only the columns present in the rows are
 * written; updated_at is set to now(). One statement for any number of rows.
 */
export function upsertStatement<T extends TableName>(
  table: T,
  rows: Partial<RowOf<T>>[],
): Statement | null {
  if (!rows.length) return null;
  const { columns, pk } = meta(table);
  if (!pk.length)
    throw new DataError(`${table} has no primary key, so rows can't be saved by key.`, {
      code: 'no_pk',
    });
  const present = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => present.add(k)));
  const cols = columns.filter((c) => present.has(c) && !SYSTEM.has(c));
  for (const k of pk) {
    if (!cols.includes(k))
      throw new DataError(`Every ${table} row needs ${k} to be saved.`, { code: 'missing_pk' });
  }
  const set = cols.filter((c) => !pk.includes(c)).map((c) => `${c} = EXCLUDED.${c}`);
  // Nothing to change: leave the row (and its updated_at) alone.
  if (set.length && columns.includes('updated_at')) set.push('updated_at = now()');
  const conflict = set.length ? `DO UPDATE SET ${set.join(', ')}` : 'DO NOTHING';
  const list = cols.join(', ');
  return {
    sql: `INSERT INTO core.${table} (${list}) SELECT ${list} FROM json_populate_recordset(null::core.${table}, $1::json) ON CONFLICT (${pk.join(', ')}) ${conflict} RETURNING *`,
    params: [JSON.stringify(rows)],
  };
}

/**
 * Change some fields of existing rows (matched on the primary key). Unlike an upsert, it never
 * inserts, so tables with required columns can be partly updated. Only the columns present in
 * the rows are written; updated_at is set to now(). The transaction fails with "not found" when
 * a row doesn't exist (see updateCheck).
 */
export function updateStatement<T extends TableName>(
  table: T,
  rows: Partial<RowOf<T>>[],
): Statement | null {
  if (!rows.length) return null;
  const { columns, pk } = meta(table);
  if (!pk.length)
    throw new DataError(`${table} has no primary key, so rows can't be updated by key.`, {
      code: 'no_pk',
    });
  const present = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => present.add(k)));
  for (const k of pk) {
    if (!present.has(k))
      throw new DataError(`Every ${table} row needs ${k} to be updated.`, { code: 'missing_pk' });
  }
  const cols = columns.filter((c) => present.has(c) && !SYSTEM.has(c) && !pk.includes(c));
  if (!cols.length) return null;
  const set = cols.map((c) => `${c} = k.${c}`);
  if (columns.includes('updated_at')) set.push('updated_at = now()');
  const on = pk.map((k) => `x.${k} = k.${k}`).join(' AND ');
  // The final SELECT fails when a row wasn't found (casting the message to a number errors, and
  // Neon's error text quotes the message), so the whole transaction is rolled back.
  // The message must depend on the query result: Postgres evaluates constant expressions while
  // planning, even in a CASE branch that is never taken.
  const missing = `Not found: a ${table} record to update no longer exists. Reload and try again.`;
  const fail = `('${missing}' || repeat('', (SELECT count(*) FROM u)::int))::bigint`;
  return {
    sql: `WITH k AS (SELECT * FROM json_populate_recordset(null::core.${table}, $1::json)), u AS (UPDATE core.${table} x SET ${set.join(', ')} FROM k WHERE ${on} RETURNING x.*) SELECT CASE WHEN (SELECT count(*) FROM u) = (SELECT count(*) FROM k) THEN (SELECT count(*) FROM u) ELSE ${fail} END AS updated`,
    params: [JSON.stringify(rows)],
  };
}

/** Delete rows by primary key. `keys` are the key values (e.g. { id: 'A001' }). */
export function deleteStatement<T extends TableName>(
  table: T,
  keys: Partial<RowOf<T>>[],
): Statement | null {
  if (!keys.length) return null;
  const { pk } = meta(table);
  if (!pk.length)
    throw new DataError(`${table} has no primary key, so rows can't be deleted by key.`, {
      code: 'no_pk',
    });
  const on = pk.map((k) => `x.${k} = k.${k}`).join(' AND ');
  return {
    sql: `DELETE FROM core.${table} x USING json_populate_recordset(null::core.${table}, $1::json) k WHERE ${on} RETURNING x.*`,
    params: [JSON.stringify(keys)],
  };
}

export const primaryKey = (table: TableName) => meta(table).pk;

/**
 * Sets a timestamp column to now() on one row, only if it is still empty, in one statement (so
 * two tabs can't both succeed). Returns the row's id when this call set it, nothing otherwise.
 * Used for one-time links (support_sessions.link_opened_at).
 */
export function markOnceStatement<T extends TableName>(
  table: T,
  id: string,
  col: keyof RowOf<T> & string,
): Statement {
  const c = column(table, col);
  return {
    sql: `UPDATE core.${table} SET ${c} = now(), updated_at = now() WHERE id = $1 AND ${c} IS NULL RETURNING id`,
    params: [id],
  };
}
