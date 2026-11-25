// IT-0036. Tracking › Tracking (follow one vehicle live on the map, or replay its history),
// rebuilt in React from the owner's page (Tracking.html, removed in IT-0037 (git history), the reference).
// - ported/: the page's own code, converted from the compiled bundle to TSX with the same markup,
//   class names, inline styles, texts and behaviour (see ported/README in the file headers).
// - runtime.tsx: what the original got from its app shell (query cache, URL state, live socket).
// - demo.ts: the original's demo generator (positions, live feed, tracks, telemetry, alerts),
//   applied to the company's vehicles from Neon. Labelled "Demo data" on the vehicle list card.
// Vehicles, operators, fleet managers, supervisors and groups come from Neon through @iotify/data.
import { useEffect, useMemo } from 'react';
import {
  useAssetGroups,
  useAssets,
  useDeviceUnits,
  useOperators,
  useUsers,
  useVehicleDetails,
} from '@iotify/data';
import type { ScreenContext } from '@iotify/app-kit';
import { SmartTrackPage } from '../smart-track/kit';
import { setDemoFleet } from './demo';
import { DemoProvider, operatorNameOf, type Fleet, type FleetVehicle } from './runtime';
import { VehicleTracking } from './ported/vehicle-kind';
import { setTimeZone } from './ported/format';
import './icons';
import './tracking.css';
import './tracking.fix.css';

// Times show in the company's time zone, as in the original (its demo company is in Riyadh; Neon
// has no time zone per company yet).
setTimeZone('Asia/Riyadh');

/** A user limited to a group sees its sub-groups' vehicles too. */
function groupScope(
  groups: { id: string; name: string; parent_id?: string | null }[],
  top: string | null,
) {
  if (!top) return null;
  const root = groups.find((g) => g.name === top);
  const names = new Set([top]);
  if (!root) return names;
  const ids = new Set([root.id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const g of groups)
      if (g.parent_id && ids.has(g.parent_id) && !ids.has(g.id)) {
        ids.add(g.id);
        names.add(g.name);
        grew = true;
      }
  }
  return names;
}

/** The vehicle category id the original's pictures use, from the Neon category label. */
const categoryId = (label: string | null | undefined) =>
  label
    ? label
        .trim()
        .toUpperCase()
        .replace(/&/g, '_')
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    : null;

function useNeonFleet(companyId: string, assetGroup: string | null): Fleet {
  const assets = useAssets({ company_id: companyId });
  const details = useVehicleDetails();
  const operators = useOperators({ company_id: companyId });
  const users = useUsers({ account_id: companyId });
  const devices = useDeviceUnits({ company_id: companyId });
  const groups = useAssetGroups({ company_id: companyId });

  return useMemo(() => {
    const scope = groupScope(groups.data ?? [], assetGroup);
    const det = new Map((details.data ?? []).map((d) => [d.asset_id, d]));
    const groupId = new Map((groups.data ?? []).map((g) => [g.name, g.id]));
    const people = new Map((users.data ?? []).map((u) => [u.id, u.name?.trim() ?? '']));
    const fitted = new Map(
      (devices.data ?? []).filter((d) => d.asset_id).map((d) => [d.asset_id!, d.id]),
    );
    const list = (assets.data ?? [])
      .filter((a) => det.has(a.id) && (!scope || (a.asset_group && scope.has(a.asset_group))))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { numeric: true }));
    const vehicles: FleetVehicle[] = list.map((a) => {
      const d = det.get(a.id)!;
      return {
        id: a.id,
        name: a.name ?? a.plate_serial ?? a.id,
        plateNo: a.plate_serial ?? null,
        make: d.make ?? null,
        model: d.model ?? null,
        category: categoryId(d.category),
        odometerKm: d.odometer_km ?? null,
        speedLimitKmh: d.speed_limit_kmh ?? null,
        groupId: (a.asset_group && groupId.get(a.asset_group)) || null,
        deviceId: fitted.get(a.id) ?? null,
        details: {
          ...(d.operator_id ? { operatorId: d.operator_id } : {}),
          fleetManager: (d.fleet_manager_id && people.get(d.fleet_manager_id)) || '',
          supervisor: (d.supervisor_id && people.get(d.supervisor_id)) || '',
        },
      };
    });
    // Same rule as the original demo: vehicles with a tracker report, every 11th stays "Yet to Transmit".
    setDemoFleet(
      vehicles.map((v, index) => ({
        id: v.id,
        index,
        odometerKm: v.odometerKm,
        reporting: !!v.deviceId && index % 11 !== 10,
      })),
      (id) => vehicles.find((v) => v.id === id)?.groupId ?? null,
    );
    const error = assets.error ?? details.error ?? operators.error ?? null;
    return {
      vehicles,
      operators: (operators.data ?? []).map((o) => ({
        id: o.id,
        name: o.name,
        tagId: o.tag_id ?? '',
        contactNo: o.contact_no ?? '',
      })),
      groups: (groups.data ?? []).map((g) => ({ id: g.id, name: g.name })),
      isPending: assets.isPending || details.isPending,
      error: error ? new Error(error.message) : null,
      refetch: () => {
        void assets.refetch();
        void details.refetch();
        void operators.refetch();
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assets.data,
    details.data,
    operators.data,
    users.data,
    devices.data,
    groups.data,
    assetGroup,
    assets.isPending,
    details.isPending,
    assets.error,
    details.error,
    operators.error,
  ]);
}

export default function TrackingScreen({ companyId, assetGroup }: ScreenContext) {
  const fleet = useNeonFleet(companyId, assetGroup);
  useEffect(() => {
    const operatorOf = new Map(fleet.operators.map((o) => [o.id, o.name]));
    operatorNameOf.current = (id) => {
      const op = fleet.vehicles.find((v) => v.id === id)?.details.operatorId;
      return (op && operatorOf.get(op)) || null;
    };
  }, [fleet]);
  return (
    <SmartTrackPage scope="st-tracking">
      <DemoProvider value={fleet}>
        <VehicleTracking />
      </DemoProvider>
    </SmartTrackPage>
  );
}
