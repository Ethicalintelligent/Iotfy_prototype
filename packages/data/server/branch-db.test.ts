// Neon Database app: a developer sees only the database labelled with their own branch's name.
import { describe, expect, it } from 'vitest';
import {
  decideAccess,
  ddlStatement,
  deleteStatement,
  migrationText,
  editableReason,
  insertStatement,
  updateStatement,
} from './branch-db.js';

const dev = { role: '', branch: 'dev/nadim', checkedOut: 'dev/nadim', hasUrl: true };

describe('decideAccess', () => {
  it('opens the database when the owner label matches the branch', () => {
    expect(decideAccess({ ...dev, owners: ['nadim'] })).toEqual({
      state: 'ok',
      developer: 'nadim',
    });
  });
  it('hides the menu for the admin (main), whatever the database says', () => {
    expect(decideAccess({ ...dev, role: 'admin', owners: ['nadim'] }).state).toBe('hidden');
  });
  it('locks when the database belongs to another developer', () => {
    expect(decideAccess({ ...dev, owners: ['irfan'] })).toMatchObject({
      state: 'locked',
      reason: 'mismatch',
    });
  });
  it('locks when the database has no owner label (e.g. main), or the table is missing', () => {
    expect(decideAccess({ ...dev, owners: [] }).reason).toBe('no_label');
    expect(decideAccess({ ...dev, owners: null }).reason).toBe('no_label');
  });
  it('locks when the label is ambiguous', () => {
    expect(decideAccess({ ...dev, owners: ['nadim', 'irfan'] }).reason).toBe('mismatch');
  });
  it('locks without a dev/<name> branch, or when another branch is checked out', () => {
    expect(decideAccess({ ...dev, branch: '', owners: ['nadim'] }).reason).toBe('no_branch');
    expect(decideAccess({ ...dev, branch: 'main', owners: ['nadim'] }).reason).toBe('no_branch');
    expect(decideAccess({ ...dev, checkedOut: 'dev/irfan', owners: ['nadim'] }).reason).toBe(
      'wrong_checkout',
    );
  });
  it('locks without a database address', () => {
    expect(decideAccess({ ...dev, hasUrl: false }).reason).toBe('no_database');
  });
  it('does not open before the label has been read', () => {
    expect(decideAccess(dev).state).toBe('locked');
  });
});

const cols = [
  { name: 'id', type: 'text', nullable: false, has_default: false, generated: false, pk: true },
  { name: 'name', type: 'text', nullable: false, has_default: false, generated: false, pk: false },
  { name: 'note', type: 'text', nullable: true, has_default: false, generated: false, pk: false },
  {
    name: 'created_at',
    type: 'timestamptz',
    nullable: false,
    has_default: true,
    generated: false,
    pk: false,
  },
  {
    name: 'total',
    type: 'numeric',
    nullable: true,
    has_default: false,
    generated: true,
    pk: false,
  },
];
const T = '"core"."companies"';

describe('changes build one-row SQL with parameters', () => {
  it('updates only the fields sent, by primary key; empty means NULL where allowed', () => {
    expect(
      updateStatement(T, cols, { id: 'co_1' }, { name: 'Acme Demo', note: '', total: '9' }),
    ).toEqual({
      sql: 'UPDATE "core"."companies" SET "name" = $1, "note" = $2 WHERE "id" = $3 RETURNING *',
      params: ['Acme Demo', null, 'co_1'],
    });
  });
  it('inserts, leaving empty fields with a default to the database', () => {
    expect(insertStatement(T, cols, { id: 'co_9', name: 'New Demo', created_at: '' })).toEqual({
      sql: 'INSERT INTO "core"."companies" ("id", "name") VALUES ($1, $2) RETURNING *',
      params: ['co_9', 'New Demo'],
    });
  });
  it('deletes one row by primary key, and refuses without a key', () => {
    expect(deleteStatement(T, cols, { id: 'co_1' })).toEqual({
      sql: 'DELETE FROM "core"."companies" WHERE "id" = $1 RETURNING *',
      params: ['co_1'],
    });
    expect(() => deleteStatement(T, cols, {})).toThrow(/key/);
  });
  it('quotes names, so a column name cannot inject SQL', () => {
    const odd = [{ ...cols[0], name: 'id"; DROP TABLE x; --' }];
    expect(deleteStatement(T, odd, { 'id"; DROP TABLE x; --': '1' }).sql).toBe(
      'DELETE FROM "core"."companies" WHERE "id""; DROP TABLE x; --" = $1 RETURNING *',
    );
  });
  it('ignores fields that are not columns of the table', () => {
    expect(() => updateStatement(T, cols, { id: 'co_1' }, { hacker: 'x' })).toThrow(/Nothing/);
  });
  it('refuses views, tables without a primary key, and the owner label', () => {
    expect(editableReason({ schema: 'core', kind: 'view' }, cols)).toMatch(/Views/);
    expect(editableReason({ schema: 'core', kind: 'table' }, [cols[1]])).toMatch(/primary key/);
    expect(editableReason({ schema: 'devtools', kind: 'table' }, cols)).toMatch(/owner label/);
    expect(editableReason({ schema: 'core', kind: 'table' }, cols)).toBeNull();
  });
});

