// IT-0036. Map View: statuses, vehicle categories, formatting and the demo position/telemetry
// generator, ported from the owner's page (Map-View.html, removed in IT-0037 (git history), the reference).
// Positions, speeds and sensor states are demo activity (root CLAUDE.md §8), generated for the
// real vehicles read from Neon.
// IT-0039 (bug sheet 23-11-2026, Map View #2/#3): each vehicle's status, speed, last report, GPS,
// GSM and battery come from the same demo record as Grid View (grid/demo.ts), so a vehicle shows
// the same status on both pages (e.g. Overspeed in Grid View is Overspeed here).
import { demoRecordFor, demoUpdatedAt } from '../grid/demo';
import { num, type DemoRecord, type Status as GridStatus } from '../grid/model';

/* ------------------------------------------------------------------ vehicles */

/** One vehicle as the page needs it (from core.assets + proto vehicle tables). */
export interface Vehicle {
  id: string;
  name: string;
  plateNo: string | null;
  make: string | null;
  model: string | null;
  category: string | null;
  group: string | null;
  hasDevice: boolean;
  speedLimitKmh: number | null;
  odometerKm: number | null;
  fleetManager: string;
  supervisor: string;
  operator: { name: string; tagId: string | null; phone: string | null } | null;
  /** Digital input signals configured on the vehicle (proto vehicle_io), e.g. "A/C". */
  digitalInputs: string[];
  /** The vehicle's place in Grid View's list (picks the same demo record when its plate has none). */
  demoIndex: number;
}

/* ------------------------------------------------------------------ vehicle images */

