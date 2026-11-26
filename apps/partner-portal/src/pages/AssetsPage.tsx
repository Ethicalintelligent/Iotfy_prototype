// Assets & installation: the dealer's customers' assets. Open one to fit a device from stock, a
// SIM and sensors (each a button action that saves at once), and see Paid / Possible / Allowed
// for every feature. Port of legacy pAssets / assetDetail (legacy/src/app.js ~1504–1580).
// IT-0040: assets are core.tracked_asset (code = plate / serial, group_id, site_id → core.branch),
// devices core.device (the SIM is device.sim_card_id → core.sim_card); ids are numbers. The rules
// (rules.data) use the same ids as text.
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Loading,
  Note,
  SearchInput,
  SelectField,
  Stack,
  StatusChip,
  Table,
  YesNo,
  useToast,
  Subhead,
} from '@iotify/ui';
import {
  useAssetGroup,
  useCompany,
  useInterfaces,
  useSensorModels,
  useSimCard,
  useTrackedAsset,
  useUpdateRecord,
  type TrackedAssetRow,
} from '@iotify/data';
import type { FeatureCheckRow } from '@iotify/core';

type FeatureCheckRowLike = FeatureCheckRow & { id: string };
import { useAuth } from '@iotify/auth';
// Vehicles' asset type. The Add / Edit Vehicle drawer (GPS Vehicle Tracking forms/) was deleted in
// IT-0025 while the product is rebuilt; vehicles show their summary read-only until it is back.
const VEHICLE_TYPE = 'AT1';
import { VehicleSummary } from './vehicle/VehicleSummary';
import {
  TableRecordCard,
  Toolbar,
  RecordFormModal,
  enumOptions,
  useCoreRules,
  useDetailTitle,
  type FieldDef,
} from '@iotify/app-kit';

const name = (r: Record<string, unknown>) => String(r.name ?? r.id);
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  MAINTENANCE: 'Maintenance',
};

