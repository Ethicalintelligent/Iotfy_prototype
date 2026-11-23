// Asset cards from the approved GPS Vehicle Tracking design (Desktop/vs, Grid View): a card with
// a status-coloured top edge that can turn over to a back side, a strip of on/off indicator
// icons, a box of facts (Operator, Speed, Location, Odometer), small coloured action icons,
// reading tiles with a range bar and labelled info rows for the back side. Also a pager for card
// grids ("Showing 1–12 of 24 ‹ 1 2 ›") and a white overlay pill for maps ("● Live · Updated").
import '../styles/asset-card.css';
import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../cx';
import type { IconName } from '../icons';
import { Icon, IconTile, type Hue } from './basics';

// ---------------------------------------------------------------- AssetCard
export interface AssetCardBack {
  title: string;
  subtitle?: ReactNode;
  icon?: IconName;
  /** Turns the card back to its front. */
  onClose: () => void;
  children: ReactNode;
}

/**
 * A card for one asset: coloured top edge (`hue`), picture, title, subtitle and a badge, then
 * any content and a footer. Give `back` to show the back side over the front (same size,
 * scrolls), e.g. sensors and device details.
 */
export function AssetCard({
  hue = 'green',
  lead,
  title,
  subtitle,
  badge,
  children,
  note,
  noteIcon = 'clock',
  footer,
  back,
}: {
  hue?: Hue;
  lead?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
  /** A small grey line above the footer (e.g. the last report time). */
  note?: ReactNode;
  noteIcon?: IconName;
  footer?: ReactNode;
  back?: AssetCardBack | null;
}) {
  return (
    <article className={cx('ui-acard', `ui-hue--${hue}`, back && 'is-back')}>
      <div className="ui-acard__front" aria-hidden={back ? true : undefined}>
        <header className="ui-acard__head">
          {lead && <span className="ui-acard__lead">{lead}</span>}
          <span className="ui-acard__titles">
            <b>{title}</b>
            {subtitle != null && <small>{subtitle}</small>}
          </span>
          {badge}
        </header>
        {children}
        {(note != null || footer) && (
          <div className="ui-acard__foot">
            {note != null && (
              <p className="ui-acard__note">
                <Icon name={noteIcon} size={13} />
                {note}
              </p>
            )}
            {footer}
          </div>
        )}
      </div>
      {back && (
        <section className="ui-acard__back" aria-label={back.title}>
          <header className="ui-acard__backhead">
            <IconTile icon={back.icon ?? 'pulse'} hue="green" size="sm" variant="solid" />
            <span className="ui-acard__titles">
              <b>{back.title}</b>
              {back.subtitle != null && <small>{back.subtitle}</small>}
            </span>
            <button
              type="button"
              className="ui-acard__close"
              aria-label="Back to the card"
              title="Back to the card"
              onClick={back.onClose}
            >
              <Icon name="close" size={15} />
            </button>
          </header>
          <div className="ui-acard__backbody">{back.children}</div>
        </section>
      )}
    </article>
  );
}

// ---------------------------------------------------------------- IndicatorStrip / Indicator
/** A tinted row of Indicators, with optional content at its end (e.g. a "more" button). */
export function IndicatorStrip({
  label,
  children,
  end,
  bare,
}: {
  /** Accessible name, e.g. "Truck 01 sensors". */
  label: string;
  children: ReactNode;
  end?: ReactNode;
  /** No tinted box (e.g. inside a table cell). */
  bare?: boolean;
}) {
  return (
    <div className={cx('ui-istrip', bare && 'ui-istrip--bare')}>
      <span className="ui-istrip__items" role="list" aria-label={label}>
        {children}
      </span>
      {end && <span className="ui-istrip__end">{end}</span>}
    </div>
  );
}

/**
 * One sensor or device state as a small icon: `on` (coloured on a tint), `off` (coloured, no
 * tint) or `none` (grey and struck through: not configured or no data). `label` is the tooltip.
 */
export function Indicator({
  icon,
  label,
  hue = 'green',
  state = 'on',
}: {
  icon: IconName;
  label: string;
  hue?: Hue;
  state?: 'on' | 'off' | 'none';
}) {
  return (
    <span
      role="listitem"
      className={cx('ui-ind', `ui-hue--${hue}`, `is-${state}`)}
      title={label}
      aria-label={label}
    >
      <Icon name={icon} size={14} />
    </span>
  );
}

