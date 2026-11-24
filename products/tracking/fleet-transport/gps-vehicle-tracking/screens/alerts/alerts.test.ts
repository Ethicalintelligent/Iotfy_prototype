import { describe, expect, it } from 'vitest';
import { liveFleet, type AlertEvent, type FleetVehicle } from '../../demo/fleet';
import { ALERT } from '../../shared/vehicle-status';
import {
  ALL_KINDS,
  NO_FILTER,
  filterAlerts,
  isFiltered,
  periodAlerts,
  sortStamp,
  stampText,
} from './alerts';

const fleet: FleetVehicle[] = [...Array(12)].map((_, i) => ({
  id: `A${200 + i}`,
  callSign: `Truck ${i + 1}`,
  plate: `KSA ${1000 + i}`,
  category: 'Truck',
  make: 'Isuzu',
  model: 'NPR',
  group: null,
  odometerKm: 50_000,
  speedLimit: 80,
  operator: i === 0 ? 'Omar Haddad' : null,
}));
const now = new Date(2026, 10, 23, 14, 30);
const live = liveFleet(fleet, now);
const noOp = (id: string) => (id === 'A200' ? 'Omar Haddad' : null);

describe('alerts', () => {
  it('lists every alert type of a period, newest first', () => {
    const today = periodAlerts(live, now, 'today');
    const week = periodAlerts(live, now, '7d');
    expect(today.length).toBeGreaterThan(0);
    expect(today.every((e) => e.at <= now && e.at.getDate() === 23)).toBe(true);
    expect(week.length).toBeGreaterThan(today.length);
    for (let i = 1; i < week.length; i++)
      expect(week[i]!.at.getTime()).toBeLessThanOrEqual(week[i - 1]!.at.getTime());
    expect(periodAlerts(live, now, 'yesterday').every((e) => e.at.getDate() === 22)).toBe(true);
    expect(new Set(week.map((e) => e.id)).size).toBe(week.length);
  });

  it('filters by type, severity, vehicle and search text', () => {
    const all = periodAlerts(live, now, '7d');
    expect(filterAlerts(all, NO_FILTER, '', noOp)).toHaveLength(all.length);
    const noSos = filterAlerts(all, { ...NO_FILTER, hiddenKinds: ['sos'] }, '', noOp);
    expect(noSos.some((e) => e.kind === 'sos')).toBe(false);
    const high = filterAlerts(all, { ...NO_FILTER, severity: 'High' }, '', noOp);
    expect(high.every((e) => ALERT[e.kind].severity === 'High')).toBe(true);
    const notA200 = filterAlerts(all, { ...NO_FILTER, hiddenVehicles: ['A200'] }, '', noOp);
    expect(notA200.some((e) => e.vehicleId === 'A200')).toBe(false);
    const byOperator = filterAlerts(all, NO_FILTER, 'omar', noOp);
    expect(byOperator.every((e) => e.vehicleId === 'A200')).toBe(true);
    const byName = filterAlerts(all, NO_FILTER, 'power cut', noOp);
    expect(byName.every((e) => e.kind === 'power_cut')).toBe(true);
  });

  it('knows when a filter is on', () => {
    expect(isFiltered(NO_FILTER)).toBe(false);
    expect(isFiltered({ ...NO_FILTER, period: '7d' })).toBe(true);
    expect(isFiltered({ ...NO_FILTER, hiddenKinds: [ALL_KINDS[0]!] })).toBe(true);
  });

  it('writes the date and time as in the design and sorts in time order', () => {
    const d = new Date(2026, 10, 23, 14, 16, 35);
    expect(stampText(d)).toBe('2026-11-23 02:16:35 PM');
    expect(stampText(new Date(2026, 10, 23, 0, 5, 1))).toBe('2026-11-23 12:05:01 AM');
    expect(sortStamp(d)).toBe('2026-11-23 14:16:35');
    const e = (h: number) => ({ at: new Date(2026, 10, 23, h) }) as AlertEvent;
    expect(sortStamp(e(9).at) < sortStamp(e(13).at)).toBe(true);
  });
});
