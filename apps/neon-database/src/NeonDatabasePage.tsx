// Neon Database screens: Overview and Tables of the developer's own branch database, view-only.
// Access is decided by the dev server (packages/data/server/branch-db.js); this only shows the reply.
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  KeyValueList,
  Loading,
  Note,
  SearchInput,
  SelectField,
  SideLayout,
  Stack,
  StepChain,
  Table,
} from '@iotify/ui';
import {
  useBranchDbOverview,
  useBranchDbRows,
  type BranchDbReply,
  type BranchDbTable,
} from '@iotify/data';

const LOCK_TEXT: Record<string, { title: string; fix: string }> = {
  no_branch: {
    title: 'No developer branch is set on this computer',
    fix: 'Tell Claude Code "Start my session, I\'m <your name>" so this computer gets its branch dev/<name>.',
  },
  wrong_checkout: {
    title: 'A different Git branch is checked out',
    fix: 'Switch back to your own branch (tell Claude Code "switch to my branch"), then press Try again.',
  },
  no_database: {
    title: 'This computer has no database address yet',
    fix: 'Paste the DATABASE_URL line the admin sent you into .env.local, then press Try again.',
  },
  no_label: {
    title: 'Your database has no owner label yet',
    fix: 'Ask the admin to label your Neon branch (db/migrations/devtools/001_branch_owner.sql).',
  },
  mismatch: {
    title: "This database isn't yours",
    fix: 'The database address on this computer belongs to another branch. Ask the admin for your own DATABASE_URL line, put it in .env.local, then press Try again.',
  },
};

export function NeonDatabasePage({ view }: { view: 'overview' | 'tables' }) {
  const overview = useBranchDbOverview();
  const reply = overview.data;

  if (overview.isLoading)
    return (
      <Card>
        <Loading>Checking your branch and reading its database…</Loading>
      </Card>
    );
  if (overview.error)
    return (
      <Note tone="red">
        <b>Not connected.</b> {overview.error.message}
      </Note>
    );
  if (!reply || reply.state === 'hidden' || reply.state === 'unavailable')
    return (
      <Card>
        <EmptyState icon="sheet" title="Neon Database is for developer computers">
          {reply?.state === 'hidden'
            ? 'This is the admin copy (main). Developers see their own branch database here.'
            : "It shows a developer's own branch database while the dev server runs."}
        </EmptyState>
      </Card>
    );
  if (reply.state === 'locked')
    return <Locked reply={reply} onRetry={() => overview.refetch()} busy={overview.isFetching} />;

  return (
    <>
      <Stack gap={8}>
        <Chip tone="green">Connected to {reply.gitBranch}</Chip>
        <Chip tone="amber">View-only</Chip>
      </Stack>
      {view === 'tables' ? <Tables tables={reply.tables ?? []} /> : <Overview reply={reply} />}
    </>
  );
}

function Locked({
  reply,
  onRetry,
  busy,
}: {
  reply: BranchDbReply;
  onRetry: () => void;
  busy: boolean;
}) {
  const text = LOCK_TEXT[reply.reason ?? ''] ?? LOCK_TEXT.mismatch!;
  return (
    <Card>
      <EmptyState icon="lock" title={text.title}>
        Neon Database stays locked. Nothing from the database was shown.
      </EmptyState>
      {reply.developer && (
        <KeyValueList
          rows={[
            { label: 'Your Git branch', value: reply.gitBranch },
            { label: 'Expected database', value: reply.neonBranch },
          ]}
        />
      )}
      <Note tone="grey">
        <b>To fix it:</b> {text.fix}
      </Note>
      <Stack>
        <Button variant="primary" icon="refresh" onClick={onRetry} disabled={busy}>
          {busy ? 'Checking…' : 'Try again'}
        </Button>
      </Stack>
    </Card>
  );
}