// ---------------------------------------------------------------- FactGrid
export interface Fact {
  key: string;
  label: string;
  icon?: IconName;
  value: ReactNode;
  /** Colours the label (e.g. Speed in the status colour). */
  hue?: Hue;
  /** Full text when the value is cut short. */
  title?: string;
}
/** Label-over-value pairs in a tinted box, two per row (Operator, Speed, Location, Odometer). */
export function FactGrid({ items, cols = 2 }: { items: Fact[]; cols?: number }) {
  return (
    <dl className="ui-facts" style={{ '--cols': cols } as CSSProperties}>
      {items.map((f) => (
        <div key={f.key} className={cx('ui-fact', f.hue && `ui-hue--${f.hue}`)}>
          <dt>
            {f.icon && <Icon name={f.icon} size={12} />}
            {f.label}
          </dt>
          <dd title={f.title}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------- ActionIcon
/** A small tinted icon button in a row of card actions (view, report, settings…). */
export function ActionIcon({
  icon,
  label,
  hue = 'slate',
  onClick,
  disabled,
}: {
  icon: IconName;
  /** Accessible name and tooltip. */
  label: string;
  hue?: Hue;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={cx('ui-aicon', `ui-hue--${hue}`)}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

// ---------------------------------------------------------------- ReadingTile
/** A sensor reading: label, big value, a small line and, with `percent`, a bar with its range. */
export function ReadingTile({
  icon,
  label,
  value,
  sub,
  hue = 'green',
  percent,
  range,
}: {
  icon: IconName;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  hue?: Hue;
  /** Where the value sits in its range, 0–100. */
  percent?: number;
  /** The range as text, e.g. "-10 – 8 °C". */
  range?: ReactNode;
}) {
  return (
    <div className={cx('ui-reading', `ui-hue--${hue}`)}>
      <IconTile icon={icon} hue={hue} size="sm" />
      <span className="ui-reading__text">
        <small>{label}</small>
        <b>{value}</b>
        {sub != null && <small>{sub}</small>}
      </span>
      {percent != null && (
        <span className="ui-reading__range">
          <span className="ui-reading__bar">
            <i style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
          </span>
          {range != null && <small>{range}</small>}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- InfoRows
export interface InfoRow {
  key: string;
  label: string;
  icon?: IconName;
  value: ReactNode;
  /** Small line under the value. */
  detail?: ReactNode;
  /** Colours the value (e.g. red for "Disconnected"); grey when left out. */
  hue?: Hue;
}
/** A small uppercase heading with rows of label and value (e.g. Connectivity: GPS, GSM). */
export function InfoRows({
  heading,
  icon,
  count,
  rows = [],
  empty,
  children,
}: {
  heading: string;
  icon?: IconName;
  /** Shown at the right of the heading. */
  count?: ReactNode;
  rows?: InfoRow[];
  /** Shown when there are no rows and no children. */
  empty?: ReactNode;
  /** Other content under the heading (e.g. ReadingTiles). */
  children?: ReactNode;
}) {
  return (
    <div className="ui-inforows">
      <div className="ui-inforows__head">
        {icon && <Icon name={icon} size={13} />}
        <span>{heading}</span>
        {count != null && <b>{count}</b>}
      </div>
      {children}
      {rows.length ? (
        <dl>
          {rows.map((r) => (
            <div key={r.key} className={cx('ui-inforow', r.hue && `ui-hue--${r.hue}`)}>
              <dt>
                {r.icon && <Icon name={r.icon} size={13} />}
                {r.label}
              </dt>
              <dd>
                <b>{r.value}</b>
                {r.detail != null && <small>{r.detail}</small>}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        !children && empty != null && <p className="ui-inforows__empty">{empty}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Pager
/** "Showing 1–12 of 24" with ‹ page numbers › for a grid of cards. `page` starts at 0. */
export function Pager({
  page,
  pageSize,
  total,
  onPage,
  label = 'Pages',
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  label?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(page, pages - 1);
  const from = total ? p * pageSize + 1 : 0;
  const to = Math.min(total, (p + 1) * pageSize);
  return (
    <nav className="ui-pager" aria-label={label}>
      <span className="ui-pager__info">
        Showing {from}–{to} of {total}
      </span>
      <button
        type="button"
        className="ui-pager__btn"
        aria-label="Previous page"
        disabled={p === 0}
        onClick={() => onPage(p - 1)}
      >
        <Icon name="back" size={14} />
      </button>
      {Array.from({ length: pages }, (_, i) => (
        <button
          key={i}
          type="button"
          className={cx('ui-pager__btn', i === p && 'is-on')}
          aria-current={i === p ? 'page' : undefined}
          aria-label={`Page ${i + 1}`}
          onClick={() => onPage(i)}
        >
          {i + 1}
        </button>
      ))}
      <button
        type="button"
        className="ui-pager__btn"
        aria-label="Next page"
        disabled={p >= pages - 1}
        onClick={() => onPage(p + 1)}
      >
        <Icon name="chev" size={14} />
      </button>
    </nav>
  );
}

// ---------------------------------------------------------------- OverlayPill
/** A white pill with a coloured dot, for overlays on maps ("● Live · Updated 14:29:05 ⟳"). */
export function OverlayPill({
  hue = 'green',
  children,
  action,
  pulse,
}: {
  hue?: Hue;
  children: ReactNode;
  /** A small round button at the end (e.g. refresh). */
  action?: { icon: IconName; label: string; onClick: () => void };
  /** A gently pulsing dot (off for reduced motion). */
  pulse?: boolean;
}) {
  return (
    <span className={cx('ui-opill', `ui-hue--${hue}`, pulse && 'is-pulse')}>
      <i aria-hidden="true" />
      <span>{children}</span>
      {action && (
        <button
          type="button"
          aria-label={action.label}
          title={action.label}
          onClick={action.onClick}
        >
          <Icon name={action.icon} size={14} />
        </button>
      )}
    </span>
  );
}
