import { describe, expect, it } from 'vitest';
import { liveFleet, type FleetVehicle } from '../../demo/fleet';
import { countFilters, matches, NO_FILTERS, searchRows, sortRows, type GridRow } from './filters';
import { telemetry } from './telemetry';

const now = new Date(2026, 10, 23, 14, 30);
const base: FleetVehicle[] = Array.from({ length: 12 }, (_, i) => ({
  id: `V${i}`,
  callSign: `Truck ${String(i + 1).padStart(2, '0')}`,
  plate: `KSA ${1000 + i}`,
  category: 'Truck',
  make: null,
  model: null,
  group: i % 2 ? 'North fleet' : 'South fleet',
  odometerKm: 10_000 * (i + 1),
  speedLimit: 80,
  operator: i < 4 ? `Operator ${i}` : null,
}));
const rows: GridRow[] = liveFleet(base, now).map((v, i) => ({
  v,
  t: telemetry(v, now),
  fleetManagerId: null,
  supervisorId: null,
  operatorId: i < 4 ? `OP${i}` : null,
  vehicleType: i % 3 ? 'Heavy' : 'Light',
  fenceIds: i === 0 ? ['G1'] : [],
}));

describe('grid filters', () => {
  it('passes everything with no filters', () => {
    expect(rows.filter((r) => matches(r, NO_FILTERS))).toHaveLength(rows.length);
    expect(countFilters(NO_FILTERS)).toBe(0);
  });
  it('filters by operator, unassigned, type, geofence and group', () => {
    expect(rows.filter((r) => matches(r, { ...NO_FILTERS, operator: 'OP2' }))).toHaveLength(1);
    expect(rows.filter((r) => matches(r, { ...NO_FILTERS, unassigned: true }))).toHaveLength(8);
    expect(
      rows.filter((r) => matches(r, { ...NO_FILTERS, vehicleType: 'Light' })).map((r) => r.v.id),
    ).toEqual(['V0', 'V3', 'V6', 'V9']);
    expect(rows.filter((r) => matches(r, { ...NO_FILTERS, geofence: 'G1' }))).toHaveLength(1);
    expect(rows.filter((r) => matches(r, { ...NO_FILTERS, groups: ['North fleet'] }))).toHaveLength(
      6,
    );
    expect(countFilters({ ...NO_FILTERS, operator: 'OP2', groups: [] })).toBe(2);
  });
  it('ignition on means the engine reports on', () => {
    const on = rows.filter((r) => matches(r, { ...NO_FILTERS, ignition: 'on' }));
    expect(on.every((r) => r.v.ignition === true)).toBe(true);
  });
  it('installed sensors and out-of-range readings agree with the telemetry', () => {
    const temp = rows.filter((r) => matches(r, { ...NO_FILTERS, sensors: ['temperature'] }));
    expect(temp.every((r) => r.t.temperature != null)).toBe(true);
    const out = rows.filter((r) => matches(r, { ...NO_FILTERS, outOfRange: true }));
    expect(out.every((r) => r.t.outOfRange)).toBe(true);
  });
  it('sorts and searches', () => {
    const bySpeed = sortRows(rows, 'speed').map((r) => r.v.speed);
    expect(bySpeed).toEqual([...bySpeed].sort((a, b) => b - a));
    expect(sortRows(rows, 'vehicle')[0]!.v.callSign).toBe('Truck 01');
    expect(searchRows(rows, 'ksa 1003').map((r) => r.v.id)).toEqual(['V3']);
  });
});
