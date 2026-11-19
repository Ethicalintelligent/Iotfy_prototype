// /debug/data: proves the data layer works. Row counts for every core table, read live from Neon.
import { Link } from 'react-router-dom';
import { Button, Card, Chip, Loading, Note, PageHeader, Stack, Table } from '@iotify/ui';
import {
  TABLE_NAMES,
  dataMode,
  useConnectionInfo,
  useReloadData,
  useTableCounts,
  type TableName,
} from '@iotify/data';

export function DataDebug() {
  const info = useConnectionInfo();
  const counts = useTableCounts();
  const reload = useReloadData();
  const rows = TABLE_NAMES.map((t) => ({ id: t, table: t, count: counts.data?.[t] }));
  const total = rows.reduce((n, r) => n + (r.count ?? 0), 0);
  const error = info.error ?? counts.error;
  const roleOk = info.data?.role === 'iotify_prototyper';

  return (
    <main
      style={{
        padding: '4px 16px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 900,
      }}
    >
      <PageHeader
        title="Data layer check"
        description="Reads every core table from Neon through @iotify/data and shows how many rows each has. Re-reads when you come back to this tab."
      />
      <Stack justify="space-between">
        <Stack gap={8}>
          <Chip tone="blue">Mode: {dataMode()}</Chip>
          {info.data && <Chip>Database: {info.data.database}</Chip>}
          {info.data && <Chip tone={roleOk ? 'green' : 'red'}>Runs as: {info.data.role}</Chip>}
          {info.data && <Chip>Signed in as: {info.data.login}</Chip>}
          {info.data && <Chip>PostgreSQL {info.data.server_version.split(' ')[0]}</Chip>}
        </Stack>
        <Stack gap={8}>
          <Button size="sm" icon="cloud" onClick={() => reload()} disabled={counts.isFetching}>
            {counts.isFetching ? 'Reading…' : 'Reload from Neon'}
          </Button>
          <Link to="/">Home</Link>
        </Stack>
      </Stack>

      {error && (
        <Note>
          <b>Not connected.</b> {error.message}
          {error.code === 'no_database_url' && (
            <>
              {' '}
              Paste the Neon connection string into <code>.env.local</code> as{' '}
              <code>DATABASE_URL=…</code>; this page picks it up on Reload.
            </>
          )}
        </Note>
      )}
      {info.data && !roleOk && (
        <Note>
          Statements should run as iotify_prototyper (docs/CORE_RULES.md rule 1), but run as{' '}
          {info.data.role}.
        </Note>
      )}

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
    </main>
  );
}
