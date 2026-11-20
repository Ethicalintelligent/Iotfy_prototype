// claude-mcp: for demos published on claude.ai. Neon is reached through the page's MCP
// connector (window.claude.use('mcp')). Port of legacy neonCall / readSheet / saveSheet
// (legacy/src/app.js ~105–195). The Neon tools take plain SQL, so parameters are inlined
// as safely quoted literals.
import { NUMBER_COLUMNS } from '../schema.gen';
import { DataError, type Connection, type Statement } from '../types';

interface McpClient {
  callTool(
    server: string,
    tool: string,
    args: Record<string, unknown>,
    opts?: { cache?: boolean },
  ): Promise<unknown>;
}
declare global {
  interface Window {
    claude?: { use?: (name: 'mcp') => Promise<McpClient> };
  }
}

const NEON = {
  server: 'Neon',
  project: (import.meta.env.VITE_NEON_PROJECT as string | undefined) || 'empty-sea-69531006',
  // Set per app by the demo build (tools/vite/app-config.js): main only for the Admin Console
  // (CORE_RULES rule 6). No default, so a demo can never reach main by accident.
  branch: (import.meta.env.VITE_NEON_BRANCH as string | undefined) || '',
};

// Plain-language versions of the connector's error codes (from the legacy app).
const ERR: Record<string, string> = {
  needs_reauth: 'The Neon connector needs reconnecting (claude.ai Settings › Connectors).',
  server_not_connected: 'Connect Neon in claude.ai Settings › Connectors.',
  selection_required: 'Choose which Neon connector to use.',
  not_in_manifest: 'Neon is not enabled for this page.',
  approval_required: 'Allow Neon for this page.',
  consent_required: 'Allow Neon for this page.',
  not_granted: 'Allow Neon for this page.',
  blocked_by_policy: 'Your organization blocks Neon here.',
};

let client: Promise<McpClient | null> | null = null;
const getMcp = () =>
  (client ??= (window.claude?.use ? window.claude.use('mcp') : Promise.resolve(null)).catch(
    () => null,
  ));

/** A value as a SQL literal. Objects and arrays become JSON text. */
export function literal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return `'${s.replace(/'/g, "''")}'`;
}
/** Replaces $1, $2… with literals. Only for SQL built by this package (no dollar-quoted text). */
export function inline(sql: string, params: unknown[] = []): string {
  return sql.replace(/\$(\d+)/g, (m, n: string) =>
    Number(n) <= params.length ? literal(params[Number(n) - 1]) : m,
  );
}

/**
 * Each statement's rows from the connector's reply, whatever its wrapping. Neon's
 * run_sql_transaction answers { data: [{ rows, totalRowCount, truncated }, …] } (checked on the
 * test branch, 20 Nov 2026); older replies were plain arrays (legacy payloadRows).
 */
export function statementRows(r: unknown): unknown[][] | null {
  let p: unknown = (r as { payload?: unknown })?.payload ?? r;
  const content = (p as { content?: { text?: string }[] })?.content;
  if (p && Array.isArray(content)) p = content.map((c) => c.text ?? '').join('');
  if (typeof p === 'string') {
    try {
      p = JSON.parse(p);
    } catch {
      return null;
    }
  }
  const data = (p as { data?: unknown })?.data;
  if (Array.isArray(data)) p = data;
  const rowsIn = (x: unknown) => (x as { rows?: unknown })?.rows;
  if (Array.isArray(p)) {
    if (p.length && p.every(Array.isArray)) return p as unknown[][];
    if (p.length && p.every((x) => Array.isArray(rowsIn(x))))
      return p.map((x) => rowsIn(x) as unknown[]);
    return [p];
  }
  return Array.isArray(rowsIn(p)) ? [rowsIn(p) as unknown[]] : null;
}

// Replies carry no column types, so numbers (bigint, numeric) arrive as text. Turn them back, as
// the neon-dev connection does: known number columns, plus the aliases this package uses.
const NUMBERS = new Set([...NUMBER_COLUMNS, 'updated']);
export function withNumbers<R>(rows: unknown[]): R[] {
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const o = { ...(row as Record<string, unknown>) };
    for (const [k, v] of Object.entries(o))
      if (typeof v === 'string' && NUMBERS.has(k) && v.trim() !== '' && Number.isFinite(Number(v)))
        o[k] = Number(v);
    return o;
  }) as R[];
}

async function call(tool: string, args: Record<string, unknown>) {
  if (!NEON.branch)
    throw new DataError('This demo has no Neon branch set. Rebuild it with pnpm build:demo.', {
      code: 'no_branch',
    });
  const mcp = await getMcp();
  if (!mcp) {
    throw new DataError(
      'Neon is not reachable here. Open this page in claude.ai with the Neon connector.',
      { code: 'offline' },
    );
  }
  try {
    return await mcp.callTool(
      NEON.server,
      tool,
      { project_id: NEON.project, branch_id: NEON.branch, ...args },
      { cache: false },
    );
  } catch (e) {
    const err = e as { code?: string; message?: string; detail?: string };
    const msg = err.message || err.detail || '';
    throw new DataError(ERR[err.code ?? ''] ?? (msg || 'Neon refused the request.'), {
      code: err.code,
      detail: err.detail,
    });
  }
}

const ROLE = 'SET LOCAL ROLE iotify_prototyper';

export function claudeMcpConnection(): Connection {
  return {
    mode: 'claude-mcp',
    async query<R>(sql: string, params: unknown[] = []) {
      const reply = await call('run_sql_transaction', {
        sql_statements: [ROLE, inline(sql, params)],
      });
      // One entry per statement (the role, then ours): ours is the last one.
      const last = statementRows(reply)?.at(-1);
      if (!last) throw new DataError('Could not read the reply from Neon.', { code: 'bad_reply' });
      return withNumbers<R>(last);
    },
    async transaction(statements: Statement[]) {
      const sql = [
        ROLE,
        'SET CONSTRAINTS ALL DEFERRED',
        ...statements.map((s) => inline(s.sql, s.params)),
      ];
      const reply = await call('run_sql_transaction', { sql_statements: sql });
      const lists = statementRows(reply);
      // Skip the role and constraints statements: one row list per statement of ours.
      return lists && lists.length === sql.length
        ? lists.slice(2).map((rows) => withNumbers(rows))
        : statements.map(() => []);
    },
  };
}
