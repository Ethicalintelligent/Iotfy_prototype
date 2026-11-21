// The claude-mcp connection against the reply Neon's connector really gives (captured from
// run_sql_transaction on the test branch, 20 Nov 2026).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { statementRows, withNumbers } from './claudeMcp';

const REAL_REPLY = {
  data: [
    { rows: [], totalRowCount: 0, truncated: false },
    {
      rows: [
        {
          id: 'N004',
          name: 'GPS Vehicle Tracking',
          kind: 'Base',
          created_at: '2026-11-17T03:14:18.840Z',
          count: '55',
          base_price: null,
        },
        {
          id: 'N051',
          name: 'ConstructSafe',
          kind: 'Package',
          created_at: '2026-11-17T03:14:18.840Z',
          count: '55',
          base_price: '120.50',
        },
      ],
      totalRowCount: 2,
      truncated: false,
    },
  ],
};

describe('claude-mcp replies', () => {
  it('reads one row list per statement from the real reply, also when wrapped', () => {
    const lists = statementRows(REAL_REPLY)!;
    expect(lists).toHaveLength(2);
    expect(lists[1]).toHaveLength(2);
    expect(statementRows({ payload: JSON.stringify(REAL_REPLY) })).toEqual(lists);
    expect(statementRows({ content: [{ text: JSON.stringify(REAL_REPLY) }] })).toEqual(lists);
    expect(statementRows([{ id: 'a' }])).toEqual([[{ id: 'a' }]]); // legacy plain rows
    expect(statementRows('not json')).toBeNull();
  });

  it('turns number columns back into numbers and leaves text alone', () => {
    const [a, b] = withNumbers<Record<string, unknown>>(statementRows(REAL_REPLY)![1]!);
    expect(a).toMatchObject({ count: 55, base_price: null, id: 'N004' });
    expect(b).toMatchObject({ count: 55, base_price: 120.5 });
    const [c] = withNumbers<Record<string, unknown>>([{ imei: '356938035643809', name: '12' }]);
    expect(c).toEqual({ imei: '356938035643809', name: '12' }); // digits in text columns stay text
  });
});

describe('claude-mcp connection', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function connect(callTool: (...a: unknown[]) => Promise<unknown>) {
    vi.resetModules();
    vi.stubEnv('VITE_NEON_BRANCH', 'br-test');
    vi.stubGlobal('window', { claude: { use: async () => ({ callTool }) } });
    const { claudeMcpConnection } = await import('./claudeMcp');
    return claudeMcpConnection();
  }

  it('sends the role first, to the configured branch, and returns our rows with numbers', async () => {
    const callTool = vi.fn(async () => REAL_REPLY);
    const rows = await (await connect(callTool)).query('SELECT $1::text AS x', ["it's"]);
    expect(rows).toHaveLength(2);
    expect((rows[0] as { count: number }).count).toBe(55);
    const [server, tool, args] = callTool.mock.calls[0]! as unknown as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect([server, tool]).toEqual(['Neon', 'run_sql_transaction']);
    expect(args.branch_id).toBe('br-test');
    expect(args.sql_statements).toEqual([
      'SET LOCAL ROLE iotify_prototyper',
      "SELECT 'it''s'::text AS x",
    ]);
  });

  it('a transaction returns one row list per statement (role and constraints skipped)', async () => {
    const reply = {
      data: [{ rows: [] }, { rows: [] }, { rows: [{ updated: '1' }] }, { rows: [] }],
    };
    const conn = await connect(async () => reply);
    const out = await conn.transaction([
      { sql: 'UPDATE a', params: [] },
      { sql: 'DELETE b', params: [] },
    ]);
    expect(out).toEqual([[{ updated: 1 }], []]);
  });

  it('without a branch it refuses (a demo can never fall back to main)', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_NEON_BRANCH', '');
    vi.stubGlobal('window', {
      claude: { use: async () => ({ callTool: async () => REAL_REPLY }) },
    });
    const { claudeMcpConnection } = await import('./claudeMcp');
    await expect(claudeMcpConnection().query('SELECT 1')).rejects.toThrow(/no Neon branch/);
  });
});
