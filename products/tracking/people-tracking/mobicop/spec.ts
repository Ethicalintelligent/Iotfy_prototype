// MobiCop: menu, dashboard, demo tables and reports. Port of legacy XS.mobicop
// (legacy/src/app.js ~868). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const mobicopSpec: ProductSpec = {
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
      'Patrols',
      [
        ['patrols', 'Patrols'],
        ['checkpoints', 'Checkpoint scans'],
        ['incidents', 'Incidents'],
        ['shifts', 'Shifts'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    { label: 'Officers on duty', value: `${c.n}`, sub: 'Shift 18:00 – 02:00', tone: 'ok' },
    { label: 'Checkpoints scanned', value: `${c.i(20, 34)}/36`, sub: 'Tonight' },
    { label: 'Missed checkpoints', value: c.i(0, 3), sub: 'Patrol B', tone: 'warn' },
    { label: 'Incidents', value: c.i(1, 4), sub: '1 open', tone: 'warn' },
  ],
  chart: ['Checkpoint scans per night', 'scans', 34],
  alerts: [
    '!SOS · Officer pressed panic',
    '~Checkpoint missed',
    '~Officer idle 20 min',
    '^Patrol started late',
    '!Man-down detected',
    '~Left patrol area',
  ],
  tables: {
    patrols: {
      title: 'Patrols',
      hint: 'Patrol rounds and their progress.',
      columns: ['Patrol', 'Officer', 'Started', 'Checkpoints', 'Progress', 'Status'],
      rows: 5,
      row: (c, i) => {
        const done = c.i(2, 8);
        return [
          'Patrol ' + 'ABCDE'[i % 5],
          c.a(i),
          c.t(i * 30 + 60),
          `${done}/8`,
          Math.round((done / 8) * 100) + '%',
          done === 8 ? '+Complete' : i === 1 ? '~Behind' : '^In progress',
        ];
      },
    },
    checkpoints: {
      title: 'Checkpoint scans',
      hint: 'NFC or QR scans at each checkpoint.',
      columns: ['Time', 'Officer', 'Checkpoint', 'Site', 'Method', 'Result'],
      row: (c, i) => [
        c.t(i),
        c.a(i),
        'CP-' + c.i(1, 36),
        c.pl(i),
        ['NFC', 'QR'][i % 2]!,
        i === 5 ? '~Late 8 min' : '+On time',
      ],
    },
    incidents: {
      title: 'Incidents',
      hint: 'Reports filed by officers from the app.',
      columns: ['Time', 'Officer', 'Type', 'Location', 'Photos', 'Status'],
      rows: 7,
      row: (c, i) => [
        c.t(i * 9),
        c.a(i),
        ['Suspicious person', 'Open gate', 'Vehicle parked', 'Light failure', 'Fight'][i % 5]!,
        c.pl(i),
        c.i(0, 4),
        i === 0 ? '!Open' : '+Closed',
      ],
    },
    shifts: {
      title: 'Shifts',
      hint: 'Officer rota for this week.',
      columns: ['Officer', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      rows: 0,
      row: (c, i) => [
        c.a(i),
        ...[0, 1, 2, 3, 4].map((d) => ['Night', 'Night', 'Off', 'Day', 'Day'][(i + d) % 5]!),
      ],
    },
  },
  reports: [
    ['Patrol compliance', 'Checkpoints scanned on time per patrol'],
    ['Incident log', 'All incidents with photos and actions'],
    ['Officer activity', 'Distance, idle time and SOS per officer'],
    ['Site coverage', 'How often each checkpoint was visited'],
  ],
};
