// Grid View (approved design, Vehicle-Grid-View-standalone.html): the page's types, colour rules,
// status table, filters and sorting, exactly as in the design's script.

export type Status =
  'Running' | 'Stopped' | 'Idle' | 'Overspeed' | 'Towed' | 'No Transmit' | 'Yet to Transmit';

export interface SensorReading {
  name: string;
  value: string;
  source: string;
  range: string | null;
}

/** One of the design's demo vehicles (demoRecords.ts): the fields Neon does not have. */
export interface DemoRecord {
  plate: string;
  status: Status;
  speed: string;
  location: string;
  updated: string;
  lastReport: string;
  sensors: SensorReading[];
  gps: string;
  gpsSat: string | null;
  gsm: string;
  intBat: string;
  extBat: string;
  extV: string | null;
  engine: string;
  ac: string;
  seatbelt: string;
  frontDoor: string;
  backDoor: string;
  alerts: number;
  vstatus: string;
  immobilizer: boolean;
}

/** A vehicle as the page shows it: Neon vehicle + the design's demo activity. */
export interface GridVehicle extends Omit<DemoRecord, 'plate'> {
  id: string;
  /** Position in vehicle-number order ("Vehicle no." sort). */
  order: number;
  name: string;
  plate: string;
  operator: string;
  odometer: string;
  group: string;
  typeLabel: string;
  image: string;
  /** Square pictures (other vehicle types) fill the box; the design's cut-out pictures are contained. */
  imageFit: 'contain' | 'cover';
  fleetManager: string;
  supervisor: string;
  geofenceIds: string[];
  /** Last update as a time (for "Recently updated"), null when the vehicle has not reported. */
  updatedAt: number | null;
}

/* ---------- colour rules ---------- */
export const GREEN = '#0E7F5E';
export const ORANGE = '#F76C09';
export const RED = '#F90507';
export const AMBER = '#F5A70A';
export const NEUTRAL = '#B3B9C0';
export const GRAD = 'linear-gradient(90deg,#009863 0%,#005965 100%)';

export const gsmColor = (v: string) =>
  /^Strong/.test(v) ? GREEN : /^Weak/.test(v) ? AMBER : /^No signal/.test(v) ? RED : NEUTRAL;
export const batteryColor = (v: string) =>
  /Very High|^High/.test(v) ? GREEN : v === 'Medium' ? AMBER : v === 'Low' ? RED : NEUTRAL;
export const gpsColor = (v: string) =>
  v === 'Available' ? GREEN : v === 'Not available' ? RED : NEUTRAL;
export const extColor = (v: string) =>
  v === 'Connected' ? GREEN : v === 'Disconnected' ? RED : NEUTRAL;
export const engineColor = (v: string) => (v === 'On' ? GREEN : v === 'Off' ? RED : NEUTRAL);
export const acColor = (v: string) => (v === 'On' ? GREEN : NEUTRAL);
export const beltColor = (v: string) =>
  v === 'Fastened' ? GREEN : v === 'Unfastened' ? RED : NEUTRAL;
export const doorColor = (v: string) => (v === 'Closed' ? GREEN : v === 'Open' ? ORANGE : NEUTRAL);

