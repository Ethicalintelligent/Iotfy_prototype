// Small components of the original Reports page that the shared kit does not have, with the
// original's markup and class names: pop-up hook, searches, segmented buttons, check boxes,
// radios, pill, toast, side drawer and form sections.
import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Icon } from '../smart-track/kit';

/** Above this many items a pop-up list gets a search box. */
export const SEARCH_FROM = 6;
export const matches = (label: string, q: string) =>
  label.toLowerCase().includes(q.trim().toLowerCase());

/** True when the element is inside a floating pop-up menu (those live outside the anchor). */
export const inFloatMenu = (el: EventTarget | null) =>
  el instanceof Element && el.closest('.td-pop__menu--float') !== null;

/** Open state of a `td-pop`: closes on a click outside or Escape. */
export function usePop() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !inFloatMenu(e.target)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', down);
    window.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down);
      window.removeEventListener('keydown', key);
    };
  }, [open]);
  return { open, setOpen, ref };
}

/** Search box at the top of a pop-up list. */
export function PopSearch({
  value,
  onChange,
  label,
  placeholder = 'Search…',
  autoFocus = true,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="td-pop__search">
      <Icon name="Search" size={14} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        autoFocus={autoFocus}
      />
    </label>
  );
}

/** The toolbar search box. */
export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="td-gv__search">
      <Icon name="Search" size={15} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  );
}

export function Segmented({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div className="td-seg-wrap">
      <div className="td-seg td-seg--md" role="tablist" aria-label={label}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`td-seg__btn ${on ? 'is-active' : ''} `}
              onClick={() => onChange(o.id)}
            >
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** `td-check`: check box with a "some selected" state. */
export function Check({
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
  children?: ReactNode;
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

/** `td-cbx`: plain check box row (column chooser). */
export function CheckRow({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="td-cbx">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      {children}
    </label>
  );
}

export function Radios({
  name,
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  'aria-label'?: string;
}) {
  return (
    <div className="td-radios" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <label key={o.value}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className={`td-pill tone-${tone}`}>
      <i className="td-dot" />
      {children}
    </span>
  );
}

/** Success toast that hides itself after a few seconds. */
export function useToast(ms = 3500) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => setText(null), ms);
    return () => clearTimeout(t);
  }, [text, ms]);
  return {
    show: setText,
    node: text ? (
      <div className="td-toast" role="status">
        <Icon name="CircleCheck" size={16} />
        {text}
      </div>
    ) : null,
  };
}

/**
 * The original's side drawer form (`td-drawerx`). Rendered inside the page, not on the page body:
 * the original's Reports styles for this drawer apply only next to the report (`:has(.gp-rpt)`).
 */
export function Drawer({
  title,
  subtitle,
  icon = 'Plus',
  onClose,
  onReset,
  submitLabel,
  formId,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  onClose: () => void;
  onReset?: () => void;
  submitLabel: string;
  formId: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const all = document.querySelectorAll('.td-drawerx');
      if (all[all.length - 1] === panel.current?.parentElement) onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  useEffect(() => panel.current?.focus(), []);
  return (
    <div className="td-drawerx" style={{ '--level': 0 } as CSSProperties}>
      <div className="td-drawerx__scrim" />
      <aside
        ref={panel}
        className="td-drawerx__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="td-drawerx__head">
          <span className="td-drawerx__icon">
            <Icon name={icon} size={18} />
          </span>
          <div className="td-drawerx__titles">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="td-drawerx__close" onClick={onClose} aria-label="Close">
            <Icon name="X" size={18} />
          </button>
        </header>
        <div className="td-drawerx__body">{children}</div>
        <footer className="td-drawerx__foot">
          <button
            type="button"
            className="td-btn td-btn--ghost td-drawerx__reset"
            onClick={onReset}
            disabled={!onReset}
          >
            Reset
          </button>
          <button type="submit" form={formId} className="td-btn td-btn--primary td-drawerx__submit">
            {submitLabel}
          </button>
        </footer>
      </aside>
    </div>
  );
}

export function FormSection({
  title,
  icon = 'Info',
  cols,
  children,
}: {
  title: string;
  icon?: string;
  cols?: number;
  children?: ReactNode;
}) {
  return (
    <section className="td-form__section">
      <h3>
        <Icon name={icon} size={17} />
        {title}
      </h3>
      {children != null && children !== false && (
        <div className={cols ? `td-form__grid cols-${cols}` : 'td-form__grid'}>{children}</div>
      )}
    </section>
  );
}

/** `td-fx` form field: label, control, error. A non-group field links its label to the control. */
export function FormField({
  label,
  required,
  error,
  group,
  className,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  error?: string | null;
  group?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const errId = `${id}-err`;
  const control =
    !group && isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          id,
          ...(typeof (children as ReactElement).type === 'string'
            ? { 'aria-invalid': !!error, 'aria-describedby': error ? errId : undefined }
            : {}),
        })
      : children;
  return (
    <div className={className ? `td-fx ${className}` : 'td-fx'}>
      <span className="td-fx__label">
        {group ? label : <label htmlFor={id}>{label}</label>}
        {required && (
          <i className="td-fx__req" aria-hidden="true">
            *
          </i>
        )}
      </span>
      {control}
      {error && (
        <small id={errId} className="td-fx__err" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
