// Alerts screen logic (pure, unit-tested): the alerts of a period, the filter and the date
// formats of the grid. Alerts are demo activity (see ../../demo/fleet).
import {
  addDays,
  alertEvents,
  startOfDay,
  type AlertEvent,
  type LiveVehicle,
} from '../../demo/fleet';
import { ALERT, type AlertInfo, type AlertKind } from '../../shared/vehicle-status';

export type Period = 'today' | 'yesterday' | '7d';
export const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
];
const DAYS: Record<Period, number[]> = { today: [0], yesterday: [1], '7d': [0, 1, 2, 3, 4, 5, 6] };

export type Severity = AlertInfo['severity'];
export const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low'];

/** Every alert type, in the order of the design. */
export const ALL_KINDS = Object.keys(ALERT) as AlertKind[];

/** Every alert of every type in a period, newest first. */
export function periodAlerts(live: LiveVehicle[], now: Date, period: Period): AlertEvent[] {
  return DAYS[period].flatMap((d) =>
    alertEvents(live, d === 0 ? now : addDays(startOfDay(now), -d), ALL_KINDS, now),
  );
}

export interface AlertFilter {
  period: Period;
  severity: 'all' | Severity;
  /** Alert types left out. */
  hiddenKinds: AlertKind[];
  /** Vehicles left out. */
  hiddenVehicles: string[];
}

export const NO_FILTER: AlertFilter = {
  period: 'today',
  severity: 'all',
  hiddenKinds: [],
  hiddenVehicles: [],
};

/** Whether a filter narrows the list beyond today's alerts. */
export const isFiltered = (f: AlertFilter) =>
  f.period !== 'today' ||
  f.severity !== 'all' ||
  f.hiddenKinds.length > 0 ||
  f.hiddenVehicles.length > 0;

/**
 * Alerts that pass the filter and contain the search text in their plate, operator, alert name,
 * severity or description.
 */
export function filterAlerts(
  events: AlertEvent[],
  f: AlertFilter,
  q: string,
  operatorOf: (vehicleId: string) => string | null,
): AlertEvent[] {
  const s = q.trim().toLowerCase();
  const kinds = new Set(f.hiddenKinds);
  const vehicles = new Set(f.hiddenVehicles);
  return events.filter((e) => {
    const info = ALERT[e.kind];
    if (kinds.has(e.kind) || vehicles.has(e.vehicleId)) return false;
    if (f.severity !== 'all' && info.severity !== f.severity) return false;
    if (!s) return true;
    return `${e.plate} ${operatorOf(e.vehicleId) ?? ''} ${info.label} ${info.severity} ${e.description}`
      .toLowerCase()
      .includes(s);
  });
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "2026-11-23 02:16:35 PM" (as in the design). */
export function stampText(d: Date): string {
  const h = d.getHours() % 12 || 12;
  return `${ymd(d)} ${pad(h)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/** "2026-11-23 14:16:35": sorts in time order. */
export const sortStamp = (d: Date) =>
  `${ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
