// IT-0036. Demo activity of the original Dashboard page (its built-in fake server), applied to the
// company's real vehicles from Neon: live positions, day histories (for the activity timeline),
// the daily executive-summary and driver-behaviour report rows and the alert history. There is no
// table for any of this yet, so it is demo data and labelled on screen (root CLAUDE.md §8).
// Same rules, ranges and numbers as the original generators; seeded per vehicle so it stays stable.

/* ------------------------------------------------------------------ random numbers */

function fnv(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
/** The original's Park–Miller generator (positions, histories, alerts). */
export function parkMiller(seed: string) {
  let n = fnv(seed) % 2147483647 || 1;
  return () => ((n = (n * 16807) % 2147483647) - 1) / 2147483646;
}
/** The original report generator's hash-mixing generator. */
export function reportRandom(seed: string) {
  let t = fnv(seed);
  return () => (
    (t = Math.imul(t ^ (t >>> 15), 2246822507)),
    (t = Math.imul(t ^ (t >>> 13), 3266489909)),
    ((t ^= t >>> 16) >>> 0) / 4294967296
  );
}
const pickWith = <T>(r: () => number, list: readonly T[]): T =>
  list[Math.floor(r() * list.length)]!;

/* ------------------------------------------------------------------ statuses */

export type StatusId = 'moving' | 'stopped' | 'idle' | 'overspeed' | 'towed' | 'offline' | 'never';
export interface Status {
  id: StatusId;
  label: string;
  tone: string;
  icon: string;
}
export const STATUS: Record<StatusId, Status> = {
  moving: { id: 'moving', label: 'Running', tone: 'green', icon: 'Play' },
  stopped: { id: 'stopped', label: 'Stopped', tone: 'red', icon: 'Square' },
  idle: { id: 'idle', label: 'Idle', tone: 'blue', icon: 'Clock' },
  overspeed: { id: 'overspeed', label: 'Overspeed', tone: 'orange', icon: 'Gauge' },
  towed: { id: 'towed', label: 'Towed', tone: 'teal', icon: 'Truck' },
  offline: { id: 'offline', label: 'No Transmit', tone: 'dark', icon: 'WifiOff' },
  never: { id: 'never', label: 'Yet to Transmit', tone: 'gray', icon: 'Hourglass' },
};
export const STATUS_ORDER: StatusId[] = [
  'moving',
  'stopped',
  'idle',
  'overspeed',
  'towed',
  'offline',
  'never',
];
export const DEFAULT_LIMIT = 120;
const STALE_MS = 30 * 60_000;

/* ------------------------------------------------------------------ live positions */

export const CENTER = { lat: 24.7136, lng: 46.6753 };
const PLACES = [
  'Olaya St, Al Olaya, Riyadh',
  'King Fahd Rd, Al Muruj, Riyadh',
  'Industrial Area 2, Riyadh',
  'Al Malaz, Riyadh',
  'Exit 18, Eastern Ring Rd, Riyadh',
  'Prince Turki St, Al Hamra, Riyadh',
];

export interface Position {
  assetId: string;
  ts: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  ignition: boolean;
  locationName: string;
}

/** First live position of a vehicle with a tracker (the original's start state). */
export function startPosition(assetId: string, now = Date.now()): Position {
  const r = parkMiller(`pos:${assetId}`);
  const t = r();
  const offline = t < 0.12;
  const moving = !offline && t < 0.6;
  return {
    assetId,
    ts: new Date(now - (offline ? (25 + r() * 23) * 3_600_000 : r() * 90_000)).toISOString(),
    lat: CENTER.lat + (r() - 0.5) * 0.25,
    lng: CENTER.lng + (r() - 0.5) * 0.3,
    speed: moving ? 20 + r() * 95 + (r() < 0.15 ? 30 : 0) : 0,
    heading: Math.round(r() * 359),
    ignition: moving || r() < 0.4,
    locationName: pickWith(r, PLACES),
  };
}

/** One tick of the original's live feed (every 3 s): up to 5 recently reporting vehicles move on. */
export function step(positions: Map<string, Position>, now = Date.now()): Map<string, Position> {
  const fresh = [...positions.values()].filter((p) => now - Date.parse(p.ts) < 10 * 60_000);
  if (!fresh.length) return positions;
  const next = new Map(positions);
  for (let i = 0; i < Math.min(5, fresh.length); i++) {
    const p = fresh[Math.floor(Math.random() * fresh.length)]!;
    const speed = Math.random() < 0.15 ? 0 : Math.max(0, p.speed + (Math.random() - 0.45) * 18);
    const heading = (p.heading + (Math.random() - 0.5) * 40 + 360) % 360;
    const dist = ((speed / 3600) * 3) / 111;
    next.set(p.assetId, {
      ...p,
      ts: new Date(now).toISOString(),
      speed: Math.round(speed * 10) / 10,
      heading: Math.round(heading),
      lat: p.lat + Math.cos((heading * Math.PI) / 180) * dist,
      lng: p.lng + Math.sin((heading * Math.PI) / 180) * dist,
      ignition: speed > 0 || Math.random() < 0.5,
    });
  }
  return next;
}

/** The original's status rule: no report in 30 min = No Transmit, then speed and ignition. */
export function statusOf(p: Position | null, now: number, limitKmh?: number | null): Status {
  if (!p) return STATUS.never;
  if (now - Date.parse(p.ts) > STALE_MS) return STATUS.offline;
  const limit = limitKmh && limitKmh > 0 ? limitKmh : DEFAULT_LIMIT;
  if (p.speed >= 5) {
    if (p.ignition === false) return STATUS.towed;
    return p.speed > limit ? STATUS.overspeed : STATUS.moving;
  }
  return p.ignition === false ? STATUS.stopped : STATUS.idle;
}

/** "just now", "4 min ago", "3 h ago", "2 d ago" (the original's wording). */
export function ago(ts: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(ts)) / 1000));
  return s < 60
    ? 'just now'
    : s < 3600
      ? `${Math.round(s / 60)} min ago`
      : s < 86400
        ? `${Math.floor(s / 3600)} h ago`
        : `${Math.floor(s / 86400)} d ago`;
}

