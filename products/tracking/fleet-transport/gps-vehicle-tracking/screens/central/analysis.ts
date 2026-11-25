// IT-0036. Trip analysis and formatting, ported from the original page (fu, xh, x2 and the date helpers).
import { GAP_MS, MOVING_KMH, PROFILE, type Profile, type TrackPoint } from './demo';

export type LatLng = [number, number];

export interface Point {
  t: number;
  at: LatLng;
  speed: number;
  heading: number | null;
  ignition: boolean | null;
}
export interface Trip {
  id: string;
  index: number;
  start: number;
  end: number;
  points: Point[];
  distanceKm: number;
  maxSpeed: number;
  avgSpeed: number;
  durationMin: number;
  ongoing: boolean;
}
export interface Stop {
  id: string;
  start: number;
  end: number;
  at: LatLng;
  durationMin: number;
  idleMin: number;
  ongoing: boolean;
}
export interface DayEvent {
  id: string;
  t: number;
  label: string;
  icon: string;
  tone: string;
  at: LatLng;
  speed?: number;
}
export interface Summary {
  distanceKm: number;
  trips: number;
  runningMin: number;
  idleMin: number;
  stopMin: number;
  maxSpeed: number;
  avgSpeed: number;
  overspeed: number;
}
export interface Day {
  points: Point[];
  trips: Trip[];
  stops: Stop[];
  events: DayEvent[];
  summary: Summary;
}

const STOP_MS = 3 * 6e4;
const round1 = (n: number) => Math.round(n * 10) / 10;
const minutes = (ms: number) => ms / 6e4;

export function distanceM(a: LatLng, b: LatLng) {
  const r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r;
  const dLng = (b[1] - a[1]) * r;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371e3 * Math.asin(Math.sqrt(h));
}
function bearing(a: LatLng, b: LatLng) {
  const r = Math.PI / 180;
  const y = Math.sin((b[1] - a[1]) * r) * Math.cos(b[0] * r);
  const x =
    Math.cos(a[0] * r) * Math.sin(b[0] * r) -
    Math.sin(a[0] * r) * Math.cos(b[0] * r) * Math.cos((b[1] - a[1]) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
const pathKm = (pts: Point[]) => {
  let m = 0;
  for (let i = 1; i < pts.length; i++) m += distanceM(pts[i - 1]!.at, pts[i]!.at);
  return m / 1e3;
};

/** Splits a track into trips, stops and events with the day's summary (original: fu). */
export function analyse(
  raw: TrackPoint[],
  {
    now = Date.now(),
    rangeEnd,
    profile = PROFILE,
  }: { now?: number; rangeEnd: number; profile?: Profile },
): Day {
  const pts: Point[] = [];
  for (const r of raw) {
    const t = Date.parse(r.ts);
    const prev = pts[pts.length - 1];
    if (prev && t <= prev.t) continue;
    pts.push({
      t,
      at: [r.lat, r.lng],
      speed:
        r.speed ?? (prev ? (distanceM(prev.at, [r.lat, r.lng]) / ((t - prev.t) / 1e3)) * 3.6 : 0),
      heading: r.heading ?? null,
      ignition: r.ignition ?? null,
    });
  }
  const live = rangeEnd >= now && pts.length > 0 && now - pts[pts.length - 1]!.t <= GAP_MS;
  const moving = (p: Point) => p.speed >= MOVING_KMH;
  const spans: { from: number; to: number }[] = [];
  let open: { from: number; lastMove: number } | null = null;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const prev = pts[i - 1];
    if (open && prev && p.t - prev.t > GAP_MS) {
      spans.push({ from: open.from, to: open.lastMove });
      open = null;
    }
    if (moving(p)) {
      if (open) open.lastMove = i;
      else
        open = { from: prev && p.t - prev.t <= GAP_MS && !moving(prev) ? i - 1 : i, lastMove: i };
    } else if (open && p.t - pts[open.lastMove]!.t >= STOP_MS) {
      spans.push({ from: open.from, to: Math.min(open.lastMove + 1, i) });
      open = null;
    }
  }
  const stillMoving = open !== null;
  if (open) spans.push({ from: open.from, to: pts.length - 1 });
  const trips: Trip[] = spans
    .filter((s) => s.to > s.from)
    .map((s, i, all) => {
      const seg = pts.slice(s.from, s.to + 1);
      const start = seg[0]!.t;
      const end = seg[seg.length - 1]!.t;
      const km = pathKm(seg);
      const h = (end - start) / 36e5;
      const ongoing = live && stillMoving && i === all.length - 1;
      return {
        id: `trip-${start}`,
        index: i + 1,
        start,
        end: ongoing ? Math.max(end, now) : end,
        points: seg,
        distanceKm: round1(km),
        maxSpeed: Math.round(Math.max(...seg.map((p) => p.speed))),
        avgSpeed: h > 0 ? Math.round(km / h) : 0,
        durationMin: minutes(end - start),
        ongoing,
      };
    });
  const stops: Stop[] = [];
  const addStop = (from: number, to: number, ongoing: boolean) => {
    const inside = pts.filter((p) => p.t >= from && p.t <= to);
    const first = inside[0] ?? pts.find((p) => p.t >= from);
    if (!first || to - from < STOP_MS) return;
    let idle = 0;
    for (let i = 1; i < inside.length; i++) {
      const dt = inside[i]!.t - inside[i - 1]!.t;
      if (dt <= GAP_MS && inside[i - 1]!.ignition === true) idle += dt;
    }
    stops.push({
      id: `stop-${from}`,
      start: from,
      end: to,
      at: first.at,
      durationMin: minutes(to - from),
      idleMin: minutes(idle),
      ongoing,
    });
  };
  if (pts.length) {
    const first = pts[0]!.t;
    const last = pts[pts.length - 1]!.t;
    if (!trips.length) addStop(first, live ? now : last, live);
    else {
      addStop(first, trips[0]!.start, false);
      for (let i = 1; i < trips.length; i++) addStop(trips[i - 1]!.end, trips[i]!.start, false);
      const lastTrip = trips[trips.length - 1]!;
      if (!lastTrip.ongoing) addStop(lastTrip.end, live ? now : last, live);
    }
  }
  const events: DayEvent[] = [];
  for (const t of trips) {
    events.push({
      id: `${t.id}-start`,
      t: t.start,
      label: `Trip ${t.index} started`,
      icon: 'Play',
      tone: 'green',
      at: t.points[0]!.at,
    });
    if (!t.ongoing)
      events.push({
        id: `${t.id}-end`,
        t: t.end,
        label: `Trip ${t.index} ended · ${t.distanceKm} km`,
        icon: 'Flag',
        tone: 'blue',
        at: t.points[t.points.length - 1]!.at,
      });
  }
  let overspeed = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (profile.overspeed && b.speed > profile.overspeedKmh && a.speed <= profile.overspeedKmh) {
      overspeed++;
      events.push({
        id: `os-${b.t}`,
        t: b.t,
        label: 'Overspeed',
        icon: 'Gauge',
        tone: 'red',
        at: b.at,
        speed: Math.round(b.speed),
      });
    }
    if (a.ignition != null && b.ignition != null && a.ignition !== b.ignition)
      events.push({
        id: `ign-${b.t}`,
        t: b.t,
        label: b.ignition ? 'Ignition on' : 'Ignition off',
        icon: 'KeyRound',
        tone: b.ignition ? 'green' : 'gray',
        at: b.at,
      });
  }
  events.sort((a, b) => b.t - a.t);
  const running = trips.reduce((s, t) => s + t.durationMin, 0);
  const idle = stops.reduce((s, t) => s + t.idleMin, 0);
  const stopped = Math.max(0, stops.reduce((s, t) => s + t.durationMin, 0) - idle);
  const km = round1(trips.reduce((s, t) => s + t.distanceKm, 0));
  return {
    points: pts,
    trips,
    stops,
    events,
    summary: {
      distanceKm: km,
      trips: trips.length,
      runningMin: running,
      idleMin: idle,
      stopMin: stopped,
      maxSpeed: trips.length ? Math.max(...trips.map((t) => t.maxSpeed)) : 0,
      avgSpeed: running > 0 ? Math.round(km / (running / 60)) : 0,
      overspeed,
    },
  };
}

