// Multi-Edit of the approved design (Desktop/vs/Manage-Vehicle.html, "Edit 2 Vehicles"): the
// vehicle fields that can be shared, for every ticked vehicle at once. Only the fields changed
// here are saved; the rest stay as each vehicle has them. Ticked geofences are added to each
// vehicle. One transaction for all vehicles.
import { useState } from 'react';
import {
  Button,
  CheckTree,
  DateField,
  Drawer,
  FieldAction,
  FormSection,
  FullRow,
  Note,
  SelectField,
  TextField,
} from '@iotify/ui';
import {
  useAssetGroups,
  useGeofences,
  useOperators,
  useRoles,
  useSaveBatch,
  useUsers,
  type AssetsRow,
  type Batch,
  type VehicleDetailsRow,
} from '@iotify/data';
import { AddLookupModal, nextIds, num, useLookupOptions, type LookupKind } from './lookups';
import { OWNERSHIP, YEARS, opts } from './VehicleDrawer';

const STEPS = [
  { key: 'general', label: 'General Info' },
  { key: 'assign', label: 'Assignment' },
  { key: 'map', label: 'Map & Geofence' },
  { key: 'fuel', label: 'Fuel' },
];

const EMPTY = {
  category: '',
  vehicleType: '',
  opCode: '',
  color: '',
  make: '',
  model: '',
  status: '',
  year: '',
  odometer: '',
  speed: '',
  height: '',
  ownership: '',
  branch: '',
  registration: '',
  insurance: '',
  fc: '',
  permit: '',
  fleetManager: '',
  group: '',
  supervisor: '',
  operator: '',
  fuelType: '',
  tank: '',
  mileage: '',
  oil: '',
  cost: '',
  maxFuel: '',
  calibration: '',
};
type Form = typeof EMPTY;

/** Form key → vehicle_details column, and whether it is a number. */
const DETAIL: [keyof Form, keyof VehicleDetailsRow, 'num'?][] = [
  ['category', 'category'],
  ['vehicleType', 'vehicle_type'],
  ['opCode', 'operation_code'],
  ['color', 'color'],
  ['make', 'make'],
  ['model', 'model'],
  ['year', 'year', 'num'],
  ['odometer', 'odometer_km', 'num'],
  ['speed', 'speed_limit_kmh', 'num'],
  ['height', 'height_cm', 'num'],
  ['ownership', 'ownership'],
  ['branch', 'branch'],
  ['registration', 'registration_date'],
  ['insurance', 'insurance_expiry'],
  ['fc', 'fc_expiry'],
  ['permit', 'permit_expiry'],
  ['fleetManager', 'fleet_manager_id'],
  ['supervisor', 'supervisor_id'],
  ['fuelType', 'fuel_type'],
  ['tank', 'tank_capacity_l', 'num'],
  ['mileage', 'mileage_km_l', 'num'],
  ['oil', 'oil_capacity_l', 'num'],
  ['cost', 'cost_per_l', 'num'],
  ['maxFuel', 'max_fuel_level_l', 'num'],
  ['calibration', 'fuel_calibration'],
];

