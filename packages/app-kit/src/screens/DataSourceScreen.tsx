// Data source: which database and role the app uses (never the connection string), and the
// row count of every core table, read live from Neon. Port of legacy pSheet.
import { Button, Card, Chip, Loading, Note, Stack, Table } from '@iotify/ui';
import {
  TABLE_NAMES,
  dataMode,
  useConnectionInfo,
  useReloadData,
  useTableCounts,
  type TableName,
} from '@iotify/data';

export function DataSourceScreen() {
  const info = useConnectionInfo();
  const counts = useTableCounts();
  const reload = useReloadData();
  const rows = TABLE_NAMES.map((t) => ({ id: t, table: t, count: counts.data?.[t] }));
  const total = rows.reduce((n, r) => n + (r.count ?? 0), 0);
  const error = info.error ?? counts.error;
  const roleOk = info.data?.role === 'iotify_prototyper';
  return (
    <>
      <Stack justify="space-between">
        <Stack gap={8}>
          <Chip tone="blue">Mode: {dataMode()}</Chip>
          {info.data && <Chip>Database: {info.data.database}</Chip>}
          {info.data && <Chip tone={roleOk ? 'green' : 'red'}>Runs as: {info.data.role}</Chip>}
          {info.data && <Chip>Signed in as: {info.data.login}</Chip>}
          {info.data && <Chip>PostgreSQL {info.data.server_version.split(' ')[0]}</Chip>}
        </Stack>
        <Button size="sm" icon="cloud" onClick={() => reload()} disabled={counts.isFetching}>
          {counts.isFetching ? 'Reading…' : 'Reload from Neon'}
        </Button>
      </Stack>
      {error && (
        <Note tone="red">
          <b>Not connected.</b> {error.message}
        </Note>
      )}
      {info.data && !roleOk && (
        <Note>
          Statements should run as iotify_prototyper (docs/CORE_RULES.md rule 1), but run as{' '}
          {info.data.role}.
        </Note>
      )}
      <Note tone="grey">
        Everything is read live from Neon and re-read on every page change and when you come back to
        the tab. Edits go to Neon when you press Save; buttons like Add or Send save at once.
        Nothing is kept in this browser except who is signed in.
      </Note>
      {counts.isLoading ? (
        <Card>
          <Loading>Reading {TABLE_NAMES.length} core tables from Neon…</Loading>
        </Card>
      ) : (
        <Card
          title={`${TABLE_NAMES.length} core tables`}
          actions={
            counts.data && <span className="ui-muted">{total.toLocaleString()} rows in all</span>
          }
        >
          <Table<{ id: TableName; table: TableName; count?: number }>
            bare
            label="Core table row counts"
            rows={rows}
            columns={[
              { header: 'Table', cell: (r) => <code>core.{r.table}</code> },
              {
                header: 'Rows',
                cell: (r) => (r.count == null ? '—' : r.count.toLocaleString()),
                align: 'right',
                width: 120,
              },
            ]}
          />
        </Card>
      )}
    </>
  );
}
