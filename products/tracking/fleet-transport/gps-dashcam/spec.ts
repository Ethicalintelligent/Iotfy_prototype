// GPS Dashcam: menu, dashboard, demo tables and reports. Port of legacy XS.dashcam
// (legacy/src/app.js ~827). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const dashcamSpec: ProductSpec = {
  menu: [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['map', 'Live map'],
        ['events', 'Video events'],
      ],
    ],
    [
      'Review',
      [
        ['clips', 'Video clips'],
        ['drivers', 'Driver behaviour'],
        ['coaching', 'Coaching'],
      ],
    ],
    [
      'Reports',
      [
        ['reports', 'Reports'],
        ['rules', 'AI alert rules'],
      ],
    ],
  ],
  kpis: (c) => [
    { label: 'Cameras online', value: `${c.n}/${c.n}`, sub: 'Road + driver view', tone: 'ok' },
    { label: 'AI events today', value: c.i(8, 30), sub: '3 need review', tone: 'warn' },
    { label: 'Collision warnings', value: c.i(0, 4), sub: 'This week' },
    { label: 'Fleet safety score', value: c.i(78, 92), sub: '+2 this week', tone: 'ok' },
  ],
  chart: ['AI events per day', 'events', 22],
  alerts: [
    '!Forward collision warning',
    '~Driver using phone',
    '~Driver drowsy',
    '!Harsh braking with video',
    '~Not wearing seat belt',
    '^Camera covered',
  ],
  tables: {
    events: {
      title: 'Video events',
      hint: 'AI-detected events with a 20-second clip each.',
      columns: ['Time', 'Vehicle', 'Driver', 'Event', 'Speed', 'Clip', 'Review'],
      row: (c, i) => [
        c.t(i * 3),
        c.a(i),
        c.p(i),
        [
          '!Forward collision',
          '~Phone use',
          '~Drowsiness',
          '!Harsh braking',
          '~Seat belt',
          '~Smoking',
        ][i % 6]!,
        c.i(20, 96) + ' km/h',
        '▶ 0:20',
        i < 3 ? '~To review' : '+Reviewed',
      ],
    },
    clips: {
      title: 'Video clips',
      hint: 'Clips saved from events or requested from the camera.',
      columns: ['Requested', 'Vehicle', 'Camera', 'Length', 'Reason', 'Status'],
      rows: 8,
      row: (c, i) => [
        c.d(i),
        c.a(i),
        ['Road', 'Driver', 'Both'][i % 3]!,
        c.i(10, 60) + ' s',
        ['Incident report', 'Customer complaint', 'Insurance claim', 'Event'][i % 4]!,
        i === 0 ? '~Uploading' : '+Ready',
      ],
    },
    drivers: {
      title: 'Driver behaviour',
      hint: 'Distraction and fatigue per driver.',
      columns: ['Driver', 'Score', 'Phone use', 'Drowsiness', 'Collision warnings', 'Last event'],
      rows: 8,
      row: (c, i) => {
        const s = c.i(60, 97);
        return [
          c.p(i),
          (s < 70 ? '!' : s < 80 ? '~' : '+') + s,
          c.i(0, 6),
          c.i(0, 3),
          c.i(0, 2),
          c.d(c.i(0, 5)),
        ];
      },
    },
    coaching: {
      title: 'Coaching',
      hint: 'Sessions to go over reviewed clips with drivers.',
      columns: ['Date', 'Driver', 'Topic', 'Clips', 'Coach', 'Status'],
      rows: 6,
      row: (c, i) => [
        c.d(-i),
        c.p(i),
        ['Following distance', 'Phone use', 'Fatigue', 'Speeding'][i % 4]!,
        c.i(1, 4),
        c.p(i + 6),
        i < 2 ? '~Planned' : '+Done',
      ],
    },
  },
  reports: [
    ['Safety summary', 'Events per 100 km by vehicle and driver'],
    ['Distraction', 'Phone use, smoking and seat belt events'],
    ['Fatigue', 'Drowsiness events by hour of day'],
    ['Coaching results', 'Score change after coaching'],
  ],
  rules: [
    ['Forward collision', 'Time to collision under 1.5 s', 'In-cab beep + app'],
    ['Phone use', 'Phone detected for 5 s while moving', 'In-cab voice + app'],
    ['Drowsiness', 'Eyes closed 2 s', 'In-cab alarm + app'],
    ['Camera covered', 'Lens blocked for 30 s', 'App + email'],
  ],
};
