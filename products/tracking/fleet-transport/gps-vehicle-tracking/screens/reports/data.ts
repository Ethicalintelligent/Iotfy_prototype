// Shared pieces of the reports: the period (a day or up to 31 days), date and time formats
// (12- or 24-hour), a vehicle's day from the demo generator (cached while a report is built),
// place names, engine-on sessions and small number helpers. Pure functions, unit-tested.
import {
  AREAS,
  addDays,
  alertEvents,
  dayKey,
  dayRoute,
  dayStats,
  dayTimeline,
  distanceM,
  startOfDay,
  type AlertEvent,
  type DayRoute,
  type DayStats,
  type LiveVehicle,
  type RoutePoint,
  type Segment,
} from '../../demo/fleet';
import { ALERT, type AlertKind } from '../../shared/vehicle-status';
import { fenceContains, type Fence } from '../../shared/useFleet';

const DAY_MS = 86_400_000;
const HOUR = 3_600_000;
const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
export const ALL_ALERTS = Object.keys(ALERT) as AlertKind[];

// ---------------------------------------------------------------- period
export type QuickRange = 'today' | 'yesterday' | '7d' | '30d';
export const QUICK_RANGES: { key: QuickRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
];
/** The longest period a report covers. */
export const MAX_DAYS = 31;

/** A period as ISO dates (yyyy-mm-dd), both included. */
export interface Period {
  from: string;
  to: string;
}

export const iso = (d: Date) => dayKey(d);
export const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
};

export function quickPeriod(range: QuickRange, now: Date): Period {
  const today = startOfDay(now);
  switch (range) {
    case 'today':
      return { from: iso(today), to: iso(today) };
    case 'yesterday':
      return { from: iso(addDays(today, -1)), to: iso(addDays(today, -1)) };
    case '7d':
      return { from: iso(addDays(today, -6)), to: iso(today) };
    case '30d':
      return { from: iso(addDays(today, -29)), to: iso(today) };
  }
}

/** The quick range a period matches, if any. */
export function quickOf(p: Period, now: Date): QuickRange | null {
  return (
    QUICK_RANGES.map((q) => q.key).find((k) => {
      const q = quickPeriod(k, now);
      return q.from === p.from && q.to === p.to;
    }) ?? null
  );
}

/** Days in a period. */
export const spanDays = (p: Period) =>
  Math.round((fromIso(p.to).getTime() - fromIso(p.from).getTime()) / DAY_MS) + 1;

/** Why a period can't be used, or null. */
export function periodProblem(p: Period, now: Date): string | null {
  if (!p.from || !p.to) return 'Choose a from date and a to date.';
  if (p.to < p.from) return 'The to date is before the from date.';
  if (p.to > iso(now)) return 'The period cannot end after today.';
  if (spanDays(p) > MAX_DAYS) return `Choose at most ${MAX_DAYS} days.`;
  return null;
}

/** The days of a period, oldest first. */
export function periodDays(p: Period): Date[] {
  const start = fromIso(p.from);
  return Array.from({ length: spanDays(p) }, (_, i) => addDays(start, i));
}

/** "22 Nov 2026", "16 – 22 Nov 2026", "28 Oct – 3 Nov 2026". */
export function periodText(p: Period): string {
  const a = fromIso(p.from);
  const b = fromIso(p.to);
  const d = (x: Date) => `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
  if (p.from === p.to) return d(a);
  if (a.getFullYear() !== b.getFullYear()) return `${d(a)} – ${d(b)}`;
  if (a.getMonth() !== b.getMonth()) return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${d(b)}`;
  return `${a.getDate()} – ${d(b)}`;
}

/** Whole days between a day and today (0 = today). */
export const daysAgo = (day: Date, now: Date) =>
  Math.round((startOfDay(now).getTime() - startOfDay(day).getTime()) / DAY_MS);

// ---------------------------------------------------------------- formats
export interface Formatter {
  hour12: boolean;
  /** "22 Nov 2026" */
  date: (d: Date) => string;
  /** "05:12 PM" or "17:12" */
  time: (d: Date) => string;
  /** "22 Nov 2026, 05:12 PM" */
  dateTime: (d: Date) => string;
}

export function formatter(hour12: boolean): Formatter {
  const date = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const time = (d: Date) => {
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    if (!hour12) return `${String(h).padStart(2, '0')}:${m}`;
    return `${String(h % 12 || 12).padStart(2, '0')}:${m} ${h < 12 ? 'AM' : 'PM'}`;
  };
  return { hour12, date, time, dateTime: (d) => `${date(d)}, ${time(d)}` };
}

