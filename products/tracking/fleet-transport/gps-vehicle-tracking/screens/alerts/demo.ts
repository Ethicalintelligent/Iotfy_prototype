// Demo activity of the original Alerts page (its built-in fake server), applied to the company's
// real vehicles from Neon: live positions (for the current status) and the alert history.
// There is no table for positions or alerts yet, so this is demo data and labelled on screen
// (root CLAUDE.md §8). Same rules, texts and numbers as the original generators.

/* ------------------------------------------------------------------ alert types */

export interface AlertStyle {
  id: string;
  label: string;
  icon: string;
  tone: string;
  about: string;
}

/** The original's alert types (vehicle solution: all but Fake Location). */
const TYPES: AlertStyle[] = [
  {
    id: 'OVERSPEED',
    label: 'Overspeed',
    icon: 'Gauge',
    tone: 'red',
    about: 'Faster than the speed limit',
  },
  {
    id: 'HARSH_BRAKING',
    label: 'Harsh Braking',
    icon: 'OctagonX',
    tone: 'red',
    about: 'Sudden deceleration',
  },
  {
    id: 'HARSH_ACCELERATION',
    label: 'Harsh Driving',
    icon: 'TriangleAlert',
    tone: 'orange',
    about: 'Sudden acceleration',
  },
  {
    id: 'HARSH_CORNERING',
    label: 'Harsh Cornering',
    icon: 'TriangleAlert',
    tone: 'amber',
    about: 'Took a turn too sharply',
  },
  {
    id: 'IDLE',
    label: 'Idle',
    icon: 'Clock',
    tone: 'blue',
    about: 'Engine on without moving for too long',
  },
  {
    id: 'GEOFENCE_ENTER',
    label: 'Geofence Entry',
    icon: 'MapPinned',
    tone: 'teal',
    about: 'Entered a geofence',
  },
  {
    id: 'GEOFENCE_EXIT',
    label: 'Geofence Exit',
    icon: 'MapPinned',
    tone: 'orange',
    about: 'Left a geofence',
  },
  {
    id: 'POWER_CUT',
    label: 'Power Cut',
    icon: 'Zap',
    tone: 'amber',
    about: 'Tracker lost external power',
  },
  {
    id: 'TOWED',
    label: 'Towed',
    icon: 'Truck',
    tone: 'teal',
    about: 'Moved with the ignition off',
  },
  { id: 'SOS', label: 'SOS', icon: 'Siren', tone: 'red', about: 'Panic button pressed' },
  {
    id: 'LOW_BATTERY',
    label: 'Low Battery',
    icon: 'BatteryLow',
    tone: 'amber',
    about: 'Device battery is low',
  },
  {
    id: 'DEVICE_OFFLINE',
    label: 'Device Offline',
    icon: 'WifiOff',
    tone: 'dark',
    about: 'No report for a long time',
  },
];
const BY_ID = new Map(TYPES.map((t) => [t.id, t]));

/** The vehicle event types the original's server adds to the filter list (after the built-in ones). */
const EVENT_TYPES: [string, string][] = [
  ['MOVEMENT', 'Movement'],
  ['STOP', 'Stop'],
  ['ENGINE_STATUS', 'Engine Status'],
  ['SEATBELT', 'Seatbelt'],
  ['WOKEUP', 'WokeUp'],
  ['DRIFT', 'Drift'],
  ['OPERATION_TIME', 'Operation Time'],
  ['PANIC', 'Panic'],
  ['PANEL_ALARM', 'Panel Alarm'],
  ['FATIGUE', 'Fatigue'],
  ['PREVENTIVE_MAINTENANCE', 'Preventive Maintenance'],
  ['SCHEDULED_MAINTENANCE', 'Scheduled Maintenance'],
  ['ANTI_THEFT', 'Anti-Theft'],
  ['BATTERY_DRAIN', 'Battery Drain'],
  ['TEMPERATURE_1', 'Temperature 1'],
  ['TEMPERATURE_2', 'Temperature 2'],
  ['TEMPERATURE_3', 'Temperature 3'],
  ['TEMPERATURE_4', 'Temperature 4'],
  ['BT_TEMPERATURE_1', 'BT Temperature 1'],
  ['BT_TEMPERATURE_2', 'BT Temperature 2'],
  ['BT_TEMPERATURE_3', 'BT Temperature 3'],
  ['BT_TEMPERATURE_4', 'BT Temperature 4'],
  ['DOOR_OPEN', 'Door Open'],
  ['DOOR_OPEN_BACK', 'Door Open (Back)'],
  ['FUEL_FILLING', 'Fuel Filling'],
  ['FUEL_DRAIN', 'Fuel Drain'],
  ['FUEL_MAX_THRESHOLD', 'Fuel Max Threshold'],
  ['FUEL_MIN_THRESHOLD', 'Fuel Min Threshold'],
];

