// Demo activity for GPS Vehicle Tracking: where each vehicle is, its status, its day on a
// timeline, alerts and how far it drove. Generated from the company's real vehicles with fixed
// seeds, so every screen and every reload agree; moving vehicles drift with the clock. Screens
// label it as demo. Real device data replaces it when trackers report. Invented data only.
import type { AlertKind, VehicleStatus } from '../shared/vehicle-status';

// ---------------------------------------------------------------- seeds
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
/** Seeded random numbers in [0, 1) (mulberry32). */
export function rng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- places (Riyadh districts)
export const AREAS = [
  { name: 'Al Malaz, Riyadh', lat: 24.665, lng: 46.733 },
  { name: 'Olaya, Riyadh', lat: 24.695, lng: 46.685 },
  { name: 'Industrial Area 2, Riyadh', lat: 24.635, lng: 46.79 },
  { name: 'King Fahd Rd, Al Muruj', lat: 24.755, lng: 46.66 },
  { name: 'Al Murabba, Riyadh', lat: 24.648, lng: 46.708 },
  { name: 'Al Sulay, Riyadh', lat: 24.59, lng: 46.82 },
  { name: 'Al Yasmin, Riyadh', lat: 24.82, lng: 46.64 },
  { name: 'Al Naseem, Riyadh', lat: 24.735, lng: 46.815 },
  { name: 'Al Rawdah, Riyadh', lat: 24.74, lng: 46.77 },
  { name: 'Al Aziziyah, Riyadh', lat: 24.595, lng: 46.76 },
  { name: 'Exit 9, Riyadh', lat: 24.78, lng: 46.765 },
  { name: 'Al Sahafah, Riyadh', lat: 24.805, lng: 46.635 },
] as const;

// ---------------------------------------------------------------- vehicles
/** A vehicle as the database knows it (core.assets + proto_vehicle.vehicle_details). */
export interface FleetVehicle {
  id: string;
  /** Call sign (core.assets.name), e.g. "Truck 01". */
  callSign: string;
  /** Plate (core.assets.plate_serial); the call sign when there is none. */
  plate: string;
  category: string | null;
  make: string | null;
  model: string | null;
  group: string | null;
  odometerKm: number | null;
  /** km/h (default 80). */
  speedLimit: number;
  operator: string | null;
}

/** A vehicle right now (demo). */
export interface LiveVehicle extends FleetVehicle {
  status: VehicleStatus;
  lat: number;
  lng: number;
  /** km/h. */
  speed: number;
  /** Degrees, 0 = north. */
  heading: number;
  area: string;
  /** Last report; null = never reported (Yet to Transmit). */
  lastReport: Date | null;
  /** Odometer now, km. */
  odometer: number;
  /** Driven today, km. */
  todayKm: number;
  /** Hours since it last moved (0 when moving; null when it never reported). */
  unusedHours: number | null;
  ignition: boolean | null;
  ac: boolean | null;
  belt: boolean | null;
  door: boolean | null;
}

/**
 * The status mix of a fleet (as in the design: about 40% running). Shuffled per vehicle by a
 * seed, so a vehicle keeps its status for the day.
 */
const PATTERN: VehicleStatus[] = [
  'running',
  'stopped',
  'running',
  'ytt',
  'running',
  'notx',
  'stopped',
  'running',
  'idle',
  'ytt',
  'running',
  'notx',
];

const HOUR = 3_600_000;
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const hoursOf = (d: Date) => (d.getTime() - startOfDay(d).getTime()) / HOUR;

/**
 * Base status of each vehicle today: drawn from the pattern by the vehicle's own seed, so adding
 * or removing a vehicle never changes the others' statuses.
 */
function baseStatuses(vehicles: FleetVehicle[], now: Date): Map<string, VehicleStatus> {
  const day = dayKey(now);
  return new Map(
    vehicles.map((v) => [v.id, PATTERN[hash(v.id + 'status' + day) % PATTERN.length]!]),
  );
}

