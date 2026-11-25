// The 24 reports of the original page (2 common, 20 vehicle, fuel, temperature): labels, icons,
// sub-titles, conditions (params) and columns, copied from the original.
import type { ReactNode } from 'react';
import { duration, type Formats } from './dates';
import type { Column, Row } from './grid/model';
import { Pill } from './ui';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Get<T> = (r: any) => T;

export interface Param {
  key: string;
  label: string;
  type: 'number' | 'time' | 'select';
  unit?: string;
  placeholder?: string;
  initial?: string;
  required?: boolean;
  pairedWith?: string;
  options?: { id: string; label: string }[];
}

export interface Report {
  id: string;
  code: string;
  label: string;
  icon: string;
  group: string;
  subtitle: string;
  /** Company-wide report (users), not per vehicle. */
  scope?: 'company';
  singleDay?: boolean;
  noDates?: boolean;
  params?: Param[];
  columns: (f: Formats) => Column[];
}

/** "LOGGED_OUT" → "Logged out". */
export const humanize = (s?: string | null) =>
  s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : '';

const SEVERITY_TONES = { CRITICAL: 'red', HIGH: 'orange', MEDIUM: 'amber', LOW: 'blue' };
const TONES: Record<string, string> = {
  NORMAL: 'green',
  AUTHORIZED: 'green',
  OVERSPEED: 'red',
  EXCESSIVE: 'red',
  UNAUTHORIZED: 'red',
  EXTENDED: 'amber',
  RUNNING: 'green',
  IDLE: 'amber',
  STOP: 'red',
  TOWED: 'blue',
  OFFLINE: 'gray',
  NO_DATA: 'gray',
  ACTIVE: 'green',
  LOGGED_OUT: 'gray',
  EXPIRED: 'amber',
  REVOKED: 'red',
  SENT: 'blue',
  DELIVERED: 'green',
  QUEUED: 'amber',
  FAILED: 'red',
  ...SEVERITY_TONES,
};

/** Column builders (the original's own set). */
const col = {
  text: (
    key: string,
    label: string,
    width: number,
    get: Get<string | null | undefined>,
    extra: Partial<Column> = {},
  ): Column => ({
    key,
    label,
    width,
    value: (r: Row) => get(r) ?? '',
    ...extra,
  }),
  num: (
    key: string,
    label: string,
    width: number,
    get: Get<number | null | undefined>,
    unit = '',
  ): Column => ({
    key,
    label,
    width,
    value: (r: Row) => {
      const v = get(r);
      return v == null ? '' : `${v.toLocaleString('en-IN')}${unit}`;
    },
    sortValue: (r: Row) => get(r) ?? -Infinity,
  }),
  dur: (
    key: string,
    label: string,
    width: number,
    get: Get<number | null | undefined>,
  ): Column => ({
    key,
    label,
    width,
    value: (r: Row) => duration(get(r)),
    sortValue: (r: Row) => get(r) ?? -1,
  }),
  at: (
    key: string,
    label: string,
    width: number,
    get: Get<string | null | undefined>,
    fmt: (s: string) => string,
    none = '',
  ): Column => ({
    key,
    label,
    width,
    value: (r: Row) => {
      const v = get(r);
      return v ? fmt(v) : none;
    },
    sortValue: (r: Row) => get(r) ?? '',
  }),
  day: (
    key: string,
    label: string,
    width: number,
    get: Get<string | null | undefined>,
    f: Formats,
  ): Column => ({
    key,
    label,
    width,
    value: (r: Row) => f.day(get(r)),
    sortValue: (r: Row) => get(r) ?? '',
  }),
  pill: (
    key: string,
    label: string,
    width: number,
    get: Get<string | null | undefined>,
  ): Column => ({
    key,
    label,
    width,
    value: (r: Row) => humanize(get(r)),
    render: (r: Row): ReactNode => {
      const v = get(r);
      return v ? <Pill tone={TONES[v] ?? 'gray'}>{humanize(v)}</Pill> : '—';
    },
  }),
};

const asset = (f: Formats): Column => ({
  key: 'asset',
  label: f.assetLabel,
  width: 150,
  strong: true,
  value: (r: Row) => String(r.asset ?? ''),
});
const group = () => col.text('group', 'Group', 150, (r) => r.group);
const vehicleType = () => col.text('vehicleType', 'Vehicle Type', 130, (r) => r.vehicleType);
const operator = (label = 'Operator') => col.text('operator', label, 150, (r) => r.operator);
const coords = (key: string, label: string, get: Get<string | null | undefined>) =>
  col.text(key, label, 200, get);
const place = (key: string, label: string, get: Get<string | null | undefined>) =>
  col.text(key, label, 220, get);
const km = (key: string, label: string, get: Get<number | null | undefined>) =>
  col.num(key, label, 120, get, ' km');