/** Alert names for the filter, in the original's order. */
export const ALERT_NAMES: { id: string; label: string }[] = [
  ...TYPES.map((t) => ({ id: t.id, label: t.label })),
  ...EVENT_TYPES.map(([id, label]) => ({ id, label })),
];

export function alertStyle(type: string): AlertStyle {
  return (
    BY_ID.get(type) ?? {
      id: type,
      label: type
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase()),
      icon: 'Bell',
      tone: 'blue',
      about: '',
    }
  );
}

/* ------------------------------------------------------------------ severity */

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
export type Severity = (typeof SEVERITIES)[number];
export const SEVERITY_TONE: Record<Severity, string> = {
  CRITICAL: 'red',
  HIGH: 'orange',
  MEDIUM: 'amber',
  LOW: 'blue',
};
export const SEVERITY_LABEL: Record<Severity, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export function severityOf(v: string | null | undefined): Severity | null {
  const t = v?.trim().toUpperCase();
  return t && (SEVERITIES as readonly string[]).includes(t) ? (t as Severity) : null;
}

/** Neon alert_configs names that mean one of the page's alert types (other names match by label). */
const CONFIG_ALIASES: Record<string, string> = {
  powercut: 'POWER_CUT',
  notransmission: 'DEVICE_OFFLINE',
  harshacceleration: 'HARSH_ACCELERATION',
};
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
/** Which alert type an alert_configs row's `alert_type` is about. */
export function configType(alertType: string): string | null {
  const key = squash(alertType);
  if (CONFIG_ALIASES[key]) return CONFIG_ALIASES[key];
  return ALERT_NAMES.find((t) => squash(t.label) === key || squash(t.id) === key)?.id ?? null;
}

/* ------------------------------------------------------------------ vehicle status */

export interface Status {
  id: string;
  label: string;
  tone: string;
}
const STATUS: Record<string, Status> = {
  moving: { id: 'moving', label: 'Running', tone: 'green' },
  stopped: { id: 'stopped', label: 'Stopped', tone: 'red' },
  idle: { id: 'idle', label: 'Idle', tone: 'blue' },
  overspeed: { id: 'overspeed', label: 'Overspeed', tone: 'orange' },
  towed: { id: 'towed', label: 'Towed', tone: 'teal' },
  offline: { id: 'offline', label: 'No Transmit', tone: 'dark' },
  never: { id: 'never', label: 'Yet to Transmit', tone: 'gray' },
};
export const NEVER = STATUS.never!;

export interface Position {
  assetId: string;
  ts: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  ignition: boolean;
}

const STALE_MS = 30 * 60 * 1000;
const DEFAULT_LIMIT = 120;

/** The original's status rule: no report in 30 min = No Transmit, then speed and ignition. */
export function statusOf(p: Position, now: number, limitKmh?: number | null): Status {
  const at = Date.parse(p.ts);
  if (now - at > STALE_MS) return STATUS.offline!;
  const speed = p.speed ?? 0;
  const limit = limitKmh && limitKmh > 0 ? limitKmh : DEFAULT_LIMIT;
  if (speed >= 5) {
    if (p.ignition === false) return STATUS.towed!;
    return speed > limit ? STATUS.overspeed! : STATUS.moving!;
  }
  return p.ignition === false ? STATUS.stopped! : STATUS.idle!;
}