/* ------------------------------------------------------------------ day history → timeline */

interface Point {
  t: number;
  lat: number;
  lng: number;
  speed: number;
  ignition: boolean;
}

/** The original's demo track of one vehicle on one day (2–5 trips between 06:30 and 21:00). */
function dayTrack(assetId: string, dayStart: number): Point[] {
  const r = parkMiller(`${assetId}:${dayStart}`);
  const out: Point[] = [];
  const add = (t: number, lat: number, lng: number, speed: number, ignition: boolean) =>
    out.push({ t, lat, lng, speed: Math.round(speed * 10) / 10, ignition });
  let lat = CENTER.lat + (r() - 0.5) * 0.2;
  let lng = CENTER.lng + (r() - 0.5) * 0.25;
  let u = dayStart + (6.5 + r() * 1.5) * 3_600_000;
  const end = dayStart + (19 + r() * 2) * 3_600_000;
  const trips = 2 + Math.floor(r() * 4);
  if (r() < 0.12) return [];
  for (let h = 0; h < trips && u < end; h++) {
    const stop = (20 + r() * 90) * 60_000;
    for (let t = 0; t < stop; t += 5 * 60_000) add(u + t, lat, lng, 0, t > stop - 10 * 60_000);
    u += stop;
    let heading = r() * 360;
    const steps = 15 + r() * 55;
    const cruise = 35 + r() * 60;
    for (let t = 0; t < steps * 2; t++) {
      heading = (heading + (r() - 0.5) * 35 + 360) % 360;
      const speed = Math.max(8, cruise + (r() - 0.5) * 30 + (r() < 0.02 ? 45 : 0));
      const d = ((speed / 3600) * 30) / 111;
      lat += Math.cos((heading * Math.PI) / 180) * d;
      lng += Math.sin((heading * Math.PI) / 180) * d;
      add(u, lat, lng, speed, true);
      u += 30_000;
    }
  }
  return out;
}

export interface Segment {
  status: 'moving' | 'stopped' | 'idle';
  start: number;
  end: number;
}

const GAP_MS = 10 * 60_000;
const STOP_MS = 3 * 60_000;

