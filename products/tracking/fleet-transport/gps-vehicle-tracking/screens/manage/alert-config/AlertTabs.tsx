// The three tabs of one chosen alert in the Add / Edit Alert drawer (approved design,
// Desktop/vs/Manage-Alert-Configuration.html): Settings, Escalation and Review.
import { useState } from 'react';
import {
  Button,
  Card,
  CheckboxField,
  CheckList,
  Chip,
  DisclosureRow,
  HueChip,
  IconTile,
  InlineInput,
  InlineSelect,
  KeyValueList,
  MultiSelectField,
  Note,
  PillSelect,
  SettingRow,
  Stack,
  StepChain,
  Switch,
  TimeRange,
} from '@iotify/ui';
import type { AlertType } from './alert-types';
import {
  DAYS,
  SEVERITIES,
  ampm,
  daysText,
  intervalText,
  modeText,
  tillText,
  triggerText,
  type AlertSettings,
  type Check,
  type Day,
  type Severity,
} from './alert-form';

export interface TabProps {
  type: AlertType;
  s: AlertSettings;
  set: (patch: Partial<AlertSettings>) => void;
  /** Show missing values in red (after a submit was tried). */
  tried: boolean;
}

const SEVERITY_HUE = { Low: 'blue', Medium: 'amber', High: 'orange', Critical: 'red' } as const;
const slotText = (s: AlertSettings) => `${ampm(s.start)} – ${ampm(s.end)}`;

/** The alert's heading: icon tile, name, On/Off switch, severity and how it fires. */
function AlertHead({ type, s, set }: Pick<TabProps, 'type' | 's' | 'set'>) {
  return (
    <Stack gap={10} wrap>
      <IconTile icon={type.icon} hue={type.hue} size="sm" variant="solid" />
      <b>{type.name}</b>
      <Switch
        label={`${type.name} alert on`}
        checked={s.enabled}
        onChange={(v) => set({ enabled: v })}
        showState
      />
      <PillSelect
        label="Severity"
        value={s.severity}
        onChange={(v: Severity) => set({ severity: v })}
        options={SEVERITIES.map((v) => ({ value: v, label: `Severity: ${v}` }))}
      />
      {type.kind && <HueChip hue="grey">{type.kind}</HueChip>}
    </Stack>
  );
}

