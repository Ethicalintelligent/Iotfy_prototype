// IT-0036. The original Dashboard's widgets (cards, tiles, charts drawn as SVG by the page itself,
// carousels, ranking tables, ticker), rebuilt with the same markup and class names, so the page's
// own stylesheet (dash.css) gives the same look.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Icon } from '../smart-track/kit';
import { Avatar, Ddl, Img, Medal, Pager, VehicleThumb, fmt, type DdlOption } from './controls';
import { RANK_IMAGES } from './vehicle-types';

const css = (v: Record<string, string | number | undefined>) => v as CSSProperties;

/* ------------------------------------------------------------------ card + period picker */

export interface Period {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  liveId?: string;
}

export interface WidgetHead {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  tone?: string;
  meta?: ReactNode;
  period?: Period;
  className?: string;
  fixedHeight?: number;
}

/** Card classes whose dropdown menus open under the button's right edge (as in the original). */
const RIGHT_ALIGNED = /\bvs-(odo|speed|dist|act|top|rank)\b/;

export function PeriodPicker({
  id,
  period,
  alignRight,
}: {
  id: string;
  period: Period;
  alignRight?: boolean;
}) {
  const live = period.liveId != null && period.value === period.liveId;
  return (
    <Ddl
      id={`td-period-${id}`}
      className={`td-ddl--period ${live ? 'is-live' : ''}`}
      title={live ? 'Live data' : 'Past period: live updates paused'}
      icon={live ? <i className="td-live-dot" aria-hidden="true" /> : 'CalendarDays'}
      aria-label="Date filter"
      value={period.value}
      onChange={period.onChange}
      options={period.options.map((o) => ({ value: o.id, label: o.label }))}
      alignRight={alignRight}
    />
  );
}

