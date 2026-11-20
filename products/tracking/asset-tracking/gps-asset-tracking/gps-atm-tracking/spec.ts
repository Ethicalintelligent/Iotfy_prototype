// GPS ATM Tracking: the ATM screens it adds to GPS Asset Tracking. Port of legacy XS.atmtrack
// (legacy/src/app.js ~883). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const atmTrackingSpec: ProductSpec = {
  menu: [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['map', 'ATM map'],
        ['alerts', 'Alerts'],
      ],
    ],
    [
      'ATMs',
      [
        ['atm_sites', 'ATM sites'],
        ['movements', 'Movement events'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    { label: 'ATMs tracked', value: c.n, sub: 'All in place', tone: 'ok' },
    { label: 'Moved today', value: 0, sub: 'No movement', tone: 'ok' },
    { label: 'Tamper alerts', value: c.i(0, 1), sub: 'This week' },
    { label: 'Tracker battery', value: c.i(80, 98) + '%', sub: 'Average' },
  ],
  chart: ['Tracker reports per day', 'reports', 140],
  alerts: ['!ATM moved · after hours', '~Tilt detected', '~Tracker battery low', '^No report 2 h'],
  tables: {
    atm_sites: {
      title: 'ATM sites',
      hint: 'Where each ATM should be.',
      columns: ['ATM', 'Address', 'Home radius', 'Last report', 'Status'],
      rows: 0,
      row: (c, i) => [c.a(i), c.pl(i) + ', Riyadh', '50 m', c.i(1, 30) + ' min ago', '+In place'],
    },
    movements: {
      title: 'Movement events',
      hint: 'Any move or tilt picked up by the tracker.',
      columns: ['Time', 'ATM', 'Event', 'Distance from home', 'Action'],
      rows: 6,
      row: (c, i) => [
        c.d(i * 4) + ' ' + c.t(i * 3),
        c.a(i),
        ['~Tilt', '^Vibration', '!Moved'][i % 3]!,
        c.i(0, 300) + ' m',
        ['Guard sent', 'Checked on camera', 'False alarm'][i % 3]!,
      ],
    },
  },
  reports: [
    ['Location history', 'Every ATM position for audit'],
    ['Tamper events', 'Tilt, vibration and movement events'],
  ],
};
