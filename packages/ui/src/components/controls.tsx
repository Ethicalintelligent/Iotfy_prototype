// Controls from the approved GPS Vehicle Tracking design (Desktop/vs): Switch, RangeField,
// CheckTree (groups of items with checkboxes), ListCard (a selectable card in a side list) and
// Gauge (speedometer).
import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../cx';
import { Icon } from './basics';

// ---------------------------------------------------------------- Switch
/** An on/off toggle, optionally with "On" / "Off" written beside it. */
export function Switch({
  checked,
  onChange,
  label,
  showState,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Accessible name (also shown when given as text beside the switch with `showState` off). */
  label: string;
  /** Write "On" / "Off" beside it. */
  showState?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={cx('ui-switch', disabled && 'is-disabled')}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="ui-switch__track" aria-hidden="true">
        <span />
      </span>
      {showState && <span className="ui-switch__state">{checked ? 'On' : 'Off'}</span>}
    </label>
  );
}

// ---------------------------------------------------------------- RangeField
/** A slider with its label and the current value under it ("Zone Radius · 300 m"). */
export function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v) => String(v),
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="ui-range">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={{ '--p': `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <b>{format(value)}</b>
    </div>
  );
}

// ---------------------------------------------------------------- CheckTree
export interface CheckTreeGroup {
  key: string;
  label: string;
  items: { key: string; label: string; detail?: string }[];
}
/**
 * Groups of items with checkboxes and a search box: tick a group to tick all its items
 * (vehicles by group in Alert Configuration and Geo Association).
 */
export function CheckTree({
  groups,
  selected,
  onChange,
  label,
  searchPlaceholder = 'Search…',
  max,
}: {
  groups: CheckTreeGroup[];
  selected: Set<string>;
  onChange: (keys: Set<string>) => void;
  label: string;
  searchPlaceholder?: string;
  /** At most this many items can be ticked. */
  max?: number;
}) {
  const [q, setQ] = useState('');
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const query = q.trim().toLowerCase();
  const shown = groups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (i) =>
          !query || i.label.toLowerCase().includes(query) || g.label.toLowerCase().includes(query),
      ),
    }))
    .filter((g) => g.items.length);
  const set = (keys: string[], on: boolean) => {
    const next = new Set(selected);
    for (const k of keys) {
      if (on) {
        if (max == null || next.size < max) next.add(k);
      } else next.delete(k);
    }
    onChange(next);
  };
  return (
    <div className="ui-ctree" role="group" aria-label={label}>
      <div className="ui-ctree__search">
        <Icon name="search" size={14} />
        <input
          value={q}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="ui-ctree__count">
        {selected.size} selected{max != null ? ` (up to ${max})` : ''}
      </div>
      <div className="ui-ctree__list">
        {shown.map((g) => {
          const keys = g.items.map((i) => i.key);
          const on = keys.filter((k) => selected.has(k)).length;
          const open = !closed.has(g.key);
          return (
            <div key={g.key} className="ui-ctree__group">
              <div className="ui-ctree__head">
                <button
                  type="button"
                  aria-label={open ? `Close ${g.label}` : `Open ${g.label}`}
                  aria-expanded={open}
                  onClick={() => {
                    const next = new Set(closed);
                    if (open) next.add(g.key);
                    else next.delete(g.key);
                    setClosed(next);
                  }}
                >
                  <Icon name={open ? 'down' : 'chev'} size={13} />
                </button>
                <label>
                  <input
                    type="checkbox"
                    checked={on === keys.length}
                    ref={(el) => {
                      if (el) el.indeterminate = on > 0 && on < keys.length;
                    }}
                    onChange={() => set(keys, on < keys.length)}
                  />
                  {g.label}
                </label>
              </div>
              {open &&
                g.items.map((i) => (
                  <label key={i.key} className="ui-ctree__item">
                    <input
                      type="checkbox"
                      checked={selected.has(i.key)}
                      onChange={() => set([i.key], !selected.has(i.key))}
                    />
                    {i.label}
                    {i.detail && <small>{i.detail}</small>}
                  </label>
                ))}
            </div>
          );
        })}
        {!shown.length && <div className="ui-ctree__none">Nothing matches.</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- ListCard
/** A selectable card in a side list (vehicles, geofences): lead, title, subtitle, badge, chips. */
export function ListCard({
  lead,
  title,
  subtitle,
  badge,
  chips,
  actions,
  selected,
  onClick,
}: {
  lead?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Top right (e.g. a status HueChip). */
  badge?: ReactNode;
  /** A row under the subtitle (e.g. AC and seat-belt chips). */
  chips?: ReactNode;
  /** Buttons at the top right instead of / beside the badge (edit, delete). */
  actions?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  // The title is the card's button (keyboard and screen readers); a click anywhere on the card
  // does the same for the mouse. The card itself isn't a button, so its action buttons aren't
  // nested inside one.
  return (
    <div className={cx('ui-lcard', selected && 'is-on', onClick && 'is-click')} onClick={onClick}>
      {lead && <span className="ui-lcard__lead">{lead}</span>}
      <span className="ui-lcard__body">
        <span className="ui-lcard__top">
          {onClick ? (
            <button type="button" className="ui-lcard__title" aria-pressed={!!selected}>
              {title}
            </button>
          ) : (
            <b>{title}</b>
          )}
          {badge}
          {actions && (
            <span className="ui-lcard__actions" onClick={(e) => e.stopPropagation()}>
              {actions}
            </span>
          )}
        </span>
        {subtitle && <span className="ui-lcard__sub">{subtitle}</span>}
        {chips && <span className="ui-lcard__chips">{chips}</span>}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- Gauge
/** A speedometer: half-circle with ticks, a coloured arc to the value and the value in the middle. */
export function Gauge({
  value,
  max = 200,
  unit = 'km/h',
  label,
  size = 130,
  limit,
}: {
  value: number;
  max?: number;
  unit?: string;
  /** Accessible name, e.g. "Speed". */
  label: string;
  size?: number;
  /** Above this the arc turns red (e.g. the speed limit). */
  limit?: number;
}) {
  const r = 46;
  const cx0 = 60;
  const cy0 = 60;
  const angle = (v: number) => Math.PI * (1 - Math.min(Math.max(v, 0), max) / max);
  const pt = (v: number, rr: number): [number, number] => [
    cx0 + rr * Math.cos(angle(v)),
    cy0 - rr * Math.sin(angle(v)),
  ];
  const [ex, ey] = pt(value, r);
  const over = limit != null && value > limit;
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  return (
    <svg
      viewBox="0 0 120 76"
      width={size}
      height={(size * 76) / 120}
      role="img"
      aria-label={`${label}: ${value} ${unit}`}
      className={cx('ui-gauge', over && 'is-over')}
    >
      <path
        d={`M ${cx0 - r} ${cy0} A ${r} ${r} 0 0 1 ${cx0 + r} ${cy0}`}
        className="ui-gauge__track"
      />
      {value > 0 && (
        <path
          d={`M ${cx0 - r} ${cy0} A ${r} ${r} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`}
          className="ui-gauge__arc"
        />
      )}
      {ticks.map((t) => {
        const [x1, y1] = pt(t, r + 5);
        const [tx, ty] = pt(t, r + 12);
        return (
          <g key={t}>
            <circle cx={x1} cy={y1} r={0.9} className="ui-gauge__tick" />
            <text x={tx} y={ty + 2} className="ui-gauge__label">
              {Math.round(t)}
            </text>
          </g>
        );
      })}
      <circle cx={cx0} cy={cy0} r={17} className="ui-gauge__hub" />
      <text x={cx0} y={cy0 + 1} className="ui-gauge__value">
        {Math.round(value)}
      </text>
      <text x={cx0} y={cy0 + 9} className="ui-gauge__unit">
        {unit}
      </text>
    </svg>
  );
}