const param = {
  minMinutes: (label = 'Time exceeds', initial?: string): Param => ({
    key: 'minMinutes',
    label,
    type: 'number',
    unit: 'min',
    initial,
    placeholder: 'Minutes',
  }),
  fromTime: (label = 'From time'): Param => ({ key: 'fromTime', label, type: 'time' }),
  toTime: (label = 'To time'): Param => ({ key: 'toTime', label, type: 'time' }),
  comparison: (key = 'op', label = 'Condition'): Param => ({
    key,
    label,
    type: 'select',
    options: [
      { id: 'GT', label: 'Higher than (>)' },
      { id: 'LT', label: 'Lesser than (<)' },
      { id: 'GE', label: 'Higher than or equal to (>=)' },
      { id: 'LE', label: 'Lesser than or equal to (<=)' },
    ],
  }),
};

/** "Limit Exceeds" column of the Speed Report: a coloured number. */
const exceeds = (): Column => {
  const tone = (n: number) => (n <= 0 ? 'tone-green' : n <= 10 ? 'tone-orange' : 'tone-red');
  return {
    key: 'exceeds',
    label: 'Limit Exceeds (km/hr)',
    width: 160,
    value: (r: Row) => String(r.exceeds),
    sortValue: (r: Row) => r.exceeds as number,
    render: (r: Row) => (
      <b className={`vr-exceeds ${tone(r.exceeds as number)}`}>{r.exceeds as number}</b>
    ),
  };
};

/* ------------------------------------------------------------------ common reports */

const COMMON = 'Common reports';
const MODULES = [
  'Auth',
  'Users',
  'Roles',
  'Company',
  'Profile',
  'Devices',
  'Reports',
  'Tracking',
  'Import',
  'Other',
];
const ACTIONS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'LOGOUT',
  'PASSWORD_CHANGED',
  'USER_CHANGED',
  'USER_ROLES_CHANGED',
  'USER_SCOPE_CHANGED',
  'ROLE_CHANGED',
  'COMPANY_CHANGED',
  'SOLUTIONS_CHANGED',
  'PROFILE_CHANGED',
  'DEVICE_COMMAND',
  'DEVICE_MODEL_CHANGED',
  'SENSOR_TYPE_CHANGED',
  'REPORT_RUN',
  'EXPORT',
  'LOCATION_HISTORY_VIEWED',
];

const COMMON_REPORTS: Report[] = [
  {
    id: 'user_activity_report',
    code: 'USER_ACTIVITY',
    label: 'User Activity Report',
    icon: 'Activity',
    group: COMMON,
    scope: 'company',
    subtitle: 'Who changed what in the company, and when',
    params: [
      {
        key: 'module',
        label: 'Module',
        type: 'select',
        options: MODULES.map((m) => ({ id: m, label: m })),
      },
      {
        key: 'action',
        label: 'Action',
        type: 'select',
        options: ACTIONS.map((a) => ({ id: a, label: humanize(a) })),
      },
    ],
    columns: (f) => [
      col.text('companyCode', 'Company ID', 120, (r) => r.companyCode),
      col.text('module', 'Module Name', 130, (r) => r.module, { strong: true }),
      col.text('action', 'Action', 180, (r) => humanize(r.action)),
      col.text('oldValue', 'Old Value', 180, (r) => r.oldValue),
      col.text('newValue', 'New Value', 180, (r) => r.newValue),
      col.at('at', 'Activity Date & Time', 190, (r) => r.at, f.stamp),
      col.text('performedBy', 'Performed By', 170, (r) => r.performedBy),
      col.text('ipDevice', 'Device & IP Address', 260, (r) =>
        [r.ip, r.device].filter(Boolean).join(' · '),
      ),
    ],
  },
  {
    id: 'user_logs_report',
    code: 'USER_LOGS',
    label: 'User Logs Report',
    icon: 'LogIn',
    group: COMMON,
    scope: 'company',
    subtitle: "Sign-ins and sign-outs of the company's users",
    params: [param.fromTime('Login from'), param.toTime('Login to')],
    columns: (f) => [
      col.text('userId', 'User ID', 150, (r) => r.userId),
      col.text('userName', 'User Name', 170, (r) => r.userName, { strong: true }),
      col.text('role', 'Role', 150, (r) => r.role),
      col.at('loginAt', 'Login Date & Time', 190, (r) => r.loginAt, f.stamp),
      col.at('logoutAt', 'Logout Date & Time', 190, (r) => r.logoutAt, f.stamp, '—'),
      col.dur('seconds', 'Session Duration', 140, (r) => r.seconds),
      col.pill('status', 'Session Status', 140, (r) => r.status),
      col.text('ipDevice', 'Device & IP Address', 260, (r) =>
        [r.client, r.ip, r.device].filter(Boolean).join(' · '),
      ),
    ],
  },
];

/* ------------------------------------------------------------------ vehicle reports */

