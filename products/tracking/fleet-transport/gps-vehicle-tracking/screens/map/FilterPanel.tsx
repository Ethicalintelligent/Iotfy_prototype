// IT-0036. The "Vehicle Filters" panel of the Map View (the original's floating filter panel
// with its multi-select dropdowns, toggles and vehicle tree), same markup and behaviour.
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon, usePortalRoot } from '../smart-track/kit';
import { NO_EXTRAS, type Extras } from '../shared/gridExtras';
import { DeviceLocationExtras, PeopleExtras, SensorExtras } from './FilterExtras';
import { fmt } from './model';

export const STATUS_FIELD = 'status';
export const VEHICLES_FIELD = 'vehicles';

export interface Applied {
  q: string;
  fields: Record<string, string[]>;
  picked: string[] | null;
  statuses: string[] | null;
}
export const NO_FILTER: Applied = { q: '', fields: {}, picked: null, statuses: null };

export interface FilterField {
  id: string;
  label: string;
  icon?: string;
  options: string[];
  placeholder?: string;
}
export interface FilterSection {
  title: string;
  fields: string[];
  toggles?: boolean;
}
export interface TreeItem {
  id: string;
  name: string;
  code?: string;
  group?: string;
}

/** Does a row pass the applied filters? */
export function passes(
  row: { id: string; name: string; code?: string; attrs?: Record<string, string>; status?: string },
  f: Applied,
  picked: Set<string> | null = f.picked && new Set(f.picked),
) {
  const q = f.q.trim().toLowerCase();
  return (
    (!q || row.name.toLowerCase().includes(q) || (row.code ?? '').toLowerCase().includes(q)) &&
    (!picked || picked.has(row.id)) &&
    (!f.statuses?.length || (row.status !== undefined && f.statuses.includes(row.status))) &&
    Object.entries(f.fields).every(([k, v]) => !v.length || v.includes(row.attrs?.[k] ?? ''))
  );
}

/* ------------------------------------------------------------------ filter button */