const IMAGES = import.meta.glob('./vehicles/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const img = (file: string) => IMAGES[`./vehicles/${file}`];

export interface Category {
  id: string;
  label: string;
  image: string | undefined;
}

const CATEGORIES: Category[] = (
  [
    ['FORKLIFT', 'ForkLifts', 'fork_lifts_img.png'],
    ['BUS', 'Bus', 'bus_img.png'],
    ['CAR', 'Car', 'car_img.png'],
    ['SMALL_TRUCK_COVERED', 'Small Truck Covered', 'small_truck_covered_img.png'],
    ['BIKE', 'Bike', 'bike_img.png'],
    ['AUTO', 'Auto', 'auto_img.png'],
    ['BOBCAT', 'Bobcat', 'bobcat_img.png'],
    ['PICKUP_1_CABIN', 'Pickup-1 cabin', 'pickup_1_cabin_img.png'],
    ['TANKER', 'Tanker', 'tanker_img.png'],
    ['LOADER', 'Loader', 'loader_img.png'],
    ['DUMPER_TRUCK', 'Dumper Truck', 'dumper_truck.png'],
    ['STREET_SWEEPER', 'Street Sweeper', 'street_sweeper_img.png'],
    ['TOWED_STREET_SWEEPER', 'Towed Street Sweeper', 'towed_street_sweeper_img.png'],
    ['ROAD_ROLLER_COMPACTOR', 'Road Roller Compactor', 'road_roller_compactor_img.png'],
    ['HOOKLIFT', 'Hooklift', 'hook_lift_img.png'],
    ['SMALL_TRUCK_UNCOVERED', 'Small Truck Uncovered', 'small_truck_uncovered_img.png'],
    ['PICKUP_2_CABIN', 'Pickup-2 cabin', 'pickup_2_cabin_img.png'],
    ['CONCRETE_CARRIER', 'Concrete Carrier', 'concrete_carrier_img.png'],
    ['CONCRETE_MIXER', 'Concrete Mixer', 'concrete_mixer_img.png'],
    ['GARBAGE_COMPACTOR', 'Garbage Compactor', 'garbage_compactor_img.png'],
    ['VAN', 'Van', 'van_img.png'],
    ['SMALL_BUS', 'Small bus', 'small_bus_img.png'],
    ['VAN_DELIVERY', 'Van Delivery', 'van_delivery_img.png'],
    ['SCOOTY', 'Scooty', 'scooty_img.png'],
    ['HEAVY_TRUCK', 'Heavy Truck', 'heavy_truck_img.png'],
    ['CONCRETE_PUMP', 'Concrete pumping equipment', 'concrete_pumping_equipment_img.png'],
    ['CEMENT_BULKER', 'Cement bulker', 'cement_bulter_img.png'],
    ['CRAWLER_EXCAVATOR', 'Crawler excavator', 'crawler_excavator_img.png'],
    ['FLATBED_TRUCK', 'Flatbed Truck', 'flatbed_truck_img.png'],
    ['FIRE_RESCUE_TRUCK', 'Fire&Rescue Truck', 'fire_rescue_truck_img.png'],
  ] as const
).map(([id, label, file]) => ({ id, label, image: img(file) }));

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
const HEAVY_TRUCK = BY_ID.get('HEAVY_TRUCK')!;
const PATTERNS: [string, RegExp][] = [
  ['FIRE_RESCUE_TRUCK', /fire|rescue/],
  ['TOWED_STREET_SWEEPER', /towed.*sweep|sweep.*towed|trailer sweep/],
  ['STREET_SWEEPER', /sweep/],
  ['GARBAGE_COMPACTOR', /garbage|refuse|waste|compactor truck/],
  ['ROAD_ROLLER_COMPACTOR', /roller|compactor|bomag|hamm|dynapac/],
  ['CONCRETE_PUMP', /pump|putzmeister/],
  ['CEMENT_BULKER', /bulker|cement bulk/],
  ['CONCRETE_CARRIER', /concrete carrier|precast|block carrier/],
  ['CONCRETE_MIXER', /mixer|stetter|schwing/],
  ['CRAWLER_EXCAVATOR', /excavator|crawler|digger/],
  ['BOBCAT', /bobcat|skid ?steer/],
  ['LOADER', /loader|backhoe|jcb/],
  ['FORKLIFT', /fork ?lift|linde|hyster|jungheinrich/],
  ['HOOKLIFT', /hook ?lift|roll ?off|skip/],
  ['TANKER', /tanker|bowser|water tank|fuel tank/],
  ['DUMPER_TRUCK', /dump|tipper|hyva/],
  ['FLATBED_TRUCK', /flat ?bed|low ?bed|platform|trailer/],
  ['SCOOTY', /scoot|activa|jupiter|vespa/],
  ['BIKE', /bike|motorcycle|pulsar|splendor|enfield/],
  ['AUTO', /\bauto\b|rickshaw|tuk|three ?wheel/],
  ['SMALL_BUS', /small bus|mini ?bus|coaster|rosa|traveller|urbania|county/],
  ['BUS', /\bbus\b|coach/],
  ['VAN_DELIVERY', /deliver|panel van|cargo van|transit|sprinter|crafter|ducato/],
  ['VAN', /\bvan\b|hiace|hiance|h-?1\b|starex|staria|urvan|eeco/],
  ['PICKUP_2_CABIN', /double cab|crew cab|dual cab|2 cabin|2-cabin/],
  [
    'PICKUP_1_CABIN',
    /pick ?up|single cab|1 cabin|1-cabin|hilux|d-?max|navara|ranger|l200|triton|bolero|yodha/,
  ],
  ['SMALL_TRUCK_UNCOVERED', /uncovered|open (body|deck)|drop ?side/],
  [
    'SMALL_TRUCK_COVERED',
    /small truck|light truck|box truck|canter|\belf\b|npr|nkr|dyna|dost|\bace\b|eicher/,
  ],
  [
    'CAR',
    /\bcar\b|sedan|hatch|suv|corolla|camry|accord|civic|elantra|sonata|accent|yaris|sunny|altima|cruiser|prado|dzire|verna|swift|innova|city/,
  ],
  ['HEAVY_TRUCK', /heavy|truck|prima|actros|scania|volvo|bharatbenz|signa|leyland|prime mover/],
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * The vehicle's own category (the original's `category` id). Neon keeps the category's label
 * (e.g. "Pickup - 1 cabin"), so it is matched by id or by label.
 */
export function categoryOf(v: Pick<Vehicle, 'category'> | undefined): Category | undefined {
  const c = v?.category?.trim();
  if (!c) return undefined;
  return (
    BY_ID.get(c) ?? CATEGORIES.find((x) => norm(x.label) === norm(c) || norm(x.id) === norm(c))
  );
}

/** The category shown for a vehicle: its own, else guessed from make, model and name. */
export function guessCategory(
  v: Pick<Vehicle, 'category' | 'make' | 'model' | 'name'> | undefined,
): Category {
  const own = categoryOf(v);
  if (own) return own;
  const text = [v?.make, v?.model, v?.name].filter(Boolean).join(' ').toLowerCase();
  if (!text) return HEAVY_TRUCK;
  const byLabel = CATEGORIES.find((c) => text.includes(c.label.toLowerCase()));
  if (byLabel) return byLabel;
  const hit = PATTERNS.find(([, re]) => re.test(text));
  return (hit && BY_ID.get(hit[0])) || HEAVY_TRUCK;
}

/* ------------------------------------------------------------------ statuses */

export type StatusId = 'moving' | 'stopped' | 'idle' | 'overspeed' | 'towed' | 'offline' | 'never';

export interface Status {
  id: StatusId;
  label: string;
  tone: string;
  icon: string;
}

export const STATUSES: Record<StatusId, Status> = {
  moving: { id: 'moving', label: 'Running', tone: 'green', icon: 'Play' },
  stopped: { id: 'stopped', label: 'Stopped', tone: 'red', icon: 'Square' },
  idle: { id: 'idle', label: 'Idle', tone: 'blue', icon: 'Clock' },
  overspeed: { id: 'overspeed', label: 'Overspeed', tone: 'orange', icon: 'Gauge' },
  towed: { id: 'towed', label: 'Towed', tone: 'teal', icon: 'Truck' },
  offline: { id: 'offline', label: 'No Transmit', tone: 'dark', icon: 'WifiOff' },
  never: { id: 'never', label: 'Yet to Transmit', tone: 'gray', icon: 'Hourglass' },
};

/** Order of the statuses in the filter's status list. */
export const PROFILE_ORDER: StatusId[] = [
  'moving',
  'stopped',
  'idle',
  'overspeed',
  'towed',
  'offline',
  'never',
];
/** Order of the status tiles above the page. */
export const TILE_ORDER: StatusId[] = [
  'moving',
  'stopped',
  'idle',
  'offline',
  'overspeed',
  'towed',
  'never',
];

const OFFLINE_AFTER = 30 * 60 * 1000;
const MOVING_FROM_KMH = 5;
const OVERSPEED_KMH = 120;

export interface Position {
  assetId: string;
  ts: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  ignition: boolean;
  /** The state the (demo) feed reports for the vehicle; it wins over the computed one. */
  state?: StatusId;
}

/** The vehicle's state from its last position (as in the original). */
export function statusOf(p: Position, now: number, speedLimit: number | null | undefined): Status {
  if (p.state) return STATUSES[p.state];
  const at = Date.parse(p.ts);
  if (now - at > OFFLINE_AFTER) return STATUSES.offline;
  const speed = p.speed ?? 0;
  const limit = speedLimit != null && speedLimit > 0 ? speedLimit : OVERSPEED_KMH;
  if (speed >= MOVING_FROM_KMH) {
    if (p.ignition === false) return STATUSES.towed;
    if (p.ignition != null && speed > limit) return STATUSES.overspeed;
    return STATUSES.moving;
  }
  return p.ignition === false ? STATUSES.stopped : STATUSES.idle;
}

/** Marker colour key for each status (the vehicle marker's own names). */
export const MARKER_STATUS: Record<StatusId, string> = {
  moving: 'running',
  stopped: 'stopped',
  idle: 'idle',
  overspeed: 'overspeed',
  towed: 'towed',
  offline: 'notrans',
  never: 'ytt',
};

/* ------------------------------------------------------------------ formatting */

export const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-IN'));

export function ago(ts: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - Date.parse(ts)) / 1000));
  return s < 60
    ? 'just now'
    : s < 3600
      ? `${Math.round(s / 60)} min ago`
      : s < 86400
        ? `${Math.floor(s / 3600)} h ago`
        : `${Math.floor(s / 86400)} d ago`;
}

