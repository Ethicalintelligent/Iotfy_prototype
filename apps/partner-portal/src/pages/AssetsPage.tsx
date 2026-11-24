// Assets & installation: the dealer's customers' assets. Open one to fit a device from stock, a
// SIM and sensors (each a button action that saves at once), and see Paid / Possible / Allowed
// for every feature. Port of legacy pAssets / assetDetail (legacy/src/app.js ~1504–1580).
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
  useAssets,
  useCompanies,
  useConnectivity,
  useInterfaces,
  useSensorModels,
  useUpdateRecord,
  type AssetsRow,
} from '@iotify/data';
import type { FeatureCheckRow } from '@iotify/core';

type FeatureCheckRowLike = FeatureCheckRow & { id: string };
import { useAuth } from '@iotify/auth';
import { AddVehicleDrawer, VEHICLE_TYPE } from '@iotify-products/gps-vehicle-tracking';
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

export function AssetsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const dealer = auth.account ?? '';
  const readOnly = !!auth.support;
  const companies = useCompanies({ dealer_id: dealer }, { enabled: !!dealer });
  const companyIds = (companies.data ?? []).map((c) => c.id);
  const assets = useAssets({ company_id: companyIds }, { enabled: !!companies.data });
  const { rules } = useCoreRules();
  const [q, setQ] = useState('');
  const [company, setCompany] = useState('');
  const [adding, setAdding] = useState(false);
  // the approved Add / Edit Vehicle drawer (GPS Platform design 07-01)
  const [vehicleDrawer, setVehicleDrawer] = useState<'add' | 'edit' | null>(null);

  const companyName = (cid: string | null | undefined) =>
    companies.data?.find((c) => c.id === cid)?.name ?? '—';
  const typeName = (tid: string | null | undefined) =>
    rules?.data.asset_types.find((t) => t.id === tid)?.name ?? tid ?? '—';
  const fields: FieldDef<AssetsRow>[] = [
    {
      key: 'company_id',
      label: 'Company',
      type: 'select',
      options: { table: 'companies', label: name, filter: { dealer_id: dealer } },
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
    { key: 'plate_serial', label: 'Plate / serial' },
    { key: 'asset_group', label: 'Group', hint: 'Fleet roles see only their group' },
    {
      key: 'site_id',
      label: 'Site',
      type: 'select',
      options: { table: 'sites', label: name, filter: { company_id: companyIds } },
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: enumOptions('assets', 'status'),
      placeholder: null,
    },
  ];
  const rows = (assets.data ?? []).filter(
    (a) =>
      (!company || a.company_id === company) &&
      (!q || `${a.name} ${a.plate_serial ?? ''}`.toLowerCase().includes(q.toLowerCase())),
  );
  const selected = assets.data?.find((a) => a.id === id);
  useDetailTitle(selected?.name ?? selected?.id);

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
              ...(companies.data ?? []).map((c) => ({ value: c.id, label: c.name ?? c.id })),
            ]}
          />
        </div>
        {!readOnly && (
          <>
            <Button size="sm" icon="plus" onClick={() => setAdding(true)}>
              Other asset
            </Button>
            <Button size="sm" variant="primary" icon="plus" onClick={() => setVehicleDrawer('add')}>
              Vehicle
            </Button>
          </>
        )}
      </Toolbar>
      <Table<AssetsRow>
        label="Assets"
        rows={rows}
        empty={assets.isLoading ? 'Loading…' : 'No assets.'}
        onRowClick={(a) => navigate('/assets/' + a.id)}
        columns={[
          { header: 'Asset', cell: (a) => <b>{a.name}</b> },
          { header: 'Plate / serial', cell: (a) => a.plate_serial ?? '—' },
          { header: 'Company', cell: (a) => companyName(a.company_id) },
          { header: 'Type', cell: (a) => typeName(a.asset_type_id) },
          { header: 'Group', cell: 'asset_group' },
          {
            header: 'Device',
            cell: (a) => {
              const u = rules?.installedOn(a.id).unit;
              if (!rules) return '…';
              const m = rules.data.device_models.find((x) => x.id === u?.device_model_id);
              return u ? (
                `${m?.maker ?? ''} ${m?.model ?? ''}`.trim()
              ) : (
                <Chip tone="amber">No device</Chip>
              );
            },
          },
          { header: 'Status', cell: (a) => <StatusChip status={a.status} /> },
        ]}
      />
      {selected && (
        <>
          <TableRecordCard
            key={selected.id}
            config={{ table: 'assets', fields, label: (a) => a.name ?? a.id, noun: 'Asset' }}
            row={selected}
            readOnly={readOnly}
            onDeleted={() => navigate('/assets')}
          />
          {selected.asset_type_id === VEHICLE_TYPE && (
            <VehicleSummary
              asset={selected}
              onEdit={readOnly ? undefined : () => setVehicleDrawer('edit')}
            />
          )}
          <Installation asset={selected} dealer={dealer} readOnly={readOnly} />
          <ProductsAndFeatures asset={selected} readOnly={readOnly} />
        </>
      )}
      {vehicleDrawer && (
        <AddVehicleDrawer
          dealer={dealer}
          company={company}
          asset={vehicleDrawer === 'edit' ? selected : undefined}
          onClose={() => setVehicleDrawer(null)}
          onSaved={(newId) => navigate('/assets/' + newId)}
        />
      )}
      {adding && (
        <RecordFormModal
          title="New · Other asset"
          config={{ table: 'assets', fields: fields.slice(0, 4), idPrefix: 'A' }}
          initial={{ status: 'Active', company_id: company || null }}
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
  asset: AssetsRow;
  dealer: string;
  readOnly: boolean;
}) {
  const { rules } = useCoreRules();
  const sims = useConnectivity({ owner_dealer_id: dealer });
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
  const hw = rules.installedOn(asset.id);
  const unit = hw.unit;
  const freeUnits = d.device_units.filter(
    (u) =>
      !u.asset_id &&
      u.owner_dealer_id === dealer &&
      u.status !== 'Returned' &&
      !rules.isInfrastructure(u.device_model_id ?? '') &&
      (!u.company_id || u.company_id === asset.company_id),
  );
  const sim = unit ? sims.data.find((s) => s.device_unit_id === unit.id) : undefined;
  const freeSims = sims.data.filter((s) => !s.device_unit_id);
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
                  'device_units',
                  { id: unit.id, asset_id: null, status: 'In stock' },
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
                'device_units',
                {
                  id: unitPick,
                  asset_id: asset.id,
                  company_id: asset.company_id,
                  status: 'Installed',
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
                {sim.identifier} {sim.provider ? `· ${sim.provider}` : ''}
              </span>
              {!readOnly && (
                <Button
                  size="sm"
                  onClick={() =>
                    run(
                      'connectivity',
                      { id: sim.id, device_unit_id: null, status: 'In stock' },
                      'SIM removed',
                    )
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
                  options={freeSims.map((s) => ({ value: s.id, label: s.identifier ?? s.id }))}
                  onChange={setSimPick}
                />
              </div>
              <Button
                size="sm"
                variant="primary"
                disabled={!simPick}
                onClick={() =>
                  run(
                    'connectivity',
                    { id: simPick, device_unit_id: unit.id, status: 'Active' },
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
                              device_unit_id: unit.id,
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
function ProductsAndFeatures({ asset, readOnly }: { asset: AssetsRow; readOnly: boolean }) {
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
  const fc = rules.featureCheck(asset.id, dealerRole);
  const subs = rules.data.subscriptions.filter(
    (s) => s.asset_id === asset.id && s.status !== 'Ended',
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
