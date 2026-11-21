// Indoor Asset Tracking: menu, dashboard, demo tables and reports. Port of legacy XS.indoorasset
// (legacy/src/app.js ~897). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const indoorAssetSpec: ProductSpec = {
  menu: [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['floor', 'Floor view'],
        ['alerts', 'Alerts'],
      ],
    ],
    [
      'Equipment',
      [
        ['locator', 'Find equipment'],
        ['utilisation', 'Utilisation'],
        ['maintenance', 'Maintenance due'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    { label: 'Tagged equipment', value: c.n, sub: 'All seen today', tone: 'ok' },
    { label: 'In use now', value: Math.max(1, Math.round(c.n * 0.6)), sub: '68% utilisation' },
    { label: 'Out of area', value: c.i(0, 1), sub: 'Wheelchair 5', tone: 'warn' },
    { label: 'Service due', value: c.i(0, 2), sub: 'This month' },
  ],
  chart: ['Equipment in use per day', '%', 70],
  alerts: [
    '~Left area · Wheelchair 5',
    '~Tag battery low',
    '!Equipment near exit',
    '^Not seen 24 h',
    '~Service overdue',
  ],
  tables: {
    locator: {
      title: 'Find equipment',
      hint: 'Where each item is right now.',
      columns: ['Equipment', 'Type', 'Location', 'Seen', 'Status'],
      rows: 0,
      row: (c, i) => [
        c.a(i),
        ['Infusion pump', 'Wheelchair', 'Ventilator', 'Monitor'][i % 4]!,
        ['Ward 3 · Room 304', 'Store', 'ICU', 'Corridor B'][i % 4]!,
        c.i(5, 300) + ' s ago',
        i % 2 ? '^Available' : '+In use',
      ],
    },
    utilisation: {
      title: 'Utilisation',
      hint: 'Hours in use this week.',
      columns: ['Equipment', 'Hours in use', 'Hours idle', 'Utilisation', 'Trend'],
      rows: 0,
      row: (c, i) => {
        const u = c.i(20, 90);
        return [
          c.a(i),
          Math.round(u * 1.68),
          Math.round((100 - u) * 1.68),
          (u < 40 ? '~' : '+') + u + '%',
          ['↑', '↓', '→'][i % 3]!,
        ];
      },
    },
    maintenance: {
      title: 'Maintenance due',
      hint: 'Planned maintenance by item.',
      columns: ['Equipment', 'Last service', 'Next due', 'Days left'],
      rows: 0,
      row: (c, i) => {
        const d = c.i(-3, 90);
        return [
          c.a(i),
          c.d(c.i(30, 200)),
          c.d(-d),
          d < 0 ? '!Overdue' : d < 14 ? '~' + d + ' days' : '+' + d + ' days',
        ];
      },
    },
  },
  reports: [
    ['Utilisation', 'Use per item, ward and type'],
    ['Search time saved', 'Requests answered by the locator'],
    ['Losses', 'Items that left the building'],
  ],
};
