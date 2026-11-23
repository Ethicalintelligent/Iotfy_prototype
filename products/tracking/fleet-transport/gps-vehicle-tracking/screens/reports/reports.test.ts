import { describe, expect, it } from 'vitest';
import { liveFleet, type FleetVehicle } from '../../demo/fleet';
import { REPORTS } from './catalogue';
import {
  dayCache,
  dur,
  formatter,
  periodDays,
  periodProblem,
  periodText,
  quickOf,
  quickPeriod,
  sessions,
} from './data';
import type { ReportInput } from './types';

const now = new Date(2026, 10, 23, 14, 30);

describe('report periods', () => {
  it('turns quick ranges into dates', () => {
    expect(quickPeriod('yesterday', now)).toEqual({ from: '2026-11-22', to: '2026-11-22' });
    expect(quickPeriod('7d', now)).toEqual({ from: '2026-11-17', to: '2026-11-23' });
    expect(periodDays(quickPeriod('30d', now))).toHaveLength(30);
    expect(quickOf({ from: '2026-11-17', to: '2026-11-23' }, now)).toBe('7d');
    expect(quickOf({ from: '2026-11-10', to: '2026-11-12' }, now)).toBeNull();
  });

  it('allows a day or up to 31 days, never in the future', () => {
    expect(periodProblem({ from: '2026-10-24', to: '2026-11-23' }, now)).toBeNull();
    expect(periodProblem({ from: '2026-10-23', to: '2026-11-23' }, now)).toMatch(/31 days/);
    expect(periodProblem({ from: '2026-11-20', to: '2026-11-19' }, now)).toMatch(/before/);
    expect(periodProblem({ from: '2026-11-20', to: '2026-11-24' }, now)).toMatch(/after today/);
  });

  it('writes periods and times plainly', () => {
    expect(periodText({ from: '2026-11-22', to: '2026-11-22' })).toBe('22 Nov 2026');
    expect(periodText({ from: '2026-11-16', to: '2026-11-22' })).toBe('16 – 22 Nov 2026');
    expect(periodText({ from: '2026-10-28', to: '2026-11-03' })).toBe('28 Oct – 3 Nov 2026');
    const t = new Date(2026, 10, 22, 17, 5);
    expect(formatter(true).dateTime(t)).toBe('22 Nov 2026, 05:05 PM');
    expect(formatter(false).dateTime(t)).toBe('22 Nov 2026, 17:05');
    expect(dur(0)).toBe('0s');
    expect(dur(1.5)).toBe('1h 30m');
  });

  it('splits a day into engine-on sessions at each stop', () => {
    const s = sessions([
      { from: 6, to: 7, status: 'running' },
      { from: 7, to: 7.1, status: 'idle' },
      { from: 7.1, to: 8, status: 'overspeed' },
      { from: 8, to: 9, status: 'stopped' },
      { from: 9, to: 9.2, status: 'idle' },
      { from: 10, to: 11, status: 'running' },
    ]);
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ from: 6, to: 8 });
    expect(s[0]!.idle).toBeCloseTo(0.1);
  });
});

describe('every report', () => {
  const vehicles: FleetVehicle[] = Array.from({ length: 8 }, (_, i) => ({
    id: `V${i + 1}`,
    callSign: `Truck 0${i + 1}`,
    plate: `KSA 10${i}`,
    category: 'Truck',
    make: 'Isuzu',
    model: 'NPR',
    group: i < 5 ? 'North' : null,
    odometerKm: 20_000,
    speedLimit: 80,
    operator: i % 2 ? 'Driver A' : null,
  }));
  const live = liveFleet(vehicles, now);
  const input = (days: Date[]): ReportInput => ({
    companyId: 'C1',
    vehicles: live,
    days,
    now,
    fmt: formatter(true),
    cond: {},
    day: dayCache(now),
    fences: [],
    operators: [
      { id: 'OP1', company_id: 'C1', name: 'Driver A', tag_id: 'TAG-1', status: 'Active' },
    ],
    users: [
      { id: 'U1', name: 'Fleet admin', role: 'Company Admin', email: null, userName: 'admin' },
    ],
    roles: ['Company Admin', 'Fleet Manager'],
    devices: new Map(),
    extra: new Map(),
    covered: null,
  });

  it.each(REPORTS.map((r) => [r.label, r] as const))('%s builds rows with unique ids', (_, r) => {
    for (const days of [
      periodDays(quickPeriod('yesterday', now)),
      periodDays(quickPeriod('7d', now)),
    ]) {
      const rows = r.build(input(days));
      expect(new Set(rows.map((x) => x.id)).size).toBe(rows.length);
      for (const row of rows) for (const c of r.columns) expect(c.key in row).toBe(true);
    }
  });

  it('has an activity row for each vehicle that reported yesterday', () => {
    const exec = REPORTS.find((r) => r.key === 'executive-summary')!;
    const rows = exec.build(input(periodDays(quickPeriod('yesterday', now))));
    expect(rows.length).toBe(live.filter((v) => v.status !== 'ytt').length);
  });
});
