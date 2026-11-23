// Vehicle statuses and alert types of the approved GPS Vehicle Tracking design (Desktop/vs):
// their names, colours (hues from @iotify/ui) and icons. Every screen uses these, so a status
// looks the same everywhere.
import type { Hue, IconName } from '@iotify/ui';

export type VehicleStatus = 'running' | 'stopped' | 'idle' | 'notx' | 'overspeed' | 'towed' | 'ytt';

export interface StatusInfo {
  label: string;
  /** Short label for tight places (chips on the map). */
  short: string;
  hue: Hue;
  icon: IconName;
  /** What it means, for tooltips and help. */
  hint: string;
}

export const STATUS: Record<VehicleStatus, StatusInfo> = {
  running: {
    label: 'Running',
    short: 'Running',
    hue: 'green',
    icon: 'play',
    hint: 'Ignition on and moving.',
  },
  stopped: {
    label: 'Stopped',
    short: 'Stopped',
    hue: 'red',
    icon: 'stop',
    hint: 'Ignition off, not moving.',
  },
  idle: {
    label: 'Idle',
    short: 'Idle',
    hue: 'blue',
    icon: 'clock',
    hint: 'Ignition on, not moving.',
  },
  notx: {
    label: 'No Transmit',
    short: 'No Trans',
    hue: 'black',
    icon: 'wifioff',
    hint: 'Reported before, but nothing in the last hour.',
  },
  overspeed: {
    label: 'Overspeed',
    short: 'Overspeed',
    hue: 'orange',
    icon: 'gauge',
    hint: 'Moving above its speed limit.',
  },
  towed: {
    label: 'Towed',
    short: 'Towed',
    hue: 'teal',
    icon: 'vehicles',
    hint: 'Moving with the ignition off.',
  },
  ytt: {
    label: 'Yet to Transmit',
    short: 'YTT',
    hue: 'grey',
    icon: 'hourglass',
    hint: 'Its tracker has never reported.',
  },
};

/** Display order (as in the design's status summary). */
export const STATUS_ORDER: VehicleStatus[] = [
  'running',
  'stopped',
  'idle',
  'notx',
  'overspeed',
  'towed',
  'ytt',
];

export type AlertKind =
  | 'overspeed'
  | 'harsh_braking'
  | 'harsh_driving'
  | 'harsh_cornering'
  | 'idle'
  | 'geofence_entry'
  | 'geofence_exit'
  | 'power_cut'
  | 'sos'
  | 'towed'
  | 'offline';

export interface AlertInfo {
  label: string;
  hue: Hue;
  icon: IconName;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
}

export const ALERT: Record<AlertKind, AlertInfo> = {
  overspeed: { label: 'Overspeed', hue: 'red', icon: 'gauge', severity: 'High' },
  harsh_braking: { label: 'Harsh Braking', hue: 'red', icon: 'xcircle', severity: 'High' },
  harsh_driving: { label: 'Harsh Driving', hue: 'orange', icon: 'warn', severity: 'Medium' },
  harsh_cornering: { label: 'Harsh Cornering', hue: 'amber', icon: 'warn', severity: 'Medium' },
  idle: { label: 'Idle', hue: 'blue', icon: 'clock', severity: 'Low' },
  geofence_entry: { label: 'Geofence Entry', hue: 'blue', icon: 'user', severity: 'Medium' },
  geofence_exit: { label: 'Geofence Exit', hue: 'orange', icon: 'user', severity: 'Medium' },
  power_cut: { label: 'Power Cut', hue: 'amber', icon: 'zap', severity: 'High' },
  sos: { label: 'SOS', hue: 'red', icon: 'siren', severity: 'Critical' },
  towed: { label: 'Towed', hue: 'teal', icon: 'vehicles', severity: 'High' },
  offline: { label: 'Device Offline', hue: 'black', icon: 'wifioff', severity: 'Medium' },
};

/** The categories in the dashboard's Alert Summary. */
export const SUMMARY_ALERTS: AlertKind[] = [
  'overspeed',
  'harsh_braking',
  'harsh_driving',
  'harsh_cornering',
  'idle',
  'geofence_entry',
  'geofence_exit',
  'power_cut',
];

/** The categories in the dashboard's "Today Alerts" strip. */
export const TICKER_ALERTS: AlertKind[] = [
  'harsh_driving',
  'harsh_braking',
  'power_cut',
  'overspeed',
  'towed',
  'sos',
  'idle',
];

export type ZoneType = 'General' | 'Preferred' | 'Restricted';
export const ZONE_HUE: Record<ZoneType, Hue> = {
  General: 'purple',
  Preferred: 'green',
  Restricted: 'red',
};
