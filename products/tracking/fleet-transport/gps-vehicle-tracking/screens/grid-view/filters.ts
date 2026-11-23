// The Grid View's "Vehicle Filters" (approved design, Desktop/vs/Grid-View.html): operator,
// sensor, device, location and group filters, applied with Submit. Pure functions, tested in
// filters.test.ts.
import type { LiveVehicle } from '../../demo/fleet';
import type { VehicleStatus } from '../../shared/vehicle-status';
import { signalBand, type BatteryLevel, type SensorKind, type Telemetry } from './telemetry';

/** One vehicle with everything the filters and cards need. */
export interface GridRow {
  v: LiveVehicle;
  t: Telemetry;
  fleetManagerId: string | null;
  supervisorId: string | null;
  operatorId: string | null;
  vehicleType: string | null;
  /** Geofences the vehicle is inside now (demo position). */
  fenceIds: string[];
}

export type AnyOnOff = 'any' | 'on' | 'off';
export interface Filters {
  fleetManager: string;
  supervisor: string;
  operator: string;
  unassigned: boolean;
  ignition: AnyOnOff;
  sensors: SensorKind[];
  ac: AnyOnOff;
  belt: 'any' | 'fastened' | 'unfastened';
  door: 'any' | 'open' | 'closed';
  outOfRange: boolean;
  gps: 'any' | 'available' | 'unavailable';
  externalBattery: 'any' | 'connected' | 'disconnected';
  gsm: 'any' | 'strong' | 'weak' | 'none';
  internalBattery: 'any' | BatteryLevel;
  geofence: string;
  vehicleType: string;
  /** Groups to show; null = every group. */
  groups: string[] | null;
}

export const NO_FILTERS: Filters = {
  fleetManager: '',
  supervisor: '',
  operator: '',
  unassigned: false,
  ignition: 'any',
  sensors: [],
  ac: 'any',
  belt: 'any',
  door: 'any',
  outOfRange: false,
  gps: 'any',
  externalBattery: 'any',
  gsm: 'any',
  internalBattery: 'any',
  geofence: '',
  vehicleType: '',
  groups: null,
};

/** The group name for vehicles without one. */
export const NO_GROUP = 'No group';

const yesNo = (want: 'any' | 'yes' | 'no', value: boolean | null) =>
  want === 'any' || (value != null && value === (want === 'yes'));
const onOff = (want: AnyOnOff, value: boolean | null) =>
  yesNo(want === 'any' ? 'any' : want === 'on' ? 'yes' : 'no', value);

/** How many filters (of `keys`, default all) differ from "no filters". */
export function countFilters(
  f: Filters,
  keys = Object.keys(NO_FILTERS) as (keyof Filters)[],
): number {
  return keys.filter((k) => {
    const a = f[k];
    const b = NO_FILTERS[k];
    // sensors: any ticked; groups: null means every group, so any list is a filter
    if (Array.isArray(b)) return (a as unknown[]).length > 0;
    return a !== b;
  }).length;
}

/** Whether a row passes every filter. */
export function matches(r: GridRow, f: Filters): boolean {
  const { v, t } = r;
  return (
    (!f.fleetManager || r.fleetManagerId === f.fleetManager) &&
    (!f.supervisor || r.supervisorId === f.supervisor) &&
    (!f.operator || r.operatorId === f.operator) &&
    (!f.unassigned || !v.operator) &&
    onOff(f.ignition, v.ignition) &&
    f.sensors.every((s) => t.installed[s]) &&
    onOff(f.ac, v.ac) &&
    yesNo(f.belt === 'any' ? 'any' : f.belt === 'fastened' ? 'yes' : 'no', v.belt) &&
    yesNo(f.door === 'any' ? 'any' : f.door === 'open' ? 'yes' : 'no', v.door) &&
    (!f.outOfRange || t.outOfRange) &&
    yesNo(
      f.gps === 'any' ? 'any' : f.gps === 'available' ? 'yes' : 'no',
      t.gps ? t.gps.available : null,
    ) &&
    yesNo(
      f.externalBattery === 'any' ? 'any' : f.externalBattery === 'connected' ? 'yes' : 'no',
      t.externalBattery ? t.externalBattery.connected : null,
    ) &&
    (f.gsm === 'any' || (t.gsm != null && signalBand(t.gsm) === f.gsm)) &&
    (f.internalBattery === 'any' || t.internalBattery === f.internalBattery) &&
    (!f.geofence || r.fenceIds.includes(f.geofence)) &&
    (!f.vehicleType || r.vehicleType === f.vehicleType) &&
    (f.groups == null || f.groups.includes(v.group ?? NO_GROUP))
  );
}

export type SortKey = 'vehicle' | 'status' | 'speed' | 'odometer' | 'updated';
export const SORTS: { value: SortKey; label: string }[] = [
  { value: 'vehicle', label: 'Vehicle no.' },
  { value: 'status', label: 'Status' },
  { value: 'speed', label: 'Highest speed' },
  { value: 'odometer', label: 'Highest odometer' },
  { value: 'updated', label: 'Recently updated' },
];

const STATUS_RANK: Record<VehicleStatus, number> = {
  overspeed: 0,
  running: 1,
  idle: 2,
  towed: 3,
  stopped: 4,
  notx: 5,
  ytt: 6,
};

/** Rows in the chosen order (ties by call sign). */
export function sortRows(rows: GridRow[], by: SortKey): GridRow[] {
  const name = (r: GridRow) => r.v.callSign;
  const key: Record<SortKey, (a: GridRow, b: GridRow) => number> = {
    vehicle: () => 0,
    status: (a, b) => STATUS_RANK[a.v.status] - STATUS_RANK[b.v.status],
    speed: (a, b) => b.v.speed - a.v.speed,
    odometer: (a, b) => b.v.odometer - a.v.odometer,
    updated: (a, b) => (b.v.lastReport?.getTime() ?? 0) - (a.v.lastReport?.getTime() ?? 0),
  };
  return [...rows].sort(
    (a, b) => key[by](a, b) || name(a).localeCompare(name(b), 'en', { numeric: true }),
  );
}

/** Search across call sign, plate, operator, location and group. */
export function searchRows(rows: GridRow[], q: string): GridRow[] {
  const s = q.trim().toLowerCase();
  if (!s) return rows;
  return rows.filter(({ v }) =>
    `${v.callSign} ${v.plate} ${v.operator ?? ''} ${v.area} ${v.group ?? ''}`
      .toLowerCase()
      .includes(s),
  );
}