// ---------------------------------------------------------------- Settings
export function SettingsTab({
  type,
  s,
  set,
  tried,
  onEscalation,
}: TabProps & { onEscalation: () => void }) {
  const [open, setOpen] = useState<Day | null>(null);
  const th = type.threshold;
  const missing = tried && !!th?.required && !s.threshold.trim();
  return (
    <Stack dir="col" gap={0} align="stretch">
      <AlertHead type={type} s={s} set={set} />
      <SettingRow label={null} description={type.description} />
      {th ? (
        <SettingRow label={th.label} description={th.hint} required={th.required}>
          <InlineInput
            label={th.label}
            type="number"
            min={0}
            step="any"
            unit={th.unit}
            value={s.threshold}
            invalid={missing}
            onChange={(v) => set({ threshold: v })}
          />
        </SettingRow>
      ) : type.condition ? (
        <SettingRow label="Alert Condition">
          <Chip>{type.condition}</Chip>
        </SettingRow>
      ) : null}
      <SettingRow
        label="Seconds to Ignore"
        description="Ignore repeat triggers within this window."
      >
        <InlineInput
          label="Seconds to ignore"
          type="number"
          min={0}
          unit="seconds"
          value={s.ignore}
          onChange={(v) => set({ ignore: v })}
        />
      </SettingRow>
      {type.interval && (
        <SettingRow
          label="Interval"
          description="The system checks every X minutes to see if the condition still holds and triggers alerts accordingly."
        >
          <Stack gap={8} wrap={false}>
            <InlineInput
              label="Interval"
              type="number"
              min={1}
              value={s.intervalValue}
              invalid={tried && !(Number(s.intervalValue) >= 1)}
              onChange={(v) => set({ intervalValue: v })}
            />
            <InlineSelect
              label="Interval unit"
              value={s.intervalUnit}
              onChange={(v) => set({ intervalUnit: v })}
              options={[
                { value: 'Minutes', label: 'Minutes' },
                { value: 'Hours', label: 'Hours' },
              ]}
            />
          </Stack>
        </SettingRow>
      )}
      <SettingRow label="Effective till" description="How long should this alert remain active.">
        <InlineSelect
          label="Effective till"
          value={s.effectiveTill ? 'date' : 'forever'}
          onChange={(v) =>
            set({
              effectiveTill: v === 'forever' ? '' : s.effectiveTill || nextMonth(),
            })
          }
          options={[
            { value: 'forever', label: 'Forever' },
            { value: 'date', label: 'Until a date' },
          ]}
        />
        {s.effectiveTill && (
          <InlineInput
            label="Effective till date"
            type="date"
            value={s.effectiveTill}
            onChange={(v) => set({ effectiveTill: v })}
          />
        )}
      </SettingRow>
      <SettingRow
        label="Notification period"
        description="Alert and escalation Email/SMS notifications will be sent only during the configured days and time slots."
      >
        <MultiSelectField
          label="Days"
          options={DAYS}
          value={s.days}
          allLabel="Every day"
          placeholder="Choose days…"
          onChange={(v) => set({ days: DAYS.map((d) => d.value).filter((d) => v.includes(d)) })}
        />
        {DAYS.filter((d) => s.days.includes(d.value)).map((d) => (
          <DisclosureRow
            key={d.value}
            title={d.label}
            badge="1 time slot"
            summary={slotText(s)}
            open={open === d.value}
            invalid={tried && s.start >= s.end}
            onToggle={() => setOpen(open === d.value ? null : d.value)}
          >
            <TimeRange
              label={`${d.label} time slot`}
              from={s.start}
              to={s.end}
              onChange={(from, to) => set({ start: from, end: to })}
            />
            <Note tone="grey">One time slot for now, the same on every chosen day.</Note>
          </DisclosureRow>
        ))}
      </SettingRow>
      <SettingRow label="Notification mode" description="How you want to be notified.">
        <Stack gap={16} wrap>
          <CheckboxField label="Push" checked={s.push} onChange={(v) => set({ push: v })} />
          <CheckboxField label="Email" checked={s.email} onChange={(v) => set({ email: v })} />
          <CheckboxField label="SMS" checked={s.sms} onChange={(v) => set({ sms: v })} />
        </Stack>
      </SettingRow>
      <SettingRow
        label="Escalation"
        description="Who is notified next if this alert is not handled."
      >
        <Stack gap={10} wrap>
          <HueChip hue={s.escalate ? 'green' : 'grey'}>
            {s.escalate ? `On · after ${s.escalateAfter} min` : 'Off'}
          </HueChip>
          <Button size="sm" variant="ghost" onClick={onEscalation}>
            Configure escalation →
          </Button>
        </Stack>
      </SettingRow>
    </Stack>
  );
}

const nextMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------- Escalation
export function EscalationTab({
  type,
  s,
  set,
  tried,
  vehicles,
  onSettings,
}: TabProps & { vehicles: number; onSettings: () => void }) {
  const first = `Initial alert · ${modeText(s.push, s.email, s.sms).toLowerCase()}`;
  return (
    <Stack dir="col" gap={12} align="stretch">
      <Card>
        <Stack justify="space-between" wrap>
          <Stack gap={12} wrap>
            <b>{type.name}</b>
            <HueChip hue={SEVERITY_HUE[s.severity]}>Severity: {s.severity}</HueChip>
            <span>
              {vehicles} vehicle{vehicles === 1 ? '' : 's'}
            </span>
            <span>{triggerText(type, s)}</span>
          </Stack>
          <Button size="sm" variant="ghost" onClick={onSettings}>
            Edit trigger
          </Button>
        </Stack>
      </Card>
      <StepChain
        label="Escalation levels"
        steps={[
          { key: '0', kicker: 'Level 0', text: first, hue: 'green' },
          ...(s.escalate
            ? [
                {
                  key: '1',
                  kicker: 'Level 1',
                  text: `After ${s.escalateAfter || '?'} min · ${s.escalateTo || 'no contact yet'}`,
                  hue: 'red' as const,
                },
              ]
            : []),
        ]}
      />
      <Note tone="grey">
        Escalation notifications follow the Notification period set in Settings. Notifications due
        outside it wait for the next allowed time, while the alert is still valid.
      </Note>
      {s.escalate ? (
        <Card
          icon="layers"
          title="Level 1"
          actions={
            <Switch
              label="Escalation on"
              checked
              showState
              onChange={() => set({ escalate: false })}
            />
          }
        >
          <SettingRow
            label="Escalate after"
            description="Minutes the alert stays unhandled before the next person is told."
            required
          >
            <InlineInput
              label="Escalate after"
              type="number"
              min={1}
              unit="minutes"
              value={s.escalateAfter}
              invalid={tried && !(Number(s.escalateAfter) >= 1)}
              onChange={(v) => set({ escalateAfter: v })}
            />
          </SettingRow>
          <SettingRow
            label="Escalate to"
            description="Email address or phone number of the person to tell."
            required
          >
            <InlineInput
              label="Escalate to"
              placeholder="name@company.com or +966 50 000 0000"
              value={s.escalateTo}
              invalid={tried && !s.escalateTo.trim()}
              onChange={(v) => set({ escalateTo: v })}
            />
          </SettingRow>
        </Card>
      ) : (
        <Card icon="layers" title="Escalation is off">
          <Stack dir="col" gap={10} align="start">
            <span>
              Only the first alert&apos;s people are told. Turn escalation on to tell one more
              person when this alert is not handled.
            </span>
            <Button variant="primary" onClick={() => set({ escalate: true })}>
              Turn on escalation
            </Button>
          </Stack>
        </Card>
      )}
      <Card title="What happens">
        <KeyValueList
          rows={[
            { label: '1. Triggered', value: "The alert's people are told and the alert opens." },
            {
              label: '2. Not handled',
              value: s.escalate
                ? `After ${s.escalateAfter || '?'} minutes the escalation contact is told.`
                : 'Nothing more happens (escalation is off).',
            },
            {
              label: '3. Recovered',
              value:
                'When the condition clears, the alert closes and a pending escalation is cancelled.',
            },
          ]}
        />
      </Card>
    </Stack>
  );
}

// ---------------------------------------------------------------- Review
export function ReviewTab({
  type,
  s,
  plates,
  replaced,
  results,
}: Pick<TabProps, 'type' | 's'> & {
  plates: string[];
  /** Vehicles that already have this alert (their rule is replaced). */
  replaced: string[];
  results: Check[];
}) {
  return (
    <Stack dir="col" gap={12} align="stretch">
      <KeyValueList
        icon="check"
        title={`Review · ${type.name}`}
        rows={[
          { label: 'Alert', value: [type.name, type.kind].filter(Boolean).join(' · ') },
          { label: 'Severity', value: s.severity },
          { label: 'Alert On/Off', value: s.enabled ? 'On' : 'Off' },
          { label: 'Vehicles', value: plates.length ? plates.join(', ') : 'None checked' },
          { label: 'Description', value: type.description },
          type.threshold
            ? {
                label: type.threshold.label,
                value: s.threshold.trim() ? `${s.threshold} ${type.threshold.unit}` : '—',
              }
            : { label: 'Alert Condition', value: type.condition ?? '—' },
          { label: 'Seconds to Ignore', value: s.ignore.trim() ? `${s.ignore} seconds` : '—' },
          {
            label: 'Interval',
            value: type.interval
              ? intervalText(s.intervalValue, s.intervalUnit).toLowerCase()
              : '—',
          },
          { label: 'Effective till', value: tillText(s.effectiveTill) },
          { label: 'Notification period', value: `${daysText(s.days)} · ${slotText(s)}` },
          { label: 'Notification mode', value: modeText(s.push, s.email, s.sms) },
          {
            label: 'Escalation',
            value: s.escalate ? `After ${s.escalateAfter} min to ${s.escalateTo || '—'}` : 'Off',
          },
        ]}
      />
      {replaced.length > 0 && (
        <Note>
          {replaced.join(', ')} already {replaced.length === 1 ? 'has' : 'have'} a {type.name} rule;
          it is replaced by this one.
        </Note>
      )}
      <CheckList
        title="Validation"
        items={results.map((r) => ({
          key: r.key,
          ok: r.ok,
          label: r.ok ? r.label : `${r.label}: ${r.why}`,
        }))}
      />
    </Stack>
  );
}
