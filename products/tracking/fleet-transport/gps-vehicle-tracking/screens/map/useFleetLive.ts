// IT-0036. Map View data: the company's vehicles, operators, groups and geofences from Neon
// (through @iotify/data), with demo positions and sensor states for them (labelled demo on the
// page). Positions update like the original's live feed: new ones arrive every 3 s and the map
// takes them in every 5 s (or at once with Refresh).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useAssetGroups,
  useAssets,
  useDeviceUnits,
  useGeofences,
  useOperators,
  useUsers,
  useVehicleDetails,
  useVehicleIo,
} from '@iotify/data';
import { groupScope } from '../../tickets';
import {
  demoPositions,
  demoTick,
  demoTelemetry,
  type Position,
  type Telemetry,
  type Vehicle,
} from './model';
import type { Zone } from './LiveMap';

const FLUSH_MS = 5000;
const FEED_MS = 3000;

/** Re-renders every `ms` with the current time (relative times, offline checks). */
export function useNow(ms = FLUSH_MS) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function useFleetLive(companyId: string, assetGroup: string | null) {
  const assets = useAssets({ company_id: companyId });
  const assetIds = useMemo(() => (assets.data ?? []).map((a) => a.id), [assets.data]);
  const some = { enabled: assetIds.length > 0 };
  const details = useVehicleDetails({ asset_id: assetIds }, some);
  const io = useVehicleIo({ asset_id: assetIds }, some);
  const devices = useDeviceUnits({ company_id: companyId });
  const operators = useOperators({ company_id: companyId });
  const users = useUsers({ account_id: companyId });
  const groups = useAssetGroups({ company_id: companyId });
  const geofences = useGeofences({ company_id: companyId });

  const vehicles = useMemo<Vehicle[]>(() => {
    const detail = new Map((details.data ?? []).map((d) => [d.asset_id, d]));
    const tracked = new Set((devices.data ?? []).map((d) => d.asset_id).filter(Boolean));
    const ops = new Map((operators.data ?? []).map((o) => [o.id, o]));
    const people = new Map((users.data ?? []).map((u) => [u.id, u.name ?? '']));
    const scope = groupScope(groups.data ?? [], assetGroup);
    const inputs = new Map<string, string[]>();
    for (const r of io.data ?? [])
      if (r.kind === 'Digital input' && r.signal)
        inputs.set(r.asset_id, [...(inputs.get(r.asset_id) ?? []), r.signal]);
    return (assets.data ?? [])
      .filter((a) => detail.has(a.id) && (!scope || (a.asset_group && scope.has(a.asset_group))))
      .map((a) => {
        const d = detail.get(a.id)!;
        const op = d.operator_id ? ops.get(d.operator_id) : undefined;
        return {
          id: a.id,
          name: a.name ?? a.id,
          plateNo: a.plate_serial ?? null,
          make: d.make ?? null,
          model: d.model ?? null,
          category: d.category ?? null,
          group: a.asset_group ?? null,
          hasDevice: tracked.has(a.id),
          speedLimitKmh: d.speed_limit_kmh ?? null,
          odometerKm: d.odometer_km ?? null,
          fleetManager: (d.fleet_manager_id && people.get(d.fleet_manager_id)?.trim()) || '',
          supervisor: (d.supervisor_id && people.get(d.supervisor_id)?.trim()) || '',
          operator: op
            ? { name: op.name, tagId: op.tag_id ?? null, phone: op.contact_no ?? null }
            : null,
          digitalInputs: inputs.get(a.id) ?? [],
        };
      })
      .sort((x, y) => x.name.localeCompare(y.name, undefined, { numeric: true }));
  }, [
    assets.data,
    details.data,
    io.data,
    devices.data,
    operators.data,
    users.data,
    groups.data,
    assetGroup,
  ]);

  /* ---- demo positions, live feed */
  const [positions, setPositions] = useState<Position[]>([]);
  const [updatedAt, setUpdatedAt] = useState(0);
  const pending = useRef(new Map<string, Position>());
  useEffect(() => {
    setPositions(demoPositions(vehicles));
    setUpdatedAt(Date.now());
  }, [vehicles]);
  const flush = useCallback(() => {
    const next = pending.current;
    if (!next.size) return;
    pending.current = new Map();
    setPositions((ps) => ps.map((p) => next.get(p.assetId) ?? p));
    setUpdatedAt(Date.now());
  }, []);
  useEffect(() => {
    const ids = new Set(vehicles.map((v) => v.id));
    const feed = setInterval(
      () => demoTick(ids).forEach((p) => pending.current.set(p.assetId, p)),
      FEED_MS,
    );
    const take = setInterval(flush, FLUSH_MS);
    return () => {
      clearInterval(feed);
      clearInterval(take);
    };
  }, [vehicles, flush]);

  const now = useNow();
  const telemetry = useMemo(() => {
    const at = new Map(positions.map((p) => [p.assetId, p]));
    return new Map<string, Telemetry>(
      vehicles.map((v, i) => [v.id, demoTelemetry(v, i, at.get(v.id))]),
    );
    // `now` re-reads the sensors' time windows, like the original's telemetry feed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, positions, now]);

  const zones = useMemo<Zone[]>(
    () =>
      (geofences.data ?? []).flatMap((g): Zone[] => {
        if (g.active === false) return [];
        if (g.shape === 'Circle')
          return g.center_lat != null && g.center_lng != null && g.radius_m != null
            ? [
                {
                  id: g.id,
                  label: g.name,
                  shape: {
                    kind: 'CIRCLE',
                    center: [g.center_lat, g.center_lng],
                    radius: Number(g.radius_m),
                  },
                },
              ]
            : [];
        const raw = typeof g.points === 'string' ? (JSON.parse(g.points) as unknown) : g.points;
        const points = Array.isArray(raw)
          ? raw.flatMap((p): [number, number][] => {
              if (Array.isArray(p) && p.length >= 2) return [[Number(p[0]), Number(p[1])]];
              const o = p as { lat?: number; lng?: number };
              return o && o.lat != null && o.lng != null ? [[Number(o.lat), Number(o.lng)]] : [];
            })
          : [];
        return [{ id: g.id, label: g.name, shape: { kind: 'POLYGON', points } }];
      }),
    [geofences.data],
  );

  const loading = assets.isPending || (assetIds.length > 0 && details.isPending);
  const error = assets.error ?? details.error ?? null;
  const refetch = () => {
    void assets.refetch();
    void details.refetch();
  };
  return {
    vehicles,
    positions,
    telemetry,
    zones,
    hasGroups: (groups.data ?? []).length > 0,
    updatedAt,
    now,
    flush,
    loading,
    error,
    refetch,
  };
}
