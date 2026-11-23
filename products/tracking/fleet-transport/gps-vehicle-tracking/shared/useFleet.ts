// The company's vehicles (real: core.assets + proto_vehicle.vehicle_details), their geofences
// (real) and what they are doing now (demo activity from ../demo/fleet, refreshed every 15 s).
import { useEffect, useMemo, useState } from 'react';
import {
  useAssets,
  useGeofences,
  useOperators,
  useVehicleDetails,
  useVehicleGeofences,
} from '@iotify/data';
import { useCoreRules, type ScreenContext } from '@iotify/app-kit';
import type { MapFence } from '@iotify/ui';
import {
  addDays,
  dayStats,
  dayTimeline,
  distanceM,
  insidePolygon,
  liveFleet,
  startOfDay,
  type DayStats,
  type FleetVehicle,
  type LiveVehicle,
  type Segment,
} from '../demo/fleet';
import { ZONE_HUE, type ZoneType } from './vehicle-status';

/** The current time, updated every `ms`. */
export function useNow(ms = 15_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export interface Fence {
  id: string;
  name: string;
  shape: 'Circle' | 'Freeform';
  zoneType: ZoneType;
  lat: number | null;
  lng: number | null;
  radiusM: number | null;
  points: [number, number][];
  /** Vehicles linked to it (Map & Geofence on the vehicle). */
  vehicleIds: string[];
  active: boolean;
  speedLimit: number | null;
  heightLimit: number | null;
}

export function fenceContains(f: Fence, lat: number, lng: number): boolean {
  if (f.shape === 'Circle' && f.lat != null && f.lng != null)
    return distanceM([f.lat, f.lng], [lat, lng]) <= (f.radiusM ?? 0);
  return f.points.length > 2 && insidePolygon([lat, lng], f.points);
}

/** A fence for StreetMap. */
export const mapFence = (f: Fence): MapFence => ({
  id: f.id,
  name: `${f.name} · ${f.zoneType}`,
  shape: f.shape === 'Circle' ? 'circle' : 'polygon',
  lat: f.lat ?? undefined,
  lng: f.lng ?? undefined,
  radiusM: f.radiusM ?? undefined,
  points: f.points,
  hue: ZONE_HUE[f.zoneType],
});

export interface Fleet {
  /** Waiting for the first data. */
  loading: boolean;
  /** Neon's error text, unchanged. */
  error: string | null;
  vehicles: FleetVehicle[];
  live: LiveVehicle[];
  fences: Fence[];
  now: Date;
  /** A vehicle's segments and totals for a day (0 = today, 1 = yesterday…). */
  day: (v: LiveVehicle, daysAgo: number) => { segments: Segment[]; stats: DayStats };
}

export function useFleet(
  ctx: Pick<ScreenContext, 'product' | 'companyId' | 'assetGroup'>,
  refreshMs = 15_000,
): Fleet {
  const { product, companyId, assetGroup } = ctx;
  const { rules } = useCoreRules();
  const on = { enabled: !!companyId };
  const assets = useAssets({ company_id: companyId }, on);
  const details = useVehicleDetails(undefined, on);
  const geofences = useGeofences({ company_id: companyId }, on);
  const links = useVehicleGeofences(undefined, on);
  const operators = useOperators({ company_id: companyId }, on);
  const now = useNow(refreshMs);

  const vehicles = useMemo<FleetVehicle[]>(() => {
    const types = rules?.productAssetTypes(product) ?? new Set<string>();
    const byId = new Map((details.data ?? []).map((d) => [d.asset_id, d]));
    const opName = new Map((operators.data ?? []).map((o) => [o.id, o.name]));
    return (assets.data ?? [])
      .filter(
        (a) =>
          types.has(a.asset_type_id ?? '') &&
          a.status !== 'Inactive' &&
          (!assetGroup || a.asset_group === assetGroup),
      )
      .map((a) => {
        const d = byId.get(a.id);
        return {
          id: a.id,
          callSign: a.name ?? a.id,
          plate: a.plate_serial ?? a.name ?? a.id,
          category: d?.category ?? null,
          make: d?.make ?? null,
          model: d?.model ?? null,
          group: a.asset_group ?? null,
          odometerKm: d?.odometer_km != null ? Number(d.odometer_km) : null,
          speedLimit: d?.speed_limit_kmh != null ? Number(d.speed_limit_kmh) : 80,
          operator: (d?.operator_id && opName.get(d.operator_id)) || d?.operator_name || null,
        };
      })
      .sort((a, b) => a.callSign.localeCompare(b.callSign, 'en', { numeric: true }));
  }, [rules, product, assets.data, details.data, operators.data, assetGroup]);

  // Positions move with the clock; recomputed on each tick.
  const live = useMemo(() => liveFleet(vehicles, now), [vehicles, now]);

  const fences = useMemo<Fence[]>(
    () =>
      (geofences.data ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        shape: g.shape === 'Circle' ? 'Circle' : 'Freeform',
        zoneType: (g.zone_type ?? 'General') as ZoneType,
        lat: g.center_lat != null ? Number(g.center_lat) : null,
        lng: g.center_lng != null ? Number(g.center_lng) : null,
        radiusM: g.radius_m != null ? Number(g.radius_m) : null,
        points: Array.isArray(g.points) ? (g.points as [number, number][]) : [],
        vehicleIds: (links.data ?? []).filter((l) => l.geofence_id === g.id).map((l) => l.asset_id),
        active: g.active !== false,
        speedLimit: g.speed_limit_kmh != null ? Number(g.speed_limit_kmh) : null,
        heightLimit: g.height_limit_m != null ? Number(g.height_limit_m) : null,
      })),
    [geofences.data, links.data],
  );

  const day = (v: LiveVehicle, daysAgo: number) => {
    if (v.status === 'ytt') return { segments: [], stats: dayStats([], v, now) };
    const date = daysAgo === 0 ? now : addDays(startOfDay(now), -daysAgo);
    const segments = daysAgo === 0 ? dayTimeline(v, now, v.status) : dayTimeline(v, date);
    return { segments, stats: dayStats(segments, v, date) };
  };

  const err = assets.error ?? details.error ?? geofences.error ?? links.error ?? operators.error;
  return {
    loading:
      !rules || !assets.data || !details.data || !geofences.data || !links.data || !operators.data,
    error: err ? String((err as Error).message ?? err) : null,
    vehicles,
    live,
    fences,
    now,
    day,
  };
}
