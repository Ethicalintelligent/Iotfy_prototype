// Indoor People Tracking: menu, dashboard, demo tables, reports and zone rules. Port of legacy
// XS.indoorpeople (legacy/src/app.js ~859). Demo content only (invented names).
import type { ProductSpec } from '@iotify/app-kit';

export const peopleSpec: ProductSpec = {
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
      'People',
      [
        ['presence', 'Presence by zone'],
        ['visitors', 'Visitors'],
        ['muster', 'Evacuation roll call'],
        ['contact', 'Contact tracing'],
      ],
    ],
    [
      'Reports',
      [
        ['reports', 'Reports'],
        ['rules', 'Zone rules'],
      ],
    ],
  ],
  kpis: (c) => [
    { label: 'On site now', value: c.i(28, 60), sub: '12 visitors', tone: 'ok' },
    { label: 'Restricted entries', value: c.i(0, 3), sub: 'Today', tone: 'warn' },
    { label: 'Badges offline', value: c.i(0, 2), sub: 'Battery low' },
    { label: 'Last roll call', value: '0 missing', sub: 'Drill 10 Nov', tone: 'ok' },
  ],
  chart: ['People on site per day', 'people', 48],
  alerts: [
    '!Restricted area · Server room',
    '~Visitor without escort',
    '~Badge battery low',
    '!Panic button pressed',
    '^Badge not seen 2 h',
    '~Overcrowding · Meeting room',
  ],
  tables: {
    presence: {
      title: 'Presence by zone',
      hint: 'Who is in each zone right now.',
      columns: ['Zone', 'Floor', 'People now', 'Capacity', 'Longest stay'],
      rows: 6,
      row: (c, i) => {
        const n = c.i(0, 24);
        const cap = [20, 40, 12, 8, 30, 10][i % 6]!;
        return [
          ['Lobby', 'Lab', 'Server room', 'Meeting room', 'Office A', 'Store'][i % 6]!,
          'Floor ' + (1 + (i % 3)),
          (n > cap ? '!' : '') + n,
          cap,
          c.i(5, 240) + ' min',
        ];
      },
    },
    visitors: {
      title: 'Visitors',
      hint: 'Visitor badges issued at reception.',
      columns: ['Visitor', 'Company', 'Host', 'Badge', 'In', 'Out'],
      row: (c, i) => [
        c.p(i + 6),
        ['Supplier', 'Contractor', 'Auditor', 'Consultant'][i % 4]!,
        c.p(i),
        'V-' + c.i(100, 199),
        c.t(i * 5 + 3),
        i < 3 ? '^On site' : c.t(i * 5),
      ],
    },
    muster: {
      title: 'Evacuation roll call',
      hint: 'Last drills and who reached the assembly point.',
      columns: ['Date', 'Building', 'On site', 'At assembly point', 'Missing', 'Time to clear'],
      rows: 5,
      row: (c, i) => [
        c.d(i * 14 + 8),
        ['HQ', 'Annex'][i % 2]!,
        c.i(40, 80),
        c.i(40, 80),
        i === 1 ? '!1' : '+0',
        c.i(3, 7) + ' min',
      ],
    },
    contact: {
      title: 'Contact tracing',
      hint: 'Who was near whom, from badge proximity.',
      columns: ['Person', 'Close contacts', 'Longest contact', 'Zone', 'Date'],
      rows: 6,
      row: (c, i) => [
        c.a(i),
        c.i(0, 9),
        c.i(5, 45) + ' min',
        ['Lab', 'Office A', 'Lobby'][i % 3]!,
        c.d(c.i(0, 3)),
      ],
    },
  },
  reports: [
    ['Occupancy', 'People per zone by hour'],
    ['Restricted access', 'All entries into restricted zones'],
    ['Visitors', 'Visitor log by host and company'],
    ['Roll call history', 'Drill results and clearance times'],
  ],
  rules: [
    ['Server room', 'Only IT badge group may enter', 'App + SMS'],
    ['Visitor escort', 'Visitor alone for 5 min', 'App'],
    ['Overcrowding', 'Meeting room above 8 people', 'App'],
  ],
};
