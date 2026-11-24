// Manage > Alert Configuration: one alert's settings as plain values, read from / written to
// proto_vehicle.alert_configs (one row per vehicle and alert type), the checks before saving and
// the texts the grid and the Review tab show. Pure; no React.
import type { AlertConfigsRow } from '@iotify/data';
import type { AlertType } from './alert-types';

export type Day = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
export const DAYS: { value: Day; label: string }[] = [
  { value: 'Sun', label: 'Sunday' },
  { value: 'Mon', label: 'Monday' },
  { value: 'Tue', label: 'Tuesday' },
  { value: 'Wed', label: 'Wednesday' },
  { value: 'Thu', label: 'Thursday' },
  { value: 'Fri', label: 'Friday' },
  { value: 'Sat', label: 'Saturday' },
];
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export const SEVERITIES: Severity[] = ['Low', 'Medium', 'High', 'Critical'];

export interface AlertSettings {
  enabled: boolean;
  severity: Severity;
  /** The threshold box as typed. */
  threshold: string;
  /** Stored threshold of a type that has no threshold box (kept as it is). */
  keptThreshold: number | null;
  keptUnit: string | null;
  /** Seconds to Ignore, as typed. */
  ignore: string;
  intervalValue: string;
  intervalUnit: 'Minutes' | 'Hours';
  /** yyyy-mm-dd, or '' for Forever. */
  effectiveTill: string;
  days: Day[];
  /** "HH:MM". */
  start: string;
  end: string;
  push: boolean;
  sms: boolean;
  email: boolean;
  escalate: boolean;
  escalateAfter: string;
  escalateTo: string;
}

const ALL_DAYS = DAYS.map((d) => d.value);

export function defaults(type: AlertType): AlertSettings {
  return {
    enabled: true,
    severity: 'Medium',
    threshold: type.threshold?.default != null ? String(type.threshold.default) : '',
    keptThreshold: null,
    keptUnit: null,
    ignore: String(type.ignore),
    intervalValue: '10',
    intervalUnit: 'Minutes',
    effectiveTill: '',
    days: [...ALL_DAYS],
    start: '00:00',
    end: '23:59',
    push: true,
    sms: false,
    email: false,
    escalate: false,
    escalateAfter: '15',
    escalateTo: '',
  };
}

const str = (v: number | string | null | undefined) => (v == null ? '' : String(Number(v)));

export function fromConfig(row: AlertConfigsRow, type: AlertType): AlertSettings {
  const d = defaults(type);
  return {
    enabled: row.enabled !== false,
    severity: row.severity ?? 'Medium',
    threshold: type.threshold ? str(row.threshold) : '',
    keptThreshold: type.threshold || row.threshold == null ? null : Number(row.threshold),
    keptUnit: type.threshold ? null : (row.threshold_unit ?? null),
    ignore: row.ignore_seconds == null ? '' : String(row.ignore_seconds),
    intervalValue: row.interval_value == null ? d.intervalValue : String(row.interval_value),
    intervalUnit: row.interval_unit ?? 'Minutes',
    effectiveTill: row.effective_till ? String(row.effective_till).slice(0, 10) : '',
    days: ALL_DAYS.filter((x) => (row.days ?? ALL_DAYS).includes(x)),
    start: String(row.start_time ?? '00:00').slice(0, 5),
    end: String(row.end_time ?? '23:59').slice(0, 5),
    push: row.notify_push !== false,
    sms: !!row.notify_sms,
    email: !!row.notify_email,
    escalate: row.escalate_after_min != null || !!row.escalate_to,
    escalateAfter:
      row.escalate_after_min == null ? d.escalateAfter : String(row.escalate_after_min),
    escalateTo: row.escalate_to ?? '',
  };
}

const isNum = (v: string) => v.trim() !== '' && Number.isFinite(Number(v));
const isWhole = (v: string) => /^\d+$/.test(v.trim());
const CONTACT = /^([^\s@]+@[^\s@]+\.[^\s@]+|\+?[\d\s-]{7,})$/;

export interface Check {
  key: 'trigger' | 'period' | 'till' | 'vehicles' | 'channels' | 'escalation';
  label: string;
  ok: boolean;
  /** What's wrong, in plain words. */
  why?: string;
}

