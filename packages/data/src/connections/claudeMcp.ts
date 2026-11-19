// claude-mcp: for demos published on claude.ai. Neon is reached through the page's MCP
// connector (window.claude.use('mcp')). Port of legacy neonCall / readSheet / saveSheet
// (legacy/src/app.js ~105–195). The Neon tools take plain SQL, so parameters are inlined
// as safely quoted literals.
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
  // Default: the main branch, as the legacy published demos used (CORE_RULES rule 6 exception).
  branch: (import.meta.env.VITE_NEON_BRANCH as string | undefined) || 'br-polished-moon-bdwryps8',
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

/** Pull rows out of the connector's reply, whatever its wrapping (legacy payloadRows). */
function rowsOf(r: unknown): unknown[] | null {
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
  if (p && !Array.isArray(p) && Array.isArray((p as { rows?: unknown[] }).rows))
    p = (p as { rows: unknown[] }).rows;
  return Array.isArray(p) ? p : null;
}

async function call(tool: string, args: Record<string, unknown>) {
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
      const rows = rowsOf(reply);
      // A transaction reply may list each statement's rows; ours is the last one.
      const last =
        rows && rows.length && Array.isArray(rows[rows.length - 1])
          ? (rows[rows.length - 1] as unknown[])
          : rows;
      if (!last) throw new DataError('Could not read the reply from Neon.', { code: 'bad_reply' });
      return last as R[];
    },
    async transaction(statements: Statement[]) {
      const sql = [
        ROLE,
        'SET CONSTRAINTS ALL DEFERRED',
        ...statements.map((s) => inline(s.sql, s.params)),
      ];
      const reply = await call('run_sql_transaction', { sql_statements: sql });
      const rows = rowsOf(reply);
      return rows && rows.every(Array.isArray)
        ? (rows.slice(2) as unknown[][])
        : statements.map(() => []);
    },
  };
}