/**
 * The original's track analysis, reduced to what the timeline shows: trips (moving at ≥ 5 km/h,
 * ended by a 3-minute stop or a 10-minute gap) and the status of every stretch between points.
 */
export function daySegments(
  assetId: string,
  from: number,
  to: number,
  now = Date.now(),
): Segment[] {
  const pts: Point[] = [];
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  for (let d = start.getTime(); d < to; d += 86_400_000)
    for (const p of dayTrack(assetId, d)) if (p.t <= now && p.t >= from && p.t < to) pts.push(p);
  const moving = (p: Point) => p.speed >= 5;
  const spans: { from: number; to: number }[] = [];
  let cur: { from: number; last: number } | null = null;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const prev = pts[i - 1];
    if (cur && prev && p.t - prev.t > GAP_MS) {
      spans.push({ from: cur.from, to: cur.last });
      cur = null;
    }
    if (moving(p)) {
      if (cur) cur.last = i;
      else cur = { from: prev && p.t - prev.t <= GAP_MS && !moving(prev) ? i - 1 : i, last: i };
    } else if (cur && p.t - pts[cur.last]!.t >= STOP_MS) {
      spans.push({ from: cur.from, to: Math.min(cur.last + 1, i) });
      cur = null;
    }
  }
  if (cur) spans.push({ from: cur.from, to: pts.length - 1 });
  const trips = spans
    .filter((s) => s.to > s.from)
    .map((s) => ({ start: pts[s.from]!.t, end: pts[s.to]!.t }));
  const inTrip = (t: number) => trips.some((tr) => t >= tr.start && t < tr.end);
  const segs: Segment[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (b.t - a.t > GAP_MS) continue;
    const status = inTrip(a.t) ? 'moving' : a.ignition === false ? 'stopped' : 'idle';
    const last = segs[segs.length - 1];
    if (last && last.status === status && last.end === a.t) last.end = b.t;
    else segs.push({ status, start: a.t, end: b.t });
  }
  return segs;
}

/* ------------------------------------------------------------------ report rows */

export interface SummaryRow {
  assetId: string;
  distanceKm: number;
  runningSeconds: number;
  idleSeconds: number;
  stopSeconds: number;
  towedSeconds: number;
  towed: boolean;
  maxSpeed: number;
  odometerKm: number;
  alerts: number;
}

const PLACES_SHORT = [
  'Olaya St, Riyadh',
  'King Fahd Rd',
  'Industrial Area 2',
  'North Depot',
  'Al Malaz',
  'Exit 18, Ring Rd',
];

/** The original's VEHICLE_EXECUTIVE_SUMMARY report: one row per vehicle per day (12 % of days without a trip). */
export function executiveSummary(
  assetIds: string[],
  from: number,
  to: number,
  now = Date.now(),
): SummaryRow[] {
  const end = Math.min(to, now);
  const rows: SummaryRow[] = [];
  for (const assetId of assetIds)
    for (let m = from; m < end; m += 86_400_000) {
      const p = reportRandom(`VEHICLE_EXECUTIVE_SUMMARY:${assetId}:${m}`);
      const at = (h: number) => m + h * 3_600_000 + Math.floor(p() * 50) * 60_000;
      if (p() < 0.12) continue;
      at(6);
      at(18);
      const running = 3600 * (2 + p() * 5);
      const idle = 300 + p() * 3600;
      const stop = 3600 * (1 + p() * 3);
      const towed = p() < 0.08;
      const distanceKm = Math.round(40 + p() * 300);
      pickWith(p, PLACES_SHORT);
      pickWith(p, PLACES_SHORT);
      rows.push({
        assetId,
        alerts: Math.floor(p() * 4),
        maxSpeed: Math.round(50 + p() * 80),
        odometerKm: 12000 + Math.round(p() * 40000),
        distanceKm,
        runningSeconds: Math.round(running),
        idleSeconds: Math.round(idle),
        stopSeconds: Math.round(stop),
        towed,
        towedSeconds: towed ? 900 : 0,
      });
    }
  return rows;
}

