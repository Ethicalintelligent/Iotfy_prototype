// IT-0036. Manage › Alert Configuration (original `EQ` list + `CQ` Add / Edit Alert): the rules
// grid, and the three-column form (alert names by category, vehicles, settings with the
// Settings / Escalation / Review views, one Submit per selected alert). Saved in
// core.alert_configs, one row per vehicle and alert type.
// Saved: the alert_configs row (threshold, days with one start / end time, channels, escalation
// level 1 as escalate_after_min / escalate_to), plus core.rule_settings and
// core.notification_recipients for everything else (alerts/persist.ts, IT-0038).
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  useAlertConfigs,
  useNotificationRecipients,
  useRuleSettings,
  useSaveBatch,
  useUserProfiles,
  type Batch,
  type NotificationRecipientsRow,
  type RuleSettingsRow,
} from '@iotify/data';
import { useFleetGroups, useFleetUsers } from '../../fleet-rows';
import { recipientsOf, saveRecipients } from '../modules/records';
import {
  ALERT_SOURCE,
  rebuild,
  recipientRowsFrom,
  settingsFrom,
  type AlertSettings,
} from './persist';
import { Icon } from '../../smart-track/kit';
import { useVehicleAssets } from '../modules/vehicles';
import { DataGrid, type GridColumn, type GridLayout } from '../grid/DataGrid';
import { VehiclePicker, vehicleTree } from '../geo/GeoAssocModule';
import { Check, Confirm, Drawer, Pill, Select, ViewOnly, useToast } from '../ui';
import { ALERT_DATA } from './alertData';
import {
  CHANNEL_LABEL,
  Checks,
  EscalationView,
  InitialRecipients,
  NO_ESCALATION,
  OCCURRENCE_HOURS,
  checkEscalation,
  defaultLevels,
  describe,
  keyOf,
  nameOf,
  recipientProblems,
  thresholdOf,
  type AlertCtx,
  type Contact,
  type Escalation,
  type People,
  type Person,
  type Recipient,
} from './escalation';

/* ------------------------------------------------------------------ catalogue */

type Field = {
  key: string;
  label: string;
  kind: string;
  unit?: string;
  def?: string;
  help?: string;
  required?: boolean;
  api?: boolean;
  placeholder?: string;
  options?: readonly string[];
  unitChoice?: {
    unitKey: string;
    options: readonly string[];
    def: string;
    keyFor: Record<string, string>;
  };
  unitFrom?: { field: string; keyFor: Record<string, string>; unitFor: Record<string, string> };
  metricUnit?: boolean;
};
interface Rule {
  fields: Field[];
  ignoreDefault?: string;
  ignoreMinutes?: boolean;
  noInterval?: boolean;
  noIgnore?: boolean;
  buzzer?: boolean;
}
interface AlertType {
  code: string;
  label: string;
  icon: string;
  colors: readonly string[];
  desc: string;
  defaultSeverity: string;
  fields: {
    key: string;
    label: string;
    help?: string;
    type: string;
    suffix?: string;
    def?: string;
  }[];
}
const TYPES = ALERT_DATA.types as unknown as AlertType[];
const LOOK = ALERT_DATA.TK as unknown as Record<
  string,
  { name?: string; kind?: string; desc?: string }
>;
const COLORS = ALERT_DATA.SK as unknown as Record<string, string[]>;
const RULES = ALERT_DATA.MK as unknown as Record<
  string,
  Omit<Rule, 'fields'> & { fields?: Field[] }
>;
const CATEGORIES = ALERT_DATA.k0 as unknown as { title: string; codes: string[] }[];
const UNAVAILABLE = ALERT_DATA.il as unknown as {
  key: string;
  name: string;
  icon: string;
  colors: string[];
};
const SEV_TONE = ALERT_DATA.severityTone as unknown as Record<string, string>;
const SEVERITIES = ALERT_DATA.severities as unknown as string[];
const METRIC_UNIT = ALERT_DATA.metricUnit as unknown as Record<string, string>;
const SEV_LABEL: Record<string, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};
const ORDER = new Map(CATEGORIES.flatMap((c) => c.codes).map((c, i) => [c, i]));
const OTHER = 'Other Alerts';

const luminance = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
};
const darkFirst = ([a, b]: readonly string[]) =>
  luminance(a!) <= luminance(b!) ? [a!, b!] : [b!, a!];
// IT-0041 (bug sheet 23-11-2026, Alert configuration #5, rounds 1-2): no alert shows its kind
// label (Measured threshold, Persisting state, Instant event, Communication loss, Rate / change).
const look = (t: AlertType) => ({
  name: LOOK[t.code]?.name ?? t.label,
  desc: LOOK[t.code]?.desc ?? t.desc,
  colors: darkFirst(COLORS[t.code] ?? t.colors),
});
const grad = (c: readonly string[]) => ({ '--acx-c1': c[0], '--acx-c2': c[1] }) as CSSProperties;
/** The settings of a type: the page's own definition plus the catalogue's parameters (original `Xl`). */
function ruleOf(t: AlertType): Rule {
  const r = RULES[t.code];
  const own = new Map(t.fields.map((f) => [f.key, f]));
  const fields: Field[] = (r?.fields ?? []).map((f) =>
    f.api && !own.has(f.key) ? { ...f, api: false } : f,
  );
  const keys = new Set(fields.map((f) => f.key));
  for (const f of t.fields)
    if (!keys.has(f.key))
      fields.push({
        key: f.key,
        label: f.label,
        kind: f.type,
        unit: f.suffix,
        help: f.help,
        required: true,
        api: true,
      });
  return { ...r, fields };
}
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const typeByLabel = new Map(TYPES.map((t) => [squash(t.label), t]));
const typeOf = (stored: string) =>
  TYPES.find((t) => t.code === stored) ??
  typeByLabel.get(squash(stored)) ??
  TYPES.find((t) => squash(look(t).name) === squash(stored));
const alertLabel = (stored: string) =>
  typeOf(stored)?.label ??
  stored
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

