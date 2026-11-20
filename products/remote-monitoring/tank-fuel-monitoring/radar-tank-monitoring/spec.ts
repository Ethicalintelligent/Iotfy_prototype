// Radar Tank Monitoring: menu, dashboard, demo tables and reports. Port of legacy XS.tank
// (legacy/src/app.js ~928). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const tankSpec: ProductSpec = {
  menu: [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['alerts', 'Alerts'],
      ],
    ],
    [
      'Tanks',
      [
        ['tanks', 'Tank levels'],
        ['deliveries', 'Deliveries'],
        ['reconciliation', 'Reconciliation'],
        ['forecast', 'Re-order forecast'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    { label: 'Total stock', value: c.k(c.i(70, 110) * 1000) + ' L', sub: 'Across all tanks' },
    { label: 'Lowest tank', value: c.i(18, 40) + '%', sub: 'Tank 2 · Petrol 91', tone: 'warn' },
    { label: 'Deliveries today', value: c.i(1, 2), sub: '+12,000 L' },
    { label: 'Unexplained loss', value: c.i(0, 900) + ' L', sub: 'This week', tone: 'warn' },
  ],
  chart: ['Litres sold per day', 'L', 9000],
  alerts: [
    '!Sudden drop 900 L · Tank 3',
    '~Low level · Tank 2',
    '^Delivery received',
    '~Water detected in tank',
    '^Sensor reading every 60 s',
  ],
  tables: {
    tanks: {
      title: 'Tank levels',
      hint: 'Radar readings, every minute.',
      columns: ['Tank', 'Product', 'Level', 'Volume', 'Water', 'Temperature'],
      rows: 0,
      row: (c, i) => {
        const l = c.i(18, 92);
        return [
          c.a(i),
          ['Diesel', 'Petrol 91', 'Petrol 95'][i % 3]!,
          (l < 25 ? '!' : l < 40 ? '~' : '+') + l + '%',
          c.k(l * 500) + ' L',
          c.i(0, 12) + ' mm',
          c.i(26, 34) + '°C',
        ];
      },
    },
    deliveries: {
      title: 'Deliveries',
      hint: 'Tanker drops matched to delivery notes.',
      columns: ['Time', 'Tank', 'Ordered', 'Measured', 'Difference', 'Status'],
      rows: 8,
      row: (c, i) => {
        const o = c.i(8, 20) * 1000,
          m = o - c.i(-40, 160);
        return [
          c.d(i * 2) + ' ' + c.t(i * 3),
          c.a(i),
          c.k(o) + ' L',
          c.k(m) + ' L',
          (o - m > 100 ? '!' : '') + (m - o) + ' L',
          o - m > 100 ? '~Check' : '+Matched',
        ];
      },
    },
    reconciliation: {
      title: 'Reconciliation',
      hint: 'Opening + deliveries − sales vs closing stock.',
      columns: ['Day', 'Tank', 'Opening', 'Deliveries', 'Sales', 'Closing', 'Variance'],
      row: (c, i) => {
        const v = c.i(-60, 900);
        return [
          c.d(i),
          c.a(i),
          c.k(c.i(20, 40) * 1000),
          c.k(c.i(0, 1) * 12000),
          c.k(c.i(6, 9) * 1000),
          c.k(c.i(20, 40) * 1000),
          (v > 300 ? '!' : '+') + v + ' L',
        ];
      },
    },
    forecast: {
      title: 'Re-order forecast',
      hint: 'When each tank will need a delivery.',
      columns: ['Tank', 'Daily use', 'Days left', 'Order by'],
      rows: 0,
      row: (c, i) => {
        const d = c.i(1, 9);
        return [
          c.a(i),
          c.k(c.i(2, 4) * 1000) + ' L',
          (d < 3 ? '~' : '+') + d + ' days',
          c.d(-d + 1),
        ];
      },
    },
  },
  reports: [
    ['Wet stock reconciliation', 'Daily variance per tank'],
    ['Deliveries', 'Ordered vs received'],
    ['Loss & theft', 'Unexplained drops with times'],
    ['Stock forecast', 'Days of stock left per product'],
  ],
};
