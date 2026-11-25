// IT-0036. Demo activity for Centralized Tracking, ported from the original page's built-in demo
// generator (Centralized-Tracking.html, removed in IT-0037 (git history)) but applied to the company's real vehicles
// from Neon. Live positions, telemetry, history tracks and alerts have no table yet, so they are
// generated here and labelled "Demo data" on screen (root CLAUDE.md §8).
import { useSyncExternalStore } from 'react';

/* ------------------------------------------------------------------ status vocabulary */

export type StatusId = 'moving' | 'stopped' | 'idle' | 'overspeed' | 'towed' | 'offline' | 'never';
export interface Status {
  id: StatusId;
  label: string;
  tone: string;
  icon: string;
  about: string;
}

export const STATUS: Record<StatusId, Status> = {
  moving: {
    id: 'moving',
    label: 'Running',
    tone: 'green',
    icon: 'Play',
    about: 'Moving at a normal speed',
  },
  stopped: { id: 'stopped', label: 'Stopped', tone: 'red', icon: 'Square', about: 'Ignition off' },
  idle: {
    id: 'idle',
    label: 'Idle',
    tone: 'blue',
    icon: 'Clock',
    about: 'Not moving, not switched off',
  },
  overspeed: {
    id: 'overspeed',
    label: 'Overspeed',
    tone: 'orange',
    icon: 'Gauge',
    about: 'Above the speed limit now',
  },
  towed: {
    id: 'towed',
    label: 'Towed',
    tone: 'teal',
    icon: 'Truck',
    about: 'Moving with the ignition off',
  },
  offline: {
    id: 'offline',
    label: 'No Transmit',
    tone: 'dark',
    icon: 'WifiOff',
    about: 'No report in 24 h',
  },
  never: {
    id: 'never',
    label: 'Yet to Transmit',
    tone: 'gray',
    icon: 'Hourglass',
    about: 'No position received yet',
  },
};

/** A report older than this makes the vehicle "No Transmit". */
const STALE_MS = 30 * 60 * 1000;
/** Gaps longer than this split trips and stops. */
export const GAP_MS = 10 * 60 * 1000;
/** Below this speed (km/h) the vehicle is not moving. */
export const MOVING_KMH = 5;
const DEFAULT_LIMIT = 120;

export interface Profile {
  ignition: boolean;
  overspeed: boolean;
  overspeedKmh: number;
  order: StatusId[];
  thumb: string;
}

export const PROFILE: Profile = {
  ignition: true,
  overspeed: true,
  overspeedKmh: DEFAULT_LIMIT,
  order: ['moving', 'stopped', 'idle', 'overspeed', 'towed', 'offline', 'never'],
  thumb: 'Truck',
};

/** The profile with a vehicle's own speed limit (Neon vehicle_details.speed_limit_kmh). */
export function profileFor(limit: number | null | undefined): Profile {
  return limit != null && limit > 0 && limit !== PROFILE.overspeedKmh
    ? { ...PROFILE, overspeedKmh: limit }
    : PROFILE;
}

/* ------------------------------------------------------------------ random */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0 || 1;
}
function seeded(seed: string) {
  let n = hash(seed) % 2147483647 || 1;
  return () => ((n = (n * 16807) % 2147483647) - 1) / 2147483646;
}
/** Stable 0..1 value per vehicle and key, changing every `period` ms (0 = never). */
function stable(id: string, key: string, period = 0) {
  const r = `${id}|${key}|${period ? Math.floor(Date.now() / period) : 0}`;
  return (hash(r) % 1e4) / 1e4;
}

/* ------------------------------------------------------------------ live positions */

const CENTER = { lat: 24.7136, lng: 46.6753 };
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
  speed: number | null;
  heading: number | null;
  ignition: boolean | null;
  locationName?: string;
}

function firstPosition(id: string): Position {
  const r = seeded(`pos:${id}`);
  const t = r();
  const old = t < 0.12;
  const moving = !old && t < 0.6;
  return {
    assetId: id,
    ts: new Date(Date.now() - (old ? (25 + r() * 23) * 36e5 : r() * 9e4)).toISOString(),
    lat: CENTER.lat + (r() - 0.5) * 0.25,
    lng: CENTER.lng + (r() - 0.5) * 0.3,
    speed: moving ? 20 + r() * 95 + (r() < 0.15 ? 30 : 0) : 0,
    heading: Math.round(r() * 359),
    ignition: moving || r() < 0.4,
    locationName: PLACES[Math.floor(r() * PLACES.length)],
  };
}

