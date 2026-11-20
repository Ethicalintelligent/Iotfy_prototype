// GPS RFID Waste Monitoring: menu, dashboard, demo tables and reports. Port of legacy XS.waste
// (legacy/src/app.js ~836). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const wasteSpec: ProductSpec = {
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
      'Collections',
      [
        ['collections', 'Bin collections'],
        ['bins', 'Bins'],
        ['routes', 'Routes'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    {
      label: 'Bins collected',
      value: `${c.i(130, 150)}/160`,
      sub: '89% of today’s plan',
      tone: 'ok',
    },
    { label: 'Missed bins', value: c.i(2, 6), sub: 'Rescheduled', tone: 'warn' },
    { label: 'Trucks on route', value: `${c.n}/${c.n}`, sub: 'All on time', tone: 'ok' },
    { label: 'Distance today', value: c.i(140, 260) + ' km', sub: 'Avg 4.1 km/L' },
  ],
  chart: ['Bins collected per day', 'bins', 150],
  alerts: [
    '!Missed bin · Al Olaya St 14',
    '~Truck off route',
    '~Long stop 18 min',
    '^RFID read failed',
    '!Bin not emptied (weight)',
    '~Overloaded truck',
  ],
  tables: {
    collections: {
      title: 'Bin collections',
      hint: 'Every bin lift with the RFID read.',
      columns: ['Time', 'Truck', 'Bin', 'Street', 'RFID', 'Weight', 'Status'],
      row: (c, i) => [
        c.t(i),
        c.a(i),
        'BIN-' + c.i(1000, 9999),
        c.pl(i) + ' St ' + c.i(1, 40),
        'TAG ' + c.i(4000, 4999),
        c.i(40, 260) + ' kg',
        i === 4 ? '!Missed' : '+Collected',
      ],
    },
    bins: {
      title: 'Bins',
      hint: 'All tagged bins and their last collection.',
      columns: ['Bin', 'Size', 'District', 'Last collected', 'Fill (est.)', 'Status'],
      row: (c, i) => {
        const f = c.i(10, 100);
        return [
          'BIN-' + c.i(1000, 9999),
          ['240 L', '1,100 L', '660 L'][i % 3]!,
          c.pl(i),
          c.d(c.i(0, 2)) + ' ' + c.t(i),
          (f > 85 ? '!' : f > 60 ? '~' : '+') + f + '%',
          i % 7 === 6 ? '~Damaged' : '+OK',
        ];
      },
    },
    routes: {
      title: 'Routes',
      hint: 'Planned collection routes per truck.',
      columns: ['Route', 'Truck', 'Bins', 'Done', 'Start', 'ETA finish'],
      rows: 5,
      row: (c, i) => [
        ['North A', 'North B', 'Olaya loop', 'Malaz loop', 'Industrial'][i % 5]!,
        c.a(i),
        c.i(30, 60),
        c.i(20, 55),
        '05:30',
        ['11:40', '12:10', '11:55', '12:30', '13:00'][i % 5]!,
      ],
    },
  },
  reports: [
    ['Collection performance', 'Planned vs collected bins per route'],
    ['Missed bins', 'Missed bins with photos and reasons'],
    ['Truck utilisation', 'Hours, distance and stops per truck'],
    ['Complaints', 'Resident complaints matched to collections'],
  ],
};
