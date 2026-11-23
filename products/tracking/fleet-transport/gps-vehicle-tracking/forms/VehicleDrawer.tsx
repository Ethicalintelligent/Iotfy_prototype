// Add / Edit Vehicle drawer of the approved design (Desktop/vs/Manage-Vehicle.html; first built
// for the Partner Portal from the GPS Platform design 07-01). One copy for both apps:
// - dealer use (`dealer`): pick one of the dealer's companies; trackers from the dealer's stock;
// - company use (`companyId`): the company is fixed; trackers are the company's own units.
// A vehicle is a core asset (type Vehicle): call sign = name, plate number = plate_serial, group,
// site and status stay in core.assets. Everything else goes to proto_vehicle (vehicle_details,
// vehicle_io, geofences, vehicle_geofences, asset_groups, operators). Fitting the tracker updates
// core.device_units, as Installation does. "Add Vehicle" / "Save" writes everything in one
// transaction; Neon's error shows if it fails.
import { useMemo, useState } from 'react';
import {
  Button,
  CheckTree,
  CheckboxField,
  DateField,
  Drawer,
  Field,
  FieldAction,
  FileField,
  FormSection,
  FormSubhead,
  FullRow,
  HueChip,
  IconButton,
  Loading,
  Modal,
  Note,
  SelectField,
  Stack,
  StreetMap,
  TextField,
  type MapFence,
  type SelectOption,
} from '@iotify/ui';
import {
  useAssetGroups,
  useAssets,
  useCompanies,
  useDeviceModels,
  useDeviceUnits,
  useGeofences,
  useOperators,
  useRoles,
  useSaveBatch,
  useSaveRecord,
  useSites,
  useUsers,
  useVehicleDetails,
  useVehicleGeofences,
  useVehicleIo,
  type AssetsRow,
  type Batch,
  type OperatorsRow,
  type VehicleDetailsRow,
  type VehicleIoRow,
} from '@iotify/data';
import {
  AddLookupModal,
  nextIds,
  num,
  str,
  txt,
  useLookupOptions,
  withCurrent,
  type LookupKind,
  type Owner,
} from './lookups';

/** Core asset type of vehicles. */
export const VEHICLE_TYPE = 'AT1';

const STEPS = [
  { key: 'general', label: 'General Info' },
  { key: 'assign', label: 'Assignment' },
  { key: 'map', label: 'Map & Geofence' },
  { key: 'fuel', label: 'Fuel' },
  { key: 'tracking', label: 'Tracking' },
];
export const OWNERSHIP = ['Owned', 'Leased', 'Rented', 'Hired'];
const THIS_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: THIS_YEAR + 2 - 1990 }, (_, i) =>
  String(THIS_YEAR + 1 - i),
);
const PORTS = Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
export const opts = (list: string[]): SelectOption[] => list.map((v) => ({ value: v, label: v }));
/** Geofence shapes in the design's list (Roadmap and Landmark have no fences yet). */
const FENCE_SHAPES = ['Circle', 'Freeform', 'Roadmap', 'Landmark'];

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