const pad = (n: number) => String(n).padStart(2, '0');
/** 10:33:50 */
export const clock = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
/** 10:33 AM */
export const clock12 = (ms: number) => {
  const d = new Date(ms);
  const h = d.getHours();
  return `${pad(h % 12 || 12)}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
};

export const coords = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

/** Distance in metres between two points. */
export function distance(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r;
  const dLng = (b[1] - a[1]) * r;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371e3 * Math.asin(Math.sqrt(h));
}

/* ------------------------------------------------------------------ demo positions */

export const RIYADH: [number, number] = [24.7136, 46.6753];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0 || 1;
}
function seeded(seed: string) {
  let n = hash(seed);
  return () => ((n = (n * 16807) % 2147483647) - 1) / 2147483646;
}

/** Grid View's status names → this page's status ids. */
const FROM_GRID: Record<GridStatus, StatusId> = {
  Running: 'moving',
  Stopped: 'stopped',
  Idle: 'idle',
  Overspeed: 'overspeed',
  Towed: 'towed',
  'No Transmit': 'offline',
  'Yet to Transmit': 'never',
};
/** States in which a vehicle moves on the map. */
const MOVING_STATES = new Set<StatusId>(['moving', 'overspeed', 'towed']);

/** The vehicle's demo record, the same one Grid View shows for it. */
export const demoRecordOf = (v: Vehicle): DemoRecord =>
  demoRecordFor(v.plateNo, v.demoIndex, v.hasDevice);

/**
 * A first position for a vehicle: the place is the original's demo generator (seeded by the
 * vehicle id); state, speed, ignition and report time are the vehicle's Grid View record.
 */
function firstPosition(v: Vehicle, record: DemoRecord): Position {
  const r = seeded(`map:${v.id}`);
  r();
  const state = FROM_GRID[record.status];
  const speed = num(record.speed) ?? 0;
  const at = demoUpdatedAt(record, Date.now()) ?? Date.now();
  return {
    assetId: v.id,
    ts: new Date(at).toISOString(),
    lat: RIYADH[0] + (r() - 0.5) * 0.25,
    lng: RIYADH[1] + (r() - 0.5) * 0.3,
    speed,
    heading: Math.round(r() * 359),
    ignition: record.engine === 'On' ? true : record.engine === 'Off' ? false : speed > 0,
    state,
  };
}

/** Demo positions live for the whole session, so the map keeps its state between visits. */
const positions = new Map<string, Position>();

/**
 * Positions of the vehicles that report: every vehicle except those that are "Yet to Transmit"
 * in Grid View (no device, or a record that has not reported yet).
 */
export function demoPositions(vehicles: Vehicle[]): Position[] {
  return vehicles.flatMap((v) => {
    const record = demoRecordOf(v);
    if (record.status === 'Yet to Transmit') return [];
    let p = positions.get(v.id);
    if (!p) positions.set(v.id, (p = firstPosition(v, record)));
    return [p];
  });
}

/**
 * Up to five moving vehicles move a little (the original's live feed, every 3 s). They keep their
 * Grid View state and speed, so the two pages keep agreeing; parked vehicles stay where they are.
 */
export function demoTick(ids: Set<string>): Position[] {
  const now = Date.now();
  const recent = [...positions.values()].filter(
    (p) =>
      ids.has(p.assetId) &&
      now - Date.parse(p.ts) < 10 * 6e4 &&
      (!p.state || MOVING_STATES.has(p.state)),
  );
  const out: Position[] = [];
  for (let i = 0; i < Math.min(5, recent.length); i++) {
    const p = recent[Math.floor(Math.random() * recent.length)];
    if (!p) break;
    const speed = p.speed ?? 0;
    const heading = ((p.heading ?? 0) + (Math.random() - 0.5) * 40 + 360) % 360;
    const step = ((speed / 3600) * 3) / 111;
    const next: Position = {
      ...p,
      ts: new Date(now).toISOString(),
      heading: Math.round(heading),
      lat: p.lat + Math.cos((heading * Math.PI) / 180) * step,
      lng: p.lng + Math.sin((heading * Math.PI) / 180) * step,
    };
    positions.set(p.assetId, next);
    out.push(next);
  }
  return out;
}

/* ------------------------------------------------------------------ demo telemetry */

export type Input = 'ENGINE' | 'AC' | 'SEATBELT' | 'FRONT_DOOR' | 'BACK_DOOR';

const SIGNALS: Record<string, Input> = {
  Engine: 'ENGINE',
  AC: 'AC',
  'A/C': 'AC',
  Seatbelt: 'SEATBELT',
  'Seat Belt': 'SEATBELT',
  Door: 'FRONT_DOOR',
  'Door Sensor': 'FRONT_DOOR',
  'Front Door': 'FRONT_DOOR',
  'Back Door': 'BACK_DOOR',
};

export interface Telemetry {
  inputs: Input[];
  engine: boolean | null;
  ac: boolean | null;
  seatbelt: boolean | null;
  frontDoor: boolean | null;
  backDoor: boolean | null;
}

/** A stable random number per vehicle, key and time window (the original's `Rn`). */
function windowed(id: string, key: string, every = 0) {
  return (hash(`${id}|${key}|${every ? Math.floor(Date.now() / every) : 0}`) % 1e4) / 1e4;
}

/**
 * Sensor states for a vehicle (demo). Inputs come from the vehicle's configured digital inputs;
 * a vehicle without any gets the original's demo set (every 3rd: engine, A/C, seat belt, door;
 * every 5th from the 3rd: engine, door, back door).
 */
export function demoTelemetry(v: Vehicle, index: number, p: Position | undefined): Telemetry {
  const configured = v.digitalInputs.length
    ? v.digitalInputs
    : index % 3 === 0
      ? ['Engine', 'A/C', 'Seatbelt', 'Door Sensor']
      : index % 5 === 2
        ? ['Engine', 'Door Sensor', 'Back Door']
        : [];
  const inputs = [...new Set(configured.flatMap((s) => SIGNALS[s.trim()] ?? []))];
  const ignition = p?.ignition ?? null;
  const values: Partial<Record<Input, boolean | null>> = p
    ? {
        ENGINE: ignition,
        AC: !!ignition && windowed(v.id, 'ac', 6e4) < 0.7,
        SEATBELT:
          (p.speed ?? 0) > 0
            ? windowed(v.id, 'belt', 6e4) < 0.85
            : windowed(v.id, 'belt', 6e4) < 0.3,
        FRONT_DOOR: (p.speed ?? 0) === 0 && windowed(v.id, 'door1', 6e4) < 0.35,
        BACK_DOOR: (p.speed ?? 0) === 0 && windowed(v.id, 'door2', 6e4) < 0.25,
      }
    : {};
  const get = (k: Input) => (inputs.includes(k) ? (values[k] ?? null) : null);
  return {
    inputs,
    engine: inputs.includes('ENGINE') ? get('ENGINE') : ignition,
    ac: get('AC'),
    seatbelt: get('SEATBELT'),
    frontDoor: get('FRONT_DOOR'),
    backDoor: get('BACK_DOOR'),
  };
}

export interface SensorChip {
  key: string;
  icon: string;
  text: string;
  tone: string;
  title: string;
}

/** The small AC / seat belt chips under a vehicle in the list. */
export function sensorChips(t: Telemetry | undefined, ignition: boolean | null): SensorChip[] {
  if (!t) return [];
  const engine = t.engine ?? ignition;
  const chip = (
    key: string,
    input: Input,
    short: string,
    label: string,
    value: boolean | null,
    on: [icon: string, tone: string, text: string],
    off: [icon: string, tone: string, text: string],
  ): SensorChip[] => {
    if (!t.inputs.includes(input)) return [];
    if (value == null)
      return [{ key, icon: on[0], text: `${short} —`, tone: 'gray', title: `${label}: No data` }];
    const [icon, tone, text] = value ? on : off;
    // Active states keep their colour; inactive ones only when red (a warning).
    const shown = value || tone === 'red' ? tone : 'gray';
    return [{ key, icon, text: `${short} ${text}`, tone: shown, title: `${label}: ${text}` }];
  };
  return [
    ...chip(
      'ac',
      'AC',
      'AC',
      'AC',
      t.ac,
      ['Snowflake', 'blue', 'On'],
      ['Snowflake', 'gray', 'Off'],
    ),
    ...chip(
      'seatbelt',
      'SEATBELT',
      'Belt',
      'Seatbelt',
      t.seatbelt,
      ['Armchair', 'green', 'Fastened'],
      ['Armchair', engine ? 'red' : 'gray', 'Unfastened'],
    ),
  ];
}

/** Sensor values used by the filter's Sensors section. */
export function sensorAttrs(t: Telemetry | undefined) {
  const v = (k: Input, val: boolean | null | undefined, yes: string, no: string) =>
    t && t.inputs.includes(k) && val != null ? (val ? yes : no) : '';
  const doors = [
    v('FRONT_DOOR', t?.frontDoor, 'Open', 'Closed'),
    v('BACK_DOOR', t?.backDoor, 'Open', 'Closed'),
  ].filter(Boolean);
  return {
    ac: v('AC', t?.ac, 'On', 'Off'),
    seatbelt: v('SEATBELT', t?.seatbelt, 'Fastened', 'Unfastened'),
    door: doors.includes('Open') ? 'Open' : doors.length ? 'Closed' : '',
  };
}
