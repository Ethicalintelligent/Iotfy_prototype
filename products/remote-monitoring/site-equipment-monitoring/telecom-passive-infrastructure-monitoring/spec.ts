// Telecom Passive Infrastructure Monitoring: menu, dashboard, demo tables and reports. Port of legacy XS.telecom
// (legacy/src/app.js ~920). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const telecomSpec: ProductSpec = {
  menu: [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['map', 'Sites map'],
        ['alerts', 'Alarms'],
      ],
    ],
    [
      'Sites',
      [
        ['site_status', 'Site status'],
        ['power', 'Power events'],
        ['batteries', 'Batteries'],
        ['access', 'Door access'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    { label: 'Sites', value: c.n, sub: `${Math.max(0, c.n - 1)} on mains`, tone: 'ok' },
    { label: 'On battery', value: 1, sub: 'RUH-221 since 06:40', tone: 'warn' },
    { label: 'Door alarms', value: c.i(0, 2), sub: 'Today', tone: 'warn' },
    { label: 'Site availability', value: c.f(99.2, 99.9) + '%', sub: 'This month', tone: 'ok' },
  ],
  chart: ['Mains outages per day', 'outages', 4],
  alerts: [
    '!Shelter door opened',
    '~Mains power off',
    '~Battery below 50%',
    '!Generator failed to start',
    '^High shelter temperature',
    '~Solar output low',
  ],
  tables: {
    site_status: {
      title: 'Site status',
      hint: 'Power source and alarms per site.',
      columns: ['Site', 'Power source', 'Battery', 'Shelter temp', 'Door', 'Alarms'],
      rows: 0,
      row: (c, i) => [
        c.a(i),
        i === 0 ? '~Battery' : '+Mains',
        c.i(55, 100) + '%',
        c.i(24, 38) + '°C',
        i === 1 ? '!Open' : '+Closed',
        c.i(0, 3),
      ],
    },
    power: {
      title: 'Power events',
      hint: 'Mains, battery and generator changes.',
      columns: ['Time', 'Site', 'Event', 'Duration'],
      row: (c, i) => [
        c.d(Math.floor(i / 2)) + ' ' + c.t(i * 6),
        c.a(i),
        ['~Mains off', '+Mains back', '^Generator start', '^Generator stop'][i % 4]!,
        c.i(5, 240) + ' min',
      ],
    },
    batteries: {
      title: 'Batteries',
      hint: 'Battery health per site.',
      columns: ['Site', 'Charge', 'Runtime left', 'Health', 'Installed'],
      rows: 0,
      row: (c, i) => {
        const b = c.i(40, 100);
        return [
          c.a(i),
          (b < 50 ? '~' : '+') + b + '%',
          c.f(1, 8) + ' h',
          c.i(70, 98) + '%',
          c.d(c.i(200, 900)),
        ];
      },
    },
    access: {
      title: 'Door access',
      hint: 'Who opened each shelter and why.',
      columns: ['Time', 'Site', 'Person', 'Method', 'Work order'],
      rows: 8,
      row: (c, i) => [
        c.d(i) + ' ' + c.t(i * 9),
        c.a(i),
        i === 0 ? '!Unknown' : c.p(i),
        i === 0 ? '—' : ['Smart lock app', 'Card'][i % 2]!,
        i === 0 ? '!None' : 'WO-' + c.i(10000, 99999),
      ],
    },
  },
  reports: [
    ['Site availability', 'Uptime and outage causes per site'],
    ['Energy', 'Grid, generator, battery and solar mix'],
    ['Access audit', 'Door openings matched to work orders'],
    ['Battery health', 'Sites needing battery replacement'],
  ],
};
