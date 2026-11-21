// Add / Edit Vehicle: approved GPS Platform design 07-01 (D:/Project/GPS_Platform/approved_degin).
// A vehicle is a core asset (type Vehicle): call sign = name, plate number = plate_serial, group,
// site and status stay in core.assets. Everything else goes to proto_vehicle (vehicle_details,
// vehicle_io, geofences). Fitting the tracker updates core.device_units, as Installation does.
// "Add Vehicle" / "Save" writes everything in one transaction; Neon's error shows if it fails.
import { useMemo, useState } from 'react';
import {
  Button,
  CheckboxField,
  DateField,
  Drawer,
  FieldAction,
  FileField,
  FormSection,
  FormSubhead,
  FullRow,
  GeofenceMap,
  IconButton,
  Loading,
  Note,
  SelectField,
  Stack,
  TextField,
  type SelectOption,
} from '@iotify/ui';
import {
  useAssets,
  useCompanies,
  useDeviceModels,
  useDeviceUnits,
  useGeofences,
  useRoles,
  useSaveBatch,
  useSites,
  useUsers,
  useVehicleDetails,
  useVehicleGeofences,
  useVehicleIo,
  type AssetsRow,
  type Batch,
  type VehicleDetailsRow,
  type VehicleIoRow,
} from '@iotify/data';
import { AddLookupModal, nextIds, num, txt, useLookupOptions, type LookupKind } from './shared';

/** Core asset type of vehicles. */
export const VEHICLE_TYPE = 'AT1';

const STEPS = [
  { key: 'general', label: 'General Info' },
  { key: 'assign', label: 'Assignment' },
  { key: 'map', label: 'Map & Geofence' },
  { key: 'fuel', label: 'Fuel' },
  { key: 'tracking', label: 'Tracking' },
];
const OWNERSHIP = ['Owned', 'Leased', 'Rented', 'Hired'];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR + 2 - 1990 }, (_, i) => String(THIS_YEAR + 1 - i));
const PORTS = Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
const opts = (list: string[]): SelectOption[] => list.map((v) => ({ value: v, label: v }));

type IoKind = VehicleIoRow['kind'];
/** What can be wired to each kind of tracker input/output. */
const SIGNALS: Record<IoKind, string[]> = {
  'Digital input': ['Engine', 'Reverse', 'Door', 'Panic button', 'AC', 'Seat belt'],
  'Digital output': ['Immobilizer', 'Buzzer', 'Door lock'],
  Analog: ['Fuel level', 'Temperature', 'Battery voltage', 'Load'],
  '1-Wire': ['Temperature sensor', 'Driver ID (iButton)'],
  Bluetooth: ['Temperature', 'Humidity', 'Door', 'Tyre pressure'],
  RS232: ['Fuel sensor', 'Camera', 'RFID reader'],
  RS485: ['Fuel sensor', 'Load sensor', 'CAN adapter'],
};
const ANALOG_TYPES = ['Voltage', 'Current'];

interface Io {
  id?: string;
  kind: IoKind;
  port: string;
  signal: string;
  analogType: string;
  reverse: boolean;
  min: string;
  max: string;
}
const newIo = (kind: IoKind): Io => ({
  kind,
  port: '1',
  signal: '',
  analogType: '',
  reverse: false,
  min: '',
  max: '',
});
const IO_SECTIONS: { title: string; kinds: IoKind[]; more?: boolean }[] = [
  { title: 'Digital I/O', kinds: ['Digital input', 'Digital output'] },
  { title: 'Analog I/O', kinds: ['Analog'] },
  { title: '1-Wire', kinds: ['1-Wire'], more: true },
  { title: 'Bluetooth Sensor', kinds: ['Bluetooth'], more: true },
  { title: 'RS232', kinds: ['RS232'] },
  { title: 'RS485', kinds: ['RS485'] },
];
const startIo = (): Io[] => IO_SECTIONS.flatMap((s) => s.kinds.map(newIo));

/** Form values (text, as typed). */
function blank(company: string) {
  return {
    category: '',
    plate: '',
    callSign: '',
    vehicleType: '',
    opCode: '',
    vin: '',
    engine: '',
    color: '',
    make: '',
    model: '',
    status: 'Active',
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
    photo: '',
    docs: [] as string[],
    company,
    group: '',
    site: '',
    fleetManager: '',
    supervisor: '',
    operator: '',
    fuelType: '',
    tank: '',
    mileage: '',
    oil: '',
    cost: '',
    maxFuel: '',
    calibration: '',
    trackingType: '',
    deviceMaker: '',
    deviceModel: '',
    unit: '',
    debugging: '',
  };
}
type Form = ReturnType<typeof blank>;
const s = (v: unknown) => (v == null ? '' : String(v));