/** Where every vehicle is and what it's doing at `now`. */
export function liveFleet(vehicles: FleetVehicle[], now: Date): LiveVehicle[] {
  const base = baseStatuses(vehicles, now);
  const day = dayKey(now);
  return vehicles.map((v) => {
    const r = rng(v.id + day);
    const home = AREAS[hash(v.id) % AREAS.length]!;
    let status = base.get(v.id) ?? 'stopped';
    const t = now.getTime() / 60_000; // minutes
    const phase = r() * Math.PI * 2;
    const radiusKm = 0.8 + r() * 1.8;
    const cruise = 38 + r() * 40; // km/h
    let speed = 0;
    let angle = phase;
    if (status === 'running') {
      speed = Math.max(8, cruise + 18 * Math.sin((t / 7) * Math.PI * 2 + phase));
      // Move around a loop near home at the cruise speed.
      angle = phase + ((t / 60) * cruise) / radiusKm;
      if (speed > v.speedLimit) status = 'overspeed';
    }
    const latKm = 1 / 111;
    const lngKm = 1 / (111 * Math.cos((home.lat * Math.PI) / 180));
    const lat = home.lat + Math.sin(angle) * radiusKm * latKm;
    const lng = home.lng + Math.cos(angle) * radiusKm * lngKm;
    const heading = ((((-angle * 180) / Math.PI) % 360) + 360) % 360;
    const segs = dayTimeline(v, now, status);
    const stats = dayStats(segs, v, now);
    const odoBase = v.odometerKm ?? Math.round(20_000 + r() * 100_000);
    const lastReport =
      status === 'ytt'
        ? null
        : status === 'notx'
          ? new Date(now.getTime() - (2 + r() * 10) * HOUR)
          : new Date(now.getTime() - Math.round(r() * 50) * 1000);
    const lastMove = segs.filter((s) => s.status === 'running' || s.status === 'overspeed').pop();
    const unusedHours =
      status === 'ytt'
        ? null
        : status === 'running' || status === 'overspeed'
          ? 0
          : lastMove
            ? Math.max(0, hoursOf(now) - lastMove.to)
            : hoursOf(now) + 24 * (1 + Math.floor(r() * 2));
    const reporting = status !== 'ytt' && status !== 'notx';
    const engineOn = status === 'running' || status === 'overspeed' || status === 'idle';
    return {
      ...v,
      status,
      lat,
      lng,
      speed: Math.round(speed),
      heading,
      area: home.name,
      lastReport,
      odometer: Math.round(odoBase + stats.km),
      todayKm: Math.round(stats.km),
      unusedHours: unusedHours == null ? null : Math.round(unusedHours * 10) / 10,
      ignition: reporting ? engineOn : null,
      ac: reporting ? engineOn && r() > 0.3 : null,
      belt: reporting ? engineOn && r() > 0.15 : null,
      door: reporting ? !engineOn && r() > 0.8 : null,
    };
  });
}

// ---------------------------------------------------------------- a day on the timeline
export interface Segment {
  /** Hours from midnight. */
  from: number;
  to: number;
  status: VehicleStatus;
}

/**
 * What a vehicle did on `day`, as segments. Give `current` (its status now) for today: the day
 * then runs up to the time in `day` and ends in that status. Never-reported vehicles have none.
 */