const positions = new Map<string, Position>();
let version = 0;
const listeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | null = null;
const tickRandom = seeded('ticks');

/** Same as the original's socket simulation: every 3 s up to 5 fresh vehicles move on. */
function tick() {
  const now = Date.now();
  const fresh = [...positions.values()].filter((p) => now - Date.parse(p.ts) < 10 * 6e4);
  if (!fresh.length) return;
  for (let i = 0; i < Math.min(5, fresh.length); i++) {
    const p = fresh[Math.floor(tickRandom() * fresh.length)]!;
    const speed =
      tickRandom() < 0.15 ? 0 : Math.max(0, (p.speed ?? 0) + (tickRandom() - 0.45) * 18);
    const heading = ((p.heading ?? 0) + (tickRandom() - 0.5) * 40 + 360) % 360;
    const step = ((speed / 3600) * 3) / 111;
    positions.set(p.assetId, {
      ...p,
      ts: new Date(now).toISOString(),
      speed: Math.round(speed * 10) / 10,
      heading: Math.round(heading),
      lat: p.lat + Math.cos((heading * Math.PI) / 180) * step,
      lng: p.lng + Math.sin((heading * Math.PI) / 180) * step,
      ignition: speed > 0 || tickRandom() < 0.5,
    });
  }
  version++;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  ticker ??= setInterval(tick, 3000);
  return () => {
    listeners.delete(l);
    if (!listeners.size && ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  };
}

/** Vehicles that report: those with a tracker in Neon (every 11th stays "Yet to Transmit", as in the original). */
export function usePositions(reporting: string[]): Map<string, Position> {
  for (const id of reporting) if (!positions.has(id)) positions.set(id, firstPosition(id));
  useSyncExternalStore(subscribe, () => version);
  const out = new Map<string, Position>();
  for (const id of reporting) out.set(id, positions.get(id)!);
  return out;
}
export const currentPosition = (id: string) => positions.get(id);

/** Re-render every 5 s, so "No Transmit" follows the clock (original: H9). */
const clockListeners = new Set<() => void>();
let clock = Date.now();
let clockTimer: ReturnType<typeof setInterval> | null = null;
export function useNow() {
  return useSyncExternalStore(
    (l) => {
      clockListeners.add(l);
      clockTimer ??= setInterval(() => {
        clock = Date.now();
        clockListeners.forEach((f) => f());
      }, 5000);
      return () => {
        clockListeners.delete(l);
        if (!clockListeners.size && clockTimer) {
          clearInterval(clockTimer);
          clockTimer = null;
        }
      };
    },
    () => clock,
  );
}

export function statusOf(p: Position, now: number, profile: Profile): Status {
  const at = Date.parse(p.ts);
  if (now - at > STALE_MS) return STATUS.offline;
  const speed = now - at > STALE_MS ? 0 : (p.speed ?? 0);
  if (speed >= MOVING_KMH)
    return profile.ignition && p.ignition === false
      ? STATUS.towed
      : profile.overspeed && p.ignition != null && speed > profile.overspeedKmh
        ? STATUS.overspeed
        : STATUS.moving;
  return profile.ignition && p.ignition === false ? STATUS.stopped : STATUS.idle;
}

/* ------------------------------------------------------------------ history */

export interface TrackPoint {
  ts: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number | null;
  ignition: boolean;
  flags: number;
}

function dayTrack(id: string, dayStart: number): TrackPoint[] {
  const r = seeded(`${id}:${dayStart}`);
  const out: TrackPoint[] = [];
  const push = (
    t: number,
    lat: number,
    lng: number,
    speed: number,
    heading: number | null,
    ign: boolean,
  ) =>
    out.push({
      ts: new Date(t).toISOString(),
      lat: +lat.toFixed(6),
      lng: +lng.toFixed(6),
      speed: Math.round(speed * 10) / 10,
      heading: heading == null ? null : Math.round(heading),
      ignition: ign,
      flags: 0,
    });
  let lat = CENTER.lat + (r() - 0.5) * 0.2;
  let lng = CENTER.lng + (r() - 0.5) * 0.25;
  let t = dayStart + (6.5 + r() * 1.5) * 36e5;
  const end = dayStart + (19 + r() * 2) * 36e5;
  const trips = 2 + Math.floor(r() * 4);
  if (r() < 0.12) return [];
  for (let k = 0; k < trips && t < end; k++) {
    const park = (20 + r() * 90) * 6e4;
    for (let s = 0; s < park; s += 5 * 6e4) push(t + s, lat, lng, 0, null, s > park - 10 * 6e4);
    t += park;
    let heading = r() * 360;
    const minutes = 15 + r() * 55;
    const cruise = 35 + r() * 60;
    for (let s = 0; s < minutes * 2; s++) {
      heading = (heading + (r() - 0.5) * 35 + 360) % 360;
      const speed = Math.max(8, cruise + (r() - 0.5) * 30 + (r() < 0.02 ? 45 : 0));
      const step = ((speed / 3600) * 30) / 111;
      lat += Math.cos((heading * Math.PI) / 180) * step;
      lng += Math.sin((heading * Math.PI) / 180) * step;
      push(t, lat, lng, speed, heading, true);
      t += 3e4;
    }
  }
  return out;
}

/** The day's track points between `from` and `to` (original: TB). Today's track ends at the live position. */
export function historyPoints(id: string, from: number, to: number): TrackPoint[] {
  const out: TrackPoint[] = [];
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);
  const now = Date.now();
  for (let d = day.getTime(); d < to; d += 864e5) {
    let pts = dayTrack(id, d).filter((p) => Date.parse(p.ts) <= now);
    const live = positions.get(id);
    if (d <= now && now < d + 864e5 && live && pts.length) {
      const last = pts[pts.length - 1]!;
      const dLat = live.lat - last.lat;
      const dLng = live.lng - last.lng;
      pts = pts.map((p) => ({
        ...p,
        lat: +(p.lat + dLat).toFixed(6),
        lng: +(p.lng + dLng).toFixed(6),
      }));
    }
    out.push(...pts.filter((p) => Date.parse(p.ts) >= from && Date.parse(p.ts) < to));
  }
  return out;
}