/** The Review tab's checks; every one must be fine before submitting. */
export function checks(
  type: AlertType,
  s: AlertSettings,
  vehicles: number,
  today: string,
): Check[] {
  const trig: string[] = [];
  if (type.threshold) {
    if (!s.threshold.trim()) {
      if (type.threshold.required) trig.push(`${type.threshold.label} is missing`);
    } else if (!isNum(s.threshold) || Number(s.threshold) < 0)
      trig.push(`${type.threshold.label} must be a number`);
  }
  if (s.ignore.trim() && !isWhole(s.ignore)) trig.push('Seconds to Ignore must be a whole number');
  if (type.interval && (!isWhole(s.intervalValue) || Number(s.intervalValue) < 1))
    trig.push('Interval must be a whole number above 0');
  const per: string[] = [];
  if (!s.days.length) per.push('choose at least one day');
  if (!/^\d\d:\d\d$/.test(s.start) || !/^\d\d:\d\d$/.test(s.end)) per.push('set both times');
  else if (s.start >= s.end) per.push('the end time must be after the start time');
  const till = s.effectiveTill && s.effectiveTill < today ? 'the date is in the past' : '';
  const esc: string[] = [];
  if (s.escalate) {
    if (!isWhole(s.escalateAfter) || Number(s.escalateAfter) < 1)
      esc.push('minutes must be a whole number above 0');
    if (!CONTACT.test(s.escalateTo.trim())) esc.push('add an email address or phone number');
  }
  return [
    { key: 'trigger', label: 'Trigger conditions', ok: !trig.length, why: trig.join('; ') },
    { key: 'period', label: 'Notification period', ok: !per.length, why: per.join('; ') },
    { key: 'till', label: 'Effective till', ok: !till, why: till },
    {
      key: 'vehicles',
      label: `Vehicles (${vehicles})`,
      ok: vehicles > 0,
      why: vehicles ? '' : 'check at least one vehicle',
    },
    {
      key: 'channels',
      label: 'Recipients and channels',
      ok: s.push || s.sms || s.email,
      why: s.push || s.sms || s.email ? '' : 'choose Push, Email or SMS',
    },
    {
      key: 'escalation',
      label: s.escalate ? 'Escalation' : 'Escalation is off (allowed)',
      ok: !esc.length,
      why: esc.join('; '),
    },
  ];
}

/** A new id for this company: AC-C1-1, AC-C1-2… (unique across companies). */
export function idMaker(companyId: string, rows: { id: string }[]) {
  const prefix = `AC-${companyId}-`;
  let max = 0;
  for (const r of rows)
    if (r.id.startsWith(prefix)) max = Math.max(max, Number(r.id.slice(prefix.length)) || 0);
  return () => prefix + ++max;
}

/**
 * The rows to save for one alert type on the checked vehicles: an existing row for the same
 * vehicle and type keeps its id (so it is updated, never doubled).
 */
export function toRows(
  type: AlertType,
  s: AlertSettings,
  assetIds: string[],
  companyId: string,
  existing: AlertConfigsRow[],
  newId: () => string,
): AlertConfigsRow[] {
  const has = new Map(
    existing
      .filter((r) => r.alert_type.toLowerCase() === type.name.toLowerCase())
      .map((r) => [r.asset_id, r.id]),
  );
  const num = (v: string) => (isNum(v) ? Number(v) : null);
  return assetIds.map((asset) => ({
    id: has.get(asset) ?? newId(),
    company_id: companyId,
    asset_id: asset,
    alert_type: type.name,
    enabled: s.enabled,
    severity: s.severity,
    threshold: type.threshold ? num(s.threshold) : s.keptThreshold,
    threshold_unit: type.threshold ? (s.threshold.trim() ? type.threshold.unit : null) : s.keptUnit,
    ignore_seconds: isWhole(s.ignore) ? Number(s.ignore) : null,
    interval_value: type.interval ? Number(s.intervalValue) : null,
    interval_unit: type.interval ? s.intervalUnit : null,
    effective_till: s.effectiveTill || null,
    days: s.days,
    start_time: s.start,
    end_time: s.end,
    notify_push: s.push,
    notify_sms: s.sms,
    notify_email: s.email,
    escalate_after_min: s.escalate ? Number(s.escalateAfter) : null,
    escalate_to: s.escalate ? s.escalateTo.trim() : null,
  }));
}

// ---------------------------------------------------------------- texts
const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');

/** "23:59" → "11:59 PM". */
export function ampm(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (h == null || m == null || Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
/** "Every day", "Weekdays", "Mon, Wed". */
export function daysText(days: readonly string[]): string {
  if (!days.length) return 'No days';
  if (days.length === 7) return 'Every day';
  const set = new Set(days);
  if (days.length === 5 && ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].every((d) => set.has(d)))
    return 'Weekdays';
  return ALL_DAYS.filter((d) => set.has(d)).join(', ');
}
/** "Forever" or "31 Dec 2026". */
export function tillText(v: string | null | undefined): string {
  if (!v) return 'Forever';
  const [y, m, d] = String(v).slice(0, 10).split('-').map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : String(v);
}
/** "10 Minutes" or "—". */
export const intervalText = (value: number | string | null | undefined, unit?: string | null) =>
  value == null || value === '' ? '—' : `${value} ${unit ?? 'Minutes'}`;
/** "Push, Email, SMS". */
export const modeText = (push?: boolean, email?: boolean, sms?: boolean) =>
  [push && 'Push', email && 'Email', sms && 'SMS'].filter(Boolean).join(', ') || 'None';
/** What triggers it: "Fires when speed > 120 km/h", "Fires on instant event". */
export function triggerText(type: AlertType, s: AlertSettings): string {
  if (type.threshold && s.threshold.trim())
    return `Fires at ${type.threshold.label.toLowerCase()} ${s.threshold} ${type.threshold.unit}`;
  if (type.kind === 'Instant event') return 'Fires on instant event';
  return `Fires on ${(type.condition ?? type.name).toLowerCase()}`;
}
