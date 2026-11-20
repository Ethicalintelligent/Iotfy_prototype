// Fleet Management: menu, dashboard, demo tables and reports. Port of legacy XS.fleet
// (legacy/src/app.js ~817). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const fleetSpec: ProductSpec = {
  menu: [
    [
      'Overview',
      [
        ['dash', 'Dashboard'],
        ['alerts', 'Reminders & alerts'],
      ],
    ],
    [
      'Fleet',
      [
        ['vehicles', 'Vehicles'],
        ['maintenance', 'Maintenance'],
        ['fuel', 'Fuel log'],
        ['drivers', 'Drivers'],
        ['documents', 'Documents & renewals'],
        ['expenses', 'Expenses'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    { label: 'Vehicles', value: c.n, sub: 'All active', tone: 'ok' },
    { label: 'Service due', value: c.i(1, 3), sub: 'Next in 1,200 km', tone: 'warn' },
    { label: 'Fuel this month', value: 'SAR ' + c.k(c.i(9, 19) * 1000), sub: '6.1 km/L average' },
    { label: 'Renewals in 30 days', value: c.i(1, 4), sub: 'Licence, insurance', tone: 'warn' },
  ],
  chart: ['Fuel cost per day', 'SAR', 620],
  alerts: [
    '~Service due in 1,200 km',
    '!Insurance expires in 9 days',
    '~Tyre rotation overdue',
    '^Fuel card top-up',
    '!Driver licence expires in 7 days',
    '~Registration renewal due',
  ],
  tables: {
    vehicles: {
      title: 'Vehicles',
      hint: 'Every vehicle with its odometer and next service.',
      columns: ['Vehicle', 'Plate', 'Odometer', 'Next service', 'Assigned driver', 'Status'],
      rows: 0,
      row: (c, i) => [
        c.a(i),
        `${['RUH', 'JED', 'DMM'][i % 3]!} ${c.i(1000, 9999)}`,
        c.k(c.i(42, 260) * 1000) + ' km',
        c.k(c.i(1, 9) * 1000) + ' km',
        c.p(i),
        i % 5 === 4 ? '~In workshop' : '+Available',
      ],
    },
    maintenance: {
      title: 'Maintenance',
      hint: 'Scheduled and completed service jobs.',
      columns: ['Date', 'Vehicle', 'Job', 'Workshop', 'Cost', 'Status'],
      row: (c, i) => [
        c.d(i * 3),
        c.a(i),
        [
          'Oil & filter',
          'Brake pads',
          'Tyre rotation',
          'AC service',
          'Battery replacement',
          'Annual inspection',
        ][i % 6]!,
        ['Main depot service bay', 'Exit 9 workshop', 'Quick lube centre'][i % 3]!,
        'SAR ' + c.k(c.i(180, 2400)),
        i < 2 ? '~Scheduled' : '+Done',
      ],
    },
    fuel: {
      title: 'Fuel log',
      hint: 'Fill-ups from fuel cards and drivers.',
      columns: ['Date', 'Vehicle', 'Litres', 'Cost', 'Odometer', 'km/L'],
      row: (c, i) => {
        const l = c.i(40, 180);
        return [
          c.d(i),
          c.a(i),
          l + ' L',
          'SAR ' + c.k(Math.round(l * 2.33)),
          c.k(c.i(42, 260) * 1000),
          c.f(4.8, 7.2),
        ];
      },
    },
    drivers: {
      title: 'Drivers',
      hint: 'Licences and assignments.',
      columns: ['Driver', 'Licence no.', 'Expires', 'Vehicle', 'Phone'],
      rows: 6,
      row: (c, i) => [
        c.p(i),
        'LIC-' + c.i(100000, 999999),
        (i === 1 ? '!' : '') + c.d(-c.i(7, 400)),
        c.a(i),
        '+966 5' + c.i(10000000, 99999999),
      ],
    },
    documents: {
      title: 'Documents & renewals',
      hint: 'Registration, insurance and permits with expiry dates.',
      columns: ['Vehicle', 'Document', 'Expires', 'Days left', 'File'],
      row: (c, i) => {
        const d = c.i(5, 300);
        return [
          c.a(i),
          ['Istimara', 'Insurance', 'Fahas inspection', 'Operating card'][i % 4]!,
          c.d(-d),
          (d < 15 ? '!' : d < 45 ? '~' : '+') + d + ' days',
          'PDF',
        ];
      },
    },
    expenses: {
      title: 'Expenses',
      hint: 'Tolls, fines, parts and other costs.',
      columns: ['Date', 'Vehicle', 'Type', 'Amount', 'Approved by'],
      row: (c, i) => [
        c.d(i * 2),
        c.a(i),
        ['Parking', 'Traffic fine', 'Parts', 'Car wash', 'Toll'][i % 5]!,
        'SAR ' + c.k(c.i(15, 900)),
        c.p(i + 4),
      ],
    },
  },
  reports: [
    ['Cost per km', 'Fuel, service and expenses per vehicle'],
    ['Fuel efficiency', 'km/L trend per vehicle and driver'],
    ['Maintenance history', 'All jobs and costs by vehicle'],
    ['Renewals calendar', 'Everything expiring in the next 90 days'],
  ],
};
