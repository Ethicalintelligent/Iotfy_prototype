// GPS Workforce Tracking: menu, dashboard, demo tables and reports. Port of legacy XS.workforce
// (legacy/src/app.js ~851). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const workforceSpec: ProductSpec = {
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
      'People',
      [
        ['attendance', 'Attendance'],
        ['visits', 'Site visits'],
        ['tasks', 'Tasks'],
        ['timesheets', 'Timesheets'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    { label: 'In the field', value: `${c.n}`, sub: 'Checked in today', tone: 'ok' },
    { label: 'Site visits', value: c.i(10, 24), sub: '3 in progress' },
    { label: 'Late check-ins', value: c.i(0, 2), sub: 'Before 08:30', tone: 'warn' },
    { label: 'SOS today', value: c.i(0, 1), sub: 'Resolved', tone: 'ok' },
  ],
  chart: ['Site visits per day', 'visits', 20],
  alerts: [
    '!SOS pressed',
    '~Late check-in',
    '~Left client site early',
    '^Phone battery low',
    '~GPS off for 20 min',
    '!No movement 45 min',
  ],
  tables: {
    attendance: {
      title: 'Attendance',
      hint: 'Check-in and check-out with location.',
      columns: ['Date', 'Staff', 'Check-in', 'Location', 'Check-out', 'Hours'],
      row: (c, i) => [
        c.d(Math.floor(i / c.n)),
        c.a(i),
        (i % 6 === 2 ? '~' : '') + ['07:52', '08:05', '08:41', '07:58'][i % 4]!,
        c.pl(i),
        ['16:10', '17:02', '16:45', '—'][i % 4]!,
        c.f(7, 9),
      ],
    },
    visits: {
      title: 'Site visits',
      hint: 'Visits to client sites, proved by geofence.',
      columns: ['Time', 'Staff', 'Client site', 'Arrived', 'Left', 'Duration'],
      row: (c, i) => [
        c.d(0),
        c.a(i),
        'Client site ' + c.i(1, 12),
        c.t(i * 4 + 2),
        i < 2 ? '^On site' : c.t(i * 4),
        c.i(15, 140) + ' min',
      ],
    },
    tasks: {
      title: 'Tasks',
      hint: 'Jobs assigned to field staff.',
      columns: ['Task', 'Staff', 'Site', 'Due', 'Status'],
      row: (c, i) => [
        ['AC maintenance', 'Meter reading', 'Installation', 'Inspection', 'Repair visit'][i % 5]!,
        c.a(i),
        'Client site ' + c.i(1, 12),
        c.t(i * 6),
        ['+Done', '^In progress', '~Due soon', '+Done'][i % 4]!,
      ],
    },
    timesheets: {
      title: 'Timesheets',
      hint: 'Weekly hours from check-ins.',
      columns: ['Staff', 'Week', 'Days', 'Hours', 'Overtime', 'Approved'],
      rows: 0,
      row: (c, i) => [
        c.a(i),
        'This week',
        c.i(4, 6),
        c.i(36, 52),
        c.i(0, 8) + ' h',
        i % 3 ? '+Yes' : '~Pending',
      ],
    },
  },
  reports: [
    ['Attendance summary', 'Days present, late and absent per person'],
    ['Visit proof', 'Time on site per client with map'],
    ['Productivity', 'Tasks done per person per day'],
    ['Travel', 'Distance and travel time per person'],
  ],
};
