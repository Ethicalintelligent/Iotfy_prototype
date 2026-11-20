// Data Centre Environment Monitoring: menu, dashboard, demo tables and reports. Port of legacy XS.datacenter
// (legacy/src/app.js ~912). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const dataCentreSpec: ProductSpec = {
  menu: [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['alerts', 'Alerts'],
      ],
    ],
    [
      'Environment',
      [
        ['sensors', 'Sensor readings'],
        ['racks', 'Rack temperatures'],
        ['leaks', 'Leak, smoke & doors'],
        ['power', 'Power & PDUs'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    { label: 'Cold aisle', value: c.f(21.5, 23.5) + '°C', sub: '45% RH · normal', tone: 'ok' },
    { label: 'Hot spots', value: c.i(0, 2), sub: 'Rack B3', tone: 'warn' },
    { label: 'Leak sensors', value: 'Dry', sub: 'All 6 OK', tone: 'ok' },
    { label: 'PUE (est.)', value: c.f(1.4, 1.7, 2), sub: 'This week' },
  ],
  chart: ['Average rack inlet temperature', '°C', 24],
  alerts: [
    '~Hot spot · Rack B3',
    '!Water leak · CRAC 2',
    '~Humidity above 60%',
    '^Door open 5 min',
    '!Smoke detected',
    '~PDU load above 80%',
  ],
  tables: {
    sensors: {
      title: 'Sensor readings',
      hint: 'Latest reading from every sensor.',
      columns: ['Sensor', 'Hall', 'Type', 'Reading', 'Status'],
      row: (c, i) => [
        ['T-0', 'H-0', 'L-0', 'D-0', 'S-0'][i % 5]! + (i + 1),
        c.a(i),
        ['Temperature', 'Humidity', 'Water leak', 'Door', 'Smoke'][i % 5]!,
        [c.f(21, 30) + '°C', c.i(38, 62) + '% RH', 'Dry', 'Closed', 'Clear'][i % 5]!,
        i === 0 ? '~High' : '+OK',
      ],
    },
    racks: {
      title: 'Rack temperatures',
      hint: 'Inlet and outlet per rack.',
      columns: ['Rack', 'Hall', 'Inlet', 'Outlet', 'ΔT', 'Status'],
      row: (c, i) => {
        const t = c.f(20, 31);
        return [
          'ABCD'[i % 4]! + (1 + (i % 6)),
          c.a(i),
          t + '°C',
          (Number(t) + 10).toFixed(1) + '°C',
          '10.0',
          Number(t) > 28 ? '~Hot' : '+OK',
        ];
      },
    },
    leaks: {
      title: 'Leak, smoke & doors',
      hint: 'Safety sensors and their last events.',
      columns: ['Time', 'Hall', 'Sensor', 'Event'],
      rows: 8,
      row: (c, i) => [
        c.d(i * 3) + ' ' + c.t(i * 7),
        c.a(i),
        ['Leak rope CRAC 2', 'Door A', 'Smoke zone 1', 'Door B'][i % 4]!,
        ['~Wet 2 min', '^Opened', '+Test OK', '^Opened'][i % 4]!,
      ],
    },
    power: {
      title: 'Power & PDUs',
      hint: 'Load per PDU.',
      columns: ['PDU', 'Hall', 'Load', 'Phase balance', 'Status'],
      rows: 8,
      row: (c, i) => {
        const l = c.i(30, 88);
        return [
          'PDU-' + (i + 1),
          c.a(i),
          (l > 80 ? '~' : '+') + l + '%',
          ['Good', 'Good', 'Fair'][i % 3]!,
          '+Online',
        ];
      },
    },
  },
  reports: [
    ['Environment', 'Temperature and humidity per hall'],
    ['Incidents', 'Leaks, smoke and door events'],
    ['Capacity', 'Power and cooling headroom per hall'],
  ],
};