export function dayTimeline(v: FleetVehicle, day: Date, current?: VehicleStatus): Segment[] {
  const r = rng(v.id + 'tl' + dayKey(day));
  const isToday = current != null;
  if (current === 'ytt') return [];
  const end = isToday ? hoursOf(day) : 20 + r() * 3.5;
  const stopAt = current === 'notx' ? Math.max(0, end - (2 + r() * 8)) : end;
  const out: Segment[] = [];
  let h = 5 + r() * 2.5;
  while (h < stopAt) {
    const run = 0.2 + r() * 0.8; // a trip: 12-60 min
    const to = Math.min(stopAt, h + run);
    // A short overspeed now and then inside a drive.
    if (to - h > 0.6 && r() < 0.35) {
      const mid = h + (to - h) * (0.3 + r() * 0.4);
      out.push({ from: h, to: mid, status: 'running' });
      out.push({ from: mid, to: Math.min(to, mid + 0.06 + r() * 0.08), status: 'overspeed' });
      out.push({ from: Math.min(to, mid + 0.14), to, status: 'running' });
    } else out.push({ from: h, to, status: 'running' });
    h = to;
    if (h >= stopAt) break;
    const pause = r() < 0.35 ? 0.05 + r() * 0.3 : 0.3 + r() * 1.8; // idle, or a stop
    const pto = Math.min(stopAt, h + pause);
    out.push({ from: h, to: pto, status: pause < 0.4 ? 'idle' : 'stopped' });
    h = pto;
  }
  if (isToday && current && current !== 'notx') {
    // The current status covers at least the last 15 minutes.
    const cut = Math.max(0, end - 0.25);
    const kept = out.filter((s) => s.from < cut).map((s) => ({ ...s, to: Math.min(s.to, cut) }));
    const last = kept[kept.length - 1];
    if (last && last.status === current) last.to = end;
    else kept.push({ from: cut, to: end, status: current });
    return kept.filter((s) => s.to - s.from > 0.005);
  }
  return out.filter((s) => s.to - s.from > 0.005);
}

export interface DayStats {
  hours: Record<VehicleStatus, number>;
  km: number;
  maxSpeed: number;
  overspeeds: number;
}

/** Hours per status, distance, top speed and overspeed count of a day's segments. */
export function dayStats(segs: Segment[], v: FleetVehicle, day: Date): DayStats {
  const hours: Record<VehicleStatus, number> = {
    running: 0,
    stopped: 0,
    idle: 0,
    notx: 0,
    overspeed: 0,
    towed: 0,
    ytt: 0,
  };
  for (const s of segs) hours[s.status] += s.to - s.from;
  const r = rng(v.id + 'st' + dayKey(day));
  const avg = 24 + r() * 16; // city average, km/h
  const overspeeds = segs.filter((s) => s.status === 'overspeed').length;
  const km = (hours.running + hours.overspeed) * avg;
  const moved = hours.running + hours.overspeed > 0;
  const maxSpeed = !moved
    ? 0
    : overspeeds
      ? Math.round(v.speedLimit + 5 + r() * 45)
      : Math.round(Math.min(v.speedLimit, 40 + r() * 45));
  return { hours, km, maxSpeed, overspeeds };
}

// ---------------------------------------------------------------- alerts
/** How many alerts of a kind a vehicle had on a day (demo). */
export function alertCount(v: FleetVehicle, day: Date, kind: AlertKind): number {
  const r = rng(v.id + kind + dayKey(day))();
  const rate: Partial<Record<AlertKind, number>> = {
    overspeed: 2.2,
    harsh_braking: 2.6,
    harsh_driving: 2.8,
    harsh_cornering: 0.3,
    idle: 2.4,
    geofence_entry: 2,
    geofence_exit: 2,
    power_cut: 2,
    sos: 0.9,
    towed: 0.5,
    offline: 1.2,
  };
  return Math.floor(r * r * (rate[kind] ?? 1) * 1.6);
}

/** Alerts of each kind across the fleet, over the `days` days ending with `day`. */
export function alertTotals(
  vehicles: FleetVehicle[],
  day: Date,
  days: number,
  kinds: AlertKind[],
  skip: Set<string> = new Set(),
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of kinds) {
    let n = 0;
    for (let d = 0; d < days; d++)
      for (const v of vehicles) if (!skip.has(v.id)) n += alertCount(v, addDays(day, -d), k);
    out[k] = n;
  }
  return out;
}

