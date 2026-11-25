// IT-0036. The custom parts of the Add / Edit Vehicle form (original `e8`, `CJ`, `YJ` with its
// tracker panes, fuel monitoring and calibration matrix, `OJ`): category details, the geofence
// picker with its map, and the Tracking Options tabs (tracker, dashcam, trailers).
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import L from 'leaflet';
import { Icon } from '../../smart-track/kit';
import { AddLink, Check, Fieldset, FormCols, Fx, Pill, Portal, Select } from '../ui';
import {
  MapControls,
  SHAPES,
  fitTo,
  useLeaflet,
  zoneComplete,
  zoneLayer,
  type ZoneGeometry,
  type ZoneShape,
} from '../map';
import { str, type FormContext, type ListItem } from '../form/types';
import { portsHint, portsOf, type PortCounts } from './deviceCatalogue';

/* ------------------------------------------------------------------ category details */

const CATEGORY_GROUP: Record<string, string> = {
  ...Object.fromEntries(
    [
      'SMALL_TRUCK_COVERED',
      'SMALL_TRUCK_UNCOVERED',
      'PICKUP_1_CABIN',
      'PICKUP_2_CABIN',
      'TANKER',
      'DUMPER_TRUCK',
      'HOOKLIFT',
      'CONCRETE_CARRIER',
      'CONCRETE_MIXER',
      'HEAVY_TRUCK',
      'CEMENT_BULKER',
      'FLATBED_TRUCK',
      'GARBAGE_COMPACTOR',
    ].map((k) => [k, 'Goods Carrier']),
  ),
  ...Object.fromEntries(['BUS', 'SMALL_BUS'].map((k) => [k, 'Staff Transport'])),
  ...Object.fromEntries(['AUTO', 'VAN'].map((k) => [k, 'Passenger'])),
  ...Object.fromEntries(
    [
      'STREET_SWEEPER',
      'TOWED_STREET_SWEEPER',
      'FIRE_RESCUE_TRUCK',
      'FORKLIFT',
      'BOBCAT',
      'LOADER',
      'ROAD_ROLLER_COMPACTOR',
      'CONCRETE_PUMP',
      'CRAWLER_EXCAVATOR',
    ].map((k) => [k, 'Service Vehicle']),
  ),
  ...Object.fromEntries(['BIKE', 'SCOOTY', 'VAN_DELIVERY'].map((k) => [k, 'Last Mile'])),
};
const CATEGORY_FIELDS: Record<string, { key: string; label: string; number?: boolean }[]> = {
  'Goods Carrier': [
    { key: 'loadCapacity', label: 'Load Capacity (Kg)', number: true },
    { key: 'bodyType', label: 'Body Type' },
  ],
  'Staff Transport': [
    { key: 'seatingCapacity', label: 'Seating Capacity', number: true },
    { key: 'routeName', label: 'Route Name' },
  ],
  Passenger: [
    { key: 'seatingCapacity', label: 'Seating Capacity', number: true },
    { key: 'permitType', label: 'Permit Type' },
  ],
  'Service Vehicle': [
    { key: 'serviceKitId', label: 'Service Kit Id' },
    { key: 'coverageArea', label: 'Coverage Area' },
  ],
  'Last Mile': [
    { key: 'parcelCapacity', label: 'Parcel Capacity', number: true },
    { key: 'deliveryZone', label: 'Delivery Zone' },
  ],
};
export const CATEGORY_DETAIL_KEYS = [
  ...new Set(
    Object.values(CATEGORY_FIELDS)
      .flat()
      .map((f) => f.key),
  ),
];

export function CategoryDetails({ values, set, can }: FormContext) {
  const group = CATEGORY_GROUP[str(values.category)];
  if (!group) return null;
  return (
    <div className="vc-cat">
      <h4>{group} details</h4>
      <FormCols cols={3}>
        {CATEGORY_FIELDS[group]!.map((f) => (
          <Fx key={f.key} label={f.label} id={`td-f-${f.key}`} field={f.key}>
            <input
              type={f.number ? 'number' : 'text'}
              min={f.number ? 0 : undefined}
              step={f.number ? 'any' : undefined}
              value={str(values[f.key])}
              onChange={(e) => set(f.key, e.target.value)}
              disabled={!can(f.key)}
            />
          </Fx>
        ))}
      </FormCols>
    </div>
  );
}

/* ------------------------------------------------------------------ geofence picker */

export interface ZoneItem extends ListItem {
  shape?: ZoneShape;
  geometry?: ZoneGeometry;
}

export function GeofencePicker({
  zones,
  value,
  onChange,
  onAdd,
}: {
  zones: ZoneItem[];
  value: string[];
  onChange: (v: string[]) => void;
  onAdd?: () => void;
}) {
  const [closed, setClosed] = useState<Set<string>>(
    () => new Set(SHAPES.slice(1).map((s) => s.id)),
  );
  const el = useRef<HTMLDivElement>(null);
  const { map, ready } = useLeaflet(el);
  const drawn = useRef<L.FeatureGroup | null>(null);
  const picked = zones.filter((z) => value.includes(z.id));
  const sig = value.join(',');
  useEffect(() => {
    const m = map.current;
    drawn.current?.remove();
    drawn.current = null;
    if (!ready || !m || !picked.length) return;
    const g = L.featureGroup();
    picked.forEach(
      (z) =>
        z.shape && zoneComplete(z.shape, z.geometry) && zoneLayer(z.shape, z.geometry).addTo(g),
    );
    drawn.current = g.addTo(m);
    const b = g.getBounds();
    if (b.isValid()) m.fitBounds(b.pad(0.35), { maxZoom: 16, animate: false });
  }, [ready, sig, zones]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className="td-gpick">
      <Fx label="Geofence" group extra={onAdd && <AddLink name="Geofence" onOpen={onAdd} />}>
        <div className="td-gpick__list">
          {SHAPES.map((s) => {
            const list = zones.filter((z) => z.shape === s.id);
            const open = !closed.has(s.id);
            return (
              <div key={s.id} className="td-gpick__group">
                <button
                  type="button"
                  className="td-gpick__head"
                  aria-expanded={open}
                  onClick={() =>
                    setClosed((c) => {
                      const n = new Set(c);
                      if (n.has(s.id)) n.delete(s.id);
                      else n.add(s.id);
                      return n;
                    })
                  }
                >
                  <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={13} />
                  <span>{s.label}</span>
                  <em>{list.length}</em>
                </button>
                {open &&
                  list.map((z) => (
                    <Check
                      key={z.id}
                      className="td-gpick__item"
                      checked={value.includes(z.id)}
                      onChange={() => toggle(z.id)}
                    >
                      {z.label}
                    </Check>
                  ))}
              </div>
            );
          })}
        </div>
      </Fx>
      <Fx label="Fence Map Area" group>
        <div className="td-gpick__map">
          <div ref={el} className="td-gpick__leaflet" />
          <MapControls map={map} fit={() => map.current && fitTo(map.current, drawn.current)} />
          {!picked.length && (
            <div className="td-gpick__empty">
              <strong>No geofence selected</strong>
              <span>Tick a fence on the left to draw it here</span>
            </div>
          )}
        </div>
      </Fx>
    </div>
  );
}

/* ------------------------------------------------------------------ tracking options */

