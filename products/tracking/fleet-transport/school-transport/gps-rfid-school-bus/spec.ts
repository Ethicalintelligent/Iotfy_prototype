// GPS RFID School Bus: menu, dashboard, demo tables and reports. Port of legacy XS.schoolbus
// (legacy/src/app.js ~843). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const schoolBusSpec: ProductSpec = {
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
      'Students',
      [
        ['boarding', 'Boarding log'],
        ['students', 'Students'],
        ['routes', 'Routes & stops'],
        ['parents', 'Parent notices'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    { label: 'Buses on route', value: `${c.n}/${c.n}`, sub: 'Morning run', tone: 'ok' },
    { label: 'Students on board', value: c.i(60, 90), sub: 'of 96 expected' },
    { label: 'Late buses', value: c.i(0, 2), sub: 'Bus 12 · 4 min', tone: 'warn' },
    { label: 'Parent alerts sent', value: c.i(140, 210), sub: 'Today' },
  ],
  chart: ['Students carried per day', 'students', 180],
  alerts: [
    '~Bus running 4 min late',
    '!Student boarded wrong bus',
    '!Student not dropped',
    '~Overspeed near school',
    '^Route changed',
    '~Door opened between stops',
  ],
  tables: {
    boarding: {
      title: 'Boarding log',
      hint: 'Every RFID card tap on and off the bus.',
      columns: ['Time', 'Student', 'Grade', 'Bus', 'Stop', 'Event', 'Parent'],
      row: (c, i) => [
        c.t(i),
        c.p(i + 1).split(' ')[0] + ' ' + ['A.', 'M.', 'K.', 'S.'][i % 4]!,
        'Grade ' + c.i(1, 9),
        c.a(i),
        'Stop ' + c.i(1, 9),
        i % 2 ? '^Got off' : '+Boarded',
        '+Notified',
      ],
    },
    students: {
      title: 'Students',
      hint: 'Students with their card, bus and stop.',
      columns: ['Student', 'Grade', 'RFID card', 'Bus', 'Stop', 'Parent phone'],
      row: (c, i) => [
        c.p(i + 1).split(' ')[0] + ' ' + ['A.', 'M.', 'K.', 'S.'][i % 4]!,
        'Grade ' + c.i(1, 9),
        'CARD-' + c.i(10000, 99999),
        c.a(i),
        'Stop ' + c.i(1, 9),
        '+966 5' + c.i(10000000, 99999999),
      ],
    },
    routes: {
      title: 'Routes & stops',
      hint: 'Morning and afternoon runs.',
      columns: ['Route', 'Bus', 'Stops', 'Students', 'Start', 'School arrival'],
      rows: 5,
      row: (c, i) => [
        ['Al Nakheel AM', 'Al Yasmin AM', 'Hittin AM', 'Al Nakheel PM', 'Al Yasmin PM'][i % 5]!,
        c.a(i),
        c.i(6, 12),
        c.i(20, 34),
        i < 3 ? '06:20' : '13:40',
        i < 3 ? '07:25' : '14:50',
      ],
    },
    parents: {
      title: 'Parent notices',
      hint: 'Messages sent to parents by the app.',
      columns: ['Time', 'Parent of', 'Message', 'Channel', 'Read'],
      rows: 8,
      row: (c, i) => [
        c.t(i),
        c.p(i + 1).split(' ')[0]!,
        [
          'Boarded Bus 12 at Stop 3',
          'Bus arriving in 5 min',
          'Dropped at school 07:24',
          'Bus delayed 4 min',
        ][i % 4]!,
        ['App', 'SMS'][i % 2]!,
        i % 3 ? '+Read' : '~Not yet',
      ],
    },
  },
  reports: [
    ['Attendance on buses', 'Boarding by student, day and route'],
    ['On-time performance', 'Arrival at school vs plan per bus'],
    ['Driver behaviour', 'Speeding and harsh braking near schools'],
    ['Parent notifications', 'Messages sent and read rates'],
  ],
};
