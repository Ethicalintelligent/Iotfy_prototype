// History replay for Centralized Tracking: where a vehicle was at a moment of its demo day route,
// and the time span covered by several routes. Pure functions, tested in replay.test.ts.
import type { Hue } from '@iotify/ui';
import type { RoutePoint } from '../../demo/fleet';

/** Up to six vehicles replayed together, each in its own colour. */
export const MAX_REPLAY = 6;
export const REPLAY_HUES: Hue[] = ['green', 'blue', 'orange', 'purple', 'red', 'teal'];

export interface Position {
  lat: number;
  lng: number;
  speed: number;
  /** The moment is before the first point or after the last one. */
  outside: boolean;
}

/** Where the vehicle was at `t` (ms), moving in a straight line between two route points. */
export function positionAt(points: RoutePoint[], t: number): Position | null {
  if (!points.length) return null;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (t <= first.at.getTime()) return { lat: first.lat, lng: first.lng, speed: 0, outside: true };
  if (t >= last.at.getTime()) return { lat: last.lat, lng: last.lng, speed: 0, outside: true };
  // Binary search for the last point at or before t.
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid]!.at.getTime() <= t) lo = mid;
    else hi = mid;
  }
  const a = points[lo]!;
  const b = points[hi]!;
  const span = b.at.getTime() - a.at.getTime();
  const k = span > 0 ? (t - a.at.getTime()) / span : 0;
  return {
    lat: a.lat + (b.lat - a.lat) * k,
    lng: a.lng + (b.lng - a.lng) * k,
    speed: a.speed,
    outside: false,
  };
}

/** The first and last moments (ms) over several routes; null when none has points. */
export function span(routes: RoutePoint[][]): [number, number] | null {
  const ts = routes
    .filter((r) => r.length)
    .flatMap((r) => [r[0]!.at.getTime(), r[r.length - 1]!.at.getTime()]);
  return ts.length ? [Math.min(...ts), Math.max(...ts)] : null;
}

/** "07:45" */
export const hhmm = (t: number) =>
  new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
