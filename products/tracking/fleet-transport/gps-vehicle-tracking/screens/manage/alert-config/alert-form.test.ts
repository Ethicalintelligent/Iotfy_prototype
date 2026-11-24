import { describe, expect, it } from 'vitest';
import type { AlertConfigsRow } from '@iotify/data';
import { ALERT_TYPES, CHOOSABLE, alertType } from './alert-types';
import {
  ampm,
  checks,
  daysText,
  defaults,
  fromConfig,
  idMaker,
  tillText,
  toRows,
} from './alert-form';

const overspeed = alertType('Overspeed');
const sos = alertType('SOS');

describe('alert types', () => {
  it('has the design’s 38 types, 37 of them choosable', () => {
    expect(ALERT_TYPES).toHaveLength(38);
    expect(CHOOSABLE).toHaveLength(37);
    expect(new Set(ALERT_TYPES.map((a) => a.name)).size).toBe(38);
  });
});

describe('checks', () => {
  it('passes the defaults with a vehicle', () => {
    expect(checks(overspeed, defaults(overspeed), 1, '2026-11-23').every((c) => c.ok)).toBe(true);
  });
  it('needs a threshold, a vehicle, a channel and a valid escalation', () => {
    const s = {
      ...defaults(overspeed),
      threshold: '',
      push: false,
      escalate: true,
      escalateTo: 'x',
    };
    const bad = checks(overspeed, s, 0, '2026-11-23').filter((c) => !c.ok);
    expect(bad.map((c) => c.key)).toEqual(['trigger', 'vehicles', 'channels', 'escalation']);
  });
  it('refuses a past date and an end before the start', () => {
    const s = { ...defaults(sos), effectiveTill: '2026-01-01', start: '18:00', end: '08:00' };
    const bad = checks(sos, s, 2, '2026-11-23').filter((c) => !c.ok);
    expect(bad.map((c) => c.key)).toEqual(['period', 'till']);
  });
});

describe('toRows', () => {
  const existing: AlertConfigsRow[] = [
    { id: 'AC1', company_id: 'C1', asset_id: 'A201', alert_type: 'Overspeed' },
    { id: 'AC-C1-4', company_id: 'C1', asset_id: 'A202', alert_type: 'Idle' },
  ];
  it('keeps the id of an existing vehicle + type and makes new ids for the rest', () => {
    const rows = toRows(
      overspeed,
      defaults(overspeed),
      ['A201', 'A202'],
      'C1',
      existing,
      idMaker('C1', existing),
    );
    expect(rows.map((r) => r.id)).toEqual(['AC1', 'AC-C1-5']);
    expect(rows[0]).toMatchObject({ threshold: 120, threshold_unit: 'km/h', interval_value: 10 });
  });
  it('keeps a stored threshold of a type without a threshold box', () => {
    const row: AlertConfigsRow = {
      id: 'AC5',
      company_id: 'C1',
      asset_id: 'A205',
      alert_type: 'Harsh Braking',
      threshold: 0.4,
      threshold_unit: 'g',
    };
    const type = alertType('Harsh Braking');
    const [out] = toRows(type, fromConfig(row, type), ['A205'], 'C1', [row], () => 'new');
    expect(out).toMatchObject({ id: 'AC5', threshold: 0.4, threshold_unit: 'g' });
  });
});

describe('texts', () => {
  it('formats times, days and dates', () => {
    expect(ampm('00:00')).toBe('12:00 AM');
    expect(ampm('23:59')).toBe('11:59 PM');
    expect(daysText(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])).toBe('Every day');
    expect(daysText(['Fri', 'Mon', 'Tue', 'Wed', 'Thu'])).toBe('Weekdays');
    expect(daysText(['Wed', 'Sun'])).toBe('Sun, Wed');
    expect(tillText(null)).toBe('Forever');
    expect(tillText('2026-12-31')).toBe('31 Dec 2026');
  });
});