const DIGITAL_IN = ['Engine', 'Panic Button', 'Door Sensor', 'Seatbelt', 'A/C'];
const DIGITAL_OUT = ['Immobilizer / Engine Cut-off', 'Buzzer', 'LED Indicator'];
const FUEL_ANALOG = 'Fuel Level Sensor (analog)';
const ANALOG_TYPES = [FUEL_ANALOG, 'Load / Weight Sensor (analog)'];
const ANALOG_UNITS = ['V', 'mA', 'Ω', 'L', '°C', 'Kg', '%'];
const ONE_WIRE = ['Temperature Sensor', 'iButton (Driver ID)', 'RFID Reader'];
const BLUETOOTH = ['Fuel Level Sensor', 'Temperature / Humidity'];
const SERIAL: Record<'rs232' | 'rs485', string[]> = {
  rs232: ['RFID Reader (serial)', 'Camera'],
  rs485: ['Fuel Level Sensor (LLS)'],
};
const DEBUG = ['Enabled', 'Disabled'];
const DASHCAMS: Record<string, string[]> = {
  Streamax: ['C6 Lite'],
  Howen: ['Hero-ME31'],
  Jimi: ['JC400'],
};
const CHANNELS = ['2', '4', '8'];
const FUEL_SENSORS: Record<string, string[]> = {
  Teltonika: ['Capacitive Fuel Probe (Analog)', 'Capacitive Fuel Probe (RS-485)'],
  Mechatronics: ['Eurosens Dominator', 'Eurosens Dominator BT', 'Eurosens Dominator Mini'],
};
const FUEL_FIELDS: { key: string; label: string; options?: string[]; unit?: string }[] = [
  {
    key: 'sensorType',
    label: 'Fuel Sensor Type',
    options: ['Ultrasonic', 'Capacitive', 'Float', 'OEM Sensor'],
  },
  { key: 'sensorId', label: 'Fuel Sensor ID' },
  {
    key: 'tankShape',
    label: 'Fuel Tank Shape / Type',
    options: [
      'Rectangle Tank',
      'Fuel Sensor',
      'Co-Efficient',
      'Oval Tank',
      'Vertical Cylinder',
      'Vertical Capsule',
      'Horizontal Cylinder',
      'Horizontal Capsule',
    ],
  },
  { key: 'levelThreshold', label: 'Fuel Level Threshold (%)', unit: '%' },
  { key: 'theftThreshold', label: 'Fuel Theft Detection Threshold (L)', unit: 'L' },
  { key: 'refuelThreshold', label: 'Refuelling Detection Threshold (L)', unit: 'L' },
  {
    key: 'consumptionSource',
    label: 'Fuel Consumption Source',
    options: ['Fuel Sensor', 'ECU / CAN Bus', 'Calculated from Mileage'],
  },
  {
    key: 'reportInterval',
    label: 'Fuel Level Reporting Interval',
    options: ['30 sec', '1 min', '5 min', '10 min', '30 min'],
  },
  {
    key: 'calibration',
    label: 'Fuel Sensor Calibration Status',
    options: ['Not Calibrated', 'In Progress', 'Calibrated'],
  },
];

export interface IoRow {
  sensor: string;
  reverse: boolean;
}
export interface AnalogRow {
  type: string;
  unit: string;
  min: string;
  max: string;
}
export interface RangeRow {
  input: string;
  min: string;
  max: string;
}
export interface TrackerConfig {
  make: string;
  model: string;
  debugMode: string;
  imei: string;
  digitalInputs: IoRow[];
  digitalOutputs: IoRow[];
  analog: AnalogRow[];
  fuelMonitoring: Record<string, unknown>;
  oneWire: RangeRow[];
  bluetooth: RangeRow[];
  rs232: string[];
  rs485: string[];
}
const io = (sensor = ''): IoRow => ({ sensor, reverse: false });
const analog = (): AnalogRow => ({ type: '', unit: '', min: '', max: '' });
const range = (): RangeRow => ({ input: '', min: '', max: '' });
export const emptyTracker = (): TrackerConfig => ({
  make: '',
  model: '',
  debugMode: '',
  imei: '',
  digitalInputs: [io('Engine')],
  digitalOutputs: [io()],
  analog: [analog()],
  fuelMonitoring: {},
  oneWire: [range()],
  bluetooth: [range()],
  rs232: [''],
  rs485: [''],
});
const listOf = <T,>(v: unknown, f: (x: Record<string, unknown>) => T): T[] =>
  Array.isArray(v) ? v.map((x) => f((x ?? {}) as Record<string, unknown>)) : [];
/** A tracker configuration from stored values (original `SA`). */
export function trackerFrom(v: Record<string, unknown>): TrackerConfig {
  const d = emptyTracker();
  const pick = <T,>(k: string, f: (x: Record<string, unknown>) => T, fb: T[]) => {
    const l = listOf(v[k], f);
    return l.length ? l : fb;
  };
  return {
    make: str(v.make),
    model: str(v.model),
    debugMode: str(v.debugMode),
    imei: str(v.imei),
    digitalInputs: pick(
      'digitalInputs',
      (x) => ({ sensor: str(x.sensor), reverse: !!x.reverse }),
      d.digitalInputs,
    ),
    digitalOutputs: pick(
      'digitalOutputs',
      (x) => ({ sensor: str(x.sensor), reverse: !!x.reverse }),
      d.digitalOutputs,
    ),
    analog: pick(
      'analog',
      (x) => ({ type: str(x.type), unit: str(x.unit), min: str(x.min), max: str(x.max) }),
      d.analog,
    ),
    fuelMonitoring:
      v.fuelMonitoring && typeof v.fuelMonitoring === 'object'
        ? (v.fuelMonitoring as Record<string, unknown>)
        : {},
    oneWire: pick(
      'oneWire',
      (x) => ({ input: str(x.input), min: str(x.min), max: str(x.max) }),
      d.oneWire,
    ),
    bluetooth: pick(
      'bluetooth',
      (x) => ({ input: str(x.input), min: str(x.min), max: str(x.max) }),
      d.bluetooth,
    ),
    rs232: Array.isArray(v.rs232) && v.rs232.length ? v.rs232.map(str) : d.rs232,
    rs485: Array.isArray(v.rs485) && v.rs485.length ? v.rs485.map(str) : d.rs485,
  };
}
const opts = (l: string[], current = '') =>
  [...(current && !l.includes(current) ? [current] : []), ...l].map((x) => ({
    value: x,
    label: x,
  }));
const positive = (v: unknown) => {
  const n = Number(v);
  return v !== '' && v != null && n > 0 ? n : null;
};

/** The calibration matrix check (original `GN`). */
function checkMatrix(rows: string[][], capacity: number | null) {
  const errors: string[] = [];
  const bad = new Set<string>();
  const pts = rows
    .map((r, i) => ({
      i,
      x: r[0] === '' ? null : Number(r[0]),
      y: r[1] === '' ? null : Number(r[1]),
    }))
    .filter((p): p is { i: number; x: number; y: number } => p.x !== null && p.y !== null);
  if (pts.length < 2) errors.push('Add at least 2 complete rows.');
  pts.forEach((p, k) => {
    const prev = pts[k - 1];
    if (prev && p.x <= prev.x) {
      bad.add(`${p.i}:0`);
      errors.push(`Row ${p.i + 1}: the reading must be higher than the row above.`);
    }
    if (prev && p.y <= prev.y) {
      bad.add(`${p.i}:1`);
      errors.push(`Row ${p.i + 1}: the litres must be higher than the row above.`);
    }
    if (capacity && p.y > capacity) {
      bad.add(`${p.i}:1`);
      errors.push(`Row ${p.i + 1}: ${p.y} L is more than the tank capacity (${capacity} L).`);
    }
  });
  return { ok: errors.length === 0, points: pts.length, errors: errors.slice(0, 4), bad };
}
const matrixOf = (v: unknown): string[][] =>
  Array.isArray(v)
    ? v
        .filter(Array.isArray)
        .map((r) => [r[0] == null ? '' : String(r[0]), r[1] == null ? '' : String(r[1])])
    : [];
