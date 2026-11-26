// The staging server accepts every statement the apps make, and nothing else.
import { describe, expect, it } from 'vitest';
import { INFO_SQL, MAX_STATEMENTS, refusal, refuseBody } from './allow.js';
import { TABLES, TABLE_NAMES } from '../src/schema.gen';
import {
  countsStatement,
  deleteStatement,
  deleteWhereStatement,
  markOnceStatement,
  selectStatement,
  updateStatement,
  upsertStatement,
} from '../src/repository';

const tables = new Set<string>(TABLE_NAMES);

/** One full row (every column) of a table, so every column name appears in the SQL. */
const fullRow = (t: (typeof TABLE_NAMES)[number]) =>
  Object.fromEntries(TABLES[t].columns.map((c) => [c, 'x']));

describe('statements the apps make', () => {
  const statements: string[] = [INFO_SQL, countsStatement().sql];
  for (const t of TABLE_NAMES) {
    const { pk } = TABLES[t];
    statements.push(selectStatement(t).sql);
    const firstCol = TABLES[t].columns[0]!;
    statements.push(selectStatement(t, { [firstCol]: 'x' } as never).sql);
    statements.push(selectStatement(t, { [firstCol]: ['a', 'b'] } as never).sql);
    statements.push(selectStatement(t, { [firstCol]: null } as never).sql);
    statements.push(deleteWhereStatement(t, { [firstCol]: 'x' } as never).sql);
    if (!pk.length) continue;
    statements.push(upsertStatement(t, [fullRow(t) as never])!.sql);
    statements.push(
      upsertStatement(t, [Object.fromEntries(pk.map((k) => [k, 'x'])) as never])!.sql,
    );
    const upd = updateStatement(t, [fullRow(t) as never]);
    if (upd) statements.push(upd.sql);
    statements.push(
      deleteStatement(t, [Object.fromEntries(pk.map((k) => [k, 'x'])) as never])!.sql,
    );
  }
  statements.push(markOnceStatement('support_sessions', 'S1', 'link_opened_at').sql);

  it.each(statements.map((s) => [s.slice(0, 70), s]))('allows %s', (_, sql) => {
    expect(refusal(sql, tables)).toBeNull();
  });
});

describe('anything else is refused', () => {
  it.each([
    'DROP TABLE core.users',
    'SELECT * FROM core.users; DROP TABLE core.users',
    'SELECT * FROM core.users -- x',
    'SELECT * FROM core.users /* x */',
    'SELECT * FROM pg_catalog.pg_roles',
    'SELECT * FROM information_schema.tables',
    'SELECT * FROM core.not_a_table',
    "SELECT set_config('role', 'neondb_owner', false)",
    'SELECT pg_sleep(10)',
    "SELECT current_setting('server_version')",
    "SELECT 'hello'",
    'SET ROLE neondb_owner',
    'RESET ROLE',
    'CREATE TABLE core.x (id text)',
    'ALTER TABLE core.users ADD COLUMN x text',
    'GRANT ALL ON core.users TO public',
    'TRUNCATE core.users',
    'COPY core.users TO STDOUT',
    'DO $$ BEGIN END $$',
    'WITH k AS (SELECT 1) SELECT dblink_exec(1)',
    'SELECT * FROM "core"."users"',
    'INSERT INTO public.x VALUES (1)',
  ])('refuses %s', (sql) => {
    expect(refusal(sql, tables)).not.toBeNull();
  });

  it('checks every statement of a transaction, and how many', () => {
    const ok = { sql: selectStatement('app_user').sql, params: [] };
    expect(refuseBody({ statements: [ok, ok] }, tables)).toBeNull();
    expect(refuseBody({ statements: [ok, { sql: 'DROP TABLE core.users' }] }, tables)).toMatch(
      /Refused/,
    );
    expect(refuseBody({ statements: Array(MAX_STATEMENTS + 1).fill(ok) }, tables)).toMatch(
      /At most/,
    );
    expect(refuseBody({ sql: ok.sql, params: 'x' }, tables)).toMatch(/params/);
    expect(refuseBody({}, tables)).toMatch(/Send/);
  });
});
