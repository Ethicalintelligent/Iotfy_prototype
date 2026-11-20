// GPS Asset Tracking: menu, dashboard, demo tables and reports. Port of legacy XS.asset
// (legacy/src/app.js ~876). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const assetSpec: ProductSpec = {
  menu: [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['map', 'Live map'],
        ['alerts', 'Alerts'],
      ],
    ],
    [
      'Assets',
      [
        ['movements', 'Movements'],
        ['geofences', 'Geofences'],
        ['battery', 'Tracker battery'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    { label: 'Assets tracked', value: c.n, sub: 'All reporting', tone: 'ok' },
    { label: 'Moving now', value: c.i(0, 2), sub: 'On a truck' },
    { label: 'Outside home zone', value: c.i(0, 2), sub: 'Port yard', tone: 'warn' },
    { label: 'Low battery', value: c.i(0, 1), sub: 'Under 20%' },
  ],
  chart: ['Distance moved per day', 'km', 60],
  alerts: [
    '~Left geofence · Port yard',
    '!Moved after hours',
    '~Battery under 20%',
    '^No signal 6 h',
    '!Tamper detected',
    '~Long stay at customer',
  ],
  tables: {
    movements: {
      title: 'Movements',
      hint: 'Each time an asset started and stopped moving.',
      columns: ['Started', 'Asset', 'From', 'To', 'Distance', 'Duration'],
      row: (c, i) => [
        c.d(Math.floor(i / 3)) + ' ' + c.t(i * 7),
        c.a(i),
        c.pl(i),
        c.pl(i + 4),
        c.f(0.4, 42) + ' km',
        c.i(5, 180) + ' min',
      ],
    },
    geofences: {
      title: 'Geofences',
      hint: 'Home zones and customer sites.',
      columns: ['Geofence', 'Assets inside', 'Entries this week', 'Alert on'],
      rows: 4,
      row: (c, i) => [
        ['Port yard', 'Customer DC', 'Repair shop', 'Dammam port'][i % 4]!,
        c.i(0, c.n),
        c.i(0, 20),
        '^Exit',
      ],
    },
    battery: {
      title: 'Tracker battery',
      hint: 'Battery and last report per tracker.',
      columns: ['Asset', 'Tracker', 'Battery', 'Last report', 'Report interval'],
      rows: 0,
      row: (c, i) => {
        const b = c.i(12, 99);
        return [
          c.a(i),
          'TRK-' + c.i(1000, 9999),
          (b < 20 ? '!' : b < 40 ? '~' : '+') + b + '%',
          c.i(1, 59) + ' min ago',
          ['Every 10 min', 'Every hour', 'On movement'][i % 3]!,
        ];
      },
    },
  },
  reports: [
    ['Asset movement', 'Where every asset went this month'],
    ['Dwell time', 'Time spent at each site'],
    ['Utilisation', 'Days in use vs idle'],
    ['Battery forecast', 'When each tracker needs a new battery'],
  ],
};