/** "5h 24m", "14m", "0s" (from hours). */
export function dur(hours: number): string {
  const m = Math.round(hours * 60);
  if (m <= 0) return '0s';
  const h = Math.floor(m / 60);
  return h ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
}
/** "1d 0h", "2d 14h" for available hours. */
export function daysHours(hours: number): string {
  const h = Math.round(hours);
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
/** "62.5 km" (one decimal, none when whole). */
export const kmText = (km: number) => `${(Math.round(km * 10) / 10).toLocaleString('en-US')} km`;
/** "24.750071, 46.698436" */
export const latLng = (p: { lat: number; lng: number } | null | undefined) =>
  p ? `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}` : '—';
/** One decimal. */
export const one = (n: number) => Math.round(n * 10) / 10;

/** A Date at `hours` after the start of `day`. */
export const at = (day: Date, hours: number) => new Date(startOfDay(day).getTime() + hours * HOUR);

// ---------------------------------------------------------------- places
/** The geofence the point is in, else the nearest district. */
export function placeName(p: { lat: number; lng: number }, fences: Fence[]): string {
  const f = fences.find((x) => x.active && fenceContains(x, p.lat, p.lng));
  if (f) return f.name;
  let best: string = AREAS[0].name;
  let d = Infinity;
  for (const a of AREAS) {
    const x = distanceM([a.lat, a.lng], [p.lat, p.lng]);
    if (x < d) {
      d = x;
      best = a.name;
    }
  }
  return best;
}

// ---------------------------------------------------------------- a vehicle's day
export interface DayData {
  /** The day (start of it). */
  date: Date;
  segments: Segment[];
  stats: DayStats;
  route: DayRoute;
  alerts: AlertEvent[];
}

/**
 * A vehicle's day from the demo generator, like `useFleet().day` plus its route and alerts.
 * Cached per vehicle and day while one report is built. Never-reported vehicles have nothing.
 */
export function dayCache(now: Date): (v: LiveVehicle, day: Date) => DayData {
  const cache = new Map<string, DayData>();
  return (v, day) => {
    const date = startOfDay(day);
    const k = v.id + '|' + iso(date);
    const hit = cache.get(k);
    if (hit) return hit;
    const today = daysAgo(date, now) === 0;
    let out: DayData;
    if (v.status === 'ytt' || date > now) {
      out = {
        date,
        segments: [],
        stats: dayStats([], v, date),
        route: { points: [], stops: [], distance: 0, maxSpeed: 0, idles: 0 },
        alerts: [],
      };
    } else {
      const segments = today ? dayTimeline(v, now, v.status) : dayTimeline(v, date);
      out = {
        date,
        segments,
        stats: dayStats(segments, v, today ? now : date),
        route: today ? dayRoute(v, now, v.status) : dayRoute(v, date),
        alerts: alertEvents([v], date, ALL_ALERTS, now),
      };
    }
    cache.set(k, out);
    return out;
  };
}

/** Where the vehicle was at a time of the day (the last route point before it). */
export function pointAt(route: DayRoute, t: Date): RoutePoint | null {
  let best: RoutePoint | null = route.points[0] ?? null;
  for (const p of route.points) {
    if (p.at.getTime() <= t.getTime()) best = p;
    else break;
  }
  return best;
}

/** Route points between two times. */
export const pointsBetween = (route: DayRoute, from: Date, to: Date) =>
  route.points.filter((p) => p.at >= from && p.at <= to);

/** km driven along the route between two times. */
export function kmBetween(route: DayRoute, from: Date, to: Date): number {
  const pts = pointsBetween(route, from, to);
  let m = 0;
  for (let i = 1; i < pts.length; i++)
    m += distanceM([pts[i - 1]!.lat, pts[i - 1]!.lng], [pts[i]!.lat, pts[i]!.lng]);
  return m / 1000;
}

const moving = (s: Segment) => s.status === 'running' || s.status === 'overspeed';
const engineOn = (s: Segment) => moving(s) || s.status === 'idle';

export interface Session {
  /** Hours from midnight. */
  from: number;
  to: number;
  running: number;
  idle: number;
  segments: Segment[];
}

/** Engine-on sessions (ignition on to off): runs of running, overspeed and idle segments. */
export function sessions(segments: Segment[]): Session[] {
  const out: Session[] = [];
  let cur: Session | null = null;
  for (const s of segments) {
    if (!engineOn(s)) {
      cur = null;
      continue;
    }
    if (!cur || Math.abs(cur.to - s.from) > 0.001) {
      cur = { from: s.from, to: s.to, running: 0, idle: 0, segments: [] };
      out.push(cur);
    }
    cur.to = s.to;
    cur.segments.push(s);
    if (moving(s)) cur.running += s.to - s.from;
    else cur.idle += s.to - s.from;
  }
  // A session that never moves is not a trip or an engine run worth listing.
  return out.filter((x) => x.running > 0);
}

/** First and last segment times of a day (hours), or null. */
export function span(segments: Segment[]): { from: number; to: number } | null {
  if (!segments.length) return null;
  return { from: segments[0]!.from, to: segments[segments.length - 1]!.to };
}

/** Hours per kind of a day's stats. */
export function hoursOf(stats: DayStats) {
  const h = stats.hours;
  return {
    running: h.running + h.overspeed,
    idle: h.idle,
    stopped: h.stopped,
    towed: h.towed,
    engine: h.running + h.overspeed + h.idle,
  };
}

/** A number condition, or the fallback when it isn't set. */
export function num(cond: Record<string, string>, key: string, fallback: number): number {
  const v = cond[key];
  if (v == null || v.trim() === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** "Truck01-20261122-1" */
export const tripId = (callSign: string, day: Date, n: number) =>
  `${callSign.replace(/\s+/g, '')}-${iso(day).replace(/-/g, '')}-${n}`;