/** The error shown when "Calibrated" is chosen without a valid matrix (original `p0`). */
export function calibrationError(fuel: Record<string, unknown>, capacity: number | null) {
  return fuel.calibration !== 'Calibrated' ||
    (fuel.calibrate === true && checkMatrix(matrixOf(fuel.matrix), capacity).ok)
    ? null
    : 'Fill the Fuel Calibration Matrix first: turn on Calibrate Fuel and add at least 2 valid rows.';
}

function Switch({
  on,
  onChange,
  label,
  showState = true,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  showState?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`ui-switch ${on ? 'is-on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="ui-switch__track">
        <span className="ui-switch__knob" />
      </span>
      {showState && <span>{on ? 'On' : 'Off'}</span>}
    </button>
  );
}

function Sub({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div className="vt-sub">
      <h4>
        <Icon name={icon} size={14} />
        {title}
      </h4>
      {children}
    </div>
  );
}
function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <Fx label={label}>
      <input className="vt-ro" value={value} readOnly tabIndex={-1} />
    </Fx>
  );
}
/** Row counts: the model's ports, else what is filled in (at least one) (original OD). */
function sizes(spec: PortCounts | undefined, cfg: TrackerConfig) {
  const n = (x: number) => Math.max(1, x);
  return {
    din: spec ? spec.din : n(cfg.digitalInputs.length),
    dout: spec ? spec.dout : n(cfg.digitalOutputs.length),
    ain: spec ? spec.ain : n(cfg.analog.length),
    oneWire: spec ? spec.oneWire : true,
    rs232: spec ? spec.rs232 : n(cfg.rs232.length),
    rs485: spec ? spec.rs485 : n(cfg.rs485.length),
  };
}
function resized(
  model: string,
  cfg: TrackerConfig,
  spec: PortCounts | undefined,
): Partial<TrackerConfig> {
  const s = sizes(spec, cfg);
  return {
    model,
    digitalInputs: fit(cfg.digitalInputs, s.din, () => io()),
    digitalOutputs: fit(cfg.digitalOutputs, s.dout, () => io()),
    analog: fit(cfg.analog, s.ain, analog),
    rs232: fit(cfg.rs232, s.rs232, () => ''),
    rs485: fit(cfg.rs485, s.rs485, () => ''),
    ...(s.oneWire ? {} : { oneWire: [range()] }),
  };
}
const fit = <T,>(rows: T[], n: number, make: () => T) =>
  rows.length >= n ? rows.slice(0, n) : [...rows, ...Array.from({ length: n - rows.length }, make)];

/** The device's model catalogue: makes and their models (from Neon device_models). */
export type Catalogue = Record<string, string[]>;

export function TrackingOptions(
  ctx: FormContext & { catalogue: Catalogue; unassign?: (deviceId: string) => Promise<void> },
) {
  const { values, set, lists, multi, catalogue } = ctx;
  const type = str(values.trackingType);
  const trailers = listOf(values.trailers, (t) => ({ ...trackerFrom(t), plate: str(t.plate) }));
  const dash = {
    make: '',
    model: '',
    channels: '',
    imei: '',
    ...(values.dashcam as Record<string, string> | undefined),
  };
  const tracking = type !== 'Dashcam';
  const dashcam = type === 'Dashcam' || type === 'Tracking + Dashcam';
  const [tab, setTab] = useState('tracking');
  const cfg = trackerFrom({
    ...values,
    make: values.trackerMake,
    model: values.trackerModel,
    imei: values.deviceImei,
  });
  const setCfg = (patch: Partial<TrackerConfig>) =>
    Object.entries(patch).forEach(([k, v]) =>
      set(k === 'make' ? 'trackerMake' : k === 'model' ? 'trackerModel' : k, v),
    );
  const setTrailer = (i: number, patch: Record<string, unknown>) =>
    set(
      'trailers',
      trailers.map((t, j) => (j === i ? { ...t, ...patch } : t)),
    );
  // A trailer's device fills its make / model and sizes its rows (original X / rT).
  const pickTrailerDevice = (i: number, id: string) => {
    const spec = id ? (lists.deviceSpecs ?? []).find((x) => x.id === id) : undefined;
    const t = trailers[i]!;
    setTrailer(
      i,
      spec
        ? {
            imei: id,
            make: spec.parent ?? '',
            ...resized(spec.label, t, portsOf(spec.parent ?? '', spec.label)),
          }
        : { imei: id },
    );
  };
  const addTrailer = () => {
    set('trailers', [...trailers, { ...emptyTracker(), plate: '' }]);
    setTab(`trailer-${trailers.length}`);
  };
  const removeTrailer = (i: number) => {
    set(
      'trailers',
      trailers.filter((_, j) => j !== i),
    );
    setTab('tracking');
  };
  const imei = str(values.deviceImei);
  const holders = lists.deviceHolders ?? [];
  const [freed, setFreed] = useState<string[]>([]);
  const heldElsewhere = holders.find(
    (h) => h.id === imei && h.parent !== str(values.vehicleId) && !freed.includes(h.id),
  );
  const before = useRef(imei);
  useEffect(() => {
    if (!heldElsewhere) before.current = imei;
  }, [heldElsewhere, imei]);
  // Picking a device fills the tracker make / model from it (original behaviour).
  const specs = lists.deviceSpecs ?? [];
  const lastImei = useRef(imei);
  useEffect(() => {
    if (heldElsewhere || imei === lastImei.current) return;
    const spec = specs.find((s) => s.id === imei);
    if (imei && !spec) return;
    lastImei.current = imei;
    if (spec)
      setCfg({
        make: spec.parent ?? '',
        ...resized(spec.label, cfg, portsOf(spec.parent ?? '', spec.label)),
      });
  }, [heldElsewhere, imei, specs]); // eslint-disable-line react-hooks/exhaustive-deps
  const devices = lists.devices ?? [];
  const taken = [imei, dash.imei, ...trailers.map((t) => t.imei)].filter(Boolean);
  const deviceOpts = (own: string) =>
    devices.map((d) => {
      const used =
        d.id !== own &&
        (taken.includes(d.id) ||
          !!d.usedBy ||
          holders.some((h) => h.id === d.id && !freed.includes(h.id)));
      return { value: d.id, label: `${d.label}${used ? ' (in use)' : ''}`, disabled: used };
    });
  const imeiPick = {
    value: imei,
    onChange: (v: string) => set('deviceImei', v),
    disabled: !ctx.can('deviceImei'),
    onAdd:
      ctx.can('deviceImei') && ctx.canNest('device')
        ? () => ctx.openNested('device', 'deviceImei')
        : undefined,
    options: devices.map((d) => {
      const used = d.id !== imei && (taken.includes(d.id) || !!d.usedBy);
      return { value: d.id, label: `${d.label}${used ? ' (in use)' : ''}`, disabled: used };
    }),
  };
  const tabs = [
    ...(tracking ? [{ id: 'tracking', label: 'Tracking', icon: 'Cpu' }] : []),
    ...(dashcam ? [{ id: 'dashcam', label: 'Dashcam', icon: 'Camera' }] : []),
    ...trailers.map((_, i) => ({
      id: `trailer-${i}`,
      label: `Trailer ${i + 1}`,
      icon: 'Truck',
      remove: () => removeTrailer(i) as void,
    })),
  ] as { id: string; label: string; icon: string; remove?: () => void }[];
  const active = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id;
  const trailerAt = active?.startsWith('trailer-') ? Number(active.slice(8)) : -1;
  return (
    <div className={type ? 'vt' : 'vt is-off'}>
      {!type && <p className="gp-hint">Pick a tracking type to configure the tracker.</p>}
      <Fieldset disabled={!type}>
        <div className="vt-tabs" role="tablist" aria-label="Tracking devices">
          {tabs.map((t) => (
            <span key={t.id} className={t.id === active ? 'vt-tab is-on' : 'vt-tab'}>
              <button
                type="button"
                role="tab"
                aria-selected={t.id === active}
                onClick={() => setTab(t.id)}
              >
                <Icon name={t.icon} size={14} />
                {t.label}
              </button>
              {t.remove && (
                <button
                  type="button"
                  className="vt-tab__x"
                  onClick={t.remove}
                  aria-label={`Remove ${t.label}`}
                >
                  <Icon name="X" size={11} />
                </button>
              )}
            </span>
          ))}
          {!multi && (
            <button type="button" className="vt-tabs__add" onClick={addTrailer}>
              <Icon name="Plus" size={12} />
              Add Trailer
            </button>
          )}
        </div>
        {active === 'tracking' && (
          <TrackerPane
            cfg={cfg}
            catalogue={catalogue}
            onChange={setCfg}
            tankCapacity={positive(values.fuelCapacity)}
            imei={multi ? undefined : imeiPick}
          />
        )}
        {active === 'dashcam' && (
          <DashcamPane
            value={dash}
            onChange={(p) => set('dashcam', { ...dash, ...p })}
            devices={multi ? undefined : deviceOpts(dash.imei)}
          />
        )}
        {trailerAt >= 0 && trailers[trailerAt] && (
          <TrackerPane
            key={trailerAt}
            cfg={trailers[trailerAt]!}
            catalogue={catalogue}
            onChange={(p) => setTrailer(trailerAt, p)}
            imei={{
              value: trailers[trailerAt]!.imei,
              options: deviceOpts(trailers[trailerAt]!.imei),
              onChange: (v) => pickTrailerDevice(trailerAt, v),
            }}
            head={
              <Sub title={`Trailer ${trailerAt + 1}`} icon="Truck">
                <FormCols cols={3}>
                  <Fx label="Trailer Plate Number" id={`vt-tr${trailerAt + 1}-plate`}>
                    <input
                      value={trailers[trailerAt]!.plate}
                      placeholder="e.g. TN 09 TR 1024"
                      onChange={(e) => setTrailer(trailerAt, { plate: e.target.value })}
                    />
                  </Fx>
                </FormCols>
              </Sub>
            }
          />
        )}
      </Fieldset>
      {heldElsewhere && (
        <InUseDialog
          plate={heldElsewhere.label}
          deviceId={heldElsewhere.id}
          onCancel={() => set('deviceImei', before.current)}
          onUnassigned={() => setFreed((f) => [...f, heldElsewhere.id])}
          unassign={ctx.unassign}
        />
      )}
    </div>
  );
}

function DashcamPane({
  value,
  onChange,
  devices,
}: {
  value: { make: string; model: string; channels: string; imei: string };
  onChange: (p: Partial<{ make: string; model: string; channels: string; imei: string }>) => void;
  devices?: { value: string; label: string; disabled?: boolean }[];
}) {
  const models = value.make ? (DASHCAMS[value.make] ?? []) : Object.values(DASHCAMS).flat();
  return (
    <Sub title="Dashcam Device" icon="Camera">
      <FormCols cols={3}>
        <Fx label="Device Manufacturer" id="vt-dc-make">
          <Select
            value={value.make}
            onChange={(v) =>
              onChange({ make: v, model: DASHCAMS[v]?.includes(value.model) ? value.model : '' })
            }
            options={opts(Object.keys(DASHCAMS), value.make)}
            placeholder="Select manufacturer..."
          />
        </Fx>
        <Fx label="Device Model" id="vt-dc-model">
          <Select
            value={value.model}
            onChange={(v) => onChange({ model: v })}
            options={opts(models, value.model)}
            placeholder="Select model..."
          />
        </Fx>
        <Fx label="Channels" id="vt-dc-ch">
          <Select
            value={value.channels}
            onChange={(v) => onChange({ channels: v })}
            options={opts(CHANNELS, value.channels)}
            placeholder="Select channels..."
          />
        </Fx>
        {devices && (
          <Fx label="IMEI No." id="vt-dc-imei">
            <Select
              value={value.imei}
              onChange={(v) => onChange({ imei: v })}
              options={devices}
              placeholder="Select IMEI number..."
            />
          </Fx>
        )}
      </FormCols>
    </Sub>
  );
}

function TrackerPane({
  cfg,
  catalogue,
  onChange,
  head,
  tankCapacity,
  imei,
}: {
  cfg: TrackerConfig;
  catalogue: Catalogue;
  onChange: (p: Partial<TrackerConfig>) => void;
  head?: ReactNode;
  tankCapacity?: number | null;
  imei?: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string; disabled?: boolean }[];
    disabled?: boolean;
    onAdd?: () => void;
  };
}) {
  const spec = portsOf(cfg.make, cfg.model);
  const size = sizes(spec, cfg);
  const din = fit(cfg.digitalInputs, size.din, () => io());
  const dout = fit(cfg.digitalOutputs, size.dout, () => io());
  const ain = fit(cfg.analog, size.ain, analog);
  const rs232 = fit(cfg.rs232, size.rs232, () => '');
  const rs485 = fit(cfg.rs485, size.rs485, () => '');
  // Picking a model sizes the rows to its ports (original v0).
  const pickModel = (model: string) => onChange(resized(model, cfg, portsOf(cfg.make, model)));
  const models = cfg.make
    ? (catalogue[cfg.make] ?? [])
    : [...new Set(Object.values(catalogue).flat())];
  const badRange = ain.some((a) => a.min !== '' && a.max !== '' && Number(a.min) >= Number(a.max));
  return (
    <div className="vt-pane">
      {head}
      <Sub title="Device" icon="Cpu">
        <FormCols cols={3}>
          <Fx label="Device Manufacturer" id="vt-make" required>
            <Select
              value={cfg.make}
              onChange={(v) =>
                onChange(
                  catalogue[v]?.includes(cfg.model)
                    ? { make: v }
                    : { make: v, ...resized('', cfg, undefined) },
                )
              }
              options={opts(Object.keys(catalogue), cfg.make)}
              placeholder="Select device manufacturer..."
            />
          </Fx>
          <Fx label="Device Model" id="vt-model" required hint={portsHint(spec)}>
            <Select
              value={cfg.model}
              onChange={pickModel}
              options={opts(models, cfg.model)}
              placeholder="Select device model..."
            />
          </Fx>
          {imei && (
            <Fx
              label="IMEI No."
              id="vt-imei"
              extra={imei.onAdd && <AddLink name="Device" onOpen={imei.onAdd} />}
            >
              <Select
                value={imei.value}
                onChange={imei.onChange}
                options={imei.options}
                disabled={imei.disabled}
                placeholder="Select IMEI no..."
              />
            </Fx>
          )}
          <Fx label="Debugging Mode" id="vt-debug">
            <Select
              value={cfg.debugMode}
              onChange={(v) => onChange({ debugMode: v })}
              options={opts(DEBUG, cfg.debugMode)}
              placeholder="Select debugging mode..."
            />
          </Fx>
        </FormCols>
      </Sub>
      <Sub title="Digital I/O" icon="CircleDot">
        <DigitalRows
          label="Input"
          rows={din}
          list={DIGITAL_IN}
          exclusive
          onChange={(r) => onChange({ digitalInputs: r })}
        />
        <DigitalRows
          label="Output"
          rows={dout}
          list={DIGITAL_OUT}
          onChange={(r) => onChange({ digitalOutputs: r })}
        />
      </Sub>
      <Sub title="Analog I/O" icon="SlidersVertical">
        {ain.length === 0 && <p className="gp-hint">This device has no analog input.</p>}
        {ain.map((a, i) => {
          const up = (p: Partial<AnalogRow>) =>
            onChange({ analog: ain.map((x, j) => (j === i ? { ...x, ...p } : x)) });
          return (
            <div key={i}>
              <div className="vt-row vt-row--analog">
                <ReadOnly label="Analog No" value={`Analog ${i + 1}`} />
                <Fx label="Analog Type" id={`vt-an${i}-type`}>
                  <Select
                    value={a.type}
                    onChange={(v) => up({ type: v })}
                    options={opts(ANALOG_TYPES, a.type)}
                    placeholder="Select analog type..."
                  />
                </Fx>
                <Fx label="Analog Input" id={`vt-an${i}-unit`}>
                  <Select
                    value={a.unit}
                    onChange={(v) => up({ unit: v })}
                    options={opts(ANALOG_UNITS, a.unit)}
                    placeholder="Select analog input..."
                  />
                </Fx>
                <Fx label="Min (Act)" id={`vt-an${i}-min`}>
                  <input
                    type="number"
                    step="any"
                    value={a.min}
                    onChange={(e) => up({ min: e.target.value })}
                  />
                </Fx>
                <Fx label="Max (Act)" id={`vt-an${i}-max`}>
                  <input
                    type="number"
                    step="any"
                    value={a.max}
                    onChange={(e) => up({ max: e.target.value })}
                  />
                </Fx>
              </div>
              {a.type === FUEL_ANALOG && (
                <FuelMonitoring
                  value={cfg.fuelMonitoring}
                  unit={a.unit}
                  capacity={tankCapacity ?? null}
                  onChange={(f) => onChange({ fuelMonitoring: f })}
                />
              )}
            </div>
          );
        })}
        {badRange && <p className="td-fx__err">Min must be lower than Max.</p>}
      </Sub>
      {size.oneWire && (
        <Sub title="1-Wire" icon="CircleDot">
          <RangeRows
            rows={cfg.oneWire}
            list={ONE_WIRE}
            labels={['1-Wire Input', 'Min °C', 'Max °C']}
            onChange={(r) => onChange({ oneWire: r })}
          />
        </Sub>
      )}
      <Sub title="Bluetooth Sensor" icon="Satellite">
        <RangeRows
          rows={cfg.bluetooth}
          list={BLUETOOTH}
          labels={['Input', 'Min', 'Max']}
          onChange={(r) => onChange({ bluetooth: r })}
        />
      </Sub>
      {rs232.length > 0 && (
        <SerialRows
          name="RS232"
          rows={rs232}
          list={SERIAL.rs232}
          onChange={(r) => onChange({ rs232: r })}
        />
      )}
      {rs485.length > 0 && (
        <SerialRows
          name="RS485"
          rows={rs485}
          list={SERIAL.rs485}
          onChange={(r) => onChange({ rs485: r })}
        />
      )}
    </div>
  );
}

function DigitalRows({
  label,
  rows,
  list,
  exclusive,
  onChange,
}: {
  label: string;
  rows: IoRow[];
  list: string[];
  exclusive?: boolean;
  onChange: (r: IoRow[]) => void;
}) {
  return (
    <>
      <p className="vt-cap">Digital {label}</p>
      {rows.map((r, i) => {
        const others = exclusive ? rows.filter((_, j) => j !== i).map((x) => x.sensor) : [];
        const up = (p: Partial<IoRow>) =>
          onChange(rows.map((x, j) => (j === i ? { ...x, ...p } : x)));
        return (
          <div key={i} className="vt-row vt-row--io">
            <ReadOnly label={`${label} No`} value={`${label} ${i + 1}`} />
            <Fx label={`Digital ${label}`} id={`vt-d${label}${i}`}>
              <Select
                value={r.sensor}
                onChange={(v) => up({ sensor: v })}
                options={opts(
                  list.filter((x) => !others.includes(x)),
                  r.sensor,
                )}
                placeholder={`Select digital ${label.toLowerCase()}...`}
              />
            </Fx>
            <Fx label="Reverse" group>
              <span className={exclusive && r.sensor === 'Engine' ? 'vt-rev is-hidden' : 'vt-rev'}>
                <Check checked={r.reverse} onChange={(v) => up({ reverse: v })}>
                  <span className="vt-sr">
                    Reverse {label} {i + 1}
                  </span>
                </Check>
              </span>
            </Fx>
          </div>
        );
      })}
    </>
  );
}

function RangeRows({
  rows,
  list,
  labels,
  onChange,
}: {
  rows: RangeRow[];
  list: string[];
  labels: [string, string, string];
  onChange: (r: RangeRow[]) => void;
}) {
  const [a, b, c] = labels;
  return (
    <div className="vt-range">
      <div className="vt-range__rows">
        {rows.map((r, i) => {
          const up = (p: Partial<RangeRow>) =>
            onChange(rows.map((x, j) => (j === i ? { ...x, ...p } : x)));
          return (
            <div key={i} className="vt-row vt-row--range">
              <Fx label={a} id={`vt-${a}-${i}`}>
                <Select
                  value={r.input}
                  onChange={(v) => up({ input: v })}
                  options={opts(list, r.input)}
                  placeholder={`Select ${a.toLowerCase()}...`}
                />
              </Fx>
              <Fx label={b} id={`vt-${a}-${i}-min`}>
                <input
                  type="number"
                  step="any"
                  value={r.min}
                  placeholder="-20"
                  onChange={(e) => up({ min: e.target.value })}
                />
              </Fx>
              <Fx label={c} id={`vt-${a}-${i}-max`}>
                <input
                  type="number"
                  step="any"
                  value={r.max}
                  placeholder="40"
                  onChange={(e) => up({ max: e.target.value })}
                />
              </Fx>
              {i > 0 ? (
                <button
                  type="button"
                  className="vt-rm"
                  onClick={() => onChange(rows.filter((_, j) => j !== i))}
                  aria-label={`Delete ${a} row ${i + 1}`}
                >
                  <Icon name="Trash" size={14} />
                </button>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="td-btn td-btn--primary vt-addmore"
        onClick={() => onChange([...rows, range()])}
      >
        + Add More
      </button>
    </div>
  );
}

function SerialRows({
  name,
  rows,
  list,
  onChange,
}: {
  name: string;
  rows: string[];
  list: string[];
  onChange: (r: string[]) => void;
}) {
  return (
    <Sub title={name} icon="Cpu">
      {rows.map((r, i) => (
        <div key={i} className="vt-row vt-row--serial">
          <ReadOnly label={`${name} No`} value={`${name} ${i + 1}`} />
          <Fx label={`${name} Input`} id={`vt-${name}-${i}`}>
            <Select
              value={r}
              onChange={(v) => onChange(rows.map((x, j) => (j === i ? v : x)))}
              options={opts(list, r)}
              placeholder={`Select ${name} input...`}
            />
          </Fx>
        </div>
      ))}
    </Sub>
  );
}

function MatrixPill({ rows, capacity }: { rows: string[][]; capacity: number | null }) {
  const c = checkMatrix(rows, capacity);
  return (
    <Pill tone={c.ok ? 'green' : 'amber'}>
      {c.ok ? `${c.points} points · Valid` : 'Incomplete'}
    </Pill>
  );
}

function FuelMonitoring({
  value,
  unit,
  capacity,
  onChange,
}: {
  value: Record<string, unknown>;
  unit: string;
  capacity: number | null;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const [editing, setEditing] = useState<'first' | 'edit' | null>(null);
  const rows = matrixOf(value.matrix);
  const on = value.calibrate === true;
  const up = (p: Record<string, unknown>) => onChange({ ...value, ...p });
  const make = str(value.sensorMake);
  const model = str(value.sensorModel);
  const models = make ? (FUEL_SENSORS[make] ?? []) : [];
  const calErr = calibrationError(value, capacity);
  const field = (f: (typeof FUEL_FIELDS)[number]) => {
    const v = str(value[f.key]);
    return (
      <Fx
        key={f.key}
        label={f.label}
        id={`vt-fuel-${f.key}`}
        error={f.key === 'calibration' ? calErr : undefined}
      >
        {f.options ? (
          <Select
            value={v}
            onChange={(x) => up({ [f.key]: x })}
            options={opts(f.options, v)}
            placeholder="Select..."
          />
        ) : (
          <input
            type={f.unit ? 'number' : 'text'}
            step="any"
            min={f.unit ? 0 : undefined}
            value={v}
            placeholder={f.unit ?? 'e.g. FS-10234'}
            onChange={(e) => up({ [f.key]: e.target.value })}
          />
        )}
      </Fx>
    );
  };
  return (
    <div className="vt-fuel">
      <h4>
        <Icon name="Fuel" size={14} />
        Fuel Monitoring
      </h4>
      <FormCols cols={3}>
        {field(FUEL_FIELDS[0]!)}
        <Fx label="Device Manufacturer" id="vt-fuel-make">
          <Select
            value={make}
            options={opts(Object.keys(FUEL_SENSORS), make)}
            placeholder="Select device manufacturer..."
            onChange={(x) =>
              up({ sensorMake: x, sensorModel: FUEL_SENSORS[x]?.includes(model) ? model : '' })
            }
          />
        </Fx>
        <Fx label="Device Model" id="vt-fuel-model">
          <Select
            value={model}
            options={opts(models, model)}
            disabled={!make}
            placeholder={make ? 'Select device model...' : 'Select device manufacturer first'}
            onChange={(x) => up({ sensorModel: x })}
          />
        </Fx>
        {FUEL_FIELDS.slice(1).map(field)}
        <Fx label="Calibrate Fuel" group>
          <span className="vt-cal__sum">
            <Switch
              on={on}
              showState={false}
              label="Calibrate Fuel"
              onChange={(v) => {
                up({ calibrate: v });
                if (v) setEditing('first');
              }}
            />
            {on && <MatrixPill rows={rows} capacity={capacity} />}
            {on && (
              <button
                type="button"
                className="td-btn td-btn--primary vt-cal__edit"
                onClick={() => setEditing('edit')}
              >
                Edit Matrix
              </button>
            )}
          </span>
        </Fx>
      </FormCols>
      {editing && (
        <MatrixEditor
          rows={rows}
          capacity={capacity}
          unit={unit}
          onSave={(m) => {
            up({ matrix: m, calibrate: true });
            setEditing(null);
          }}
          onCancel={() => {
            if (editing === 'first' && !rows.some((r) => r[0] !== '' && r[1] !== ''))
              up({ calibrate: false });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

const blankMatrix = () => [
  ['', ''],
  ['', ''],
];
const decimal = (s: string) => s.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
const r1 = (n: number) => String(Math.round(n * 10) / 10);
function steps(empty: number, full: number, step: number, capacity: number | null) {
  if (!(full > empty)) throw new Error('Enter an Empty Reading lower than the Full Reading.');
  if (!capacity || !(capacity > 0))
    throw new Error('Enter the Fuel Tank Capacity (Litre) in the Fuel section first.');
  if (!(step > 0)) throw new Error('Enter a step above 0 litres.');
  if (capacity / step > 500)
    throw new Error('That step makes more than 500 rows. Use a larger step.');
  const out: string[][] = [];
  for (let l = 0; l < capacity - 1e-9; l += step)
    out.push([r1(empty + ((full - empty) * l) / capacity), r1(l)]);
  out.push([r1(full), r1(capacity)]);
  return out;
}

/** The Fuel Calibration Matrix pop-up (original `IJ`). */
function MatrixEditor({
  rows: start,
  capacity,
  unit,
  onSave,
  onCancel,
}: {
  rows: string[][];
  capacity: number | null;
  unit: string;
  onSave: (r: string[][]) => void;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState(() => (start.length ? start.map((r) => [...r]) : blankMatrix()));
  const [gen, setGen] = useState({
    open: false,
    empty: '',
    full: '',
    step: '10',
    error: null as string | null,
  });
  const body = useRef<HTMLDivElement>(null);
  const check = checkMatrix(rows, capacity);
  useEffect(() => {
    body.current?.querySelector('input')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [onCancel]);
  const cell = (i: number, c: number, v: string) =>
    setRows((rs) =>
      rs.map((r, j) => (j === i ? (c === 0 ? [decimal(v), r[1]!] : [r[0]!, decimal(v)]) : r)),
    );
  return (
    <Portal>
      <div className="td-modal">
        <div className="td-modal__scrim" onClick={onCancel} />
        <div
          className="td-modal__panel vt-cal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vt-cal-title"
          style={{ width: 'min(640px, 100%)' }}
        >
          <header className="gp-modal__head">
            <strong className="gp-modal__title" id="vt-cal-title">
              Fuel Calibration Matrix
            </strong>
            <MatrixPill rows={rows} capacity={capacity} />
            <button
              type="button"
              className="td-icon-btn td-icon-btn--sm td-modal__close"
              onClick={onCancel}
              aria-label="Close"
            >
              <Icon name="X" size={15} />
            </button>
          </header>
          <div className="td-modal__body" ref={body}>
            <p className="gp-hint">
              Fill the tank in steps from empty and enter the sensor reading at each step. The
              platform reads a value between two points on the straight line between them.
            </p>
            <table className="vt-cal__table">
              <thead>
                <tr>
                  <th aria-label="Row" />
                  <th>Sensor Reading{unit ? ` (${unit})` : ''}</th>
                  <th>Fuel (Litre)</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="vt-cal__n">{i + 1}</td>
                    {[0, 1].map((c) => (
                      <td key={c}>
                        <input
                          inputMode="decimal"
                          placeholder="0"
                          value={r[c]}
                          aria-label={`Row ${i + 1} ${c === 0 ? 'sensor reading' : 'litres'}`}
                          aria-invalid={check.bad.has(`${i}:${c}`)}
                          className={check.bad.has(`${i}:${c}`) ? 'vt-cal__bad' : undefined}
                          onChange={(e) => cell(i, c, e.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      <button
                        type="button"
                        className="vt-cal__del"
                        onClick={() =>
                          setRows((rs) =>
                            rs.length > 1 ? rs.filter((_, j) => j !== i) : blankMatrix(),
                          )
                        }
                        aria-label={`Remove row ${i + 1}`}
                      >
                        <Icon name="X" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="vt-cal__acts">
              <button
                type="button"
                className="td-btn td-btn--primary"
                onClick={() => setRows((rs) => [...rs, ['', '']])}
              >
                <Icon name="Plus" size={14} />
                Add Row
              </button>
              <button
                type="button"
                className="td-btn td-btn--ghost"
                aria-expanded={gen.open}
                onClick={() => setGen((g) => ({ ...g, open: !g.open, error: null }))}
              >
                Generate Steps
              </button>
              <button
                type="button"
                className="td-btn td-btn--ghost"
                onClick={() => setRows(blankMatrix())}
              >
                Clear
              </button>
            </div>
            {gen.open && (
              <div className="vt-cal__gen">
                <Fx label="Empty Reading" id="vt-cal-r0">
                  <input
                    inputMode="decimal"
                    placeholder="0"
                    value={gen.empty}
                    onChange={(e) => setGen((g) => ({ ...g, empty: decimal(e.target.value) }))}
                  />
                </Fx>
                <Fx label="Full Reading" id="vt-cal-r1">
                  <input
                    inputMode="decimal"
                    placeholder="0"
                    value={gen.full}
                    onChange={(e) => setGen((g) => ({ ...g, full: decimal(e.target.value) }))}
                  />
                </Fx>
                <Fx label="Step (Litre)" id="vt-cal-st">
                  <input
                    inputMode="decimal"
                    placeholder="10"
                    value={gen.step}
                    onChange={(e) => setGen((g) => ({ ...g, step: decimal(e.target.value) }))}
                  />
                </Fx>
                <button
                  type="button"
                  className="td-btn td-btn--primary"
                  onClick={() => {
                    try {
                      setRows(
                        steps(
                          Number(gen.empty),
                          Number(gen.full),
                          Number(gen.step) || 10,
                          capacity,
                        ),
                      );
                      setGen((g) => ({ ...g, open: false, error: null }));
                    } catch (e) {
                      setGen((g) => ({
                        ...g,
                        error: e instanceof Error ? e.message : 'Could not create the rows.',
                      }));
                    }
                  }}
                >
                  Create Rows
                </button>
                {gen.error && (
                  <p className="td-fx__err" role="alert">
                    {gen.error}
                  </p>
                )}
              </div>
            )}
            {!check.ok && (
              <p className="td-fx__err vt-cal__errs" role="status">
                {check.errors.map((e) => (
                  <span key={e}>{e}</span>
                ))}
              </p>
            )}
          </div>
          <footer className="gp-modal__foot">
            <button type="button" className="td-btn td-btn--ghost" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="td-btn td-btn--primary" onClick={() => onSave(rows)}>
              Save
            </button>
          </footer>
        </div>
      </div>
    </Portal>
  );
}

/** "IMEI already assigned" (original `OJ`): unassign the device from the other vehicle now. */
function InUseDialog({
  plate,
  deviceId,
  onCancel,
  onUnassigned,
  unassign,
}: {
  plate: string;
  deviceId: string;
  onCancel: () => void;
  onUnassigned: () => void;
  unassign?: (deviceId: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fields = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fields.current?.querySelector('input')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (!busy) onCancel();
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [busy, onCancel]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!password || !unassign) return;
    setBusy(true);
    setError(null);
    try {
      await unassign(deviceId);
      onUnassigned();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : 'The device could not be unassigned.');
    }
  };
  return (
    <Portal>
      <div className="td-confirm">
        <div className="td-confirm__scrim" onClick={() => !busy && onCancel()} />
        <form
          className="td-confirm__box vt-inuse"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="vt-inuse-title"
          onSubmit={(e) => void submit(e)}
          noValidate
        >
          <div className="td-confirm__head">
            <span className="vt-inuse__icon">
              <Icon name="TriangleAlert" size={18} />
            </span>
            <h2 id="vt-inuse-title">IMEI already assigned</h2>
          </div>
          <p>
            This IMEI is assigned to vehicle <b>{plate}</b>. Unassign it from that vehicle first, or
            enter your password to unassign it now.
          </p>
          <p className="vt-inuse__note">
            {plate} stops being tracked at once, even if you do not save this form.
          </p>
          <div ref={fields} className="vt-inuse__fields">
            <Fx label="Password" required>
              <span className="gp-pwd">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  disabled={busy}
                />
                <button
                  type="button"
                  className="gp-pwd__eye"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  title={show ? 'Hide password' : 'Show password'}
                  disabled={busy}
                >
                  <Icon name={show ? 'EyeOff' : 'Eye'} size={16} />
                </button>
              </span>
            </Fx>
          </div>
          {error && (
            <p className="td-confirm__error" role="alert">
              {error}
            </p>
          )}
          <div className="td-confirm__actions">
            <button
              type="button"
              className="td-btn td-btn--ghost"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
            <button type="submit" className="td-btn gp-btn-danger" disabled={busy || !password}>
              {busy ? 'Unassigning…' : 'Unassign'}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}

/* ------------------------------------------------------------------ additional devices (Device form) */

export interface ExtraDevice {
  id?: string;
  deviceName: string;
  imei: string;
  serialNo: string;
  simNo: string;
  manufacturer: string;
  model: string;
  purchaseDate: string;
  warrantyExpiry: string;
  extendedWarranty: string;
  expiryReminder: string;
  status: string;
}
export const PRIMARY = 'Primary Device';
export const SECONDARY = 'Secondary Device';
export const blankExtra = (): ExtraDevice => ({
  deviceName: '',
  imei: '',
  serialNo: '',
  simNo: '',
  manufacturer: '',
  model: '',
  purchaseDate: '',
  warrantyExpiry: '',
  extendedWarranty: '',
  expiryReminder: '',
  status: 'Active',
});
export const extrasOf = (v: unknown): ExtraDevice[] =>
  Array.isArray(v)
    ? v.map((x) => {
        const r = blankExtra() as unknown as Record<string, string>;
        const src = (x ?? {}) as Record<string, unknown>;
        Object.keys(r).forEach((k) => (r[k] = str(src[k]) || r[k]!));
        return (src.id ? { ...r, id: str(src.id) } : r) as unknown as ExtraDevice;
      })
    : [];
const imeiKey = (s: unknown) => str(s).replace(/\s/g, '').toUpperCase();
const IMEI_RE = /^[0-9A-Za-z]{8,20}$/;
/** Checks of the additional devices (original `mC`). */
export function extraErrors(
  values: Record<string, unknown>,
  list: ExtraDevice[],
  others: { id: string; imei: string; simId?: string }[] = [],
  ownId: string | null = null,
) {
  const elsewhere = (d: ExtraDevice) => others.filter((o) => o.id !== ownId && o.id !== d.id);
  return list.map((d, i) => {
    const e: Record<string, string> = {};
    const k = imeiKey(d.imei);
    if (!d.deviceName.trim()) e.deviceName = 'Device Name is required';
    if (!k) e.imei = 'IMEI No is required';
    else if (!IMEI_RE.test(k)) e.imei = 'IMEI No must be 8–20 letters or digits';
    else if (k === imeiKey(values.imei)) e.imei = 'IMEI No is the primary device’s';
    else if (list.some((x, j) => j < i && imeiKey(x.imei) === k))
      e.imei = 'IMEI No is on another additional device';
    else if (elsewhere(d).some((o) => imeiKey(o.imei) === k))
      e.imei = 'IMEI No is already another device';
    if (!d.manufacturer) e.manufacturer = 'Manufacturer Name is required';
    if (!d.model) e.model = 'Model is required';
    if (d.simNo) {
      if (d.simNo === str(values.simNo)) e.simNo = 'This SIM is in the primary device';
      else if (list.some((x, j) => j < i && x.simNo === d.simNo))
        e.simNo = 'This SIM is in another additional device';
      else if (elsewhere(d).some((o) => o.simId === d.simNo))
        e.simNo = 'This SIM is in another device';
    }
    return e;
  });
}
const REMINDERS = [
  { value: '1-weekbefore', label: '1 week before' },
  { value: '2-weekbefore', label: '2 weeks before' },
  { value: '1-monthbefore', label: '1 month before' },
  { value: '2-monthbefore', label: '2 months before' },
];

export function AdditionalDevices({ values, set, lists, can }: FormContext) {
  if (values.deviceType && values.deviceType !== PRIMARY) {
    const of = values.primaryImei
      ? ` It is an additional device of ${String(values.primaryImei)}.`
      : '';
    return <p className="gp-hint">Additional devices are added on a primary device.{of}</p>;
  }
  const list = extrasOf(values.additionalDevices);
  const off = !can('additionalDevices');
  const errs = extraErrors(values, list).map((e, i) =>
    Object.fromEntries(
      Object.entries(e).filter(([k]) => (list[i] as unknown as Record<string, string>)[k]),
    ),
  );
  const up = (i: number, p: Partial<ExtraDevice>) =>
    set(
      'additionalDevices',
      list.map((d, j) => (j === i ? { ...d, ...p } : d)),
    );
  const items = (k: string, f?: (x: ListItem) => boolean) =>
    (lists[k] ?? []).filter((x) => !f || f(x));
  return (
    <div className="iot-adddev">
      {list.map((d, i) => {
        const e = errs[i]!;
        const fid = (k: string) => `iot-adddev-${i}-${k}`;
        const text = (k: keyof ExtraDevice, label: string, ph: string, req?: boolean) => (
          <Fx label={label} id={fid(k)} required={req} error={e[k]}>
            <input
              value={d[k] ?? ''}
              placeholder={ph}
              onChange={(ev) => up(i, { [k]: ev.target.value })}
            />
          </Fx>
        );
        const date = (k: keyof ExtraDevice, label: string) => (
          <Fx label={label} id={fid(k)}>
            <input
              type="date"
              value={d[k] ?? ''}
              onChange={(ev) => up(i, { [k]: ev.target.value })}
            />
          </Fx>
        );
        const sims = items('sims').map((s) => ({
          value: s.id,
          label: s.usedBy && s.usedBy !== d.id ? `${s.label} (in use)` : s.label,
          disabled: !!s.usedBy && s.usedBy !== d.id,
        }));
        return (
          <fieldset key={d.id ?? `new-${i}`} className="iot-adddev__card" disabled={off}>
            <div className="iot-adddev__head">
              <b>{i + 1} - Secondary Device</b>
              <button
                type="button"
                className="td-link iot-adddev__rm"
                onClick={() =>
                  set(
                    'additionalDevices',
                    list.filter((_, j) => j !== i),
                  )
                }
              >
                <Icon name="Trash" size={13} />
                Remove
              </button>
            </div>
            <FormCols cols={3}>
              <Fx label="Device Type" id={fid('type')}>
                <input value="Secondary Device" readOnly tabIndex={-1} />
              </Fx>
              {text('deviceName', 'Device Name', 'e.g. Truck 12 Dashcam', true)}
              {text('imei', 'IMEI No', '8–20 letters or digits', true)}
              {text('serialNo', 'Serial Number', '—')}
              <Fx label="SIM Card Number" id={fid('simNo')} error={e.simNo}>
                <Select
                  value={d.simNo}
                  onChange={(v) => up(i, { simNo: v })}
                  options={sims}
                  placeholder="Select SIM number..."
                />
              </Fx>
              <Fx label="Manufacturer Name" id={fid('manufacturer')} required>
                <Select
                  value={d.manufacturer}
                  placeholder="Select manufacturer..."
                  options={items('manufacturers').map((x) => ({ value: x.id, label: x.label }))}
                  onChange={(v) =>
                    up(i, {
                      manufacturer: v,
                      model: items('deviceModels', (x) => x.parent === v && x.id === d.model).length
                        ? d.model
                        : '',
                    })
                  }
                />
              </Fx>
              <Fx label="Model" id={fid('model')} required>
                <Select
                  value={d.model}
                  disabled={!d.manufacturer}
                  placeholder={d.manufacturer ? 'Select model...' : 'Select manufacturer first'}
                  options={items('deviceModels', (x) => x.parent === d.manufacturer).map((x) => ({
                    value: x.id,
                    label: x.label,
                  }))}
                  onChange={(v) => up(i, { model: v })}
                />
              </Fx>
              {date('purchaseDate', 'Date of Purchase')}
              {date('warrantyExpiry', 'Warranty Expiry Date')}
              {date('extendedWarranty', 'Extended Warranty Date')}
              <Fx label="Expiry Reminder" id={fid('reminder')}>
                <Select
                  value={d.expiryReminder}
                  onChange={(v) => up(i, { expiryReminder: v })}
                  options={REMINDERS}
                  placeholder="Select reminder..."
                />
              </Fx>
              <Fx label="Status" group>
                <div
                  className="td-radios"
                  role="radiogroup"
                  aria-label={`Status of additional device ${i + 1}`}
                >
                  {['Active', 'Inactive'].map((s) => (
                    <label key={s}>
                      <input
                        type="radio"
                        name={fid('status')}
                        value={s}
                        checked={d.status === s}
                        onChange={() => up(i, { status: s })}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </Fx>
            </FormCols>
          </fieldset>
        );
      })}
      {!off && (
        <button
          type="button"
          className="td-btn td-btn--primary iot-adddev__add"
          onClick={() => set('additionalDevices', [...list, blankExtra()])}
        >
          <Icon name="Plus" size={14} />
          Add Device
        </button>
      )}
    </div>
  );
}
