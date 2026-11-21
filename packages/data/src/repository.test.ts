import { describe, expect, it } from 'vitest';
import {
  countsStatement,
  deleteStatement,
  deleteWhereStatement,
  selectStatement,
  updateStatement,
  markOnceStatement,
  upsertStatement,
} from './repository';
import { inline, literal } from './connections/claudeMcp';
import { TABLE_NAMES } from './schema.gen';

describe('selectStatement', () => {
  it('reads a whole table ordered by key', () => {
    expect(selectStatement('assets')).toEqual({
      sql: 'SELECT * FROM core.assets ORDER BY id',
      params: [],
    });
  });
  it('filters with parameters, lists and nulls', () => {
    const s = selectStatement('assets', { company_id: 'C001', status: ['Active'], site_id: null });
    expect(s.sql).toBe(
      'SELECT * FROM core.assets WHERE company_id = $1 AND status = ANY($2) AND site_id IS NULL ORDER BY id',
    );
    expect(s.params).toEqual(['C001', ['Active']]);
  });
  it('refuses unknown columns', () => {
    // @ts-expect-error not a column
    expect(() => selectStatement('assets', { 'name; DROP TABLE x': 1 })).toThrow(/Unknown column/);
  });
});

describe('upsertStatement', () => {
  it('writes only the given columns and stamps updated_at', () => {
    const s = upsertStatement('assets', [{ id: 'A1', name: 'Tipper' }])!;
    expect(s.sql).toBe(
      'INSERT INTO core.assets (id, name) SELECT id, name FROM json_populate_recordset(null::core.assets, $1::json) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now() RETURNING *',
    );
    expect(JSON.parse(s.params![0] as string)).toEqual([{ id: 'A1', name: 'Tipper' }]);
  });
  it('needs the key', () => {
    expect(() => upsertStatement('assets', [{ name: 'x' }])).toThrow(/needs id/);
  });
  it('ignores created_at and updated_at sent by the screen', () => {
    expect(upsertStatement('assets', [{ id: 'A1', updated_at: 'x' }])!.sql).toContain('DO NOTHING');
  });
  it('returns nothing for no rows', () => {
    expect(upsertStatement('assets', [])).toBeNull();
  });
});

describe('deleteStatement and counts', () => {
  it('deletes by key', () => {
    expect(deleteStatement('sites', [{ id: 'S1' }])!.sql).toBe(
      'DELETE FROM core.sites x USING json_populate_recordset(null::core.sites, $1::json) k WHERE x.id = k.id RETURNING x.*',
    );
  });
  it('counts every core table', () => {
    const sql = countsStatement().sql;
    for (const t of TABLE_NAMES) expect(sql).toContain(`'${t}', (SELECT count(*) FROM core.${t})`);
  });
});

describe('claude-mcp literals', () => {
  it('quotes values safely', () => {
    expect(literal("O'Brien")).toBe("'O''Brien'");
    expect(literal(null)).toBe('NULL');
    expect(literal(3.5)).toBe('3.5');
    expect(literal(true)).toBe('TRUE');
    expect(literal(['a'])).toBe(`'["a"]'`);
  });
  it('inlines numbered parameters', () => {
    expect(inline('SELECT * FROM core.assets WHERE id = $1 AND name = $2', ['A1', "x'y"])).toBe(
      "SELECT * FROM core.assets WHERE id = 'A1' AND name = 'x''y'",
    );
  });
});

describe('updateStatement', () => {
  it('updates only the given fields of existing rows and never inserts', () => {
    const s = updateStatement('support_sessions', [
      { id: 'SS1', ended_at: '2026-11-19T12:00:00Z' },
    ])!;
    expect(s.sql).toContain(
      'UPDATE core.support_sessions x SET ended_at = k.ended_at, updated_at = now() FROM k WHERE x.id = k.id',
    );
    expect(s.sql).not.toContain('INSERT');
    expect(s.sql).toContain('Not found: a support_sessions record to update no longer exists.');
  });
  it('needs the key; nothing to change gives no statement', () => {
    expect(() => updateStatement('assets', [{ name: 'x' }])).toThrow(/needs id/);
    expect(updateStatement('assets', [{ id: 'A1' }])).toBeNull();
  });
});

describe('deleteWhereStatement', () => {
  it('deletes the rows matching a filter', () => {
    expect(deleteWhereStatement('product_features', { product_id: 'N999' })).toEqual({
      sql: 'DELETE FROM core.product_features WHERE product_id = $1',
      params: ['N999'],
    });
  });
  it('never empties a table', () => {
    expect(() => deleteWhereStatement('product_features', {})).toThrow(/give a filter/);
  });
});

describe('markOnceStatement', () => {
  it('sets the column only while it is empty, and says whether it did', () => {
    const s = markOnceStatement('support_sessions', 'SS1', 'link_opened_at');
    expect(s.sql).toBe(
      'UPDATE core.support_sessions SET link_opened_at = now(), updated_at = now() WHERE id = $1 AND link_opened_at IS NULL RETURNING id',
    );
    expect(s.params).toEqual(['SS1']);
  });
  it('refuses unknown columns', () => {
    expect(() => markOnceStatement('support_sessions', 'SS1', 'nope' as never)).toThrow(
      /Unknown column/,
    );
  });
});