function fromRecord(
  a: AssetsRow,
  d: VehicleDetailsRow | undefined,
  unit: { id: string; device_model_id?: string | null } | undefined,
  maker: string,
): Form {
  return {
    ...blank(a.company_id ?? ''),
    category: str(d?.category),
    plate: str(a.plate_serial),
    callSign: str(a.name),
    vehicleType: str(d?.vehicle_type),
    opCode: str(d?.operation_code),
    vin: str(d?.vin),
    engine: str(d?.engine_no),
    color: str(d?.color),
    make: str(d?.make),
    model: str(d?.model),
    status: str(a.status) || 'Active',
    year: str(d?.year),
    odometer: str(d?.odometer_km),
    speed: str(d?.speed_limit_kmh),
    height: str(d?.height_cm),
    ownership: str(d?.ownership),
    branch: str(d?.branch),
    registration: str(d?.registration_date).slice(0, 10),
    insurance: str(d?.insurance_expiry).slice(0, 10),
    fc: str(d?.fc_expiry).slice(0, 10),
    permit: str(d?.permit_expiry).slice(0, 10),
    photo: str(d?.photo_name),
    docs: d?.document_names ?? [],
    group: str(a.asset_group),
    site: str(a.site_id),
    fleetManager: str(d?.fleet_manager_id),
    supervisor: str(d?.supervisor_id),
    operator: str(d?.operator_id),
    fuelType: str(d?.fuel_type),
    tank: str(d?.tank_capacity_l),
    mileage: str(d?.mileage_km_l),
    oil: str(d?.oil_capacity_l),
    cost: str(d?.cost_per_l),
    maxFuel: str(d?.max_fuel_level_l),
    calibration: str(d?.fuel_calibration),
    trackingType: str(d?.tracking_type),
    deviceMaker: maker,
    deviceModel: str(unit?.device_model_id),
    unit: unit?.id ?? '',
    debugging: str(d?.debugging_mode),
  };
}

