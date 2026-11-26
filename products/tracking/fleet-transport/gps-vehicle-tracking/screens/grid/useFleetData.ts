// IT-0036. The Grid View's vehicles from Neon (gps.tracked_asset + vehicle_details, operators, devices,
// users, groups, geofences), read through @iotify/data only.
import { useMemo } from 'react';
import {
  useGeofences,
  useOperators,
  useVehicleDetails,
  useVehicleGeofences,
} from '@iotify/data';
import { useFleetAssets, useFleetDevices, useFleetGroups, useFleetUsers } from '../fleet-rows';
import { vehicleType, type VehicleType } from './vehicleTypes';

export interface Operator {
  id: string;
  name: string;
  tagId: string | null;
  contactNo: string | null;
}

export interface Vehicle {
  id: string;
  index: number;
  name: string;
  plate: string | null;
  groupName: string | null;
  make: string | null;
  model: string | null;
  vehicleType: string | null;
  fuelType: string | null;
  year: number | null;
  color: string | null;
  odometerKm: number | null;
  speedLimitKmh: number | null;
  operatorId: string | null;
  operator: Operator | null;
  fleetManager: string;
  supervisor: string;
  deviceId: string | null;
  deviceImei: string | null;
  type: VehicleType;
}

export interface Group {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Fence {
  id: string;
  name: string;
  shape:
    | { kind: 'CIRCLE'; center: [number, number]; radius: number }
    | { kind: 'POLYGON'; points: [number, number][] }
    | null;
}

/** Groups below a group (a user limited to a group also sees its sub-groups). */
function withSubGroups(groups: Group[], name: string): Set<string> {
  const names = new Set([name]);
  for (let grew = true; grew;) {
    grew = false;
    for (const g of groups) {
      const parent = groups.find((p) => p.id === g.parentId);
      if (parent && names.has(parent.name) && !names.has(g.name)) {
        names.add(g.name);
        grew = true;
      }
    }
  }
  return names;
}

export function useFleetData(companyId: string, assetGroup: string | null) {
  const assets = useFleetAssets(companyId);
  const ids = useMemo(() => (assets.data ?? []).map((a) => a.id), [assets.data]);
  const details = useVehicleDetails({ asset_id: ids.map(Number) }, { enabled: ids.length > 0 });
  const operators = useOperators({ company_id: Number(companyId) });
  const devices = useFleetDevices(companyId);
  const users = useFleetUsers(companyId);
  const groupRows = useFleetGroups(companyId);
  const fenceRows = useGeofences({ company_id: Number(companyId) });
  const links = useVehicleGeofences();

  const groups: Group[] = useMemo(
    () =>
      (groupRows.data ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        parentId: g.parent_id ?? null,
      })),
    [groupRows.data],
  );

  const vehicles: Vehicle[] = useMemo(() => {
    const det = new Map((details.data ?? []).map((d) => [String(d.asset_id), d] as const));
    const ops = new Map((operators.data ?? []).map((o) => [o.id, o]));
    const userName = new Map((users.data ?? []).map((u) => [u.id, u.name?.trim() ?? '']));
    const dev = new Map(
      (devices.data ?? []).filter((d) => d.asset_id).map((d) => [d.asset_id!, d]),
    );
    const allowed = assetGroup ? withSubGroups(groups, assetGroup) : null;
    return (
      (assets.data ?? [])
        .filter((a) => a.status !== 'Inactive')
        // Vehicles: assets with vehicle details (all assets when none have details yet).
        .filter((a) => !det.size || det.has(a.id))
        .filter((a) => !allowed || (a.asset_group != null && allowed.has(a.asset_group)))
        .sort((a, b) =>
          (a.name ?? a.id).localeCompare(b.name ?? b.id, undefined, { numeric: true }),
        )
        .map((a, index) => {
          const d = det.get(a.id);
          const o = d?.operator_id ? ops.get(d.operator_id) : undefined;
          const name = a.name ?? a.id;
          return {
            id: a.id,
            index,
            name,
            plate: a.plate_serial ?? null,
            groupName: a.asset_group ?? null,
            make: d?.make ?? null,
            model: d?.model ?? null,
            vehicleType: d?.vehicle_type ?? null,
            fuelType: d?.fuel_type ?? null,
            year: d?.year ?? null,
            color: d?.color ?? null,
            odometerKm: d?.odometer_km ?? null,
            speedLimitKmh: d?.speed_limit_kmh ?? null,
            operatorId: d?.operator_id ?? null,
            operator: o
              ? { id: o.id, name: o.name, tagId: o.tag_id ?? null, contactNo: o.contact_no ?? null }
              : null,
            fleetManager: (d?.fleet_manager_id && userName.get(String(d.fleet_manager_id))) || '',
            supervisor: (d?.supervisor_id && userName.get(String(d.supervisor_id))) || '',
            deviceId: dev.get(a.id)?.id ?? null,
            deviceImei: dev.get(a.id)?.imei ?? null,
            type: vehicleType({ category: d?.category, make: d?.make, model: d?.model, name }),
          };
        })
    );
  }, [assets.data, details.data, operators.data, devices.data, users.data, groups, assetGroup]);

  const fences: Fence[] = useMemo(
    () =>
      (fenceRows.data ?? []).map((f) => {
        let shape: Fence['shape'] = null;
        if (
          f.shape === 'Circle' &&
          f.center_lat != null &&
          f.center_lng != null &&
          f.radius_m != null
        )
          shape = { kind: 'CIRCLE', center: [f.center_lat, f.center_lng], radius: f.radius_m };
        else if (Array.isArray(f.points))
          shape = { kind: 'POLYGON', points: f.points as [number, number][] };
        return { id: f.id, name: f.name, shape };
      }),
    [fenceRows.data],
  );

  const fencesOf = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const l of links.data ?? [])
      m.set(String(l.asset_id), [...(m.get(String(l.asset_id)) ?? []), l.geofence_id]);
    return m;
  }, [links.data]);

  const pending = assets.isPending || (ids.length > 0 && details.isPending);
  const error = assets.error ?? details.error ?? null;
  return {
    vehicles,
    groups,
    groupsError: groupRows.error,
    fences,
    fencesOf,
    isPending: pending,
    error,
    refetch: () => {
      void assets.refetch();
      void details.refetch();
    },
  };
}