export interface DriverRow {
  operator: string | null;
  runningSeconds: number;
  harshBraking: number;
  overspeed: number;
  distanceKm: number;
  score: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The original's VEHICLE_DRIVER_BEHAVIOUR report: one row per vehicle per day, for the operator
 * on the vehicle. Here the operator is the vehicle's operator in Neon (none = no driver).
 */
export function driverBehaviour(
  vehicles: { id: string; operator: string | null }[],
  from: number,
  to: number,
  now = Date.now(),
): DriverRow[] {
  const end = Math.min(to, now);
  const rows: DriverRow[] = [];
  for (const v of vehicles)
    for (let a = from; a < end; a += 86_400_000) {
      const g = reportRandom(`VEHICLE_DRIVER_BEHAVIOUR:${v.id}:${a}`);
      if (g() < 0.12) continue;
      const running = Math.round(3600 * (2 + g() * 5));
      g();
      g();
      if (g() < 0.08) g();
      const distanceKm = round1(40 + g() * 300);
      const harshBraking = Math.floor(g() * 4);
      const harshAcc = Math.floor(g() * 4);
      const overspeed = Math.floor(g() * 3);
      const seatBelt = Math.floor(g() * 2);
      rows.push({
        operator: v.operator,
        runningSeconds: running,
        harshBraking,
        overspeed,
        distanceKm,
        score: Math.max(0, 100 - 2 * (harshBraking + harshAcc) - overspeed - 2 * seatBelt),
      });
    }
  return rows;
}

/* ------------------------------------------------------------------ alerts */

export interface AlertType {
  id: string;
  label: string;
  icon: string;
  tone: string;
}
/** The original's alert types for vehicles (all but Fake Location), in its order. */
export const ALERT_TYPES: AlertType[] = [
  { id: 'OVERSPEED', label: 'Overspeed', icon: 'Gauge', tone: 'red' },
  { id: 'HARSH_BRAKING', label: 'Harsh Braking', icon: 'OctagonX', tone: 'red' },
  { id: 'HARSH_ACCELERATION', label: 'Harsh Driving', icon: 'TriangleAlert', tone: 'orange' },
  { id: 'HARSH_CORNERING', label: 'Harsh Cornering', icon: 'TriangleAlert', tone: 'amber' },
  { id: 'IDLE', label: 'Idle', icon: 'Clock', tone: 'blue' },
  { id: 'GEOFENCE_ENTER', label: 'Geofence Entry', icon: 'MapPinned', tone: 'teal' },
  { id: 'GEOFENCE_EXIT', label: 'Geofence Exit', icon: 'MapPinned', tone: 'orange' },
  { id: 'POWER_CUT', label: 'Power Cut', icon: 'Zap', tone: 'amber' },
  { id: 'TOWED', label: 'Towed', icon: 'Truck', tone: 'teal' },
  { id: 'SOS', label: 'SOS', icon: 'Siren', tone: 'red' },
  { id: 'LOW_BATTERY', label: 'Low Battery', icon: 'BatteryLow', tone: 'amber' },
  { id: 'DEVICE_OFFLINE', label: 'Device Offline', icon: 'WifiOff', tone: 'dark' },
];

const RAISED = [
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

export interface DemoAlert {
  assetId: string;
  type: string;
  ts: number;
  speed: number;
  /** The original's demo alerts carry no geofence id. */
  geofenceId?: string;
}

/** The original's alert history: per vehicle with a tracker, 0–3 alerts today and 0–2 on each of the 29 days before. */
export function alertHistory(assetIds: string[], midnight: number, now = Date.now()): DemoAlert[] {
  const out: DemoAlert[] = [];
  const day = new Date(midnight).toISOString().slice(0, 10);
  for (const assetId of assetIds) {
    const r = parkMiller(`alerts:${assetId}:${day}`);
    for (let d = 0; d < 30; d++) {
      const count = Math.floor(r() * (d === 0 ? 4 : 2.4));
      for (let k = 0; k < count; k++) {
        const type = pickWith(r, RAISED);
        const at = midnight - d * 86_400_000 + (6 + r() * 15) * 3_600_000;
        r();
        r();
        const speed =
          type === 'OVERSPEED'
            ? 125 + Math.round(r() * 30)
            : type === 'IDLE' || type === 'POWER_CUT'
              ? 0
              : Math.round(r() * 80);
        if (at <= now) out.push({ assetId, type, ts: at, speed });
      }
    }
  }
  return out;
}
