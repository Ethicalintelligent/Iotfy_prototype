// The 38 alert types of the approved design's "Add Alert" list (Desktop/vs/Manage-Alert-
// Configuration.html), in its categories and order; 37 can be chosen (Unauthorized Operator is
// "Not available yet"). The name is what proto_vehicle.alert_configs.alert_type stores.
// Hues and icons: the ones in shared/vehicle-status.ts where the type is there (Overspeed, Stop,
// Idle, Towed and No Transmission as statuses; SOS, Harsh Braking and Powercut as alerts);
// otherwise the nearest hue name to the design's colour.
import type { Hue, IconName } from '@iotify/ui';
import { ALERT, STATUS } from '../../../shared/vehicle-status';

export type AlertCategory =
  | 'Vehicle Movement'
  | 'Driver Behaviour & Safety'
  | 'Device & Security'
  | 'Door Monitoring'
  | 'Fuel Monitoring'
  | 'Maintenance'
  | 'Other Alerts';

export const CATEGORIES: AlertCategory[] = [
  'Vehicle Movement',
  'Driver Behaviour & Safety',
  'Device & Security',
  'Door Monitoring',
  'Fuel Monitoring',
  'Maintenance',
  'Other Alerts',
];

/** How the alert fires (the grey pill beside its name). */
export type AlertKind =
  | 'Measured threshold'
  | 'Persisting state'
  | 'Instant event'
  | 'Communication loss'
  | 'Rate / change'
  | 'Maintenance (manual completion)';

export interface AlertType {
  /** Stored in alert_configs.alert_type. */
  name: string;
  category: AlertCategory;
  hue: Hue;
  icon: IconName;
  kind?: AlertKind;
  description: string;
  /** The number it compares against: alert_configs.threshold and threshold_unit. */
  threshold?: { label: string; unit: string; default?: number; hint?: string; required: boolean };
  /** What it watches, when it has no number (e.g. "SOS / Emergency Button Activation"). */
  condition?: string;
  /** Has the "check every X minutes" setting (alert_configs.interval_value / interval_unit). */
  interval: boolean;
  /** Default "Seconds to Ignore". */
  ignore: number;
  /** false: shown but can't be chosen yet. */
  available?: boolean;
}

const t = (
  label: string,
  unit: string,
  value?: number,
  hint?: string,
  required = true,
): AlertType['threshold'] => ({ label, unit, default: value, hint, required });

