import { Fragment, useState, type ReactNode } from 'react';
import eitLogo from '../assets/eit-logo.svg';
import { cx } from '../cx';
import type { IconName } from '../icons';
import { Icon } from './basics';

// ---------------------------------------------------------------- PageHeader
export interface PageHeaderProps {
  title: ReactNode;
  /** About this page: hidden behind the ⓘ button. */
  description?: ReactNode;
  /** On detail pages: "← Assets ›" back link before the title. */
  back?: { label: string; onClick: () => void };
  /** Grey text after the title on detail pages (e.g. the record ID). */
  meta?: ReactNode;
  /** Top-right header tools: search, notifications, avatar. Never page actions. */
  tools?: ReactNode;
}
/** One thin title row (~40 px). Page actions (+ Add, Edit) go next to the content, not here. */
export function PageHeader({ title, description, back, meta, tools }: PageHeaderProps) {
  const [info, setInfo] = useState(false);
  return (
    <div className="ui-ph">
      <div className="ui-ph__lead">
        {back && (
          <>
            <button type="button" className="ui-ph__back" onClick={back.onClick}>
              ← {back.label}
            </button>
            <span className="ui-ph__sep">›</span>
          </>
        )}
        <h1 className="ui-ph__title">{title}</h1>
        {meta && <p className="ui-ph__meta">{meta}</p>}
        {description && (
          <>
            <button
              type="button"
              className="ui-ph__info"
              aria-label="About this page"
              aria-expanded={info}
              title={typeof description === 'string' ? description : undefined}
              onClick={() => setInfo((v) => !v)}
            >
              i
            </button>
            {info && (
              <p className="ui-ph__desc" role="note">
                {description}
              </p>
            )}
          </>
        )}
      </div>
      {tools && <div className="ui-ph__tools">{tools}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- KPI tile
export interface KpiTileProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  /** Colours the sub line: ok = green, warn = amber. */
  tone?: 'ok' | 'warn';
}
export function KpiTile({ label, value, sub, tone }: KpiTileProps) {
  return (
    <div className="ui-card ui-kpi">
      <span className="ui-kpi__label">{label}</span>
      <b className="ui-kpi__value">{value}</b>
      {sub && <small className={cx('ui-kpi__sub', tone && `ui-kpi__sub--${tone}`)}>{sub}</small>}
    </div>
  );
}
/** Responsive row of KPI tiles (dashboard: 4). */
export function KpiRow({ children }: { children: ReactNode }) {
  return <div className="ui-kpis">{children}</div>;
}

// ---------------------------------------------------------------- BarChart
export interface BarChartProps {
  values: number[];
  /** One label per bar, shown underneath (e.g. weekdays). */
  labels: string[];
  /** Accessible description of the chart. */
  label: string;
  /** Formats the value printed above each bar. */
  format?: (v: number) => string;
  /** Bar drawn in the strong colour (default: the last, i.e. today). */
  highlight?: number;
}
/** Small column chart, as on the legacy dashboards (7-day trend). */
export function BarChart({
  values,
  labels,
  label,
  format = (v) => String(v),
  highlight = values.length - 1,
}: BarChartProps) {
  const max = Math.max(1, ...values);
  const step = 58;
  const width = 28 + values.length * step - (step - 34);
  return (
    <svg viewBox={`0 0 ${width} 150`} className="ui-barchart" role="img" aria-label={label}>
      {values.map((v, i) => {
        const h = Math.max(4, (v / max) * 96);
        const x = 14 + i * step;
        return (
          <g key={i}>
            <rect
              x={x}
              y={122 - h}
              width={34}
              height={h}
              rx={5}
              fill={i === highlight ? 'var(--chart-bar-on)' : 'var(--chart-bar)'}
            />
            <text
              x={x + 17}
              y={116 - h}
              textAnchor="middle"
              fontSize={10}
              fontWeight={700}
              fill="var(--chart-value)"
            >
              {format(v)}
            </text>
            <text x={x + 17} y={140} textAnchor="middle" fontSize={10} fill="var(--chart-label)">
              {labels[i] ?? ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------- Rail
export interface RailItem {
  key: string;
  label: string;
  icon: IconName;
  badge?: number;
  badgeTone?: 'red' | 'amber';
}
export interface RailSection {
  heading: string;
  items: RailItem[];
}
export interface RailProps {
  /** Name shown beside the logo when the rail is open (product or brand name). */
  brand: string;
  /** Second line under the brand (e.g. the role). */
  subtitle?: string;
  /** Up to 3 letters in the logo square. */
  logoText?: string;
  /** Background of the logo square (white-label dealers); default is the EIT gradient. */
  logoColor?: string | null;
  /** Logo image (white-label dealers). Replaces the letters. */
  logoUrl?: string | null;
  sections: RailSection[];
  active: string;
  onSelect: (key: string) => void;
  /** Extra buttons at the bottom of the rail. */
  footer?: ReactNode;
  /** Phones: the rail slides in when true. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /**
   * `grouped`: full-width divider lines between sections (no heading text) and the active item
   * as a brand-gradient pill with a mint edge bar. Look only; items and behaviour are the same.
   */
  look?: 'default' | 'grouped';
  /** Support card at the bottom of the open rail (e.g. "24/7 Support" + Contact Support). */
  support?: { title: string; subtitle: string; action: string; onAction: () => void };
}
/** A button for the Rail's `footer` (e.g. Help, Back). Same look as a menu item. */
export function RailButton({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="ui-rail__item" title={label} onClick={onClick}>
      <Icon name={icon} />
      <span className="ui-rail__label">{label}</span>
    </button>
  );
}

/** Left navigation: 56 px icons only, opens on hover (no click), closes when a page is chosen. */
export function Rail({
  brand,
  subtitle,
  logoText = 'EIT',
  logoColor,
  logoUrl,
  sections,
  active,
  onSelect,
  footer,
  mobileOpen,
  onMobileClose,
  look = 'default',
  support,
}: RailProps) {
  // Grouped look without a dealer logo or dealer colour: the EIT logo image.
  const src = logoUrl ?? (look === 'grouped' && !logoColor ? eitLogo : null);
  const [hover, setHover] = useState(false);
  const choose = (key: string) => {
    setHover(false);
    onMobileClose?.();
    onSelect(key);
  };
  return (
    <>
      <div
        className={cx('ui-rail-scrim', mobileOpen && 'ui-rail-scrim--open')}
        onClick={onMobileClose}
      />
      <aside
        className={cx(
          'ui-rail',
          look === 'grouped' && 'ui-rail--grouped',
          hover && 'ui-rail--open',
          mobileOpen && 'ui-rail--mobile-open',
        )}
        aria-label="Main menu"
        onMouseEnter={() => window.innerWidth > 900 && setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => window.innerWidth > 900 && setHover(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHover(false)}
      >
        <div className="ui-rail__brand">
          {src ? (
            <img
              className="ui-logo"
              src={src}
              alt=""
              style={{ background: 'var(--white)', objectFit: 'contain' }}
            />
          ) : (
            <span
              className="ui-logo"
              aria-hidden="true"
              style={logoColor ? { background: logoColor } : undefined}
            >
              {logoText.slice(0, 3)}
            </span>
          )}
          <span className="ui-rail__name">
            <b>{brand}</b>
            {subtitle && <small>{subtitle}</small>}
          </span>
        </div>
        <nav className="ui-rail__list">
          {sections.map((s) => (
            <Fragment key={s.heading}>
              <div className="ui-rail__heading">{s.heading}</div>
              {s.items.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  className={cx('ui-rail__item', it.key === active && 'ui-rail__item--on')}
                  title={it.label}
                  aria-current={it.key === active ? 'page' : undefined}
                  onClick={() => choose(it.key)}
                >
                  <Icon name={it.icon} />
                  <span className="ui-rail__label">{it.label}</span>
                  {it.badge ? (
                    <span
                      className={cx(
                        'ui-rail__badge',
                        it.badgeTone === 'amber' && 'ui-rail__badge--amber',
                      )}
                    >
                      {it.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </Fragment>
          ))}
        </nav>
        {support && (
          <div className="ui-rail__support">
            <div className="ui-rail__support-row">
              <Icon name="support" />
              <span>
                <b>{support.title}</b>
                <small>{support.subtitle}</small>
              </span>
            </div>
            <button
              type="button"
              className="ui-rail__support-btn"
              onClick={() => {
                setHover(false);
                support.onAction();
              }}
            >
              {support.action}
            </button>
          </div>
        )}
        {footer && <div className="ui-rail__foot">{footer}</div>}
      </aside>
    </>
  );
}

// ---------------------------------------------------------------- ShellFrame
export interface ShellFrameProps {
  /** The Rail. */
  rail: ReactNode;
  /** Phones only: a top bar with the menu button and this title. */
  mobileTitle?: ReactNode;
  onMobileMenu?: () => void;
  children: ReactNode;
}
/** Page frame beside the Rail: leaves room for the 56 px rail; on phones adds a top bar instead. */
export function ShellFrame({ rail, mobileTitle, onMobileMenu, children }: ShellFrameProps) {
  return (
    <div className="ui-shell">
      {rail}
      <div className="ui-shell__main">
        <header className="ui-shell__mobilebar">
          <button
            type="button"
            className="ui-iconbtn"
            aria-label="Open menu"
            onClick={onMobileMenu}
          >
            <Icon name="menu" />
          </button>
          <b>{mobileTitle}</b>
        </header>
        <div className="ui-page">{children}</div>
      </div>
    </div>
  );
}
