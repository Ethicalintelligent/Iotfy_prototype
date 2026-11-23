// GPS Vehicle Tracking: menu, screens, demo tables, reports and alert rules.
// The menu and screens follow the approved GPS Vehicle Tracking design (Desktop/vs, Nov 2026,
// IT-0012): exactly its nine items. The older screens (Trips, Geofences, Drivers, Maintenance,
// Commands, Alert rules) stay in the code, reachable by URL, but are no longer in the menu.
// kpis, chart, alerts, tables, reports and rules are the legacy port (XS.vehicle, legacy
// ~808): packages that include this product (ConstructSafe) still use them.
// Demo content only (invented places and names).
import { lazy } from 'react';
import type { CustomScreen, ProductSpec } from '@iotify/app-kit';

const nextStep = (title: string, description: string): CustomScreen => ({
  title,
  description,
  component: lazy(() => import('./screens/NextStep')),
});

export const vehicleSpec: ProductSpec = {
  menu: [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['grid', 'Grid View'],
        ['map', 'Map View'],
        ['tracking', 'Tracking'],
        ['central', 'Centralized Tracking'],
        ['alerts', 'Alerts'],
      ],
    ],
    ['Manage', [['manage', 'Manage']]],
    ['Reports', [['reports', 'Reports']]],
    ['Administration', [['groups', 'Groups']]],
  ],
  // The design's own Dashboard (and, as they are built, Map View, Alerts and Reports) replace
  // the built-in screens; the rail shows only the menu above.
  ownScreensFirst: true,
  plainMenu: true,
  kpis: (c) => [
    { label: 'Vehicles online', value: `${c.n}/${c.n}`, sub: 'All reporting', tone: 'ok' },
    { label: 'Moving now', value: c.i(1, c.n), sub: 'Avg 54 km/h' },
    {
      label: 'Distance today',
      value: c.k(c.i(180, 320) * c.n) + ' km',
      sub: '+8% vs yesterday',
      tone: 'ok',
    },
    { label: 'Open alerts', value: c.i(2, 6), sub: '1 overspeed', tone: 'warn' },
  ],
  chart: ['Distance per day', 'km', 260],
  alerts: [
    '!Overspeed 94 km/h',
    '~Harsh braking',
    '!Geofence exit · Riyadh depot',
    '~Idling 25 min',
    '^Ignition on after hours',
    '~Low backup battery',
    '~Service due in 650 km',
  ],
  tables: {
    trips: {
      title: 'Trips',
      hint: 'Every journey from ignition on to off.',
      columns: ['Vehicle', 'Driver', 'Start', 'From → To', 'Distance', 'Duration', 'Max speed'],
      row: (c, i) => {
        const max = c.i(60, 104);
        return [
          c.a(i),
          c.p(i),
          c.t(i * 2 + 1),
          `${c.pl(i)} → ${c.pl(i + 3)}`,
          c.f(4, 68) + ' km',
          c.i(12, 95) + ' min',
          // Speed limit is 80 km/h (see the Overspeed alert rule): amber above it, red above 90.
          (max > 90 ? '!' : max > 80 ? '~' : '') + max + ' km/h',
        ];
      },
    },
    geofences: {
      title: 'Geofences',
      hint: 'Areas that raise an alert on entry or exit.',
      columns: ['Geofence', 'Type', 'Vehicles inside', 'Entries today', 'Alert on'],
      rows: 6,
      row: (c, i) => [
        [
          'Riyadh depot',
          'Customer DC · Olaya',
          'Exit 9 workshop',
          'Industrial City 2 yard',
          'No-go · school zone',
          'Jeddah hub',
        ][i % 6]!,
        ['Circle 300 m', 'Polygon', 'Circle 150 m', 'Polygon', 'Polygon', 'Circle 500 m'][i % 6]!,
        c.i(0, c.n),
        c.i(0, 14),
        ['^Entry & exit', '^Exit', '^Entry', '^Entry & exit', '!Entry', '^Exit'][i % 6]!,
      ],
    },
    drivers: {
      title: 'Drivers',
      hint: 'Behaviour scores from braking, speeding and idling.',
      columns: ['Driver', 'Vehicle', 'Score', 'Harsh events', 'Overspeed', 'Hours today'],
      rows: 8,
      row: (c, i) => {
        const s = c.i(62, 98);
        return [
          c.p(i),
          c.a(i),
          (s < 70 ? '!' : s < 80 ? '~' : '+') + s,
          c.i(0, 7),
          c.i(0, 4),
          c.f(2, 9) + ' h',
        ];
      },
    },
    commands: {
      title: 'Commands',
      hint: 'Remote commands sent to the trackers.',
      columns: ['Time', 'Vehicle', 'Command', 'Sent by', 'Result'],
      rows: 6,
      row: (c, i) => [
        c.t(i * 5),
        c.a(i),
        [
          'Engine cut',
          'Engine restore',
          'Request location',
          'Reboot tracker',
          'Set speed limit 80',
        ][i % 5]!,
        c.p(i + 2),
        i % 4 === 3 ? '~Waiting for vehicle' : '+Done',
      ],
    },
  },
  screens: {
    dash: {
      title: 'Dashboard',
      description:
        'Your fleet today: statuses, live map, geofences, alerts, activity and rankings. Positions, trips and alerts are demo activity until devices report.',
      component: lazy(() => import('./screens/dashboard/DashboardScreen')),
    },
    grid: nextStep('Vehicle Grid View', 'Live status, location and sensors of every vehicle.'),
    tracking: nextStep('Tracking', 'Follow one vehicle live, or play back its history.'),
    central: nextStep('Centralized Tracking', 'Monitor and track many vehicles on one map.'),
    manage: nextStep(
      'Manage',
      'Manage vehicles, devices, operators, SIM cards, users, alerts and geofences.',
    ),
    groups: nextStep(
      'Groups',
      'Branches or teams. A user limited to a group sees its vehicles and those of its sub-groups.',
    ),
    // Same demo rows as tables.drivers, plus search, a "Needs coaching" filter and lowest first.
    drivers: {
      title: 'Drivers',
      description:
        'Behaviour scores from braking, speeding and idling. Lowest scores first; drivers below 80 need coaching.',
      component: lazy(() => import('./screens/DriversScreen')),
    },
    maint: {
      title: 'Maintenance',
      description:
        'When each vehicle is due for service (every 10,000 km), most urgent first. Log a service to restart its count.',
      component: lazy(() => import('./screens/MaintenanceScreen')),
    },
  },
  icons: {
    dash: 'features',
    grid: 'grid',
    map: 'map',
    tracking: 'navigate',
    central: 'hub',
    alerts: 'bell',
    manage: 'users',
    reports: 'chart',
    groups: 'list',
    maint: 'calendar',
  },
  reports: [
    ['Trip summary', 'Trips, distance and drive time per vehicle'],
    ['Fuel & idling', 'Idle time and estimated fuel wasted'],
    ['Overspeed', 'Every overspeed event with location'],
    ['Geofence visits', 'Arrivals, departures and dwell time'],
    ['Driver behaviour', 'Scores and harsh events per driver'],
    ['Utilisation', 'Hours used vs available per vehicle'],
    ['Maintenance', 'Services done and what is due next, per vehicle'],
  ],
  rules: [
    ['Overspeed', 'Speed above 80 km/h for 30 s', 'App + SMS'],
    ['Harsh braking', 'Deceleration above 0.4 g', 'App'],
    ['After-hours use', 'Ignition on between 22:00 and 05:00', 'App + email'],
    ['Long idling', 'Engine on, not moving for 15 min', 'App'],
    ['Geofence exit', 'Any vehicle leaves Riyadh depot', 'App + SMS'],
    ['Service due', 'Within 1,000 km of the next service (every 10,000 km)', 'App + email'],
  ],
};
