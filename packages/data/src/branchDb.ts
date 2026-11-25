// Neon Database app: the developer's own branch database (read, and change one row at a time).
// The dev server (server/branch-db.js) checks the branch and the database's owner label before any
// SQL; the browser only sees the reply. Only the neon-dev connection has this endpoint.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  /** The table's columns (rows and change replies). */
  columns?: BranchDbColumn[];
  /** Whether rows of this table can be changed here; else why not. */
  editable?: boolean;
  notEditable?: string | null;
  /** The saved row (change replies). */
  row?: Record<string, unknown> | null;
  error?: string;
}

export interface BranchDbColumn {
  name: string;
  /** Postgres type, e.g. "text", "timestamp with time zone". */
  type: string;
  nullable: boolean;
  has_default: boolean;
  generated: boolean;
  pk: boolean;
}

export type BranchDbChange =
  | { action: 'update'; key: Record<string, unknown>; values: Record<string, unknown> }
  | { action: 'insert'; values: Record<string, unknown> }
  | { action: 'delete'; key: Record<string, unknown> };

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

/** The first rows of one table on the branch, with its columns and whether it can be changed. */
export function useBranchDbRows(schema: string | undefined, table: string | undefined) {
  return useQuery<BranchDbReply, DataError>({
    queryKey: ['branchdb', 'rows', schema, table],
    queryFn: () => ask({ action: 'rows', schema, table }),
    enabled: !!schema && !!table,
  });
}

/**
 * Change one row of a table on the branch (update, insert or delete), then re-read the branch.
 * A failed change throws with Neon's exact text.
 */
export function useBranchDbChange(schema: string, table: string) {
  const qc = useQueryClient();
  return useMutation<BranchDbReply, DataError, BranchDbChange>({
    mutationFn: async (change) => {
      const reply = await ask({ ...change, schema, table });
      if (reply.error) throw new DataError(reply.error);
      if (reply.state !== 'ok') throw new DataError('Your branch database is locked. Reload.');
      return reply;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['branchdb'] }),
  });
}

/** Column types offered when creating or changing a column (same list as the dev server). */
export const BRANCH_DB_TYPES = [
  'text',
  'integer',
  'bigint',
  'numeric',
  'boolean',
  'date',
  'timestamptz',
  'jsonb',
  'uuid',
] as const;

export interface BranchDbNewColumn {
  name: string;
  type: string;
  pk?: boolean;
  required?: boolean;
  /** A value, or now() / gen_random_uuid() / true / false. Empty: no default. */
  default?: string;
}

export type BranchDbStructureChange =
  | { op: 'create_table'; schema: string; table: string; columns: BranchDbNewColumn[] }
  | { op: 'add_column'; schema: string; table: string; column: BranchDbNewColumn }
  | { op: 'rename_column'; schema: string; table: string; column: string; to: string }
  | { op: 'alter_type'; schema: string; table: string; column: string; type: string }
  | { op: 'drop_column'; schema: string; table: string; column: string }
  | { op: 'rename_table'; schema: string; table: string; to: string }
  | { op: 'drop_table'; schema: string; table: string };

export interface BranchDbStructureReply extends BranchDbReply {
  /** What was done, e.g. "Add column note to proto_fleet.trips". */
  done?: string;
  /** The migration file written for it, e.g. db/migrations/nadim/004_add_trips_note.sql. */
  migration?: string | null;
  migrationError?: string | null;
}

/**
 * Create, change or drop a table on the branch. The dev server runs it and keeps it as a numbered
 * migration file in db/migrations/<developer>/. A failed change throws with Neon's exact text.
 */
export function useBranchDbStructure() {
  const qc = useQueryClient();
  return useMutation<BranchDbStructureReply, DataError, BranchDbStructureChange>({
    mutationFn: async (change) => {
      const reply = (await ask({ action: 'ddl', ...change })) as BranchDbStructureReply;
      if (reply.error) throw new DataError(reply.error);
      if (reply.state !== 'ok') throw new DataError('Your branch database is locked. Reload.');
      return reply;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['branchdb'] }),
  });
}
