// Pure helpers for Manage > Geo Configuration and Geo Association (approved design, Desktop/vs):
// the zone form's draft, its checks, the row saved to proto_vehicle.geofences, map shapes,
// time intervals, days and "Valid For".
import type { GeofencesRow } from '@iotify/data';
import type { MapFence } from '@iotify/ui';
import { ZONE_HUE, type ZoneType } from '../../../shared/vehicle-status';

export type Shape = 'Circle' | 'Freeform';
export type LatLng = [number, number];
export interface Interval {
  from: string;
  to: string;
}

export const ZONE_TYPES: ZoneType[] = ['General', 'Preferred', 'Restricted'];
export const ZONE_ICON = { General: 'geofence', Preferred: 'target', Restricted: 'ban' } as const;
export const SHAPE_ICON = { Circle: 'crosshair', Freeform: 'share' } as const;
export const SHAPE_HUE = { Circle: 'teal', Freeform: 'amber' } as const;
export const RADIUS = { min: 50, max: 5000, step: 50, start: 300 };

/** The Add / Edit Zone form while it is being filled in. */
export interface ZoneDraft {
  name: string;
  shape: Shape;
  centre: LatLng | null;
  radiusM: number;
  points: LatLng[];
  active: boolean;
  zoneType: ZoneType;
  /** As typed (empty = no limit). */
  speed: string;
  height: string;
  intervals: Interval[];
}

export const blankZone = (): ZoneDraft => ({
  name: '',
  shape: 'Circle',
  centre: null,
  radiusM: RADIUS.start,
  points: [],
  active: true,
  zoneType: 'Preferred',
  speed: '',
  height: '',
  intervals: [{ from: '', to: '' }],
});

const isTime = (s: unknown): s is string => typeof s === 'string' && /^\d{2}:\d{2}$/.test(s);

/** Time intervals stored as jsonb [{from, to}]; anything else is ignored. */
export function intervalsOf(v: unknown): Interval[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Interval => !!x && isTime(x.from) && isTime(x.to))
    .map((x) => ({ from: x.from, to: x.to }));
}

/** Polygon corners stored as jsonb [[lat, lng], …]. */
export function pointsOf(v: unknown): LatLng[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (p): p is LatLng =>
        Array.isArray(p) && p.length >= 2 && Number.isFinite(+p[0]) && Number.isFinite(+p[1]),
    )
    .map((p) => [+p[0], +p[1]]);
}

const numText = (v: number | null | undefined) => (v == null ? '' : String(Number(v)));

/** The form filled from a saved zone. */
export function zoneFromRow(r: GeofencesRow): ZoneDraft {
  const shape: Shape = r.shape === 'Circle' ? 'Circle' : 'Freeform';
  const intervals = intervalsOf(r.time_intervals);
  return {
    name: r.name,
    shape,
    centre: r.center_lat != null && r.center_lng != null ? [+r.center_lat, +r.center_lng] : null,
    radiusM: r.radius_m != null ? Number(r.radius_m) : RADIUS.start,
    points: pointsOf(r.points),
    active: r.active !== false,
    zoneType: (r.zone_type ?? 'General') as ZoneType,
    speed: numText(r.speed_limit_kmh),
    height: numText(r.height_limit_m),
    intervals: intervals.length ? intervals : [{ from: '', to: '' }],
  };
}

const positive = (s: string) => s.trim() === '' || (Number.isFinite(+s) && +s > 0);

/** What still stops the zone from being saved, in plain words (empty = ready). */
export function zoneProblems(d: ZoneDraft): string[] {
  const out: string[] = [];
  if (!d.name.trim()) out.push('Give the zone a name.');
  if (d.shape === 'Circle' && !d.centre) out.push("Click the map to place the circle's centre.");
  if (d.shape === 'Freeform' && d.points.length < 3)
    out.push('Click at least 3 points on the map to draw the boundary.');
  if (!positive(d.speed)) out.push('Speed limit must be a number above 0, or empty.');
  if (!positive(d.height)) out.push('Height limit must be a number above 0, or empty.');
  if (d.intervals.some((i) => !!i.from !== !!i.to))
    out.push('Each time interval needs a start and an end time.');
  if (d.intervals.some((i) => i.from && i.from === i.to))
    out.push("A time interval can't start and end at the same time.");
  return out;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));

