import { describe, expect, it } from 'vitest';
import { demoContext } from '@iotify/app-kit';
import {
  DUE_SOON_KM,
  SERVICE_INTERVAL_KM,
  byUrgency,
  demoServiceRows,
  logService,
  plan,
  serviceEntryError,
  statusFor,
  type ServiceRow,
} from './maintenance';

const row: ServiceRow = {
  id: 'A1',
  vehicle: 'Truck 1',
  odometerKm: 50_000,
  lastServiceKm: 42_000,
  lastServiceDate: '2026-09-01',
  lastWork: 'Oil and filter',
  kmPerDay: 200,
};

describe('maintenance', () => {
  it('status: overdue below 0 km left, due soon within the window, else OK', () => {
    expect(statusFor(-1)).toBe('Overdue');
    expect(statusFor(0)).toBe('Due soon');
    expect(statusFor(DUE_SOON_KM)).toBe('Due soon');
    expect(statusFor(DUE_SOON_KM + 1)).toBe('OK');
  });

  it('plans the next service one interval after the last one', () => {
    const p = plan(row);
    expect(p.nextServiceKm).toBe(42_000 + SERVICE_INTERVAL_KM);
    expect(p.kmLeft).toBe(2_000);
    expect(p.status).toBe('OK');
    expect(p.daysLeft).toBe(10);
  });

  it('overdue vehicles have no days left and sort first', () => {
    const late = plan({ ...row, id: 'A2', odometerKm: 53_000 });
    expect(late.kmLeft).toBe(-1_000);
    expect(late.status).toBe('Overdue');
    expect(late.daysLeft).toBe(0);
    expect([plan(row), late].sort(byUrgency)[0]!.id).toBe('A2');
  });

  it('logging a service resets the clock', () => {
    const done = plan(
      logService(row, { date: '2026-11-20', odometerKm: 50_100, work: 'Full service' }),
    );
    expect(done.odometerKm).toBe(50_100);
    expect(done.kmLeft).toBe(SERVICE_INTERVAL_KM);
    expect(done.lastWork).toBe('Full service');
  });

  it('checks a service entry before saving', () => {
    const ok = { date: '2026-11-20', odometerKm: 50_100, work: 'Oil' };
    expect(serviceEntryError(row, ok, '2026-11-21')).toBeNull();
    expect(serviceEntryError(row, { ...ok, date: '' }, '2026-11-21')).toMatch(/date/);
    expect(serviceEntryError(row, { ...ok, date: '2026-11-22' }, '2026-11-21')).toMatch(/future/);
    expect(serviceEntryError(row, { ...ok, odometerKm: 0 }, '2026-11-21')).toMatch(/odometer/);
    expect(serviceEntryError(row, { ...ok, odometerKm: 41_000 }, '2026-11-21')).toMatch(/lower/);
    expect(serviceEntryError(row, { ...ok, work: ' ' }, '2026-11-21')).toMatch(/work/);
  });

  it('demo rows are stable for the same seed', () => {
    const v = [{ id: 'A1', name: 'Truck 1' }];
    const now = new Date(2026, 10, 21);
    const a = demoServiceRows(demoContext('seed', v), v, now);
    const b = demoServiceRows(demoContext('seed', v), v, now);
    expect(a).toEqual(b);
    expect(a[0]!.lastServiceDate).toMatch(/^2026-\d\d-\d\d$/);
    expect(a[0]!.odometerKm - a[0]!.lastServiceKm).toBeLessThan(SERVICE_INTERVAL_KM * 1.2);
  });
});

describe('maintenance demo rows', () => {
  it('a small fleet shows an overdue and a due-soon vehicle', () => {
    const v = [
      { id: 'A1', name: 'Truck 1' },
      { id: 'A2', name: 'Truck 2' },
      { id: 'A3', name: 'Truck 3' },
    ];
    const s = demoServiceRows(demoContext('x', v), v).map((r) => plan(r).status);
    expect(s).toEqual(['Overdue', 'Due soon', 'OK']);
  });
});