interface StatusLook {
  dot: string;
  fg: string;
  ring: string;
  grad: string;
}
export const STATUS_LOOK: Record<Status, StatusLook> = {
  Running: {
    dot: '#009863',
    fg: '#009863',
    ring: '#03AD86',
    grad: 'linear-gradient(90deg,#005965 0%,#009863 100%)',
  },
  Stopped: {
    dot: '#F90507',
    fg: '#F90507',
    ring: '#FF8A8A',
    grad: 'linear-gradient(90deg,#F90507 0%,#FF8887 100%)',
  },
  Idle: {
    dot: '#0363FF',
    fg: '#0363FF',
    ring: '#8BB8FF',
    grad: 'linear-gradient(90deg,#0363FF 0%,#74AAFF 100%)',
  },
  Overspeed: {
    dot: '#FF6B2C',
    fg: '#FF5A1F',
    ring: '#FFA36B',
    grad: 'linear-gradient(90deg,#FF5A14 0%,#FF6F2A 55%,#FF9447 100%)',
  },
  Towed: {
    dot: '#4BA9B5',
    fg: '#11636A',
    ring: '#6FE0E0',
    grad: 'linear-gradient(90deg,#2B98A5 0%,#4FB3BE 55%,#86D0D6 100%)',
  },
  'No Transmit': {
    dot: '#1F2328',
    fg: '#111827',
    ring: '#6B7280',
    grad: 'linear-gradient(90deg,#1F2328 0%,#3A4048 55%,#6B7280 100%)',
  },
  'Yet to Transmit': {
    dot: '#9AA3B2',
    fg: '#8A94A6',
    ring: '#C3C9D2',
    grad: 'linear-gradient(90deg,#7C8798 0%,#9AA3B2 55%,#C3C9D2 100%)',
  },
};
/** Status pill: [text colour, soft background]. */
export const STATUS_PILL: Record<Status, [string, string]> = {
  Running: ['#009863', '#E6F5EF'],
  Stopped: ['#F90507', '#FDECEC'],
  Idle: ['#0363FF', '#E8F0FF'],
  Overspeed: ['#F76C09', '#FFF1E6'],
  Towed: ['#07B1B4', '#E3F7F7'],
  'No Transmit': ['#2B333C', '#ECEEF0'],
  'Yet to Transmit': ['#748093', '#F2F4F6'],
};

export type StatusChoice = Status | 'all';
/** The status dropdown's entries (key, label). */
export const STATUS_CHOICES: [StatusChoice, string][] = [
  ['all', 'All'],
  ['Running', 'Running'],
  ['Stopped', 'Stopped'],
  ['Idle', 'Idle'],
  ['No Transmit', 'No Trans'],
  ['Overspeed', 'Overspeed'],
  ['Towed', 'Towed'],
  ['Yet to Transmit', 'YTT'],
];
const STATUS_ORDER: Status[] = [
  'Running',
  'Overspeed',
  'Idle',
  'Stopped',
  'Towed',
  'No Transmit',
  'Yet to Transmit',
];

export type SortKey = 'no' | 'status' | 'speed' | 'odo' | 'recent';
export const SORTS: [SortKey, string][] = [
  ['no', 'Vehicle no.'],
  ['status', 'Status'],
  ['speed', 'Highest speed'],
  ['odo', 'Highest odometer'],
  ['recent', 'Recently updated'],
];
export const PAGE_SIZE = 12;

/* ---------- readings ---------- */
export function num(s: string | null | undefined): number | null {
  const m = String(s ?? '')
    .replace(/,/g, '')
    .match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}
function rangeOf(r: string | null): [number, number] | null {
  if (!r) return null;
  const parts = r.replace(/,/g, '').split('–');
  if (parts.length < 2) return null;
  const lo = num(parts[0]);
  const hi = num(parts[1]);
  return lo == null || hi == null ? null : [lo, hi];
}
export function outOfRange(s: SensorReading): boolean {
  const r = rangeOf(s.range);
  const v = num(s.value);
  return !!r && v != null && (v < r[0] || v > r[1]);
}

/* ---------- filters ---------- */
export type InstalledSensor = 'Temperature' | 'Load' | 'Door' | 'AC';
export const INSTALLED_SENSORS: InstalledSensor[] = ['Temperature', 'Load', 'Door', 'AC'];

export interface Filters {
  manager: string;
  supervisor: string;
  operator: string;
  unassigned: boolean;
  ignition: string;
  installed: InstalledSensor[];
  ac: string;
  seatbelt: string;
  door: string;
  outOfRange: boolean;
  gps: string;
  extBat: string;
  watch: string;
  gsm: string;
  intBat: string;
  geofence: string;
  vtypes: string[];
  groups: string[] | null;
}
export type FilterKey = keyof Filters;