export function WidgetCard({
  w,
  tone,
  actions,
  className = '',
  children,
}: {
  w: WidgetHead;
  tone?: string;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const right = RIGHT_ALIGNED.test(w.className ?? '');
  return (
    <section
      className={`td-card ${w.fixedHeight ? 'td-card--fixed' : ''} ${className} ${w.className ?? ''}`}
      style={w.fixedHeight ? { height: w.fixedHeight } : undefined}
    >
      <header className="td-card__head">
        <span className={`td-badge td-badge--solid tone-${tone || w.tone || 'brand'}`}>
          <Icon name={w.icon} size={16} />
        </span>
        <div className="td-card__titles">
          <h2 className="td-card__title ">{w.title}</h2>
          {w.subtitle && <p className="td-card__sub">{w.subtitle}</p>}
        </div>
        {(w.meta || actions || w.period) && (
          <div className="td-card__right">
            {w.meta && <span className="td-card__meta">{w.meta}</span>}
            {actions}
            {w.period && <PeriodPicker id={w.id} period={w.period} alignRight={right} />}
          </div>
        )}
      </header>
      <div className="td-card__body ">{children}</div>
    </section>
  );
}

/** A widget that cannot show its data (loading, no permission, nothing in the period). */
export function Unavailable({ w, message }: { w: WidgetHead; message: string }) {
  return (
    <WidgetCard w={{ ...w, meta: undefined }}>
      <p className="td-unavailable">{message || 'This widget could not be loaded.'}</p>
    </WidgetCard>
  );
}

/* ------------------------------------------------------------------ ticker */

export interface TickerItem {
  label: string;
  value: number;
  tone: string;
  icon: string;
}

const TICKER_SPEED = 42; // px per second

/** The scrolling "Today Alerts" strip; pauses on hover and keyboard focus. */
export function Ticker({
  label,
  items,
  onPick,
}: {
  label: string;
  items: TickerItem[];
  onPick?: () => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const half = useRef<HTMLDivElement>(null);
  const firstSet = useRef<HTMLDivElement>(null);
  const anim = useRef<Animation | null>(null);
  const hold = useRef({ hover: false, focus: false });
  const [copies, setCopies] = useState(1);
  const has = items.length > 0;

  useLayoutEffect(() => {
    const vp = viewport.current;
    const set = firstSet.current;
    if (!vp || !set) return;
    const fit = () => {
      const w = set.offsetWidth;
      if (w) setCopies(Math.max(1, Math.ceil(vp.clientWidth / w)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(vp);
    ro.observe(set);
    return () => ro.disconnect();
  }, [has]);

  useEffect(() => {
    const tr = track.current;
    const h = half.current;
    if (
      !tr ||
      !h ||
      typeof tr.animate !== 'function' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    )
      return;
    let width = 0;
    const start = () => {
      const w = h.offsetWidth;
      if (!w || w === width) return;
      const prev = anim.current;
      const at =
        prev && width ? (((Number(prev.currentTime) || 0) / 1000) * TICKER_SPEED) % width : 0;
      prev?.cancel();
      width = w;
      const a = tr.animate(
        [{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(${-w}px, 0, 0)` }],
        {
          duration: (w / TICKER_SPEED) * 1000,
          iterations: Infinity,
        },
      );
      a.currentTime = ((at % w) / TICKER_SPEED) * 1000;
      if (hold.current.hover || hold.current.focus) a.pause();
      anim.current = a;
    };
    start();
    const ro = new ResizeObserver(start);
    ro.observe(h);
    return () => {
      ro.disconnect();
      anim.current?.cancel();
      anim.current = null;
    };
  }, [has]);

  const sync = () => {
    const a = anim.current;
    if (a) {
      if (hold.current.hover || hold.current.focus) a.pause();
      else a.play();
    }
  };
  const chips = (live: boolean) =>
    items.map((it) => (
      <button
        key={it.label}
        type="button"
        className="td-ticker__chip"
        tabIndex={live ? undefined : -1}
        title={`${it.label}: ${fmt(it.value)}`}
        onClick={onPick}
      >
        <span className={`td-badge td-badge--solid td-badge--sm tone-${it.tone}`}>
          <Icon name={it.icon} size={13} />
        </span>
        <span className="td-ticker__name">{it.label}</span>
        <strong>{fmt(it.value)}</strong>
      </button>
    ));
  const sets = (live: boolean) =>
    Array.from({ length: copies }, (_, i) => (
      <div
        key={i}
        ref={live && i === 0 ? firstSet : undefined}
        className="td-ticker__set"
        aria-hidden={live && i === 0 ? undefined : true}
      >
        {chips(live && i === 0)}
      </div>
    ));
  return (
    <div className="td-ticker" role="region" aria-label={label}>
      <span className="td-ticker__label">
        <i className="td-live-dot" />
        <span>{label}</span>
      </span>
      <div
        className="td-ticker__viewport"
        ref={viewport}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') {
            hold.current.hover = true;
            sync();
          }
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') {
            hold.current.hover = false;
            sync();
          }
        }}
        onFocus={(e) => {
          hold.current.focus = (e.target as HTMLElement).matches?.(':focus-visible') ?? false;
          sync();
        }}
        onBlur={() => {
          hold.current.focus = false;
          sync();
        }}
      >
        <div className="td-ticker__track" ref={track}>
          <div className="td-ticker__half" ref={half}>
            {sets(true)}
          </div>
          <div className="td-ticker__half" aria-hidden="true">
            {sets(false)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ stat tiles */

export interface Tile {
  label: string;
  value: number;
  caption?: string;
  tone: string;
  icon: string;
  filter?: string;
}

export function StatsWidget({
  w,
  tiles,
  minTile,
  statusFilter,
  onFilter,
}: {
  w: WidgetHead;
  tiles: Tile[];
  minTile: number;
  statusFilter: string;
  onFilter: (f: string) => void;
}) {
  return (
    <WidgetCard w={w}>
      <div className="td-tiles  " style={css({ '--min': `${minTile}px` })}>
        {tiles.map((t) => {
          const clickable = !!t.filter;
          const active = clickable && t.filter !== 'all' && statusFilter === t.filter;
          const body = (
            <>
              <span className={`td-badge td-badge--solid td-badge--lg tone-${t.tone}`}>
                <Icon name={t.icon} size={20} />
              </span>
              <span className="td-tile__label">{t.label}</span>
              <span className="td-tile__value">{fmt(t.value)}</span>
              {t.caption && <span className="td-tile__caption">{t.caption}</span>}
            </>
          );
          const cls = `td-tile tone-${t.tone} ${clickable ? 'is-clickable' : ''} ${active ? 'is-active' : ''}`;
          return clickable ? (
            <button
              key={t.label}
              type="button"
              className={cls}
              aria-pressed={active}
              onClick={() => onFilter(active || t.filter === 'all' ? 'all' : t.filter!)}
            >
              {body}
            </button>
          ) : (
            <div key={t.label} className={cls}>
              {body}
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}

/* ------------------------------------------------------------------ KPI boxes + progress bars (geofences) */

export function KpiBarsWidget({
  w,
  headline,
  badges,
  kpis,
  bars,
  max,
}: {
  w: WidgetHead;
  headline: string;
  badges: string[];
  kpis: { label: string; value: number | string; tone: string; icon: string }[];
  bars: { label: string; value: number; icon: string }[];
  max: number;
}) {
  return (
    <WidgetCard
      w={w}
      actions={
        <div className="td-geo-badges">
          <span className="td-tag tone-purple is-strong">{headline}</span>
          <span className="td-geo-badges__row">
            {badges.map((b) => (
              <span key={b} className="td-tag tone-purple">
                {b}
              </span>
            ))}
          </span>
        </div>
      }
    >
      <div className="td-kpis">
        {kpis.map((k) => (
          <div key={k.label} className={`td-kpi tone-${k.tone}`}>
            <span className="td-kpi__head">
              <span className={`td-badge td-badge--round tone-${k.tone}`}>
                <Icon name={k.icon} size={16} />
              </span>
              <small>{k.label}</small>
            </span>
            <strong>{fmt(k.value)}</strong>
          </div>
        ))}
      </div>
      <ul className="td-pbars">
        {bars.map((b) => (
          <li key={b.label}>
            <Icon name={b.icon} size={16} />
            <span className="td-pbars__label">{b.label}</span>
            <span className="td-pbars__track">
              <i style={{ width: `${max ? (b.value / max) * 100 : 0}%` }} />
            </span>
            <b>{fmt(b.value)}</b>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

/* ------------------------------------------------------------------ heat table (alert summary) */

export function HeatTableWidget({
  w,
  periods,
  rows,
}: {
  w: WidgetHead;
  periods: string[];
  rows: { label: string; icon: string; tone: string; values: number[] }[];
}) {
  const max = periods.map((_, i) => Math.max(...rows.map((r) => r.values[i] ?? 0)));
  const totals = periods.map((_, i) => rows.reduce((s, r) => s + (r.values[i] ?? 0), 0));
  const totalTones = ['green', 'blue', 'purple', 'red'];
  return (
    <WidgetCard w={w} tone="red">
      <div className="td-heat-scroll">
        <table className="td-table td-heat">
          <thead>
            <tr>
              <th>Category</th>
              {periods.map((p) => (
                <th key={p} className="num">
                  <span className="th-icon">
                    <Icon name="CalendarDays" size={13} />
                    {p}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>
                  <span className={`td-heat__cat tone-${r.tone}`} title={r.label}>
                    <Icon name={r.icon} size={15} />
                    <span>{r.label}</span>
                  </span>
                </td>
                {r.values.map((v, i) => (
                  <td key={i} className="num td-heat__td">
                    <span
                      className={`td-heat__cell tone-${r.tone}`}
                      style={css({
                        '--heat': max[i] ? (0.25 + 0.75 * (v / max[i]!)).toFixed(2) : 0,
                      })}
                    >
                      {fmt(v)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total Alerts</td>
              {totals.map((t, i) => (
                <td key={i} className={`num tone-${totalTones[i]} td-total`}>
                  {fmt(t)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </WidgetCard>
  );
}

/* ------------------------------------------------------------------ activity timeline */

export interface TimelineRow {
  id: string;
  name: string;
  code: string;
  image?: string;
  segments: { status: string; start: number; end: number }[];
}

const hm = (h: number) => {
  const m = Math.round(h * 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
};
const clock = (h: number) => {
  const m = Math.round(h * 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const HOURS = Array.from({ length: 12 }, (_, i) => `${String(i * 2).padStart(2, '0')}:00`);
const WINDOW = 5;

export function TimelineWidget({
  w,
  days,
  day,
  onDay,
  picker,
  statuses,
  rows,
  pageSize,
  entity,
  note,
  onVisible,
}: {
  w: WidgetHead;
  days: { id: string; label: string }[];
  day: string;
  onDay: (d: string) => void;
  picker: { label: string; value: string; onChange: (v: string) => void; options: DdlOption[] };
  statuses: { id: string; label: string; tone: string }[];
  rows: TimelineRow[];
  pageSize: number;
  entity: string;
  note: string;
  onVisible: (ids: string[]) => void;
}) {
  const ids = days.map((d) => d.id);
  const at = Math.max(0, ids.indexOf(day));
  const [offset, setOffset] = useState(0);
  const [anim, setAnim] = useState({ tabs: '', rows: '' });
  const maxOffset = Math.max(0, ids.length - WINDOW);
  const first = Math.min(maxOffset, offset);
  const pickDay = (id: string) => {
    const i = ids.indexOf(id);
    if (i >= 0 && (i < first || i >= first + WINDOW)) {
      setOffset(Math.min(maxOffset, i < first ? i : i - WINDOW + 1));
      setAnim((a) => ({ ...a, tabs: i > first ? 'is-from-right' : 'is-from-left' }));
    }
    setAnim((a) => ({ ...a, rows: i > at ? 'is-from-right' : i < at ? 'is-from-left' : a.rows }));
    onDay(id);
  };
  const shift = (d: number) => {
    const n = Math.max(0, Math.min(maxOffset, first + d));
    if (n !== first) {
      setOffset(n);
      setAnim((a) => ({ ...a, tabs: d > 0 ? 'is-from-right' : 'is-from-left' }));
    }
  };
  const tone = Object.fromEntries(statuses.map((s) => [s.id, s.tone]));
  const name = Object.fromEntries(statuses.map((s) => [s.id, s.label]));
  const view = `${day}|${picker.value}`;
  const [paging, setPaging] = useState({ view: '', page: 0 });
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = paging.view === view ? Math.min(paging.page, pages - 1) : 0;
  const shown = rows.slice(page * pageSize, page * pageSize + pageSize);
  const visibleKey = shown.map((r) => r.id).join('|');
  const visible = useRef(onVisible);
  visible.current = onVisible;
  useEffect(() => {
    if (visibleKey) visible.current(visibleKey.split('|'));
  }, [visibleKey]);
  const turn = (d: number) => {
    const n = Math.max(0, Math.min(pages - 1, page + d));
    if (n !== page) {
      setPaging({ view, page: n });
      setAnim((a) => ({ ...a, rows: d > 0 ? 'is-from-below' : 'is-from-above' }));
    }
  };

  return (
    <WidgetCard
      w={w}
      className="td-tlcard"
      actions={
        <>
          <Ddl
            id={`td-tl-${w.id}-who`}
            className="td-ddl--sm"
            icon="SlidersHorizontal"
            aria-label={picker.label}
            value={picker.value}
            onChange={(v) => {
              setAnim((a) => ({ ...a, rows: 'is-fade' }));
              picker.onChange(v);
            }}
            options={picker.options}
            alignRight
          />
          <Ddl
            id={`td-tl-${w.id}-day`}
            className="td-ddl--sm"
            icon="CalendarDays"
            aria-label="Date"
            value={day}
            onChange={pickDay}
            options={days.map((d) => ({ value: d.id, label: d.label }))}
            alignRight
          />
        </>
      }
    >
      <div className="td-tl__controls">
        <div className="td-seg-wrap">
          <button
            type="button"
            className="td-seg-arrow"
            onClick={() => shift(-1)}
            disabled={first === 0}
            aria-label="Newer dates"
          >
            <Icon name="ChevronLeft" size={14} />
          </button>
          <div className="td-tl__tabs-clip">
            <div
              key={first}
              className={`td-seg td-seg--sm td-tl__tabs ${anim.tabs}`}
              role="tablist"
              aria-label="Day"
            >
              {days.slice(first, first + WINDOW).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={d.id === day}
                  className={`td-seg__btn ${d.id === day ? 'is-active' : ''}`}
                  onClick={() => pickDay(d.id)}
                >
                  <span>{d.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="td-seg-arrow"
            onClick={() => shift(1)}
            disabled={first >= maxOffset}
            aria-label="Older dates"
          >
            <Icon name="ChevronRight" size={14} />
          </button>
        </div>
      </div>
      <div className="td-tl__legend">
        <span className="td-tl__axis-label">Time (Hours)</span>
        {statuses.map((s) => (
          <span key={s.id} className={`tone-${s.tone}`}>
            <i className="td-dot" />
            {s.label}
          </span>
        ))}
      </div>
      <div className="td-tl-scroll is-paged">
        <div className="td-tl">
          <div className="td-tl__head">
            <span>{entity}</span>
            <div className="td-tl__hours">
              {HOURS.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
          </div>
          <div
            key={`${view}|${page}`}
            className={`td-tl__body ${anim.rows} is-paged`}
            style={css({ '--rows': pageSize })}
          >
            {note && !rows.length && <p className="td-unavailable">{note}</p>}
            {shown.map((r) => (
              <div key={r.id} className="td-tl__row">
                <span className="td-tl__who">
                  <Img
                    src={r.image}
                    alt={r.name}
                    width={34}
                    height={22}
                    className="td-tl__img"
                    fallback={<VehicleThumb icon="Truck" size={20} />}
                  />
                  <span>
                    <strong>{r.name}</strong>
                    <small>{r.code}</small>
                  </span>
                </span>
                <div className="td-tl__track ">
                  {r.segments.map((s, i) => (
                    <i
                      key={i}
                      className={`tone-${tone[s.status]}`}
                      title={`${name[s.status] ?? s.status} · ${hm(s.end - s.start)} (${clock(s.start)} – ${clock(s.end)})`}
                      style={{
                        left: `${(s.start / 24) * 100}%`,
                        width: `${((s.end - s.start) / 24) * 100}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="td-tl__foot">
        <small>
          Showing {page * pageSize + 1}–{page * pageSize + shown.length} of {rows.length}
        </small>
        <span className="td-tl__nav">
          <button
            type="button"
            className="td-seg-arrow"
            onClick={() => turn(-1)}
            disabled={page === 0}
            aria-label={`Previous ${entity.toLowerCase()}s`}
          >
            <Icon name="ChevronUp" size={14} />
          </button>
          <button
            type="button"
            className="td-seg-arrow"
            onClick={() => turn(1)}
            disabled={page >= pages - 1}
            aria-label={`Next ${entity.toLowerCase()}s`}
          >
            <Icon name="ChevronDown" size={14} />
          </button>
        </span>
      </div>
    </WidgetCard>
  );
}

/* ------------------------------------------------------------------ column chart (odometer) */

function useWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => e && setWidth(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

let measureCtx: CanvasRenderingContext2D | null | undefined;
function textWidth(text: string, size: number, font: string) {
  if (measureCtx === undefined) measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * size * 0.6;
  measureCtx.font = `600 ${size}px ${font}`;
  return measureCtx.measureText(text).width;
}
/** Fit a category label in `room` px: 12 px, else 10 px, else shortened with "…". */
function fitLabel(
  text: string,
  room: number,
  font: string,
): { text: string; sm: boolean; full?: string } {
  if (textWidth(text, 12, font) <= room) return { text, sm: false };
  if (textWidth(text, 10, font) <= room) return { text, sm: true };
  const tight = text.replace(/\s+[-–]\s+/g, '–');
  if (textWidth(tight, 10, font) <= room) return { text: tight, sm: true, full: text };
  let n = tight.length - 1;
  while (n > 1 && textWidth(`${tight.slice(0, n)}…`, 10, font) > room) n--;
  return { text: `${tight.slice(0, n).trimEnd()}…`, sm: true, full: text };
}
const niceStep = (v: number) => {
  const p = 10 ** Math.floor(Math.log10(v || 1));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};
/** Column with rounded top corners. */
const column = (x: number, y: number, w: number, base: number, r: number) => {
  const k = Math.max(0, Math.min(r, w / 2, base - y));
  return `M${x},${base}V${y + k}Q${x},${y} ${x + k},${y}H${x + w - k}Q${x + w},${y} ${x + w},${y + k}V${base}Z`;
};

export interface BarChartProps {
  w: WidgetHead;
  kpis: { label: string; value: number | string; unit?: string; icon: string }[];
  edges: [string, string];
  markerIcon: string;
  height: number;
  tip: { unit: string; one: string; other: string };
  xTitle: string;
  categories: { label: string; short: string }[];
  values: number[];
  tone: string;
}

/** The odometer chart: one series drawn as fading columns with a marker icon and a base dot. */
export function BarChartWidget({
  w,
  kpis,
  edges,
  markerIcon,
  height,
  tip,
  xTitle,
  categories,
  values,
  tone,
}: BarChartProps) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { t: 36, r: 0, b: 42, l: 0 };
  const plotW = Math.max(width - pad.l - pad.r, 10);
  const plotH = height - pad.t - pad.b;
  const max = Math.max(...values, 1);
  const step = niceStep(max / 3);
  const top = Math.ceil(max / step) * step;
  const y = (v: number) => pad.t + plotH - (v / top) * plotH;
  const slot = plotW / Math.max(categories.length, 1);
  const barW = Math.max(slot - 6, 4);
  const font =
    (ref.current && getComputedStyle(ref.current).getPropertyValue('--font').trim()) ||
    'sans-serif';
  return (
    <WidgetCard w={w}>
      <div className="td-kpistrip">
        {kpis.map((k) => (
          <div key={k.label}>
            <span className="td-badge td-badge--round tone-green">
              <Icon name={k.icon} size={15} />
            </span>
            <span>
              <strong>
                {fmt(k.value)}
                <em>{k.unit}</em>
              </strong>
              <small>{k.label}</small>
            </span>
          </div>
        ))}
      </div>
      <div className="td-edges">
        <span>
          {edges[0]} <Icon name="ArrowDown" size={12} />
        </span>
        <span>
          {edges[1]} <Icon name="ArrowDown" size={12} />
        </span>
      </div>
      <div className="td-chart" ref={ref}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={w.title}>
            {categories.map((c, i) => {
              const x0 = pad.l + slot * i + (slot - barW) / 2;
              const v = values[i] ?? 0;
              const h = Math.max(y(0) - y(v), 14);
              const cx = x0 + barW / 2;
              const base = y(0);
              const text = slot < 44 && c.short ? c.short : c.label;
              const fit = fitLabel(text, slot - 6, font);
              const full = fit.full ?? (text !== c.label ? c.label : undefined);
              return (
                <g
                  key={c.label}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  <rect
                    x={pad.l + slot * i}
                    y={pad.t}
                    width={slot}
                    height={plotH}
                    className={`c-hit ${hover === i ? 'is-hover' : ''}`}
                  />
                  <g>
                    <title>{`${c.label}${tip.unit ? ` ${tip.unit}` : ''}: ${fmt(v)} ${v === 1 ? tip.one : tip.other}`}</title>
                    {hover === i && (
                      <path
                        d={column(x0 - 3.5, base - h - 3.5, barW + 7, base + 3.5, 9.5)}
                        className="c-ring"
                        fill="none"
                      />
                    )}
                    <path
                      d={column(x0, base - h, barW, base, 6)}
                      className={`c-bar tone-${tone}`}
                      opacity={Math.max(0.28, 1 - i * 0.11)}
                    />
                    <circle cx={cx} cy={base} r={4.25} className="c-basedot" fill="none" />
                    <circle cx={cx} cy={base} r={1.5} className="c-basedot__pip" fill="none" />
                    {(hover === i || width > 300) && (
                      <text x={cx} y={base - h - 22} textAnchor="middle" className="c-val">
                        {v}
                      </text>
                    )}
                    {width > 420 && (
                      <g transform={`translate(${cx - 7.5} ${base - h - 19})`} className="c-marker">
                        <Icon name={markerIcon} size={15} />
                      </g>
                    )}
                  </g>
                  <text
                    x={pad.l + slot * i + slot / 2}
                    y={height - pad.b + 17}
                    textAnchor="middle"
                    className={`c-cat${fit.sm ? ' c-cat--sm' : ''}`}
                  >
                    {full && <title>{full}</title>}
                    {fit.text}
                  </text>
                </g>
              );
            })}
            <line x1={pad.l} x2={pad.l + plotW} y1={y(0)} y2={y(0)} className="c-axis" />
          </svg>
        )}
      </div>
      <p className="td-chart__xtitle">{xTitle}</p>
    </WidgetCard>
  );
}

/* ------------------------------------------------------------------ horizontal bars (speed) */

export function HBarsWidget({
  w,
  heading,
  axis,
  rowIcon,
  rows,
}: {
  w: WidgetHead;
  heading: string;
  axis: [string, string];
  rowIcon: string;
  rows: { label: string; value: number }[];
}) {
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <WidgetCard w={w}>
      <h3 className="td-subhead td-subhead--lg">{heading}</h3>
      <div className="td-hbars">
        <div className="td-hbars__axis" aria-hidden="true">
          <span>{axis[0]}</span>
          <i />
          <span>{axis[1]}</span>
        </div>
        <ul>
          {rows.map((r) => (
            <li key={r.label}>
              <span className="td-hbars__label">{r.label}</span>
              <span className="td-badge td-badge--round td-badge--sm tone-orange">
                <Icon name={rowIcon} size={13} />
              </span>
              <span className="td-hbars__track">
                <i style={{ width: `${max ? (r.value / max) * 100 : 0}%` }} />
              </span>
              <b>{fmt(r.value)}</b>
            </li>
          ))}
        </ul>
      </div>
    </WidgetCard>
  );
}

/* ------------------------------------------------------------------ status distribution */

export function DistributionWidget({
  w,
  summary,
  note,
  items,
}: {
  w: WidgetHead;
  summary: { label: string; value: string; icon: string }[];
  note: string;
  items: { label: string; sub: string; pct: number; tone: string; icon: string }[];
}) {
  return (
    <WidgetCard w={w}>
      <div className="td-dist__summary">
        {summary.map((s) => (
          <div key={s.label} className="td-dist__sum">
            <span className="td-badge td-badge--round tone-green">
              <Icon name={s.icon} size={15} />
            </span>
            <span>
              <small>{s.label}</small>
              <strong>{s.value}</strong>
            </span>
          </div>
        ))}
        {note && <p>{note}</p>}
      </div>
      <div className="td-dist">
        {items.map((t) => (
          <div
            key={t.label}
            className={`td-dist__item tone-${t.tone}`}
            style={css({ '--pct': Math.max(0, Math.min(100, t.pct)) })}
          >
            <span className="td-dist__icon">
              <Icon name={t.icon} size={24} />
            </span>
            <span className="td-dist__label">{t.label}</span>
            <span className="td-dist__sub">{t.sub}</span>
            <strong className="td-dist__pct">{t.pct}%</strong>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

/* ------------------------------------------------------------------ hour buckets (unused vehicles) */

export function BucketsWidget({
  w,
  unit,
  columns,
  items,
}: {
  w: WidgetHead;
  unit: string;
  columns: number;
  items: { range: string; value: number; tone: string; image: string }[];
}) {
  return (
    <WidgetCard w={w}>
      <div className="td-buckets-wrap">
        <div className="td-buckets-group">
          <div className="td-buckets" style={css({ '--cols': columns })}>
            {items.map((b) => (
              <div key={b.range} className={`td-bucket tone-${b.tone} has-art`}>
                <span className="td-bucket__range">
                  <Icon name="Clock" size={13} />
                  {b.range}
                </span>
                <strong>{fmt(b.value)}</strong>
                <span className="td-bucket__unit">{unit}</span>
                <Img
                  src={b.image}
                  alt=""
                  width={230}
                  height={66}
                  className="td-bucket__art"
                  fallback={null}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}

/* ------------------------------------------------------------------ card carousel (top 10) */

export interface CarouselItem {
  name: string;
  image?: string;
  highlight: {
    label?: string;
    icon?: string;
    value: number | string;
    unit: string;
    value2?: number;
    unit2?: string;
    caption?: string;
  };
  lines?: string[];
  footer?: { label: string; value: number | string; icon: string };
}

type Part = 'highlight' | 'media' | 'title' | 'footer';

export function CarouselWidget({
  w,
  accent,
  medal,
  rankImages,
  highlightFirst,
  perPage,
  parts,
  items,
}: {
  w: WidgetHead;
  accent: string;
  medal?: boolean;
  rankImages?: string[];
  highlightFirst?: boolean;
  perPage: number;
  parts: Part[];
  items: CarouselItem[];
}) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const [state, setState] = useState({ page: 0, dir: 0 });
  const page = Math.min(state.page, pages - 1);
  const shown = items.slice(page * perPage, page * perPage + perPage);
  const go = (p: number) => {
    const n = Math.max(0, Math.min(pages - 1, p));
    if (n !== page) setState({ page: n, dir: n > page ? 1 : -1 });
  };
  if (!items.length)
    return (
      <WidgetCard w={w}>
        <p className="td-unavailable">No data for this period.</p>
      </WidgetCard>
    );
  return (
    <WidgetCard w={w}>
      <div className="td-carousel">
        <button
          type="button"
          className="td-carousel__arrow"
          onClick={() => go(page - 1)}
          disabled={page === 0}
          aria-label="Previous"
        >
          <Icon name="ChevronLeft" size={16} />
        </button>
        <div
          className={`td-carousel__track ${state.dir > 0 ? 'is-next' : state.dir < 0 ? 'is-prev' : ''}`}
          style={css({ '--per': perPage })}
        >
          {shown.map((it, i) => {
            const rank = page * perPage + i + 1;
            const badge =
              medal && rank <= 3 ? (
                <Medal rank={rank} size={30} />
              ) : (
                <span className="td-pcard__num">{rank}</span>
              );
            return (
              <article
                key={`${page}-${perPage}-${i}`}
                className={`td-pcard tone-${accent} ${rank === 1 && highlightFirst ? 'is-first' : ''}`}
              >
                <span className="td-pcard__rank">
                  {rankImages?.[rank - 1] ? (
                    <Img
                      src={rankImages[rank - 1]}
                      alt={`Rank ${rank}`}
                      width={29}
                      height={32}
                      className="td-pcard__medal"
                      fallback={badge}
                    />
                  ) : (
                    badge
                  )}
                </span>
                {parts.map((p) => (
                  <CardPart key={p} part={p} it={it} />
                ))}
              </article>
            );
          })}
        </div>
        <button
          type="button"
          className="td-carousel__arrow"
          onClick={() => go(page + 1)}
          disabled={page >= pages - 1}
          aria-label="Next"
        >
          <Icon name="ChevronRight" size={16} />
        </button>
      </div>
      <Pager page={page} size={perPage} total={total} onChange={go} />
    </WidgetCard>
  );
}

function CardPart({ part, it }: { part: Part; it: CarouselItem }) {
  switch (part) {
    case 'highlight': {
      const h = it.highlight;
      return (
        <div className="td-pcard__hl">
          {h.label && (
            <small>
              {h.icon && <Icon name={h.icon} size={13} />}
              {h.label}
            </small>
          )}
          <strong>
            {h.value}
            <em>{h.unit}</em>
            {!!h.value2 && (
              <>
                {' '}
                {h.value2}
                <em>{h.unit2}</em>
              </>
            )}
          </strong>
          {h.caption && <span>{h.caption}</span>}
        </div>
      );
    }
    case 'media':
      return (
        <div className="td-pcard__media">
          <Img
            src={it.image}
            alt={it.name}
            width={77}
            height={60}
            className="td-pcard__img"
            fallback={<VehicleThumb icon="Truck" size={44} />}
          />
        </div>
      );
    case 'title':
      return (
        <div className="td-pcard__title">
          <strong>{it.name}</strong>
          {it.lines?.map((l) => (
            <small key={l}>{l}</small>
          ))}
        </div>
      );
    case 'footer':
      return it.footer ? (
        <div className="td-pcard__foot">
          <small>
            <Icon name={it.footer.icon} size={12} />
            {it.footer.label}
          </small>
          <b>{it.footer.value}</b>
        </div>
      ) : null;
  }
}

/* ------------------------------------------------------------------ ranking table */

export type CellValue = number | string | { v: number | string; tone?: string; badge?: string };

export interface RankColumn {
  key: string;
  label: string;
  type?: 'rank' | 'entity' | 'score';
}

export interface RankRow {
  rank: number;
  name: string;
  sub?: string;
  image?: string;
  /** Rows without a picture show the person's initials (drivers). */
  person?: boolean;
  cells: Record<string, CellValue>;
}

function Cell({ value }: { value: CellValue | undefined }) {
  if (value == null) return null;
  if (typeof value !== 'object') return <span>{fmt(value)}</span>;
  return (
    <span className={`td-cell ${value.tone ? `tone-${value.tone} has-tone` : ''}`}>
      <b>{fmt(value.v)}</b>
      {value.badge && <em className={`td-tag tone-${value.tone || 'green'}`}>{value.badge}</em>}
    </span>
  );
}

export function RankTableWidget({
  w,
  columns,
  rows,
  topRanks,
}: {
  w: WidgetHead;
  columns: RankColumn[];
  rows: RankRow[];
  topRanks: number;
}) {
  const shown = rows.filter((r) => r.rank <= topRanks);
  const align = (c: RankColumn) => (c.type === 'entity' ? '' : 'center');
  return (
    <WidgetCard w={w}>
      <div className="td-table-wrap td-rank-scroll">
        <table className="td-table td-rank-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={align(c)}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => {
                  const v = r.cells[c.key];
                  let body: ReactNode;
                  if (c.type === 'rank')
                    body = (
                      <Img
                        src={RANK_IMAGES[r.rank - 1]}
                        alt={`Rank ${r.rank}`}
                        width={26}
                        height={29}
                        className="td-rank-img"
                        fallback={<Medal rank={r.rank} size={28} />}
                      />
                    );
                  else if (c.type === 'entity')
                    body = (
                      <span className="td-entity">
                        {r.person ? (
                          <Avatar name={r.name} tone="green" size={38} />
                        ) : (
                          <Img
                            src={r.image}
                            alt={r.name}
                            width={52}
                            height={40}
                            className="td-entity__img"
                            fallback={<VehicleThumb icon="Truck" size={30} />}
                          />
                        )}
                        <span>
                          <strong>{r.name}</strong>
                          {r.sub && <small>{r.sub}</small>}
                        </span>
                      </span>
                    );
                  else if (c.type === 'score') {
                    const s = v as { v: number; badge?: string } | undefined;
                    body = (
                      <span className="td-score">
                        <b>{fmt(s?.v)}%</b>
                        {s?.badge ? (
                          <em className="td-tag tone-green">{s.badge}</em>
                        ) : (
                          <span className="td-bars" aria-hidden="true">
                            {Array.from({ length: 14 }, (_, k) => (
                              <i
                                key={k}
                                className={k < Math.round(Number(s?.v ?? 0) / 7.2) ? 'on' : ''}
                              />
                            ))}
                          </span>
                        )}
                      </span>
                    );
                  } else body = <Cell value={v} />;
                  return (
                    <td key={c.key} className={align(c)}>
                      {body}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );
}
