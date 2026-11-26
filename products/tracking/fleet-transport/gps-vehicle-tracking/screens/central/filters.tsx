// IT-0036. The two filter pop-ups of the original page: "Vehicle Filters" (live, original: HH) and
// "History Filter" (replay, original: mJ with its date-range calendar lJ/cJ/uJ).
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Dropdown, Icon, usePortalRoot } from '../smart-track/kit';
import { addDays, isoDay, MAX_DAYS } from './analysis';
import type { Row } from './fleet';
import { CheckTree, inFloating, MultiSelect, SearchBox, type TreeGroup } from './parts';
import { MAX_PICKED } from './tiles';

/* ------------------------------------------------------------------ vehicle filters (live) */

type FieldId = 'manager' | 'supervisor' | 'operator' | 'type';
const FIELDS: { id: FieldId; label: string; icon: string; placeholder: string }[] = [
  { id: 'manager', label: 'Fleet Manager', icon: 'Network', placeholder: 'Select Fleet Manager' },
  { id: 'supervisor', label: 'Supervisor', icon: 'Users', placeholder: 'Select Supervisor' },
  {
    id: 'operator',
    label: 'Vehicle Operator',
    icon: 'UserRound',
    placeholder: 'Select Vehicle Operator',
  },
  { id: 'type', label: 'Vehicle Type', icon: 'Box', placeholder: 'Select Vehicle Type' },
];
export type FieldValues = Partial<Record<FieldId, string[]>>;

const attrsOf = (r: Row): Record<FieldId, string> => ({
  manager: r.vehicle.manager,
  supervisor: r.vehicle.supervisor,
  operator: r.vehicle.operator?.name.trim() ?? '',
  type: r.vehicle.typeLabel,
});
const sorted = (v: string[]) =>
  [...new Set(v.filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

/** Closes on Escape and on clicks outside the panel and its anchor (not inside floating menus). */
function useDismiss(panel: RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const down = (e: MouseEvent) => {
      if (
        panel.current &&
        !panel.current.parentNode?.contains(e.target as Node) &&
        !inFloating(e.target)
      )
        onClose();
    };
    window.addEventListener('keydown', key);
    document.addEventListener('mousedown', down);
    return () => {
      window.removeEventListener('keydown', key);
      document.removeEventListener('mousedown', down);
    };
  }, [panel, onClose]);
}

