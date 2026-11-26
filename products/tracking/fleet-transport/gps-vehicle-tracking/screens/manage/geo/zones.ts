// IT-0036. Geofences of the company from Neon (core.geofences), in the shape the
// Geo Configuration and Geo Association modules use.
import { useMemo } from 'react';
import { useGeofences } from '@iotify/data';
import type { ZoneDraft } from '../map';

export type ZoneCategory = 'GENERAL' | 'PREFERRED' | 'RESTRICTED';
export interface Interval {
  from: string;
  to: string;
}
export interface Zone {
  id: string;
  name: string;
  shape: ZoneDraft;
  category: ZoneCategory;
  status: 'ACTIVE' | 'INACTIVE';
  speedLimitKmh: number | null;
  heightM: number | null;
  intervals: Interval[];
}

export const zoneTypeLabel = (c: string) =>
  c === 'RESTRICTED' ? 'Restricted' : c === 'PREFERRED' ? 'Preferred' : 'General';
export const hhmm = (t?: string) => (t ? t.slice(0, 5) : '');
/** "08:00" → "08:00 AM" (original `mT`). */
export function ampm(t: string) {
  const [h, m] = hhmm(t).split(':').map(Number);
  if (h == null || m == null || Number.isNaN(h) || Number.isNaN(m)) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h % 12 || 12)}:${p(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

export function useZones(companyId: string) {
  const q = useGeofences({ company_id: Number(companyId) });
  const zones = useMemo<Zone[]>(
    () =>
      (q.data ?? [])
        .map((f): Zone => ({
          id: f.id,
          name: f.name,
          shape:
            f.shape === 'Circle'
              ? {
                  kind: 'CIRCLE',
                  center:
                    f.center_lat != null && f.center_lng != null
                      ? [Number(f.center_lat), Number(f.center_lng)]
                      : null,
                  radius: Number(f.radius_m) || 0,
                }
              : {
                  kind: 'POLYGON',
                  points: Array.isArray(f.points)
                    ? (f.points as [number, number][]).map(
                        (p) => [Number(p[0]), Number(p[1])] as [number, number],
                      )
                    : [],
                },
          category: (f.zone_type ?? 'General').toUpperCase() as ZoneCategory,
          status: f.active === false ? 'INACTIVE' : 'ACTIVE',
          speedLimitKmh: f.speed_limit_kmh == null ? null : Number(f.speed_limit_kmh),
          heightM: f.height_limit_m == null ? null : Number(f.height_limit_m),
          intervals: Array.isArray(f.time_intervals) ? (f.time_intervals as Interval[]) : [],
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [q.data],
  );
  return { ...q, zones, byId: useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]) };
}