export interface AddVehicleDrawerProps extends Owner {
  /** Dealer use: the pre-selected company (the list's company filter). */
  company?: string;
  /** Edit (or view) this vehicle instead of adding one. */
  asset?: AssetsRow;
  /** Open the vehicle read-only first, with an Edit button (Manage › Vehicle row click). */
  viewFirst?: boolean;
  /** View only: no Edit. */
  readOnly?: boolean;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

/** Waits for the vehicle's saved rows (edit), then shows the form. */
export function AddVehicleDrawer(props: AddVehicleDrawerProps) {
  const id = props.asset?.id;
  const on = { enabled: !!id };
  const details = useVehicleDetails(id ? { asset_id: id } : undefined, on);
  const io = useVehicleIo(id ? { asset_id: id } : undefined, on);
  const links = useVehicleGeofences(id ? { asset_id: id } : undefined, on);
  const units = useDeviceUnits(id ? { asset_id: id } : undefined, on);
  const models = useDeviceModels();
  if (id && (!details.data || !io.data || !links.data || !units.data || !models.data))
    return (
      <Drawer open onClose={props.onClose} title="Vehicle" subtitle="Loading…" icon="edit">
        <Loading>Loading vehicle…</Loading>
      </Drawer>
    );
  const unit = units.data?.[0];
  const maker = models.data?.find((m) => m.id === unit?.device_model_id)?.maker ?? '';
  const company = props.companyId ?? props.company ?? '';
  return (
    <VehicleForm
      {...props}
      initial={
        props.asset ? fromRecord(props.asset, details.data?.[0], unit, maker) : blank(company)
      }
      legacyOperator={
        details.data?.[0]?.operator_id ? null : (details.data?.[0]?.operator_name ?? null)
      }
      initialIo={
        io.data?.length
          ? io.data.map((r) => ({
              id: r.id,
              kind: r.kind,
              port: str(r.port_no) || '1',
              signal: str(r.signal),
              analogType: str(r.analog_type),
              reverse: !!r.reverse,
              min: str(r.min_value),
              max: str(r.max_value),
            }))
          : startIo()
      }
      initialFences={links.data?.map((l) => l.geofence_id) ?? []}
    />
  );
}

function VehicleForm({
  dealer,
  companyId,
  asset,
  viewFirst,
  readOnly,
  onClose,
  onSaved,
  initial,
  legacyOperator,
  initialIo,
  initialFences,
}: AddVehicleDrawerProps & {
  initial: Form;
  /** Operator typed as text before operators had their own list. */
  legacyOperator: string | null;
  initialIo: Io[];
  initialFences: string[];
}) {
  const editing = !!asset;
  const fixedCompany = !dealer && !!companyId;
  const [mode, setMode] = useState<'view' | 'edit'>(
    editing && (viewFirst || readOnly) ? 'view' : 'edit',
  );
  const ro = mode === 'view';
  const companies = useCompanies({ dealer_id: dealer ?? '__none' }, { enabled: !!dealer });
  const allAssets = useAssets();
  const models = useDeviceModels();
  const units = useDeviceUnits(
    dealer ? { owner_dealer_id: dealer } : { company_id: companyId ?? '__none' },
  );
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
  const [addingOperator, setAddingOperator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Form) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const forCompany = { enabled: !!f.company };
  const cid = f.company || '__none';
  const sites = useSites({ company_id: cid }, forCompany);
  const people = useUsers({ account_id: cid }, forCompany);
  const companyFences = useGeofences({ company_id: cid }, forCompany);
  const operators = useOperators({ company_id: cid }, forCompany);
  const groupRows = useAssetGroups({ company_id: cid }, forCompany);
  // every io / geofence / group / operator id (not just this company's), so new ids never clash
  const ioAll = useVehicleIo();
  const fenceAll = useGeofences();
  const groupAll = useAssetGroups();
  const operatorAll = useOperators();
  const roleId = (n: string) => roles.data?.find((r) => r.name === n)?.id;
  const peopleIn = (role: string) =>
    (people.data ?? [])
      .filter((u) => u.role_id === roleId(role))
      .map((u) => ({ value: u.id, label: u.name ?? u.id }));
  const groups = useMemo(
    () =>
      [
        ...new Set([
          ...(groupRows.data ?? []).map((g) => g.name),
          ...(allAssets.data ?? [])
            .filter((a) => a.company_id === f.company && a.asset_group)
            .map((a) => a.asset_group!),
        ]),
      ].sort(),
    [groupRows.data, allAssets.data, f.company],
  );
  const operatorOptions = (operators.data ?? [])
    .filter((o) => o.status !== 'Inactive' || o.id === f.operator)
    .map((o) => ({ value: o.id, label: o.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // tracker: on-asset models, and free units (dealer's stock or the company's), plus the fitted one
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
      readOnly={ro}
      action={ro ? undefined : <FieldAction onClick={() => setAdding(kind)}>Add</FieldAction>}
      value={f[key] as string}
      onChange={(v) => setF((p) => ({ ...p, [key]: v, ...(key === 'make' ? { model: '' } : {}) }))}
      placeholder={ro ? '—' : extra.placeholder}
      options={withCurrent(lookups.options(kind, extra.parent), f[key] as string)}
    />
  );

  const reset = () => {
    setF(initial);
    setIo(initialIo);
    setFences(initialFences);
    setNewFence(null);
    setGroupTyped(false);
    setError(null);
  };

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
    const group = txt(f.group);
    const assetRow: Partial<AssetsRow> = {
      id,
      company_id: f.company,
      asset_type_id: asset?.asset_type_id ?? VEHICLE_TYPE,
      name: f.callSign.trim(),
      plate_serial: plate,
      asset_group: group,
      site_id: txt(f.site),
      status: f.status as 'Active',
    };
    const operator = (operators.data ?? []).find((o) => o.id === f.operator);
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
      operator_id: txt(f.operator),
      // the name too, for screens that still read it; a typed name from before stays
      operator_name: operator?.name ?? (f.operator ? null : legacyOperator),
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

    const batch: Batch = { upserts: [], updates: [], deletes: [] };
    // a new group name becomes a group of the company (Groups screen)
    if (group && !(groupRows.data ?? []).some((g) => g.name === group))
      batch.upserts!.push({
        table: 'asset_groups',
        rows: [
          { id: nextIds('GRP', groupAll.data ?? [], 1)[0]!, company_id: f.company, name: group },
        ],
      });
    batch.upserts!.push(
      { table: 'assets', rows: [assetRow] },
      { table: 'vehicle_details', rows: [details] },
    );
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
    const canRemove = !ro && sameKind.length > 1;
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
            readOnly={ro}
            value={r.port}
            onChange={(v) => setR({ port: v })}
            options={PORTS}
          />
        )}
        {r.kind === 'Analog' && (
          <SelectField
            label="Analog Type"
            readOnly={ro}
            value={r.analogType}
            onChange={(v) => setR({ analogType: v })}
            placeholder={ro ? '—' : 'Select analog type...'}
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
          readOnly={ro}
          value={r.signal}
          onChange={(v) => setR({ signal: v })}
          placeholder={
            ro ? '—' : `Select ${r.kind === 'Digital output' ? 'digital output' : 'input'}...`
          }
          options={opts(SIGNALS[r.kind])}
        />
        {digital && (
          <Stack align="flex-end" justify="space-between">
            <CheckboxField
              label={`Reverse ${noun.toLowerCase()} ${r.port}`}
              readOnly={ro}
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
              readOnly={ro}
              value={r.min}
              onChange={(v) => setR({ min: v })}
              placeholder={ro ? '—' : r.kind === 'Analog' ? '' : '-20'}
            />
            <Stack align="flex-end" gap={6}>
              <div style={{ flex: 1 }}>
                <TextField
                  label={r.kind === 'Analog' ? 'Max (Act)' : r.kind === '1-Wire' ? 'Max °C' : 'Max'}
                  type="number"
                  readOnly={ro}
                  value={r.max}
                  onChange={(v) => setR({ max: v })}
                  placeholder={ro ? '—' : r.kind === 'Analog' ? '' : '40'}
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

  // ---- Map & Geofence: the company's fences by shape (list) and the ticked ones on the map
  const fenceRows = companyFences.data ?? [];
  const fenceGroups = FENCE_SHAPES.map((shape) => {
    const items = fenceRows
      .filter((g) => g.shape === shape)
      .map((g) => ({ key: g.id, label: g.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return { key: shape, label: `${shape} · ${items.length}`, items };
  }).filter((g) => g.items.length);
  const mapFences: MapFence[] = fenceRows
    .filter((g) => fences.includes(g.id))
    .map((g) => ({
      id: g.id,
      name: g.name,
      shape: g.shape === 'Circle' ? 'circle' : 'polygon',
      lat: g.center_lat != null ? Number(g.center_lat) : undefined,
      lng: g.center_lng != null ? Number(g.center_lng) : undefined,
      radiusM: g.radius_m != null ? Number(g.radius_m) : undefined,
      points: Array.isArray(g.points) ? (g.points as [number, number][]) : undefined,
      hue: 'green',
    }));
  if (newFence?.lat != null)
    mapFences.push({
      id: '__new',
      name: newFence.name.trim() || 'New geofence',
      shape: 'circle',
      lat: newFence.lat,
      lng: newFence.lng,
      radiusM: num(newFence.radius) ?? 300,
      hue: 'blue',
    });
  const fenceNames = fenceRows
    .filter((g) => fences.includes(g.id))
    .map((g) => g.name)
    .sort();

  const title = !editing ? 'Add Vehicle' : ro ? (asset!.name ?? asset!.id) : 'Edit Vehicle';
  const subtitle = !editing
    ? 'Add and configure a vehicle'
    : ro
      ? `${asset!.plate_serial ?? ''} · vehicle details`
      : `${asset!.name ?? asset!.id} · ${asset!.plate_serial ?? ''}`;

  return (
    <Drawer
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={editing ? (ro ? 'vehicles' : 'edit') : 'plus'}
      steps={STEPS}
      notice={
        error && (
          <Note tone="red" role="alert">
            {error}
          </Note>
        )
      }
      footer={
        ro ? (
          <>
            <Button onClick={onClose}>Close</Button>
            {!readOnly && (
              <Button variant="primary" icon="edit" onClick={() => setMode('edit')}>
                Edit Vehicle
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              onClick={() => {
                reset();
                if (editing && viewFirst) setMode('view');
              }}
            >
              {!editing ? 'Reset' : viewFirst ? 'Cancel' : 'Undo changes'}
            </Button>
            <Button variant="primary" disabled={save.isPending} onClick={submit}>
              {save.isPending ? 'Saving…' : editing ? 'Save Vehicle' : 'Add Vehicle'}
            </Button>
          </>
        )
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
          readOnly={ro}
          value={f.plate}
          onChange={set('plate')}
          placeholder={ro ? '—' : 'e.g. TN 09 BX 4412'}
        />
        <TextField
          label="Call Sign"
          required
          readOnly={ro}
          value={f.callSign}
          onChange={set('callSign')}
          placeholder={ro ? '—' : 'e.g. SOUTH-04'}
        />
        {lookupField('vehicle_type', 'vehicleType', 'Type', { placeholder: 'Select type...' })}
        <TextField
          label="Vehicle Operation Code"
          readOnly={ro}
          value={f.opCode}
          onChange={set('opCode')}
          placeholder={ro ? '—' : 'e.g. OPC-2049'}
        />
        <TextField label="VIN / Chassis Number" readOnly={ro} value={f.vin} onChange={set('vin')} />
        <TextField label="Engine Number" readOnly={ro} value={f.engine} onChange={set('engine')} />
        {lookupField('color', 'color', 'Vehicle Color', { placeholder: 'Select color...' })}
        {lookupField('make', 'make', 'Make', { placeholder: 'Select make...' })}
        {lookupField('model', 'model', 'Model', {
          required: true,
          placeholder: f.make ? 'Select model...' : 'Select model (or a make first)...',
          parent: f.make,
        })}
        <SelectField
          label="Asset Status"
          readOnly={ro}
          value={f.status}
          onChange={set('status')}
          options={opts(['Active', 'Inactive'])}
        />
        <SelectField
          label="Year"
          readOnly={ro}
          value={f.year}
          onChange={set('year')}
          placeholder={ro ? '—' : 'Select year...'}
          options={opts(YEARS)}
        />
        <TextField
          label="Odometer Value"
          type="number"
          readOnly={ro}
          value={f.odometer}
          onChange={set('odometer')}
          placeholder={ro ? '—' : 'km'}
        />
        <TextField
          label="Speed Limit (km/h)"
          type="number"
          readOnly={ro}
          value={f.speed}
          onChange={set('speed')}
          placeholder={ro ? '—' : 'e.g. 80 (empty = 120)'}
        />
        <TextField
          label="Height in cm"
          type="number"
          readOnly={ro}
          value={f.height}
          onChange={set('height')}
          placeholder={ro ? '—' : 'cm'}
        />
        <SelectField
          label="Ownership"
          readOnly={ro}
          value={f.ownership}
          onChange={set('ownership')}
          placeholder={ro ? '—' : 'Select ownership...'}
          options={opts(OWNERSHIP)}
        />
        <TextField label="Branch" readOnly={ro} value={f.branch} onChange={set('branch')} />
        <DateField
          label="Registration Date"
          readOnly={ro}
          value={f.registration}
          onChange={set('registration')}
        />
        <DateField
          label="Insurance Expiry Date"
          readOnly={ro}
          value={f.insurance}
          onChange={set('insurance')}
        />
        <DateField label="FC Expiry Date" readOnly={ro} value={f.fc} onChange={set('fc')} />
        <DateField
          label="Permit Expiry Date"
          readOnly={ro}
          value={f.permit}
          onChange={set('permit')}
        />
        <FileField
          label="Vehicle Photo"
          accept="image/*"
          readOnly={ro}
          current={f.photo}
          onFiles={(files) => set('photo')(files[0]?.name ?? '')}
          hint={
            ro
              ? undefined
              : f.photo
                ? `Chosen: ${f.photo}`
                : 'Prototype: only the file name is saved.'
          }
        />
        <FullRow span={2}>
          {ro ? (
            <TextField label="Documents" readOnly value={f.docs.join(', ') || '—'} />
          ) : (
            <>
              <FileField
                label="Documents"
                multiple
                accept=".pdf,image/png,image/jpeg"
                onFiles={(files) =>
                  setF((p) => ({
                    ...p,
                    docs: [...new Set([...p.docs, ...files.map((x) => x.name)])],
                  }))
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
            </>
          )}
        </FullRow>
      </FormSection>

      {/* ------------------------------------------------ Assignment */}
      <FormSection id="assign" title="Assignment" icon="users">
        {!fixedCompany && (
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
                operator: '',
              }));
              setFences([]);
              setNewFence(null);
            }}
            readOnly={editing || ro}
            hint={editing && !ro ? 'A vehicle stays with its company.' : undefined}
            placeholder={ro ? '—' : 'Select company...'}
            options={(companies.data ?? []).map((c) => ({ value: c.id, label: c.name ?? c.id }))}
          />
        )}
        <SelectField
          label="Fleet Manager"
          readOnly={ro}
          value={f.fleetManager}
          onChange={set('fleetManager')}
          placeholder={
            ro
              ? '—'
              : peopleIn('Fleet Manager').length
                ? 'Select fleet manager...'
                : 'None in this company'
          }
          options={peopleIn('Fleet Manager')}
        />
        {!ro && (groupTyped || !groups.length) ? (
          <TextField
            label="Group"
            action={
              groups.length ? (
                <FieldAction onClick={() => setGroupTyped(false)}>Pick</FieldAction>
              ) : undefined
            }
            value={f.group}
            onChange={set('group')}
            placeholder={ro ? '—' : 'e.g. Riyadh'}
            hint={
              groupTyped ? 'A new group is added to Groups.' : 'Fleet roles see only their group'
            }
          />
        ) : (
          <SelectField
            label="Group"
            readOnly={ro}
            action={
              ro ? undefined : (
                <FieldAction
                  onClick={() => {
                    setGroupTyped(true);
                    set('group')('');
                  }}
                >
                  Add
                </FieldAction>
              )
            }
            value={f.group}
            onChange={set('group')}
            placeholder={ro ? '—' : 'Select group...'}
            options={withCurrent(opts(groups), f.group)}
            hint={ro ? undefined : 'Fleet roles see only their group'}
          />
        )}
        <SelectField
          label="Supervisor"
          readOnly={ro}
          value={f.supervisor}
          onChange={set('supervisor')}
          placeholder={
            ro
              ? '—'
              : peopleIn('Fleet Supervisor').length
                ? 'Select supervisor...'
                : 'None in this company'
          }
          options={peopleIn('Fleet Supervisor')}
        />
        <SelectField
          label="Operator"
          readOnly={ro}
          action={
            ro || !f.company ? undefined : (
              <FieldAction onClick={() => setAddingOperator(true)}>Add</FieldAction>
            )
          }
          value={f.operator}
          onChange={set('operator')}
          placeholder={
            ro
              ? '—'
              : legacyOperator && !f.operator
                ? `${legacyOperator} (typed before; pick from the list)`
                : 'Select operator...'
          }
          options={operatorOptions}
        />
        {!fixedCompany && (
          <SelectField
            label="Site / Depot"
            readOnly={ro}
            value={f.site}
            onChange={set('site')}
            placeholder={ro ? '—' : f.company ? 'Select site...' : 'Pick the company first'}
            options={(sites.data ?? []).map((x) => ({ value: x.id, label: x.name ?? x.id }))}
          />
        )}
      </FormSection>

      {/* ------------------------------------------------ Map & Geofence */}
      <FormSection
        id="map"
        title="Map & Geofence"
        icon="geofence"
        cols={1}
        actions={
          f.company && !newFence && !ro ? (
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
                    placeholder={ro ? '—' : 'e.g. West Depot'}
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
                  : `Centre ${newFence.lat.toFixed(5)}, ${newFence.lng!.toFixed(5)}. Click again to move it.`}
              </span>
            )}
            <Stack wrap align="stretch" gap={16}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <Field label="Geofence">
                  {ro ? (
                    <span>{fenceNames.join(', ') || 'None'}</span>
                  ) : fenceGroups.length ? (
                    <CheckTree
                      label="Geofences"
                      searchPlaceholder="Search geofence..."
                      groups={fenceGroups}
                      selected={new Set(fences)}
                      onChange={(keys) => setFences([...keys])}
                    />
                  ) : (
                    <span className="ui-muted">No geofences yet. Add a new circle.</span>
                  )}
                </Field>
              </div>
              <div style={{ flex: '2 1 280px', minWidth: 0 }}>
                <Field label="Fence Map Area">
                  <StreetMap
                    label="Geofences of this vehicle"
                    fences={mapFences}
                    cluster={false}
                    height={260}
                    fitKey={`${fences.join(',')}|${newFence?.lat ?? ''}`}
                    onMapClick={
                      newFence
                        ? (lat, lng) =>
                            setNewFence(
                              (p) =>
                                p && {
                                  ...p,
                                  lat: Number(lat.toFixed(6)),
                                  lng: Number(lng.toFixed(6)),
                                },
                            )
                        : undefined
                    }
                    overlay={
                      !mapFences.length ? (
                        <HueChip hue="grey">
                          {ro ? 'No geofence' : 'No geofence selected · tick one on the left'}
                        </HueChip>
                      ) : undefined
                    }
                  />
                </Field>
              </div>
            </Stack>
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
          readOnly={ro}
          value={f.tank}
          onChange={set('tank')}
          placeholder={ro ? '—' : '0'}
        />
        <TextField
          label="Mileage (km/L)"
          required
          type="number"
          readOnly={ro}
          value={f.mileage}
          onChange={set('mileage')}
          placeholder={ro ? '—' : '0'}
        />
        <TextField
          label="Oil Capacity (Litre)"
          type="number"
          readOnly={ro}
          value={f.oil}
          onChange={set('oil')}
          placeholder={ro ? '—' : '0'}
        />
        <TextField
          label="Cost/Liter"
          type="number"
          readOnly={ro}
          value={f.cost}
          onChange={set('cost')}
          placeholder={ro ? '—' : '0.00'}
        />
        <TextField
          label="Max Fuel Level (Ltr)"
          type="number"
          readOnly={ro}
          value={f.maxFuel}
          onChange={set('maxFuel')}
        />
        <TextField
          label="Fuel Calibration Value"
          readOnly={ro}
          value={f.calibration}
          onChange={set('calibration')}
        />
      </FormSection>

      {/* ------------------------------------------------ Tracking */}
      <FormSection id="tracking" title="Tracking Options" icon="signal">
        <SelectField
          label="Tracking Type"
          required
          readOnly={ro}
          value={f.trackingType}
          onChange={set('trackingType')}
          placeholder={ro ? '—' : 'Select tracking type...'}
          options={[
            { value: 'Tracking', label: 'Tracking' },
            { value: 'Trailer', label: 'Add Trailer' },
          ]}
          hint={f.trackingType || ro ? undefined : 'Pick a tracking type to configure the tracker.'}
        />
        {f.trackingType && (
          <>
            <FormSubhead>Device</FormSubhead>
            <SelectField
              label="Device Manufacturer"
              required
              readOnly={ro}
              value={f.deviceMaker}
              onChange={(v) => setF((p) => ({ ...p, deviceMaker: v, deviceModel: '', unit: '' }))}
              placeholder={ro ? '—' : 'Select device manufacturer...'}
              options={opts(makers)}
            />
            <SelectField
              label="Device Model"
              required
              readOnly={ro}
              value={f.deviceModel}
              onChange={(v) => setF((p) => ({ ...p, deviceModel: v, unit: '' }))}
              placeholder={ro ? '—' : 'Select device model...'}
              options={trackers
                .filter((m) => m.maker === f.deviceMaker)
                .map((m) => ({ value: m.id, label: m.model ?? m.id }))}
            />
            <SelectField
              label="IMEI No."
              readOnly={ro}
              value={f.unit}
              onChange={set('unit')}
              placeholder={
                ro
                  ? '—'
                  : !f.deviceModel
                    ? 'Pick the model first'
                    : freeUnits.length
                      ? 'Select IMEI no...'
                      : 'No free unit of this model'
              }
              options={freeUnits.map((u) => ({ value: u.id, label: u.imei ?? u.id }))}
              hint={
                ro
                  ? undefined
                  : dealer
                    ? 'Units come from Stock → Devices (Add Device there).'
                    : 'Units come from Manage › Device (Add Device there).'
              }
            />
            <SelectField
              label="Debugging Mode"
              readOnly={ro}
              value={f.debugging}
              onChange={set('debugging')}
              placeholder={ro ? '—' : 'Select debugging mode...'}
              options={opts(['Off', 'On'])}
            />
            {IO_SECTIONS.map((sec) => {
              const rows = io
                .map((r, i) => [r, i] as const)
                .filter(([r]) => sec.kinds.includes(r.kind) && (!ro || r.signal));
              if (ro && !rows.length) return null;
              return (
                <div key={sec.title} style={{ display: 'contents' }}>
                  <FormSubhead
                    actions={
                      !ro && (sec.more || sec.kinds.length > 1) ? (
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
                  {rows.map(([r, i]) => ioRow(r, i))}
                </div>
              );
            })}
            <FullRow>
              <span className="ui-muted" style={{ fontSize: 12 }}>
                {ro
                  ? io.some((r) => r.signal)
                    ? 'Only wired inputs are shown.'
                    : 'No inputs wired.'
                  : 'Only inputs with something chosen are saved.'}
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
            // the vehicle's own lists (the SIM provider / plan lists belong to SIM cards)
            const key: Partial<Record<LookupKind, keyof Form>> = {
              category: 'category',
              vehicle_type: 'vehicleType',
              color: 'color',
              make: 'make',
              model: 'model',
              fuel_type: 'fuelType',
            };
            const k = key[adding];
            if (k) setF((p) => ({ ...p, [k]: v, ...(adding === 'make' ? { model: '' } : {}) }));
          }}
        />
      )}
      {addingOperator && (
        <AddOperatorModal
          company={f.company}
          existing={operatorAll.data ?? []}
          onClose={() => setAddingOperator(false)}
          onAdded={(id) => set('operator')(id)}
        />
      )}
    </Drawer>
  );
}

/** "+ Add" beside Operator: a new operator with a name (the rest in Manage › Operator). */
function AddOperatorModal({
  company,
  existing,
  onClose,
  onAdded,
}: {
  company: string;
  existing: OperatorsRow[];
  onClose: () => void;
  onAdded: (id: string) => void;
}) {
  const save = useSaveRecord();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const add = async () => {
    if (!name.trim()) return setError('Type the operator’s name.');
    const id = nextIds('OP', existing, 1)[0]!;
    try {
      await save.mutateAsync('operators', {
        id,
        company_id: company,
        name: name.trim(),
        contact_no: txt(phone),
        status: 'Active',
      });
      onAdded(id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Add operator"
      maxWidth={440}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={save.isPending} onClick={add}>
            {save.isPending ? 'Adding…' : 'Add'}
          </Button>
        </>
      }
    >
      <TextField label="Operator name" required value={name} onChange={setName} />
      <TextField label="Contact No" type="tel" value={phone} onChange={setPhone} />
      <Note tone="grey">Add licence and other details later under Manage › Operator.</Note>
      {error && (
        <Note tone="red" role="alert">
          {error}
        </Note>
      )}
    </Modal>
  );
}