/* ------------------------------------------------------------------ alerts */

export interface DemoAlert {
  id: string;
  assetId: string;
  type: string;
  ts: string;
  lat: number;
  lng: number;
  speed: number;
  message: string | null;
  severity?: string;
}

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

const alertCache = new Map<string, DemoAlert[]>();
/** The vehicle's alerts of the last 30 days, newest first (original: Ly). */
export function alertsOf(id: string): DemoAlert[] {
  const hit = alertCache.get(id);
  if (hit) return hit;
  const r = seeded(`alerts:${id}`);
  const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  const message: Record<string, () => string> = {
    OVERSPEED: () => `${125 + Math.floor(r() * 30)} km/h in a 120 km/h limit`,
    IDLE: () => `Engine on, not moving for ${10 + Math.floor(r() * 40)} min`,
    GEOFENCE_ENTER: () => `Entered ${pick(ZONES)}`,
    GEOFENCE_EXIT: () => `Left ${pick(ZONES)}`,
    POWER_CUT: () => 'External power disconnected',
    DEVICE_OFFLINE: () => `No report for ${2 + Math.floor(r() * 10)} h`,
  };
  const out: DemoAlert[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let d = 0; d < 30; d++) {
    const n = Math.floor(r() * (d === 0 ? 4 : 2.4));
    for (let k = 0; k < n; k++) {
      const type = pick(ALERT_TYPES)!;
      const t = today.getTime() - d * 864e5 + (6 + r() * 15) * 36e5;
      if (t > Date.now()) continue;
      out.push({
        id: `${id}-al-${d}-${k}`,
        assetId: id,
        type,
        ts: new Date(t).toISOString(),
        lat: +(CENTER.lat + (r() - 0.5) * 0.25).toFixed(6),
        lng: +(CENTER.lng + (r() - 0.5) * 0.3).toFixed(6),
        speed:
          type === 'OVERSPEED'
            ? 125 + Math.round(r() * 30)
            : type === 'IDLE' || type === 'POWER_CUT'
              ? 0
              : Math.round(r() * 80),
        message: message[type]?.() ?? null,
      });
    }
  }
  out.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  alertCache.set(id, out);
  return out;
}