export const DEFAULT_FILTERS: Filters = {
  manager: '',
  supervisor: '',
  operator: '',
  unassigned: false,
  ignition: 'Any',
  installed: [],
  ac: 'Any',
  seatbelt: 'Any',
  door: 'Any',
  outOfRange: false,
  gps: 'Any',
  extBat: 'Any',
  watch: 'Any',
  gsm: 'any',
  intBat: 'any',
  geofence: 'any',
  vtypes: [],
  groups: null,
};
const FILTER_KEYS = Object.keys(DEFAULT_FILTERS) as FilterKey[];

export function isSet(f: Filters, k: FilterKey): boolean {
  const def = DEFAULT_FILTERS[k];
  const val = f[k];
  if (k === 'groups') return f.groups != null;
  if (Array.isArray(def)) return Array.isArray(val) && val.length > 0;
  return val !== def;
}
export const activeCountOf = (f: Filters) => FILTER_KEYS.filter((k) => isSet(f, k)).length;
export const sameFilters = (a: Filters, b: Filters) =>
  FILTER_KEYS.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));

const OPEN_OR_CLOSED = ['Open', 'Closed'];
export function matches(v: GridVehicle, f: Filters): boolean {
  if (f.manager && v.fleetManager !== f.manager) return false;
  if (f.supervisor && v.supervisor !== f.supervisor) return false;
  if (f.operator && v.operator !== f.operator) return false;
  if (f.unassigned && v.operator !== 'Not Assigned') return false;
  if (f.ignition !== 'Any' && v.engine !== f.ignition) return false;
  for (const s of f.installed) {
    if (s === 'Temperature' && !v.sensors.some((x) => /temp/i.test(x.name))) return false;
    if (s === 'Load' && !v.sensors.some((x) => /load/i.test(x.name))) return false;
    if (
      s === 'Door' &&
      !(OPEN_OR_CLOSED.includes(v.frontDoor) || OPEN_OR_CLOSED.includes(v.backDoor))
    )
      return false;
    if (s === 'AC' && !['On', 'Off'].includes(v.ac)) return false;
  }
  if (f.ac !== 'Any' && v.ac !== f.ac) return false;
  if (f.seatbelt !== 'Any' && v.seatbelt !== f.seatbelt) return false;
  if (f.door === 'Open' && !(v.frontDoor === 'Open' || v.backDoor === 'Open')) return false;
  if (
    f.door === 'Closed' &&
    !(
      (v.frontDoor === 'Closed' || v.backDoor === 'Closed') &&
      v.frontDoor !== 'Open' &&
      v.backDoor !== 'Open'
    )
  )
    return false;
  if (f.outOfRange && !v.sensors.some(outOfRange)) return false;
  if (f.gps !== 'Any' && v.gps !== f.gps) return false;
  if (f.extBat !== 'Any' && v.extBat !== f.extBat) return false;
  if (f.watch === 'On') return false; // no vehicle is in Watch Mode in the demo data
  if (f.gsm !== 'any') {
    const ok =
      f.gsm === 'nodata'
        ? v.gsm === 'No data'
        : f.gsm === 'none'
          ? /^No signal/.test(v.gsm)
          : f.gsm === 'strong'
            ? /^Strong/.test(v.gsm)
            : /^Weak/.test(v.gsm);
    if (!ok) return false;
  }
  if (f.intBat !== 'any' && v.intBat !== f.intBat) return false;
  if (f.geofence !== 'any' && !v.geofenceIds.includes(f.geofence)) return false;
  if (f.vtypes.length && !f.vtypes.includes(v.typeLabel)) return false;
  if (f.groups && !f.groups.includes(v.group)) return false;
  return true;
}

/* ---------- sorting ---------- */
export const SORTERS: Record<SortKey, (a: GridVehicle, b: GridVehicle) => number> = {
  no: (a, b) => a.order - b.order,
  status: (a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.order - b.order,
  speed: (a, b) => (num(b.speed) ?? 0) - (num(a.speed) ?? 0),
  odo: (a, b) => (num(b.odometer) ?? 0) - (num(a.odometer) ?? 0),
  recent: (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || a.order - b.order,
};
