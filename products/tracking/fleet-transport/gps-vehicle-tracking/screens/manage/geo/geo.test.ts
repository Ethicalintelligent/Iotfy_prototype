import { describe, expect, it } from 'vitest';
import type { GeofencesRow } from '@iotify/data';
import {
  blankZone,
  circlePoints,
  daysText,
  intervalsOf,
  pointsOf,
  rowShape,
  validTill,
  zoneFromRow,
  zoneProblems,
  zoneRow,
} from './geo';

const circle: GeofencesRow = {
  id: 'GF11',
  company_id: 'C1',
  name: 'Head Office',
  shape: 'Circle',
  center_lat: 24.7136,
  center_lng: 46.6753,
  radius_m: 600,
  points: null,
  zone_type: 'Preferred',
  active: true,
  speed_limit_kmh: 40,
  height_limit_m: null,
  time_intervals: [{ from: '07:00', to: '19:00' }],
};

describe('zone form', () => {
  it('a blank zone needs a name and a centre', () => {
    expect(zoneProblems(blankZone())).toEqual([
      'Give the zone a name.',
      "Click the map to place the circle's centre.",
    ]);
  });

  it('a freeform zone needs 3 corners', () => {
    const d = { ...blankZone(), name: 'Yard', shape: 'Freeform' as const, points: [[1, 2]] };
    expect(zoneProblems(d as never)).toEqual([
      'Click at least 3 points on the map to draw the boundary.',
    ]);
  });

  it('checks limits and intervals', () => {
    const d = {
      ...blankZone(),
      name: 'Yard',
      centre: [24, 46] as [number, number],
      speed: '-5',
      height: 'abc',
      intervals: [
        { from: '08:00', to: '' },
        { from: '09:00', to: '09:00' },
      ],
    };
    expect(zoneProblems(d)).toHaveLength(4);
  });

  it('reads a saved zone and writes it back unchanged', () => {
    const d = zoneFromRow(circle);
    expect(d.centre).toEqual([24.7136, 46.6753]);
    expect(d.speed).toBe('40');
    expect(d.height).toBe('');
    expect(zoneProblems(d)).toEqual([]);
    expect(zoneRow(d, 'GF11', 'C1')).toEqual({
      id: 'GF11',
      company_id: 'C1',
      name: 'Head Office',
      shape: 'Circle',
      center_lat: 24.7136,
      center_lng: 46.6753,
      radius_m: 600,
      points: null,
      zone_type: 'Preferred',
      active: true,
      speed_limit_kmh: 40,
      height_limit_m: null,
      time_intervals: [{ from: '07:00', to: '19:00' }],
    });
  });

  it('a freeform zone keeps only its corners; empty intervals are dropped', () => {
    const row = zoneRow(
      {
        ...blankZone(),
        name: ' Yard ',
        shape: 'Freeform',
        centre: [1, 1],
        points: [
          [24.1234567, 46.1],
          [24.2, 46.2],
          [24.3, 46.1],
        ],
      },
      'GF20',
      'C1',
    );
    expect(row.name).toBe('Yard');
    expect(row.center_lat).toBeNull();
    expect(row.radius_m).toBeNull();
    expect((row.points as number[][])[0]).toEqual([24.123457, 46.1]);
    expect(row.time_intervals).toBeNull();
  });

  it('ignores malformed stored json', () => {
    expect(intervalsOf([{ from: '7', to: '19:00' }, null, { from: '07:00', to: '08:00' }])).toEqual(
      [{ from: '07:00', to: '08:00' }],
    );
    expect(pointsOf([[1, 2], 'x', [3]])).toEqual([[1, 2]]);
    expect(pointsOf(null)).toEqual([]);
  });
});

describe('map shapes', () => {
  it('draws a circle as a fine polygon around its centre', () => {
    const pts = circlePoints(24.7, 46.7, 1000, 8);
    expect(pts).toHaveLength(8);
    const lats = pts.map((p) => p[0]);
    expect(Math.max(...lats) - 24.7).toBeCloseTo(1000 / 111_320, 6);
    const s = rowShape(circle)!;
    expect(s.shape).toBe('polygon');
    expect(s.hue).toBe('green');
    expect(s.name).toBe('Head Office · Preferred');
  });
});

describe('association', () => {
  it('names the days', () => {
    expect(daysText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])).toBe('Every day');
    expect(daysText(['Wed', 'Mon'])).toBe('Mon, Wed');
    expect(daysText([])).toBe('No days');
  });

  it('works out the last valid date', () => {
    const today = new Date(2026, 10, 23);
    expect(validTill('forever', '', today)).toBeNull();
    expect(validTill('1m', '', today)).toBe('2026-12-23');
    expect(validTill('1y', '', today)).toBe('2027-11-23');
    expect(validTill('1m', '', new Date(2027, 0, 31))).toBe('2027-02-28');
    expect(validTill('custom', '2027-03-01', today)).toBe('2027-03-01');
    expect(validTill('custom', '', today)).toBeNull();
  });
});
