// ATM Monitoring: menu, dashboard, demo tables and reports. Port of legacy XS.atm
// (legacy/src/app.js ~889). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const atmSpec: ProductSpec = {
  menu: [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['map', 'ATM map'],
        ['alerts', 'Alarms'],
      ],
    ],
    [
      'ATMs',
      [
        ['atms', 'ATM status'],
        ['cash', 'Cash levels'],
        ['power', 'Power & UPS'],
        ['visits', 'Service visits'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    { label: 'ATMs online', value: `${c.n}/${c.n}`, sub: 'In service', tone: 'ok' },
    { label: 'Low cash', value: c.i(0, 1), sub: 'Refill tomorrow', tone: 'warn' },
    { label: 'Open alarms', value: c.i(1, 3), sub: 'Vibration', tone: 'warn' },
    { label: 'Uptime this month', value: c.f(99.1, 99.9) + '%', sub: 'Target 99.5%', tone: 'ok' },
  ],
  chart: ['Withdrawals per day', 'SAR k', 380],
  alerts: [
    '!Vibration detected',
    '!Door opened outside service',
    '~Cash cassette below 20%',
    '~Mains power lost',
    '^Temperature high',
    '~Camera offline',
  ],
  tables: {
    atms: {
      title: 'ATM status',
      hint: 'Each ATM and its sensors.',
      columns: ['ATM', 'Mode', 'Door', 'Vibration', 'Camera', 'Temperature'],
      rows: 0,
      row: (c, i) => [
        c.a(i),
        '+In service',
        '+Closed',
        i === 0 ? '!Alarm' : '+Quiet',
        '+Online',
        c.i(24, 31) + '°C',
      ],
    },
    cash: {
      title: 'Cash levels',
      hint: 'Cassette levels and forecast refill dates.',
      columns: ['ATM', 'Cassette 100', 'Cassette 500', 'Days left', 'Next refill'],
      rows: 0,
      row: (c, i) => {
        const d = c.i(1, 6);
        return [
          c.a(i),
          c.i(10, 95) + '%',
          c.i(10, 95) + '%',
          (d < 2 ? '!' : d < 3 ? '~' : '+') + d + ' days',
          c.d(-d),
        ];
      },
    },
    power: {
      title: 'Power & UPS',
      hint: 'Mains failures and UPS runtime.',
      columns: ['Time', 'ATM', 'Event', 'UPS', 'Duration'],
      rows: 8,
      row: (c, i) => [
        c.d(i * 2) + ' ' + c.t(i * 4),
        c.a(i),
        ['~Mains lost', '+Mains back', '^UPS test'][i % 3]!,
        c.i(70, 100) + '%',
        c.i(2, 45) + ' min',
      ],
    },
    visits: {
      title: 'Service visits',
      hint: 'Cash-in-transit and engineer visits.',
      columns: ['Date', 'ATM', 'Visit', 'By', 'Door open', 'Matched'],
      rows: 8,
      row: (c, i) => [
        c.d(i * 2),
        c.a(i),
        ['Cash refill', 'Engineer', 'Cleaning'][i % 3]!,
        ['CIT team 3', 'ATM engineer', 'Cleaning crew'][i % 3]!,
        c.i(6, 40) + ' min',
        '+Yes',
      ],
    },
  },
  reports: [
    ['Uptime', 'Availability per ATM and cause of downtime'],
    ['Cash forecast', 'Refill schedule for the next 7 days'],
    ['Alarm log', 'All alarms with response times'],
    ['Visits audit', 'Door openings matched to scheduled visits'],
  ],
};