export function MultiEditVehiclesDrawer({
  companyId,
  assets,
  onClose,
  onSaved,
}: {
  companyId: string;
  assets: AssetsRow[];
  onClose: () => void;
  onSaved?: () => void;
}) {
  const on = { enabled: !!companyId };
  const people = useUsers({ account_id: companyId }, on);
  const roles = useRoles();
  const operators = useOperators({ company_id: companyId }, on);
  const groups = useAssetGroups({ company_id: companyId }, on);
  const allGroups = useAssetGroups();
  const fences = useGeofences({ company_id: companyId }, on);
  const lookups = useLookupOptions();
  const save = useSaveBatch();
  const [f, setF] = useState<Form>(EMPTY);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<LookupKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Form) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const roleId = (n: string) => roles.data?.find((r) => r.name === n)?.id;
  const peopleIn = (role: string) =>
    (people.data ?? [])
      .filter((u) => u.role_id === roleId(role))
      .map((u) => ({ value: u.id, label: u.name ?? u.id }));
  const groupNames = [
    ...new Set([
      ...(groups.data ?? []).map((g) => g.name),
      ...assets.map((a) => a.asset_group ?? '').filter(Boolean),
    ]),
  ].sort();

  const lookupField = (kind: LookupKind, key: keyof Form, label: string, ph: string) => (
    <SelectField
      label={label}
      action={<FieldAction onClick={() => setAdding(kind)}>Add</FieldAction>}
      value={f[key]}
      onChange={(v) => setF((p) => ({ ...p, [key]: v, ...(key === 'make' ? { model: '' } : {}) }))}
      placeholder={ph}
      options={lookups.options(kind, kind === 'model' ? f.make : undefined)}
    />
  );
  const field = (key: keyof Form, label: string, type?: 'number') => (
    <TextField label={label} type={type} value={f[key]} onChange={set(key)} />
  );

  const changed = Object.entries(f).filter(([, v]) => v.trim() !== '').length + ticked.size;

  const submit = async () => {
    setError(null);
    if (!changed) return setError('Change at least one field first.');
    const bad = DETAIL.filter(([k, , t]) => t === 'num' && f[k].trim() && num(f[k]) == null);
    if (bad.length) return setError(`Not a number: ${bad.map(([k]) => k).join(', ')}.`);
    const d: Partial<VehicleDetailsRow> = {};
    for (const [k, col, t] of DETAIL) {
      const v = f[k].trim();
      if (v) (d as Record<string, unknown>)[col] = t === 'num' ? num(v) : v;
    }
    const op = (operators.data ?? []).find((o) => o.id === f.operator);
    if (op) {
      d.operator_id = op.id;
      d.operator_name = op.name;
    }
    const a: Partial<AssetsRow> = {};
    if (f.status) a.status = f.status as 'Active';
    if (f.group.trim()) a.asset_group = f.group.trim();
    const batch: Batch = { upserts: [], updates: [] };
    const group = f.group.trim();
    if (group && !(groups.data ?? []).some((g) => g.name === group))
      batch.upserts!.push({
        table: 'asset_groups',
        rows: [
          { id: nextIds('GRP', allGroups.data ?? [], 1)[0]!, company_id: companyId, name: group },
        ],
      });
    if (Object.keys(d).length)
      batch.upserts!.push({
        table: 'vehicle_details',
        rows: assets.map((x) => ({ ...d, asset_id: x.id })),
      });
    if (ticked.size)
      batch.upserts!.push({
        table: 'vehicle_geofences',
        rows: assets.flatMap((x) => [...ticked].map((g) => ({ asset_id: x.id, geofence_id: g }))),
      });
    if (Object.keys(a).length)
      batch.updates!.push({ table: 'assets', rows: assets.map((x) => ({ ...a, id: x.id })) });
    try {
      await save.mutateAsync(batch);
      onSaved?.();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const fenceGroups = ['Circle', 'Freeform']
    .map((shape) => {
      const items = (fences.data ?? [])
        .filter((g) => g.shape === shape)
        .map((g) => ({ key: g.id, label: g.name }));
      return { key: shape, label: `${shape} · ${items.length}`, items };
    })
    .filter((g) => g.items.length);

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Edit ${assets.length} Vehicles`}
      subtitle="Only the fields you change here are saved; the rest stay as each one has them."
      icon="edit"
      steps={STEPS}
      notice={
        error && (
          <Note tone="red" role="alert">
            {error}
          </Note>
        )
      }
      footer={
        <>
          <Button
            onClick={() => {
              setF(EMPTY);
              setTicked(new Set());
              setError(null);
            }}
          >
            Reset
          </Button>
          <Button variant="primary" disabled={save.isPending} onClick={submit}>
            {save.isPending ? 'Saving…' : `Save ${assets.length} Vehicles`}
          </Button>
        </>
      }
    >
      <FormSection id="general" title="General Information" icon="info">
        <FullRow>
          <span className="ui-muted" style={{ fontSize: 12 }}>
            Editing: {assets.map((a) => a.name ?? a.id).join(', ')}
          </span>
        </FullRow>
        {lookupField('category', 'category', 'Category', 'Select…')}
        {lookupField('vehicle_type', 'vehicleType', 'Type', 'Select type...')}
        {field('opCode', 'Vehicle Operation Code')}
        {lookupField('color', 'color', 'Vehicle Color', 'Select color...')}
        {lookupField('make', 'make', 'Make', 'Select make...')}
        {lookupField('model', 'model', 'Model', 'Select model...')}
        <SelectField
          label="Asset Status"
          value={f.status}
          onChange={set('status')}
          placeholder="Select status..."
          options={opts(['Active', 'Inactive'])}
        />
        <SelectField
          label="Year"
          value={f.year}
          onChange={set('year')}
          placeholder="Select year..."
          options={opts(YEARS)}
        />
        {field('odometer', 'Odometer Value', 'number')}
        {field('speed', 'Speed Limit (km/h)', 'number')}
        {field('height', 'Height in cm', 'number')}
        <SelectField
          label="Ownership"
          value={f.ownership}
          onChange={set('ownership')}
          placeholder="Select ownership..."
          options={opts(OWNERSHIP)}
        />
        {field('branch', 'Branch')}
        <DateField
          label="Registration Date"
          value={f.registration}
          onChange={set('registration')}
        />
        <DateField label="Insurance Expiry Date" value={f.insurance} onChange={set('insurance')} />
        <DateField label="FC Expiry Date" value={f.fc} onChange={set('fc')} />
        <DateField label="Permit Expiry Date" value={f.permit} onChange={set('permit')} />
      </FormSection>
      <FormSection id="assign" title="Assignment" icon="users">
        <SelectField
          label="Fleet Manager"
          value={f.fleetManager}
          onChange={set('fleetManager')}
          placeholder="Select fleet manager..."
          options={peopleIn('Fleet Manager')}
        />
        <SelectField
          label="Group"
          value={f.group}
          onChange={set('group')}
          placeholder="Select group..."
          options={opts(groupNames)}
        />
        <SelectField
          label="Supervisor"
          value={f.supervisor}
          onChange={set('supervisor')}
          placeholder="Select supervisor..."
          options={peopleIn('Fleet Supervisor')}
        />
        <SelectField
          label="Operator"
          value={f.operator}
          onChange={set('operator')}
          placeholder="Select operator..."
          options={(operators.data ?? [])
            .filter((o) => o.status !== 'Inactive')
            .map((o) => ({ value: o.id, label: o.name }))}
        />
      </FormSection>
      <FormSection id="map" title="Map & Geofence" icon="geofence" cols={1}>
        {fenceGroups.length ? (
          <CheckTree
            label="Geofences to add"
            searchPlaceholder="Search geofence..."
            groups={fenceGroups}
            selected={ticked}
            onChange={setTicked}
          />
        ) : (
          <span className="ui-muted">No geofences yet.</span>
        )}
        <span className="ui-muted" style={{ fontSize: 12 }}>
          Ticked geofences are added to every vehicle; the ones they have stay.
        </span>
      </FormSection>
      <FormSection id="fuel" title="Fuel" icon="fuel">
        {lookupField('fuel_type', 'fuelType', 'Type of Fuel', 'Select fuel type...')}
        {field('tank', 'Fuel Tank Capacity (Litre)', 'number')}
        {field('mileage', 'Mileage (km/L)', 'number')}
        {field('oil', 'Oil Capacity (Litre)', 'number')}
        {field('cost', 'Cost/Liter', 'number')}
        {field('maxFuel', 'Max Fuel Level (Ltr)', 'number')}
        {field('calibration', 'Fuel Calibration Value')}
      </FormSection>
      {adding && (
        <AddLookupModal
          kind={adding}
          parent={adding === 'model' ? f.make || null : null}
          existing={lookups.rows}
          onClose={() => setAdding(null)}
          onAdded={(v) => {
            const key: Partial<Record<LookupKind, keyof Form>> = {
              category: 'category',
              vehicle_type: 'vehicleType',
              color: 'color',
              make: 'make',
              model: 'model',
              fuel_type: 'fuelType',
            };
            const k = key[adding];
            if (k) setF((p) => ({ ...p, [k]: v }));
          }}
        />
      )}
    </Drawer>
  );
}
