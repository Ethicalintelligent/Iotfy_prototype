// Neon Database app: the developer's own branch database, view-only.
// The dev server (server/branch-db.js) checks the branch and the database's owner label before any
// SQL; the browser only sees the reply. Only the neon-dev connection has this endpoint.
import { useQuery } from '@tanstack/react-query';
import { dataMode } from './connection';
import { DataError } from './types';

export type BranchDbState = 'ok' | 'locked' | 'hidden' | 'unavailable';
export type BranchDbLockReason =
  'no_branch' | 'wrong_checkout' | 'no_database' | 'no_label' | 'mismatch';

export interface BranchDbTable {
  schema: string;
  name: string;
  kind: 'table' | 'view';
  /** Postgres's estimate, not an exact count. */
  approx_rows: number;
}

export interface BranchDbReply {
  state: BranchDbState;
  reason?: BranchDbLockReason;
  developer?: string;
  /** dev/<name>: this computer's Git branch. */
  gitBranch?: string;
  /** iotfy_<name>: the Neon branch that belongs to it. */
  neonBranch?: string;
  database?: string;
  tables?: BranchDbTable[];
  schema?: string;
  table?: string;
  rows?: Record<string, unknown>[];
  limit?: number;
  error?: string;
}

const ENDPOINT = '/__branchdb';

async function ask(body: Record<string, unknown>): Promise<BranchDbReply> {
  if (dataMode() !== 'neon-dev' || import.meta.env.VITE_SQL_ENDPOINT)
    return { state: 'unavailable' };
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-iotify-sql': '1' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new DataError('The dev server is not reachable. Is `pnpm dev` running?', {
      code: 'offline',
    });
  }
  let reply: BranchDbReply & { code?: string; detail?: string; hint?: string };
  try {
    reply = await res.json();
  } catch {
    // An older dev server without this endpoint: treat it as not available.
    return { state: 'unavailable' };
  }
  if (!res.ok || (reply.error && reply.state === undefined)) {
    throw new DataError(reply.error || `Request failed (${res.status})`, {
      code: reply.code,
      detail: reply.detail,
      hint: reply.hint,
    });
  }
  return reply;
}

/** Whether the menu shows, and why it is locked. Cheap: no table reads. */
export function useBranchDbStatus() {
  return useQuery<BranchDbReply, DataError>({
    queryKey: ['branchdb', 'status'],
    queryFn: () => ask({ action: 'status' }),
  });
}

/** The branch's schemas and tables (when access is ok). */
export function useBranchDbOverview() {
  return useQuery<BranchDbReply, DataError>({
    queryKey: ['branchdb', 'overview'],
    queryFn: () => ask({ action: 'overview' }),
  });
}

/** The first rows of one table on the branch (view-only). */
export function useBranchDbRows(schema: string | undefined, table: string | undefined) {
  return useQuery<BranchDbReply, DataError>({
    queryKey: ['branchdb', 'rows', schema, table],
    queryFn: () => ask({ action: 'rows', schema, table }),
    enabled: !!schema && !!table,
  });
}
