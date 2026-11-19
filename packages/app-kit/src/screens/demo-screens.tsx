// Product screens fed by demo activity (until devices report live data): Dashboard, Live map /
// Floor view, Alerts, Reports, Alert rules and the product's own tables. Port of legacy xPage,
// xDash and xMap (legacy/src/app.js ~989–1030). Every screen says the data is demo.
import type { ReactNode } from 'react';
import {
  AssetMap,
  BarChart,
  Button,
  Card,
  Chip,
  EmptyState,
  KpiRow,
  KpiTile,
  Note,
  Stack,
  Table,
  useToast,
  type FloorZone,
} from '@iotify/ui';
import { cellTone, demoAlerts, type DemoCell, type DemoContext } from '../demo';
import type { ProductSpec, TableSpec } from '../spec';

/** "Demo activity" label shown on every screen that uses generated data. */
export function DemoNote({ companyName, count }: { companyName: string; count: number }) {
  return (
    <Note tone="grey" data-testid="demo-note">
      Demo activity, generated from {companyName}'s {count} asset{count === 1 ? '' : 's'}. Live data
      replaces it when devices report.
    </Note>
  );
}

/** A table cell: "!High" red chip, "~Medium" amber, "+Done" green, "^Low" blue, else text. */
export function Cell({ v }: { v: DemoCell }) {
  const { tone, text } = cellTone(v);
  return tone ? <Chip tone={tone}>{text}</Chip> : <>{text}</>;
}

/** Page actions beside the content (never in the title row). */
export function Toolbar({ children, search }: { children?: ReactNode; search?: ReactNode }) {
  return (
    <div className="ak-toolbar">
      {search && <div className="ak-toolbar__search">{search}</div>}
      <span className="ak-toolbar__grow" />
      {children}
    </div>
  );
}

function DemoTable({
  columns,
  rows,
  label,
}: {
  columns: string[];
  rows: DemoCell[][];
  label: string;
}) {
  return (
    <Table<DemoCell[]>
      label={label}
      rows={rows}
      rowKey={(_, i) => i}
      columns={columns.map((h, j) => ({ header: h, cell: (r) => <Cell v={r[j] ?? ''} /> }))}
    />
  );
}

interface DemoProps {
  c: DemoContext;
  companyName: string;
}

const useDemoAction = () => {
  const toast = useToast();
  return (what: string) => toast(`${what} (demo)`);
};

// ------------------------------------------------------------------ Dashboard
export function DashboardScreen({
  spec,
  c,
  companyName,
  onViewAlerts,
}: DemoProps & { spec: ProductSpec; onViewAlerts?: () => void }) {
  const [title, unit, typical] = spec.chart;
  const values = [...Array(7)].map(() => Math.round(typical * (0.75 + c.r() * 0.5)));
  const labels = [...Array(7)].map((_, i) => (i === 6 ? 'Today' : c.d(6 - i)));
  const alerts = demoAlerts(spec.alerts, c).slice(0, 5);
  return (
    <>
      <KpiRow>
        {spec.kpis(c).map((k) => (
          <KpiTile key={k.label} label={k.label} value={k.value} sub={k.sub} tone={k.tone} />
        ))}
      </KpiRow>
      <div className="ak-dash">
        <Card title={title} actions={<span className="ui-muted">Last 7 days · {unit}</span>}>
          <BarChart values={values} labels={labels} label={`${title}, last 7 days`} format={c.k} />
        </Card>
        <Card
          title="Recent alerts"
          actions={
            onViewAlerts && (
              <Button size="sm" onClick={onViewAlerts}>
                View all
              </Button>
            )
          }
        >
          {alerts.map((a, i) => (
            <div key={i} className="ak-alertrow">
              <Cell v={a[3]!} />
              <span className="ak-alertrow__text">
                <b>{a[2]}</b>
                <small className="ui-muted">
                  {a[1]} · {a[0]}
                </small>
              </span>
              <Cell v={a[4]!} />
            </div>
          ))}
        </Card>
      </div>
      <Card title="Your assets">
        <AssetDots c={c} />
      </Card>
      <DemoNote companyName={companyName} count={c.n} />
    </>
  );
}

