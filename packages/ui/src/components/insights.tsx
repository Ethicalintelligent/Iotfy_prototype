// Dashboard pieces from the approved GPS Vehicle Tracking design (Desktop/vs, Nov 2026): status
// tiles, the alert ticker, bar lists, value pills, the activity timeline, a pill select, a paged
// card row, rank badges and cards, share and count tiles, mini stats and a colour legend.
// Colours come from the --hue-* tokens through `hue` props; products never pass colours.
import { useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../cx';
import type { IconName } from '../icons';
import { Icon, IconTile, type Hue } from './basics';
import medal1 from '../assets/medal-1.png';
import medal2 from '../assets/medal-2.png';
import medal3 from '../assets/medal-3.png';

// ---------------------------------------------------------------- StatusTile
export interface StatusTileProps {
  label: string;
  value: ReactNode;
  /** Small coloured line under the value, e.g. "41.7% of total". */
  sub?: ReactNode;
  icon: IconName;
  hue: Hue;
  /** Highlighted (the current filter). */
  active?: boolean;
  /** Makes the tile a button (e.g. filter by this status). */
  onClick?: () => void;
  /** Smaller icon and value (one-line strips). */
  compact?: boolean;
}
/** A count with a solid icon tile: "Running 10 · 41.7% of total". */
export function StatusTile({
  label,
  value,
  sub,
  icon,
  hue,
  active,
  onClick,
  compact,
}: StatusTileProps) {
  const cls = cx(
    'ui-stile',
    `ui-hue--${hue}`,
    active && 'is-on',
    compact && 'ui-stile--compact',
    onClick && 'ui-stile--button',
  );
  const body = (
    <>
      <IconTile icon={icon} hue={hue} size={compact ? 'md' : 'lg'} variant="solid" />
      <span className="ui-stile__text">
        <span className="ui-stile__label">{label}</span>
        <b className="ui-stile__value">{value}</b>
        {sub != null && <span className="ui-stile__sub">{sub}</span>}
      </span>
    </>
  );
  return onClick ? (
    <button type="button" className={cls} onClick={onClick} aria-pressed={!!active}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Responsive row of StatusTiles (wraps; each at least `min` px wide, default 150). */
export function StatusTileRow({ children, min = 150 }: { children: ReactNode; min?: number }) {
  return <AutoGrid min={min}>{children}</AutoGrid>;
}

/** Tiles side by side that wrap: each at least `min` px wide (default 150). */
export function AutoGrid({
  children,
  min = 150,
  gap = 10,
}: {
  children: ReactNode;
  min?: number;
  gap?: number;
}) {
  return (
    <div className="ui-stiles" style={{ '--min': `${min}px`, gap: `${gap}px` } as CSSProperties}>
      {children}
    </div>
  );
}

/** Dashboard panels in two columns (one column below 1100 px). `wide` children span both. */
export function PanelGrid({ children }: { children: ReactNode }) {
  return <div className="ui-panels">{children}</div>;
}
/** A panel spanning both PanelGrid columns. */
export function PanelWide({ children }: { children: ReactNode }) {
  return <div className="ui-panels__wide">{children}</div>;
}

// ---------------------------------------------------------------- TickerStrip
export interface TickerItem {
  key: string;
  label: string;
  count: ReactNode;
  icon: IconName;
  hue: Hue;
}
/**
 * A slowly scrolling strip of counts with a lead pill ("Today Alerts"). Pauses on hover; when the
 * user prefers reduced motion it doesn't move and scrolls by hand instead.
 */
export function TickerStrip({
  lead,
  items,
  label,
}: {
  lead: ReactNode;
  items: TickerItem[];
  label: string;
}) {
  const chips = (copy: boolean) =>
    items.map((it) => (
      <span
        key={it.key + (copy ? '-copy' : '')}
        className={cx('ui-ticker__item', `ui-hue--${it.hue}`, copy && 'ui-ticker__copy')}
        aria-hidden={copy || undefined}
      >
        <span className="ui-ticker__icon">
          <Icon name={it.icon} size={13} />
        </span>
        {it.label}: <b>{it.count}</b>
      </span>
    ));
  return (
    <div className="ui-ticker" role="region" aria-label={label}>
      <span className="ui-ticker__lead">
        <i />
        {lead}
      </span>
      <div className="ui-ticker__viewport">
        <div
          className="ui-ticker__track"
          style={{ '--dur': `${Math.max(24, items.length * 5)}s` } as CSSProperties}
        >
          {chips(false)}
          {items.length > 0 && chips(true)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- BarList
export interface BarListRow {
  key: string;
  label: ReactNode;
  /** Icon before the label. */
  icon?: IconName;
  value: number;
  /** What to print at the end (default the value). */
  display?: ReactNode;
  hue?: Hue;
}
/** Rows of label · bar · value (zone entries, vehicles per speed range…). */
export function BarList({
  rows,
  max,
  label,
  labelWidth = 180,
}: {
  rows: BarListRow[];
  /** The full-bar value (default the largest value). */
  max?: number;
  label: string;
  labelWidth?: number;
}) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul
      className="ui-barlist"
      aria-label={label}
      style={{ '--lw': `${labelWidth}px` } as CSSProperties}
    >
      {rows.map((r) => (
        <li key={r.key} className={cx('ui-barlist__row', `ui-hue--${r.hue ?? 'green'}`)}>
          <span className="ui-barlist__label">
            {r.icon && <Icon name={r.icon} size={15} />}
            {r.label}
          </span>
          <span className="ui-barlist__track" aria-hidden="true">
            <span style={{ width: `${Math.min(100, (r.value / top) * 100)}%` }} />
          </span>
          <b className="ui-barlist__value">{r.display ?? r.value}</b>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- HueChip
/** A small tinted pill in a hue, with a dot or an icon ("● Running", "❄ AC On"). */
export function HueChip({
  hue,
  icon,
  solid,
  children,
}: {
  hue: Hue;
  /** Icon instead of the dot. */
  icon?: IconName;
  /** Filled (white text), e.g. a status on a card corner. */
  solid?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={cx('ui-hchip', `ui-hue--${hue}`, solid && 'ui-hchip--solid')}>
      {icon ? <Icon name={icon} size={11} /> : <i />}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- MetricPill
/** A wide tinted pill holding one number (alert summary cells). */
export function MetricPill({ hue = 'green', children }: { hue?: Hue; children: ReactNode }) {
  return <span className={cx('ui-mpill', `ui-hue--${hue}`)}>{children}</span>;
}

// ---------------------------------------------------------------- Legend
/** Coloured dots with labels (chart and timeline legends). */
export function Legend({ items }: { items: { label: string; hue: Hue }[] }) {
  return (
    <ul className="ui-legend">
      {items.map((i) => (
        <li key={i.label} className={`ui-hue--${i.hue}`}>
          <i />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- ActivityTimeline
export interface TimelineSegment {
  /** Hours from midnight, 0–24. */
  from: number;
  to: number;
  hue: Hue;
  /** Tooltip, e.g. "Running 08:10–09:40". */
  title?: string;
}
export interface TimelineRow {
  key: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Picture or icon before the title. */
  lead?: ReactNode;
  segments: TimelineSegment[];
}
/** One bar per row across the day (00:00–24:00), coloured by what happened when. */
export function ActivityTimeline({
  rows,
  label,
  leadHeader = 'Vehicle',
  ticks = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
}: {
  rows: TimelineRow[];
  label: string;
  leadHeader?: string;
  ticks?: number[];
}) {
  const pct = (h: number) => `${(Math.max(0, Math.min(24, h)) / 24) * 100}%`;
  return (
    <div className="ui-tline" role="table" aria-label={label}>
      <div className="ui-tline__row ui-tline__head" role="row">
        <span role="columnheader">{leadHeader}</span>
        <span className="ui-tline__ticks" role="columnheader">
          {ticks.map((t) => (
            <i key={t} style={{ left: pct(t) }}>
              {String(t).padStart(2, '0')}:00
            </i>
          ))}
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.key} className="ui-tline__row" role="row">
          <span className="ui-tline__who" role="rowheader">
            {r.lead}
            <span>
              <b>{r.title}</b>
              {r.subtitle && <small>{r.subtitle}</small>}
            </span>
          </span>
          <span className="ui-tline__track" role="cell">
            {r.segments.map((s, i) => (
              <span
                key={i}
                className={`ui-hue--${s.hue}`}
                style={{ left: pct(s.from), width: `calc(${pct(s.to)} - ${pct(s.from)})` }}
                title={s.title}
              />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- PillSelect
/** A compact drop-down shaped like a pill button ("Yesterday ▾", "All Vehicles ▾"). */
export function PillSelect<V extends string>({
  value,
  onChange,
  options,
  icon,
  label,
}: {
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string }[];
  icon?: IconName;
  /** Accessible name. */
  label: string;
}) {
  return (
    <label className="ui-pillselect">
      {icon && <Icon name={icon} size={14} />}
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as V)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="down" size={14} className="ui-pillselect__chev" />
    </label>
  );
}

// ---------------------------------------------------------------- PagedRow
/** Cards side by side, a page at a time, with arrows and "Showing 1–5 of 10". */
export function PagedRow({
  items,
  perPage = 5,
  label,
}: {
  items: ReactNode[];
  perPage?: number;
  label: string;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const p = Math.min(page, pages - 1);
  const from = p * perPage;
  const shown = items.slice(from, from + perPage);
  return (
    <div className="ui-paged" role="group" aria-label={label}>
      <div className="ui-paged__body">
        <button
          type="button"
          className="ui-paged__arrow"
          aria-label="Previous"
          disabled={p === 0}
          onClick={() => setPage(p - 1)}
        >
          <Icon name="back" size={14} />
        </button>
        <div className="ui-paged__items" style={{ '--n': perPage } as CSSProperties}>
          {shown}
        </div>
        <button
          type="button"
          className="ui-paged__arrow"
          aria-label="Next"
          disabled={p >= pages - 1}
          onClick={() => setPage(p + 1)}
        >
          <Icon name="chev" size={14} />
        </button>
      </div>
      {items.length > 0 && (
        <div className="ui-paged__foot">
          <span>
            Showing {from + 1}–{from + shown.length} of {items.length}
          </span>
          <span className="ui-paged__pages">
            {[...Array(pages)].map((_, i) => (
              <button
                key={i}
                type="button"
                className={cx(i === p && 'is-on')}
                aria-current={i === p || undefined}
                onClick={() => setPage(i)}
              >
                {i + 1}
              </button>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- RankBadge and RankCard
const MEDALS = [medal1, medal2, medal3];
/** Gold, silver and bronze medals for 1–3; a numbered circle after that. */
export function RankBadge({ rank, size = 30 }: { rank: number; size?: number }) {
  const medal = MEDALS[rank - 1];
  return medal ? (
    <img
      src={medal}
      alt={`Rank ${rank}`}
      width={size}
      height={Math.round(size * 1.1)}
      className="ui-rank"
    />
  ) : (
    <span className="ui-rank ui-rank--n" style={{ width: size * 0.8, height: size * 0.8 }}>
      {rank}
    </span>
  );
}

export interface RankCardProps {
  rank: number;
  /** Big number, e.g. "334". */
  value: ReactNode;
  unit?: ReactNode;
  /** Small line above the value, e.g. "Unused for". */
  caption?: ReactNode;
  picture?: ReactNode;
  /** Coloured line under the divider (e.g. the plate). */
  title: ReactNode;
  subtitle?: ReactNode;
  /** Bottom block (e.g. "Inactive since · Just now"). */
  footer?: ReactNode;
  hue?: Hue;
}
/** A ranked card: medal, big value, picture, plate and model (top-10 lists). */
export function RankCard({
  rank,
  value,
  unit,
  caption,
  picture,
  title,
  subtitle,
  footer,
  hue = 'blue',
}: RankCardProps) {
  return (
    <div className={cx('ui-rcard', `ui-hue--${hue}`, rank === 1 && 'is-first')}>
      <span className="ui-rcard__badge">
        <RankBadge rank={rank} size={26} />
      </span>
      {caption && <span className="ui-rcard__caption">{caption}</span>}
      <b className="ui-rcard__value">
        {value}
        {unit && <small>{unit}</small>}
      </b>
      {picture && <span className="ui-rcard__pic">{picture}</span>}
      <span className="ui-rcard__title">{title}</span>
      {subtitle && <span className="ui-rcard__sub">{subtitle}</span>}
      {footer && <span className="ui-rcard__foot">{footer}</span>}
    </div>
  );
}

// ---------------------------------------------------------------- ShareTile and CountTile
/** Share of a whole: icon, label, a small chip ("97 hrs"), big percent and a bar. */
export function ShareTile({
  label,
  icon,
  hue,
  chip,
  percent,
}: {
  label: string;
  icon: IconName;
  hue: Hue;
  chip?: ReactNode;
  /** 0–100. */
  percent: number;
}) {
  return (
    <div className={cx('ui-share', `ui-hue--${hue}`)}>
      <IconTile icon={icon} hue={hue} size="lg" variant="solid" />
      <b className="ui-share__label">{label}</b>
      {chip && <span className="ui-share__chip">{chip}</span>}
      <b className="ui-share__pct">{percent.toFixed(1)}%</b>
      <span className="ui-share__bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, percent)}%` }} />
      </span>
    </div>
  );
}

/** A tinted tile with a label, a big number and a unit ("24-48 hrs · 3 · Vehicles"). */
export function CountTile({
  label,
  value,
  unit,
  icon,
  hue = 'red',
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  icon?: IconName;
  hue?: Hue;
}) {
  return (
    <div className={cx('ui-ctile', `ui-hue--${hue}`)}>
      <span className="ui-ctile__label">
        {icon && <Icon name={icon} size={14} />}
        {label}
      </span>
      <b className="ui-ctile__value">{value}</b>
      {unit && <span className="ui-ctile__unit">{unit}</span>}
    </div>
  );
}

// ---------------------------------------------------------------- MiniStat
/** Icon, a number with a unit and a small label ("29,499 Km · Avg. Odometer"). */
export function MiniStat({
  icon,
  value,
  unit,
  label,
  hue = 'green',
}: {
  icon: IconName;
  value: ReactNode;
  unit?: ReactNode;
  label: ReactNode;
  hue?: Hue;
}) {
  return (
    <div className="ui-ministat">
      <IconTile icon={icon} hue={hue} size="sm" />
      <span>
        <b>
          {value}
          {unit && <small> {unit}</small>}
        </b>
        <small>{label}</small>
      </span>
    </div>
  );
}