export interface AlertEvent {
  id: string;
  vehicleId: string;
  plate: string;
  kind: AlertKind;
  at: Date;
  description: string;
  lat: number;
  lng: number;
}

const ZONES = ['North Depot', 'Head Office', 'Customer Zone East', 'Industrial Area 2'];

/** Every alert on `day` (today: up to now), newest first. */
export function alertEvents(
  vehicles: LiveVehicle[],
  day: Date,
  kinds: AlertKind[],
  now: Date,
): AlertEvent[] {
  const out: AlertEvent[] = [];
  const isToday = dayKey(day) === dayKey(now);
  const limitH = isToday ? hoursOf(now) : 24;
  for (const v of vehicles) {
    if (v.status === 'ytt') continue;
    const home = AREAS[hash(v.id) % AREAS.length]!;
    for (const kind of kinds) {
      const n = alertCount(v, day, kind);
      const r = rng(v.id + kind + 'ev' + dayKey(day));
      for (let i = 0; i < n; i++) {
        // Draw every number of this alert first, so an alert keeps its time and place whether
        // or not it has happened yet (later alerts don't shift as the day goes on).
        const [rh, r1, r2, r3, rLat, rLng] = [r(), r(), r(), r(), r(), r()];
        const h = 5 + rh * 18;
        if (h > limitH) continue;
        const at = new Date(startOfDay(day).getTime() + h * HOUR);
        const zone = ZONES[Math.floor(r2 * ZONES.length)]!;
        const description =
          kind === 'overspeed'
            ? `${Math.round(v.speedLimit + 6 + r1 * 30)} km/h in a ${v.speedLimit} km/h limit`
            : kind === 'harsh_braking'
              ? 'Sudden deceleration'
              : kind === 'harsh_driving'
                ? 'Sudden acceleration'
                : kind === 'harsh_cornering'
                  ? 'Sharp turn at speed'
                  : kind === 'idle'
                    ? `Engine on, not moving for ${Math.round(12 + r1 * 30)} min`
                    : kind === 'geofence_entry'
                      ? `Entered ${zone}`
                      : kind === 'geofence_exit'
                        ? `Left ${zone}`
                        : kind === 'power_cut'
                          ? 'External power disconnected'
                          : kind === 'sos'
                            ? 'Panic button pressed'
                            : kind === 'towed'
                              ? 'Moved with the ignition off'
                              : `No report for ${Math.round(1 + r3 * 9)} h`;
        out.push({
          id: `${v.id}-${kind}-${dayKey(day)}-${i}`,
          vehicleId: v.id,
          plate: v.plate,
          kind,
          at,
          description,
          lat: home.lat + (rLat - 0.5) * 0.06,
          lng: home.lng + (rLng - 0.5) * 0.06,
        });
      }
    }
  }
  return out.sort((a, b) => b.at.getTime() - a.at.getTime());
}

