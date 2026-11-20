// HealthSafe: the hospital screens it adds to its members. Port of legacy XS.health
// (legacy/src/app.js ~971). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const healthSpec: ProductSpec = {
  menu: [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['floor', 'Ward view'],
        ['alerts', 'Alerts'],
      ],
    ],
    [
      'Care',
      [
        ['calls', 'Nurse calls'],
        ['staff', 'Staff location'],
        ['equipment', 'Equipment'],
        ['hygiene', 'Hand hygiene'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    { label: 'Nurse calls today', value: c.i(30, 60), sub: 'Avg answer 52 s', tone: 'ok' },
    { label: 'Open calls', value: c.i(0, 2), sub: 'Room 204', tone: 'warn' },
    { label: 'Hand hygiene', value: c.i(86, 95) + '%', sub: 'This shift', tone: 'ok' },
    { label: 'Equipment in use', value: c.i(60, 80) + '%', sub: 'Infusion pumps' },
  ],
  chart: ['Nurse calls per day', 'calls', 50],
  alerts: [
    '!Panic button · Room 208',
    '~Call not answered 2 min',
    '~Pump left ward',
    '^Tag battery low',
    '!Patient left ward',
    '~Hand hygiene missed',
  ],
  tables: {
    calls: {
      title: 'Nurse calls',
      hint: 'Calls from patient buttons and how fast they were answered.',
      columns: ['Time', 'Room', 'Type', 'Answered by', 'Response'],
      row: (c, i) => {
        const s = c.i(20, 180);
        return [
          c.t(i * 2),
          'Room ' + c.i(201, 212),
          ['Call', 'Bathroom', 'Panic', 'Call'][i % 4]!,
          c.p(i),
          (s > 120 ? '~' : '+') + s + ' s',
        ];
      },
    },
    staff: {
      title: 'Staff location',
      hint: 'Where each nurse badge is.',
      columns: ['Staff', 'Role', 'Location', 'Seen'],
      rows: 8,
      row: (c, i) => [
        c.p(i),
        ['Nurse', 'Charge nurse', 'Doctor', 'Porter'][i % 4]!,
        ['Room 204', 'Nurse station', 'Ward 3', 'Pharmacy'][i % 4]!,
        c.i(5, 120) + ' s ago',
      ],
    },
    equipment: {
      title: 'Equipment',
      hint: 'Tagged equipment on the ward.',
      columns: ['Item', 'Type', 'Location', 'Status'],
      rows: 5,
      row: (c, i) => [
        ['Infusion pump 12', 'Infusion pump 14', 'Wheelchair 5', 'ECG monitor 2', 'Ventilator 1'][
          i % 5
        ]!,
        ['Pump', 'Pump', 'Wheelchair', 'Monitor', 'Ventilator'][i % 5]!,
        ['Room 304', 'Store', 'Corridor B', 'ICU', 'ICU'][i % 5]!,
        i === 2 ? '~Left area' : '+OK',
      ],
    },
    hygiene: {
      title: 'Hand hygiene',
      hint: 'Dispenser use at room entry per staff.',
      columns: ['Staff', 'Room entries', 'Hand rubs', 'Compliance'],
      rows: 8,
      row: (c, i) => {
        const e = c.i(20, 60);
        const h = e - c.i(0, 8);
        const p = Math.round((h / e) * 100);
        return [c.p(i), e, h, (p < 85 ? '~' : '+') + p + '%'];
      },
    },
  },
  reports: [
    ['Response times', 'Nurse call answer times by ward and shift'],
    ['Hand hygiene', 'Compliance per staff member'],
    ['Equipment use', 'Utilisation and search time'],
    ['Incidents', 'Panic calls and patient wandering'],
  ],
};