function AssetDots({ c, place }: { c: DemoContext; place?: (i: number) => string }) {
  if (!c.assets.length) return <EmptyState>No assets yet.</EmptyState>;
  return (
    <div className="ak-assets">
      {c.assets.map((a, i) => (
        <div key={a.id} className="ak-asset">
          <span className={`ak-sdot ${i % 5 === 3 ? 'ak-sdot--warn' : ''}`} />
          <span>
            <b>{a.name}</b>
            <small className="ui-muted">
              {place ? place(i) : a.detail} · updated {c.i(1, 59)} s ago
            </small>
          </span>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Live map / Floor view
export function MapScreen({
  c,
  companyName,
  floor,
  zones,
}: DemoProps & { floor?: boolean; zones?: FloorZone[] }) {
  const zoneNames = zones?.length
    ? zones.map((z) => z.name)
    : ['Zone A', 'Zone B', 'Zone C', 'Zone E'];
  return (
    <>
      <div className="ak-mapw">
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <AssetMap
            floor={floor}
            zones={zones}
            label={floor ? 'Floor view of assets' : 'Map of assets'}
            points={c.assets.map((a, i) => ({ id: a.id, label: a.name, warn: i % 5 === 3 }))}
          />
        </Card>
        <Card className="ak-maplist">
          <AssetDots c={c} place={(i) => (floor ? zoneNames[i % zoneNames.length]! : c.pl(i))} />
        </Card>
      </div>
      <DemoNote companyName={companyName} count={c.n} />
    </>
  );
}

// ------------------------------------------------------------------ Alerts
export function AlertsScreen({ spec, c, companyName }: DemoProps & { spec: ProductSpec }) {
  const demo = useDemoAction();
  return (
    <>
      <Toolbar>
        <Chip>Today</Chip>
        <Button size="sm" onClick={() => demo('All open alerts acknowledged')}>
          Acknowledge all
        </Button>
        <Button size="sm" onClick={() => demo('Exported')}>
          Export
        </Button>
      </Toolbar>
      <DemoTable
        label="Alerts"
        columns={['Time', 'Asset', 'Alert', 'Severity', 'Status']}
        rows={demoAlerts(spec.alerts, c)}
      />
      <DemoNote companyName={companyName} count={c.n} />
    </>
  );
}

// ------------------------------------------------------------------ Reports
export function ReportsScreen({ spec, c, companyName }: DemoProps & { spec: ProductSpec }) {
  const demo = useDemoAction();
  return (
    <>
      <div className="ak-grid">
        {spec.reports.map(([name, desc]) => (
          <Card key={name} title={name}>
            <span className="ui-muted">{desc}</span>
            <Stack gap={8}>
              <Button size="sm" variant="primary" onClick={() => demo(`${name} report generated`)}>
                Run
              </Button>
              <Button size="sm" onClick={() => demo(`${name} scheduled weekly by email`)}>
                Schedule
              </Button>
            </Stack>
          </Card>
        ))}
      </div>
      <DemoNote companyName={companyName} count={c.n} />
    </>
  );
}

// ------------------------------------------------------------------ Alert rules
export function RulesScreen({ spec }: { spec: ProductSpec }) {
  const demo = useDemoAction();
  const rules = spec.rules ?? [];
  return (
    <>
      <Toolbar>
        <Button
          size="sm"
          variant="primary"
          icon="plus"
          onClick={() => demo('Rule editor opens here')}
        >
          Rule
        </Button>
      </Toolbar>
      <DemoTable
        label="Alert rules"
        columns={['Rule', 'Condition', 'Notify', 'Active']}
        rows={rules.map((r, i) => [...r, i === 3 ? '~Paused' : '+On'])}
      />
      <Note tone="grey">
        Example rules for this app. The rule editor comes with the product screens.
      </Note>
    </>
  );
}

// ------------------------------------------------------------------ A product's own table
export function SpecTableScreen({ table, c, companyName }: DemoProps & { table: TableSpec }) {
  const demo = useDemoAction();
  const count = table.rows === 0 ? c.n : (table.rows ?? 10);
  return (
    <>
      <Toolbar>
        <Chip>Today</Chip>
        <Button size="sm" onClick={() => demo('Exported')}>
          Export
        </Button>
      </Toolbar>
      <DemoTable
        label={table.title}
        columns={table.columns}
        rows={[...Array(count)].map((_, i) => table.row(c, i))}
      />
      <DemoNote companyName={companyName} count={c.n} />
    </>
  );
}