export const ALERT_TYPES: AlertType[] = [
  // ---------------------------------------------------------------- Vehicle Movement
  {
    name: 'Overspeed',
    category: 'Vehicle Movement',
    hue: STATUS.overspeed.hue,
    icon: STATUS.overspeed.icon,
    kind: 'Measured threshold',
    description: 'Triggered when the vehicle exceeds the configured speed limit.',
    threshold: t('Speed Limit', 'km/h', 120),
    interval: true,
    ignore: 20,
  },
  {
    name: 'Stop',
    category: 'Vehicle Movement',
    hue: STATUS.stopped.hue,
    icon: STATUS.stopped.icon,
    kind: 'Persisting state',
    description:
      'Triggered when the vehicle remains stopped for longer than the configured duration.',
    threshold: t('Stop Limit', 'minutes', 10),
    interval: true,
    ignore: 30,
  },
  {
    name: 'Wokeup',
    category: 'Vehicle Movement',
    hue: 'teal',
    icon: 'refresh',
    kind: 'Persisting state',
    description:
      'Triggered when the vehicle or tracking device wakes up from a sleep or inactive state.',
    condition: 'Vehicle Wake-up / Start Event',
    interval: false,
    ignore: 30,
  },
  {
    name: 'Optime',
    category: 'Vehicle Movement',
    hue: 'teal',
    icon: 'hourglass',
    kind: 'Persisting state',
    description: 'Triggered when the vehicle operates during the configured operating time period.',
    condition: 'Operating during the notification period',
    interval: true,
    ignore: 30,
  },
  {
    name: 'Idle',
    category: 'Vehicle Movement',
    hue: STATUS.idle.hue,
    icon: STATUS.idle.icon,
    kind: 'Persisting state',
    description:
      'Triggered when the vehicle remains stationary with its engine running beyond the configured idle duration.',
    threshold: t('Idle Limit', 'minutes', 10),
    interval: true,
    ignore: 30,
  },
  {
    name: 'Towed',
    category: 'Vehicle Movement',
    hue: STATUS.towed.hue,
    icon: STATUS.towed.icon,
    kind: 'Persisting state',
    description:
      'Triggered when the vehicle moves while its engine is switched off, indicating possible towing.',
    threshold: t('Towed Limit', 'km/h'),
    interval: true,
    ignore: 30,
  },
  {
    name: 'Drift',
    category: 'Vehicle Movement',
    hue: 'amber',
    icon: 'crosshair',
    kind: 'Persisting state',
    description:
      'Triggered when the vehicle moves away from its recorded anchor position, indicating possible unauthorized movement or dragging.',
    condition: 'Vehicle Position / Anchor Displacement',
    interval: true,
    ignore: 30,
  },
  // ---------------------------------------------------------------- Driver Behaviour & Safety
  {
    name: 'Fatigue',
    category: 'Driver Behaviour & Safety',
    hue: 'teal',
    icon: 'eye',
    kind: 'Persisting state',
    description:
      'Reminds the driver to take regular breaks while driving based on the configured frequency.',
    threshold: t('Alert Frequency', 'hours', 3),
    interval: true,
    ignore: 30,
  },
  {
    name: 'SOS',
    category: 'Driver Behaviour & Safety',
    hue: ALERT.sos.hue,
    icon: ALERT.sos.icon,
    kind: 'Instant event',
    description:
      'Triggered when the driver activates the SOS button to request emergency assistance.',
    condition: 'SOS / Emergency Button Activation',
    interval: true,
    ignore: 30,
  },
  {
    name: 'Seatbelt',
    category: 'Driver Behaviour & Safety',
    hue: 'slate',
    icon: 'seat',
    kind: 'Persisting state',
    description:
      'Triggered when a person occupies the seat and the seatbelt sensor detects that the seatbelt is not fastened.',
    condition: 'Seatbelt Sensor Status',
    interval: true,
    ignore: 30,
  },
  {
    name: 'Panic',
    category: 'Driver Behaviour & Safety',
    hue: 'amber',
    icon: 'warn',
    kind: 'Instant event',
    description:
      'Triggered when an emergency panic button is activated to request immediate assistance.',
    condition: 'Panic / Emergency Activation',
    interval: true,
    ignore: 30,
  },
  {
    name: 'Harsh Braking',
    category: 'Driver Behaviour & Safety',
    hue: ALERT.harsh_braking.hue,
    icon: ALERT.harsh_braking.icon,
    kind: 'Instant event',
    description:
      'Triggered when the driver applies excessive braking force beyond the configured braking threshold.',
    condition: 'Excessive Braking Force',
    interval: true,
    ignore: 30,
  },
  {
    name: 'Harsh Acceleration',
    category: 'Driver Behaviour & Safety',
    hue: 'amber',
    icon: 'up',
    kind: 'Instant event',
    description:
      'Triggered when the vehicle accelerates beyond the configured acceleration threshold.',
    condition: 'Excessive Acceleration',
    interval: true,
    ignore: 30,
  },
  // ---------------------------------------------------------------- Device & Security
  {
    name: 'Powercut',
    category: 'Device & Security',
    hue: ALERT.power_cut.hue,
    icon: ALERT.power_cut.icon,
    kind: 'Persisting state',
    description:
      'Triggered when the tracking device gets disconnected from its external power source.',
    condition: 'External Power Disconnection',
    interval: true,
    ignore: 30,
  },
  {
    name: 'Anti Theft',
    category: 'Device & Security',
    hue: 'amber',
    icon: 'lock',
    kind: 'Persisting state',
    description:
      'Triggered when suspicious activity indicates a possible attempt to steal the vehicle.',
    condition: 'Unauthorized Movement / Theft Detection',
    interval: true,
    ignore: 30,
  },
  {
    name: 'Low Battery',
    category: 'Device & Security',
    hue: 'orange',
    icon: 'power',
    kind: 'Measured threshold',
    description:
      'Triggered when the device battery level drops to or below the configured threshold.',
    threshold: t('Battery Threshold', '%', 20),
    interval: true,
    ignore: 30,
  },
  {
    name: 'Panel Alarms',
    category: 'Device & Security',
    hue: 'red',
    icon: 'bell',
    kind: 'Persisting state',
    description:
      'Triggered when a specific configured alarm condition occurs in the vehicle or connected device panel.',
    condition: 'Configured Panel Alarm Event',
    interval: true,
    ignore: 30,
  },
  {
    name: 'No Transmission',
    category: 'Device & Security',
    hue: STATUS.notx.hue,
    icon: STATUS.notx.icon,
    kind: 'Communication loss',
    description: 'Triggers when no data is received from the device for the set period.',
    threshold: t('No-Data Timeout', 'minutes', 30),
    interval: false,
    ignore: 0,
  },
  {
    name: 'Unauthorized Operator',
    category: 'Device & Security',
    hue: 'red',
    icon: 'user',
    description: 'Triggered when a driver who is not assigned to the vehicle starts it.',
    interval: true,
    ignore: 30,
    available: false,
  },
  // ---------------------------------------------------------------- Door Monitoring
  {
    name: 'Door Open',
    category: 'Door Monitoring',
    hue: 'red',
    icon: 'door',
    kind: 'Persisting state',
    description:
      "Triggered when the vehicle's front door is not properly closed after the engine is started.",
    threshold: t(
      'Speed Limit',
      'km/h',
      undefined,
      'Only above this speed (leave empty for any).',
      false,
    ),
    interval: true,
    ignore: 0,
  },
  {
    name: 'Door Back',
    category: 'Door Monitoring',
    hue: 'red',
    icon: 'door',
    kind: 'Persisting state',
    description:
      "Triggered when the vehicle's rear door is not properly closed after the engine is started.",
    threshold: t(
      'Speed Limit',
      'km/h',
      undefined,
      'Only above this speed (leave empty for any).',
      false,
    ),
    interval: true,
    ignore: 0,
  },
  // ---------------------------------------------------------------- Fuel Monitoring
  {
    name: 'Fuel Filling',
    category: 'Fuel Monitoring',
    hue: 'purple',
    icon: 'fuel',
    kind: 'Instant event',
    description:
      "Triggered when fuel is added to the vehicle's fuel tank and the increase satisfies the configured refueling detection condition.",
    threshold: t('Fuel Filling Threshold', 'L', 10),
    interval: true,
    ignore: 0,
  },
  {
    name: 'Fuel Theft',
    category: 'Fuel Monitoring',
    hue: 'purple',
    icon: 'fuel',
    kind: 'Rate / change',
    description:
      'Triggered when the fuel level decreases unexpectedly beyond the configured fuel drop threshold, indicating possible fuel theft.',
    threshold: t('Fuel Drop Threshold', 'L', 10),
    interval: true,
    ignore: 0,
  },
  {
    name: 'Fuel Max Threshold',
    category: 'Fuel Monitoring',
    hue: 'black',
    icon: 'arrowup',
    kind: 'Measured threshold',
    description: 'Triggers when the fuel level rises above the maximum threshold.',
    threshold: t('Fuel Level Maximum Threshold', '%', 95),
    interval: true,
    ignore: 30,
  },
  {
    name: 'Fuel Min Threshold',
    category: 'Fuel Monitoring',
    hue: 'black',
    icon: 'arrowdown',
    kind: 'Measured threshold',
    description: 'Triggers when the fuel level falls below the minimum threshold.',
    threshold: t('Fuel Level Minimum Threshold', '%', 15),
    interval: true,
    ignore: 30,
  },
  // ---------------------------------------------------------------- Maintenance
  {
    name: 'Preventive maintenance',
    category: 'Maintenance',
    hue: 'slate',
    icon: 'sliders',
    kind: 'Maintenance (manual completion)',
    description: 'Triggers when the vehicle approaches its service odometer reading.',
    threshold: t('Maintenance Interval', 'km', 10000),
    interval: false,
    ignore: 30,
  },
  {
    name: 'Scheduled maintenance',
    category: 'Maintenance',
    hue: 'slate',
    icon: 'calendar',
    kind: 'Maintenance (manual completion)',
    description: 'Triggers ahead of a booked service date.',
    threshold: t('Remind Before', 'days', 7),
    interval: false,
    ignore: 30,
  },
  // ---------------------------------------------------------------- Other Alerts
  {
    name: 'Movement',
    category: 'Other Alerts',
    hue: 'green',
    icon: 'route',
    description: 'Triggers when the vehicle starts moving after being stationary.',
    threshold: t(
      'Movement Threshold',
      'metres',
      50,
      'Distance the vehicle must move before the alert fires.',
    ),
    interval: true,
    ignore: 30,
  },
  {
    name: 'Engine Status',
    category: 'Other Alerts',
    hue: 'orange',
    icon: 'key',
    description: 'Triggers when the engine turns on, turns off, or reports a fault condition.',
    condition: 'Engine On / Off / Fault',
    interval: true,
    ignore: 0,
  },
  {
    name: 'Battery Drain',
    category: 'Other Alerts',
    hue: 'red',
    icon: 'pulse',
    description: 'Triggers when battery voltage drops faster than the set rate.',
    threshold: t('Drain Rate', 'V/hr', 0.5, 'Voltage drop per hour considered abnormal.'),
    interval: true,
    ignore: 30,
  },
  ...[1, 2, 3, 4].map((n): AlertType => ({
    name: `Temperature ${n}`,
    category: 'Other Alerts',
    hue: 'purple',
    icon: 'thermo',
    description: `Triggers when sensor ${n} reads above the permitted temperature.`,
    threshold: t('Maximum Temperature', '°C', 8, 'Alert when the reading rises above this value.'),
    interval: true,
    ignore: 30,
  })),
  ...[1, 2, 3, 4].map((n): AlertType => ({
    name: `BT Temperature ${n}`,
    category: 'Other Alerts',
    hue: 'blue',
    icon: 'signal',
    description: `Triggers when Bluetooth sensor ${n} reads above the permitted temperature.`,
    threshold: t('Maximum Temperature', '°C', 8, 'Alert when the reading rises above this value.'),
    interval: true,
    ignore: 30,
  })),
];

const BY_NAME = new Map(ALERT_TYPES.map((a) => [a.name.toLowerCase(), a]));

/** The type of a stored alert_type (any case); an unknown name gets a grey bell. */
export function alertType(name: string): AlertType {
  return (
    BY_NAME.get(name.toLowerCase()) ?? {
      name,
      category: 'Other Alerts',
      hue: 'grey',
      icon: 'bell',
      description: 'An alert type this screen does not know yet.',
      interval: true,
      ignore: 30,
    }
  );
}

/** The types that can be chosen (37). */
export const CHOOSABLE = ALERT_TYPES.filter((a) => a.available !== false);
