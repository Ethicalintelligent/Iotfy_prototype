// @iotify/data: the only way screens read and write data.
// screens → hooks → repository (SQL builder) → connection (neon-dev | claude-mcp | api)
export * from './types';
export { createConnection, dataMode } from './connection';
export * from './schema.gen';
export {
  DataProvider,
  useConnection,
  useTable,
  useRecord,
  useTableCounts,
  useConnectionInfo,
  useReloadData,
  ReadOnlyData,
  useReadOnly,
  useSaveBatch,
  useSaveRecord,
  useUpdateRecord,
  useMarkOnce,
  useNextIds,
  useDeleteRecord,
  type Batch,
  type Upsert,
  type Removal,
  type ConnectionInfo,
  type Filter,
  type TableQueryOptions,
} from './hooks';
export * from './hooks.gen';
export {
  useBranchDbStatus,
  useBranchDbOverview,
  useBranchDbRows,
  useBranchDbChange,
  useBranchDbStructure,
  BRANCH_DB_TYPES,
  type BranchDbNewColumn,
  type BranchDbStructureChange,
  type BranchDbStructureReply,
  type BranchDbChange,
  type BranchDbColumn,
  type BranchDbReply,
  type BranchDbState,
  type BranchDbLockReason,
  type BranchDbTable,
} from './branchDb';
