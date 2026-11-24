// Tracking screen logic (pure, unit-tested): today's route moved onto the live position, a past
// day's route, time per status up to a moment of the day, the odometer along a route and the
// day picker. Routes are demo activity (see ../../demo/fleet).
import {
  addDays,
  dayRoute,
  distanceM,
  startOfDay,
  type DayRoute,
  type LiveVehicle,
  type RoutePoint,
  type Segment,
} from '../../demo/fleet';
import { shortDate } from '../../shared/format';

const EMPTY: DayRoute = { points: [], stops: [], distance: 0, maxSpeed: 0, idles: 0 };
const HOUR = 3_600_000;

/** The date `daysAgo` days before `now` (today: `now` itself, so the day runs up to now). */
export const dayOf = (now: Date, daysAgo: number) =>
  daysAgo === 0 ? now : addDays(startOfDay(now), -daysAgo);

/**
 * Today's route so far, moved as a whole so that its last point is where the vehicle is now
 * (the live position and the route are generated separately). None for a vehicle that never
 * reported.
 */
export function liveRoute(v: LiveVehicle, now: Date): DayRoute {
  if (v.status === 'ytt') return EMPTY;
  const r = dayRoute(v, now, v.status);
  const last = r.points[r.points.length - 1];
  if (!last) return r;
  const dLat = v.lat - last.lat;
  const dLng = v.lng - last.lng;
  const move = (p: RoutePoint): RoutePoint => ({ ...p, lat: p.lat + dLat, lng: p.lng + dLng });
  return { ...r, points: r.points.map(move), stops: r.stops.map(move) };
}

/** The route of a day (0 = today, up to now and ending at the live position). */
export function historyRoute(v: LiveVehicle, now: Date, daysAgo: number): DayRoute {
  if (v.status === 'ytt') return EMPTY;
  return daysAgo === 0 ? liveRoute(v, now) : dayRoute(v, dayOf(now, daysAgo));
}

export interface StatusHours {
  running: number;
  stopped: number;
  idle: number;
}

/** Hours running (overspeed included), stopped and idle in a day's segments up to `at`. */
export function hoursUpTo(segs: Segment[], at?: Date): StatusHours {
  const t = at ? (at.getTime() - startOfDay(at).getTime()) / HOUR : Infinity;
  const out: StatusHours = { running: 0, stopped: 0, idle: 0 };
  for (const s of segs) {
    const h = Math.max(0, Math.min(s.to, t) - s.from);
    if (s.status === 'running' || s.status === 'overspeed') out.running += h;
    else if (s.status === 'stopped') out.stopped += h;
    else if (s.status === 'idle') out.idle += h;
  }
  return out;
}

/** km driven from the start of the route to each point. */
export function cumulativeKm(points: RoutePoint[]): number[] {
  const out: number[] = [];
  let km = 0;
  points.forEach((p, i) => {
    const prev = points[i - 1];
    if (prev) km += distanceM([prev.lat, prev.lng], [p.lat, p.lng]) / 1000;
    out.push(km);
  });
  return out;
}

/**
 * The odometer at point `i` of a route: the odometer at the end of that day minus what was
 * driven after the point.
 */
export function odometerAt(dayEndOdometer: number, cum: number[], i: number): number {
  const total = cum[cum.length - 1] ?? 0;
  return Math.round(dayEndOdometer - (total - (cum[i] ?? total)));
}

/** The history day picker: Today, Yesterday, then dates, for the last 7 days. */
export function dayOptions(now: Date): { value: string; label: string }[] {
  return [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    value: String(d),
    label: d === 0 ? 'Today' : d === 1 ? 'Yesterday' : shortDate(dayOf(now, d)),
  }));
}

/** "02:28:05 PM" */
export const clockText = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** "24.68734, 46.81884" */
export const coordText = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

/** Playback: milliseconds per route point at 1x (a point is about 2 minutes of driving). */
export const STEP_MS = 300;
export const SPEEDS = [1, 2, 4] as const;
export type PlaySpeed = (typeof SPEEDS)[number];
/** 1x → 2x → 4x → 1x. */
export const nextSpeed = (s: PlaySpeed): PlaySpeed =>
  SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]!;