const VEHICLE = 'Vehicle reports';
const FENCE_ALERTS = ['GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'RESTRICTED_ENTER', 'RESTRICTED_EXIT'];

const VEHICLE_REPORTS: Omit<Report, 'group'>[] = [
  {
    id: 'executive_summary_report',
    code: 'VEHICLE_EXECUTIVE_SUMMARY',
    label: 'Executive Summary Report',
    icon: 'ClipboardList',
    subtitle: 'Day summary of every vehicle: begin and end, running, idle, stop and distance',
    columns: (f) => [
      asset(f),
      vehicleType(),
      col.day('day', 'Date', 120, (r) => r.day, f),
      col.at('begin', 'Begin Time', 110, (r) => r.begin, f.time),
      place('beginLocation', 'Begin Location', (r) => r.beginLocation),
      col.at('end', 'End Time', 110, (r) => r.end, f.time),
      place('endLocation', 'End Location', (r) => r.endLocation),
      col.dur('totalSeconds', 'Total Duration', 120, (r) => r.totalSeconds),
      col.dur('runningSeconds', 'Running', 100, (r) => r.runningSeconds),
      col.dur('idleSeconds', 'Idle', 100, (r) => r.idleSeconds),
      col.dur('stopSeconds', 'Stop', 100, (r) => r.stopSeconds),
      col.dur('towedSeconds', 'Towed', 100, (r) => r.towedSeconds ?? 0),
      km('distanceKm', 'Distance (km)', (r) => r.distanceKm),
      col.num('maxSpeed', 'Max Speed (km/h)', 130, (r) => r.maxSpeed),
      col.num('alerts', 'Alerts Count', 110, (r) => r.alerts),
      group(),
    ],
  },
  {
    id: 'status_summary_report',
    code: 'VEHICLE_STATUS_SUMMARY',
    label: 'Status Summary Report',
    icon: 'ClipboardList',
    subtitle: 'Running, idle, stop and towed time of each vehicle per day',
    columns: (f) => [
      group(),
      asset(f),
      vehicleType(),
      col.at('start', 'Start Date & Time', 190, (r) => r.start, f.stamp),
      place('startAddress', 'Start Location', (r) => r.startAddress),
      col.at('end', 'End Date & Time', 190, (r) => r.end, f.stamp),
      place('endAddress', 'End Location', (r) => r.endAddress),
      col.dur('totalSeconds', 'Total Duration', 120, (r) => r.totalSeconds),
      col.dur('runningSeconds', 'Running', 100, (r) => r.runningSeconds),
      col.dur('idleSeconds', 'Idle', 100, (r) => r.idleSeconds),
      col.dur('stopSeconds', 'Stop', 100, (r) => r.stopSeconds),
      col.dur('towedSeconds', 'Towed', 100, (r) => r.towedSeconds ?? 0),
      km('distanceKm', 'Distance (km)', (r) => r.distanceKm),
    ],
  },
  {
    id: 'overspeed_duration_report',
    code: 'VEHICLE_OVERSPEED',
    label: 'Overspeed Duration Report',
    icon: 'TriangleAlert',
    subtitle: "Each stretch above the vehicle's speed limit and how long it lasted",
    columns: (f) => [
      asset(f),
      vehicleType(),
      col.num('limit', 'Speed Limit (km/hr)', 140, (r) => r.limit),
      col.dur('seconds', 'Overspeed Duration', 140, (r) => r.seconds),
      col.at('start', 'Start Date & Time', 190, (r) => r.start, f.stamp),
      place('startLocation', 'Start Location', (r) => r.startLocation ?? r.startCoords),
      col.at('end', 'End Date & Time', 190, (r) => r.end, f.stamp),
      place('endLocation', 'End Location', (r) => r.endLocation ?? r.endCoords),
      col.num('minSpeed', 'Min OverSpeed (km/hr)', 160, (r) => r.minSpeed),
      col.num('avgSpeed', 'Avg OverSpeed (km/hr)', 160, (r) => r.avgSpeed),
      col.num('maxSpeed', 'Max OverSpeed (km/hr)', 160, (r) => r.maxSpeed),
      group(),
    ],
  },
  {
    id: 'speed_report',
    code: 'VEHICLE_SPEED',
    label: 'Speed Report',
    icon: 'Gauge',
    singleDay: true,
    subtitle: 'Speed readings of the day that match the speed condition',
    params: [
      { ...param.comparison('op', 'Speed condition'), pairedWith: 'speed' },
      {
        key: 'speed',
        label: 'Speed',
        type: 'number',
        unit: 'km/h',
        placeholder: 'e.g. 60',
        pairedWith: 'op',
      },
    ],
    columns: (f) => [
      asset(f),
      vehicleType(),
      operator(),
      col.at('at', 'Date & Time', 190, (r) => r.at, f.stamp),
      coords('coords', 'Location (lat, long)', (r) => r.coords),
      col.num('speed', 'Speed (km/hr)', 120, (r) => r.speed),
      col.num('limit', 'Speed Limit (km/hr)', 140, (r) => r.limit),
      exceeds(),
      group(),
    ],
  },
  {
    id: 'stop_report',
    code: 'VEHICLE_STOP',
    label: 'Stop Report',
    icon: 'OctagonX',
    subtitle: 'Where and how long each vehicle stopped',
    params: [param.minMinutes()],
    columns: (f) => [
      asset(f),
      vehicleType(),
      col.at('stoppedAt', 'Stopped Date & Time', 190, (r) => r.stoppedAt, f.stamp),
      place('stoppedLocation', 'Stopped At Location', (r) => r.stoppedLocation ?? r.stoppedCoords),
      col.at('resumedAt', 'Resumed Date & Time', 190, (r) => r.resumedAt, f.stamp, 'Still stopped'),
      place('resumedLocation', 'Resumed At Location', (r) => r.resumedLocation ?? r.resumedCoords),
      col.dur('seconds', 'Stop Duration', 120, (r) => r.seconds),
      col.text('stoppedBy', 'Stopped By', 150, (r) => r.stoppedBy),
      col.text('resumedBy', 'Resumed By', 150, (r) => r.resumedBy),
      group(),
    ],
  },
  {
    id: 'alert_report',
    code: 'VEHICLE_ALERT',
    label: 'Alert Report',
    icon: 'Siren',
    subtitle: 'Every alert raised for the vehicles',
    params: [{ key: 'alertType', label: 'Alert type', type: 'select', options: [] }],
    columns: (f) => [
      asset(f),
      vehicleType(),
      operator(),
      col.text('alertName', 'Alert Type', 170, (r) => r.alertName),
      col.at('at', 'Date & Time', 190, (r) => r.at, f.stamp),
      coords('coords', 'Location (lat, long)', (r) => r.coords ?? r.location),
      col.text('details', 'Alert Details', 260, (r) => r.details),
      col.pill('severity', 'Severity', 110, (r) => r.severity),
      group(),
    ],
  },
  {
    id: 'vehicle_movement_report',
    code: 'VEHICLE_MOVEMENT',
    label: 'Vehicle Movement Report',
    icon: 'Route',
    subtitle: 'Each running, idle, stop and towed stretch, one after another',
    columns: (f) => [
      asset(f),
      vehicleType(),
      operator(),
      col.pill('status', 'Status', 110, (r) => r.status),
      col.at('start', 'Event Start Date & Time', 190, (r) => r.start, f.stamp),
      col.at('end', 'Event End Date & Time', 190, (r) => r.end, f.stamp),
      col.dur('seconds', 'Duration', 110, (r) => r.seconds),
      km('distanceKm', 'Distance (km)', (r) => r.distanceKm),
      coords('beginCoords', 'Begin Location (lat, long)', (r) => r.beginCoords),
      coords('endCoords', 'End Location (lat, long)', (r) => r.endCoords),
      group(),
    ],
  },
  {
    id: 'vehicle_activity_consolidate_report',
    code: 'VEHICLE_ACTIVITY_CONSOLIDATE',
    label: 'Vehicle Activity Consolidate Report',
    icon: 'ChartColumn',
    subtitle: 'Running, idle, stop and towed time per day inside a time window',
    params: [param.fromTime(), param.toTime()],
    columns: (f) => [
      asset(f),
      vehicleType(),
      col.day('day', 'Date', 120, (r) => r.day, f),
      col.dur('runningSeconds', 'Running Duration', 130, (r) => r.runningSeconds),
      col.dur('idleSeconds', 'Idle Duration', 120, (r) => r.idleSeconds),
      col.dur('stopSeconds', 'Stop Duration', 120, (r) => r.stopSeconds),
      col.dur('towedSeconds', 'Towed Duration', 120, (r) => r.towedSeconds),
      km('distanceKm', 'Distance (km)', (r) => r.distanceKm),
      col.num('alerts', 'Alert Count', 110, (r) => r.alerts),
      coords('beginCoords', 'Begin Location (lat, long)', (r) => r.beginCoords),
      coords('endCoords', 'End Location (lat, long)', (r) => r.endCoords),
      group(),
    ],
  },
  {
    id: 'no_transmission_report',
    code: 'VEHICLE_NO_TRANSMISSION',
    label: 'No Transmission Report',
    icon: 'WifiOff',
    subtitle: 'Gaps when a vehicle sent no data, with its device details',
    params: [param.minMinutes('No data for at least', '60'), param.fromTime(), param.toTime()],
    columns: (f) => [
      asset(f),
      vehicleType(),
      operator(),
      col.at('lastAt', 'Last Transmission Date & Time', 210, (r) => r.lastAt, f.stamp),
      col.dur('seconds', 'No Transmission Duration', 180, (r) => r.seconds),
      col.pill('lastStatus', 'Last Known Status', 140, (r) => r.lastStatus),
      coords(
        'lastCoords',
        'Last Known Location (lat, long)',
        (r) => r.lastCoords ?? r.lastLocation,
      ),
      col.text('deviceMake', 'Device Make', 130, (r) => r.deviceMake),
      col.text('deviceModel', 'Device Model', 130, (r) => r.deviceModel),
      col.text('imei', 'IMEI No', 160, (r) => r.imei),
      col.text('simNo', 'SIM No', 150, (r) => r.simNo),
      col.day('purchaseDate', 'Date of Purchase', 140, (r) => r.purchaseDate, f),
      group(),
    ],
  },
  {
    id: 'idle_violation_report',
    code: 'VEHICLE_IDLE_VIOLATION',
    label: 'Idle Violation Report',
    icon: 'Pause',
    subtitle: 'Engine-on idle sessions longer than the limit',
    params: [param.minMinutes()],
    columns: (f) => [
      asset(f),
      vehicleType(),
      col.dur('seconds', 'Idle Duration', 120, (r) => r.seconds),
      col.at('start', 'Begin Date & Time', 190, (r) => r.start, f.stamp),
      coords('startCoords', 'Begin Location (lat, long)', (r) => r.startCoords ?? r.location),
      col.at('end', 'End Date & Time', 190, (r) => r.end, f.stamp, 'Still idling'),
      coords('endCoords', 'End Location (lat, long)', (r) => r.endCoords),
      col.pill('status', 'Status', 120, (r) => r.status),
      group(),
    ],
  },
  {
    id: 'fleet_summary_report',
    code: 'VEHICLE_FLEET_SUMMARY',
    label: 'Fleet Summary Report',
    icon: 'LayoutGrid',
    noDates: true,
    subtitle: 'Where each vehicle is now, its status and who drives it',
    columns: (f) => [
      asset(f),
      vehicleType(),
      col.pill('status', 'Current Status', 130, (r) => r.status),
      place('location', 'Current / Last Known Location', (r) => r.location ?? r.coords),
      col.at('lastAt', 'Last Transmission Date & Time', 210, (r) => r.lastAt, f.stamp, 'Never'),
      operator('Current Operator'),
      col.at('associatedAt', 'Vehicle Association Date', 180, (r) => r.associatedAt, f.stamp),
      col.day('purchaseDate', 'Date of Purchase', 140, (r) => r.purchaseDate, f),
      group(),
    ],
  },
  {
    id: 'consolidate_summary_report',
    code: 'VEHICLE_CONSOLIDATE_SUMMARY',
    label: 'Consolidate Summary Report',
    icon: 'ClipboardCheck',
    subtitle: 'First on to last off of each vehicle per day, with time in each state',
    columns: (f) => [
      asset(f),
      group(),
      vehicleType(),
      col.day('day', 'Date', 120, (r) => r.day, f),
      col.at('firstOn', 'First ON Time', 120, (r) => r.firstOn, f.time, '—'),
      coords('beginCoords', 'Begin Location (lat, long)', (r) => r.beginCoords),
      col.at('lastOff', 'Last OFF Time', 120, (r) => r.lastOff, f.time, '—'),
      coords('endCoords', 'End Location (lat, long)', (r) => r.endCoords),
      col.dur('runningSeconds', 'Running Duration', 130, (r) => r.runningSeconds),
      col.dur('idleSeconds', 'Idle Duration', 120, (r) => r.idleSeconds),
      col.dur('stopSeconds', 'Stop Duration', 120, (r) => r.stopSeconds),
      col.dur('towedSeconds', 'Towed Duration', 120, (r) => r.towedSeconds),
      km('towedKm', 'Towed Distance (km)', (r) => r.towedKm),
      km('distanceKm', 'Distance (km)', (r) => r.distanceKm),
      col.num('maxSpeed', 'Max Speed (km/h)', 130, (r) => r.maxSpeed),
      col.num('alerts', 'Alert Count', 110, (r) => r.alerts),
    ],
  },
  {
    id: 'engine_hours_summary_report',
    code: 'VEHICLE_ENGINE_HOURS',
    label: 'Engine Hours Summary Report',
    icon: 'Timer',
    subtitle: 'Each ignition-on session: how long the engine ran, moving and idle',
    params: [param.fromTime(), param.toTime()],
    columns: (f) => [
      asset(f),
      vehicleType(),
      col.at('start', 'Start Date & Time', 190, (r) => r.start, f.stamp),
      coords('startCoords', 'Start Location (lat, long)', (r) => r.startCoords),
      col.at('end', 'End Date & Time', 190, (r) => r.end, f.stamp),
      coords('endCoords', 'End Location (lat, long)', (r) => r.endCoords),
      col.dur('engineSeconds', 'Engine Hours', 120, (r) => r.engineSeconds),
      col.dur('runningSeconds', 'Vehicle Running Duration', 170, (r) => r.runningSeconds),
      col.dur('idleSeconds', 'Vehicle Idle Duration', 160, (r) => r.idleSeconds),
      km('distanceKm', 'Distance (km)', (r) => r.distanceKm),
      group(),
    ],
  },
  {
    id: 'driver_behaviour_report',
    code: 'VEHICLE_DRIVER_BEHAVIOUR',
    label: 'Driver Behaviour Report',
    icon: 'ShieldCheck',
    singleDay: true,
    subtitle: 'Driving score of the day with harsh driving, overspeed and seat belt events',
    columns: (f) => [
      group(),
      asset(f),
      operator(),
      col.num('score', 'Overall Score', 120, (r) => r.score),
      col.num('harshBraking', 'Harsh Braking Events', 150, (r) => r.harshBraking),
      col.num('harshAcceleration', 'Harsh Acceleration Events', 180, (r) => r.harshAcceleration),
      col.num('overspeed', 'Overspeed Events', 140, (r) => r.overspeed),
      col.num('seatBelt', 'Seat Belt Violations', 150, (r) => r.seatBelt),
      col.num('drift', 'Drift Events', 110, (r) => r.drift),
      col.dur(
        'excessiveIdleSeconds',
        'Excessive Idle Duration',
        170,
        (r) => r.excessiveIdleSeconds,
      ),
      km('distanceKm', 'Distance (km)', (r) => r.distanceKm),
      col.dur('engineSeconds', 'Engine On Duration', 150, (r) => r.engineSeconds),
      col.dur('runningSeconds', 'Vehicle Running Duration', 170, (r) => r.runningSeconds),
      col.num('avgSpeed', 'Average Speed (km/h)', 150, (r) => r.avgSpeed),
      col.num('maxSpeed', 'Max Speed (km/h)', 130, (r) => r.maxSpeed),
    ],
  },
  {
    id: 'fence_report',
    code: 'VEHICLE_FENCE',
    label: 'Fence Report',
    icon: 'Hexagon',
    subtitle: 'Zone entries and exits with the time spent inside',
    params: [
      {
        key: 'alertType',
        label: 'Alert type',
        type: 'select',
        options: FENCE_ALERTS.map((a) => ({
          id: a,
          label: a.charAt(0) + a.slice(1).toLowerCase().replace('_', ' '),
        })),
      },
    ],
    columns: (f) => [
      asset(f),
      vehicleType(),
      operator(),
      col.text('geofence', 'Zone / Fence Name', 180, (r) => r.geofence),
      col.dur('insideSeconds', 'Time Inside Zone', 130, (r) => r.insideSeconds),
      col.text('alertName', 'Alert Type', 150, (r) => r.alertName),
      col.text('details', 'Alert Details', 240, (r) => r.details),
      col.at('at', 'Alert Date & Time', 190, (r) => r.at, f.stamp),
      coords('coords', 'Entry / Exit Location', (r) => r.location ?? r.coords),
      group(),
    ],
  },
  {
    id: 'daily_movement_report',
    code: 'VEHICLE_DAILY_MOVEMENT',
    label: 'Daily Movement Report',
    icon: 'CalendarDays',
    subtitle: 'Where each vehicle started and ended the day, and how far it went',
    columns: (f) => [
      asset(f),
      col.text('vehicleModel', 'Vehicle Model', 150, (r) => r.vehicleModel),
      operator('Operator Name'),
      col.text('operatorContact', 'Operator Contact No', 150, (r) => r.operatorContact),
      col.day('day', 'Date', 120, (r) => r.day, f),
      col.at('begin', 'Begin Time', 110, (r) => r.begin, f.time),
      place('beginLocation', 'Begin Location', (r) => r.beginLocation),
      col.at('end', 'End Time', 110, (r) => r.end, f.time),
      place('endLocation', 'End Location', (r) => r.endLocation),
      col.dur('runningSeconds', 'Running Duration', 130, (r) => r.runningSeconds),
      km('distanceKm', 'Daily Distance (km)', (r) => r.distanceKm),
      km('odometerKm', 'Total Odometer (km)', (r) => r.odometerKm),
      group(),
    ],
  },
  {
    id: 'trip_report',
    code: 'VEHICLE_TRIP',
    label: 'Trip Report',
    icon: 'Waypoints',
    subtitle: 'Each trip with where it started and ended',
    params: [
      {
        key: 'minKm',
        label: 'Distance at least',
        type: 'number',
        unit: 'km',
        placeholder: 'e.g. 5',
      },
    ],
    columns: (f) => [
      asset(f),
      vehicleType(),
      operator(),
      col.text('trip', 'Trip ID / Trip Name', 190, (r) =>
        r.tripName ? `${r.tripId} · ${r.tripName}` : r.tripId,
      ),
      col.at('start', 'Trip Start Date & Time', 190, (r) => r.start, f.stamp),
      coords('startCoords', 'Start Location (lat, long)', (r) => r.startCoords),
      col.at('end', 'Trip End Date & Time', 190, (r) => r.end, f.stamp, 'In progress'),
      coords('endCoords', 'End Location (lat, long)', (r) => r.endCoords),
      col.dur('runningSeconds', 'Running Duration', 130, (r) => r.runningSeconds),
      km('distanceKm', 'Distance (km)', (r) => r.distanceKm),
      group(),
    ],
  },
  {
    id: 'operator_report',
    code: 'VEHICLE_OPERATOR',
    label: 'Operator Report',
    icon: 'IdCard',
    subtitle: 'Operator sign-in and sign-out on each vehicle',
    columns: (f) => [
      col.text('tagId', 'Tag ID', 120, (r) => r.tagId),
      operator('Operator Name'),
      col.text('contact', 'Contact No', 140, (r) => r.contact),
      col.text('branch', 'Branch Location', 150, (r) => r.branch),
      asset(f),
      vehicleType(),
      col.at('signIn', 'Sign In Date & Time', 190, (r) => r.signIn, f.stamp),
      coords('signInCoords', 'Sign In Location (lat, long)', (r) => r.signInCoords),
      col.at('signOut', 'Sign Out Date & Time', 190, (r) => r.signOut, f.stamp, 'Signed in'),
      coords('signOutCoords', 'Sign Out Location (lat, long)', (r) => r.signOutCoords),
      col.dur('seconds', 'Sign In Duration', 130, (r) => r.seconds),
    ],
  },
  {
    id: 'alert_mail_report',
    code: 'VEHICLE_ALERT_MAIL',
    label: 'Alert Mail Report',
    icon: 'Mail',
    subtitle: 'Alert emails sent for the vehicles and whether they arrived',
    columns: (f) => [
      asset(f),
      col.text('alertName', 'Alert Type', 170, (r) => r.alertName),
      col.text('details', 'Alert Details', 240, (r) => r.details),
      col.at('at', 'Alert Date & Time', 190, (r) => r.at, f.stamp),
      col.text('recipient', 'Recipient Email', 220, (r) => r.recipient),
      col.pill('status', 'Email Status', 120, (r) => r.status),
      group(),
    ],
  },
  {
    id: 'utilization_report',
    code: 'VEHICLE_UTILIZATION',
    label: 'Utilization Report',
    icon: 'ChartPie',
    subtitle: 'How much of the available hours each vehicle was used',
    params: [param.fromTime('Available from'), param.toTime('Available to')],
    columns: (f) => [
      asset(f),
      col.num('days', 'Selected Days', 120, (r) => r.days),
      col.dur('availableSeconds', 'Available Hours', 130, (r) => r.availableSeconds),
      col.dur('utilizedSeconds', 'Utilized Hours', 130, (r) => r.utilizedSeconds),
      col.dur('unusedSeconds', 'Unused Hours', 120, (r) => r.unusedSeconds),
      col.num('utilizationPct', 'Utilization (%)', 120, (r) => r.utilizationPct, '%'),
      col.num('unusedPct', 'Unused (%)', 110, (r) => r.unusedPct, '%'),
      group(),
    ],
  },
];

const FUEL_REPORT: Report = {
  id: 'fuel_report',
  code: 'VEHICLE_FUEL',
  label: 'Fuel Report',
  icon: 'Fuel',
  group: 'Fuel management',
  subtitle: 'Fuel level of each vehicle per day (vehicles with a fuel sensor)',
  columns: (f) => [
    asset(f),
    col.num('endFuel', 'Fuel Level', 110, (r) => r.endFuel, ' L'),
    col.at('begin', 'Begin Date & Time', 190, (r) => r.begin, f.stamp),
    col.at('end', 'End Date & Time', 190, (r) => r.end, f.stamp),
    col.text(
      'beginCoords',
      'Begin Location (lat, long)',
      200,
      (r) => r.beginCoords ?? r.beginLocation,
    ),
    col.text('endCoords', 'End Location (lat, long)', 200, (r) => r.endCoords ?? r.endLocation),
    col.num('beginFuel', 'Begin Fuel', 110, (r) => r.beginFuel, ' L'),
    col.text('change', 'Change', 100, (r) => `${r.change > 0 ? '+' : ''}${r.change} L`, {
      sortValue: (r: Row) => r.change as number,
    }),
    group(),
  ],
};

const range = (r: { low?: number | null; high?: number | null }) =>
  r.low == null && r.high == null ? '' : `${r.low ?? '—'} to ${r.high ?? '—'} °C`;

const TEMPERATURE_REPORT: Report = {
  id: 'temperature_report',
  code: 'VEHICLE_TEMPERATURE',
  label: 'Temperature Report',
  icon: 'Thermometer',
  group: 'Temperature monitoring',
  subtitle: 'Lowest, average and highest temperature of each sensor per day, and time out of range',
  columns: (f) => [
    asset(f),
    col.text('vehicleType', 'Vehicle Type', 130, (r) => r.vehicleType),
    col.text('sensor', 'Sensor', 140, (r) => r.sensor),
    col.day('day', 'Date', 120, (r) => r.day, f),
    col.num('minTemp', 'Min Temp', 110, (r) => r.minTemp, ' °C'),
    col.num('avgTemp', 'Avg Temp', 110, (r) => r.avgTemp, ' °C'),
    col.num('maxTemp', 'Max Temp', 110, (r) => r.maxTemp, ' °C'),
    col.text('range', 'Allowed Range', 140, range),
    col.dur('outOfRangeSeconds', 'Time Out of Range', 140, (r) => r.outOfRangeSeconds),
    col.at('begin', 'Begin Date & Time', 190, (r) => r.begin, f.stamp),
    col.text('beginLocation', 'Begin Location', 200, (r) => r.beginLocation),
    col.at('end', 'End Date & Time', 190, (r) => r.end, f.stamp),
    col.text('endLocation', 'End Location', 200, (r) => r.endLocation),
    group(),
  ],
};

/** Vehicle alert types offered in the Alert Report's "Alert type" (the original's event types). */
const ALERT_TYPES: [string, string][] = [
  ['MOVEMENT', 'Movement'],
  ['OVERSPEED', 'Overspeed'],
  ['STOP', 'Stop'],
  ['IDLE', 'Idle'],
  ['ENGINE_STATUS', 'Engine Status'],
  ['DEVICE_OFFLINE', 'No Transmission'],
  ['SEATBELT', 'Seatbelt'],
  ['WOKEUP', 'WokeUp'],
  ['DRIFT', 'Drift'],
  ['UNAUTHORIZED_USE', 'Operation Time'],
  ['PANIC', 'Panic'],
  ['DEVICE_TAMPER', 'Panel Alarm'],
  ['SOS', 'SOS'],
  ['HARSH_ACCELERATION', 'Harsh Acceleration'],
  ['HARSH_BRAKING', 'Harsh Braking'],
  ['FATIGUE', 'Fatigue'],
  ['MAINTENANCE_DUE', 'Preventive Maintenance'],
  ['POWER_CUT', 'Power Cut'],
  ['SCHEDULED_MAINTENANCE', 'Scheduled Maintenance'],
  ['ANTI_THEFT', 'Anti-Theft'],
  ['LOW_BATTERY', 'Low Battery'],
  ['BATTERY_DRAIN', 'Battery Drain'],
  ['TOWED', 'Towed'],
  ['TEMP_1', 'Temperature 1'],
  ['TEMP_2', 'Temperature 2'],
  ['TEMP_3', 'Temperature 3'],
  ['TEMP_4', 'Temperature 4'],
  ['BT_TEMP_1', 'BT Temperature 1'],
  ['BT_TEMP_2', 'BT Temperature 2'],
  ['BT_TEMP_3', 'BT Temperature 3'],
  ['BT_TEMP_4', 'BT Temperature 4'],
  ['DOOR_OPEN', 'Door Open'],
  ['DOOR_OPEN_BACK', 'Door Open (Back)'],
  ['FUEL_FILL', 'Fuel Filling'],
  ['FUEL_THEFT', 'Fuel Drain'],
  ['FUEL_MAX', 'Fuel Max Threshold'],
  ['FUEL_MIN', 'Fuel Min Threshold'],
];
const alertTypeOptions = ALERT_TYPES.map(([id, label]) => ({ id, label })).sort((a, b) =>
  a.label.localeCompare(b.label),
);

/** All 24 reports, in the original's order and groups. */
export const REPORTS: Report[] = [
  ...COMMON_REPORTS,
  ...VEHICLE_REPORTS.map((r): Report => ({
    ...r,
    group: VEHICLE,
    params: r.params?.map((p) =>
      p.key === 'alertType' && !p.options?.length ? { ...p, options: alertTypeOptions } : p,
    ),
  })),
  FUEL_REPORT,
  TEMPERATURE_REPORT,
];

/** Starting values of a report's conditions. */
export const initialParams = (params?: Param[]) =>
  Object.fromEntries(
    (params ?? []).filter((p) => p.initial !== undefined).map((p) => [p.key, p.initial!]),
  );

/** Only the filled-in conditions. */
export const filledParams = (values: Record<string, string>) =>
  Object.fromEntries(Object.entries(values ?? {}).filter(([, v]) => v.trim() !== ''));

/** Check of one condition (same messages as the original). */
export function paramError(p: Param, raw: string, all: Record<string, string> = {}): string | null {
  const v = raw.trim();
  if (!v && p.pairedWith && (all[p.pairedWith] ?? '').trim())
    return `Enter ${p.label.toLowerCase()} too, or clear both.`;
  if (!v) return p.required ? `Enter ${p.label.toLowerCase()}.` : null;
  if (p.type === 'number' && !(Number(v) >= 0)) return 'Enter a number of 0 or more.';
  if (p.type === 'time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) return 'Enter a time as hh:mm.';
  if (p.type === 'select' && p.options && !p.options.some((o) => o.id === v))
    return 'Pick one of the choices.';
  return null;
}
