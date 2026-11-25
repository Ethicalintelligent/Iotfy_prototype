// "Report Filters" side drawer: vehicles by group, period (day or date range with quick ranges),
// the report's own conditions and the time format. Same checks and texts as the original.
import { useMemo, useState, type FormEvent } from 'react';
import { Dropdown, ErrorState, Loading } from '../smart-track/kit';
import { addDays } from './dates';
import { initialParams, paramError, type Param } from './definitions';
import { Check, Drawer, FormField, FormSection, SearchBox, Segmented } from './ui';

export interface Scope {
  groups: { id: string; name: string; parentId: string | null }[];
  assets: { id: string; name: string; groupId: string | null }[];
}

export interface FilterValue {
  from: string;
  to: string;
  day: string;
  h24: boolean;
  /** null = all vehicles. */
  assets: string[] | null;
  params: Record<string, string>;
}

export const QUICK_RANGES = [
  { id: 'today', label: 'Today', days: (t: string) => [t, t] },
  { id: 'yesterday', label: 'Yesterday', days: (t: string) => [addDays(t, -1), addDays(t, -1)] },
  { id: '7d', label: 'Last 7 days', days: (t: string) => [addDays(t, -6), t] },
  { id: '30d', label: 'Last 30 days', days: (t: string) => [addDays(t, -29), t] },
];

const NO_GROUP = '__none';