/* ------------------------------------------------------------------ generators */

/** Centre of the original's demo fleet (Riyadh). */
export const CENTER = { lat: 24.7136, lng: 46.6753 };
/** The original's demo geofence names, used when the company has none in Neon. */
export const DEMO_FENCES = [
  'Head Office',
  'North Depot',
  'Industrial Area 2',
  'Customer Zone East',
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0 || 1;
}
/** The original's seeded random numbers (Park–Miller), seeded per vehicle so it stays stable. */
export function seeded(seed: string) {
  let n = hash(seed) % 2147483647 || 1;
  return () => ((n = (n * 16807) % 2147483647) - 1) / 2147483646;
}

/** First live position of a vehicle (the original's start state). */
export function startPosition(assetId: string, now = Date.now()): Position {
  const r = seeded(`pos:${assetId}`);
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
  };
}

/** One tick of the original's live feed: up to 5 recently reporting vehicles move on. */
export function step(positions: Map<string, Position>, now = Date.now()): Map<string, Position> {
  const fresh = [...positions.values()].filter((p) => now - Date.parse(p.ts) < 10 * 60_000);
  if (!fresh.length) return positions;
  const next = new Map(positions);
  for (let i = 0; i < Math.min(5, fresh.length); i++) {
    const p = fresh[Math.floor(Math.random() * fresh.length)]!;
    const speed =
      Math.random() < 0.15 ? 0 : Math.max(0, (p.speed ?? 0) + (Math.random() - 0.45) * 18);
    const heading = ((p.heading ?? 0) + (Math.random() - 0.5) * 40 + 360) % 360;
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

export interface DemoAlert {
  id: string;
  assetId: string;
  type: string;
  ts: string;
  lat: number;
  lng: number;
  speed: number;
  message: string | null;
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

/**
 * The original's alert history: for each vehicle with a tracker, 0–3 alerts today and 0–2 on each
 * of the 29 days before, between 06:00 and 21:00, never in the future. Newest first.
 */
export function alertHistory(
  assetIds: string[],
  fences: string[],
  midnight: Date,
  now = Date.now(),
): DemoAlert[] {
  const names = fences.length ? fences : DEMO_FENCES;
  const out: DemoAlert[] = [];
  const day = midnight.toISOString().slice(0, 10);
  for (const assetId of assetIds) {
    const r = seeded(`alerts:${assetId}:${day}`);
    const pick = <T>(list: T[]) => list[Math.floor(r() * list.length)]!;
    const messages: Record<string, () => string> = {
      OVERSPEED: () => `${125 + Math.floor(r() * 30)} km/h in a 120 km/h limit`,
      IDLE: () => `Engine on, not moving for ${10 + Math.floor(r() * 40)} min`,
      GEOFENCE_ENTER: () => `Entered ${pick(names)}`,
      GEOFENCE_EXIT: () => `Left ${pick(names)}`,
      POWER_CUT: () => 'External power disconnected',
      DEVICE_OFFLINE: () => `No report for ${2 + Math.floor(r() * 10)} h`,
    };
    for (let d = 0; d < 30; d++) {
      const count = Math.floor(r() * (d === 0 ? 4 : 2.4));
      for (let k = 0; k < count; k++) {
        const type = pick(ALERT_TYPES);
        const at = midnight.getTime() - d * 86_400_000 + (6 + r() * 15) * 3_600_000;
        const lat = +(CENTER.lat + (r() - 0.5) * 0.25).toFixed(6);
        const lng = +(CENTER.lng + (r() - 0.5) * 0.3).toFixed(6);
        const speed =
          type === 'OVERSPEED'
            ? 125 + Math.round(r() * 30)
            : type === 'IDLE' || type === 'POWER_CUT'
              ? 0
              : Math.round(r() * 80);
        const message = messages[type]?.() ?? null;
        if (at > now) continue;
        out.push({
          id: `${assetId}-${d}-${k}`,
          assetId,
          type,
          ts: new Date(at).toISOString(),
          lat,
          lng,
          speed,
          message,
        });
      }
    }
  }
  return out.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
}
