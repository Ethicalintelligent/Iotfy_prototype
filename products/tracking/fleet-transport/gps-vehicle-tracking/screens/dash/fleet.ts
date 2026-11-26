// IT-0036. The Dashboard's data from Neon (through @iotify/data): the company's vehicles with their
// details, trackers, operators, groups, geofences and vehicle–geofence links. A user limited to a
// group sees that group's and its sub-groups' vehicles.
import { useMemo } from 'react';
import {
  useGeofences,
  useOperators,
  useVehicleDetails,
  useVehicleGeofences,
} from '@iotify/data';
import { useFleetAssets, useFleetDevices, useFleetGroups, useFleetUsers } from '../fleet-rows';
import { vehicleType } from './vehicle-types';

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  make: string | null;
  model: string | null;
  /** Vehicle type (details) or category, for the cards' second line. */
  kind: string | null;
  /** Catalogue type label (the filters' "Vehicle Type"). */
  typeLabel: string;
  image: string;
  odometerKm: number | null;
  limitKmh: number | null;
  operator: { name: string; tagId: string | null; contact: string | null } | null;
  manager: string;
  supervisor: string;
  group: string | null;
  hasTracker: boolean;
}

export interface Zone {
  id: string;
  name: string;
  active: boolean;
  type: 'General' | 'Preferred' | 'Restricted';
  shape:
    | { kind: 'circle'; lat: number; lng: number; radius: number }
    | { kind: 'polygon'; points: [number, number][] };
}

const num = (v: unknown) => (v == null || v === '' ? null : Number(v));
const byName = (a: Vehicle, b: Vehicle) =>
  a.name.localeCompare(b.name, undefined, { numeric: true });

function polygon(points: unknown): [number, number][] {
  try {
    const list = typeof points === 'string' ? JSON.parse(points) : points;
    return Array.isArray(list)
      ? list.map((p) => [Number(p[0]), Number(p[1])] as [number, number])
      : [];
  } catch {
    return [];
  }
}

export function useFleet(companyId: string, assetGroup: string | null) {
  const assets = useFleetAssets(companyId);
  const groups = useFleetGroups(companyId);
  const ids = useMemo(() => (assets.data ?? []).map((a) => a.id), [assets.data]);
  const details = useVehicleDetails({ asset_id: ids.map(Number) }, { enabled: ids.length > 0 });
  const devices = useFleetDevices(companyId);
  const operators = useOperators({ company_id: Number(companyId) });
  const users = useFleetUsers(companyId);
  const fences = useGeofences({ company_id: Number(companyId) });
  const links = useVehicleGeofences({ asset_id: ids.map(Number) }, { enabled: ids.length > 0 });

  const vehicles = useMemo(() => {
    const detail = new Map((details.data ?? []).map((d) => [String(d.asset_id), d] as const));
    const ops = new Map((operators.data ?? []).map((o) => [o.id, o]));
    const people = new Map((users.data ?? []).map((u) => [u.id, u.name ?? '']));
    const tracked = new Set((devices.data ?? []).map((d) => d.asset_id).filter(Boolean));
    // Vehicles: assets with vehicle details (all assets when none have details yet).
    const list = (assets.data ?? []).filter((a) => !detail.size || detail.has(a.id));
    // A user limited to a group sees it and its sub-groups.
    let allowed: Set<string> | null = null;
    if (assetGroup) {
      const all = groups.data ?? [];
      const root = all.find((g) => g.name === assetGroup);
      allowed = new Set([assetGroup]);
      if (root) {
        const ids = new Set([root.id]);
        for (let grew = true; grew;) {
          grew = false;
          for (const g of all)
            if (g.parent_id && ids.has(g.parent_id) && !ids.has(g.id)) {
              ids.add(g.id);
              allowed.add(g.name);
              grew = true;
            }
        }
      }
    }
    return list
      .filter((a) => !allowed || (a.asset_group && allowed.has(a.asset_group)))
      .map((a): Vehicle => {
        const d = detail.get(a.id);
        const name = a.name || a.plate_serial || a.id;
        const type = vehicleType({ category: d?.category, make: d?.make, model: d?.model, name });
        const op = d?.operator_id ? ops.get(d.operator_id) : undefined;
        const opName = op?.name?.trim() || d?.operator_name?.trim() || '';
        return {
          id: a.id,
          name,
          plate: a.plate_serial || name,
          make: d?.make ?? null,
          model: d?.model ?? null,
          kind: d?.vehicle_type || d?.category || null,
          typeLabel: type.label,
          image: type.image,
          odometerKm: num(d?.odometer_km),
          limitKmh: num(d?.speed_limit_kmh),
          operator: opName
            ? { name: opName, tagId: op?.tag_id ?? null, contact: op?.contact_no ?? null }
            : null,
          manager: (d?.fleet_manager_id && people.get(String(d.fleet_manager_id))) || '',
          supervisor: (d?.supervisor_id && people.get(String(d.supervisor_id))) || '',
          group: a.asset_group ?? null,
          hasTracker: tracked.has(a.id),
        };
      })
      .sort(byName);
  }, [
    assets.data,
    details.data,
    devices.data,
    operators.data,
    users.data,
    groups.data,
    assetGroup,
  ]);

  const zones = useMemo(
    () =>
      (fences.data ?? []).map((f): Zone => ({
        id: f.id,
        name: f.name,
        active: f.active !== false,
        type: f.zone_type ?? 'General',
        shape:
          f.shape === 'Circle'
            ? {
                kind: 'circle',
                lat: Number(f.center_lat),
                lng: Number(f.center_lng),
                radius: Number(f.radius_m),
              }
            : { kind: 'polygon', points: polygon(f.points) },
      })),
    [fences.data],
  );
  const zoneLinks = useMemo(
    () => (links.data ?? []).map((l) => ({ vehicleId: String(l.asset_id), zoneId: l.geofence_id })),
    [links.data],
  );

  const main = [assets, details];
  return {
    vehicles,
    hasGroups: (groups.data ?? []).length > 0 || vehicles.some((v) => v.group),
    zones,
    zoneLinks,
    isPending: assets.isPending || (ids.length > 0 && details.isPending),
    error: main.find((q) => q.isError)?.error ?? null,
    refetch: () => main.forEach((q) => void q.refetch()),
  };
}

/** Distance in metres between two points. */
function metres([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]) {
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

/** Whether a point is inside a zone (circle: within the radius; polygon: ray casting). */
export function inZone(z: Zone, at: [number, number]): boolean {
  if (z.shape.kind === 'circle') return metres([z.shape.lat, z.shape.lng], at) <= z.shape.radius;
  const [x, y] = at;
  const pts = z.shape.points;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    if (xi > x !== xj > x && y < ((yj - yi) * (x - xi)) / (xj - xi) + yi) inside = !inside;
  }
  return inside;
}
