// The Alerts page's filter pop-up (Date, Operator, Vehicle and Alert Name), rebuilt from the
// original with the same markup: date presets with a From/To calendar, and two checklists.
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Dropdown, Icon, usePortalRoot } from '../smart-track/kit';
import { addDays, formatDay, lastMonth, pad2, startOfDay, today } from './time';

/* ------------------------------------------------------------------ filter value */

export const CUSTOM = 'custom';
export const LONGEST_DAYS = 31;

export interface AlertFilter {
  range: string;
  from: string;
  to: string;
  operator: string;
  vins: Set<string> | null;
  types: Set<string> | null;
}
export const DEFAULT_FILTER: AlertFilter = {
  range: 'TODAY',
  from: '',
  to: '',
  operator: '',
  vins: null,
  types: null,
};

export const PRESETS = [
  { id: 'TODAY', label: 'Today' },
  { id: 'YESTERDAY', label: 'Yesterday' },
  { id: 'WEEK', label: 'Last 7 days' },
  { id: 'MONTH', label: 'Last 30 days' },
  { id: 'LAST_MONTH', label: 'Last month' },
];
const PRESET_DAYS: Record<string, [number, number]> = {
  TODAY: [0, 0],
  YESTERDAY: [-1, -1],
  WEEK: [-6, 0],
  MONTH: [-29, 0],
};

function presetDays(id: string, day = today()) {
  if (id === 'LAST_MONTH') return lastMonth(day);
  const d = PRESET_DAYS[id];
  return d ? { from: addDays(day, d[0]), to: addDays(day, d[1]) } : null;
}

/** The time window a filter asks for. */
export function windowOf(f: AlertFilter): { from: Date; to: Date } {
  if (f.range === CUSTOM) {
    const to = startOfDay(addDays(f.to, 1));
    return { from: startOfDay(f.from), to: new Date(Math.min(to.getTime(), Date.now())) };
  }
  if (f.range === 'LAST_MONTH') {
    const m = lastMonth(today());
    return { from: startOfDay(m.from), to: startOfDay(addDays(m.to, 1)) };
  }
  const t = today();
  const back = (n: number) => startOfDay(addDays(t, -n));
  const now = new Date();
  switch (f.range) {
    case 'YESTERDAY':
      return { from: back(1), to: back(0) };
    case 'WEEK':
      return { from: back(6), to: now };
    case 'MONTH':
      return { from: back(29), to: now };
    default:
      return { from: back(0), to: now };
  }
}

/** The pop-up closes on outside clicks, but not on clicks in its floating menus (dropdown, calendar). */
const FLOAT = 'td-pop__menu--float';
const inFloatingMenu = (t: EventTarget | null) =>
  t instanceof Element && t.closest(`.${FLOAT}`) !== null;

/* ------------------------------------------------------------------ small parts */

export function SearchBox({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="td-gv__search">
      <Icon name="Search" size={15} />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  );
}