/** The proto_vehicle.geofences row for a (checked) draft. */
export function zoneRow(d: ZoneDraft, id: string, companyId: string): Partial<GeofencesRow> {
  const circle = d.shape === 'Circle';
  const intervals = d.intervals.filter((i) => i.from && i.to);
  return {
    id,
    company_id: companyId,
    name: d.name.trim(),
    shape: d.shape,
    center_lat: circle && d.centre ? round6(d.centre[0]) : null,
    center_lng: circle && d.centre ? round6(d.centre[1]) : null,
    radius_m: circle ? d.radiusM : null,
    points: circle ? null : d.points.map(([a, b]) => [round6(a), round6(b)]),
    zone_type: d.zoneType,
    active: d.active,
    speed_limit_kmh: numOrNull(d.speed),
    height_limit_m: numOrNull(d.height),
    time_intervals: intervals.length ? intervals : null,
  };
}

/** A circle as a polygon of `n` corners (so the map fits the whole circle, not just its centre). */
export function circlePoints(lat: number, lng: number, radiusM: number, n = 64): LatLng[] {
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return [lat + dLat * Math.sin(a), lng + dLng * Math.cos(a)];
  });
}

/** A zone's shape for StreetMap, coloured by its zone type. Circles are drawn as fine polygons. */
export function zoneShape(
  id: string,
  name: string,
  shape: Shape,
  centre: LatLng | null,
  radiusM: number | null,
  points: LatLng[],
  zoneType: ZoneType,
): MapFence | null {
  const base = { id, name, hue: ZONE_HUE[zoneType] };
  if (shape === 'Circle')
    return centre
      ? {
          ...base,
          shape: 'polygon',
          points: circlePoints(centre[0], centre[1], radiusM ?? RADIUS.start),
        }
      : null;
  return points.length ? { ...base, shape: 'polygon', points } : null;
}

/** The map shape of a saved zone. */
export function rowShape(r: GeofencesRow): MapFence | null {
  const d = zoneFromRow(r);
  return zoneShape(
    r.id,
    `${r.name} · ${d.zoneType}`,
    d.shape,
    d.centre,
    d.radiusM,
    d.points,
    d.zoneType,
  );
}

/** "07:00 – 19:00" */
export const intervalText = (i: Interval) => `${i.from} – ${i.to}`;

// ---------------------------------------------------------------- Geo Association
export const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WORK_DAYS = WEEK.slice(0, 5);

/** "Every day", "Mon, Tue, Wed", or "No days". */
export function daysText(days: string[] | null | undefined): string {
  const d = WEEK.filter((x) => days?.includes(x));
  if (d.length === 7) return 'Every day';
  return d.length ? d.join(', ') : 'No days';
}

export type ValidFor = 'forever' | '1m' | '3m' | '6m' | '1y' | 'custom';
export const VALID_FOR: { value: ValidFor; label: string }[] = [
  { value: 'forever', label: 'Forever' },
  { value: '1m', label: '1 Month' },
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'custom', label: 'Custom Date' },
];
const MONTHS: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 };

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The last valid date (yyyy-mm-dd) for a "Valid For" choice, or null for Forever. */
export function validTill(v: ValidFor, custom: string, today: Date): string | null {
  if (v === 'forever') return null;
  if (v === 'custom') return custom || null;
  const d = new Date(today.getFullYear(), today.getMonth() + MONTHS[v]!, today.getDate());
  // 31 Jan + 1 month: stay in February (last day), not 3 March
  if (d.getDate() !== today.getDate()) d.setDate(0);
  return iso(d);
}

export const todayIso = (today: Date) => iso(today);