/** The small green funnel button with the number of applied filters. */
export function FilterButton({
  count,
  open,
  onClick,
  title,
  height = 26,
  iconSize = 15,
  showCount = true,
}: {
  count: number;
  open: boolean;
  onClick: () => void;
  title: string;
  /** IT-0053: beside the list search the button is as tall as the field, its funnel as big as the magnifier. */
  height?: number;
  iconSize?: number;
  /** IT-0053: beside the list search only the funnel shows (as Tracking); the count stays in the title. */
  showCount?: boolean;
}) {
  const has = count > 0;
  const on = has || open;
  const look = on
    ? {
        bg: 'var(--eit-active-gradient)',
        shadow: '0 0 0 1.5px #03AD86, 0 0 10px rgba(3,173,134,.45)',
        icon: '#fff',
        gap: has && showCount ? 5 : 3,
      }
    : { bg: '#E8F5EF', shadow: 'inset 0 0 0 1.5px #A9D8C3', icon: '#12955F', gap: 7 };
  return (
    <button
      type="button"
      onClick={onClick}
      title={has ? `${title} (${count} applied)` : title}
      aria-label={title}
      aria-pressed={open}
      style={{
        flexShrink: 0,
        width: 44,
        height,
        boxSizing: 'border-box',
        border: 'none',
        borderRadius: 8,
        background: look.bg,
        boxShadow: look.shadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: look.gap,
        padding: 0,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 700,
        color: on ? '#fff' : '#0B6E58',
        transition: 'background .15s ease, box-shadow .15s ease',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={iconSize}
        height={iconSize}
        fill="none"
        stroke={look.icon}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'block', flexShrink: 0 }}
        aria-hidden="true"
      >
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
      </svg>
      {has && showCount && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            width: 16,
            height: 16,
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            overflow: 'hidden',
            background: 'rgba(255,255,255,.22)',
            color: '#fff',
          }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ small parts */

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
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!mixed && !checked;
  }, [mixed, checked]);
  return (
    <label className={`td-check ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

export function SearchBox({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
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

const FLOAT = 'td-pop__menu--float';

/** Multi-select dropdown (button + floating checklist with search and Done). */
function MultiSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder,
  disabled,
  title,
  ariaLabel,
}: {
  id: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel: string;
}) {
  const portal = usePortalRoot();
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const [q, setQ] = useState('');
  const chosen = new Set(value);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const shown = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));
  const shownChosen = shown.filter((o) => chosen.has(o.value)).length;

  const open = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const up = below < 320 && r.top - 12 > below;
    setPos({
      ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      left: r.right - 272,
    });
    setQ('');
  };
  const close = (focus = false) => {
    setPos(null);
    if (focus) btn.current?.focus();
  };
  useLayoutEffect(() => {
    const el = pop.current;
    if (!pos || !el) return;
    const r = el.getBoundingClientRect();
    if (r.left < 8) el.style.left = '8px';
    else if (r.right > window.innerWidth - 8)
      el.style.left = `${Math.max(8, window.innerWidth - 8 - r.width)}px`;
  }, [pos]);
  useEffect(() => {
    if (!pos) return;
    const outside = (e: Event) =>
      !pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node);
    const onDown = (e: Event) => outside(e) && close();
    const onResize = () => close();
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('scroll', onDown, true);
    window.addEventListener('resize', onResize);
    pop.current?.querySelector<HTMLInputElement>('input[type=search]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('scroll', onDown, true);
      window.removeEventListener('resize', onResize);
    };
  }, [pos]);

  const set = (vals: string[]) =>
    onChange(options.map((o) => o.value).filter((v) => vals.includes(v)));
  const toggle = (v: string, on: boolean) => set(on ? [...value, v] : value.filter((x) => x !== v));
  const toggleAll = (on: boolean) => {
    const ids = shown.map((o) => o.value);
    set(on ? [...new Set([...value, ...ids])] : value.filter((v) => !ids.includes(v)));
  };
  const first = value[0];
  const text =
    first === undefined
      ? placeholder
      : value.length === 1
        ? labelOf(first)
        : `${labelOf(first)} +${value.length - 1}`;
  const cls = ['td-ddl', 'td-ddl--block', !value.length && 'is-placeholder', pos && 'is-open']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <button
        ref={btn}
        type="button"
        id={id}
        className={cls}
        disabled={disabled}
        title={title ?? (value.length > 1 ? value.map(labelOf).join(', ') : undefined)}
        aria-haspopup="dialog"
        aria-expanded={pos !== null}
        aria-label={ariaLabel}
        onClick={() => (pos ? close() : open())}
        onKeyDown={(e) => {
          if (!pos && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            open();
          }
        }}
      >
        <span className="td-ddl__label">{text}</span>
        <Icon name="ChevronDown" size={15} className="td-ddl__chev" />
      </button>
      {pos &&
        portal &&
        createPortal(
          <div
            ref={pop}
            className={`td-msel ${FLOAT}`}
            role="dialog"
            aria-label={ariaLabel}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close(true);
              }
            }}
            onBlur={(e) => {
              const to = e.relatedTarget as Node | null;
              if (to && !pop.current?.contains(to) && to !== btn.current) close();
            }}
          >
            <label className="td-pop__search">
              <Icon name="Search" size={14} />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder ?? 'Search…'}
                aria-label={searchPlaceholder ?? 'Search'}
                autoComplete="off"
              />
            </label>
            <div className="td-msel__list">
              {shown.length > 0 && (
                <Check
                  className="td-msel__all"
                  checked={shownChosen === shown.length}
                  mixed={shownChosen > 0}
                  onChange={toggleAll}
                >
                  <b>Select all</b>
                </Check>
              )}
              {shown.map((o) => (
                <Check
                  key={o.value}
                  checked={chosen.has(o.value)}
                  onChange={(on) => toggle(o.value, on)}
                >
                  <span className="td-msel__label" title={o.label}>
                    {o.label}
                  </span>
                </Check>
              ))}
              {!shown.length && <span className="td-msel__none">No results found</span>}
            </div>
            <div className="td-msel__foot">
              <span>{value.length} selected</span>
              <button type="button" className="td-btn td-btn--primary" onClick={() => close(true)}>
                Done
              </button>
            </div>
          </div>,
          portal,
        )}
    </>
  );
}

interface TreeGroup {
  id: string;
  label: string;
  items: { id: string; label: string }[];
}

/** Checklist of vehicles grouped by group, with search, select all and collapsible groups. */
function VehicleTree({
  id,
  label,
  placeholder,
  groups,
  selected,
  onChange,
  counts,
  className = '',
}: {
  id: string;
  label: string;
  placeholder: string;
  groups: TreeGroup[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
  counts?: boolean;
  className?: string;
}) {
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const needle = q.trim().toLowerCase();
  const allIds = groups.flatMap((g) => g.items.map((i) => i.id));
  const visible = groups
    .map((g) => ({
      ...g,
      items:
        !needle || g.label?.toLowerCase().includes(needle)
          ? g.items
          : g.items.filter((i) => i.label.toLowerCase().includes(needle)),
    }))
    .filter((g) => g.items.length);
  const countIn = (ids: string[]) => ids.filter((x) => selected.has(x)).length;
  const set = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    ids.forEach((x) => (on ? next.add(x) : next.delete(x)));
    onChange(next);
  };
  const visibleIds = visible.flatMap((g) => g.items.map((i) => i.id));
  const visibleChosen = countIn(visibleIds);

  return (
    <fieldset className={`td-afilter__field td-afilter__tree ${className}`}>
      <legend className="td-sr">{label}</legend>
      <SearchBox id={`${id}-q`} value={q} onChange={setQ} placeholder={placeholder} />
      <div className="td-afilter__list">
        {visibleIds.length > 0 && (
          <Check
            className="is-all"
            checked={visibleChosen === visibleIds.length}
            mixed={visibleChosen > 0}
            onChange={(on) => set(visibleIds, on)}
          >
            {counts ? (
              <>
                <b>Select all</b>
                <small>
                  {fmt(visibleChosen)} / {fmt(visibleIds.length)}
                </small>
              </>
            ) : (
              <b>Select All</b>
            )}
          </Check>
        )}
        {visible.map((g) => {
          const ids = g.items.map((i) => i.id);
          const n = countIn(ids);
          const expanded = needle || !collapsed[g.id];
          const leaves =
            expanded &&
            g.items.map((i) => (
              <Check
                key={i.id}
                className={g.label ? 'is-leaf' : ''}
                checked={selected.has(i.id)}
                onChange={(on) => set([i.id], on)}
              >
                {i.label}
              </Check>
            ));
          return g.label ? (
            <div key={g.id} className="td-afilter__group">
              <div className="td-afilter__group-head">
                <button
                  type="button"
                  className="td-afilter__twist"
                  aria-expanded={!!expanded}
                  aria-label={`${expanded ? 'Collapse' : 'Expand'} ${g.label}`}
                  onClick={() => setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))}
                >
                  <Icon name={expanded ? 'ChevronDown' : 'ChevronRight'} size={13} />
                </button>
                <Check checked={n === ids.length} mixed={n > 0} onChange={(on) => set(ids, on)}>
                  <b>{g.label}</b>
                </Check>
                <small>{counts ? `${fmt(n)} / ${fmt(ids.length)}` : g.items.length}</small>
              </div>
              {leaves}
            </div>
          ) : (
            <div key={g.id}>{leaves}</div>
          );
        })}
        {!visibleIds.length && (
          <p className="td-afilter__none">
            {needle ? `Nothing matches “${q}”.` : 'Nothing to choose from.'}
          </p>
        )}
      </div>
      {allIds.length > 0 && countIn(allIds) === 0 && (
        <small className="td-afilter__warn">Pick at least one.</small>
      )}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ floating position */

const GAP = 8;

/** Where the page wants the panel (window px): its right edge, top and height. */
export interface PanelBox {
  right: number;
  top: number;
  height: number;
}

/** Places the panel beside the list card (right of it when there is room), like the original. */
function useFloating(
  open: boolean,
  anchor: RefObject<HTMLElement>,
  section: () => Element | null | undefined,
  onClose: () => void,
  keep: string,
  placeAt?: () => PanelBox | null,
) {
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{
    side: string;
    left: number;
    top: number;
    maxHeight?: number;
    height?: number;
  } | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const sectionRef = useRef(section);
  sectionRef.current = section;
  const placeRef = useRef(placeAt);
  placeRef.current = placeAt;

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const a = anchor.current;
      if (!a) return;
      const box = placeRef.current?.();
      if (box) {
        // IT-0053: the page gives the panel's right edge, top and height; it keeps its own width.
        const w = panel?.offsetWidth ?? 0;
        const fixed = {
          side: 'box',
          left: Math.round(Math.max(GAP, box.right - w)),
          top: Math.round(box.top),
          height: Math.round(box.height),
        };
        setPos((p) =>
          p && p.side === 'box' && p.left === fixed.left && p.top === fixed.top && p.height === fixed.height
            ? p
            : fixed,
        );
        return;
      }
      const ar = a.getBoundingClientRect();
      const sr = (sectionRef.current() ?? a).getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const w = panel?.offsetWidth ?? 0;
      const h = panel?.scrollHeight ?? 0;
      const room = vh - 2 * GAP;
      const leftHalf = ar.left + ar.width / 2 < vw / 2;
      let side = leftHalf ? 'right' : 'left';
      let left = leftHalf ? sr.right + GAP : sr.left - GAP - w;
      let top = sr.top;
      if (left < GAP || left + w > vw - GAP) {
        side = 'below';
        top = ar.bottom + GAP;
        left = leftHalf ? ar.left : ar.right - w;
      }
      const next = {
        side,
        left: Math.round(Math.max(GAP, Math.min(left, vw - GAP - w))),
        top: Math.round(Math.max(GAP, Math.min(top, vh - GAP - h))),
        maxHeight: h >= room ? room : undefined,
      };
      setPos((p) =>
        p &&
        p.side === next.side &&
        p.left === next.left &&
        p.top === next.top &&
        p.maxHeight === next.maxHeight
          ? p
          : next,
      );
    };
    place();
    const mo = new MutationObserver(place);
    const ro = new ResizeObserver(place);
    if (panel) {
      mo.observe(panel, { childList: true, subtree: true });
      ro.observe(panel);
    }
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchor, panel]);

  useEffect(() => {
    if (!open) return;
    const trigger = anchor.current?.matches('button')
      ? anchor.current
      : anchor.current?.querySelector('button');
    const onDown = (e: Event) => {
      const t = e.target as Element | null;
      if (!t || panel?.contains(t) || anchor.current?.contains(t) || t.closest?.(keep)) return;
      closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      requestAnimationFrame(() => {
        if (!document.activeElement || document.activeElement === document.body)
          (trigger as HTMLElement | null)?.focus();
      });
    };
  }, [open, anchor, panel, keep]);

  const style: CSSProperties = pos
    ? {
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        height: pos.height,
        maxHeight: pos.height ? 'none' : pos.maxHeight,
        overflowY: pos.maxHeight && !pos.height ? 'auto' : undefined,
        zIndex: 1200,
      }
    : { position: 'fixed', top: 0, left: 0, visibility: 'hidden', zIndex: 1200 };
  return { ref: setPanel, style };
}

/* ------------------------------------------------------------------ panel */

export function FilterPanel({
  id,
  title,
  entity,
  fields,
  statuses,
  markers,
  applied,
  status,
  sections,
  anchor,
  section,
  placeAt,
  extras,
  onApply,
  onReset,
  onClose,
}: {
  id: string;
  title: string;
  entity: string;
  fields: FilterField[];
  statuses: { id: string; label: string }[];
  markers: TreeItem[];
  applied: Applied;
  status: string;
  sections: FilterSection[];
  anchor: RefObject<HTMLElement>;
  section: () => Element | null | undefined;
  /** IT-0053: fixed place for the panel (else it floats beside the list as before). */
  placeAt?: () => PanelBox | null;
  /** IT-0053: Grid View's added options (applied values and the company's geofences). */
  extras?: { applied: Extras; geofences: [string, string][] };
  onApply: (f: Applied, status: string, extras: Extras) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const portal = usePortalRoot();
  const float = useFloating(
    true,
    anchor,
    section,
    onClose,
    '.td-msel, .td-pop__menu--float',
    placeAt,
  );
  const [values, setValues] = useState<Record<string, string[]>>(applied.fields);
  // draft of the added options while the panel is open (closing discards it)
  const [x, setX] = useState<Extras>(extras?.applied ?? NO_EXTRAS);
  const [chosenStatuses, setChosenStatuses] = useState<string[]>(
    applied.statuses?.length ? applied.statuses : status === 'all' ? [] : [status],
  );
  const [picked, setPicked] = useState<Set<string> | null>(
    applied.picked && new Set(applied.picked),
  );
  const plural = `${entity.toLowerCase()}s`;

  const tree = useMemo(() => {
    const byGroup = new Map<string, TreeItem[]>();
    for (const m of markers) {
      const g = m.group || `All ${plural}`;
      byGroup.set(g, [...(byGroup.get(g) ?? []), m]);
    }
    return [...byGroup.entries()]
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([g, items]) => ({
        id: g,
        label: g,
        items: items.map((i) => ({ id: i.id, label: i.code || i.name })),
      }));
  }, [markers, plural]);
  const allIds = useMemo(() => markers.map((m) => m.id), [markers]);
  const selected = useMemo(() => picked ?? new Set(allIds), [picked, allIds]);
  const noneChosen = allIds.length > 0 && !allIds.some((x) => selected.has(x));
  const byId = new Map(fields.map((f) => [f.id, f]));
  const inSections = new Set(sections.flatMap((s) => s.fields));

  const reset = () => {
    setValues({});
    setChosenStatuses([]);
    setPicked(null);
    setX(NO_EXTRAS);
    onReset();
  };
  const pickTree = (s: Set<string>) => setPicked(allIds.every((x) => s.has(x)) ? null : s);

  const statusRow = (
    <div className="td-trkf__row" key="td-trkf-status">
      <span className="td-badge tone-brand" aria-hidden="true">
        <Icon name="Activity" size={15} />
      </span>
      <label htmlFor={`td-trkf-${id}-status`}>{entity} Status</label>
      <MultiSelect
        id={`td-trkf-${id}-status`}
        value={chosenStatuses}
        placeholder={`Select ${entity.toLowerCase()} Status`}
        searchPlaceholder={`Search ${entity.toLowerCase()} status...`}
        ariaLabel={`${entity} Status`}
        onChange={setChosenStatuses}
        options={statuses.map((s) => ({ value: s.id, label: s.label }))}
      />
    </div>
  );
  const fieldRow = (f: FilterField) => (
    <div className="td-trkf__row" key={f.id}>
      <span className="td-badge tone-brand" aria-hidden="true">
        {f.icon && <Icon name={f.icon} size={15} />}
      </span>
      <label htmlFor={`td-trkf-${id}-${f.id}`}>{f.label}</label>
      <MultiSelect
        id={`td-trkf-${id}-${f.id}`}
        value={values[f.id] ?? []}
        placeholder={f.placeholder ?? `Select ${f.label}`}
        searchPlaceholder={`Search ${f.label.toLowerCase()}...`}
        ariaLabel={f.label}
        disabled={!f.options.length}
        title={f.options.length ? undefined : `No ${f.label.toLowerCase()} recorded yet`}
        onChange={(v) => setValues((s) => ({ ...s, [f.id]: v }))}
        options={f.options.map((o) => ({ value: o, label: o }))}
      />
    </div>
  );
  const toggleRow = (f: FilterField) => {
    const current = values[f.id]?.[0] ?? '';
    return (
      <div className="td-trkf__toggle" key={f.id}>
        <span className="td-trkf__tlabel" id={`td-trkf-${id}-${f.id}`}>
          {f.icon && (
            <span className="td-trkf__ticon tone-brand" aria-hidden="true">
              <Icon name={f.icon} size={12} />
            </span>
          )}
          {f.label}
        </span>
        <div className="td-trkf__seg" role="radiogroup" aria-labelledby={`td-trkf-${id}-${f.id}`}>
          {['', ...f.options].map((o) => (
            <button
              key={o || 'all'}
              type="button"
              role="radio"
              aria-checked={current === o}
              className={current === o ? 'is-on' : ''}
              onClick={() => setValues((s) => ({ ...s, [f.id]: o ? [o] : [] }))}
            >
              {o || 'All'}
            </button>
          ))}
        </div>
      </div>
    );
  };
  const special = (k: string) => (k === STATUS_FIELD ? statusRow : null);

  const panel = (
    <div
      ref={float.ref}
      style={float.style}
      className="td-trkf  has-sections has-tree is-floating"
      role="dialog"
      aria-modal="false"
      aria-labelledby={`td-trkf-${id}-title`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="td-trkf__head">
        <h3 id={`td-trkf-${id}-title`}>
          <Icon name="Funnel" size={16} /> {title}
        </h3>
        <button
          type="button"
          className="td-icon-btn td-icon-btn--sm"
          onClick={onClose}
          aria-label="Close filters"
        >
          <Icon name="X" size={15} />
        </button>
      </div>
      <form
        className="td-trkf__body"
        onSubmit={(e) => {
          e.preventDefault();
          const chosen = allIds.filter((x) => selected.has(x));
          const many = chosenStatuses.length > 1;
          onApply(
            {
              q: '',
              fields: values,
              picked: chosen.length === allIds.length ? null : chosen,
              statuses: many ? chosenStatuses : null,
            },
            many ? 'all' : (chosenStatuses[0] ?? 'all'),
            x,
          );
        }}
      >
        <div className="td-trkf__fields">
          {sections.map((s) => {
            const keys = s.fields.filter((k) => k === STATUS_FIELD || byId.has(k));
            return (
              keys.length > 0 && (
                <section
                  key={s.title}
                  className={`td-trkf__sec ${s.toggles ? 'is-toggles' : ''}`}
                  aria-label={s.title}
                >
                  <h4 className="td-trkf__sechead">{s.title}</h4>
                  {s.toggles ? (
                    <div className="td-trkf__toggles">
                      {keys.map((k) => special(k) ?? toggleRow(byId.get(k)!))}
                      {extras && s.title === 'Sensors' && (
                        <SensorExtras id={`td-trkf-${id}-x`} x={x} set={setX} />
                      )}
                    </div>
                  ) : (
                    keys.map((k) => special(k) ?? fieldRow(byId.get(k)!))
                  )}
                  {extras && s.title === 'People' && (
                    <PeopleExtras id={`td-trkf-${id}-x`} x={x} set={setX} />
                  )}
                </section>
              )
            );
          })}
          {extras && (
            <DeviceLocationExtras
              id={`td-trkf-${id}-x`}
              x={x}
              set={setX}
              geofences={extras.geofences}
            />
          )}
          {fields.filter((f) => !inSections.has(f.id)).map(fieldRow)}
          {!inSections.has(STATUS_FIELD) && statusRow}
        </div>
        <VehicleTree
          id={`td-trkf-${id}-pick`}
          className="td-trkf__tree"
          label={`${entity}s`}
          placeholder={`Search ${plural}...`}
          counts
          groups={tree}
          selected={selected}
          onChange={pickTree}
        />
        <div className="td-trkf__actions">
          <button type="button" className="td-btn td-btn--ghost" onClick={reset}>
            Reset
          </button>
          <button type="submit" className="td-btn td-btn--primary" disabled={noneChosen}>
            Submit
          </button>
        </div>
      </form>
    </div>
  );
  return portal ? createPortal(panel, portal) : null;
}