/* ------------------------------------------------------------------ telemetry */

export interface Telemetry {
  odometerKm: number | null;
  gps: boolean | null;
  satellites: number | null;
  gsm: number | null;
  internalBattery: string | null;
  internalBatteryMv: number | null;
  externalPower: boolean | null;
  externalPowerV: number | null;
  engine: boolean | null;
  ac: boolean | null;
  seatbelt: boolean | null;
  frontDoor: boolean | null;
  backDoor: boolean | null;
  inputs: string[];
}

/** Sensor readings (original: G1). `index` = the vehicle's place in the fleet (decides its fitted sensors). */
export function telemetryOf(
  id: string,
  index: number,
  odometerKm: number | null,
): Telemetry | undefined {
  const p = positions.get(id);
  const has = !!p;
  const ign = p?.ignition ?? null;
  const inputs =
    index % 3 === 0
      ? ['ENGINE', 'AC', 'SEATBELT', 'FRONT_DOOR']
      : index % 5 === 2
        ? ['ENGINE', 'FRONT_DOOR', 'BACK_DOOR']
        : [];
  const read: Record<string, boolean | null> = has
    ? {
        ENGINE: ign,
        AC: !!ign && stable(id, 'ac', 6e4) < 0.7,
        SEATBELT:
          (p!.speed ?? 0) > 0 ? stable(id, 'belt', 6e4) < 0.85 : stable(id, 'belt', 6e4) < 0.3,
        FRONT_DOOR: (p!.speed ?? 0) === 0 && stable(id, 'door1', 6e4) < 0.35,
        BACK_DOOR: (p!.speed ?? 0) === 0 && stable(id, 'door2', 6e4) < 0.25,
      }
    : {};
  const input = (k: string) => (inputs.includes(k) ? (read[k] ?? null) : null);
  const ext = has ? stable(id, 'ext', 6e5) > 0.08 : null;
  return {
    odometerKm: has ? (odometerKm ?? 0) + Math.round(stable(id, 'km') * 900) : odometerKm || null,
    gps: has ? stable(id, 'gps', 3e5) > 0.1 : null,
    satellites: has ? 4 + Math.floor(stable(id, 'sat', 6e4) * 10) : null,
    gsm: has ? Math.floor(stable(id, 'gsm', 3e5) * 6) : null,
    internalBattery: has
      ? ['Very High', 'High', 'High', 'Medium', 'Low'][Math.floor(stable(id, 'bat', 6e5) * 5)]!
      : null,
    internalBatteryMv: null,
    externalPower: ext,
    externalPowerV: ext ? Math.round((12.2 + stable(id, 'v', 6e4) * 1.6) * 100) / 100 : null,
    engine: inputs.includes('ENGINE') ? input('ENGINE') : ign,
    ac: input('AC'),
    seatbelt: input('SEATBELT'),
    frontDoor: input('FRONT_DOOR'),
    backDoor: input('BACK_DOOR'),
    inputs,
  };
}

export interface Sensor {
  key: string;
  label: string;
  icon: string;
  tone: string;
  state: 'active' | 'inactive' | 'unavailable';
  value: string;
}

const none = (key: string, label: string, icon: string, value = 'No data'): Sensor => ({
  key,
  label,
  icon,
  tone: 'gray',
  state: 'unavailable',
  value,
});
const on = (key: string, label: string, icon: string, tone: string, value: string): Sensor => ({
  key,
  label,
  icon,
  tone,
  state: 'active',
  value,
});
const off = (key: string, label: string, icon: string, tone: string, value: string): Sensor => ({
  key,
  label,
  icon,
  tone,
  state: 'inactive',
  value,
});
const fmt = (n: number, d = 1) =>
  Number(n.toFixed(d)).toLocaleString('en-IN', { maximumFractionDigits: d });