/** Groups as a tree, in name order (as the original). */
function tree(groups: Scope['groups']) {
  const ids = new Set(groups.map((g) => g.id));
  const children = new Map<string | null, Scope['groups']>();
  for (const g of groups) {
    const parent = g.parentId && ids.has(g.parentId) ? g.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), g]);
  }
  const out: { g: Scope['groups'][number]; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) =>
    [...(children.get(parent) ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((g) => {
        out.push({ g, depth });
        walk(g.id, depth + 1);
      });
  walk(null, 0);
  return out;
}

function VehicleTree({
  scope,
  value,
  onChange,
  noun,
}: {
  scope: Scope;
  value: string[] | null;
  onChange: (v: string[] | null) => void;
  noun: { one: string; many: string };
}) {
  const [q, setQ] = useState('');
  const allIds = useMemo(() => scope.assets.map((a) => a.id), [scope.assets]);
  const picked = useMemo(() => new Set(value ?? allIds), [value, allIds]);
  const query = q.trim().toLowerCase();
  const groups = useMemo(() => {
    const byGroup = new Map<string, Scope['assets']>();
    for (const a of scope.assets) {
      const key = a.groupId && scope.groups.some((g) => g.id === a.groupId) ? a.groupId : NO_GROUP;
      byGroup.set(key, [...(byGroup.get(key) ?? []), a]);
    }
    const list = tree(scope.groups).map(({ g, depth }) => ({
      id: g.id,
      name: g.name,
      depth,
      assets: byGroup.get(g.id) ?? [],
    }));
    if (byGroup.has(NO_GROUP))
      list.push({ id: NO_GROUP, name: 'No group', depth: 0, assets: byGroup.get(NO_GROUP)! });
    return list
      .map((g) => {
        const hit = !query || g.name.toLowerCase().includes(query);
        return {
          ...g,
          shown: hit ? g.assets : g.assets.filter((a) => a.name.toLowerCase().includes(query)),
          hit,
        };
      })
      .filter((g) => (g.hit ? g.assets.length > 0 || !query : g.shown.length > 0));
  }, [scope, query]);
  const commit = (s: Set<string>) =>
    onChange(s.size === allIds.length ? null : allIds.filter((id) => s.has(id)));
  const set = (ids: string[], on: boolean) => {
    const s = new Set(picked);
    ids.forEach((id) => (on ? s.add(id) : s.delete(id)));
    commit(s);
  };
  if (!allIds.length)
    return <p className="gp-rtree__empty">No {noun.many.toLowerCase()} to report on.</p>;
  const summary =
    value === null
      ? `All groups & ${noun.many.toLowerCase()}`
      : `${value.length} of ${allIds.length} ${noun.many.toLowerCase()}`;
  return (
    <div className="gp-rtree">
      <div className="gp-rtree__bar">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder={`Search groups or ${noun.many.toLowerCase()}`}
        />
        <span className="gp-rtree__summary">{summary}</span>
      </div>
      <Check
        className="gp-rtree__all"
        checked={value === null}
        mixed={picked.size > 0}
        onChange={(on) => onChange(on ? null : [])}
      >
        Select all
      </Check>
      <ul className="gp-rtree__list">
        {groups.map((g) => {
          const ids = g.assets.map((a) => a.id);
          const n = ids.filter((id) => picked.has(id)).length;
          return (
            <li key={g.id} style={{ paddingLeft: g.depth * 16 }}>
              <Check
                className="gp-rtree__group"
                checked={ids.length > 0 && n === ids.length}
                mixed={n > 0}
                onChange={(on) => set(ids, on)}
              >
                <b>{g.name}</b>
                <em>{ids.length}</em>
              </Check>
              {g.shown.length > 0 && (
                <ul>
                  {g.shown.map((a) => (
                    <li key={a.id}>
                      <Check checked={picked.has(a.id)} onChange={(on) => set([a.id], on)}>
                        {a.name}
                      </Check>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FilterDrawer({
  value,
  onApply,
  onClose,
  scope,
  scopeError,
  onRetry,
  noun,
  singleDay,
  today,
  maxDays,
  reportLabel,
  paramDefs = [],
  noAssets,
  noDates,
}: {
  value: FilterValue;
  onApply: (v: FilterValue) => void;
  onClose: () => void;
  scope?: Scope;
  scopeError: Error | null;
  onRetry: () => void;
  noun: { one: string; many: string };
  singleDay: boolean;
  today: string;
  maxDays: number;
  reportLabel: string;
  paramDefs?: Param[];
  noAssets: boolean;
  noDates?: boolean;
}) {
  const [v, setV] = useState(value);
  const patch = (p: Partial<FilterValue>) => setV((x) => ({ ...x, ...p }));
  const days = (Date.parse(v.to) - Date.parse(v.from)) / 864e5 + 1;
  const dateError = noDates
    ? null
    : singleDay
      ? v.day > today
        ? 'The day is in the future.'
        : null
      : v.from > v.to
        ? 'The start is after the end.'
        : days > maxDays
          ? `Pick at most ${maxDays} days.`
          : v.to > today
            ? 'The end is in the future.'
            : null;
  const noneLeft = !noAssets && v.assets !== null && v.assets.length === 0;
  const errors = Object.fromEntries(
    paramDefs.map((p) => [p.key, paramError(p, v.params[p.key] ?? '', v.params)]),
  );
  const setParam = (key: string, val: string) =>
    setV((x) => ({ ...x, params: { ...x.params, [key]: val } }));
  const quick =
    QUICK_RANGES.find((r) => {
      const [a, b] = r.days(today);
      return a === v.from && b === v.to;
    })?.id ?? '';
  const pickQuick = (id: string) => {
    const r = QUICK_RANGES.find((x) => x.id === id);
    if (r) {
      const [from, to] = r.days(today);
      patch({ from, to });
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!dateError && !noneLeft && Object.values(errors).every((x) => !x)) onApply(v);
  };

  return (
    <Drawer
      title="Report Filters"
      subtitle={reportLabel}
      icon="Funnel"
      onClose={onClose}
      formId="gp-rpt-filters"
      submitLabel="Generate Report"
      onReset={() => setV({ ...value, assets: null, h24: false, params: initialParams(paramDefs) })}
    >
      <div className="td-form__scroll">
        <form id="gp-rpt-filters" className="td-form" onSubmit={submit} noValidate>
          {!noAssets && (
            <FormSection title={`Groups & ${noun.many}`} icon="Layers">
              <FormField
                label={`Pick ${noun.many.toLowerCase()} to report on`}
                error={noneLeft ? `Pick at least one ${noun.one.toLowerCase()}.` : null}
                group
              >
                {scopeError ? (
                  <ErrorState message={scopeError.message} onRetry={onRetry} />
                ) : scope ? (
                  <VehicleTree
                    scope={scope}
                    value={v.assets}
                    onChange={(a) => patch({ assets: a })}
                    noun={noun}
                  />
                ) : (
                  <Loading label={`Loading ${noun.many.toLowerCase()}…`} />
                )}
              </FormField>
            </FormSection>
          )}
          {!noDates && (
            <FormSection title={singleDay ? 'Day' : 'Date range'} icon="CalendarDays" cols={2}>
              {singleDay ? (
                <FormField label="Date" error={dateError}>
                  <input
                    type="date"
                    value={v.day}
                    max={today}
                    onChange={(e) => patch({ day: e.target.value })}
                  />
                </FormField>
              ) : (
                <>
                  <FormField label="Quick range" className="gp-rpt__quick" group>
                    <Segmented
                      label="Quick range"
                      value={quick}
                      onChange={pickQuick}
                      options={QUICK_RANGES.map(({ id, label }) => ({ id, label }))}
                    />
                  </FormField>
                  <FormField label="From date">
                    <input
                      type="date"
                      value={v.from}
                      max={v.to}
                      onChange={(e) => patch({ from: e.target.value })}
                    />
                  </FormField>
                  <FormField label="To date" error={dateError}>
                    <input
                      type="date"
                      value={v.to}
                      min={v.from}
                      max={today}
                      onChange={(e) => patch({ to: e.target.value })}
                    />
                  </FormField>
                </>
              )}
            </FormSection>
          )}
          {paramDefs.length > 0 && (
            <FormSection title="Report conditions" icon="SlidersHorizontal" cols={2}>
              {paramDefs.map((p) => (
                <FormField
                  key={p.key}
                  label={p.unit ? `${p.label} (${p.unit})` : p.label}
                  required={p.required}
                  error={errors[p.key]}
                >
                  {p.type === 'select' ? (
                    <Dropdown
                      block
                      className="td-ddl--field"
                      value={v.params[p.key] ?? ''}
                      onChange={(x) => setParam(p.key, x)}
                      aria-label={p.label}
                      placeholder={p.required ? undefined : (p.placeholder ?? 'Any')}
                      options={(p.options ?? []).map((o) => ({ value: o.id, label: o.label }))}
                    />
                  ) : (
                    <input
                      type={p.type === 'time' ? 'time' : 'number'}
                      min={p.type === 'number' ? 0 : undefined}
                      step="any"
                      placeholder={p.placeholder}
                      value={v.params[p.key] ?? ''}
                      onChange={(e) => setParam(p.key, e.target.value)}
                    />
                  )}
                </FormField>
              ))}
            </FormSection>
          )}
          <FormSection title="Time format" icon="Clock">
            <Segmented
              label="Time format"
              value={v.h24 ? '24h' : '12h'}
              onChange={(x) => patch({ h24: x === '24h' })}
              options={[
                { id: '12h', label: '12-hour' },
                { id: '24h', label: '24-hour' },
              ]}
            />
          </FormSection>
        </form>
      </div>
    </Drawer>
  );
}