export function VehicleFilter({
  rows,
  value,
  onApply,
  onClose,
}: {
  rows: Row[];
  value: { fields: FieldValues; ids: string[] | null };
  onApply: (v: { fields: FieldValues; ids: string[] | null }) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [fields, setFields] = useState<FieldValues>(value.fields);
  // IT-0057: up to MAX_PICKED vehicles can be ticked; none ticked shows every vehicle.
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set((value.ids ?? []).slice(0, MAX_PICKED)),
  );
  useDismiss(panel, onClose);
  const options = useMemo(() => {
    const out = {} as Record<FieldId, string[]>;
    for (const f of FIELDS) out[f.id] = sorted(rows.map((r) => attrsOf(r)[f.id]));
    return out;
  }, [rows]);
  const passing = useMemo(
    () =>
      rows.filter((r) =>
        Object.entries(fields).every(
          ([k, v]) => !v?.length || v.includes(attrsOf(r)[k as FieldId] ?? ''),
        ),
      ),
    [rows, fields],
  );
  const hasGroups = rows.some((r) => r.vehicle.group);
  const groups: TreeGroup[] = useMemo(() => {
    const m = new Map<string, { id: string; label: string }[]>();
    for (const r of passing) {
      const g = (hasGroups ? r.vehicle.group || 'Ungrouped' : '') || 'All vehicles';
      m.set(g, [...(m.get(g) ?? []), { id: r.id, label: r.vehicle.code || r.name }]);
    }
    return [...m.entries()]
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([g, items]) => ({ id: g, label: g, items }));
  }, [passing, hasGroups]);
  const selected = picked;
  const chosen = passing.filter((r) => selected.has(r.id)).map((r) => r.id);
  const anyField = Object.values(fields).some((v) => v?.length);
  const submit = () => {
    onApply({ fields, ids: chosen.length ? chosen : null });
    onClose();
  };
  return (
    <div ref={panel} className="mt-vf" role="dialog" aria-labelledby="mt-vf-title">
      <div className="mt-vf__head">
        <h3 id="mt-vf-title">Vehicle Filters</h3>
        <button type="button" className="mt-vf__close" aria-label="Close filters" onClick={onClose}>
          <Icon name="X" size={15} />
        </button>
      </div>
      <form
        className="mt-vf__body"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="mt-vf__fields">
          {FIELDS.map((f) => (
            <div key={f.id} className="mt-vf__row">
              <span className="mt-vf__icon" aria-hidden="true">
                <Icon name={f.icon} size={16} />
              </span>
              <label htmlFor={`mt-vf-${f.id}`}>{f.label}</label>
              <MultiSelect
                id={`mt-vf-${f.id}`}
                value={fields[f.id] ?? []}
                placeholder={f.placeholder}
                searchPlaceholder={`Search ${f.label.toLowerCase()}...`}
                aria-label={f.label}
                disabled={!options[f.id].length}
                title={
                  options[f.id].length ? undefined : `No ${f.label.toLowerCase()} recorded yet`
                }
                onChange={(v) => setFields((x) => ({ ...x, [f.id]: v }))}
                options={options[f.id].map((o) => ({ value: o, label: o }))}
              />
            </div>
          ))}
        </div>
        <CheckTree
          id="mt-vf-pick"
          className="mt-vf__tree"
          label="Vehicles"
          placeholder="Search vehicles..."
          groups={groups}
          selected={selected}
          max={MAX_PICKED}
          onChange={setPicked}
        />
        <div className="mt-vf__foot">
          <p className="mt-vf__note" role="status">
            {chosen.length
              ? `${chosen.length} of ${MAX_PICKED} vehicles selected`
              : anyField
                ? `Select up to ${MAX_PICKED} vehicles`
                : `All vehicles · select up to ${MAX_PICKED}`}
          </p>
          <div className="mt-vf__actions">
            <button
              type="button"
              className="td-btn td-btn--ghost"
              onClick={() => {
                setFields({});
                setPicked(new Set());
              }}
            >
              Reset
            </button>
            <button
              type="submit"
              className="td-btn td-btn--primary"
              disabled={anyField && !chosen.length}
            >
              Submit
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ date range calendar */

const PRESETS = [
  { id: 'TODAY', label: 'Today' },
  { id: 'YESTERDAY', label: 'Yesterday' },
  { id: 'WEEK', label: 'Last 7 days' },
];
const presetDays = (id: string, today: string) =>
  id === 'TODAY'
    ? { from: today, to: today }
    : id === 'YESTERDAY'
      ? { from: addDays(today, -1), to: addDays(today, -1) }
      : id === 'WEEK'
        ? { from: addDays(today, -6), to: today }
        : undefined;
const presetOf = (from: string, to: string, today: string) =>
  PRESETS.find((p) => {
    const d = presetDays(p.id, today)!;
    return d.from === from && d.to === to;
  })?.id ?? 'custom';

interface Range {
  range: string;
  from: string;
  to: string;
}
const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const POP_W = 300;
const pad = (n: number) => String(n).padStart(2, '0');
function dayLabel(d: string) {
  const [y = 0, m = 1, dd = 1] = d.split('-').map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
function rangeLabel(v: Range) {
  if (v.range !== 'custom')
    return PRESETS.find((p) => p.id === v.range)?.label ?? 'Select date range';
  if (v.from && v.to)
    return v.from === v.to ? dayLabel(v.from) : `${dayLabel(v.from)} – ${dayLabel(v.to)}`;
  if (v.from) return `From ${dayLabel(v.from)}`;
  if (v.to) return `Until ${dayLabel(v.to)}`;
  return 'Select date range';
}

function RangeEditor({
  id,
  value,
  today,
  onChange,
  onDone,
}: {
  id: string;
  value: Range;
  today: string;
  onChange: (v: Range) => void;
  onDone: () => void;
}) {
  const custom = value.range === 'custom';
  const cur = custom
    ? { from: value.from, to: value.to }
    : (presetDays(value.range, today) ?? { from: '', to: '' });
  const [field, setField] = useState<'from' | 'to' | null>(null);
  const fromBtn = useRef<HTMLButtonElement>(null);
  const toBtn = useRef<HTMLButtonElement>(null);
  const span = cur.from && cur.to ? (Date.parse(cur.to) - Date.parse(cur.from)) / 864e5 : 0;
  const tooLong = custom && span >= MAX_DAYS;
  const pick = (d: string) => {
    if (field === 'from') {
      const to = cur.to && cur.to >= d ? cur.to : '';
      onChange({ range: 'custom', from: d, to });
      setField(to ? null : 'to');
    } else {
      onChange({ range: 'custom', from: cur.from || d, to: d });
      setField(null);
    }
  };
  const clear = () => {
    const v = field === 'from' ? { from: '', to: cur.to } : { from: cur.from, to: '' };
    onChange(v.from || v.to ? { range: 'custom', ...v } : { range: 'TODAY', from: '', to: '' });
  };
  const box = (k: 'from' | 'to', label: string, ref: RefObject<HTMLButtonElement>) => (
    <div className="td-cal__end">
      <span className="td-afilter__label" id={`${id}-${k}-l`}>
        {label}
      </span>
      <button
        ref={ref}
        type="button"
        id={`${id}-${k}`}
        className={`td-cal__box ${field === k ? 'is-on' : ''} ${cur[k] ? '' : 'is-empty'}`}
        aria-labelledby={`${id}-${k}-l ${id}-${k}`}
        aria-haspopup="dialog"
        aria-expanded={field === k}
        onClick={() => setField((f) => (f === k ? null : k))}
      >
        <Icon name="CalendarDays" size={14} />
        <span>{cur[k] ? dayLabel(cur[k]) : 'dd/mm/yyyy'}</span>
      </button>
    </div>
  );
  return (
    <div
      id={id}
      className="td-cal"
      role="group"
      aria-label="Date range"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && field) {
          e.stopPropagation();
          setField(null);
        }
      }}
    >
      <div className="td-cal__presets">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`td-cal__preset ${value.range === p.id ? 'is-on' : ''}`}
            aria-pressed={value.range === p.id}
            onClick={() => {
              setField(null);
              onChange({ range: p.id, from: '', to: '' });
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="td-cal__ends">
        {box('from', 'From Date', fromBtn)}
        {box('to', 'To Date', toBtn)}
      </div>
      {tooLong && (
        <p className="td-cal__hint is-warn" role="status">
          Choose up to {MAX_DAYS} days
        </p>
      )}
      {field && (
        <MonthPop
          key={field}
          anchor={field === 'from' ? fromBtn : toBtn}
          field={field}
          from={cur.from}
          to={cur.to}
          today={today}
          tooLong={tooLong}
          onPick={pick}
          onClear={clear}
          onDone={() => {
            setField(null);
            if (cur.from && cur.to) onDone();
          }}
          onClose={() => setField(null)}
        />
      )}
    </div>
  );
}