function fromRecord(
  a: AssetsRow,
  d: VehicleDetailsRow | undefined,
  unit: { id: string; device_model_id?: string | null } | undefined,
  maker: string,
): Form {
  return {
    ...blank(a.company_id ?? ''),
    category: s(d?.category),
    plate: s(a.plate_serial),
    callSign: s(a.name),
    vehicleType: s(d?.vehicle_type),
    opCode: s(d?.operation_code),
    vin: s(d?.vin),
    engine: s(d?.engine_no),
    color: s(d?.color),
    make: s(d?.make),
    model: s(d?.model),
    status: s(a.status) || 'Active',
    year: s(d?.year),
    odometer: s(d?.odometer_km),
    speed: s(d?.speed_limit_kmh),
    height: s(d?.height_cm),
    ownership: s(d?.ownership),
    branch: s(d?.branch),
    registration: s(d?.registration_date).slice(0, 10),
    insurance: s(d?.insurance_expiry).slice(0, 10),
    fc: s(d?.fc_expiry).slice(0, 10),
    permit: s(d?.permit_expiry).slice(0, 10),
    photo: s(d?.photo_name),
    docs: d?.document_names ?? [],
    group: s(a.asset_group),
    site: s(a.site_id),
    fleetManager: s(d?.fleet_manager_id),
    supervisor: s(d?.supervisor_id),
    operator: s(d?.operator_name),
    fuelType: s(d?.fuel_type),
    tank: s(d?.tank_capacity_l),
    mileage: s(d?.mileage_km_l),
    oil: s(d?.oil_capacity_l),
    cost: s(d?.cost_per_l),
    maxFuel: s(d?.max_fuel_level_l),
    calibration: s(d?.fuel_calibration),
    trackingType: s(d?.tracking_type),
    deviceMaker: maker,
    deviceModel: s(unit?.device_model_id),
    unit: unit?.id ?? '',
    debugging: s(d?.debugging_mode),
  };
}

export interface AddVehicleDrawerProps {
  dealer: string;
  /** Pre-selected company (the list's company filter). */
  company?: string;
  /** Edit this vehicle instead of adding one. */
  asset?: AssetsRow;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

/** Waits for the vehicle's saved rows (edit), then shows the form. */
export function AddVehicleDrawer(props: AddVehicleDrawerProps) {
  const id = props.asset?.id;
  const details = useVehicleDetails(id ? { asset_id: id } : undefined, { enabled: !!id });
  const io = useVehicleIo(id ? { asset_id: id } : undefined, { enabled: !!id });
  const links = useVehicleGeofences(id ? { asset_id: id } : undefined, { enabled: !!id });
  const units = useDeviceUnits(id ? { asset_id: id } : undefined, { enabled: !!id });
  const models = useDeviceModels();
  if (id && (!details.data || !io.data || !links.data || !units.data || !models.data))
    return (
      <Drawer open onClose={props.onClose} title="Edit Vehicle" subtitle="Loading…" icon="edit">
        <Loading>Loading vehicle…</Loading>
      </Drawer>
    );
  const unit = units.data?.[0];
  const maker = models.data?.find((m) => m.id === unit?.device_model_id)?.maker ?? '';
  return (
    <VehicleForm
      {...props}
      initial={
        props.asset
          ? fromRecord(props.asset, details.data?.[0], unit, maker)
          : blank(props.company ?? '')
      }
      initialIo={
        io.data?.length
          ? io.data.map((r) => ({
              id: r.id,
              kind: r.kind,
              port: s(r.port_no) || '1',
              signal: s(r.signal),
              analogType: s(r.analog_type),
              reverse: !!r.reverse,
              min: s(r.min_value),
              max: s(r.max_value),
            }))
          : startIo()
      }
      initialFences={links.data?.map((l) => l.geofence_id) ?? []}
    />
  );
}

function VehicleForm({
  dealer,
  asset,
  onClose,
  onSaved,
  initial,
  initialIo,
  initialFences,
}: AddVehicleDrawerProps & {
  initial: Form;
  initialIo: Io[];
  initialFences: string[];
}) {
  const editing = !!asset;
  const companies = useCompanies({ dealer_id: dealer }, { enabled: !!dealer });
  const allAssets = useAssets();
  const models = useDeviceModels();
  const units = useDeviceUnits({ owner_dealer_id: dealer });
  const roles = useRoles();
  const lookups = useLookupOptions();
  const save = useSaveBatch();
  const [f, setF] = useState<Form>(initial);
  const [io, setIo] = useState<Io[]>(initialIo);
  const [fences, setFences] = useState<string[]>(initialFences);
  const [newFence, setNewFence] = useState<{
    name: string;
    radius: string;
    lat?: number;
    lng?: number;
  } | null>(null);
  const [groupTyped, setGroupTyped] = useState(false);
  const [adding, setAdding] = useState<LookupKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Form) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const sites = useSites({ company_id: f.company || '__none' }, { enabled: !!f.company });
  const people = useUsers({ account_id: f.company || '__none' }, { enabled: !!f.company });
  const companyFences = useGeofences(
    { company_id: f.company || '__none' },
    { enabled: !!f.company },
  );
  // every io / geofence id (not just this vehicle's), so new ids never clash
  const ioAll = useVehicleIo();
  const fenceAll = useGeofences();
  const roleId = (n: string) => roles.data?.find((r) => r.name === n)?.id;
  const peopleIn = (role: string) =>
    (people.data ?? [])
      .filter((u) => u.role_id === roleId(role))
      .map((u) => ({ value: u.id, label: u.name ?? u.id }));
  const groups = useMemo(
    () =>
      [
        ...new Set(
          (allAssets.data ?? [])
            .filter((a) => a.company_id === f.company && a.asset_group)
            .map((a) => a.asset_group!),
        ),
      ].sort(),
    [allAssets.data, f.company],
  );

