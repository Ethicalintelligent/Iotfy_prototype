// Fuel Dispenser Monitoring: menu, dashboard, demo tables and reports. Port of legacy XS.dispenser
// (legacy/src/app.js ~936). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const dispenserSpec: ProductSpec = {
  menu: [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['alerts', 'Alerts'],
      ],
    ],
    [
      'Pumps',
      [
        ['pumps', 'Pump status'],
        ['transactions', 'Transactions'],
        ['totaliser', 'Totaliser checks'],
        ['calibration', 'Calibration'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    {
      label: 'Dispensed today',
      value: c.k(c.i(6, 10) * 1000) + ' L',
      sub: c.i(180, 260) + ' transactions',
    },
    { label: 'Pumps online', value: `${c.n}/${c.n}`, sub: 'All authorised', tone: 'ok' },
    { label: 'Unapproved dispenses', value: c.i(0, 2), sub: 'Pump 4', tone: 'warn' },
    { label: 'Totaliser match', value: '99.8%', sub: 'vs sales system', tone: 'ok' },
  ],
  chart: ['Litres dispensed per day', 'L', 8200],
  alerts: [
    '!Dispense without approval · Pump 4',
    '~Nozzle left open',
    '~Flow rate low',
    '^Calibration due',
    '!Totaliser mismatch',
  ],
  tables: {
    pumps: {
      title: 'Pump status',
      hint: 'Live state of each pump.',
      columns: ['Pump', 'Product', 'State', 'Today', 'Flow rate', 'Last sale'],
      rows: 0,
      row: (c, i) => [
        c.a(i),
        ['Diesel', 'Petrol 91', 'Petrol 95'][i % 3]!,
        i === 1 ? '^Dispensing' : '+Idle',
        c.k(c.i(1, 3) * 1000) + ' L',
        c.i(32, 45) + ' L/min',
        c.t(i),
      ],
    },
    transactions: {
      title: 'Transactions',
      hint: 'Every fill with its approval.',
      columns: ['Time', 'Pump', 'Litres', 'Amount', 'Approved by', 'Vehicle'],
      row: (c, i) => {
        const l = c.f(10, 80);
        return [
          c.t(i),
          c.a(i),
          l + ' L',
          'SAR ' + (Number(l) * 2.33).toFixed(2),
          i === 6 ? '!None' : ['POS', 'Fleet card', 'App'][i % 3]!,
          ['RUH ' + c.i(1000, 9999), '—'][i % 2]!,
        ];
      },
    },
    totaliser: {
      title: 'Totaliser checks',
      hint: 'Pump meter vs sales system each shift.',
      columns: ['Shift', 'Pump', 'Meter', 'Sales system', 'Difference'],
      row: (c, i) => {
        const d = c.i(-3, 40);
        return [
          c.d(Math.floor(i / 3)) + ' ' + ['Morning', 'Evening', 'Night'][i % 3]!,
          c.a(i),
          c.k(c.i(800, 2400)) + ' L',
          '',
          (d > 20 ? '!' : '+') + d + ' L',
        ];
      },
    },
    calibration: {
      title: 'Calibration',
      hint: 'Meter calibration certificates.',
      columns: ['Pump', 'Last calibrated', 'Due', 'By', 'Status'],
      rows: 0,
      row: (c, i) => [
        c.a(i),
        c.d(c.i(60, 300)),
        c.d(-c.i(5, 120)),
        'SASO-approved lab',
        i === 2 ? '~Due soon' : '+Valid',
      ],
    },
  },
  reports: [
    ['Sales by pump', 'Litres and revenue per pump and shift'],
    ['Unapproved dispenses', 'Every fill without a sale'],
    ['Totaliser variance', 'Meter vs sales per shift'],
  ],
};
