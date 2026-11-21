// A neutral spec for product apps that don't have their own yet (each product folder brings
// its own spec in Steps 10–11). Invented demo content only.
import type { ProductSpec } from './spec';

export const GENERIC_SPEC: ProductSpec = {
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
      'Reports',
      [
        ['reports', 'Reports'],
        ['rules', 'Alert rules'],
      ],
    ],
  ],
  kpis: (c) => [
    { label: 'Assets online', value: `${c.n}/${c.n}`, sub: 'All reporting', tone: 'ok' },
    { label: 'Active now', value: c.i(1, c.n), sub: 'In the last 10 min' },
    {
      label: 'Readings today',
      value: c.k(c.i(800, 1600) * c.n),
      sub: '+4% vs yesterday',
      tone: 'ok',
    },
    { label: 'Open alerts', value: c.i(1, 5), sub: 'Needs attention', tone: 'warn' },
  ],
  chart: ['Readings per day', 'readings', 1200],
  alerts: [
    '!Device offline 30 min',
    '~Battery low',
    '^Configuration updated',
    '~Value above threshold',
    '!Tamper detected',
    '^Back online',
  ],
  reports: [
    ['Activity summary', 'Readings and events per asset'],
    ['Alerts', 'Every alert with time to acknowledge'],
    ['Device health', 'Battery, signal and last report per device'],
  ],
  rules: [
    ['Device offline', 'No report for 30 min', 'App + email'],
    ['Battery low', 'Battery under 20%', 'App'],
    ['Threshold', 'Value above the limit for 5 min', 'App + SMS'],
    ['Tamper', 'Case opened or device moved', 'App + SMS'],
  ],
};