describe('table structure changes (create, alter, drop)', () => {
  const s = { schema: 'proto_fleet', table: 'trips' };
  it('creates the schema and table, with key, required fields and defaults, safe to run twice', () => {
    const st = ddlStatement('create_table', {
      ...s,
      columns: [
        { name: 'id', type: 'text', pk: true },
        { name: 'km', type: 'numeric', required: true, default: '0' },
        { name: 'started_at', type: 'timestamptz', default: 'now()' },
      ],
    });
    expect(st.statements).toEqual([
      'CREATE SCHEMA IF NOT EXISTS "proto_fleet"',
      'CREATE TABLE IF NOT EXISTS "proto_fleet"."trips" (\n  "id" text NOT NULL,\n  "km" numeric NOT NULL DEFAULT \'0\',\n  "started_at" timestamptz DEFAULT now(),\n  PRIMARY KEY ("id")\n)',
    ]);
    expect(st.core).toBe(false);
  });
  it('adds, renames, retypes and drops columns', () => {
    expect(
      ddlStatement('add_column', { ...s, column: { name: 'note', type: 'text' } }).statements,
    ).toEqual(['ALTER TABLE "proto_fleet"."trips" ADD COLUMN IF NOT EXISTS "note" text']);
    expect(
      ddlStatement('rename_column', { ...s, column: 'note', to: 'remark' }).statements[0],
    ).toContain('ALTER TABLE "proto_fleet"."trips" RENAME COLUMN "note" TO "remark"');
    expect(ddlStatement('alter_type', { ...s, column: 'km', type: 'integer' }).statements).toEqual([
      'ALTER TABLE "proto_fleet"."trips" ALTER COLUMN "km" TYPE integer USING "km"::integer',
    ]);
    expect(ddlStatement('drop_column', { ...s, column: 'note' }).statements).toEqual([
      'ALTER TABLE "proto_fleet"."trips" DROP COLUMN IF EXISTS "note"',
    ]);
  });
  it('renames and drops tables', () => {
    expect(ddlStatement('rename_table', { ...s, to: 'journeys' }).statements[0]).toContain(
      'ALTER TABLE "proto_fleet"."trips" RENAME TO "journeys"',
    );
    expect(ddlStatement('drop_table', s).statements).toEqual([
      'DROP TABLE IF EXISTS "proto_fleet"."trips"',
    ]);
  });
  it('quotes default values, so a value cannot inject SQL', () => {
    const st = ddlStatement('add_column', {
      ...s,
      column: { name: 'tag', type: 'text', default: "x'); DROP TABLE y; --" },
    });
    expect(st.statements[0]).toBe(
      'ALTER TABLE "proto_fleet"."trips" ADD COLUMN IF NOT EXISTS "tag" text DEFAULT \'x\'\'); DROP TABLE y; --\'',
    );
  });
  it('refuses names that are not snake_case, unknown types, and locked schemas', () => {
    expect(() => ddlStatement('drop_table', { schema: 'core', table: 'x"; DROP' })).toThrow(
      /snake_case/,
    );
    expect(() =>
      ddlStatement('add_column', { ...s, column: { name: 'a', type: 'money' } }),
    ).toThrow(/Type/);
    expect(() => ddlStatement('drop_table', { schema: 'devtools', table: 'branch_owner' })).toThrow(
      /can’t be changed/,
    );
    expect(() => ddlStatement('drop_table', { schema: 'pg_catalog', table: 'pg_class' })).toThrow();
    expect(() => ddlStatement('create_table', { ...s, columns: [] })).toThrow(/at least one/);
  });
  it('writes a migration file that names a core change as such', () => {
    const st = ddlStatement('drop_column', { schema: 'core', table: 'assets', column: 'old' });
    expect(migrationText(st, 'iotfy_nadim', '2026-11-25')).toBe(
      '-- Drop column core.assets.old\n' +
        '-- Made in the Neon Database app on 2026-11-25, on branch iotfy_nadim. Safe to run twice.\n' +
        '-- Core change: it stays on your branch. To reach main it needs a core change request\n' +
        '-- (docs/CORE_RULES.md rule 9).\n\n' +
        'ALTER TABLE "core"."assets" DROP COLUMN IF EXISTS "old";\n',
    );
  });
});
