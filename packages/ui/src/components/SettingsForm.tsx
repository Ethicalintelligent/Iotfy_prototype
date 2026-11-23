// Pieces for rule and settings forms in a wide Drawer, from the approved GPS Vehicle Tracking
// design (Desktop/vs/Manage-Alert-Configuration.html, "Add Alert"): columns that fill the drawer,
// coloured toggle buttons with a tick, chip tabs, label + description setting rows,
// bare inputs with a unit, an expanding row, a key / value summary, a check list and a chain of
// steps. Colours come from hue names and tokens only.
import '../styles/settings-form.css';
import { useId, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../cx';
import type { IconName } from '../icons';
import { Icon, type Hue } from './basics';

// ---------------------------------------------------------------- DrawerColumns / ColumnPanel
/**
 * Columns side by side that fill a Drawer's height (one column below 980 px). Each child is
 * usually a ColumnPanel whose body scrolls on its own.
 */
export function DrawerColumns({
  template = '250px 240px minmax(0, 1fr)',
  children,
}: {
  /** CSS grid columns on wide screens. */
  template?: string;
  children: ReactNode;
}) {
  return (
    <div className="ui-dcols" style={{ '--dcols': template } as CSSProperties}>
      {children}
    </div>
  );
}

/** A white column in DrawerColumns: icon title, grey line, fixed `head`, scrolling body. */
export function ColumnPanel({
  icon,
  title,
  subtitle,
  head,
  label,
  children,
}: {
  icon?: IconName;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Stays in place above the scrolling body (search box, counts, tabs). */
  head?: ReactNode;
  /** Accessible name when the title isn't plain text. */
  label?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="ui-dcol"
      aria-label={label ?? (typeof title === 'string' ? title : undefined)}
    >
      {title && (
        <h3 className="ui-dcol__title">
          {icon && <Icon name={icon} size={16} />}
          {title}
        </h3>
      )}
      {subtitle && <p className="ui-dcol__sub">{subtitle}</p>}
      {head}
      <div className="ui-dcol__body">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------- HueToggle / ChoiceGroup
/** A full-width button filled with a hue: pressed shows a white tick (alert types to choose). */
export function HueToggle({
  hue,
  icon,
  selected,
  onClick,
  disabled,
  note,
  title,
  children,
}: {
  hue: Hue;
  icon?: IconName;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  /** Small second line, e.g. "Not available yet". */
  note?: ReactNode;
  /** Tooltip. */
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cx(
        'ui-htoggle',
        `ui-hue--${hue}`,
        selected && 'is-on',
        note != null && 'has-note',
      )}
      aria-pressed={!!selected}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {icon && <Icon name={icon} size={15} />}
      <span>
        {children}
        {note && <small>{note}</small>}
      </span>
      {selected && (
        <i className="ui-htoggle__tick" aria-hidden="true">
          <Icon name="check" size={11} />
        </i>
      )}
    </button>
  );
}

/** A titled group of HueToggles (or anything) stacked in a column. */
export function ChoiceGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="ui-cgroup" role="group" aria-label={title}>
      <div className="ui-cgroup__title" aria-hidden="true">
        {title}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- ChipTabs
export interface ChipTab {
  key: string;
  label: string;
  /** Coloured dot before the label. */
  hue?: Hue;
  /** done: white tick (e.g. submitted); error: red "!" (needs attention). */
  mark?: 'done' | 'error';
}
/** A row of pill tabs, one chosen (green), each with an optional hue dot and a mark. */
export function ChipTabs({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: ChipTab[];
  value: string;
  onChange: (key: string) => void;
  label: string;
}) {
  return (
    <div className="ui-chiptabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={t.key === value}
          className={cx('ui-chiptab', t.key === value && 'is-on')}
          onClick={() => onChange(t.key)}
        >
          {t.hue && <i className={cx('ui-chiptab__dot', `ui-hue--${t.hue}`)} aria-hidden="true" />}
          <span>{t.label}</span>
          {t.mark === 'done' && (
            <b className="ui-chiptab__ok" title="Done">
              <Icon name="check" size={10} />
            </b>
          )}
          {t.mark === 'error' && (
            <b className="ui-chiptab__bad" title="Needs attention">
              !
            </b>
          )}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- SettingRow
/** One setting: bold label and grey description on the left, its control on the right. */
export function SettingRow({
  label,
  description,
  required,
  children,
}: {
  label: ReactNode;
  description?: ReactNode;
  /** Red * after the label. */
  required?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={cx('ui-srow', children == null && 'ui-srow--text')}>
      <div className="ui-srow__text">
        <b>
          {label}
          {required && (
            <span className="ui-srow__req" aria-hidden="true">
              *
            </span>
          )}
        </b>
        {description && <span>{description}</span>}
      </div>
      {children != null && <div className="ui-srow__ctl">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- InlineInput / InlineSelect
/** An input without a label line (its name is `label`), optionally with a unit after it. */
export function InlineInput({
  label,
  value,
  onChange,
  type = 'text',
  unit,
  placeholder,
  invalid,
  min,
  max,
  step,
  disabled,
  width,
}: {
  /** Accessible name. */
  label: string;
  value: string | number | null | undefined;
  onChange?: (value: string) => void;
  type?: 'text' | 'number' | 'time' | 'date' | 'email' | 'tel';
  /** Text after the box ("km/h", "seconds"). */
  unit?: ReactNode;
  placeholder?: string;
  /** Red ring (e.g. a required value is missing). */
  invalid?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  disabled?: boolean;
  /** Box width in px (default: fills the space). */
  width?: number;
}) {
  return (
    <span className="ui-iinput">
      <input
        className={cx('ui-input', invalid && 'is-invalid')}
        aria-label={label}
        aria-invalid={invalid || undefined}
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        style={width ? { width, flex: 'none' } : undefined}
        onChange={(e) => onChange?.(e.target.value)}
      />
      {unit && <span className="ui-iinput__unit">{unit}</span>}
    </span>
  );
}

/** A drop-down without a label line (its name is `label`). */
export function InlineSelect<V extends string>({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: V;
  onChange: (value: V) => void;
  options: { value: V; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      className="ui-input ui-iselect"
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as V)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------- DisclosureRow
/** A row that opens to show more ("Sunday · 1 time slot · 12:00 AM – 11:59 PM ›"). */
export function DisclosureRow({
  title,
  badge,
  summary,
  open,
  onToggle,
  invalid,
  children,
}: {
  title: ReactNode;
  /** Small mint pill after the title. */
  badge?: ReactNode;
  /** Grey text on the right. */
  summary?: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** Red ring. */
  invalid?: boolean;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={cx('ui-disc', open && 'is-open', invalid && 'is-bad')}>
      <button
        type="button"
        className="ui-disc__head"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
      >
        <b>{title}</b>
        {badge != null && <span className="ui-disc__badge">{badge}</span>}
        <span className="ui-disc__sum">{summary}</span>
        <Icon name="chev" size={14} className="ui-disc__chev" />
      </button>
      {open && (
        <div id={id} className="ui-disc__body">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- KeyValueList / CheckList
/** Label / value rows with thin lines between them (a summary before saving). */
export function KeyValueList({
  title,
  icon,
  rows,
}: {
  title?: ReactNode;
  icon?: IconName;
  rows: { label: string; value: ReactNode }[];
}) {
  return (
    <div className="ui-kvl">
      {title && (
        <h4 className="ui-kvl__title">
          {icon && <Icon name={icon} size={16} />}
          {title}
        </h4>
      )}
      <dl>
        {rows.map((r) => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd>{r.value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A list of checks: green tick when fine, red cross when not. */
export function CheckList({
  title,
  items,
}: {
  title?: ReactNode;
  items: { label: ReactNode; ok: boolean; key?: string }[];
}) {
  return (
    <div className="ui-chkl">
      {title && <h4 className="ui-kvl__title">{title}</h4>}
      <ul>
        {items.map((i, n) => (
          <li key={i.key ?? n} className={i.ok ? 'is-ok' : 'is-bad'}>
            <Icon name={i.ok ? 'check' : 'xcircle'} size={13} />
            {i.label}
            <span className="ui-sr">{i.ok ? ' (fine)' : ' (needs attention)'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- StepChain
/** Small boxes joined by arrows ("LEVEL 0 Initial alert › LEVEL 1 after 15 min"). */
export function StepChain({
  steps,
  label,
}: {
  steps: { key: string; kicker: string; text: ReactNode; hue?: Hue }[];
  label: string;
}) {
  return (
    <ol className="ui-chain" aria-label={label}>
      {steps.map((s, i) => (
        <li key={s.key}>
          {i > 0 && <Icon name="chev" size={14} className="ui-chain__sep" />}
          <span className={cx('ui-chain__step', `ui-hue--${s.hue ?? 'green'}`)}>
            <small>{s.kicker}</small>
            {s.text}
          </span>
        </li>
      ))}
    </ol>
  );
}
