// Filter pieces from the approved GPS Vehicle Tracking design (Desktop/vs: Grid View, Map View,
// Centralized Tracking): a side layout, the collapsible "Vehicle Filters" panel with its
// sections, a segmented single choice ("Any | On | Off"), a switch row with a hint, and filter
// chips with a count ("● Running 10").
import '../styles/filter-panel.css';
import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../cx';
import type { IconName } from '../icons';
import { Icon, IconTile, type Hue } from './basics';
import { Switch } from './controls';

// ---------------------------------------------------------------- SideLayout
/**
 * A side column beside the main content (filters or a list on the left, content on the right).
 * One column on narrow screens. `sticky` keeps the side column in view while the page scrolls.
 */
export function SideLayout({
  side,
  children,
  sideWidth = 300,
  sticky,
  sideHeight,
}: {
  side: ReactNode;
  children: ReactNode;
  /** Width of the side column in px (default 300). */
  sideWidth?: number;
  sticky?: boolean;
  /** Fixed height of the side column, which then scrolls (e.g. a list beside a map). */
  sideHeight?: number | string;
}) {
  return (
    <div
      className={cx('ui-sidelayout', sticky && 'ui-sidelayout--sticky')}
      style={{ '--side': `${sideWidth}px` } as CSSProperties}
    >
      <div
        className={cx('ui-sidelayout__side', sideHeight != null && 'ui-sidelayout__side--scroll')}
        style={
          sideHeight != null
            ? ({
                '--side-h': typeof sideHeight === 'number' ? `${sideHeight}px` : sideHeight,
              } as CSSProperties)
            : undefined
        }
      >
        {side}
      </div>
      <div className="ui-sidelayout__main">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------- SearchBar
/** A full-width search box with buttons on its right (Filters, sort): `search` grows. */
export function SearchBar({ search, children }: { search: ReactNode; children?: ReactNode }) {
  return (
    <div className="ui-searchbar">
      <div className="ui-searchbar__search">{search}</div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- FilterPanel
/**
 * The "Vehicle Filters" side panel: icon tile, title and a line such as "No filters applied", a
 * collapse button, scrolling sections and a footer (Reset / Submit). Collapsed, it is a narrow
 * strip with the title written upwards; a click opens it again.
 */
export function FilterPanel({
  title,
  subtitle,
  icon = 'filter',
  collapsed,
  onCollapsedChange,
  footer,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: IconName;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  if (collapsed)
    return (
      <button
        type="button"
        className="ui-fpanel ui-fpanel--closed"
        onClick={() => onCollapsedChange?.(false)}
        aria-label={`Open ${title}`}
        title={`Open ${title}`}
      >
        <IconTile icon={icon} hue="green" size="sm" />
        <span className="ui-fpanel__vertical">{title}</span>
      </button>
    );
  return (
    <section className="ui-fpanel" aria-label={title}>
      <header className="ui-fpanel__head">
        <IconTile icon={icon} hue="green" />
        <span className="ui-fpanel__titles">
          <b>{title}</b>
          {subtitle != null && <small>{subtitle}</small>}
        </span>
        {onCollapsedChange && (
          <button
            type="button"
            className="ui-fpanel__collapse"
            onClick={() => onCollapsedChange(true)}
            aria-label={`Collapse ${title.toLowerCase()}`}
            title={`Collapse ${title.toLowerCase()}`}
          >
            <Icon name="side" size={16} />
          </button>
        )}
      </header>
      <div className="ui-fpanel__body">{children}</div>
      {footer && <footer className="ui-fpanel__foot">{footer}</footer>}
    </section>
  );
}

/** A collapsible section of a FilterPanel: icon tile, title and a chevron. */
export function FilterSection({
  title,
  icon,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  icon: IconName;
  defaultOpen?: boolean;
  /** Small count beside the title (e.g. how many filters are set here). */
  badge?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={cx('ui-fsection', open && 'is-open')}>
      <button
        type="button"
        className="ui-fsection__head"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <IconTile icon={icon} hue="green" size="sm" />
        <b>{title}</b>
        {badge != null && <span className="ui-fsection__badge">{badge}</span>}
        <Icon name={open ? 'down' : 'chev'} size={15} className="ui-fsection__chev" />
      </button>
      {open && (
        <div className="ui-fsection__body" id={id}>
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- ChoiceField
/** A label over a full-width segmented single choice ("Ignition: Any | On | Off"). */
export function ChoiceField<V extends string>({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  /** Small icon before the label. */
  icon?: IconName;
}) {
  const id = useId();
  return (
    <div className="ui-choice">
      <span className="ui-choice__label" id={id}>
        {icon && <Icon name={icon} size={13} />}
        {label}
      </span>
      <span className="ui-choice__opts" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            className={cx('ui-choice__opt', o.value === value && 'is-on')}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- SwitchField
/** A bold label with a grey hint under it and a switch on the right ("Unassigned operator only"). */
export function SwitchField({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="ui-switchfield">
      <span>
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
      <Switch label={label} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ---------------------------------------------------------------- FilterChip
/** A pill button with a hue dot, a label and a count: a filter that is on or off. */
export function FilterChip({
  label,
  count,
  hue = 'slate',
  active,
  onClick,
  title,
}: {
  label: string;
  count?: ReactNode;
  hue?: Hue;
  active?: boolean;
  onClick: () => void;
  /** Tooltip (e.g. what the status means). */
  title?: string;
}) {
  return (
    <button
      type="button"
      className={cx('ui-fchip', `ui-hue--${hue}`, active && 'is-on')}
      aria-pressed={!!active}
      onClick={onClick}
      title={title}
    >
      <i aria-hidden="true" />
      {label}
      {count != null && <span className="ui-fchip__count">{count}</span>}
    </button>
  );
}
