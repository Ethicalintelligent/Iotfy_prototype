import { describe, expect, it } from 'vitest';
import { dayRoute, liveFleet, type FleetVehicle } from '../../demo/fleet';
import {
  clockText,
  cumulativeKm,
  dayOptions,
  historyRoute,
  hoursUpTo,
  liveRoute,
  nextSpeed,
  odometerAt,
} from './track';

const fleet: FleetVehicle[] = [...Array(12)].map((_, i) => ({
  id: `A${200 + i}`,
  callSign: `Truck ${i + 1}`,
  plate: `KSA ${1000 + i}`,
  category: 'Truck',
  make: 'Isuzu',
  model: 'NPR',
  group: null,
  odometerKm: 50_000 + i * 1000,
  speedLimit: 80,
  operator: null,
}));
const now = new Date(2026, 10, 23, 14, 30);
const live = liveFleet(fleet, now);

describe('tracking', () => {
  it("moves today's route so it ends at the live position", () => {
    for (const v of live.filter((x) => x.status !== 'ytt')) {
      const r = liveRoute(v, now);
      const last = r.points[r.points.length - 1];
      if (!last) continue;
      expect(last.lat).toBeCloseTo(v.lat, 9);
      expect(last.lng).toBeCloseTo(v.lng, 9);
      // Same shape and totals as the generated route.
      const raw = dayRoute(v, now, v.status);
      expect(r.points).toHaveLength(raw.points.length);
      expect(r.stops).toHaveLength(raw.stops.length);
      expect(r.distance).toBe(raw.distance);
    }
  });

  it('has no route for a vehicle that never reported', () => {
    const ytt = live.find((v) => v.status === 'ytt')!;
    expect(liveRoute(ytt, now).points).toEqual([]);
    expect(historyRoute(ytt, now, 3).points).toEqual([]);
  });

  it('gives a past day its own route', () => {
    const v = live.find((x) => x.status === 'running')!;
    const r = historyRoute(v, now, 2);
    expect(r.points.length).toBeGreaterThan(0);
    expect(r.points.every((p) => p.at.getDate() === 21)).toBe(true);
  });

  it('adds up time per status up to a moment', () => {
    const segs = [
      { from: 6, to: 7, status: 'running' as const },
      { from: 7, to: 7.5, status: 'overspeed' as const },
      { from: 7.5, to: 8, status: 'idle' as const },
      { from: 8, to: 10, status: 'stopped' as const },
    ];
    expect(hoursUpTo(segs)).toEqual({ running: 1.5, stopped: 2, idle: 0.5 });
    expect(hoursUpTo(segs, new Date(2026, 10, 23, 9, 0))).toEqual({
      running: 1.5,
      stopped: 1,
      idle: 0.5,
    });
    expect(hoursUpTo(segs, new Date(2026, 10, 23, 5, 0))).toEqual({
      running: 0,
      stopped: 0,
      idle: 0,
    });
  });

  it('measures the odometer along a route', () => {
    const v = live.find((x) => x.status === 'running')!;
    const r = liveRoute(v, now);
    const cum = cumulativeKm(r.points);
    expect(cum[0]).toBe(0);
    expect(cum.every((k, i) => i === 0 || k >= cum[i - 1]!)).toBe(true);
    // The 2-minute steps add up to the route's distance.
    expect(Math.abs(cum[cum.length - 1]! - r.distance)).toBeLessThan(r.distance * 0.02 + 0.2);
    expect(odometerAt(1000, cum, cum.length - 1)).toBe(1000);
    expect(odometerAt(1000, cum, 0)).toBe(Math.round(1000 - cum[cum.length - 1]!));
  });

  it('offers the last 7 days', () => {
    const o = dayOptions(now);
    expect(o.map((x) => x.label)).toEqual([
      'Today',
      'Yesterday',
      '21 Nov',
      '20 Nov',
      '19 Nov',
      '18 Nov',
      '17 Nov',
    ]);
    expect(o[3]!.value).toBe('3');
  });

  it('cycles the playback speed and writes the time with seconds', () => {
    expect([nextSpeed(1), nextSpeed(2), nextSpeed(4)]).toEqual([2, 4, 1]);
    expect(clockText(new Date(2026, 10, 23, 14, 28, 5))).toBe('02:28:05 PM');
  });
});
