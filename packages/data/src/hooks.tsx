// React hooks for screens. Screens never write SQL; they call these (or the generated
// per-table hooks in hooks.gen.ts, e.g. useAssets({ company_id })).
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createConnection } from './connection';
import {
  countsStatement,
  deleteStatement,
  selectStatement,
  upsertStatement,
  primaryKey,
  type Filter,
} from './repository';
import type { RowOf, TableName } from './schema.gen';
import type { Connection, DataError, Statement } from './types';

export type { Filter } from './repository';
export interface TableQueryOptions {
  /** false: don't read yet (e.g. until an id is known). */
  enabled?: boolean;
}

const ConnectionContext = createContext<Connection | null>(null);

/**
 * Wrap each app once. Re-reads from Neon whenever a screen opens (navigation), when you come
 * back to the browser tab, and after every save, so other roles' changes show up.
 * Nothing is kept in the browser beyond this page.
 */
export function DataProvider({
  children,
  connection,
}: {
  children: ReactNode;
  connection?: Connection;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            refetchOnMount: 'always',
            refetchOnWindowFocus: 'always',
            refetchOnReconnect: 'always',
            retry: 1,
          },
        },
      }),
  );
  const conn = useMemo(() => connection ?? createConnection(), [connection]);
  return (
    <ConnectionContext.Provider value={conn}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ConnectionContext.Provider>
  );
}

export function useConnection(): Connection {
  const c = useContext(ConnectionContext);
  if (!c) throw new Error('Wrap the app in <DataProvider> from @iotify/data.');
  return c;
}

const key = (table: TableName, filter?: unknown) => ['core', table, filter ?? null] as const;

/** Rows of one core table, optionally filtered: useTable('assets', { company_id: 'C001' }). */
export function useTable<T extends TableName>(
  table: T,
  filter?: Filter<T>,
  options?: TableQueryOptions,
) {
  const conn = useConnection();
  return useQuery<RowOf<T>[], DataError>({
    queryKey: key(table, filter),
    queryFn: () => {
      const s = selectStatement(table, filter);
      return conn.query<RowOf<T>>(s.sql, s.params);
    },
    ...options,
  });
}

/** One record by id: useRecord('assets', 'A001'). `data` is undefined while loading, null if not found. */
export function useRecord<T extends TableName>(table: T, id: string | null | undefined) {
  const pk = primaryKey(table)[0] ?? 'id';
  const q = useTable(table, { [pk]: id } as Filter<T>, { enabled: !!id });
  return { ...q, data: q.data ? (q.data[0] ?? null) : undefined };
}

/** Row count of every core table (debug page). */
export function useTableCounts() {
  const conn = useConnection();
  return useQuery<Record<TableName, number>, DataError>({
    queryKey: ['core', '__counts'],
    queryFn: async () => {
      const s = countsStatement();
      const [row] = await conn.query<{ counts: Record<TableName, number> | string }>(
        s.sql,
        s.params,
      );
      const c = row?.counts;
      return (typeof c === 'string' ? JSON.parse(c) : c) as Record<TableName, number>;
    },
  });
}

export interface ConnectionInfo {
  database: string;
  /** The role statements run as: should be iotify_prototyper (CORE_RULES rule 1). */
  role: string;
  /** The role in the connection string. */
  login: string;
  server_version: string;
}
/** Which database and role we're connected as (never the connection string). */
export function useConnectionInfo() {
  const conn = useConnection();
  return useQuery<ConnectionInfo, DataError>({
    queryKey: ['core', '__info'],
    queryFn: async () =>
      (
        await conn.query<ConnectionInfo>(
          `SELECT current_database() AS database, current_user AS role, session_user AS login, current_setting('server_version') AS server_version`,
        )
      )[0]!,
  });
}

/** Re-read everything (e.g. after a role switch). */
export function useReloadData() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['core'] });
}

// ------------------------------------------------------------------ saves

export interface Upsert<T extends TableName = TableName> {
  table: T;
  rows: Partial<RowOf<T>>[];
}
export interface Removal<T extends TableName = TableName> {
  table: T;
  /** Primary-key values of the rows to delete, e.g. [{ id: 'A001' }]. */
  keys: Partial<RowOf<T>>[];
}
export interface Batch {
  upserts?: Upsert[];
  deletes?: Removal[];
}

function statementsOf(batch: Batch): { statements: Statement[]; tables: Set<TableName> } {
  const statements: Statement[] = [];
  const tables = new Set<TableName>();
  for (const u of batch.upserts ?? []) {
    const s = upsertStatement(u.table, u.rows);
    if (s) {
      statements.push(s);
      tables.add(u.table);
    }
  }
  for (const d of batch.deletes ?? []) {
    const s = deleteStatement(d.table, d.keys);
    if (s) {
      statements.push(s);
      tables.add(d.table);
    }
  }
  return { statements, tables };
}

/**
 * Save several changes in ONE transaction (all or nothing): the Save button in Edit mode.
 * On failure, `error.message` is Neon's exact text; show it with Try again and Cancel.
 */
export function useSaveBatch() {
  const conn = useConnection();
  const qc = useQueryClient();
  return useMutation<void, DataError, Batch>({
    mutationFn: async (batch) => {
      const { statements } = statementsOf(batch);
      if (statements.length) await conn.transaction(statements);
    },
    onSettled: async (_d, _e, batch) => {
      const { tables } = statementsOf(batch);
      await Promise.all([...tables].map((t) => qc.invalidateQueries({ queryKey: ['core', t] })));
      await qc.invalidateQueries({ queryKey: ['core', '__counts'] });
    },
  });
}

/** Insert or update one record at once (button actions: Add, Send, Accept…). */
export function useSaveRecord() {
  const save = useSaveBatch();
  return {
    ...save,
    mutate: <T extends TableName>(
      table: T,
      row: Partial<RowOf<T>>,
      opts?: Parameters<typeof save.mutate>[1],
    ) => save.mutate({ upserts: [{ table, rows: [row] } as Upsert] }, opts),
    mutateAsync: <T extends TableName>(table: T, row: Partial<RowOf<T>>) =>
      save.mutateAsync({ upserts: [{ table, rows: [row] } as Upsert] }),
  };
}

/** Delete one record (after the user confirmed). Neon refuses if other records still use it. */
export function useDeleteRecord() {
  const save = useSaveBatch();
  return {
    ...save,
    mutate: <T extends TableName>(
      table: T,
      keys: Partial<RowOf<T>>,
      opts?: Parameters<typeof save.mutate>[1],
    ) => save.mutate({ deletes: [{ table, keys: [keys] } as Removal] }, opts),
    mutateAsync: <T extends TableName>(table: T, keys: Partial<RowOf<T>>) =>
      save.mutateAsync({ deletes: [{ table, keys: [keys] } as Removal] }),
  };
}