export function AssetsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const dealer = auth.account ?? '';
  const readOnly = !!auth.support;
  const companies = useCompany({ dealer_id: dealer }, { enabled: !!dealer });
  const companyIds = (companies.data ?? []).map((c) => c.id!);
  const assets = useTrackedAsset({ company_id: companyIds }, { enabled: !!companies.data });
  const groups = useAssetGroup({ company_id: companyIds }, { enabled: !!companies.data });
  const groupName = (gid: number | null | undefined) =>
    groups.data?.find((g) => g.id === gid)?.name ?? '';
  const { rules } = useCoreRules();
  const [q, setQ] = useState('');
  const [company, setCompany] = useState('');
  const [adding, setAdding] = useState(false);
  // the approved Add / Edit Vehicle drawer (GPS Platform design 07-01)

  const companyName = (cid: number | null | undefined) =>
    companies.data?.find((c) => c.id === cid)?.name ?? '—';
  const typeName = (tid: string | null | undefined) =>
    rules?.data.asset_types.find((t) => t.id === tid)?.name ?? tid ?? '—';
  const fields: FieldDef<TrackedAssetRow>[] = [
    {
      key: 'company_id',
      label: 'Company',
      type: 'select',
      options: { table: 'company', label: name, filter: { dealer_id: dealer } },
      required: true,
    },
    {
      key: 'asset_type_id',
      label: 'Type',
      type: 'select',
      options: { table: 'asset_types', label: name },
      required: true,
    },
    { key: 'name', label: 'Name', required: true },
    { key: 'code', label: 'Plate / serial' },
    {
      key: 'group_id',
      label: 'Group',
      type: 'select',
      options: { table: 'asset_group', label: name, filter: { company_id: companyIds } },
      hint: 'Fleet roles see only their group',
    },
    {
      key: 'site_id',
      label: 'Site',
      type: 'select',
      options: { table: 'branch', label: name, filter: { company_id: companyIds } },
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: enumOptions('tracked_asset', 'status'),
      placeholder: null,
    },
  ];
  const rows = (assets.data ?? []).filter(
    (a) =>
      (!company || String(a.company_id) === company) &&
      (!q || `${a.name} ${a.code ?? ''}`.toLowerCase().includes(q.toLowerCase())),
  );
  const selected = assets.data?.find((a) => String(a.id) === id);
  useDetailTitle(selected?.name ?? (selected ? String(selected.id) : undefined));

  return (
    <>
      <Toolbar search={<SearchInput value={q} onChange={setQ} placeholder="Search assets" />}>
        <div style={{ minWidth: 200 }}>
          <SelectField
            label="Company"
            value={company}
            onChange={setCompany}
            options={[
              { value: '', label: 'All companies' },
              ...(companies.data ?? []).map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
        </div>
        {!readOnly && (
          <>
            <Button size="sm" icon="plus" onClick={() => setAdding(true)}>
              Other asset
            </Button>
          </>
        )}
      </Toolbar>
      <Table<TrackedAssetRow>
        label="Assets"
        rows={rows}
        empty={assets.isLoading ? 'Loading…' : 'No assets.'}
        onRowClick={(a) => navigate('/assets/' + a.id)}
        columns={[
          { header: 'Asset', cell: (a) => <b>{a.name}</b> },
          { header: 'Plate / serial', cell: (a) => a.code ?? '—' },
          { header: 'Company', cell: (a) => companyName(a.company_id) },
          { header: 'Type', cell: (a) => typeName(a.asset_type_id) },
          { header: 'Group', cell: (a) => groupName(a.group_id) },
          {
            header: 'Device',
            cell: (a) => {
              const u = rules?.installedOn(String(a.id)).unit;
              if (!rules) return '…';
              const m = rules.data.device_models.find((x) => x.id === u?.device_model_id);
              return u ? (
                `${m?.maker ?? ''} ${m?.model ?? ''}`.trim()
              ) : (
                <Chip tone="amber">No device</Chip>
              );
            },
          },
          {
            header: 'Status',
            cell: (a) => <StatusChip status={STATUS_LABEL[a.status ?? ''] ?? a.status ?? ''} />,
          },
        ]}
      />
      {selected && (
        <>
          <TableRecordCard
            key={selected.id}
            config={{
              table: 'tracked_asset',
              fields,
              label: (a) => a.name || String(a.id),
              noun: 'Asset',
            }}
            row={selected}
            readOnly={readOnly}
            onDeleted={() => navigate('/assets')}
          />
          {selected.asset_type_id === VEHICLE_TYPE && (
            <VehicleSummary asset={selected} />
          )}
          <Installation asset={selected} dealer={dealer} readOnly={readOnly} />
          <ProductsAndFeatures asset={selected} readOnly={readOnly} />
        </>
      )}
      {adding && (
        <RecordFormModal
          title="New · Other asset"
          config={{ table: 'tracked_asset', fields: fields.slice(0, 4), idPrefix: 'A' }}
          initial={{
            status: 'ACTIVE',
            asset_type: 'OTHER',
            ...(company ? { company_id: Number(company) } : {}),
          }}
          isNew
          onClose={() => setAdding(false)}
          onSaved={(newId) => navigate('/assets/' + newId)}
        />
      )}
    </>
  );
}

/** Device, SIM and sensors fitted to the asset. Every action saves at once. */
function Installation({
  asset,
  dealer,
  readOnly,
}: {
  asset: TrackedAssetRow;
  dealer: string;
  readOnly: boolean;
}) {
  const { rules } = useCoreRules();
  const sims = useSimCard({ owner_dealer_id: dealer });
  const sensorModels = useSensorModels();
  const ifaces = useInterfaces();
  const update = useUpdateRecord();
  const toast = useToast();
  const [unitPick, setUnitPick] = useState('');
  const [simPick, setSimPick] = useState('');
  const [sensorPick, setSensorPick] = useState<Record<string, string>>({});
  if (!rules || !sims.data || !ifaces.data) return <Loading>Loading installation…</Loading>;
  const d = rules.data;
  const run = (
    table: Parameters<typeof update.mutate>[0],
    row: Record<string, unknown>,
    done: string,
  ) =>
    update.mutate(table, row as never, {
      onSuccess: () => toast(done),
      onError: (e) => toast({ type: 'error', title: 'Not saved', desc: e.message }),
    });
  const modelName = (mid: string | null | undefined) => {
    const m = d.device_models.find((x) => x.id === mid);
    return `${m?.maker ?? ''} ${m?.model ?? ''}`.trim();
  };
  const hw = rules.installedOn(String(asset.id));
  const unit = hw.unit;
  const freeUnits = d.device_units.filter(
    (u) =>
      !u.asset_id &&
      u.owner_dealer_id === dealer &&
      !rules.isInfrastructure(u.device_model_id ?? '') &&
      (!u.company_id || u.company_id === asset.company_id),
  );
  // A SIM is fitted when a device points to it (core.device.sim_card_id).
  const fitted = new Set(d.device_units.map((u) => u.sim_card_id).filter((x) => x != null));
  const sim = unit ? sims.data.find((x) => x.id === unit.sim_card_id) : undefined;
  const freeSims = sims.data.filter((x) => x.id != null && !fitted.has(x.id));
  const ifaceName = (iid: string) => ifaces.data.find((i) => i.id === iid)?.name ?? iid;
  // one slot per interface port of the device model: "DI 1", "DI 2"…
  const slots = unit
    ? d.device_interfaces
        .filter((r) => r.device_model_id === unit.device_model_id)
        .flatMap((r) =>
          Array.from({ length: Math.min(r.count ?? 0, 16) }, (_, i) => ({
            iface: r.interface_id ?? '',
            slot: `${ifaceName(r.interface_id ?? '')} ${i + 1}`,
          })),
        )
    : [];
  const sensorModelName = (mid: string | null | undefined) => {
    const m = sensorModels.data?.find((x) => x.id === mid);
    return m ? `${m.maker ?? ''} ${m.model ?? ''}`.trim() : (mid ?? '');
  };

  return (
    <Card title="Installation">
      <Subhead>Device</Subhead>
      {unit ? (
        <Stack justify="space-between">
          <span>
            <b>{modelName(unit.device_model_id)}</b> · IMEI {unit.imei}{' '}
            <Chip tone="green">Installed</Chip>
          </span>
          {!readOnly && (
            <Button
              size="sm"
              onClick={() =>
                run(
                  'device',
                  { id: Number(unit.id), asset_id: null, status: 'IN_STOCK' },
                  'Device removed',
                )
              }
            >
              Remove device
            </Button>
          )}
        </Stack>
      ) : readOnly ? (
        <span className="ui-muted">No device fitted.</span>
      ) : freeUnits.length ? (
        <Stack align="flex-end">
          <div style={{ minWidth: 260 }}>
            <SelectField
              label="Device from stock"
              value={unitPick}
              placeholder="Choose a device"
              options={freeUnits.map((u) => ({
                value: u.id,
                label: `${modelName(u.device_model_id)} · ${u.imei ?? u.id}`,
              }))}
              onChange={setUnitPick}
            />
          </div>
          <Button
            size="sm"
            variant="primary"
            disabled={!unitPick}
            onClick={() =>
              run(
                'device',
                {
                  id: Number(unitPick),
                  asset_id: asset.id,
                  company_id: asset.company_id,
                  status: 'ACTIVE',
                },
                'Device fitted',
              )
            }
          >
            Fit device
          </Button>
        </Stack>
      ) : (
        <Note tone="grey">No device in stock. Add one in Stock.</Note>
      )}

      {unit && (
        <>
          <Subhead>SIM card</Subhead>
          {sim ? (
            <Stack justify="space-between">
              <span>
                {sim.iccid} {sim.provider ? `· ${sim.provider}` : ''}
              </span>
              {!readOnly && (
                <Button
                  size="sm"
                  onClick={() =>
                    run('device', { id: Number(unit.id), sim_card_id: null }, 'SIM removed')
                  }
                >
                  Remove SIM
                </Button>
              )}
            </Stack>
          ) : readOnly ? (
            <span className="ui-muted">No SIM.</span>
          ) : freeSims.length ? (
            <Stack align="flex-end">
              <div style={{ minWidth: 260 }}>
                <SelectField
                  label="SIM from stock"
                  value={simPick}
                  placeholder="Choose a SIM"
                  options={freeSims.map((x) => ({ value: String(x.id), label: x.iccid }))}
                  onChange={setSimPick}
                />
              </div>
              <Button
                size="sm"
                variant="primary"
                disabled={!simPick}
                onClick={() =>
                  run(
                    'device',
                    { id: Number(unit.id), sim_card_id: Number(simPick) },
                    'SIM added',
                  )
                }
              >
                Add SIM
              </Button>
            </Stack>
          ) : (
            <Note tone="grey">No SIM in stock.</Note>
          )}

          <Subhead>Sensors</Subhead>
          <div className="ak-grid">
            {slots.map(({ iface, slot }) => {
              const on =
                hw.sensors.find((s) => s.slot === slot) ??
                hw.sensors.find(
                  (s) =>
                    s.interface_id === iface && !s.slot && !hw.sensors.some((x) => x.slot === slot),
                );
              const cands = d.sensor_units.filter(
                (s) =>
                  !s.device_unit_id &&
                  s.owner_dealer_id === dealer &&
                  d.sensor_interfaces.some(
                    (si) => si.sensor_model_id === s.sensor_model_id && si.interface_id === iface,
                  ),
              );
              return (
                <Card key={slot} title={slot} data-slot={slot}>
                  {on ? (
                    <>
                      <span>
                        {sensorModelName(on.sensor_model_id)} · SN {on.serial}
                      </span>
                      {!readOnly && (
                        <Button
                          size="sm"
                          onClick={() =>
                            run(
                              'sensor_units',
                              { id: on.id, device_unit_id: null, slot: null, interface_id: null },
                              'Sensor detached',
                            )
                          }
                        >
                          Detach
                        </Button>
                      )}
                    </>
                  ) : readOnly ? (
                    <span className="ui-muted">Free</span>
                  ) : cands.length ? (
                    <>
                      <SelectField
                        label={`Sensor for ${slot}`}
                        value={sensorPick[slot] ?? ''}
                        placeholder="Choose a sensor"
                        options={cands.map((s) => ({
                          value: s.id,
                          label: `${sensorModelName(s.sensor_model_id)} · ${s.serial ?? s.id}`,
                        }))}
                        onChange={(v) => setSensorPick((p) => ({ ...p, [slot]: v }))}
                      />
                      <Button
                        size="sm"
                        disabled={!sensorPick[slot]}
                        onClick={() =>
                          run(
                            'sensor_units',
                            {
                              id: sensorPick[slot],
                              device_unit_id: Number(unit.id),
                              interface_id: iface,
                              slot,
                            },
                            'Sensor attached',
                          )
                        }
                      >
                        + Attach sensor
                      </Button>
                    </>
                  ) : (
                    <span className="ui-muted">No sensor in stock with this interface</span>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}

/** The asset's products and, per feature, Paid / Possible / Allowed (dealer role). */
function ProductsAndFeatures({
  asset,
  readOnly,
}: {
  asset: TrackedAssetRow;
  readOnly: boolean;
}) {
  const { rules } = useCoreRules();
  const update = useUpdateRecord();
  const toast = useToast();
  if (!rules) return null;
  // A button action: saves at once (legacy endsub). Neon's error text shows if it fails.
  const end = (id: string, name: string) =>
    update.mutate('subscriptions', { id, status: 'Ended' } as never, {
      onSuccess: () => toast(`${name} ended on this asset`),
      onError: (e) => toast({ type: 'error', title: 'Not saved', desc: e.message }),
    });
  const dealerRole = rules.data.roles.find((r) => r.level === 'Dealer')?.id ?? null;
  const fc = rules.featureCheck(String(asset.id), dealerRole);
  const subs = rules.data.subscriptions.filter(
    (s) => s.asset_id === String(asset.id) && s.status !== 'Ended',
  );
  return (
    <Card title="Products & features">
      <Stack gap={6}>
        {subs.length ? (
          subs.map((s) => (
            <Stack key={s.id} gap={8} align="center" data-sub={s.id}>
              <Chip tone={rules.isActiveSubscription(s) ? 'green' : 'neutral'}>
                {rules.node(s.product_id)?.name} · {s.status}
              </Chip>
              {!readOnly && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={update.isPending}
                  onClick={() => end(s.id, rules.node(s.product_id)?.name ?? s.id)}
                >
                  End subscription
                </Button>
              )}
            </Stack>
          ))
        ) : (
          <span className="ui-muted">
            No products on this asset yet. Add them on a quote or in Subscriptions.
          </span>
        )}
      </Stack>
      {fc.rows.length ? (
        <Table<FeatureCheckRowLike>
          bare
          label="Paid, possible, allowed"
          rows={fc.rows.map((r) => ({ ...r, id: r.featureId }))}
          columns={[
            { header: 'Feature', cell: (r) => <b>{r.name}</b> },
            { header: 'Product', cell: (r) => rules.node(r.product)?.name ?? r.product },
            { header: 'Paid', cell: (r) => <YesNo value={r.paid} /> },
            {
              header: 'Possible',
              cell: (r) =>
                r.possible ? (
                  <YesNo value />
                ) : (
                  <span className="ui-no">✗ Needs {r.missingText.join(', ')}</span>
                ),
            },
            {
              header: 'Allowed',
              cell: (r) => (r.allowed == null ? '—' : <YesNo value={r.allowed} />),
            },
          ]}
        />
      ) : (
        <EmptyState>No features for this asset type yet.</EmptyState>
      )}
      {fc.upsell.length > 0 && (
        <Note tone="green">
          Could sell: {fc.upsell.map((p) => rules.node(p)?.name).join(', ')} (the fitted hardware
          already supports their features).
        </Note>
      )}
    </Card>
  );
}
