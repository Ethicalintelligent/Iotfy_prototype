import { describe, expect, it } from 'vitest';
import {
  addDays,
  AREAS,
  alertEvents,
  dayRoute,
  dayStats,
  dayTimeline,
  distanceM,
  hash,
  insidePolygon,
  liveFleet,
  startOfDay,
  type FleetVehicle,
} from './fleet';

const fleet: FleetVehicle[] = [...Array(12)].map((_, i) => ({
  id: `A${200 + i}`,
  callSign: `Truck ${i + 1}`,
  plate: `KSA ${1000 + i}`,
  category: 'Truck',
  make: 'Isuzu',
  model: 'NPR',
  group: i % 2 ? 'North fleet' : 'South fleet',
  odometerKm: 50_000 + i * 1000,
  speedLimit: 80,
  operator: null,
}));
const now = new Date(2026, 10, 23, 14, 30);

describe('demo fleet', () => {
  it('is the same for the same vehicles and time', () => {
    expect(liveFleet(fleet, now)).toEqual(liveFleet(fleet, now));
  });

  it("keeps every vehicle's status when another vehicle is added", () => {
    const before = new Map(liveFleet(fleet, now).map((v) => [v.id, v.status]));
    const more = [...fleet, { ...fleet[0]!, id: 'A999', callSign: 'Test 99' }];
    for (const v of liveFleet(more, now).filter((x) => x.id !== 'A999'))
      expect(v.status === 'overspeed' ? 'running' : v.status).toBe(
        before.get(v.id) === 'overspeed' ? 'running' : before.get(v.id),
      );
    const statuses = [...before.values()];
    expect(statuses.some((x) => x === 'running' || x === 'overspeed')).toBe(true);
  });

  it("keeps an alert's time and place as the day goes on", () => {
    const morning = new Date(2026, 10, 23, 10, 0);
    const kinds = ['overspeed', 'harsh_braking', 'idle', 'sos', 'geofence_exit'] as const;
    const early = alertEvents(liveFleet(fleet, morning), morning, [...kinds], morning);
    const late = alertEvents(liveFleet(fleet, morning), morning, [...kinds], now);
    const byId = new Map(late.map((e) => [e.id, e]));
    for (const e of early) {
      expect(byId.get(e.id)?.at.getTime()).toBe(e.at.getTime());
      expect(byId.get(e.id)?.lat).toBe(e.lat);
    }
  });

  it('drives a route near home whose distance matches the day', () => {
    const y = addDays(startOfDay(now), -1);
    for (const v of fleet) {
      const route = dayRoute(v, y);
      const stats = dayStats(dayTimeline(v, y), v, y);
      if (!stats.km) continue;
      expect(Math.abs(route.distance - stats.km) / stats.km).toBeLessThan(0.25);
      const home = AREAS[hash(v.id) % AREAS.length]!;
      for (const p of route.points)
        expect(distanceM([home.lat, home.lng], [p.lat, p.lng])).toBeLessThan(7000);
    }
  });

  it('never-reported vehicles have no activity, no report and no alerts', () => {
    const live = liveFleet(fleet, now);
    const ytt = live.filter((v) => v.status === 'ytt');
    for (const v of ytt) {
      expect(v.lastReport).toBeNull();
      expect(dayTimeline(v, now, v.status)).toEqual([]);
    }
    const events = alertEvents(live, now, ['overspeed', 'sos', 'idle'], now);
    expect(events.some((e) => ytt.some((v) => v.id === e.vehicleId))).toBe(false);
    expect(events.every((e) => e.at <= now)).toBe(true);
  });

  it("today's timeline runs inside the day, up to now, ending in the current status", () => {
    for (const v of liveFleet(fleet, now).filter((x) => x.status === 'running')) {
      const segs = dayTimeline(v, now, v.status);
      expect(segs.length).toBeGreaterThan(0);
      for (const s of segs) {
        expect(s.from).toBeGreaterThanOrEqual(0);
        expect(s.to).toBeLessThanOrEqual(14.5 + 1e-9);
        expect(s.to).toBeGreaterThan(s.from);
      }
      expect(segs[segs.length - 1]!.status).toBe('running');
    }
  });

  it("yesterday's totals add up", () => {
    const y = addDays(startOfDay(now), -1);
    const v = fleet[0]!;
    const segs = dayTimeline(v, y);
    const s = dayStats(segs, v, y);
    const total = Object.values(s.hours).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(
      segs.reduce((a, x) => a + x.to - x.from, 0),
      6,
    );
    expect(s.km).toBeGreaterThanOrEqual(0);
  });
});

describe('geometry', () => {
  it('measures distance and finds points in polygons', () => {
    expect(distanceM([24.7, 46.7], [24.7, 46.7])).toBe(0);
    expect(Math.round(distanceM([24.7, 46.7], [24.8, 46.7]) / 100) / 10).toBeCloseTo(11.1, 0);
    const sq: [number, number][] = [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ];
    expect(insidePolygon([0.5, 0.5], sq)).toBe(true);
    expect(insidePolygon([1.5, 0.5], sq)).toBe(false);
  });
});