  // tracker: on-asset models, and free units of the dealer's stock (plus the fitted one)
  const trackers = (models.data ?? []).filter((m) => m.placement !== 'Site infrastructure');
  const makers = [...new Set(trackers.map((m) => m.maker ?? ''))].filter(Boolean).sort();
  const freeUnits = (units.data ?? []).filter(
    (u) =>
      u.device_model_id === f.deviceModel &&
      u.status !== 'Returned' &&
      (!u.asset_id || u.id === initial.unit) &&
      (!u.company_id || u.company_id === f.company),
  );

  const lookupField = (
    kind: LookupKind,
    key: keyof Form,
    label: string,
    extra: { required?: boolean; placeholder: string; parent?: string },
  ) => (
    <SelectField
      label={label}
      required={extra.required}
      action={<FieldAction onClick={() => setAdding(kind)}>Add</FieldAction>}
      value={f[key] as string}
      onChange={(v) => setF((p) => ({ ...p, [key]: v, ...(key === 'make' ? { model: '' } : {}) }))}
      placeholder={extra.placeholder}
      options={lookups.options(kind, extra.parent)}
    />
  );

  const submit = async () => {
    setError(null);
    const missing = [
      !f.category && 'Category',
      !f.plate.trim() && 'Plate Number',
      !f.callSign.trim() && 'Call Sign',
      !f.model && 'Model',
      !f.company && 'Company',
      !f.fuelType && 'Type of Fuel',
      !f.tank.trim() && 'Fuel Tank Capacity',
      !f.mileage.trim() && 'Mileage',
      !f.trackingType && 'Tracking Type',
      f.unit && !f.deviceModel && 'Device Model',
      newFence &&
        (!newFence.name.trim() || newFence.lat == null || !num(newFence.radius)) &&
        'new geofence (name, radius and a point on the map)',
    ].filter(Boolean);
    if (missing.length) return setError(`Fill in: ${missing.join(', ')}.`);
    const plate = f.plate.trim().toUpperCase();
    const dup = (allAssets.data ?? []).find(
      (a) => a.id !== asset?.id && (a.plate_serial ?? '').toUpperCase() === plate,
    );
    if (dup) return setError(`Plate number ${plate} is already used by ${dup.name ?? dup.id}.`);

    const id = asset?.id ?? nextIds('A', allAssets.data ?? [], 1)[0]!;
    const assetRow: Partial<AssetsRow> = {
      id,
      company_id: f.company,
      asset_type_id: asset?.asset_type_id ?? VEHICLE_TYPE,
      name: f.callSign.trim(),
      plate_serial: plate,
      asset_group: txt(f.group),
      site_id: txt(f.site),
      status: f.status as 'Active',
    };
    const details: Partial<VehicleDetailsRow> = {
      asset_id: id,
      category: txt(f.category),
      vehicle_type: txt(f.vehicleType),
      operation_code: txt(f.opCode),
      vin: txt(f.vin),
      engine_no: txt(f.engine),
      color: txt(f.color),
      make: txt(f.make),
      model: txt(f.model),
      year: num(f.year),
      odometer_km: num(f.odometer),
      speed_limit_kmh: num(f.speed),
      height_cm: num(f.height),
      ownership: (txt(f.ownership) as 'Owned' | null) ?? null,
      branch: txt(f.branch),
      registration_date: txt(f.registration),
      insurance_expiry: txt(f.insurance),
      fc_expiry: txt(f.fc),
      permit_expiry: txt(f.permit),
      photo_name: txt(f.photo),
      document_names: f.docs.length ? f.docs : null,
      fleet_manager_id: txt(f.fleetManager),
      supervisor_id: txt(f.supervisor),
      operator_name: txt(f.operator),
      fuel_type: txt(f.fuelType),
      tank_capacity_l: num(f.tank),
      mileage_km_l: num(f.mileage),
      oil_capacity_l: num(f.oil),
      cost_per_l: num(f.cost),
      max_fuel_level_l: num(f.maxFuel),
      fuel_calibration: txt(f.calibration),
      tracking_type: f.trackingType as 'Tracking',
      debugging_mode: (txt(f.debugging) as 'Off' | null) ?? null,
    };
    // I/O rows that have something wired; new ones get ids, removed ones are deleted
    const used = io.filter((r) => r.signal);
    const newIds = nextIds('IO', ioAll.data ?? [], used.filter((r) => !r.id).length);
    let n = 0;
    const ioRows = used.map((r) => ({
      id: r.id ?? newIds[n++]!,
      asset_id: id,
      kind: r.kind,
      port_no: num(r.port),
      signal: r.signal,
      analog_type: txt(r.analogType),
      reverse: r.kind.startsWith('Digital') ? r.reverse : null,
      min_value: num(r.min),
      max_value: num(r.max),
    }));
    const removedIo = initialIo.filter((r) => r.id && !ioRows.some((x) => x.id === r.id));

    const batch: Batch = {
      upserts: [
        { table: 'assets', rows: [assetRow] },
        { table: 'vehicle_details', rows: [details] },
      ],
      updates: [],
      deletes: [],
    };
    const chosen = [...fences];
    if (newFence && newFence.lat != null) {
      const gid = nextIds('GF', fenceAll.data ?? [], 1)[0]!;
      chosen.push(gid);
      batch.upserts!.push({
        table: 'geofences',
        rows: [
          {
            id: gid,
            company_id: f.company,
            name: newFence.name.trim(),
            shape: 'Circle',
            center_lat: newFence.lat,
            center_lng: newFence.lng,
            radius_m: num(newFence.radius),
          },
        ],
      });
    }
    const added = chosen.filter((g) => !initialFences.includes(g));
    const removed = initialFences.filter((g) => !chosen.includes(g));
    if (added.length)
      batch.upserts!.push({
        table: 'vehicle_geofences',
        rows: added.map((g) => ({ asset_id: id, geofence_id: g })),
      });
    if (ioRows.length) batch.upserts!.push({ table: 'vehicle_io', rows: ioRows });
    if (removed.length)
      batch.deletes!.push({
        table: 'vehicle_geofences',
        keys: removed.map((g) => ({ asset_id: id, geofence_id: g })),
      });
    if (removedIo.length)
      batch.deletes!.push({ table: 'vehicle_io', keys: removedIo.map((r) => ({ id: r.id! })) });
    // tracker: fit the chosen unit; take the old one back to stock
    if (initial.unit && initial.unit !== f.unit)
      batch.updates!.push({
        table: 'device_units',
        rows: [{ id: initial.unit, asset_id: null, status: 'In stock' }],
      });
    if (f.unit && f.unit !== initial.unit)
      batch.updates!.push({
        table: 'device_units',
        rows: [{ id: f.unit, asset_id: id, company_id: f.company, status: 'Installed' }],
      });
    try {
      await save.mutateAsync(batch);
      onSaved?.(id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const ioRow = (r: Io, i: number) => {
    const setR = (patch: Partial<Io>) =>
      setIo((p) => p.map((x, n) => (n === i ? { ...x, ...patch } : x)));
    const sameKind = io.filter((x) => x.kind === r.kind);
    const canRemove = sameKind.length > 1;
    const digital = r.kind.startsWith('Digital');
    const noun =
      r.kind === 'Digital output' ? 'Output' : r.kind === 'Digital input' ? 'Input' : r.kind;
    return (
      <div key={i} style={{ display: 'contents' }} data-io={r.kind}>
        {(r.kind === 'Digital input' ||
          r.kind === 'Digital output' ||
          r.kind === 'Analog' ||
          r.kind.startsWith('RS')) && (
          <SelectField
            label={
              r.kind === 'Analog'
                ? 'Analog No'
                : r.kind.startsWith('RS')
                  ? `${r.kind} No`
                  : `${noun} No`
            }
            value={r.port}
            onChange={(v) => setR({ port: v })}
            options={PORTS}
          />
        )}
        {r.kind === 'Analog' && (
          <SelectField
            label="Analog Type"
            value={r.analogType}
            onChange={(v) => setR({ analogType: v })}
            placeholder="Select analog type..."
            options={opts(ANALOG_TYPES)}
          />
        )}
        <SelectField
          label={
            r.kind === 'Analog'
              ? 'Analog Input'
              : r.kind === 'Bluetooth'
                ? 'Input'
                : r.kind === '1-Wire'
                  ? '1-Wire Input'
                  : r.kind.startsWith('RS')
                    ? `${r.kind} Input`
                    : r.kind === 'Digital output'
                      ? 'Digital Output'
                      : 'Digital Input'
          }
          value={r.signal}
          onChange={(v) => setR({ signal: v })}
          placeholder={`Select ${r.kind === 'Digital output' ? 'digital output' : 'input'}...`}
          options={opts(SIGNALS[r.kind])}
        />
        {digital && (
          <Stack align="flex-end" justify="space-between">
            <CheckboxField
              label={`Reverse ${noun.toLowerCase()} ${r.port}`}
              checked={r.reverse}
              onChange={(v) => setR({ reverse: v })}
            />
            {canRemove && (
              <IconButton
                icon="trash"
                label={`Remove ${r.kind.toLowerCase()} ${r.port}`}
                onClick={() => setIo((p) => p.filter((_, n) => n !== i))}
              />
            )}
          </Stack>
        )}
        {(r.kind === 'Analog' || r.kind === '1-Wire' || r.kind === 'Bluetooth') && (
          <>
            <TextField
              label={r.kind === 'Analog' ? 'Min (Act)' : r.kind === '1-Wire' ? 'Min °C' : 'Min'}
              type="number"
              value={r.min}
              onChange={(v) => setR({ min: v })}
              placeholder={r.kind === 'Analog' ? '' : '-20'}
            />
            <Stack align="flex-end" gap={6}>
              <div style={{ flex: 1 }}>
                <TextField
                  label={r.kind === 'Analog' ? 'Max (Act)' : r.kind === '1-Wire' ? 'Max °C' : 'Max'}
                  type="number"
                  value={r.max}
                  onChange={(v) => setR({ max: v })}
                  placeholder={r.kind === 'Analog' ? '' : '40'}
                />
              </div>
              {canRemove && (
                <IconButton
                  icon="trash"
                  label={`Remove ${r.kind} input`}
                  onClick={() => setIo((p) => p.filter((_, n) => n !== i))}
                />
              )}
            </Stack>
          </>
        )}
      </div>
    );
  };

  const fenceShapes = (companyFences.data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    shape: g.shape,
    lat: g.center_lat,
    lng: g.center_lng,
    radiusM: g.radius_m,
    points: Array.isArray(g.points) ? (g.points as [number, number][]) : null,
  }));

  return (
    <Drawer
      open
      onClose={onClose}
      title={editing ? 'Edit Vehicle' : 'Add Vehicle'}
      subtitle={
        editing
          ? `${asset!.name ?? asset!.id} · ${asset!.plate_serial ?? ''}`
          : 'Add and configure a vehicle'
      }
      icon={editing ? 'edit' : 'plus'}
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
              setF(initial);
              setIo(initialIo);
              setFences(initialFences);
              setNewFence(null);
              setError(null);
            }}
          >
            {editing ? 'Undo changes' : 'Reset'}
          </Button>
          <Button variant="primary" disabled={save.isPending} onClick={submit}>
            {save.isPending ? 'Saving…' : editing ? 'Save Vehicle' : 'Add Vehicle'}
          </Button>
        </>
      }
    >
      {/* ------------------------------------------------ General Info */}
      <FormSection id="general" title="General Information" icon="info">
        {lookupField('category', 'category', 'Category', {
          required: true,
          placeholder: 'Select…',
        })}
        <TextField
          label="Plate Number"
          required
          value={f.plate}
          onChange={set('plate')}
          placeholder="e.g. TN 09 BX 4412"
        />
        <TextField
          label="Call Sign"
          required
          value={f.callSign}
          onChange={set('callSign')}
          placeholder="e.g. SOUTH-04"
        />
        {lookupField('vehicle_type', 'vehicleType', 'Type', { placeholder: 'Select type...' })}
        <TextField
          label="Vehicle Operation Code"
          value={f.opCode}
          onChange={set('opCode')}
          placeholder="e.g. OPC-2049"
        />
        <TextField label="VIN / Chassis Number" value={f.vin} onChange={set('vin')} />
        <TextField label="Engine Number" value={f.engine} onChange={set('engine')} />
        {lookupField('color', 'color', 'Vehicle Color', { placeholder: 'Select color...' })}
        {lookupField('make', 'make', 'Make', { placeholder: 'Select make...' })}
        {lookupField('model', 'model', 'Model', {
          required: true,
          placeholder: f.make ? 'Select model...' : 'Select model (or a make first)...',
          parent: f.make,
        })}
        <SelectField
          label="Asset Status"
          value={f.status}
          onChange={set('status')}
          options={opts(['Active', 'Inactive'])}
        />
        <SelectField
          label="Year"
          value={f.year}
          onChange={set('year')}
          placeholder="Select year..."
          options={opts(YEARS)}
        />
        <TextField
          label="Odometer Value"
          type="number"
          value={f.odometer}
          onChange={set('odometer')}
          placeholder="km"
        />
        <TextField
          label="Speed Limit (km/h)"
          type="number"
          value={f.speed}
          onChange={set('speed')}
          placeholder="e.g. 80 (empty = 120)"
        />
        <TextField
          label="Height in cm"
          type="number"
          value={f.height}
          onChange={set('height')}
          placeholder="cm"
        />
        <SelectField
          label="Ownership"
          value={f.ownership}
          onChange={set('ownership')}
          placeholder="Select ownership..."
          options={opts(OWNERSHIP)}
        />
        <TextField label="Branch" value={f.branch} onChange={set('branch')} />
        <DateField
          label="Registration Date"
          value={f.registration}
          onChange={set('registration')}
        />
        <DateField label="Insurance Expiry Date" value={f.insurance} onChange={set('insurance')} />
        <DateField label="FC Expiry Date" value={f.fc} onChange={set('fc')} />
        <DateField label="Permit Expiry Date" value={f.permit} onChange={set('permit')} />
        <FileField
          label="Vehicle Photo"
          accept="image/*"
          onFiles={(files) => set('photo')(files[0]?.name ?? '')}
          hint={f.photo ? `Chosen: ${f.photo}` : 'Prototype: only the file name is saved.'}
        />
        <FullRow span={2}>
          <FileField
            label="Documents"
            multiple
            accept=".pdf,image/png,image/jpeg"
            onFiles={(files) =>
              setF((p) => ({ ...p, docs: [...new Set([...p.docs, ...files.map((x) => x.name)])] }))
            }
            hint="PDF, JPG or PNG · up to 20 MB per file. Prototype: only file names are saved."
          />
          <div className="ui-muted" style={{ fontSize: 12, marginTop: 6 }}>
            {f.docs.length ? (
              <Stack gap={6} wrap>
                {f.docs.map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant="ghost"
                    icon="close"
                    onClick={() => setF((p) => ({ ...p, docs: p.docs.filter((x) => x !== d) }))}
                  >
                    {d}
                  </Button>
                ))}
              </Stack>
            ) : (
              'No files attached yet'
            )}
          </div>
        </FullRow>
      </FormSection>

      {/* ------------------------------------------------ Assignment */}
      <FormSection id="assign" title="Assignment" icon="users">
        <SelectField
          label="Company"
          required
          value={f.company}
          onChange={(v) => {
            setF((p) => ({
              ...p,
              company: v,
              group: '',
              site: '',
              fleetManager: '',
              supervisor: '',
            }));
            setFences([]);
            setNewFence(null);
          }}
          readOnly={editing}
          hint={editing ? 'A vehicle stays with its company.' : undefined}
          placeholder="Select company..."
          options={(companies.data ?? []).map((c) => ({ value: c.id, label: c.name ?? c.id }))}
        />
        {groupTyped || !groups.length ? (
          <TextField
            label="Group"
            action={
              groups.length ? (
                <FieldAction onClick={() => setGroupTyped(false)}>Pick</FieldAction>
              ) : undefined
            }
            value={f.group}
            onChange={set('group')}
            placeholder="e.g. Riyadh"
            hint="Fleet roles see only their group"
          />
        ) : (
          <SelectField
            label="Group"
            action={
              <FieldAction
                onClick={() => {
                  setGroupTyped(true);
                  set('group')('');
                }}
              >
                Add
              </FieldAction>
            }
            value={f.group}
            onChange={set('group')}
            placeholder="Select group..."
            options={opts(groups)}
            hint="Fleet roles see only their group"
          />
        )}
        <SelectField
          label="Site / Depot"
          value={f.site}
          onChange={set('site')}
          placeholder={f.company ? 'Select site...' : 'Pick the company first'}
          options={(sites.data ?? []).map((x) => ({ value: x.id, label: x.name ?? x.id }))}
        />
        <SelectField
          label="Fleet Manager"
          value={f.fleetManager}
          onChange={set('fleetManager')}
          placeholder={
            peopleIn('Fleet Manager').length ? 'Select fleet manager...' : 'None in this company'
          }
          options={peopleIn('Fleet Manager')}
        />
        <SelectField
          label="Supervisor"
          value={f.supervisor}
          onChange={set('supervisor')}
          placeholder={
            peopleIn('Fleet Supervisor').length ? 'Select supervisor...' : 'None in this company'
          }
          options={peopleIn('Fleet Supervisor')}
        />
        <TextField
          label="Operator"
          value={f.operator}
          onChange={set('operator')}
          placeholder="Driver or operator name"
        />
      </FormSection>

      {/* ------------------------------------------------ Map & Geofence */}
      <FormSection
        id="map"
        title="Map & Geofence"
        icon="geofence"
        cols={1}
        actions={
          f.company && !newFence ? (
            <Button size="sm" icon="plus" onClick={() => setNewFence({ name: '', radius: '300' })}>
              New circle
            </Button>
          ) : undefined
        }
      >
        {!f.company ? (
          <Note tone="grey">
            Pick the company under Assignment first: geofences belong to a company.
          </Note>
        ) : (
          <>
            {newFence && (
              <Stack align="flex-end" wrap>
                <div style={{ flex: 2, minWidth: 160 }}>
                  <TextField
                    label="New geofence name"
                    required
                    value={newFence.name}
                    onChange={(v) => setNewFence((p) => p && { ...p, name: v })}
                    placeholder="e.g. West Depot"
                  />
                </div>
                <div style={{ flex: 1, minWidth: 110 }}>
                  <TextField
                    label="Radius (m)"
                    required
                    type="number"
                    value={newFence.radius}
                    onChange={(v) => setNewFence((p) => p && { ...p, radius: v })}
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={() => setNewFence(null)}>
                  Cancel
                </Button>
              </Stack>
            )}
            {newFence && (
              <span className="ui-muted" style={{ fontSize: 12 }}>
                {newFence.lat == null
                  ? 'Click the map to place the centre of the new circle.'
                  : `Centre ${newFence.lat}, ${newFence.lng}. Click again to move it.`}
              </span>
            )}
            <GeofenceMap
              fences={fenceShapes}
              selected={fences}
              onToggle={(g) =>
                setFences((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]))
              }
              onPick={
                newFence ? (lat, lng) => setNewFence((p) => p && { ...p, lat, lng }) : undefined
              }
              picked={
                newFence?.lat != null
                  ? {
                      lat: newFence.lat,
                      lng: newFence.lng!,
                      radiusM: num(newFence.radius) ?? undefined,
                    }
                  : null
              }
            />
          </>
        )}
      </FormSection>

      {/* ------------------------------------------------ Fuel */}
      <FormSection id="fuel" title="Fuel" icon="fuel">
        {lookupField('fuel_type', 'fuelType', 'Type of Fuel', {
          required: true,
          placeholder: 'Select fuel type...',
        })}
        <TextField
          label="Fuel Tank Capacity (Litre)"
          required
          type="number"
          value={f.tank}
          onChange={set('tank')}
          placeholder="0"
        />
        <TextField
          label="Mileage (km/L)"
          required
          type="number"
          value={f.mileage}
          onChange={set('mileage')}
          placeholder="0"
        />
        <TextField
          label="Oil Capacity (Litre)"
          type="number"
          value={f.oil}
          onChange={set('oil')}
          placeholder="0"
        />
        <TextField
          label="Cost/Liter"
          type="number"
          value={f.cost}
          onChange={set('cost')}
          placeholder="0.00"
        />
        <TextField
          label="Max Fuel Level (Ltr)"
          type="number"
          value={f.maxFuel}
          onChange={set('maxFuel')}
        />
        <TextField
          label="Fuel Calibration Value"
          value={f.calibration}
          onChange={set('calibration')}
        />
      </FormSection>

      {/* ------------------------------------------------ Tracking */}
      <FormSection id="tracking" title="Tracking Options" icon="signal">
        <SelectField
          label="Tracking Type"
          required
          value={f.trackingType}
          onChange={set('trackingType')}
          placeholder="Select tracking type..."
          options={[
            { value: 'Tracking', label: 'Tracking' },
            { value: 'Trailer', label: 'Add Trailer' },
          ]}
          hint={f.trackingType ? undefined : 'Pick a tracking type to configure the tracker.'}
        />
        {f.trackingType && (
          <>
            <FormSubhead>Device</FormSubhead>
            <SelectField
              label="Device Manufacturer"
              required
              value={f.deviceMaker}
              onChange={(v) => setF((p) => ({ ...p, deviceMaker: v, deviceModel: '', unit: '' }))}
              placeholder="Select device manufacturer..."
              options={opts(makers)}
            />
            <SelectField
              label="Device Model"
              required
              value={f.deviceModel}
              onChange={(v) => setF((p) => ({ ...p, deviceModel: v, unit: '' }))}
              placeholder="Select device model..."
              options={trackers
                .filter((m) => m.maker === f.deviceMaker)
                .map((m) => ({ value: m.id, label: m.model ?? m.id }))}
            />
            <SelectField
              label="IMEI No."
              value={f.unit}
              onChange={set('unit')}
              placeholder={
                !f.deviceModel
                  ? 'Pick the model first'
                  : freeUnits.length
                    ? 'Select IMEI no...'
                    : 'No free unit of this model in stock'
              }
              options={freeUnits.map((u) => ({ value: u.id, label: u.imei ?? u.id }))}
              hint="Units come from Stock → Devices (Add Device there)."
            />
            <SelectField
              label="Debugging Mode"
              value={f.debugging}
              onChange={set('debugging')}
              placeholder="Select debugging mode..."
              options={opts(['Off', 'On'])}
            />
            {IO_SECTIONS.map((sec) => (
              <div key={sec.title} style={{ display: 'contents' }}>
                <FormSubhead
                  actions={
                    sec.more || sec.kinds.length > 1 ? (
                      <Stack gap={6}>
                        {sec.kinds.map((k) => (
                          <Button
                            key={k}
                            size="sm"
                            variant="ghost"
                            icon="plus"
                            onClick={() => setIo((p) => [...p, newIo(k)])}
                          >
                            {sec.more ? 'Add More' : k === 'Digital input' ? 'Input' : 'Output'}
                          </Button>
                        ))}
                      </Stack>
                    ) : undefined
                  }
                >
                  {sec.title}
                </FormSubhead>
                {io.map((r, i) => (sec.kinds.includes(r.kind) ? ioRow(r, i) : null))}
              </div>
            ))}
            <FullRow>
              <span className="ui-muted" style={{ fontSize: 12 }}>
                Only inputs with something chosen are saved.
              </span>
            </FullRow>
          </>
        )}
      </FormSection>

      {adding && (
        <AddLookupModal
          kind={adding}
          parent={adding === 'model' ? f.make || null : null}
          existing={lookups.rows}
          onClose={() => setAdding(null)}
          onAdded={(v) => {
            const key: Record<LookupKind, keyof Form> = {
              category: 'category',
              vehicle_type: 'vehicleType',
              color: 'color',
              make: 'make',
              model: 'model',
              fuel_type: 'fuelType',
            };
            setF((p) => ({ ...p, [key[adding]]: v, ...(adding === 'make' ? { model: '' } : {}) }));
          }}
        />
      )}
    </Drawer>
  );
}