function Check({
  checked,
  mixed,
  onChange,
  className = '',
  children,
}: {
  checked: boolean;
  mixed?: boolean;
  onChange: (v: boolean) => void;
  className?: string;
  children: ReactNode;
}) {
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (box.current) box.current.indeterminate = !!mixed && !checked;
  }, [mixed, checked]);
  return (
    <label className={`td-check ${className}`}>
      <input
        ref={box}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

interface Item {
  id: string;
  label: string;
}

/** A searchable checklist with "Select All" (the original's tree list, used without groups here). */
function Checklist({
  id,
  label,
  placeholder,
  items,
  selected,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  items: Item[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
  const shownIds = shown.map((i) => i.id);
  const picked = (ids: string[]) => ids.filter((x) => selected.has(x)).length;
  const set = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    ids.forEach((x) => (on ? next.add(x) : next.delete(x)));
    onChange(next);
  };
  const pickedShown = picked(shownIds);
  return (
    <fieldset className="td-afilter__field td-afilter__tree ">
      <legend>{label}</legend>
      <SearchBox id={`${id}-q`} value={query} onChange={setQuery} placeholder={placeholder} />
      <div className="td-afilter__list">
        {shownIds.length > 0 && (
          <Check
            className="is-all"
            checked={pickedShown === shownIds.length}
            mixed={pickedShown > 0}
            onChange={(on) => set(shownIds, on)}
          >
            <b>Select All</b>
          </Check>
        )}
        {shown.length > 0 && (
          <div>
            {shown.map((i) => (
              <Check key={i.id} checked={selected.has(i.id)} onChange={(on) => set([i.id], on)}>
                {i.label}
              </Check>
            ))}
          </div>
        )}
        {!shownIds.length && (
          <p className="td-afilter__none">
            {q ? `Nothing matches “${query}”.` : 'Nothing to choose from.'}
          </p>
        )}
      </div>
      {items.length > 0 && picked(items.map((i) => i.id)) === 0 && (
        <small className="td-afilter__warn">Pick at least one.</small>
      )}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ date range */

type Range = Pick<AlertFilter, 'range' | 'from' | 'to'>;

function rangeLabel(v: Range): string {
  if (v.range !== CUSTOM)
    return PRESETS.find((p) => p.id === v.range)?.label ?? 'Select date range';
  if (v.from && v.to)
    return v.from === v.to ? formatDay(v.from) : `${formatDay(v.from)} – ${formatDay(v.to)}`;
  if (v.from) return `From ${formatDay(v.from)}`;
  if (v.to) return `Until ${formatDay(v.to)}`;
  return 'Select date range';
}

function DateRange({
  id,
  value,
  onChange,
  onDone,
}: {
  id: string;
  value: Range;
  onChange: (r: Range) => void;
  onDone: () => void;
}) {
  const now = today();
  const custom = value.range === CUSTOM;
  const days = custom
    ? { from: value.from, to: value.to }
    : (presetDays(value.range, now) ?? { from: '', to: '' });
  const [field, setField] = useState<'from' | 'to' | null>(null);
  const fromRef = useRef<HTMLButtonElement>(null);
  const toRef = useRef<HTMLButtonElement>(null);
  const span =
    days.from && days.to ? (Date.parse(days.to) - Date.parse(days.from)) / 86_400_000 : 0;
  const tooLong = custom && span >= LONGEST_DAYS;

  const pick = (day: string) => {
    if (field === 'from') {
      const to = days.to && days.to >= day ? days.to : '';
      onChange({ range: CUSTOM, from: day, to });
      setField(to ? null : 'to');
    } else {
      onChange({ range: CUSTOM, from: days.from || day, to: day });
      setField(null);
    }
  };
  const clear = () => {
    const next = field === 'from' ? { from: '', to: days.to } : { from: days.from, to: '' };
    onChange(
      next.from || next.to
        ? { range: CUSTOM, ...next }
        : { range: DEFAULT_FILTER.range, from: '', to: '' },
    );
  };
  const done = () => {
    setField(null);
    if (days.from && days.to) onDone();
  };

  const end = (which: 'from' | 'to', label: string, ref: RefObject<HTMLButtonElement>) => {
    const v = days[which];
    return (
      <div className="td-cal__end">
        <span className="td-afilter__label" id={`${id}-${which}-l`}>
          {label}
        </span>
        <button
          ref={ref}
          type="button"
          id={`${id}-${which}`}
          className={`td-cal__box ${field === which ? 'is-on' : ''} ${v ? '' : 'is-empty'}`}
          aria-labelledby={`${id}-${which}-l ${id}-${which}`}
          aria-haspopup="dialog"
          aria-expanded={field === which}
          onClick={() => setField((f) => (f === which ? null : which))}
        >
          <Icon name="CalendarDays" size={14} />
          <span>{v ? formatDay(v) : 'dd/mm/yyyy'}</span>
        </button>
      </div>
    );
  };

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
        {end('from', 'From Date', fromRef)}
        {end('to', 'To Date', toRef)}
      </div>
      {tooLong && (
        <p className="td-cal__hint is-warn" role="status">
          Choose up to {LONGEST_DAYS} days
        </p>
      )}
      {field && (
        <Calendar
          key={field}
          anchor={field === 'from' ? fromRef : toRef}
          field={field}
          from={days.from}
          to={days.to}
          today={now}
          tooLong={tooLong}
          onPick={pick}
          onClear={clear}
          onDone={done}
          onClose={() => setField(null)}
        />
      )}
    </div>
  );
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const CAL_WIDTH = 300;

function Calendar({
  anchor,
  field,
  from,
  to,
  today: now,
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
  onPick: (day: string) => void;
  onClear: () => void;
  onDone: () => void;
  onClose: () => void;
}) {
  const portal = usePortalRoot();
  const box = useRef<HTMLDivElement>(null);
  const [month, setMonth] = useState(() =>
    ((field === 'from' ? from || to : to || from) || now).slice(0, 7),
  );
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [y = 0, m = 1] = month.split('-').map(Number);
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const length = new Date(y, m, 0).getDate();
  const move = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
  };
  const latest = field === 'from' && to && to < now ? to : now;
  const earliest = field === 'to' ? from : '';

  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current;
      if (!a || !box.current) return;
      const r = a.getBoundingClientRect();
      const h = box.current.offsetHeight;
      const w = Math.min(CAL_WIDTH, window.innerWidth - 16);
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
      if (!box.current?.contains(t) && !anchor.current?.contains(t)) onClose();
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [anchor, onClose]);

  const shown = pos !== null;
  useEffect(() => {
    if (shown)
      box.current
        ?.querySelector<HTMLButtonElement>(
          '.td-cal__day.is-picked:not(:disabled), .td-cal__day:not(:disabled)',
        )
        ?.focus({ preventScroll: true });
  }, [shown]);

  const cells: ReactNode[] = [];
  for (let i = 0; i < lead; i++)
    cells.push(<span key={`lead-${i}`} className="td-cal__cell" aria-hidden="true" />);
  for (let d = 1; d <= length; d++) {
    const day = `${month}-${pad2(d)}`;
    const isEnd = day === from || day === to;
    const band = !!(from && to && from !== to && day >= from && day <= to);
    const col = (lead + d - 1) % 7;
    const cls = [
      'td-cal__cell',
      band && 'is-band',
      band && (day === from || col === 0 || d === 1) && 'is-band-start',
      band && (day === to || col === 6 || d === length) && 'is-band-end',
    ];
    cells.push(
      <span key={day} className={cls.filter(Boolean).join(' ')}>
        <button
          type="button"
          className={`td-cal__day ${isEnd ? 'is-end' : ''} ${day === (field === 'from' ? from : to) ? 'is-picked' : ''} ${day === now ? 'is-today' : ''}`}
          disabled={day > latest || (earliest !== '' && day < earliest)}
          aria-pressed={isEnd}
          aria-label={formatDay(day)}
          onClick={() => onPick(day)}
        >
          {d}
        </button>
      </span>,
    );
  }

  if (!portal) return null;
  return createPortal(
    <div
      ref={box}
      className={`td-cal-pop ${FLOAT}`}
      role="dialog"
      aria-label={field === 'from' ? 'Choose the From date' : 'Choose the To date'}
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: Math.min(CAL_WIDTH, window.innerWidth - 16),
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
          onClick={() => move(-1)}
        >
          <Icon name="ChevronLeft" size={15} />
        </button>
        <strong>
          {new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </strong>
        <button
          type="button"
          className="td-cal__nav"
          aria-label="Next month"
          disabled={month >= now.slice(0, 7)}
          onClick={() => move(1)}
        >
          <Icon name="ChevronRight" size={15} />
        </button>
      </div>
      <div className="td-cal__grid">
        {WEEKDAYS.map((w) => (
          <span key={w} className="td-cal__dow">
            {w}
          </span>
        ))}
        {cells}
      </div>
      <div className="td-cal__foot">
        <span className={`td-cal__hint ${tooLong ? 'is-warn' : ''}`} role="status">
          {tooLong
            ? `Choose up to ${LONGEST_DAYS} days`
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

/* ------------------------------------------------------------------ the pop-up */

export function AlertFilters({
  value,
  vehicles,
  alertNames,
  onApply,
  onClose,
}: {
  value: AlertFilter;
  vehicles: Item[];
  alertNames: Item[];
  onApply: (f: AlertFilter) => void;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const vehicleIds = useMemo(() => vehicles.map((v) => v.id), [vehicles]);
  const typeIds = useMemo(() => alertNames.map((t) => t.id), [alertNames]);
  const [draft, setDraft] = useState(value);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const patch = (p: Partial<AlertFilter>) => setDraft((d) => ({ ...d, ...p }));
  const vins = draft.vins ?? new Set(vehicleIds);
  const types = draft.types ?? new Set(typeIds);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const down = (e: MouseEvent) => {
      if (
        box.current &&
        !box.current.parentNode?.contains(e.target as Node) &&
        !inFloatingMenu(e.target)
      )
        onClose();
    };
    window.addEventListener('keydown', key);
    document.addEventListener('mousedown', down);
    return () => {
      window.removeEventListener('keydown', key);
      document.removeEventListener('mousedown', down);
    };
  }, [onClose]);

  const now = today();
  const span =
    draft.from && draft.to ? (Date.parse(draft.to) - Date.parse(draft.from)) / 86_400_000 : 0;
  const badDates =
    draft.range === CUSTOM &&
    (!draft.from || !draft.to || draft.from > draft.to || draft.to > now || span >= LONGEST_DAYS);
  const nothingPicked =
    (vehicleIds.length > 0 && vins.size === 0) || (typeIds.length > 0 && types.size === 0);
  const apply = () =>
    onApply({
      ...draft,
      vins: vins.size === vehicleIds.length ? null : vins,
      types: types.size === typeIds.length ? null : types,
    });

  return (
    <div ref={box} className="td-afilter" role="dialog" aria-label="Alert filters">
      <div className="td-afilter__row">
        <div className="td-afilter__field">
          <span className="td-afilter__label" id="td-afilter-date-l">
            Date
          </span>
          <button
            type="button"
            id="td-afilter-range"
            className={`td-cal__trigger ${draft.range === CUSTOM && !draft.from ? 'is-empty' : ''}`}
            aria-labelledby="td-afilter-date-l td-afilter-range"
            aria-expanded={calendarOpen}
            aria-controls="td-afilter-cal"
            onClick={() => setCalendarOpen((o) => !o)}
          >
            <Icon name="CalendarDays" size={15} />
            <span>{rangeLabel(draft)}</span>
            <Icon name="ChevronDown" size={15} />
          </button>
        </div>
        <div className="td-afilter__field">
          <span className="td-afilter__label">Operator</span>
          <Dropdown
            id="td-afilter-op"
            icon="UserRound"
            aria-label="Operator"
            value={draft.operator}
            onChange={(operator) => patch({ operator })}
            options={[{ value: '', label: 'All operators' }]}
          />
        </div>
      </div>
      {calendarOpen && (
        <DateRange
          id="td-afilter-cal"
          value={draft}
          onChange={patch}
          onDone={() => setCalendarOpen(false)}
        />
      )}
      <div className="td-afilter__row">
        <Checklist
          id="td-afilter-veh"
          label="Vehicle"
          placeholder="Search vehicle or group…"
          items={vehicles}
          selected={vins}
          onChange={(s) => patch({ vins: s })}
        />
        <Checklist
          id="td-afilter-type"
          label="Alert Name"
          placeholder="Search alert name…"
          items={alertNames}
          selected={types}
          onChange={(s) => patch({ types: s })}
        />
      </div>
      <div className="td-afilter__actions">
        <button
          type="button"
          className="td-btn td-btn--ghost"
          onClick={() => onApply(DEFAULT_FILTER)}
        >
          Reset
        </button>
        <button
          type="button"
          className="td-btn td-btn--primary"
          disabled={badDates || nothingPicked}
          onClick={apply}
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
