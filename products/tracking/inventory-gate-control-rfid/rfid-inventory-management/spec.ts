// RFID Inventory Management: menu, dashboard, demo tables and reports. Port of legacy XS.rfid
// (legacy/src/app.js ~954). Demo content only (invented names and places).
import type { ProductSpec } from '@iotify/app-kit';

export const rfidSpec: ProductSpec = {
  menu: [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['alerts', 'Alerts'],
      ],
    ],
    [
      'Inventory',
      [
        ['movements', 'Gate movements'],
        ['inventory', 'Inventory'],
        ['counts', 'Stock counts'],
        ['readers', 'Readers'],
      ],
    ],
    ['Reports', [['reports', 'Reports']]],
  ],
  kpis: (c) => [
    { label: 'Items tracked', value: c.k(c.i(2000, 4000)), sub: 'Tagged' },
    { label: 'Out today', value: c.i(120, 180), sub: 'Gate 2: 148', tone: 'ok' },
    { label: 'Unknown tags', value: 0, sub: 'All matched', tone: 'ok' },
    { label: 'Unauthorised exits', value: c.i(0, 1), sub: 'Item 4471', tone: 'warn' },
  ],
  chart: ['Items through gates per day', 'items', 300],
  alerts: [
    '!Unauthorised exit · Item 4471',
    '~Reader offline · Gate 3',
    '^Stock count started',
    '~Item in wrong aisle',
    '^Unknown tag read',
  ],
  tables: {
    movements: {
      title: 'Gate movements',
      hint: 'Every tag read at a gate.',
      columns: ['Time', 'Item', 'Gate', 'Direction', 'Order', 'Status'],
      row: (c, i) => [
        c.t(i),
        c.a(i),
        'Gate ' + c.i(1, 3),
        i % 2 ? 'In' : 'Out',
        i === 3 ? '—' : 'SO-' + c.i(10000, 99999),
        i === 3 ? '!No order' : '+OK',
      ],
    },
    inventory: {
      title: 'Inventory',
      hint: 'Where each tagged item is.',
      columns: ['Item', 'SKU', 'Location', 'Last read', 'Status'],
      row: (c, i) => [
        c.a(i),
        'SKU-' + c.i(1000, 9999),
        'Aisle ' + c.i(1, 12) + ' · Bay ' + c.i(1, 20),
        c.i(1, 59) + ' min ago',
        i % 5 === 4 ? '~Wrong aisle' : '+In place',
      ],
    },
    counts: {
      title: 'Stock counts',
      hint: 'Handheld and portal counts vs system.',
      columns: ['Date', 'Area', 'Expected', 'Counted', 'Accuracy'],
      rows: 6,
      row: (c, i) => {
        const e = c.i(300, 900);
        const n = e - c.i(0, 6);
        return [c.d(i * 7), 'Aisle ' + (i + 1), e, n, ((n / e) * 100).toFixed(1) + '%'];
      },
    },
    readers: {
      title: 'Readers',
      hint: 'RFID readers and antennas.',
      columns: ['Reader', 'Location', 'Antennas', 'Reads today', 'Status'],
      rows: 4,
      row: (c, i) => [
        'RDR-' + (i + 1),
        ['Gate 1', 'Gate 2', 'Gate 3', 'Handheld 1'][i % 4]!,
        [4, 4, 4, 1][i % 4]!,
        c.k(c.i(200, 3000)),
        i === 2 ? '~Offline' : '+Online',
      ],
    },
  },
  reports: [
    ['Stock accuracy', 'Count results per aisle'],
    ['Gate traffic', 'Items in and out per gate'],
    ['Shrinkage', 'Items that left without an order'],
  ],
};