function Overview({ reply }: { reply: BranchDbReply }) {
  const navigate = useNavigate();
  const schemas = useMemo(() => {
    const by = new Map<string, number>();
    for (const t of reply.tables ?? []) by.set(t.schema, (by.get(t.schema) ?? 0) + 1);
    return [...by].map(([schema, count]) => ({ id: schema, schema, count }));
  }, [reply.tables]);
  return (
    <>
      <Card
        title="Connected branch"
        actions={<Chip tone="green">Match checked on every request</Chip>}
      >
        <StepChain
          label="Branch to database"
          steps={[
            { key: 'git', kicker: 'Git branch · this computer', text: reply.gitBranch },
            { key: 'neon', kicker: 'Neon branch', text: reply.neonBranch },
            { key: 'db', kicker: 'Database', text: reply.database },
          ]}
        />
      </Card>
      <Card title="Schemas on your branch">
        <Table
          bare
          label="Schemas on your branch"
          rows={schemas}
          onRowClick={(r) => navigate('/tables/' + encodeURIComponent(r.schema))}
          empty="No schemas found."
          columns={[
            { header: 'Schema', cell: (r) => <code>{r.schema}</code> },
            { header: 'Tables and views', cell: 'count', align: 'right', width: 160 },
          ]}
        />
      </Card>
      <Note tone="grey">
        <b>Not shown, not reachable.</b> Other developers' databases and Neon main are not listed.
        This computer holds the address of {reply.neonBranch} only, so they can't be opened from
        here.
      </Note>
    </>
  );
}

function Tables({ tables }: { tables: BranchDbTable[] }) {
  const { schema: schemaParam, table } = useParams();
  const navigate = useNavigate();
  const schemaNames = [...new Set(tables.map((t) => t.schema))];
  const schema = schemaParam && schemaNames.includes(schemaParam) ? schemaParam : schemaNames[0];
  const inSchema = tables.filter((t) => t.schema === schema);
  const open = (s: string, t?: string) =>
    navigate('/tables/' + encodeURIComponent(s) + (t ? '/' + encodeURIComponent(t) : ''));
  return (
    <SideLayout
      side={
        <Card title="Tables">
          <SelectField
            label="Schema"
            value={schema ?? ''}
            onChange={(s) => open(s)}
            options={schemaNames.map((s) => ({ value: s, label: s }))}
          />
          <Table
            bare
            label={`Tables in ${schema}`}
            rows={inSchema.map((t) => ({ ...t, id: t.name }))}
            onRowClick={(t) => open(t.schema, t.name)}
            pageSize={50}
            empty="No tables in this schema."
            columns={[
              {
                header: 'Table',
                cell: (t) => (t.name === table ? <b>{t.name}</b> : t.name),
              },
              {
                header: 'Rows (about)',
                cell: (t) => (t.kind === 'view' ? 'view' : Number(t.approx_rows).toLocaleString()),
                align: 'right',
              },
            ]}
          />
        </Card>
      }
    >
      {schema && table ? (
        <Rows schema={schema} table={table} />
      ) : (
        <Card>
          <EmptyState icon="sheet" title="Choose a table">
            Pick a table on the left to see its rows.
          </EmptyState>
        </Card>
      )}
    </SideLayout>
  );
}

const show = (v: unknown) =>
  v == null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);

function Rows({ schema, table }: { schema: string; table: string }) {
  const rows = useBranchDbRows(schema, table);
  const [q, setQ] = useState('');
  const data = rows.data?.rows ?? [];
  const cols = data.length ? Object.keys(data[0]!) : [];
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? data.filter((r) => cols.some((c) => show(r[c]).toLowerCase().includes(needle)))
    : data;
  const limit = rows.data?.limit ?? 0;
  return (
    <Card
      title={
        <>
          <span className="ui-muted">{schema} /</span> {table}
        </>
      }
      actions={<SearchInput value={q} onChange={setQ} placeholder="Search these rows" />}
    >
      {rows.isLoading ? (
        <Loading>Reading {table}…</Loading>
      ) : rows.error ? (
        <Note tone="red">{rows.error.message}</Note>
      ) : rows.data?.error ? (
        <Note tone="red">{rows.data.error}</Note>
      ) : (
        <>
          {data.length >= limit && limit > 0 && (
            <Note tone="grey">Showing the first {limit} rows.</Note>
          )}
          <Table<Record<string, unknown>>
            bare
            label={`${schema}.${table}`}
            rows={shown}
            rowKey={(_, i) => String(i)}
            empty={needle ? 'No rows match.' : 'This table is empty.'}
            columns={cols.map((c) => ({ header: c, cell: (r) => show(r[c]) }))}
          />
        </>
      )}
    </Card>
  );
}
