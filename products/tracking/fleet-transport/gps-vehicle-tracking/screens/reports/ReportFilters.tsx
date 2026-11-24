// The "Report Filters" panel (approved design): groups and vehicles, the period (a day or up to
// 31 days), the report's own conditions and the time format; Reset and Generate Report.
import { useState } from 'react';
import {
  Button,
  CheckTree,
  DateField,
  Drawer,
  Field,
  FormSection,
  FullRow,
  Note,
  SelectField,
  Stack,
  Tabs,
  TextField,
  type CheckTreeGroup,
} from '@iotify/ui';
import type { LiveVehicle } from '../../demo/fleet';
import {
  MAX_DAYS,
  QUICK_RANGES,
  iso,
  periodProblem,
  quickOf,
  quickPeriod,
  type Period,
  type QuickRange,
} from './data';
import type { ConditionContext, ReportDef } from './types';

export interface ReportFilter {
  /** Chosen vehicle ids; null = all of them. */
  vehicles: string[] | null;
  period: Period;
  /** Values of the report's conditions. */
  cond: Record<string, string>;
  hour12: boolean;
}

/** A report's conditions at their starting values. */
export const initialConditions = (def: ReportDef): Record<string, string> =>
  Object.fromEntries((def.conditions ?? []).map((c) => [c.key, c.initial ?? '']));

/** The filters a report opens with: every vehicle, yesterday, 12-hour times. */
export const initialFilter = (def: ReportDef, now: Date): ReportFilter => ({
  vehicles: null,
  period: quickPeriod('yesterday', now),
  cond: initialConditions(def),
  hour12: true,
});

/** How many filters differ from the starting ones (the badge on the filter button). */
export function changedFilters(def: ReportDef, f: ReportFilter, now: Date): number {
  const start = initialFilter(def, now);
  let n = 0;
  if (def.subject === 'vehicles' && f.vehicles) n++;
  if (!def.current && (f.period.from !== start.period.from || f.period.to !== start.period.to)) n++;
  for (const c of def.conditions ?? [])
    if ((f.cond[c.key] ?? '') !== (start.cond[c.key] ?? '')) n++;
  if (!f.hour12) n++;
  return n;
}

const NO_GROUP = 'No group';

export function ReportFilters({
  def,
  value,
  vehicles,
  context,
  now,
  onApply,
  onClose,
}: {
  def: ReportDef;
  value: ReportFilter;
  /** The company's vehicles (to pick from). */
  vehicles: LiveVehicle[];
  context: ConditionContext;
  now: Date;
  onApply: (f: ReportFilter) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ReportFilter>(value);
  const set = (p: Partial<ReportFilter>) => setDraft((d) => ({ ...d, ...p }));
  const all = vehicles.map((v) => v.id);
  const chosen = new Set(draft.vehicles ?? all);
  const groups: CheckTreeGroup[] = [...new Set(vehicles.map((v) => v.group ?? NO_GROUP))]
    .sort((a, b) => (a === NO_GROUP ? 1 : b === NO_GROUP ? -1 : a.localeCompare(b)))
    .map((g) => ({
      key: g,
      label: g,
      items: vehicles
        .filter((v) => (v.group ?? NO_GROUP) === g)
        .map((v) => ({
          key: v.id,
          label: v.callSign,
          detail: v.plate !== v.callSign ? v.plate : undefined,
        })),
    }));
  const problem = def.current ? null : periodProblem(draft.period, now);
  const noVehicles = def.subject === 'vehicles' && chosen.size === 0;
  const quick = quickOf(draft.period, now) ?? 'custom';
  const today = iso(now);

  return (
    <Drawer
      open
      onClose={onClose}
      title="Report Filters"
      subtitle={def.label}
      icon="filter"
      width={540}
      notice={
        problem || noVehicles ? (
          <Note tone="red">{problem ?? 'Pick at least one vehicle.'}</Note>
        ) : undefined
      }
      footer={
        <>
          <Button onClick={() => setDraft({ ...draft, ...initialFilter(def, now) })}>Reset</Button>
          <Button
            variant="primary"
            disabled={!!problem || noVehicles}
            onClick={() => onApply(draft)}
          >
            Generate Report
          </Button>
        </>
      }
    >
      {def.subject === 'vehicles' && (
        <FormSection
          title="Groups & Vehicles"
          icon="vehicles"
          cols={1}
          actions={
            <Stack gap={6}>
              <Button size="sm" variant="ghost" onClick={() => set({ vehicles: null })}>
                Select all
              </Button>
              <Button size="sm" variant="ghost" onClick={() => set({ vehicles: [] })}>
                Clear
              </Button>
            </Stack>
          }
        >
          <CheckTree
            label="Pick vehicles to report on"
            searchPlaceholder="Search groups or vehicles"
            groups={groups}
            selected={chosen}
            onChange={(keys) => set({ vehicles: keys.size === all.length ? null : [...keys] })}
          />
        </FormSection>
      )}
      {!def.current && (
        <FormSection title="Date range" icon="calendar" cols={2}>
          <FullRow>
            <Field label="Quick range">
              <Tabs<QuickRange | 'custom'>
                label="Quick range"
                tabs={QUICK_RANGES}
                value={quick}
                onChange={(k) => k !== 'custom' && set({ period: quickPeriod(k, now) })}
              />
            </Field>
          </FullRow>
          <DateField
            label="From date"
            value={draft.period.from}
            max={today}
            onChange={(from) => set({ period: { ...draft.period, from } })}
          />
          <DateField
            label="To date"
            value={draft.period.to}
            min={draft.period.from}
            max={today}
            hint={`Up to ${MAX_DAYS} days.`}
            onChange={(to) => set({ period: { ...draft.period, to } })}
          />
        </FormSection>
      )}
      {!!def.conditions?.length && (
        <FormSection title="Report conditions" icon="sliders" cols={2}>
          {def.conditions.map((c) =>
            c.kind === 'select' ? (
              <SelectField
                key={c.key}
                label={c.label}
                value={draft.cond[c.key] ?? ''}
                placeholder="Any"
                options={c.options?.(context) ?? []}
                onChange={(v) => set({ cond: { ...draft.cond, [c.key]: v } })}
              />
            ) : (
              <TextField
                key={c.key}
                label={c.label}
                type="number"
                value={draft.cond[c.key] ?? ''}
                placeholder={c.placeholder}
                onChange={(v) => set({ cond: { ...draft.cond, [c.key]: v } })}
              />
            ),
          )}
        </FormSection>
      )}
      <FormSection title="Time format" icon="clock" cols={1}>
        <Tabs<'12' | '24'>
          label="Time format"
          tabs={[
            { key: '12', label: '12-hour' },
            { key: '24', label: '24-hour' },
          ]}
          value={draft.hour12 ? '12' : '24'}
          onChange={(k) => set({ hour12: k === '12' })}
        />
      </FormSection>
    </Drawer>
  );
}