// ---------------------------------------------------------------- geometry
/** Metres between two points. */
export function distanceM(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Whether a point is inside a polygon ([lat, lng] corners). */
export function insidePolygon(p: [number, number], poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i]!;
    const [yj, xj] = poly[j]!;
    if (yi > p[0] !== yj > p[0] && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------- routes
export interface RoutePoint {
  lat: number;
  lng: number;
  at: Date;
  /** km/h. */
  speed: number;
  status: VehicleStatus;
}

export interface DayRoute {
  /** Where the vehicle was through the day, about every 2 minutes while moving, oldest first. */
  points: RoutePoint[];
  /** Where it stopped (ignition off) for more than 10 minutes. */
  stops: RoutePoint[];
  /** km. */
  distance: number;
  maxSpeed: number;
  idles: number;
}

/**
 * The path a vehicle drove on a day, from its day timeline. Each drive is a trip along the street
 * grid around its home district: it heads for a destination (within about 5 km) in L-shaped legs,
 * then picks the next one. It waits in place for idle and stopped segments. The average speed
 * matches dayStats, so the route's distance agrees with the day's distance on the Dashboard.
 * Give `current` for today (see dayTimeline). Deterministic per vehicle and day.
 */
export function dayRoute(v: FleetVehicle, day: Date, current?: VehicleStatus): DayRoute {
  const segs = dayTimeline(v, day, current);
  const stats = dayStats(segs, v, day);
  const movingH = stats.hours.running + stats.hours.overspeed;
  const avg = movingH > 0 ? stats.km / movingH : 0;
  const r = rng(v.id + 'route' + dayKey(day));
  const home = AREAS[hash(v.id) % AREAS.length]!;
  const base = startOfDay(day).getTime();
  const kmLat = 1 / 111;
  const kmLng = 1 / (111 * Math.cos((home.lat * Math.PI) / 180));
  // Positions in street-grid km (u, w); Riyadh's grid is turned about 30 degrees.
  const turn = (-30 * Math.PI) / 180;
  const pos = (u: number, w: number) => ({
    lat: home.lat + (u * Math.sin(turn) + w * Math.cos(turn)) * kmLat,
    lng: home.lng + (u * Math.cos(turn) - w * Math.sin(turn)) * kmLng,
  });
  const place = () => [Math.round((r() - 0.5) * 8 * 4) / 4, Math.round((r() - 0.5) * 8 * 4) / 4];
  let [u, w] = place() as [number, number];
  let target: [number, number] | null = null;
  let uFirst = true;
  const points: RoutePoint[] = [];
  const stops: RoutePoint[] = [];
  let distance = 0;
  let maxSpeed = 0;
  const at = (h: number) => new Date(base + h * HOUR);
  for (const s of segs) {
    const moving = s.status === 'running' || s.status === 'overspeed';
    if (!moving) {
      const p = { ...pos(u, w), at: at(s.from), speed: 0, status: s.status };
      points.push(p);
      if (s.status === 'stopped' && s.to - s.from > 1 / 6) {
        stops.push(p);
        target = null; // after a stop, a new trip
      }
      continue;
    }
    points.push({ ...pos(u, w), at: at(s.from), speed: 0, status: s.status });
    for (let h = s.from; h < s.to; h += 1 / 60) {
      if (!target || (Math.abs(target[0] - u) < 0.01 && Math.abs(target[1] - w) < 0.01)) {
        target = place() as [number, number];
        uFirst = r() < 0.5;
      }
      const speed =
        s.status === 'overspeed'
          ? v.speedLimit + 5 + r() * 20
          : Math.max(8, avg * (0.7 + r() * 0.6));
      let step = Math.min(1 / 60, s.to - h) * speed; // km in this minute
      const full = step;
      maxSpeed = Math.max(maxSpeed, speed);
      // Drive one leg, then the other (an L along the streets); a point at each corner so the
      // line follows the streets and its length is the distance driven.
      const legs = uFirst ? (['u', 'w'] as const) : (['w', 'u'] as const);
      for (let li = 0; li < 2 && step > 1e-9; li++) {
        const leg = legs[li]!;
        const d = leg === 'u' ? target[0] - u : target[1] - w;
        const move = Math.sign(d) * Math.min(Math.abs(d), step);
        if (leg === 'u') u += move;
        else w += move;
        step -= Math.abs(move);
        distance += Math.abs(move);
        if (li === 0 && move !== 0 && step > 1e-9)
          points.push({
            ...pos(u, w),
            at: at(h + ((full - step) / full) * Math.min(1 / 60, s.to - h)),
            speed: Math.round(speed),
            status: s.status,
          });
      }
      points.push({
        ...pos(u, w),
        at: at(Math.min(s.to, h + 1 / 60)),
        speed: Math.round(speed),
        status: s.status,
      });
    }
  }
  return {
    points,
    stops,
    distance: Math.round(distance * 10) / 10,
    maxSpeed: Math.round(maxSpeed),
    idles: segs.filter((s) => s.status === 'idle').length,
  };
}
