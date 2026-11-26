// IT-0056 (bug sheet 20-11-2026, Live track #73): stops across a break in transmission, in
// Centralized Tracking's day analysis (screens/central/analysis.ts; Tracking's analyzeTrack in
// screens/tracking/ported/history-data.ts follows the same rule).
import { describe, expect, it } from 'vitest';
import { analyse } from './screens/central/analysis';
import type { TrackPoint } from './screens/central/demo';

const T0 = Date.parse('2026-11-20T08:00:00Z');
const MIN = 6e4;
/** A report `min` minutes after T0, `northM` metres north of the start. */
const at = (min: number, speed: number, northM: number, ignition = true): TrackPoint => ({
  ts: new Date(T0 + min * MIN).toISOString(),
  lat: 24.7 + northM / 111_000,
  lng: 46.7,
  speed,
  heading: 0,
  ignition,
  flags: 0,
});
/** Reports every 30 s from `from` to `to` minutes, driving at 40 km/h (moving) or standing still. */
function run(from: number, to: number, moving: boolean, startM: number): TrackPoint[] {
  const out: TrackPoint[] = [];
  for (let m = from; m <= to; m += 0.5)
    out.push(at(m, moving ? 40 : 0, moving ? startM + (m - from) * 667 : startM));
  return out;
}
const day = (pts: TrackPoint[]) => analyse(pts, { now: T0 + 10 * 3600e3, rangeEnd: T0 });

describe('stops across a break in transmission', () => {
  it('counts a stop that ended inside a short break (idle 2 min, no data 5 min, then driving)', () => {
    const d = day([...run(0, 10, true, 0), ...run(10.5, 12.5, false, 6670), ...run(17.5, 25, true, 6670)]);
    expect(d.trips).toHaveLength(2);
    expect(d.stops.filter((s) => !s.ongoing)).toHaveLength(1);
  });

  it('keeps one trip when the vehicle drove on during a long break (no false stop)', () => {
    // 15 min without data, but the vehicle is 10 km further on: it did not stop.
    const d = day([...run(0, 10, true, 0), ...run(25, 35, true, 16670)]);
    expect(d.trips).toHaveLength(1);
    expect(d.stops.filter((s) => !s.ongoing)).toHaveLength(0);
  });

  it('splits the trip when the vehicle stayed in place during a long break', () => {
    const d = day([...run(0, 10, true, 0), ...run(25, 35, true, 6670)]);
    expect(d.trips).toHaveLength(2);
    expect(d.stops.filter((s) => !s.ongoing)).toHaveLength(1);
  });

  it('keeps one continuous stop through a break', () => {
    const d = day([
      ...run(0, 10, true, 0),
      ...run(10.5, 14, false, 6670),
      ...run(30, 34, false, 6670),
      ...run(34.5, 40, true, 6670),
    ]);
    expect(d.stops.filter((s) => !s.ongoing)).toHaveLength(1);
  });
});
