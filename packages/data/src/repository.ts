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

/** SELECT rows of one table, optionally filtered, ordered by primary key. */
export function selectStatement<T extends TableName>(table: T, filter?: Filter<T>): Statement {
  const { pk } = meta(table);
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
  const order = pk.length ? ` ORDER BY ${pk.join(', ')}` : '';
  return {
    sql: `SELECT * FROM core.${table}${where.length ? ' WHERE ' + where.join(' AND ') : ''}${order}`,
    params,
  };
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
