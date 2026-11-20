// ConstructSafe (N051, Package). Composes Indoor People Tracking, GPS Vehicle Tracking and AI
// Video Analytics, and adds the construction-site screens: workers, PPE checks, danger zones,
// gas readings and work permits (port of legacy XS.construct, legacy/src/app.js ~962).
// Demo content only (invented names).
import { defineProduct } from '@iotify/app-kit';
import { manifest as people } from '../../tracking/people-tracking/indoor-people-tracking';
import { manifest as vehicle } from '../../tracking/fleet-transport/gps-vehicle-tracking';
import { manifest as video } from '../../remote-monitoring/video-analytics/ai-video-analytics';

export const manifest = defineProduct({
  id: 'N051',
  scene: 'construct',
  members: [people, vehicle, video],
  add: {
    menu: [
      [
        'Safety',
        [
          ['workers', 'Workers on site'],
          ['ppe', 'PPE checks'],
          ['zones', 'Danger zones'],
          ['gas', 'Gas readings'],
          ['permits', 'Work permits'],
        ],
      ],
    ],
    icons: { gas: 'datapoints' },
    kpis: (c) => [
      { label: 'On site now', value: c.i(18, 30), sub: '2 visitors', tone: 'ok' },
      { label: 'Helmets on', value: `${c.i(19, 23)}/23`, sub: 'AI camera check', tone: 'warn' },
      { label: 'Danger-zone entries', value: c.i(1, 4), sub: 'Crane swing zone', tone: 'warn' },
      { label: 'Days without incident', value: c.i(40, 140), sub: 'Site record 212', tone: 'ok' },
    ],
    chart: ['Workers on site per day', 'workers', 24],
    alerts: [
      '!Worker in crane zone · Block B',
      '~No helmet · Gate 2',
      '!Man-down detected',
      '~Gas CO rising',
      '^Permit expires 17:00',
    ],
    tables: {
      workers: {
        title: 'Workers on site',
        hint: 'Who is on site and where.',
        columns: ['Worker', 'Trade', 'Zone', 'Arrived', 'Helmet tag', 'Status'],
        row: (c, i) => [
          c.p(i),
          ['Steel fixer', 'Electrician', 'Crane operator', 'Labourer', 'Supervisor'][i % 5]!,
          ['Block A', 'Block B', 'Yard', 'Crane zone'][i % 4]!,
          c.t(i * 3 + 90),
          'TAG-' + c.i(100, 999),
          i % 4 === 3 ? '!In danger zone' : '+OK',
        ],
      },
      ppe: {
        title: 'PPE checks',
        hint: 'Helmet and vest checks from AI cameras.',
        columns: ['Time', 'Camera', 'Worker', 'Missing', 'Action'],
        rows: 8,
        row: (c, i) => [
          c.t(i * 4),
          ['Gate 2', 'Block B crane zone', 'Yard'][i % 3]!,
          c.p(i),
          ['~Helmet', '~Vest', '~Helmet'][i % 3]!,
          ['Supervisor told', 'Warned', 'Fixed'][i % 3]!,
        ],
      },
      zones: {
        title: 'Danger zones',
        hint: 'Zones that alert when entered.',
        columns: ['Zone', 'Hazard', 'Entries today', 'Allowed', 'Alert'],
        rows: 4,
        row: (c, i) => [
          ['Crane swing zone', 'Excavation', 'Roof edge', 'Electrical room'][i % 4]!,
          ['Falling load', 'Collapse', 'Fall from height', 'Shock'][i % 4]!,
          c.i(0, 6),
          ['Crane crew', 'Banksman', 'Harnessed only', 'Electricians'][i % 4]!,
          '^Siren + app',
        ],
      },
      gas: {
        title: 'Gas readings',
        hint: 'Portable and fixed gas detectors.',
        columns: ['Detector', 'Location', 'CO', 'H₂S', 'O₂', 'Status'],
        rows: 6,
        row: (c, i) => {
          const co = c.i(2, 40);
          return [
            'GD-' + (i + 1),
            ['Basement', 'Tunnel', 'Block A L-1', 'Tank pit'][i % 4]!,
            co + ' ppm',
            c.i(0, 4) + ' ppm',
            c.f(20.4, 20.9) + '%',
            co > 30 ? '~Rising' : '+Normal',
          ];
        },
      },
      permits: {
        title: 'Work permits',
        hint: 'Permits to work for risky jobs.',
        columns: ['Permit', 'Work', 'Zone', 'Holder', 'Valid until', 'Status'],
        rows: 6,
        row: (c, i) => [
          'PTW-' + c.i(100, 999),
          ['Hot work', 'Work at height', 'Confined space', 'Lifting'][i % 4]!,
          ['Block A', 'Block B', 'Basement', 'Crane zone'][i % 4]!,
          c.p(i),
          ['17:00', '18:00', '15:30', '17:00'][i % 4]!,
          i === 0 ? '~Expiring' : '+Active',
        ],
      },
    },
    reports: [
      ['Safety summary', 'PPE, zone entries and incidents by day'],
      ['Attendance', 'Workers on site by trade and contractor'],
      ['Gas exposure', 'Readings per detector and worker'],
      ['Permits', 'Permits issued, closed and overrun'],
    ],
  },
});
