// IT-0036. Demo activity for the Tracking page: the original page's own demo generator
// (Tracking.html, removed in IT-0037 (git history): live positions, the 3-second live feed, day tracks, telemetry,
// alerts, operator sign-ins), applied to the company's real vehicles from Neon. Nothing here is
// stored; the screen labels it as demo (root CLAUDE.md §8).

export interface DemoVehicle {
  id: string;
  /** Position of the vehicle in the company's list (the original's sensor setup follows it). */
  index: number;
  odometerKm: number | null;
  /** A tracker is fitted and reports (the others stay "Yet to Transmit"). */
  reporting: boolean;
}

export interface Position {
  assetId: string;
  assetType: 'VEHICLE';
  groupId: string | null;
  ts: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  ignition: boolean | null;
  locationName: string;
}

export interface TrackPoint {
  ts: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number | null;
  ignition: boolean;
  flags: number;
  /** IT-0060: the odometer at this point (as the positions table's odometer reading). */
  odometerKm?: number;
}

const RIYADH = { lat: 24.7136, lng: 46.6753 };
const PLACES = [
  'Olaya St, Al Olaya, Riyadh',
  'King Fahd Rd, Al Muruj, Riyadh',
  'Industrial Area 2, Riyadh',
  'Al Malaz, Riyadh',
  'Exit 18, Eastern Ring Rd, Riyadh',
  'Prince Turki St, Al Hamra, Riyadh',
];
const ALERT_TYPES = [
  'OVERSPEED',
  'HARSH_BRAKING',
  'HARSH_ACCELERATION',
  'IDLE',
  'GEOFENCE_ENTER',
  'GEOFENCE_EXIT',
  'POWER_CUT',
  'TOWED',
  'SOS',
  'DEVICE_OFFLINE',
];
const ZONES = ['Head Office', 'North Depot', 'Industrial Area 2', 'Customer Zone East'];
const HOUR = 36e5;
const DAY = 864e5;

/** FNV-1a hash of a text (the original's seed function). */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0 || 1;
}
/** The original's Park–Miller random generator, seeded from a text. */
function seeded(text: string): () => number {
  let s = hash(text) % 2147483647 || 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const pick = <T>(rnd: () => number, list: readonly T[]): T =>
  list[Math.floor(rnd() * list.length)]!;

/** The original's stable 0..1 value for a vehicle, a key and (optionally) a time bucket. */
function steady(id: string, key: string, periodMs = 0): number {
  const text = `${id}|${key}|${periodMs ? Math.floor(Date.now() / periodMs) : 0}`;
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1e4) / 1e4;
}

/* ------------------------------------------------------------------ the fleet */

let fleet = new Map<string, DemoVehicle>();
const positions = new Map<string, Position>();
const alerts = new Map<string, DemoAlert[]>();

/** Sets the vehicles the demo runs on; new ones get a first position (as the original's start). */
export function setDemoFleet(vehicles: DemoVehicle[], groupOf: (id: string) => string | null) {
  fleet = new Map(vehicles.map((v) => [v.id, v]));
  for (const v of vehicles) {
    if (!v.reporting) {
      positions.delete(v.id);
      continue;
    }
    if (positions.has(v.id)) continue;
    const rnd = seeded(`pos:${v.id}`);
    const t = rnd();
    const offline = t < 0.12;
    const moving = !offline && t < 0.6;
    positions.set(v.id, {
      assetId: v.id,
      assetType: 'VEHICLE',
      groupId: groupOf(v.id),
      ts: new Date(Date.now() - (offline ? (25 + rnd() * 23) * HOUR : rnd() * 9e4)).toISOString(),
      lat: RIYADH.lat + (rnd() - 0.5) * 0.25,
      lng: RIYADH.lng + (rnd() - 0.5) * 0.3,
      speed: moving ? 20 + rnd() * 95 + (rnd() < 0.15 ? 30 : 0) : 0,
      heading: Math.round(rnd() * 359),
      ignition: moving || rnd() < 0.4,
      locationName: PLACES[Math.floor(rnd() * PLACES.length)]!,
    });
  }
}

