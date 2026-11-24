import { describe, expect, it } from 'vitest';
import type { RoutePoint } from '../../demo/fleet';
import { positionAt, span } from './replay';

const at = (h: number) => new Date(2026, 10, 23, h);
const pt = (h: number, lat: number, lng: number, speed = 40): RoutePoint => ({
  lat,
  lng,
  at: at(h),
  speed,
  status: 'running',
});

describe('positionAt', () => {
  const route = [pt(8, 24, 46), pt(10, 26, 48, 60)];
  it('is halfway between two points at the halfway time', () => {
    const p = positionAt(route, at(9).getTime())!;
    expect(p.lat).toBeCloseTo(25);
    expect(p.lng).toBeCloseTo(47);
    expect(p.outside).toBe(false);
  });
  it('parks at the ends outside the route time', () => {
    expect(positionAt(route, at(6).getTime())).toMatchObject({ lat: 24, lng: 46, outside: true });
    expect(positionAt(route, at(12).getTime())).toMatchObject({ lat: 26, lng: 48, outside: true });
  });
  it('has no position without points', () => {
    expect(positionAt([], at(9).getTime())).toBeNull();
  });
});

describe('span', () => {
  it('covers every route', () => {
    expect(span([[pt(8, 0, 0), pt(9, 0, 0)], [], [pt(7, 0, 0), pt(11, 0, 0)]])).toEqual([
      at(7).getTime(),
      at(11).getTime(),
    ]);
    expect(span([[]])).toBeNull();
  });
});