function MonthPop({
  anchor,
  field,
  from,
  to,
  today,
  tooLong,
  onPick,
  onClear,
  onDone,
  onClose,
}: {
  anchor: RefObject<HTMLButtonElement>;
  field: 'from' | 'to';
  from: string;
  to: string;
  today: string;
  tooLong: boolean;
  onPick: (d: string) => void;
  onClear: () => void;
  onDone: () => void;
  onClose: () => void;
}) {
  const portal = usePortalRoot();
  const pop = useRef<HTMLDivElement>(null);
  const [month, setMonth] = useState(() =>
    ((field === 'from' ? from || to : to || from) || today).slice(0, 7),
  );
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [y = 0, m = 1] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(y, m, 0).getDate();
  const go = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };
  const max = field === 'from' && to && to < today ? to : today;
  const min = field === 'to' ? from : '';
  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current;
      if (!a || !pop.current) return;
      const r = a.getBoundingClientRect();
      const h = pop.current.offsetHeight;
      const w = Math.min(POP_W, window.innerWidth - 16);
      const below = r.bottom + 6;
      const top =
        below + h > window.innerHeight - 8 && r.top - 6 - h >= 8
          ? r.top - 6 - h
          : Math.max(8, Math.min(below, window.innerHeight - h - 8));
      setPos({ top, left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor, month, portal]);
  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!pop.current?.contains(t) && !anchor.current?.contains(t)) onClose();
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [anchor, onClose]);
  const placed = pos !== null;
  useEffect(() => {
    if (placed)
      pop.current
        ?.querySelector<HTMLButtonElement>(
          '.td-cal__day.is-picked:not(:disabled), .td-cal__day:not(:disabled)',
        )
        ?.focus({ preventScroll: true });
  }, [placed]);
  const cells = [];
  for (let i = 0; i < lead; i++)
    cells.push(<span key={`lead-${i}`} className="td-cal__cell" aria-hidden="true" />);
  for (let d = 1; d <= days; d++) {
    const iso = `${month}-${pad(d)}`;
    const end = iso === from || iso === to;
    const band = !!(from && to && from !== to && iso >= from && iso <= to);
    const col = (lead + d - 1) % 7;
    const cls = [
      'td-cal__cell',
      band && 'is-band',
      band && (iso === from || col === 0 || d === 1) && 'is-band-start',
      band && (iso === to || col === 6 || d === days) && 'is-band-end',
    ];
    cells.push(
      <span key={iso} className={cls.filter(Boolean).join(' ')}>
        <button
          type="button"
          className={`td-cal__day ${end ? 'is-end' : ''} ${iso === (field === 'from' ? from : to) ? 'is-picked' : ''} ${iso === today ? 'is-today' : ''}`}
          disabled={iso > max || (min !== '' && iso < min)}
          aria-pressed={end}
          aria-label={dayLabel(iso)}
          onClick={() => onPick(iso)}
        >
          {d}
        </button>
      </span>,
    );
  }
  if (!portal) return null;
  return createPortal(
    <div
      ref={pop}
      className="td-cal-pop td-pop__menu--float"
      role="dialog"
      aria-label={field === 'from' ? 'Choose the From date' : 'Choose the To date'}
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: Math.min(POP_W, window.innerWidth - 16),
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="td-cal__head">
        <button
          type="button"
          className="td-cal__nav"
          aria-label="Previous month"
          onClick={() => go(-1)}
        >
          <Icon name="ChevronLeft" size={15} />
        </button>
        <strong>{first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</strong>
        <button
          type="button"
          className="td-cal__nav"
          aria-label="Next month"
          disabled={month >= today.slice(0, 7)}
          onClick={() => go(1)}
        >
          <Icon name="ChevronRight" size={15} />
        </button>
      </div>
      <div className="td-cal__grid">
        {DOW.map((d) => (
          <span key={d} className="td-cal__dow">
            {d}
          </span>
        ))}
        {cells}
      </div>
      <div className="td-cal__foot">
        <span className={`td-cal__hint ${tooLong ? 'is-warn' : ''}`} role="status">
          {tooLong
            ? `Choose up to ${MAX_DAYS} days`
            : field === 'from'
              ? 'Select start date'
              : 'Select end date'}
        </span>
        <button type="button" className="td-btn td-btn--ghost" onClick={onClear}>
          Clear
        </button>
        <button type="button" className="td-btn td-btn--primary" onClick={onDone}>
          Done
        </button>
      </div>
    </div>,
    portal,
  );
}