export const demoPositions = (): Position[] =>
  [...positions.values()].filter((p) => fleet.has(p.assetId));

/* ------------------------------------------------------------------ live feed (every 3 s) */

type Listener = (message: unknown) => void;
const listeners = new Set<Listener>();
let timer: ReturnType<typeof setInterval> | null = null;
const live = Math.random;

/** Up to five recently active vehicles move on (the original's 3-second simulation). */
function tick() {
  const now = Date.now();
  const recent = demoPositions().filter((p) => now - Date.parse(p.ts) < 10 * 6e4);
  for (let n = 0; n < Math.min(5, recent.length); n++) {
    const p = pick(live, recent);
    const speed = live() < 0.15 ? 0 : Math.max(0, (p.speed ?? 0) + (live() - 0.45) * 18);
    const heading = ((p.heading ?? 0) + (live() - 0.5) * 40 + 360) % 360;
    const step = ((speed / 3600) * 3) / 111;
    const next: Position = {
      ...p,
      ts: new Date(now).toISOString(),
      speed: Math.round(speed * 10) / 10,
      heading: Math.round(heading),
      lat: p.lat + Math.cos((heading * Math.PI) / 180) * step,
      lng: p.lng + Math.sin((heading * Math.PI) / 180) * step,
      ignition: speed > 0 || live() < 0.5,
    };
    positions.set(p.assetId, next);
    publish(next);
    const t = demoTelemetry(p.assetId);
    if (t) publish({ type: 'VEHICLE_TELEMETRY', vehicleId: p.assetId, telemetry: t });
  }
}
function publish(message: unknown) {
  const copy = JSON.parse(JSON.stringify(message, (_k, v) => (v === null ? undefined : v)));
  listeners.forEach((l) => l(copy));
}
export function subscribeDemo(listener: Listener): () => void {
  listeners.add(listener);
  timer ??= setInterval(tick, 3e3);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/* ------------------------------------------------------------------ day tracks */

/** One day's track of a vehicle (the original's trip generator: 2–5 trips between 06:30 and 21:00). */
function dayTrack(id: string, dayStart: number): TrackPoint[] {
  const rnd = seeded(`${id}:${dayStart}`);
  const out: TrackPoint[] = [];
  const push = (
    t: number,
    lat: number,
    lng: number,
    speed: number,
    heading: number | null,
    ignition: boolean,
  ) =>
    out.push({
      ts: new Date(t).toISOString(),
      lat: +lat.toFixed(6),
      lng: +lng.toFixed(6),
      speed: Math.round(speed * 10) / 10,
      heading: heading == null ? null : Math.round(heading),
      ignition,
      flags: 0,
    });
  let lat = RIYADH.lat + (rnd() - 0.5) * 0.2;
  let lng = RIYADH.lng + (rnd() - 0.5) * 0.25;
  let t = dayStart + (6.5 + rnd() * 1.5) * HOUR;
  const end = dayStart + (19 + rnd() * 2) * HOUR;
  const trips = 2 + Math.floor(rnd() * 4);
  if (rnd() < 0.12) return [];
  for (let n = 0; n < trips && t < end; n++) {
    const parked = (20 + rnd() * 90) * 6e4;
    for (let s = 0; s < parked; s += 5 * 6e4) push(t + s, lat, lng, 0, null, s > parked - 10 * 6e4);
    t += parked;
    let heading = rnd() * 360;
    const minutes = 15 + rnd() * 55;
    const cruise = 35 + rnd() * 60;
    for (let s = 0; s < minutes * 2; s++) {
      heading = (heading + (rnd() - 0.5) * 35 + 360) % 360;
      const speed = Math.max(8, cruise + (rnd() - 0.5) * 30 + (rnd() < 0.02 ? 45 : 0));
      const step = ((speed / 3600) * 30) / 111;
      lat += Math.cos((heading * Math.PI) / 180) * step;
      lng += Math.sin((heading * Math.PI) / 180) * step;
      push(t, lat, lng, speed, heading, true);
      t += 3e4;
    }
  }
  return out;
}

/** IT-0060: the odometer the vehicle shows now (telemetry and Track History use the same value). */
function odometerNow(id: string): number {
  return (fleet.get(id)?.odometerKm ?? 0) + Math.round(steady(id, 'km') * 900);
}
/** Kilometres between two track points. */
function pointKm(a: TrackPoint, b: TrackPoint): number {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/**
 * History points between two times; today's track ends where the vehicle is now (as the original).
 * IT-0060: each point carries the odometer at that moment: the vehicle's odometer now, less the
 * kilometres it drove after that point (so the playback card's odometer follows the playback time).
 */
export function demoHistory(id: string, from: number, to: number): TrackPoint[] {
  const first = new Date(from);
  first.setHours(0, 0, 0, 0);
  const now = Date.now();
  const days: TrackPoint[][] = [];
  for (let day = first.getTime(); day <= now; day += DAY) {
    let points = fleet.get(id)?.reporting
      ? dayTrack(id, day).filter((p) => Date.parse(p.ts) <= now)
      : [];
    const here = positions.get(id);
    if (day <= now && now < day + DAY && here && points.length) {
      const last = points[points.length - 1]!;
      const dLat = here.lat - last.lat;
      const dLng = here.lng - last.lng;
      points = points.map((p) => ({
        ...p,
        lat: +(p.lat + dLat).toFixed(6),
        lng: +(p.lng + dLng).toFixed(6),
      }));
    }
    days.push(points);
  }
  const odometer = odometerNow(id);
  let after = 0;
  for (let d = days.length - 1; d >= 0; d--) {
    const points = days[d]!;
    for (let i = points.length - 1; i >= 0; i--) {
      if (i < points.length - 1) after += pointKm(points[i]!, points[i + 1]!);
      points[i] = { ...points[i]!, odometerKm: Math.max(0, Math.round((odometer - after) * 10) / 10) };
    }
  }
  return days.flat().filter((p) => Date.parse(p.ts) >= from && Date.parse(p.ts) < to);
}

/* ------------------------------------------------------------------ alerts */

export interface DemoAlert {
  id: string;
  assetId: string;
  assetType: 'VEHICLE';
  type: string;
  ts: string;
  lat: number;
  lng: number;
  speed: number;
  message: string | null;
}

/** The vehicle's alerts of the last 30 days (the original's alert generator). */
export function demoAlerts(id: string): DemoAlert[] {
  const v = fleet.get(id);
  if (!v?.reporting) return [];
  const cached = alerts.get(id);
  if (cached) return cached;
  const rnd = seeded(`alerts:${id}`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const list: DemoAlert[] = [];
  for (let day = 0; day < 30; day++) {
    const count = Math.floor(rnd() * (day === 0 ? 4 : 2.4));
    for (let n = 0; n < count; n++) {
      const type = pick(rnd, ALERT_TYPES);
      const at = today.getTime() - day * DAY + (6 + rnd() * 15) * HOUR;
      const lat = +(RIYADH.lat + (rnd() - 0.5) * 0.25).toFixed(6);
      const lng = +(RIYADH.lng + (rnd() - 0.5) * 0.3).toFixed(6);
      const speed =
        type === 'OVERSPEED'
          ? 125 + Math.round(rnd() * 30)
          : type === 'IDLE' || type === 'POWER_CUT'
            ? 0
            : Math.round(rnd() * 80);
      const message =
        type === 'OVERSPEED'
          ? `${125 + Math.floor(rnd() * 30)} km/h in a 120 km/h limit`
          : type === 'IDLE'
            ? `Engine on, not moving for ${10 + Math.floor(rnd() * 40)} min`
            : type === 'GEOFENCE_ENTER'
              ? `Entered ${pick(rnd, ZONES)}`
              : type === 'GEOFENCE_EXIT'
                ? `Left ${pick(rnd, ZONES)}`
                : type === 'POWER_CUT'
                  ? 'External power disconnected'
                  : type === 'DEVICE_OFFLINE'
                    ? `No report for ${2 + Math.floor(rnd() * 10)} h`
                    : null;
      if (at <= Date.now())
        list.push({
          id: `${id}-al-${day}-${n}`,
          assetId: id,
          assetType: 'VEHICLE',
          type,
          ts: new Date(at).toISOString(),
          lat,
          lng,
          speed,
          message,
        });
    }
  }
  list.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  alerts.set(id, list);
  return list;
}

/* ------------------------------------------------------------------ operator sign-ins */

/** One sign-in per day of the vehicle's operator (the original's operator report generator). */
export function demoOperatorLog(id: string, operator: string | null, from: number, to: number) {
  if (!operator) return [];
  const rows: { operator: string; signIn: string; signOut: string }[] = [];
  const end = Math.min(to, Date.now());
  for (let day = from; day < end; day += DAY) {
    let s = hash(`VEHICLE_OPERATOR:${id}:${day}`);
    const rnd = () => {
      s = Math.imul(s ^ (s >>> 15), 2246822507);
      s = Math.imul(s ^ (s >>> 13), 3266489909);
      return ((s ^= s >>> 16) >>> 0) / 4294967296;
    };
    const at = (h: number) => day + h * HOUR + Math.floor(rnd() * 50) * 6e4;
    if (rnd() < 0.12) continue;
    const signIn = at(6 + rnd());
    const seconds = 36e3 + Math.floor(rnd() * 1e4);
    rows.push({
      operator,
      signIn: new Date(signIn).toISOString(),
      signOut: new Date(signIn + seconds * 1e3).toISOString(),
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ telemetry */

const input = (sensor: string, reverse = false) => ({ sensor, reverse });
/** The original's demo sensor setup, by the vehicle's place in the list. */
function sensorSetup(index: number) {
  const s: Record<
    string,
    { sensor?: string; input?: string; type?: string; unit?: string; min?: string; max?: string }[]
  > = {};
  if (index % 4 === 0) s.oneWire = [{ input: 'Temperature Sensor', min: '-10', max: '8' }];
  if (index % 4 === 1) s.bluetooth = [{ input: 'Temperature / Humidity', min: '-25', max: '-15' }];
  if (index % 3 === 0) {
    s.digitalInputs = [
      input('Engine'),
      input('A/C'),
      input('Seatbelt', true),
      input('Door Sensor'),
    ];
    if (index % 2 === 0)
      s.analog = [
        { type: '', unit: '', min: '', max: '' },
        { type: 'Load / Weight Sensor (analog)', unit: 'Kg', min: '0', max: '5000' },
      ];
  } else if (index % 5 === 2)
    s.digitalInputs = [input('Engine'), input('Door Sensor'), input('Back Door')];
  return s;
}
const INPUT_CODES: Record<string, string> = {
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
const SEVERITY: Record<string, string> = {
  SOS: 'CRITICAL',
  OVERSPEED: 'HIGH',
  HARSH_BRAKING: 'HIGH',
  POWER_CUT: 'HIGH',
  DEVICE_OFFLINE: 'LOW',
  IDLE: 'LOW',
};
const text = (v: unknown) => (v == null ? '' : String(v).trim());
const num = (v: unknown) =>
  text(v) === '' || Number.isNaN(Number(text(v))) ? null : Number(text(v));

/** The vehicle's sensor readings now (the original's telemetry generator). */
export function demoTelemetry(id: string) {
  const v = fleet.get(id);
  if (!v) return undefined;
  const p = positions.get(id);
  const has = !!p;
  const setup = sensorSetup(v.index);
  const ignition = p?.ignition ?? null;
  const states: Record<string, boolean | null> = has
    ? {
        ENGINE: ignition,
        AC: !!ignition && steady(id, 'ac', 6e4) < 0.7,
        SEATBELT:
          (p!.speed ?? 0) > 0 ? steady(id, 'belt', 6e4) < 0.85 : steady(id, 'belt', 6e4) < 0.3,
        FRONT_DOOR: (p!.speed ?? 0) === 0 && steady(id, 'door1', 6e4) < 0.35,
        BACK_DOOR: (p!.speed ?? 0) === 0 && steady(id, 'door2', 6e4) < 0.25,
      }
    : {};
  const inputs = [
    ...new Set(
      (setup.digitalInputs ?? [])
        .map((d) => INPUT_CODES[text(d.sensor)])
        .filter((c): c is string => !!c),
    ),
  ];
  const state = (code: string) => (inputs.includes(code) ? (states[code] ?? null) : null);
  const temps = (list: typeof setup.oneWire, label: string) =>
    (list ?? [])
      .filter((s) => text(s.input).startsWith('Temperature'))
      .slice(0, 4)
      .map((s, i) => {
        const min = num(s.min);
        const max = num(s.max);
        const mid = min != null && max != null ? (min + max) / 2 : 4;
        return {
          slot: i + 1,
          name: `${label} ${i + 1}`,
          unit: '°C',
          min,
          max,
          humidity: null as number | null,
          value: has
            ? Math.round((mid + (steady(id, `${label}${i}`, 12e4) - 0.4) * 8) * 10) / 10
            : null,
        };
      });
  const temperatures = temps(setup.oneWire, 'Temp');
  const bluetooth = temps(setup.bluetooth, 'BT').map((s, i) => ({
    ...s,
    humidity: has ? Math.round(45 + steady(id, `h${i}`, 3e5) * 30) : null,
  }));
  const loads = (setup.analog ?? []).slice(0, 4).flatMap((s, i) =>
    text(s.type).toLowerCase().startsWith('load')
      ? [
          {
            slot: i + 1,
            name: `Analog Input ${i + 1}`,
            unit: text(s.unit) || null,
            min: num(s.min),
            max: num(s.max),
            humidity: null,
            value: has ? Math.round(800 + steady(id, 'load', 3e5) * 3e3) : null,
          },
        ]
      : [],
  );
  const since = Date.now() - 24 * HOUR;
  const recent = demoAlerts(id).filter((a) => Date.parse(a.ts) >= since);
  const gsm = Math.floor(steady(id, 'gsm', 3e5) * 6);
  const battery = ['Very High', 'High', 'High', 'Medium', 'Low'][
    Math.floor(steady(id, 'bat', 6e5) * 5)
  ]!;
  const external = has ? steady(id, 'ext', 6e5) > 0.08 : null;
  const odometer = odometerNow(id);
  return {
    id,
    ts: p?.ts ?? null,
    odometerKm: has ? odometer : v.odometerKm || null,
    speedLimitKmh: v.index % 6 === 0 ? 80 : null,
    motionState: null,
    vehicleStatus: v.index % 9 === 4 ? 'MAINTENANCE' : 'OPERATIONAL',
    gps: has ? steady(id, 'gps', 3e5) > 0.1 : null,
    satellites: has ? 4 + Math.floor(steady(id, 'sat', 6e4) * 10) : null,
    gsm: has ? gsm : null,
    internalBattery: has ? battery : null,
    internalBatteryMv: null,
    externalPower: external,
    externalPowerV: external ? Math.round((12.2 + steady(id, 'v', 6e4) * 1.6) * 100) / 100 : null,
    engine: inputs.includes('ENGINE') ? state('ENGINE') : ignition,
    ac: state('AC'),
    seatbelt: state('SEATBELT'),
    frontDoor: state('FRONT_DOOR'),
    backDoor: state('BACK_DOOR'),
    inputs,
    temperatures,
    bluetooth,
    loads,
    loadWeightKg: loads[0]?.value ?? null,
    alertCount: recent.length,
    alerts: recent
      .slice(0, 5)
      .map((a) => ({
        type: a.type,
        severity: SEVERITY[a.type] ?? 'MEDIUM',
        ts: a.ts,
        title: a.message ?? null,
      })),
  };
}
