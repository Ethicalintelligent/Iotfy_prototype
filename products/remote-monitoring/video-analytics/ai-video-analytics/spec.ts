// AI Video Analytics: menu, dashboard, demo tables, reports and zone rules. Port of legacy
// XS.video (legacy/src/app.js ~944). Demo content only.
import type { ProductSpec } from '@iotify/app-kit';

export const videoSpec: ProductSpec = {
  menu: [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['cameras', 'Cameras'],
        ['events', 'AI events'],
      ],
    ],
    [
      'Analytics',
      [
        ['ppe', 'PPE compliance'],
        ['intrusion', 'Intrusion'],
        ['counting', 'People & vehicle counts'],
      ],
    ],
    [
      'Reports',
      [
        ['reports', 'Reports'],
        ['rules', 'Zones & rules'],
      ],
    ],
  ],
  kpis: (c) => [
    { label: 'Cameras online', value: `${c.n}/${c.n}`, sub: 'Edge AI running', tone: 'ok' },
    { label: 'Intrusions today', value: c.i(1, 4), sub: 'North gate', tone: 'warn' },
    { label: 'PPE violations', value: c.i(6, 18), sub: 'Mostly helmets', tone: 'warn' },
    { label: 'People counted', value: c.k(c.i(300, 900)), sub: 'Today' },
  ],
  chart: ['AI events per day', 'events', 26],
  alerts: [
    '!Intrusion · North gate perimeter',
    '~No helmet',
    '~No safety vest',
    '^Loitering 3 min',
    '!Vehicle in pedestrian zone',
    '~Camera view blocked',
  ],
  tables: {
    cameras: {
      title: 'Cameras',
      hint: 'Cameras and the AI models running on them.',
      columns: ['Camera', 'Location', 'Models', 'FPS', 'Status'],
      rows: 0,
      row: (c, i) => [
        c.a(i),
        ['Perimeter', 'Loading dock', 'Yard'][i % 3]!,
        ['Intrusion, counting', 'PPE, vehicles', 'PPE, loitering'][i % 3]!,
        c.i(10, 25),
        '+Online',
      ],
    },
    events: {
      title: 'AI events',
      hint: 'Detections with a snapshot each.',
      columns: ['Time', 'Camera', 'Detection', 'Confidence', 'Snapshot', 'Status'],
      row: (c, i) => [
        c.t(i * 2),
        c.a(i),
        ['!Intrusion', '~No helmet', '~No vest', '^Loitering', '!Vehicle in walkway'][i % 5]!,
        c.i(86, 99) + '%',
        '▣ View',
        i < 3 ? '~To review' : '+Reviewed',
      ],
    },
    ppe: {
      title: 'PPE compliance',
      hint: 'Helmet and vest checks per camera.',
      columns: ['Camera', 'People seen', 'Helmet', 'Vest', 'Compliance'],
      rows: 0,
      row: (c, i) => {
        const p = c.i(76, 99);
        return [
          c.a(i),
          c.i(40, 300),
          c.i(80, 99) + '%',
          c.i(80, 99) + '%',
          (p < 85 ? '~' : '+') + p + '%',
        ];
      },
    },
    intrusion: {
      title: 'Intrusion',
      hint: 'Entries into protected zones.',
      columns: ['Time', 'Camera', 'Zone', 'Object', 'Action'],
      rows: 8,
      row: (c, i) => [
        c.d(Math.floor(i / 2)) + ' ' + c.t(i * 11),
        c.a(i),
        ['Perimeter fence', 'Roof', 'Cash room door'][i % 3]!,
        ['Person', 'Vehicle'][i % 2]!,
        ['Guard sent', 'Siren', 'False alarm'][i % 3]!,
      ],
    },
    counting: {
      title: 'People & vehicle counts',
      hint: 'Counts per camera per hour.',
      columns: ['Hour', 'Camera', 'People in', 'People out', 'Vehicles'],
      row: (c, i) => [c.t(i * 60).slice(0, 2) + ':00', c.a(i), c.i(5, 90), c.i(5, 90), c.i(0, 30)],
    },
  },
  reports: [
    ['Safety compliance', 'PPE rate per site and shift'],
    ['Security', 'Intrusions and responses'],
    ['Traffic', 'People and vehicle flow by hour'],
  ],
  rules: [
    ['North gate perimeter', 'Person crosses line 22:00 – 06:00', 'Siren + app'],
    ['PPE zone · loading dock', 'Helmet and vest required', 'App'],
    ['Pedestrian walkway', 'No vehicles allowed', 'App + SMS'],
  ],
};
