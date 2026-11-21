// DG Monitoring: menu, dashboard, demo tables and reports. Port of legacy XS.dg
// (legacy/src/app.js ~904). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const dgSpec: ProductSpec = {
  menu: [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['map', 'Sites map'],
        ['alerts', 'Alerts'],
      ],
    ],
    [
      'Generators',
      [
        ['gens', 'Generator status'],
        ['runs', 'Run hours'],
        ['fuel', 'Fuel events'],
        ['maintenance', 'Maintenance'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    { label: 'Generators', value: c.n, sub: `${Math.max(1, c.n - 1)} running`, tone: 'ok' },
    { label: 'Run hours today', value: c.f(3, 14), sub: 'Mains failures 2' },
    { label: 'Fuel used today', value: c.i(80, 260) + ' L', sub: 'Expected 210 L' },
    { label: 'Fuel theft alerts', value: c.i(0, 1), sub: 'This week', tone: 'warn' },
  ],
  chart: ['Run hours per day', 'h', 9],
  alerts: [
    '!Fuel dropped 40 L in 5 min',
    '~Low fuel 18%',
    '!Generator failed to start',
    '~High coolant temperature',
    '^Service due in 40 h',
    '~Battery voltage low',
  ],
  tables: {
    gens: {
      title: 'Generator status',
      hint: 'Live readings from each generator.',
      columns: ['Generator', 'State', 'Load', 'Fuel', 'Battery', 'Coolant'],
      rows: 0,
      row: (c, i) => {
        const f = c.i(14, 92);
        return [
          c.a(i),
          i === 0 ? '+Running' : '^Standby',
          c.i(20, 70) + ' kVA',
          (f < 20 ? '!' : f < 35 ? '~' : '+') + f + '%',
          c.f(12.4, 13.8) + ' V',
          c.i(70, 92) + '°C',
        ];
      },
    },
    runs: {
      title: 'Run hours',
      hint: 'Each start and stop.',
      columns: ['Start', 'Generator', 'Reason', 'Stop', 'Hours', 'Fuel used'],
      row: (c, i) => [
        c.d(Math.floor(i / 2)) + ' ' + c.t(i * 5),
        c.a(i),
        ['Mains failure', 'Weekly test', 'Mains failure', 'Load shedding'][i % 4]!,
        c.t(i * 5 - 3),
        c.f(0.3, 6),
        c.i(10, 120) + ' L',
      ],
    },
    fuel: {
      title: 'Fuel events',
      hint: 'Refills and suspicious drops.',
      columns: ['Time', 'Generator', 'Event', 'Litres', 'Matched to'],
      rows: 8,
      row: (c, i) => [
        c.d(i * 2) + ' ' + c.t(i * 6),
        c.a(i),
        ['+Refill', '!Sudden drop', '+Refill', '~Slow leak?'][i % 4]!,
        (i % 2 ? '−' : '+') + c.i(30, 400),
        i % 2 ? '—' : 'Delivery note ' + c.i(1000, 9999),
      ],
    },
    maintenance: {
      title: 'Maintenance',
      hint: 'Service by run hours.',
      columns: ['Generator', 'Run hours', 'Last service', 'Next service at', 'Status'],
      rows: 0,
      row: (c, i) => {
        const h = c.i(1200, 9800);
        return [
          c.a(i),
          c.k(h),
          c.d(c.i(20, 90)),
          c.k(Math.ceil(h / 250) * 250),
          i === 0 ? '~Due soon' : '+OK',
        ];
      },
    },
  },
  reports: [
    ['Fuel reconciliation', 'Refills vs consumption vs drops'],
    ['Run hours', 'Hours per generator and reason'],
    ['Mains availability', 'Grid outages by site'],
    ['Maintenance plan', 'Services due in the next 30 days'],
  ],
};
