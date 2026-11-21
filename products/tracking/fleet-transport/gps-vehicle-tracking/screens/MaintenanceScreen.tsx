// Maintenance: when each vehicle is due for service, most urgent first, with "Log service".
// Vehicles are the company's real assets; odometers and service history are demo activity
// (labelled) and a logged service is kept on this screen only until a maintenance table exists.
import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Chip,
  DateField,
  EmptyState,
  FieldGrid,
  KpiRow,
  KpiTile,
  Loading,
  Modal,
  Note,
  Table,
  Tabs,
  TextField,
  useToast,
} from '@iotify/ui';
import { useAssets } from '@iotify/data';
import { DemoNote, Toolbar, demoContext, useCoreRules, type ScreenContext } from '@iotify/app-kit';
import {
  DUE_SOON_KM,
  SERVICE_INTERVAL_KM,
  byUrgency,
  demoServiceRows,
  isoDaysAgo,
  logService,
  plan,
  serviceEntryError,
  type ServicePlan,
  type ServiceRow,
  type ServiceStatus,
} from '../maintenance';

type Filter = 'all' | 'Overdue' | 'Due soon';
const TONE: Record<ServiceStatus, 'bad' | 'warn' | 'green'> = {
  Overdue: 'bad',
  'Due soon': 'warn',
  OK: 'green',
};
const km = (v: number) => v.toLocaleString('en-US') + ' km';
const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
const dateText = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : iso;
};

export default function MaintenanceScreen({
  product,
  companyId,
  companyName,
  assetGroup,
  readOnly,
}: ScreenContext) {
  const { rules } = useCoreRules();
  const toast = useToast();
  const assets = useAssets({ company_id: companyId }, { enabled: !!companyId });
  const [filter, setFilter] = useState<Filter>('all');
  const [logged, setLogged] = useState<Record<string, ServiceRow>>({});
  const [logging, setLogging] = useState<ServicePlan | null>(null);

  const base = useMemo(() => {
    const types = rules?.productAssetTypes(product) ?? new Set<string>();
    const vehicles = (assets.data ?? [])
      .filter(
        (a) => types.has(a.asset_type_id ?? '') && (!assetGroup || a.asset_group === assetGroup),
      )
      .map((a) => ({ id: a.id, name: a.name ?? a.id }));
    return demoServiceRows(demoContext(product + 'maint' + companyId, vehicles), vehicles);
  }, [rules, assets.data, product, companyId, assetGroup]);

  if (!assets.data || !rules) return <Loading>Loading vehicles…</Loading>;

  const plans = base.map((r) => plan(logged[r.id] ?? r)).sort(byUrgency);
  const overdue = plans.filter((p) => p.status === 'Overdue');
  const dueSoon = plans.filter((p) => p.status === 'Due soon');
  const next = plans.find((p) => p.status !== 'Overdue');
  const shown = filter === 'all' ? plans : plans.filter((p) => p.status === filter);

  return (
    <>
      <KpiRow>
        <KpiTile
          label="Vehicles"
          value={plans.length}
          sub={`Service every ${km(SERVICE_INTERVAL_KM)}`}
        />
        <KpiTile
          label="Overdue"
          value={overdue.length}
          sub={overdue.length ? `Worst: ${km(-overdue[0]!.kmLeft)} over` : 'None'}
          tone={overdue.length ? 'warn' : 'ok'}
        />
        <KpiTile
          label="Due soon"
          value={dueSoon.length}
          sub={`Within ${km(DUE_SOON_KM)}`}
          tone={dueSoon.length ? 'warn' : 'ok'}
        />
        <KpiTile
          label="Next service"
          value={next ? next.vehicle : '–'}
          sub={next ? `In ${km(next.kmLeft)} · about ${next.daysLeft} days` : 'All overdue'}
        />
      </KpiRow>
      <Toolbar>
        <Tabs
          label="Which vehicles"
          tabs={[
            { key: 'all', label: `All (${plans.length})` },
            { key: 'Overdue', label: `Overdue (${overdue.length})` },
            { key: 'Due soon', label: `Due soon (${dueSoon.length})` },
          ]}
          value={filter}
          onChange={(k) => setFilter(k as Filter)}
        />
      </Toolbar>
      <Card padded={false}>
        <Table<ServicePlan>
          bare
          label="Maintenance"
          rows={shown}
          rowKey={(p) => p.id}
          columns={[
            { header: 'Vehicle', cell: (p) => <b>{p.vehicle}</b> },
            { header: 'Odometer', cell: (p) => km(p.odometerKm) },
            {
              header: 'Last service',
              cell: (p) => (
                <>
                  {dateText(p.lastServiceDate)}
                  <div className="ui-muted">{p.lastWork}</div>
                </>
              ),
            },
            { header: 'Next service at', cell: (p) => km(p.nextServiceKm) },
            {
              header: 'Left',
              cell: (p) =>
                p.kmLeft < 0 ? `${km(-p.kmLeft)} over` : `${km(p.kmLeft)} · ~${p.daysLeft} d`,
            },
            { header: 'Status', cell: (p) => <Chip tone={TONE[p.status]}>{p.status}</Chip> },
            {
              header: '',
              align: 'right',
              cell: (p) =>
                readOnly ? null : (
                  <Button size="sm" data-vehicle={p.id} onClick={() => setLogging(p)}>
                    Log service
                  </Button>
                ),
            },
          ]}
          empty={
            <EmptyState icon="calendar" title={plans.length ? 'Nothing here' : 'No vehicles yet'}>
              {plans.length
                ? `No vehicle is ${filter === 'Overdue' ? 'overdue' : 'due soon'}.`
                : 'Vehicles your dealer adds appear here with their service schedule.'}
            </EmptyState>
          }
        />
      </Card>
      <DemoNote companyName={companyName} count={plans.length} />
      {logging && (
        <LogServiceModal
          row={logging}
          onClose={() => setLogging(null)}
          onSave={(entry) => {
            setLogged((m) => ({ ...m, [logging.id]: logService(m[logging.id] ?? logging, entry) }));
            setLogging(null);
            toast(`Service logged for ${logging.vehicle} (demo)`);
          }}
        />
      )}
    </>
  );
}

function LogServiceModal({
  row,
  onClose,
  onSave,
}: {
  row: ServicePlan;
  onClose: () => void;
  onSave: (entry: { date: string; odometerKm: number; work: string }) => void;
}) {
  const today = isoDaysAgo(0);
  const [date, setDate] = useState(today);
  const [odo, setOdo] = useState(String(row.odometerKm));
  const [work, setWork] = useState('');
  const [tried, setTried] = useState(false);
  const entry = { date, odometerKm: Number(odo), work };
  const error = serviceEntryError(row, entry, today);
  return (
    <Modal
      open
      onClose={onClose}
      title={`Log service · ${row.vehicle}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              setTried(true);
              if (!error) onSave(entry);
            }}
          >
            Log service
          </Button>
        </>
      }
    >
      <FieldGrid>
        <DateField label="Service date" value={date} onChange={setDate} max={today} required />
        <TextField
          label="Odometer (km)"
          type="number"
          value={odo}
          onChange={setOdo}
          hint={`Last service at ${km(row.lastServiceKm)}`}
          required
        />
      </FieldGrid>
      <TextField
        label="Work done"
        value={work}
        onChange={setWork}
        placeholder="e.g. Oil and filter, brake pads"
        required
      />
      {tried && error && <Note tone="red">{error}</Note>}
      <Note tone="grey">
        Demo: the next service is worked out from this entry on this screen. It isn’t stored in the
        database yet.
      </Note>
    </Modal>
  );
}