/* ------------------------------------------------------------------ history filter */

export const STOP_LIMITS = [5, 10, 15, 20, 30, 60];
export const DEFAULT_STATUSES = ['stopped', 'overspeed'];
const MARKS = [
  { id: 'stopped', label: 'Stopped', tone: 'red' },
  { id: 'idle', label: 'Idle', tone: 'blue' },
  { id: 'overspeed', label: 'Overspeed', tone: 'orange' },
];
export interface HistoryValue {
  ids: string[];
  from: string;
  to: string;
  stopLimit: number;
  statuses: string[];
}

export function HistoryFilter({
  value,
  rows,
  onApply,
  onClose,
}: {
  value: HistoryValue;
  rows: Row[];
  onApply: (v: HistoryValue) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const today = isoDay(new Date());
  const [ids, setIds] = useState(value.ids);
  const [range, setRange] = useState<Range>(() => {
    const p = presetOf(value.from, value.to, today);
    return p === 'custom'
      ? { range: 'custom', from: value.from, to: value.to }
      : { range: p, from: '', to: '' };
  });
  const [calOpen, setCalOpen] = useState(false);
  const [stopLimit, setStopLimit] = useState(value.stopLimit);
  const [statuses, setStatuses] = useState(value.statuses);
  const [q, setQ] = useState('');
  useDismiss(panel, onClose);
  const days =
    range.range === 'custom' ? { from: range.from, to: range.to } : presetDays(range.range, today)!;
  const span = days.from && days.to ? (Date.parse(days.to) - Date.parse(days.from)) / 864e5 : 0;
  const bad = !days.from || !days.to || days.from > days.to || days.to > today || span >= MAX_DAYS;
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) => !needle || `${r.name} ${r.vehicle.code ?? ''}`.toLowerCase().includes(needle),
  );
  const full = ids.length >= MAX_PICKED;
  const toggle = (id: string) =>
    setIds((x) =>
      x.includes(id) ? x.filter((y) => y !== id) : x.length < MAX_PICKED ? [...x, id] : x,
    );
  return (
    <div ref={panel} className="td-afilter mt-hf" role="dialog" aria-label="History filter">
      <div className="mt-hf__head">
        <strong>
          <Icon name="Funnel" size={14} />
          History Filter
        </strong>
        <button
          type="button"
          className="mt-icon-btn mt-icon-btn--sm"
          aria-label="Close filter"
          onClick={onClose}
        >
          <Icon name="X" size={12} />
        </button>
      </div>
      <div className="mt-hf__cols">
        <div className="mt-hf__col">
          <span className="td-afilter__label">
            Vehicles{' '}
            <small>
              {ids.length} of {MAX_PICKED}
            </small>
          </span>
          <SearchBox
            id="mt-hf-q"
            value={q}
            onChange={setQ}
            placeholder="Search vehicle or plate…"
          />
          <div className="mt-hf__list" role="group" aria-label="Vehicles">
            {shown.map((r) => {
              const on = ids.includes(r.id);
              return (
                <label
                  key={r.id}
                  className={`td-check ${!on && full ? 'is-disabled' : ''}`}
                  title={!on && full ? `Up to ${MAX_PICKED} vehicles` : undefined}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={!on && full}
                    onChange={() => toggle(r.id)}
                  />
                  <bdi>{r.vehicle.code || r.name}</bdi>
                  <i className={`td-dot tone-${r.status.tone}`} aria-hidden="true" />
                </label>
              );
            })}
            {!shown.length && <p className="td-afilter__none">No vehicles match the search.</p>}
          </div>
        </div>
        <div className="mt-hf__col">
          <div className="td-afilter__field">
            <span className="td-afilter__label" id="mt-hf-date-l">
              Date
            </span>
            <button
              type="button"
              id="mt-hf-date"
              className={`td-cal__trigger ${range.range === 'custom' && !range.from ? 'is-empty' : ''}`}
              aria-labelledby="mt-hf-date-l mt-hf-date"
              aria-expanded={calOpen}
              aria-controls="mt-hf-cal"
              onClick={() => setCalOpen((o) => !o)}
            >
              <Icon name="CalendarDays" size={15} />
              <span>{rangeLabel(range)}</span>
              <Icon name="ChevronDown" size={15} />
            </button>
          </div>
          {calOpen && (
            <RangeEditor
              id="mt-hf-cal"
              value={range}
              today={today}
              onChange={setRange}
              onDone={() => setCalOpen(false)}
            />
          )}
          <div className="td-afilter__field">
            <span className="td-afilter__label">Stop limit</span>
            <Dropdown
              id="mt-hf-stop"
              icon="Timer"
              aria-label="Stop limit"
              value={String(stopLimit)}
              onChange={(v) => setStopLimit(Number(v))}
              options={STOP_LIMITS.map((n) => ({ value: String(n), label: `${n} min` }))}
            />
          </div>
          <div className="td-afilter__field">
            <span className="td-afilter__label">Show on the map</span>
            <div className="mt-hf__statuses">
              {MARKS.map((s) => {
                const on = statuses.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`mt-hf__status tone-${s.tone} ${on ? 'is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() =>
                      setStatuses((x) => (on ? x.filter((y) => y !== s.id) : [...x, s.id]))
                    }
                  >
                    <i className="td-dot" aria-hidden="true" />
                    {s.label}
                  </button>
                );
              })}
            </div>
            <small className="mt-hf__note">
              Stops and idle spots shorter than the stop limit are not marked.
            </small>
          </div>
        </div>
      </div>
      <div className="td-afilter__actions">
        <button
          type="button"
          className="td-btn td-btn--ghost"
          onClick={() =>
            onApply({ ids: [], from: today, to: today, stopLimit: 10, statuses: DEFAULT_STATUSES })
          }
        >
          Reset
        </button>
        <button
          type="button"
          className="td-btn td-btn--primary"
          disabled={!ids.length || bad}
          title={
            ids.length
              ? bad
                ? `Choose up to ${MAX_DAYS} days`
                : undefined
              : 'Pick at least one vehicle'
          }
          onClick={() => onApply({ ids, from: days.from, to: days.to, stopLimit, statuses })}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