/* ------------------------------------------------------------------ days and slots */

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LONG: Record<string, string> = {
  SUN: 'Sunday',
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
};
const DAY_SHORT: Record<string, string> = {
  SUN: 'Sun',
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
};
const ALL_DAY = { from: '00:00', to: '23:59' };
const MAX_SLOTS = 6;
type Slot = { from: string; to: string };
const hm = (t?: string | null) => (t ? t.slice(0, 5) : '');
function clock(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h == null || m == null || Number.isNaN(h) || Number.isNaN(m)
    ? ''
    : `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
const sortSlots = (l: Slot[]) =>
  [...l].sort(
    (a, b) =>
      (a.from || '~').localeCompare(b.from || '~') || (a.to || '~').localeCompare(b.to || '~'),
  );
const slotsText = (l: Slot[]) =>
  sortSlots(l.filter((s) => s.from && s.to))
    .map((s) => `${clock(s.from)} – ${clock(s.to)}`)
    .join(', ') || 'No time slot set';
function daysText(days: string[]) {
  const ix = days
    .map((d) => DAYS.indexOf(d))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (ix.length === 7) return 'Every day';
  if (!ix.length) return '—';
  if (ix.length > 2 && ix.every((n, i) => i === 0 || n === ix[i - 1]! + 1))
    return `${DAY_SHORT[DAYS[ix[0]!]!]}–${DAY_SHORT[DAYS[ix[ix.length - 1]!]!]}`;
  return ix.map((i) => DAY_SHORT[DAYS[i]!]).join(', ');
}
/** One start/end for all days ("from > to" spans midnight), as the original stores it. */
const slotsFor = (from: string, to: string): Slot[] =>
  from > to
    ? [
        { from: '00:00', to },
        { from, to: '23:59' },
      ]
    : [{ from, to }];
const everyDay = (s: Slot[]) => Object.fromEntries(DAYS.map((d) => [d, s.map((x) => ({ ...x }))]));
function slotProblems(days: string[], slots: Record<string, Slot[]>) {
  const byDay: Record<string, { day: string; slots: string[] }> = {};
  let count = 0;
  for (const d of DAYS.filter((x) => days.includes(x))) {
    const list = slots[d] ?? [];
    const p = { day: '', slots: list.map(() => '') };
    if (!list.length) {
      p.day = `Add at least one time slot, or remove ${DAY_LONG[d]}.`;
      count++;
    }
    list.forEach((s, i) => {
      const e =
        !s.from && !s.to
          ? 'Start and end time are required.'
          : !s.from
            ? 'Start time is required.'
            : !s.to
              ? 'End time is required.'
              : s.from === s.to
                ? 'Start and end time cannot be the same.'
                : s.to < s.from
                  ? 'End time must be later than start time.'
                  : '';
      p.slots[i] = e;
      if (e) count++;
    });
    const ok = list
      .map((s, i) => ({ ...s, i }))
      .filter((s) => !p.slots[s.i])
      .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
    for (let i = 1; i < ok.length; i++) {
      const a = ok[i - 1]!;
      const b = ok[i]!;
      const e =
        a.from === b.from && a.to === b.to
          ? `Duplicate of ${clock(a.from)} – ${clock(a.to)}.`
          : b.from < a.to
            ? `Overlaps ${clock(a.from)} – ${clock(a.to)}.`
            : '';
      if (e) {
        p.slots[b.i] = e;
        count++;
      }
    }
    if (p.day || p.slots.some(Boolean)) byDay[d] = p;
  }
  return { byDay, count };
}
/** The envelope stored in Neon (original `o7`). */
function envelope(days: string[], slots: Record<string, Slot[]>) {
  const lists = DAYS.filter((d) => days.includes(d)).map((d) => sortSlots(slots[d] ?? []));
  const key = (l: Slot[]) => l.map((s) => `${s.from}-${s.to}`).join(',');
  const first = lists[0] ?? [ALL_DAY];
  if (lists.every((l) => key(l) === key(first))) {
    if (first.length === 1) return { from: first[0]!.from, to: first[0]!.to };
    const [a, b] = first;
    if (first.length === 2 && a!.from === '00:00' && b!.to === '23:59' && a!.to < b!.from)
      return { from: b!.from, to: a!.to };
  }
  const all = lists.flat();
  return {
    from: all.map((s) => s.from).sort()[0] ?? ALL_DAY.from,
    to:
      all
        .map((s) => s.to)
        .sort()
        .pop() ?? ALL_DAY.to,
  };
}

/* ------------------------------------------------------------------ form values */

const EFFECTIVE = ['One Week', 'One Month', 'Forever', 'Custom Date Range'];
const UNITS = [
  { label: 'Minutes', s: 60 },
  { label: 'Hours', s: 3600 },
  { label: 'Days', s: 86400 },
];
interface Values {
  fields: Record<string, string>;
  interval: string;
  unit: string;
  effective: string;
  customDate: string;
  rangeFrom: string;
  rangeTo: string;
  enabled: boolean;
  days: string[];
  slots: Record<string, Slot[]>;
  modes: string[];
  buzzer: boolean;
  ignore: string;
  severity: string;
  recipients: Recipient[];
  escalation: Escalation;
}
function defaults(t: AlertType): Values {
  const r = ruleOf(t);
  const fields: Record<string, string> = {};
  for (const f of r.fields)
    if (f.kind !== 'info') {
      if (f.unitChoice) fields[f.unitChoice.unitKey] = f.unitChoice.def;
      if (!f.api && fields[f.key] == null) fields[f.key] = f.def ?? '';
    }
  for (const f of t.fields) fields[f.key] = f.def ?? '';
  return {
    fields,
    interval: '10',
    unit: 'Minutes',
    effective: 'Forever',
    customDate: '',
    rangeFrom: '',
    rangeTo: '',
    enabled: true,
    days: [...DAYS],
    slots: everyDay([ALL_DAY]),
    modes: ['PUSH'],
    buzzer: false,
    ignore: r.ignoreDefault ?? '30',
    severity: t.defaultSeverity ?? 'MEDIUM',
    recipients: [],
    escalation: NO_ESCALATION,
  };
}
/** The field that holds the measured threshold (stored in alert_configs.threshold). */
const mainField = (r: Rule) => r.fields.find((f) => f.kind === 'num' || f.kind === 'dur');
const fieldKey = (f: Field, v: Record<string, string>) =>
  f.unitChoice
    ? (f.unitChoice.keyFor[v[f.unitChoice.unitKey] || f.unitChoice.def] ?? f.key)
    : f.unitFrom
      ? (f.unitFrom.keyFor[v[f.unitFrom.field] ?? ''] ?? f.key)
      : f.key;
const fieldUnit = (f: Field, v: Record<string, string>) =>
  f.metricUnit
    ? (METRIC_UNIT[v.maintenanceMetric ?? ''] ?? '')
    : f.unitFrom
      ? (f.unitFrom.unitFor[v[f.unitFrom.field] ?? ''] ?? '')
      : (f.unit ?? '');

interface ConfigRow {
  id: string;
  vehicleId: string;
  plateNo: string;
  type: string;
  enabled: boolean;
  severity: string;
  threshold: number | null;
  thresholdUnit: string | null;
  ignoreSeconds: number | null;
  intervalValue: number | null;
  intervalUnit: string | null;
  validUntil: string | null;
  days: string[];
  from: string;
  to: string;
  modes: string[];
  escalateAfter: number | null;
  escalateTo: string | null;
}
function valuesOf(row: ConfigRow, t: AlertType | undefined): Values {
  const base = t ? defaults(t) : ({} as Values);
  const r = t ? ruleOf(t) : { fields: [] };
  const fields = { ...base.fields };
  const main = mainField(r);
  if (main && row.threshold != null) fields[fieldKey(main, fields)] = String(row.threshold);
  return {
    ...base,
    fields,
    interval: row.intervalValue == null ? '' : String(row.intervalValue),
    unit: row.intervalUnit ?? 'Minutes',
    effective: row.validUntil ? 'Custom Date Range' : 'Forever',
    rangeFrom: '',
    rangeTo: row.validUntil ?? '',
    customDate: '',
    enabled: row.enabled,
    days: row.days,
    slots: everyDay(slotsFor(row.from, row.to)),
    modes: row.modes,
    ignore:
      row.ignoreSeconds == null
        ? (base.ignore ?? '30')
        : String(
            r && (r as Rule).ignoreMinutes
              ? Number((row.ignoreSeconds / 60).toFixed(2))
              : row.ignoreSeconds,
          ),
    severity: row.severity,
    recipients: [],
    escalation: storedEscalation(row),
  };
}
/** A rule saved before IT-0038 has only escalate_after_min / escalate_to: rebuilt as Level 1. */
function storedEscalation(row: ConfigRow): Escalation {
  if (row.escalateAfter == null && !row.escalateTo) return NO_ESCALATION;
  const to = (row.escalateTo ?? '').trim();
  const contact = to
    ? to.includes('@')
      ? { name: to, email: to }
      : /^\+?[0-9 ()-]{6,}$/.test(to)
        ? { name: to, mobile: to }
        : { name: to }
    : null;
  return {
    enabled: true,
    occurrenceHours: OCCURRENCE_HOURS,
    levels: [
      {
        enabled: true,
        conditions: [{ type: 'NOT_ACKNOWLEDGED', value: row.escalateAfter ?? 15 }],
        recipients: contact ? [{ contact }] : [],
        channels: ['PUSH', 'EMAIL'],
      },
    ],
  };
}
function addMonth(d: Date) {
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d;
}
function until(v: Values): string | null {
  if (v.effective === 'One Week')
    return new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  if (v.effective === 'One Month') return addMonth(new Date()).toISOString().slice(0, 10);
  if (v.effective === 'Custom Date Range') return v.rangeTo || null;
  if (v.effective === 'Custom Date') return v.customDate || null;
  return null;
}
function problems(t: AlertType, v: Values) {
  const e: Record<string, string> = {};
  const r = ruleOf(t);
  for (const f of r.fields) {
    if (f.kind === 'info' || f.kind === 'tog') continue;
    const k = fieldKey(f, v.fields);
    const s = (v.fields[k] ?? '').trim();
    if ((f.kind === 'num' || f.kind === 'dur') && f.required !== false && f.required) {
      if (s === '' || !Number.isFinite(Number(s)) || Number(s) < 0)
        e[f.key] = 'A number, 0 or more';
    } else if (f.required && !s) e[f.key] = 'Required';
  }
  if (!r.noInterval) {
    const u = UNITS.find((x) => x.label === v.unit) ?? UNITS[0]!;
    if (!/^\d+$/.test(v.interval) || Number(v.interval) < 1)
      e.interval = 'A whole number, 1 or more';
    else if (Number(v.interval) * u.s > 30 * 86400) e.interval = 'At most 30 days';
  }
  if (v.effective === 'Custom Date' && !v.customDate) e.effective = 'Pick the last day';
  if (v.effective === 'Custom Date Range') {
    if (!v.rangeFrom || !v.rangeTo) e.effective = 'Select a start date and an end date.';
    else if (v.rangeTo < v.rangeFrom)
      e.effective = 'End date cannot be earlier than the start date.';
  }
  if (!v.days.length) e.days = 'Select at least one day';
  const n = slotProblems(v.days, v.slots).count;
  if (n) e.time = `${n} time slot problem${n === 1 ? '' : 's'} to fix`;
  if (!r.noIgnore && !(r.ignoreMinutes ? /^\d+(\.\d+)?$/ : /^\d+$/).test(v.ignore))
    e.ignore = r.ignoreMinutes ? 'Minutes, 0 or more' : 'Seconds, 0 or more';
  return e;
}

/* ------------------------------------------------------------------ module */

export function AlertConfigModule({
  companyId,
  readOnly,
  picker,
}: {
  companyId: string;
  readOnly: boolean;
  picker: ReactNode;
  layout?: GridLayout;
  onLayout?: (l: GridLayout) => void;
}) {
  const canEdit = !readOnly;
  const configs = useAlertConfigs({ company_id: Number(companyId) });
  const settingsQ = useRuleSettings({ source_table: ALERT_SOURCE });
  const recipientsQ = useNotificationRecipients({ source_table: ALERT_SOURCE });
  const assets = useVehicleAssets(companyId);
  const groups = useFleetGroups(companyId);
  const save = useSaveBatch();
  const toast = useToast();
  const [editing, setEditing] = useState<ConfigRow | 'new' | null>(null);
  // IT-0041: the row's View action opens the same form read-only.
  const [viewing, setViewing] = useState(false);
  const [deleting, setDeleting] = useState<ConfigRow | null>(null);
  const plate = useMemo(
    () => new Map((assets.data ?? []).map((a) => [a.id, a.plate_serial ?? a.name ?? a.id])),
    [assets.data],
  );
  const rows: ConfigRow[] = useMemo(
    () =>
      (configs.data ?? [])
        // alert_configs.asset_id is the gps vehicle id (a number); the page uses text ids.
        .map((c) => ({ ...c, asset_id: String(c.asset_id) }))
        .filter((c) => plate.has(c.asset_id))
        .map((c) => ({
          id: c.id,
          vehicleId: c.asset_id,
          plateNo: plate.get(c.asset_id)!,
          type: c.alert_type,
          enabled: c.enabled !== false,
          severity: (c.severity ?? 'Medium').toUpperCase(),
          threshold: c.threshold == null ? null : Number(c.threshold),
          thresholdUnit: c.threshold_unit ?? null,
          ignoreSeconds: c.ignore_seconds == null ? null : Number(c.ignore_seconds),
          intervalValue: c.interval_value == null ? null : Number(c.interval_value),
          intervalUnit: c.interval_unit ?? null,
          validUntil: c.effective_till ? String(c.effective_till).slice(0, 10) : null,
          days: (c.days ?? []).map((d) => d.toUpperCase()),
          from: hm(c.start_time) || ALL_DAY.from,
          to: hm(c.end_time) || ALL_DAY.to,
          modes: [
            c.notify_push !== false && 'PUSH',
            c.notify_email && 'EMAIL',
            c.notify_sms && 'SMS',
          ].filter(Boolean) as string[],
          escalateAfter: c.escalate_after_min == null ? null : Number(c.escalate_after_min),
          escalateTo: c.escalate_to ?? null,
        })),
    [configs.data, plate],
  );
  const columns: GridColumn<ConfigRow>[] = [
    { key: 'plate', label: 'Plate Number', width: 160, strong: true, value: (r) => r.plateNo },
    {
      key: 'type',
      label: 'Alert Name',
      width: 190,
      value: (r) => alertLabel(r.type),
      render: (r) => {
        const t = typeOf(r.type);
        return (
          <span className="vm-type">
            <span
              className="vm-type__icon"
              style={
                {
                  '--grad': t
                    ? `linear-gradient(135deg, ${t.colors[0]} 0%, ${t.colors[1]} 100%)`
                    : 'var(--brand)',
                } as CSSProperties
              }
            >
              <Icon name={t?.icon ?? 'Bell'} size={13} />
            </span>
            {alertLabel(r.type)}
          </span>
        );
      },
    },
    {
      key: 'interval',
      label: 'Interval Time',
      width: 130,
      value: (r) =>
        r.intervalValue == null ? '——' : `${r.intervalValue} ${r.intervalUnit ?? 'Minutes'}`,
      sortValue: (r) =>
        (r.intervalValue ?? 0) * (UNITS.find((u) => u.label === r.intervalUnit)?.s ?? 60),
    },
    {
      key: 'effective',
      label: 'Effective Till',
      width: 140,
      value: (r) =>
        r.validUntil
          ? new Date(r.validUntil).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : 'Forever',
      sortValue: (r) => r.validUntil ?? '9999',
    },
    {
      key: 'subscription',
      label: 'Subscription',
      width: 125,
      value: (r) => (r.enabled ? 'On' : 'Off'),
      render: (r) => <Pill tone={r.enabled ? 'green' : 'gray'}>{r.enabled ? 'On' : 'Off'}</Pill>,
    },
    { key: 'days', label: 'Days', width: 130, value: (r) => daysText(r.days) },
    { key: 'start', label: 'Start Time', width: 110, value: (r) => r.from },
    { key: 'end', label: 'End Time', width: 110, value: (r) => r.to },
    {
      key: 'mode',
      label: 'Notification Mode',
      width: 170,
      value: (r) =>
        [
          ['PUSH', 'Push'],
          ['EMAIL', 'Email'],
          ['SMS', 'Sms'],
        ]
          .filter(([k]) => r.modes.includes(k!))
          .map(([, l]) => l)
          .join(', ') || '——',
    },
  ];
  const remove = (r: ConfigRow) =>
    save.mutate(
      {
        deletes: [
          { table: 'alert_configs', keys: [{ id: r.id }] },
          ...(settingsQ.data ?? [])
            .filter((x) => x.source_id === r.id)
            .map(() => ({
              table: 'rule_settings' as const,
              keys: [{ source_table: ALERT_SOURCE, source_id: r.id }],
            })),
          ...(recipientsOf(recipientsQ.data, ALERT_SOURCE, r.id).length
            ? [
                {
                  table: 'notification_recipients' as const,
                  keys: recipientsOf(recipientsQ.data, ALERT_SOURCE, r.id).map((x) => ({
                    id: x.id,
                  })),
                },
              ]
            : []),
        ],
      },
      {
        onSuccess: () => {
          toast.show('Alert rule deleted.');
          setDeleting(null);
        },
      },
    );
  return (
    <DataGrid
      picker={picker}
      rows={rows}
      rowKey={(r) => r.id}
      rowLabel={(r) => `${r.plateNo} · ${alertLabel(r.type)}`}
      columns={columns}
      plural="Alert Rules"
      searchPlaceholder="Search plate or alert..."
      addLabel="Add Alert"
      onAdd={
        canEdit
          ? () => {
              setViewing(false);
              setEditing('new');
            }
          : undefined
      }
      onView={(r) => {
        setViewing(true);
        setEditing(r);
      }}
      onEdit={
        canEdit
          ? (r) => {
              setViewing(false);
              setEditing(r);
            }
          : undefined
      }
      onDelete={canEdit ? (r) => setDeleting(r) : undefined}
      loading={configs.isPending || assets.isPending}
      error={configs.error ?? assets.error}
      onRetry={() => void configs.refetch()}
    >
      {editing && (
        <ViewOnly title={viewing ? 'View Alert' : null}>
        <AlertForm
          key={`${editing === 'new' ? 'new' : editing.id}:${viewing}`}
          companyId={companyId}
          settings={settingsQ.data}
          recipientRows={recipientsQ.data}
          rule={editing === 'new' ? null : editing}
          existing={rows}
          vehicles={(assets.data ?? []).map((a) => ({
            id: a.id,
            plate: a.plate_serial ?? a.name ?? a.id,
            group: a.asset_group ?? null,
          }))}
          groups={(groups.data ?? []).map((g) => ({
            id: g.id,
            name: g.name,
            parentId: g.parent_id ?? null,
          }))}
          onClose={() => setEditing(null)}
          onSaved={(n) => {
            setEditing(null);
            toast.show(n === 1 ? 'Alert configured.' : `${n} alerts configured.`);
          }}
        />
        </ViewOnly>
      )}
      {deleting && (
        <Confirm
          title="Delete this alert rule?"
          busy={save.isPending}
          error={save.error ? save.error.message : null}
          message={`${alertLabel(deleting.type)} alerts for ${deleting.plateNo} stop. This action cannot be undone.`}
          onCancel={() => {
            setDeleting(null);
            save.reset();
          }}
          onConfirm={() => remove(deleting)}
        />
      )}
      {toast.node}
    </DataGrid>
  );
}

/* ------------------------------------------------------------------ form */

function Switch({
  on,
  onChange,
  label,
  showState = true,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  showState?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`ui-switch ${on ? 'is-on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="ui-switch__track">
        <span className="ui-switch__knob" />
      </span>
      {showState && <span>{on ? 'On' : 'Off'}</span>}
    </button>
  );
}
function Row({
  label,
  help,
  error,
  required,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="vm-acx__row">
      <div className="vm-acx__lbl">
        <b>
          {label}
          {required && (
            <span className="vm-acx__req" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </b>
        {help && <small>{help}</small>}
        {error && <em>{error}</em>}
      </div>
      <div className="vm-acx__ctl">{children}</div>
    </div>
  );
}

function FieldInput({
  f,
  values,
  error,
  onChange,
}: {
  f: Field;
  values: Record<string, string>;
  error?: string;
  onChange: (p: Record<string, string>) => void;
}) {
  const k = fieldKey(f, values);
  const v = values[k] ?? '';
  const unit = fieldUnit(f, values);
  let ctl: ReactNode;
  if (f.kind === 'info') ctl = <span className="vm-acx__ro">{f.def}</span>;
  else if (f.kind === 'num' || f.kind === 'dur')
    ctl = (
      <>
        <input
          type="text"
          inputMode="decimal"
          value={v}
          placeholder={f.placeholder ?? 'Value'}
          aria-label={f.label}
          aria-invalid={!!error}
          onChange={(e) => onChange({ [k]: e.target.value })}
        />
        {f.unitChoice ? (
          <Select
            small
            value={values[f.unitChoice.unitKey] || f.unitChoice.def}
            aria-label={`${f.label} unit`}
            options={f.unitChoice.options.map((u) => ({ value: u, label: u }))}
            onChange={(u) => onChange({ [f.unitChoice!.unitKey]: u })}
          />
        ) : (
          unit && <span className="vm-acx__unit">{unit}</span>
        )}
      </>
    );
  else if (f.kind === 'time' || f.kind === 'date')
    ctl = (
      <input
        type={f.kind}
        value={v}
        aria-label={f.label}
        aria-invalid={!!error}
        onChange={(e) => onChange({ [k]: e.target.value })}
      />
    );
  else if (f.kind === 'sel')
    ctl = (
      <Select
        value={v}
        aria-label={f.label}
        options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
        onChange={(o) => onChange({ [k]: o })}
      />
    );
  else if (f.kind === 'multi') {
    const on = v.split(',').filter(Boolean);
    ctl = (
      <div className="vm-acx__multi" role="group" aria-label={f.label}>
        {(f.options ?? []).map((o) => {
          const sel = on.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={sel}
              className={`vm-acx__opt ${sel ? 'is-on' : ''}`}
              onClick={() =>
                onChange({
                  [k]: (f.options ?? []).filter((x) => (x === o ? !sel : on.includes(x))).join(','),
                })
              }
            >
              {o}
            </button>
          );
        })}
      </div>
    );
  } else {
    const on = v === 'true';
    ctl = (
      <>
        <Switch
          on={on}
          label={f.label}
          showState={false}
          onChange={(b) => onChange({ [k]: String(b) })}
        />
        <span className="vm-acx__unit">{on ? 'Enabled' : 'Disabled'}</span>
      </>
    );
  }
  return (
    <Row label={f.label} help={f.help} error={error} required={!!f.required && f.kind !== 'info'}>
      {ctl}
    </Row>
  );
}

function Period({
  name,
  days,
  slots,
  tried,
  onChange,
}: {
  name: string;
  days: string[];
  slots: Record<string, Slot[]>;
  tried: boolean;
  onChange: (p: Partial<Values>) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const check = slotProblems(days, slots);
  const quiet = (m: string) => !tried && /required/.test(m);
  const on = DAYS.filter((d) => days.includes(d));
  const off = DAYS.filter((d) => !days.includes(d));
  const setSlots = (d: string, l: Slot[]) => onChange({ slots: { ...slots, [d]: l } });
  const setOpenDay = (d: string, o: boolean) =>
    setOpen((s) => {
      const n = new Set(s);
      if (o) n.add(d);
      else n.delete(d);
      return n;
    });
  return (
    <div className="vm-acx__period">
      <div className="vm-acx__daybox" role="group" aria-label={`${name} days`}>
        {on.length ? (
          on.map((d) => (
            <button
              key={d}
              type="button"
              className="vm-acx__day"
              aria-label={`Remove ${DAY_LONG[d]}`}
              onClick={() => onChange({ days: days.filter((x) => x !== d) })}
            >
              × {DAY_LONG[d]}
            </button>
          ))
        ) : (
          <span className="vm-acx__hint">No days selected</span>
        )}
      </div>
      {off.length > 0 && (
        <div className="vm-acx__dayadd">
          {off.map((d) => (
            <button
              key={d}
              type="button"
              aria-label={`Add ${DAY_LONG[d]}`}
              onClick={() => {
                onChange({
                  days: DAYS.filter((x) => x === d || days.includes(x)),
                  ...(slots[d]?.length ? {} : { slots: { ...slots, [d]: [{ ...ALL_DAY }] } }),
                });
                setOpenDay(d, true);
              }}
            >
              + {DAY_SHORT[d]}
            </button>
          ))}
        </div>
      )}
      {on.length > 0 && (
        <div className="vm-acx__dws">
          {on.map((d) => {
            const list = slots[d] ?? [];
            const p = check.byDay[d];
            const bad = !!(p && (p.day || p.slots.some((m) => m && !quiet(m))));
            const isOpen = open.has(d) || (tried && !!p);
            const count = `${list.length} time slot${list.length === 1 ? '' : 's'}`;
            return (
              <div
                key={d}
                className={`vm-acx__dw ${isOpen ? 'is-open' : ''} ${bad ? 'is-bad' : ''}`}
              >
                <button
                  type="button"
                  className="vm-acx__dwh"
                  aria-expanded={isOpen}
                  aria-label={`${DAY_LONG[d]}, ${count}${bad ? ', needs attention' : ''}`}
                  onClick={() => {
                    if (isOpen) setSlots(d, sortSlots(list));
                    setOpenDay(d, !isOpen);
                  }}
                >
                  <span className="vm-acx__dwn">{DAY_LONG[d]}</span>
                  <span className="vm-acx__dwc">{count}</span>
                  <span className="vm-acx__dws-sum" title={slotsText(list)}>
                    {slotsText(list)}
                  </span>
                  {bad && (
                    <span className="vm-acx__dwx" aria-hidden="true">
                      !
                    </span>
                  )}
                  <Icon name="ChevronRight" size={12} className="vm-acx__dwv" />
                </button>
                {isOpen && (
                  <div className="vm-acx__dwb">
                    {list.map((s, i) => {
                      const m = p?.slots[i] ?? '';
                      const show = !!m && !quiet(m);
                      const up = (x: Partial<Slot>) =>
                        setSlots(
                          d,
                          list.map((y, j) => (j === i ? { ...y, ...x } : y)),
                        );
                      return (
                        <div key={i} className={`vm-acx__dslot ${show ? 'is-bad' : ''}`}>
                          <input
                            type="time"
                            value={s.from}
                            aria-label={`${DAY_LONG[d]} slot ${i + 1} start time`}
                            aria-invalid={show}
                            onChange={(e) => up({ from: e.target.value })}
                          />
                          <span>to</span>
                          <input
                            type="time"
                            value={s.to}
                            aria-label={`${DAY_LONG[d]} slot ${i + 1} end time`}
                            aria-invalid={show}
                            onChange={(e) => up({ to: e.target.value })}
                          />
                          <button
                            type="button"
                            className="vm-acx__slx"
                            aria-label={`Delete ${DAY_LONG[d]} slot ${i + 1}`}
                            title="Delete time slot"
                            onClick={() =>
                              setSlots(
                                d,
                                list.filter((_, j) => j !== i),
                              )
                            }
                          >
                            <Icon name="Trash" size={14} />
                          </button>
                          {show && <em>{m}</em>}
                        </div>
                      );
                    })}
                    {p?.day && (
                      <em className="vm-acx__err">
                        {p.day}{' '}
                        <button
                          type="button"
                          className="td-link"
                          onClick={() => onChange({ days: days.filter((x) => x !== d) })}
                        >
                          Remove {DAY_LONG[d]}
                        </button>
                      </em>
                    )}
                    {list.length < MAX_SLOTS && (
                      <button
                        type="button"
                        className="vm-acx__sladd"
                        onClick={() => setSlots(d, [...list, { from: '', to: '' }])}
                      >
                        + Add Time Slot
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EffectiveTill({
  v,
  error,
  onChange,
}: {
  v: Values;
  error?: string;
  onChange: (p: Partial<Values>) => void;
}) {
  const options = EFFECTIVE.includes(v.effective) ? EFFECTIVE : [...EFFECTIVE, v.effective];
  const hint =
    v.effective === 'One Week' || v.effective === 'One Month'
      ? `Active until ${new Date(`${until(v)}T23:59:00`).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })} (counted from when you save)`
      : '';
  const fmt = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  return (
    <div className="vm-acx__till">
      <Select
        value={v.effective}
        onChange={(o) => onChange({ effective: o })}
        aria-label="Effective till"
        options={options.map((o) => ({ value: o, label: o }))}
      />
      {hint && <span className="vm-acx__hint">{hint}</span>}
      {v.effective === 'Custom Date Range' && (
        <div className="vm-acx__tillr">
          <label>
            <span>Start Date</span>
            <input
              type="date"
              value={v.rangeFrom}
              aria-label="Effective start date"
              aria-invalid={!!error}
              onChange={(e) => onChange({ rangeFrom: e.target.value })}
            />
          </label>
          <label>
            <span>End Date</span>
            <input
              type="date"
              value={v.rangeTo}
              min={v.rangeFrom || undefined}
              aria-label="Effective end date"
              aria-invalid={!!error}
              onChange={(e) => onChange({ rangeTo: e.target.value })}
            />
          </label>
        </div>
      )}
      {v.effective === 'Custom Date Range' && v.rangeFrom && v.rangeTo && !error && (
        <span className="vm-acx__hint">
          Active{' '}
          <b>
            {fmt(v.rangeFrom)} – {fmt(v.rangeTo)}
          </b>
        </span>
      )}
      {v.effective === 'Custom Date' && (
        <input
          type="date"
          value={v.customDate}
          min={new Date().toISOString().slice(0, 10)}
          aria-label="Last day"
          aria-invalid={!!error}
          onChange={(e) => onChange({ customDate: e.target.value })}
        />
      )}
    </div>
  );
}

function Settings({
  t,
  v,
  errors,
  tried,
  people,
  recipientErrors,
  onAddContact,
  onChange,
  onEscalation,
}: {
  t: AlertType;
  v: Values;
  errors: Record<string, string>;
  tried: boolean;
  people: People;
  recipientErrors: string[];
  onAddContact: (c: Contact) => void;
  onChange: (p: Partial<Values>) => void;
  onEscalation: () => void;
}) {
  const levelsOn = v.escalation.levels.filter((l) => l.enabled).length;
  const r = ruleOf(t);
  const l = look(t);
  const units = UNITS.slice(0, 2).map((u) => u.label);
  const unitOpts = units.includes(v.unit) ? units : [...units, v.unit];
  return (
    <div className="vm-acx__alert">
      <header className="vm-acx__hd">
        <span className="vm-acx__tile" style={grad(l.colors)} aria-hidden="true">
          <Icon name={t.icon} size={14} />
        </span>
        <b>{l.name}</b>
        <Switch
          on={v.enabled}
          label={`${l.name} alert on or off`}
          onChange={(b) => onChange({ enabled: b })}
        />
        <span className={`vm-acx__sev tone-${SEV_TONE[v.severity]}`}>
          <span>Severity:</span>
          <Select
            small
            value={v.severity}
            onChange={(s) => onChange({ severity: s })}
            aria-label="Severity"
            options={SEVERITIES.map((s) => ({ value: s, label: SEV_LABEL[s]! }))}
          />
        </span>
      </header>
      {l.desc && (
        <p className="vm-acx__desc" title={l.desc}>
          {l.desc}
        </p>
      )}
      {r.fields.map((f) => (
        <FieldInput
          key={f.key}
          f={f}
          values={v.fields}
          error={errors[f.key]}
          onChange={(p) => onChange({ fields: { ...v.fields, ...p } })}
        />
      ))}
      {!r.noIgnore && (
        <Row
          label={r.ignoreMinutes ? 'Minutes to Ignore' : 'Seconds to Ignore'}
          help="Ignore repeat triggers within this window."
          error={errors.ignore}
        >
          <input
            inputMode={r.ignoreMinutes ? 'decimal' : 'numeric'}
            value={v.ignore}
            aria-label={r.ignoreMinutes ? 'Minutes to ignore' : 'Seconds to ignore'}
            aria-invalid={!!errors.ignore}
            onChange={(e) => onChange({ ignore: e.target.value })}
          />
          <span className="vm-acx__unit">{r.ignoreMinutes ? 'minutes' : 'seconds'}</span>
        </Row>
      )}
      {!r.noInterval && (
        <Row
          label="Interval"
          help="The system checks every X minutes to see if the condition still holds and triggers alerts accordingly."
          error={errors.interval}
        >
          <input
            inputMode="numeric"
            value={v.interval}
            placeholder="Not set"
            aria-label="Interval"
            aria-invalid={!!errors.interval}
            onChange={(e) => onChange({ interval: e.target.value })}
          />
          <Select
            value={v.unit}
            onChange={(u) => onChange({ unit: u })}
            aria-label="Interval unit"
            options={unitOpts.map((u) => ({ value: u, label: u }))}
          />
        </Row>
      )}
      <Row
        label="Effective till"
        help="How long should this alert remain active."
        error={errors.effective}
      >
        <EffectiveTill v={v} error={errors.effective} onChange={onChange} />
      </Row>
      <Row
        label="Notification period"
        help="Alert and escalation Email/SMS notifications will be sent only during the configured days and time slots."
        error={errors.days ?? errors.time}
      >
        <Period name={l.name} days={v.days} slots={v.slots} tried={tried} onChange={onChange} />
      </Row>
      <Row label="Notification mode" help="How you want to be notified.">
        <div className="vm-acx__modes">
          {[
            ['PUSH', 'Push'],
            ['EMAIL', 'Email'],
            ['SMS', 'SMS'],
          ].map(([id, label]) => (
            <Check
              key={id}
              checked={v.modes.includes(id!)}
              onChange={(b) =>
                onChange({ modes: b ? [...v.modes, id!] : v.modes.filter((m) => m !== id) })
              }
            >
              {label}
            </Check>
          ))}
          {r.buzzer && (
            <Check checked={v.buzzer} onChange={(b) => onChange({ buzzer: b })}>
              Buzzer
            </Check>
          )}
        </div>
      </Row>
      {needsPeople(v) && (
        <InitialRecipients
          people={people}
          recipients={v.recipients}
          modes={v.modes}
          errors={recipientErrors}
          onChange={(r) => onChange({ recipients: r })}
          onAddContact={onAddContact}
        />
      )}
      <Row
        label="Escalation"
        help="Who is notified next if this alert is not handled."
        error={errors.escalation}
      >
        <span className={`vm-acx__state ${v.escalation.enabled ? 'is-on' : ''}`}>
          {v.escalation.enabled ? `${levelsOn} level${levelsOn === 1 ? '' : 's'} · On` : 'Off'}
        </span>
        <button type="button" className="td-link" onClick={onEscalation}>
          {v.escalation.enabled ? 'Open escalation →' : 'Configure escalation →'}
        </button>
      </Row>
    </div>
  );
}

/** Email or SMS among the modes: the first alert needs its recipients (original `rm`). */
const needsPeople = (v: Values) => v.modes.includes('EMAIL') || v.modes.includes('SMS');

type CheckList = Parameters<typeof Checks>[0]['checks'];
function Review({
  title,
  rows,
  checks,
}: {
  title: string;
  rows: [string, ReactNode][];
  checks: { state: string; text: string }[];
}) {
  const cant = checks.some((c) => c.state === 'bad');
  return (
    <div className="vm-acx__review">
      <section className="vm-acx__level">
        <h4>
          <Icon name="Check" size={15} />
          Review · {title}
        </h4>
        <dl className="vm-acx__dl">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="vm-acx__level">
        <h4>Validation</h4>
        <Checks checks={checks as CheckList} />
        {cant && <small className="vm-acx__hint">Fix the items marked ✖ to submit.</small>}
      </section>
    </div>
  );
}

type PillItem = { kind: 'unavailable' } | { kind: 'type'; type: AlertType };
const VIEWS: [string, string][] = [
  ['cfg', 'Settings'],
  ['esc', 'Escalation'],
  ['rev', 'Review'],
];

function AlertForm({
  companyId,
  settings,
  recipientRows,
  rule,
  existing,
  vehicles,
  groups,
  onClose,
  onSaved,
}: {
  companyId: string;
  settings: RuleSettingsRow[] | undefined;
  recipientRows: NotificationRecipientsRow[] | undefined;
  rule: ConfigRow | null;
  existing: ConfigRow[];
  vehicles: { id: string; plate: string; group: string | null }[];
  groups: { id: string; name: string; parentId: string | null }[];
  onClose: () => void;
  onSaved: (n: number) => void;
}) {
  const save = useSaveBatch();
  // The directory: the company's users (gps.app_user + core.user_profiles), as the original's recipients list.
  const usersQ = useFleetUsers(companyId);
  const profilesQ = useUserProfiles();
  const users: Person[] = useMemo(() => {
    const prof = new Map((profilesQ.data ?? []).map((p) => [String(p.user_id), p]));
    return (usersQ.data ?? []).map((u) => ({
      id: u.id,
      name: u.name ?? u.email ?? u.id,
      email: u.email ?? null,
      mobile: prof.get(u.id)?.mobile ?? null,
      active: !prof.get(u.id)?.suspended,
    }));
  }, [usersQ.data, profilesQ.data]);
  const ruleType = rule ? typeOf(rule.type) : undefined;
  const first = TYPES.find((t) => t.code === CATEGORIES[0]!.codes[0]) ?? TYPES[0]!;
  const startCode = ruleType?.code ?? first.code;
  const [picked, setPicked] = useState<string[]>([startCode]);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(rule ? [rule.vehicleId] : []));
  const [values, setValues] = useState<Record<string, Values>>(() =>
    rule && ruleType
      ? {
          // Everything comes back from Neon: the row, its rule_settings and its recipients.
          [ruleType.code]: rebuild(
            valuesOf(rule, ruleType),
            settings?.find((s) => s.source_id === rule.id)?.settings as AlertSettings | undefined,
            recipientsOf(recipientRows, ALERT_SOURCE, rule.id),
            users,
          ),
        }
      : {},
  );
  // External contacts typed in this form, offered again in every picker (original `SQ`).
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const m = new Map<string, Contact>();
    for (const x of Object.values(values))
      for (const r of [...x.recipients, ...x.escalation.levels.flatMap((l) => l.recipients)])
        if (r.contact) m.set(keyOf(r), r.contact);
    return [...m.values()];
  });
  const people: People = { users, contacts, loading: usersQ.isPending };
  const addContact = (c: Contact) =>
    setContacts((l) =>
      l.some((x) => keyOf({ contact: x }) === keyOf({ contact: c })) ? l : [...l, c],
    );
  const [initial] = useState(values);
  const [q, setQ] = useState('');
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [saved, setSavedMap] = useState<Record<string, string>>({});
  const [errorsOf, setErrorsOf] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [tried, setTried] = useState(false);
  const [focus, setFocus] = useState(startCode);
  const [view, setView] = useState('cfg');
  const tree = useMemo(() => vehicleTree(vehicles, groups), [vehicles, groups]);
  const plates = useMemo(() => new Map(vehicles.map((v) => [v.id, v.plate])), [vehicles]);
  const text = q.trim().toLowerCase();
  const shown = TYPES.filter(
    (t) =>
      !text || look(t).name.toLowerCase().includes(text) || t.label.toLowerCase().includes(text),
  );
  const shownOn = shown.filter((t) => picked.includes(t.code)).length;
  const allShown = shown.length > 0 && shownOn === shown.length;
  const valueOf = (t: AlertType) => values[t.code] ?? defaults(t);
  const baseOf = (t: AlertType) =>
    saved[t.code] ? (JSON.parse(saved[t.code]!) as Values) : (initial[t.code] ?? defaults(t));
  const dirty = (t: AlertType) => JSON.stringify(valueOf(t)) !== JSON.stringify(baseOf(t));
  const isSaved = (t: AlertType) => saved[t.code] === JSON.stringify(valueOf(t));
  const update = (t: AlertType, p: Partial<Values>) =>
    setValues((all) => ({ ...all, [t.code]: { ...(all[t.code] ?? defaults(t)), ...p } }));
  /** The alert's threshold, unit and directory for the escalation checks (original `F`). */
  const ctxOf = (t: AlertType, x: Values): AlertCtx => {
    const th = thresholdOf(t.code);
    const f = th ? ruleOf(t).fields.find((y) => y.key === th.key) : undefined;
    const raw = f ? (x.fields[fieldKey(f, x.fields)] ?? '').trim() : '';
    const unit = f
      ? f.unitChoice
        ? x.fields[f.unitChoice.unitKey] || f.unitChoice.def
        : fieldUnit(f, x.fields)
      : '';
    return {
      code: t.code,
      base: f && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : null,
      unit,
      users,
    };
  };
  const peopleCheck = (t: AlertType, x: Values) => ({
    recipients: needsPeople(x) ? recipientProblems(x.recipients, x.modes, users) : [],
    escalation: checkEscalation(x.escalation, needsPeople(x) ? x.recipients : [], ctxOf(t, x)),
  });
  /** Settings problems plus recipients and escalation (original `ie`). */
  const allProblems = (t: AlertType, x: Values) => {
    const e = problems(t, x);
    const pc = peopleCheck(t, x);
    if (pc.recipients.length) e.recipients = pc.recipients[0]!;
    if (pc.escalation.problems)
      e.escalation = `${pc.escalation.problems} escalation problem${pc.escalation.problems === 1 ? '' : 's'} to fix`;
    return e;
  };
  const errs = (t: AlertType) => (touched.has(t.code) ? allProblems(t, valueOf(t)) : {});
  const triggerText = (t: AlertType, x: Values) => {
    const th = thresholdOf(t.code);
    const c = ctxOf(t, x);
    if (th)
      return c.base == null
        ? `${th.label} not set`
        : `Fires when ${th.label.toLowerCase()} ${th.up ? '>' : '<'} ${c.base}${c.unit ? ` ${c.unit}` : ''}`;
    return 'Fires on the alert condition';
  };
  const rank = (t: AlertType) => ORDER.get(t.code) ?? ORDER.size + TYPES.indexOf(t);
  const selected = TYPES.filter((t) => picked.includes(t.code)).sort((a, b) => rank(a) - rank(b));
  const current = selected.find((t) => t.code === focus) ?? selected[0];
  const byCode = new Map(shown.map((t) => [t.code, t]));
  const unavailableShown = !text || UNAVAILABLE.name.toLowerCase().includes(text);
  const groupsList = [
    ...CATEGORIES.map((c) => ({
      title: c.title,
      items: c.codes.flatMap((code): PillItem[] =>
        code === UNAVAILABLE.key
          ? unavailableShown
            ? [{ kind: 'unavailable' as const }]
            : []
          : byCode.get(code)
            ? [{ kind: 'type' as const, type: byCode.get(code)! }]
            : [],
      ),
    })),
    {
      title: OTHER,
      items: shown
        .filter((t) => !ORDER.has(t.code))
        .map((t): PillItem => ({ kind: 'type', type: t })),
    },
  ].filter((g) => g.items.length > 0);
  const vehicleError = touched.size && !chosen.size ? 'Select at least one vehicle.' : undefined;

  const clickType = (code: string) => {
    if (rule) return;
    if (!picked.includes(code)) {
      setPicked((p) => [...p, code]);
      setFocus(code);
      setView('cfg');
    } else if (current?.code !== code) setFocus(code);
    else if (selected.length > 1 && busy !== code) {
      const i = selected.findIndex((t) => t.code === code);
      const rest = selected.filter((t) => t.code !== code);
      setPicked((p) => p.filter((c) => c !== code));
      setFocus(rest[Math.min(i, rest.length - 1)]!.code);
    }
  };
  const selectAll = (on: boolean) =>
    setPicked((p) => {
      const next = on
        ? [...new Set([...p, ...shown.map((t) => t.code)])]
        : p.filter((c) => c === current?.code || c === busy || !shown.some((t) => t.code === c));
      return next.length ? next : p;
    });
  const nextUnsaved = (code: string, done: Record<string, string>) => {
    const i = selected.findIndex((t) => t.code === code);
    for (let k = 1; k < selected.length; k++) {
      const t = selected[(i + k) % selected.length]!;
      if (done[t.code] !== JSON.stringify(valueOf(t))) return t.code;
    }
    return null;
  };
  const submit = async () => {
    if (!current || busy) return;
    setTried(true);
    const t = current;
    const v = valueOf(t);
    setTouched((s) => new Set(s).add(t.code));
    const p = allProblems(t, v);
    if (Object.keys(p).length || !chosen.size) {
      setView(
        !chosen.size || Object.keys(p).some((k) => k !== 'escalation' && k !== 'recipients')
          ? 'cfg'
          : 'rev',
      );
      return;
    }
    setErrorsOf((e) => ({ ...e, [t.code]: '' }));
    setBusy(t.code);
    const r = ruleOf(t);
    const main = mainField(r);
    const unit = UNITS.find((u) => u.label === v.unit) ?? UNITS[0]!;
    const env = envelope(v.days, v.slots);
    const now = new Date().toISOString();
    // Neon keeps the first level only: its first timed condition and its first recipient.
    const lvl = v.escalation.enabled ? v.escalation.levels.find((l) => l.enabled) : undefined;
    const timed = lvl?.conditions.find(
      (c) => c.type === 'NOT_ACKNOWLEDGED' || c.type === 'UNRESOLVED' || c.type === 'ACTIVE_FOR',
    );
    const who = lvl?.recipients[0];
    const person = who?.userId ? users.find((u) => u.id === who.userId) : undefined;
    const step = {
      after: lvl
        ? (timed?.value ?? (lvl.conditions.some((c) => c.type === 'IMMEDIATELY') ? 1 : null))
        : null,
      to: who
        ? who.contact
          ? who.contact.email || who.contact.mobile || who.contact.name
          : person?.email || person?.mobile || person?.name || null
        : null,
    };
    const rows = [...chosen].map((asset) => {
      const same = existing.find((x) => x.vehicleId === asset && typeOf(x.type)?.code === t.code);
      return {
        id:
          rule && asset === rule.vehicleId && typeOf(rule.type)?.code === t.code
            ? rule.id
            : (same?.id ?? `AC-${companyId}-${crypto.randomUUID().slice(0, 8)}`),
        company_id: Number(companyId),
        asset_id: Number(asset),
        alert_type: t.label,
        enabled: v.enabled,
        severity: SEV_LABEL[v.severity] ?? 'Medium',
        threshold:
          main && (v.fields[fieldKey(main, v.fields)] ?? '') !== ''
            ? Number(v.fields[fieldKey(main, v.fields)])
            : null,
        threshold_unit: main
          ? fieldUnit(main, v.fields) ||
            (main.unitChoice ? v.fields[main.unitChoice.unitKey] || main.unitChoice.def : null)
          : null,
        ignore_seconds: r.noIgnore
          ? null
          : r.ignoreMinutes
            ? Math.round(Number(v.ignore) * 60)
            : Number(v.ignore),
        interval_value: r.noInterval ? null : Number(v.interval),
        interval_unit: r.noInterval ? null : unit.label === 'Days' ? 'Hours' : unit.label,
        effective_till: until(v),
        days: DAYS.filter((d) => v.days.includes(d)).map((d) => DAY_SHORT[d]),
        start_time: env.from,
        end_time: env.to,
        notify_push: v.modes.includes('PUSH'),
        notify_sms: v.modes.includes('SMS'),
        notify_email: v.modes.includes('EMAIL'),
        escalate_after_min: step.after,
        escalate_to: step.to,
        updated_at: now,
      };
    });
    const snapshot = JSON.stringify(v);
    // The rest of the form: rule_settings and recipients, in the same transaction.
    const batch: Batch = {
      upserts: [
        { table: 'alert_configs', rows },
        {
          table: 'rule_settings',
          rows: rows.map((x) => ({
            source_table: ALERT_SOURCE,
            source_id: x.id,
            company_id: Number(companyId),
            settings: settingsFrom(v),
          })),
        },
      ],
    };
    const people = recipientRowsFrom(v);
    rows.forEach((x) =>
      saveRecipients(batch, recipientRows, {
        companyId,
        sourceTable: ALERT_SOURCE,
        sourceId: x.id,
        rows: people,
      }),
    );
    try {
      await save.mutateAsync(batch);
      const done = { ...saved, [t.code]: snapshot };
      setSavedMap(done);
      if (rule || selected.length === 1) return onSaved(1);
      const next = nextUnsaved(t.code, done);
      if (next) {
        setFocus(next);
        setView('cfg');
      }
    } catch (x) {
      setErrorsOf((e) => ({ ...e, [t.code]: x instanceof Error ? x.message : 'Request failed.' }));
    } finally {
      setBusy(null);
    }
  };

  const count = picked.length;
  const doneCount = selected.filter(isSaved).length;
  const allDone = selected.length > 1 && doneCount === selected.length;
  const name = current ? look(current).name : '';
  const v = current ? valueOf(current) : null;
  const curErrors = current ? errs(current) : {};
  const saveError = current ? errorsOf[current.code] : '';
  const reviewOf = (t: AlertType, x: Values) => {
    const l = look(t);
    const r = ruleOf(t);
    const p = problems(t, x);
    const pc = peopleCheck(t, x);
    const ctx = ctxOf(t, x);
    const hours = x.escalation.occurrenceHours ?? OCCURRENCE_HOURS;
    const levelsOn = x.escalation.levels.filter((l) => l.enabled).length;
    const env = envelope(x.days, x.slots);
    const fmt = (d: string) =>
      new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    const plateList = [...chosen].map((id) => plates.get(id) ?? id);
    const rows: [string, ReactNode][] = [
      ['Alert', l.name],
      ['Severity', SEV_LABEL[x.severity]],
      ['Alert On/Off', x.enabled ? 'On' : 'Off'],
      [
        'Vehicles',
        plateList.length ? (
          plateList.join(', ')
        ) : (
          <span className="vm-acx__bad">None selected</span>
        ),
      ],
      ...(l.desc ? ([['Description', l.desc]] as [string, ReactNode][]) : []),
      ...r.fields.map((f): [string, ReactNode] => [
        f.label,
        f.kind === 'info'
          ? (f.def ?? '')
          : `${x.fields[fieldKey(f, x.fields)] || '—'}${fieldUnit(f, x.fields) ? ` ${fieldUnit(f, x.fields)}` : ''}`,
      ]),
      ...(r.noIgnore
        ? []
        : ([
            [
              r.ignoreMinutes ? 'Minutes to Ignore' : 'Seconds to Ignore',
              `${x.ignore} ${r.ignoreMinutes ? 'minutes' : 'seconds'}`,
            ],
          ] as [string, ReactNode][])),
      ...(r.noInterval
        ? []
        : ([['Interval', `${x.interval} ${x.unit.toLowerCase()}`]] as [string, ReactNode][])),
      [
        'Effective till',
        x.effective === 'Custom Date'
          ? x.customDate
            ? `Until ${fmt(x.customDate)}`
            : 'Custom date not set'
          : x.effective === 'Custom Date Range'
            ? x.rangeFrom && x.rangeTo
              ? `${fmt(x.rangeFrom)} – ${fmt(x.rangeTo)}`
              : 'Custom date range not set'
            : x.effective,
      ],
      ['Notification period', `${daysText(x.days)} · ${clock(env.from)} – ${clock(env.to)}`],
      [
        'Notification mode',
        [
          ...x.modes.map((m) => ({ PUSH: 'Push', EMAIL: 'Email', SMS: 'SMS' })[m]),
          ...(r.buzzer && x.buzzer ? ['Buzzer'] : []),
        ].join(', ') || '—',
      ],
      [
        'Initial recipients',
        needsPeople(x) ? (
          x.recipients.length ? (
            <>
              {x.recipients.map((rc) => (
                <div key={keyOf(rc)}>
                  → {nameOf(rc, users)} ({rc.contact ? 'external' : 'user'}) ·{' '}
                  {(rc.channels ?? [])
                    .filter((c) => x.modes.includes(c))
                    .map((c) => CHANNEL_LABEL[c])
                    .join(', ') || 'no channel'}
                </div>
              ))}
            </>
          ) : (
            '—'
          )
        ) : (
          'Not needed (push notification only)'
        ),
      ],
      [
        'Escalation',
        x.escalation.enabled ? (
          <>
            {x.escalation.levels.map(
              (lv, i) =>
                lv.enabled && (
                  <div key={i}>
                    Level {i + 1}:{' '}
                    {lv.conditions.map((c) => describe(c, ctx, hours)).join(' · ') ||
                      'no condition'}{' '}
                    → {lv.recipients.map((rc) => nameOf(rc, users)).join(', ') || 'nobody'} (
                    {lv.channels.map((c) => CHANNEL_LABEL[c]).join(', ') || 'no channel'})
                  </div>
                ),
            )}
          </>
        ) : (
          'Off'
        ),
      ],
    ];
    const triggers = Object.keys(p).filter(
      (k) => !['days', 'time', 'effective', 'escalation'].includes(k),
    ).length;
    const mark = (label: string, n: number, ok = label) =>
      n ? { state: 'bad', text: `${label} (${n} to fix)` } : { state: 'ok', text: ok };
    const checks = [
      mark('Trigger conditions', triggers),
      mark('Notification period', (p.days ? 1 : 0) + (p.time ? 1 : 0)),
      mark('Effective till', p.effective ? 1 : 0),
      chosen.size
        ? { state: 'ok', text: `Vehicles (${chosen.size})` }
        : { state: 'bad', text: 'Vehicles (none selected)' },
      mark('Recipients and channels', pc.recipients.length),
      x.escalation.enabled
        ? mark(
            `Escalation (${levelsOn} level${levelsOn === 1 ? '' : 's'} on)`,
            pc.escalation.problems,
          )
        : { state: 'ok', text: 'Escalation is off (allowed)' },
      ...(pc.escalation.warnings.length
        ? [
            {
              state: 'warn',
              text: `${pc.escalation.warnings.length} warning${pc.escalation.warnings.length === 1 ? '' : 's'}: ${pc.escalation.warnings[0]}`,
            },
          ]
        : []),
    ];
    return { rows, checks };
  };

  return (
    <Drawer
      title={rule ? 'Edit Alert' : 'Add Alert'}
      icon={rule ? 'Pencil' : 'BellPlus'}
      onClose={onClose}
      subtitle={
        rule
          ? `${rule.plateNo} · ${ruleType ? look(ruleType).name : alertLabel(rule.type)}`
          : `${count === 1 ? '1 alert name' : `${count} alert names`} · ${chosen.size === 1 ? '1 vehicle' : `${chosen.size} vehicles`} selected`
      }
      footer={
        <>
          <button
            type="button"
            className="td-btn td-btn--ghost td-drawerx__reset"
            onClick={() => setResetting(true)}
            disabled={!!busy || !current || !dirty(current)}
            title={current && !dirty(current) ? `No unsaved changes in ${name}` : undefined}
          >
            {selected.length > 1 ? `Reset ${name}` : 'Reset'}
          </button>
          <button
            type="button"
            className="td-btn td-drawerx__submit"
            onClick={() => void submit()}
            disabled={!!busy || !current}
          >
            {busy
              ? `Submitting ${look(TYPES.find((t) => t.code === busy)!).name}…`
              : rule
                ? 'Save Changes'
                : selected.length > 1
                  ? `Submit ${name}`
                  : 'Submit'}
          </button>
        </>
      }
    >
      <div className="vm-acx">
        <div className="vm-acx__body">
          <section className="vm-acx__col vm-acx__alerts" aria-label="Alerts">
            <h3>
              <Icon name="Bell" size={16} />
              Alerts
            </h3>
            <label className="vm-pick__search">
              <Icon name="Search" size={15} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search Alert Name"
                aria-label="Search alert name"
              />
            </label>
            {!rule && (
              <div className="vm-acx__selrow">
                <label>
                  <input
                    type="checkbox"
                    checked={allShown}
                    ref={(el) => {
                      if (el) el.indeterminate = shownOn > 0 && !allShown;
                    }}
                    onChange={() => selectAll(!allShown)}
                  />
                  {picked.length} / {TYPES.length}
                </label>
                <button type="button" className="td-link" onClick={() => selectAll(!allShown)}>
                  {allShown ? 'Clear All' : 'Select All'}
                </button>
              </div>
            )}
            <div className="vm-acx__list" role="group" aria-label="Alert names">
              {!groupsList.length && (
                <p className="vm-pick__empty">
                  <b>No matching alert name</b> Try a different search term.
                </p>
              )}
              {groupsList.map((g) => (
                <div key={g.title} className="vm-acx__group" role="group" aria-label={g.title}>
                  <div className="vm-acx__group-title" aria-hidden="true">
                    {g.title}
                  </div>
                  {g.items.map((it) => {
                    if (it.kind === 'unavailable')
                      return (
                        <button
                          key={UNAVAILABLE.key}
                          type="button"
                          disabled
                          className="vm-acx__pill is-unavailable"
                          title="Not available yet"
                          style={grad(darkFirst(UNAVAILABLE.colors))}
                        >
                          <Icon name={UNAVAILABLE.icon} size={15} />
                          <span>
                            {UNAVAILABLE.name}
                            <small>Not available yet</small>
                          </span>
                        </button>
                      );
                    const t = it.type;
                    const l = look(t);
                    const on = picked.includes(t.code);
                    const isFocus = current?.code === t.code;
                    const title = rule
                      ? l.name
                      : on
                        ? isFocus
                          ? selected.length > 1
                            ? 'Click again to deselect'
                            : 'At least one alert stays selected'
                          : 'Selected · click to edit'
                        : 'Click to select';
                    return (
                      <button
                        key={t.code}
                        type="button"
                        aria-pressed={on}
                        disabled={!!rule && !on}
                        className={`vm-acx__pill ${isFocus ? 'is-focus' : ''}`}
                        style={grad(l.colors)}
                        title={title}
                        onClick={() => clickType(t.code)}
                      >
                        <Icon name={t.icon} size={15} />
                        <span>{l.name}</span>
                        {on && (
                          <i className="vm-acx__pill-check" aria-hidden="true">
                            <Icon name="Check" size={11} strokeWidth={3.4} />
                          </i>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
          <section className="vm-acx__col vm-acx__veh" aria-label="Vehicles">
            <h3>
              <Icon name="Truck" size={16} />
              Vehicles
            </h3>
            <p className="vm-acx__note">The selected alerts apply to every vehicle checked here.</p>
            <VehiclePicker groups={tree} selected={chosen} disabled={!!rule} onChange={setChosen} />
            {vehicleError && (
              <small className="td-fx__err" role="alert">
                {vehicleError}
              </small>
            )}
          </section>
          <section className="vm-acx__col vm-acx__cfg" aria-label="Alert settings">
            <div className="vm-acx__tabbar">
              <div className="vm-acx__tabhead">
                Selected Alerts: <b>{selected.length}</b> · Submitted <b>{doneCount}</b> of{' '}
                {selected.length}
              </div>
              <div className="vm-acx__tabs" role="tablist" aria-label="Selected alerts">
                {selected.map((t) => {
                  const l = look(t);
                  const on = t.code === current?.code;
                  const bad = !!errorsOf[t.code] || Object.keys(errs(t)).length > 0;
                  const ok = isSaved(t);
                  const changed = !ok && dirty(t);
                  const state =
                    busy === t.code
                      ? 'Saving…'
                      : bad
                        ? 'Needs attention'
                        : ok
                          ? 'Submitted'
                          : changed
                            ? 'Unsaved changes'
                            : 'Not submitted';
                  return (
                    <button
                      key={t.code}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      className={`vm-acx__tab ${on ? 'is-on' : ''}`}
                      title={`${l.name} · ${state}`}
                      onClick={() => setFocus(t.code)}
                    >
                      <span className="vm-acx__tab-dot" style={grad(l.colors)} aria-hidden="true" />
                      <span className="vm-acx__tab-name">{l.name}</span>
                      {busy === t.code ? (
                        <span className="vm-acx__spin" aria-label="Saving" />
                      ) : bad ? (
                        <span className="vm-acx__tab-bad" aria-label="Needs attention">
                          !
                        </span>
                      ) : ok ? (
                        <span className="vm-acx__tab-ok" aria-label="Submitted">
                          ✓
                        </span>
                      ) : changed ? (
                        <span className="vm-acx__tab-dirty" aria-label="Unsaved changes" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
            {current && (
              <div className="vm-acx__navrow">
                <span className="vm-acx__eyebrow">
                  {selected.length > 1
                    ? `${name} · ${selected.indexOf(current) + 1} of ${selected.length}`
                    : ''}
                </span>
                <nav className="vm-acx__views" aria-label="Alert sections">
                  {VIEWS.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={view === id}
                      className={view === id ? 'is-on' : ''}
                      onClick={() => setView(id)}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              </div>
            )}
            <div
              className="vm-acx__settings"
              role="tabpanel"
              aria-label={current ? `${name} settings` : undefined}
            >
              {allDone && (
                <div className="vm-acx__done" role="status">
                  <Icon name="CircleCheck" size={15} />
                  <span>All selected alerts have been configured successfully.</span>
                  <button
                    type="button"
                    className="td-btn td-btn--primary"
                    onClick={() => onSaved(selected.length)}
                  >
                    Done
                  </button>
                </div>
              )}
              {current && saveError ? (
                <div className="vm-acx__vbar" role="alert">
                  <Icon name="CircleAlert" size={14} />
                  <span>
                    Could not save <b>{name}</b>: {saveError} Fix anything needed and submit again.
                  </span>
                </div>
              ) : (
                current &&
                Object.keys(curErrors).length > 0 && (
                  <div className="vm-acx__vbar" role="alert">
                    <Icon name="CircleAlert" size={14} />
                    <span>
                      Fix the highlighted fields in <b>{name}</b> before submitting.
                    </span>
                  </div>
                )
              )}
              {!current || !v ? (
                <p className="vm-pick__empty">Pick an alert name to configure it.</p>
              ) : view === 'esc' ? (
                <EscalationView
                  key={current.code}
                  name={name}
                  severity={v.severity}
                  severityLabel={SEV_LABEL[v.severity] ?? v.severity}
                  severityTone={SEV_TONE[v.severity] ?? 'amber'}
                  vehicles={chosen.size}
                  trigger={triggerText(current, v)}
                  escalation={v.escalation}
                  first={v.recipients}
                  firstNeeded={needsPeople(v)}
                  ctx={ctxOf(current, v)}
                  check={peopleCheck(current, v).escalation}
                  people={people}
                  onAddContact={addContact}
                  onEditTrigger={() => setView('cfg')}
                  onChange={(e) => update(current, { escalation: e })}
                  onTurnOn={() =>
                    update(current, {
                      escalation: {
                        ...v.escalation,
                        enabled: true,
                        occurrenceHours: v.escalation.occurrenceHours ?? OCCURRENCE_HOURS,
                        levels: v.escalation.levels.length
                          ? v.escalation.levels
                          : defaultLevels(v.severity, ctxOf(current, v)),
                      },
                    })
                  }
                />
              ) : view === 'rev' ? (
                <Review key={current.code} title={name} {...reviewOf(current, v)} />
              ) : (
                <Settings
                  key={current.code}
                  t={current}
                  v={v}
                  errors={curErrors}
                  tried={tried}
                  people={people}
                  recipientErrors={peopleCheck(current, v).recipients}
                  onAddContact={addContact}
                  onChange={(p) => update(current, p)}
                  onEscalation={() => setView('esc')}
                />
              )}
            </div>
          </section>
        </div>
        {resetting && current && (
          <Confirm
            title={`Reset ${name}?`}
            confirmLabel="Reset"
            busyLabel="Resetting…"
            message={`Reset ${name} to its last saved settings? Other selected alerts keep their changes.`}
            onCancel={() => setResetting(false)}
            onConfirm={() => {
              setValues((all) => ({ ...all, [current.code]: baseOf(current) }));
              setTouched((s) => {
                const n = new Set(s);
                n.delete(current.code);
                return n;
              });
              setErrorsOf((e) => ({ ...e, [current.code]: '' }));
              setResetting(false);
            }}
          />
        )}
      </div>
    </Drawer>
  );
}