export interface At {
  at: LatLng;
  speed: number;
  heading: number | null;
  moving: boolean;
}

/** Where the vehicle is at time `t` of a replay (original: xh). */
export function positionAt(day: Day, t: number): At {
  for (const trip of day.trips) {
    if (t < trip.start || t > trip.end) continue;
    const p = trip.points;
    let i = p.findIndex((x) => x.t > t);
    if (i <= 0) i = p.length - 1;
    const a = p[Math.max(0, i - 1)]!;
    const b = p[i]!;
    const f = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 1;
    return {
      at: [a.at[0] + (b.at[0] - a.at[0]) * f, a.at[1] + (b.at[1] - a.at[1]) * f],
      speed: Math.round(a.speed + (b.speed - a.speed) * f),
      heading: a.at[0] === b.at[0] && a.at[1] === b.at[1] ? b.heading : bearing(a.at, b.at),
      moving: true,
    };
  }
  const stop = day.stops.find((s) => t >= s.start && t <= s.end);
  if (stop) return { at: stop.at, speed: 0, heading: null, moving: false };
  const last = [...day.points].reverse().find((p) => p.t <= t) ?? day.points[0];
  return { at: last?.at ?? [0, 0], speed: 0, heading: null, moving: false };
}

/** The part of the route already played up to `t` (original: x2). */
export function playedPath(trips: Trip[], t: number, at: LatLng): LatLng[] {
  const out: LatLng[] = [];
  for (const trip of trips) {
    if (trip.start > t) break;
    for (const p of trip.points) {
      if (p.t > t) break;
      out.push(p.at);
    }
    if (t <= trip.end) {
      out.push(at);
      break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ dates (browser time zone) */

const pad = (n: number) => String(n).padStart(2, '0');
/** yyyy-mm-dd of a date. */
export const isoDay = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dayStart = (day: string) => {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export function addDays(day: string, n: number) {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + n));
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
}
export const dayWindow = (day: string) => ({ from: dayStart(day), to: dayStart(addDays(day, 1)) });
/** The day's window, ending now for today (original: pC). */
export function replayWindow(day: string) {
  const w = dayWindow(day);
  return day === isoDay(new Date())
    ? { from: w.from, to: new Date(Math.min(w.to.getTime(), Date.now())) }
    : w;
}
/** Up to 7 days from `from` to `to` (original: JH). */
export function daysBetween(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < MAX_DAYS; d = addDays(d, 1)) out.push(d);
  return out.length ? out : [to];
}
export const MAX_DAYS = 7;

/** 09:05 AM */
export function clock12(ms: number) {
  const d = new Date(ms);
  const h = d.getHours();
  return `${pad(h % 12 || 12)}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}
/** 09:05:12 */
export const clock24 = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
/** 25 November 2026 */
export const longDay = (day: string) => {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(Date.UTC(y, m - 1, d, 12));
};
/** 2h 5m */
export function hm(min: number) {
  const t = Math.round(min);
  const h = Math.floor(t / 60);
  return h ? `${h}h ${t % 60}m` : `${t}m`;
}
export const latLngText = (a: LatLng) => `${a[0].toFixed(5)}, ${a[1].toFixed(5)}`;
export const count = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString());