function batteryTone(level: string | null, mv: number | null) {
  if (level) {
    const l = level.trim().toLowerCase();
    return l === 'very high' || l === 'high' || l === 'full'
      ? 'green'
      : l === 'medium'
        ? 'orange'
        : l === 'low' || l === 'very low'
          ? 'red'
          : 'gray';
  }
  return mv == null ? null : mv >= 3700 ? 'green' : mv >= 3400 ? 'orange' : 'red';
}
const BATTERY_ICON: Record<string, string> = {
  green: 'BatteryFull',
  orange: 'BatteryMedium',
  red: 'BatteryLow',
};

/** The sensor list of the track card (original: uA). */
export function sensorsOf(t: Telemetry, ignition: boolean | null): Sensor[] {
  const has = (k: string) => t.inputs.includes(k);
  const engine = t.engine ?? ignition;
  const gps =
    t.gps == null
      ? none('gps', 'GPS', 'LocateFixed')
      : t.gps
        ? on(
            'gps',
            'GPS',
            'LocateFixed',
            'green',
            `Available${t.satellites != null ? ` · ${t.satellites} satellites` : ''}`,
          )
        : off('gps', 'GPS', 'LocateFixed', 'red', 'Not available');
  const gsm =
    t.gsm == null
      ? none('gsm', 'GSM', 'RadioTower')
      : t.gsm >= 3
        ? on('gsm', 'GSM', 'RadioTower', 'green', `Strong signal (${t.gsm}/5)`)
        : t.gsm >= 1
          ? on('gsm', 'GSM', 'RadioTower', 'orange', `Weak signal (${t.gsm}/5)`)
          : off('gsm', 'GSM', 'RadioTower', 'red', 'No signal (0/5)');
  const bt = batteryTone(t.internalBattery, t.internalBatteryMv);
  const btText = [
    t.internalBattery,
    t.internalBatteryMv != null ? `${fmt(t.internalBatteryMv / 1e3, 2)} V` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const battery =
    bt == null
      ? none('internalBattery', 'Internal Battery', 'BatteryMedium')
      : (bt === 'red' ? off : on)(
          'internalBattery',
          'Internal Battery',
          BATTERY_ICON[bt] ?? 'BatteryMedium',
          bt,
          btText,
        );
  const ext =
    t.externalPower == null
      ? none('externalBattery', 'External Battery', 'BatteryCharging')
      : t.externalPower
        ? on(
            'externalBattery',
            'External Battery',
            'BatteryCharging',
            'green',
            `Connected${t.externalPowerV != null ? ` · ${fmt(t.externalPowerV, 2)} V` : ''}`,
          )
        : off('externalBattery', 'External Battery', 'BatteryCharging', 'red', 'Disconnected');
  const input = (
    input: string,
    key: string,
    label: string,
    v: boolean | null,
    yes: [string, string, string],
    no: [string, string, string],
  ) =>
    has(input)
      ? v == null
        ? none(key, label, yes[0])
        : v
          ? on(key, label, ...yes)
          : off(key, label, ...no)
      : none(key, label, yes[0], 'Not configured');
  return [
    gps,
    gsm,
    battery,
    ext,
    input('AC', 'ac', 'AC', t.ac, ['Snowflake', 'blue', 'On'], ['Snowflake', 'gray', 'Off']),
    input(
      'SEATBELT',
      'seatbelt',
      'Seatbelt',
      t.seatbelt,
      ['Armchair', 'green', 'Fastened'],
      ['Armchair', engine ? 'red' : 'gray', 'Unfastened'],
    ),
    input(
      'FRONT_DOOR',
      'frontDoor',
      'Front Door',
      t.frontDoor,
      ['DoorOpen', 'orange', 'Open'],
      ['DoorClosed', 'gray', 'Closed'],
    ),
    input(
      'BACK_DOOR',
      'backDoor',
      'Back Door',
      t.backDoor,
      ['DoorOpen', 'orange', 'Open'],
      ['DoorClosed', 'gray', 'Closed'],
    ),
    engine == null
      ? none('engine', 'Engine', 'KeyRound')
      : engine
        ? on('engine', 'Engine', 'KeyRound', 'green', 'On')
        : off('engine', 'Engine', 'KeyRound', 'red', 'Off'),
  ];
}
