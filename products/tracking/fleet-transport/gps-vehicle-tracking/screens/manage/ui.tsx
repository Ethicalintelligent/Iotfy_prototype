// IT-0036. Small pieces of the original Manage page (Manage-*.html, removed in IT-0037 (git history)) that the shared
// kit does not have: pop-over hook, search boxes, pills, confirm, toast, the side drawer form
// frame, form fields, radios, check boxes, multi-select, "+ Add" link, file pickers, group tree
// and the form stepper. Same markup and class names as the original, so manage.css styles them.
import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Dropdown, Icon, usePortalRoot, type Option } from '../smart-track/kit';
import './icons';

/** Floating menus are portaled; clicks inside them never close the pop-over they came from. */
export const FLOAT = 'td-pop__menu--float';
export const inFloat = (t: EventTarget | null) =>
  t instanceof Element && t.closest(`.${FLOAT}`) !== null;
/** Above this many items a menu gets a search box (as in the original). */
export const SEARCH_FROM = 6;
export const matches = (label: string, q: string) =>
  label.toLowerCase().includes(q.trim().toLowerCase());
export const errText = (e: unknown) => (e instanceof Error ? e.message : 'Request failed.');

/** A `td-pop` that closes on outside pointer-down and Escape (original `Vo`). */
export function usePop() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: Event) => {
      if (!ref.current?.contains(e.target as Node) && !inFloat(e.target)) setOpen(false);
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

/** Portal into the page's own pop-up root (inside the style scope). */
export function Portal({ children }: { children: ReactNode }) {
  const root = usePortalRoot();
  // The original puts pop-ups on <body>, which also holds the Manage tool bar, so its stylesheet
  // styles them with ":has(.td-manage__module) .td-drawerx …". The hidden marker keeps those
  // rules working for pop-ups placed in the page's own pop-up root.
  return root
    ? createPortal(
        <div style={{ display: 'contents' }}>
          <span className="td-manage__module" style={{ display: 'none' }} aria-hidden="true" />
          {children}
        </div>,
        root,
      )
    : null;
}

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

/** The toolbar search box (`td-gv__search`). */
export function SearchBox({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  id?: string;
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

export function Pill({
  tone,
  children,
  dot = true,
  solid,
}: {
  tone: string;
  children: ReactNode;
  dot?: boolean;
  solid?: boolean;
}) {
  return (
    <span className={`td-pill tone-${tone}${solid ? ' td-pill--solid' : ''}`}>
      {dot && <i className="td-dot" />}
      {children}
    </span>
  );
}

export function Toast({ children, error }: { children: ReactNode; error?: boolean }) {
  return (
    <div className="td-toast" role={error ? 'alert' : 'status'}>
      <Icon name={error ? 'CircleAlert' : 'CircleCheck'} size={16} />
      {children}
    </div>
  );
}

/** A message that hides itself after a while (original `hf`). */
export function useToast(ms = 3500) {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), ms);
    return () => clearTimeout(t);
  }, [msg, ms]);
  return { show: setMsg, node: msg ? <Toast>{msg}</Toast> : null };
}

/** Delete confirmation (original `Mo`). */
export function Confirm({
  title,
  message,
  icon = 'Trash',
  confirmLabel = 'Delete',
  busyLabel = 'Deleting…',
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: ReactNode;
  icon?: string;
  confirmLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancel.current?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [busy, onCancel]);
  return (
    <Portal>
      <div className="td-confirm">
        <div className="td-confirm__scrim" onClick={() => !busy && onCancel()} />
        <div
          className="td-confirm__box"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="td-confirm-title"
          aria-describedby="td-confirm-msg"
        >
          <div className="td-confirm__head">
            <span className="td-confirm__icon">
              <Icon name={icon} size={17} />
            </span>
            <h2 id="td-confirm-title">{title}</h2>
          </div>
          <p id="td-confirm-msg">{message}</p>
          {error && (
            <p className="td-confirm__error" role="alert">
              {error}
            </p>
          )}
          <div className="td-confirm__actions">
            <button
              ref={cancel}
              type="button"
              className="td-btn td-btn--ghost"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="td-btn td-confirm__danger"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? busyLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/**
 * IT-0041 (bug sheet 23-11-2026, Manage #7 / #10): the row's "View" action opens the same form
 * read-only. Inside `<ViewOnly title=…>` every Drawer shows that title, disables all its fields
 * and has no Reset / Save footer, so the forms themselves need no view mode of their own.
 */
const ViewOnlyCtx = createContext<string | null>(null);
const VIEW_NAV = '[role="tab"], nav button';
export function ViewOnly({ title, children }: { title: string | null; children: ReactNode }) {
  return <ViewOnlyCtx.Provider value={title}>{children}</ViewOnlyCtx.Provider>;
}

/** The side drawer that holds every add / edit form (original `Kl`). */
export function Drawer({
  title,
  subtitle,
  icon = 'Plus',
  onClose,
  onReset,
  submitLabel,
  submitting,
  formId,
  level = 0,
  footer,
  nav,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: string;
  onClose: () => void;
  onReset?: () => void;
  submitLabel?: string;
  submitting?: boolean;
  formId?: string;
  level?: number;
  /** undefined = the standard Reset / Save footer; null = no footer. */
  footer?: ReactNode | null;
  nav?: ReactNode;
  children: ReactNode;
}) {
  const viewTitle = useContext(ViewOnlyCtx);
  if (viewTitle) {
    title = viewTitle;
    icon = 'Eye';
    footer = null;
    if (typeof subtitle === 'string') subtitle = subtitle.replace(/^Update\s+/, '');
  }
  const panel = useRef<HTMLElement>(null);
  // (state, not a ref: the drawer's portal mounts it a render later)
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null);
  // View mode: every field and button is disabled (also ones the form renders later), except the
  // tabs and section switches, so the whole record can still be looked through.
  useLayoutEffect(() => {
    const root = bodyEl;
    if (!viewTitle || !root) return;
    const lock = () =>
      root
        .querySelectorAll<HTMLInputElement>('input, select, textarea, button')
        .forEach((el) => {
          if (!el.disabled && !el.matches(VIEW_NAV)) el.disabled = true;
          // Edit hints ("Leave empty to keep the PIN", "e.g. …") mean nothing when only viewing.
          if (el.placeholder) el.placeholder = '';
        });
    lock();
    const watch = new MutationObserver(lock);
    watch.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['disabled'],
    });
    // Maps in a form (zone drawing) still pan and zoom, but clicks no longer add points and the
    // points cannot be dragged.
    const still = (e: Event) => {
      const t = e.target as Element | null;
      if (!t?.closest?.('.leaflet-container') || t.closest('.leaflet-control')) return;
      if (e.type === 'click' || t.closest('.leaflet-marker-pane')) e.stopPropagation();
    };
    const kinds = ['click', 'mousedown', 'pointerdown', 'touchstart'];
    kinds.forEach((k) => root.addEventListener(k, still, true));
    return () => {
      watch.disconnect();
      kinds.forEach((k) => root.removeEventListener(k, still, true));
    };
  }, [viewTitle, bodyEl]);
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
    <Portal>
      <div className="td-drawerx" style={{ '--level': level } as CSSProperties}>
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
            <button
              type="button"
              className="td-drawerx__close"
              onClick={onClose}
              aria-label="Close"
            >
              <Icon name="X" size={18} />
            </button>
          </header>
          {nav}
          <div ref={setBodyEl} className="td-drawerx__body">
            {children}
          </div>
          {footer !== undefined ? (
            footer && <footer className="td-drawerx__foot">{footer}</footer>
          ) : (
            <footer className="td-drawerx__foot">
              <button
                type="button"
                className="td-btn td-btn--ghost td-drawerx__reset"
                onClick={onReset}
                disabled={submitting || !onReset}
              >
                Reset
              </button>
              <button
                type="submit"
                form={formId}
                className="td-btn td-btn--primary td-drawerx__submit"
                disabled={submitting}
              >
                {submitting ? 'Saving…' : submitLabel}
              </button>
            </footer>
          )}
        </aside>
      </div>
    </Portal>
  );
}

/* ------------------------------------------------------------------ form pieces */

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <small id={id} className="td-fx__err" role="alert">
      {children}
    </small>
  );
}

/** A labelled form field (original `De`, class `td-fx`). */
export function Fx({
  label,
  required,
  error,
  hint,
  extra,
  group,
  id,
  className,
  style,
  field,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  error?: string | null;
  hint?: ReactNode;
  extra?: ReactNode;
  group?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  field?: string;
  children: ReactNode;
}) {
  const auto = useId();
  const inputId = id ?? auto;
  const errId = `${inputId}-err`;
  const child =
    !group && isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          id: inputId,
          'aria-invalid': !!error,
          'aria-describedby': error ? errId : undefined,
        })
      : children;
  return (
    <div className={className ? `td-fx ${className}` : 'td-fx'} style={style} data-field={field}>
      <span className="td-fx__label">
        {group ? label : <label htmlFor={inputId}>{label}</label>}
        {required && (
          <i className="td-fx__req" aria-hidden="true">
            *
          </i>
        )}
        {extra}
      </span>
      {child}
      {hint && !error && <small className="gp-hint">{hint}</small>}
      {error && <FieldError id={errId}>{error}</FieldError>}
    </div>
  );
}

export function FormSection({
  title,
  icon = 'Info',
  cols,
  id,
  step,
  after,
  children,
}: {
  title: ReactNode;
  icon?: string;
  cols?: number;
  id?: string;
  step?: string;
  after?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="td-form__section" id={id} data-step={step}>
      <h3>
        <Icon name={icon} size={17} />
        {title}
      </h3>
      {children != null && children !== false && <FormCols cols={cols}>{children}</FormCols>}
      {after}
    </section>
  );
}

export function FormCols({ cols, children }: { cols?: number; children: ReactNode }) {
  return <div className={cols ? `td-form__grid cols-${cols}` : 'td-form__grid'}>{children}</div>;
}

export function Banner({ children }: { children: ReactNode }) {
  return (
    <p className="td-form__banner" role="alert">
      <Icon name="CircleAlert" size={15} />
      {children}
    </p>
  );
}

/** A form select (original `st`): the kit dropdown in its field look. */
export function Select({
  value,
  onChange,
  options,
  placeholder,
  id,
  disabled,
  small,
  'aria-label': ariaLabel,
  searchable,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  small?: boolean;
  'aria-label'?: string;
  searchable?: boolean;
}) {
  return (
    <Dropdown
      block={!small}
      className={small ? 'td-ddl--sm' : 'td-ddl--field'}
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      searchable={searchable}
    />
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function Radios({
  name,
  value,
  onChange,
  options,
  disabled,
  'aria-label': ariaLabel,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: ReactNode }[];
  disabled?: boolean;
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
            disabled={disabled}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function Check({
  checked,
  onChange,
  disabled,
  className,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <label className={className ? `td-cbx ${className}` : 'td-cbx'}>
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

/** A check box that can show "some selected" (original `w3`). */
export function MixedCheck({
  checked,
  mixed,
  onChange,
  className,
  children,
}: {
  checked: boolean;
  mixed?: boolean;
  onChange: (v: boolean) => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <label className={className ? `td-cbx ${className}` : 'td-cbx'}>
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = !checked && !!mixed;
        }}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

/** Multi-select with search, "Select all" and Done (original `wH`, class `td-msel`). */
export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder,
  id,
  disabled,
  title,
  'aria-label': ariaLabel,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  id?: string;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const [q, setQ] = useState('');
  const chosen = new Set(value);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const shown = options.filter((o) => matches(o.label, q));
  const shownOn = shown.filter((o) => chosen.has(o.value)).length;
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
    const outside = (e: Event) => {
      if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node))
        close();
    };
    const resize = () => close();
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('scroll', outside, true);
    window.addEventListener('resize', resize);
    pop.current?.querySelector<HTMLInputElement>('input[type=search]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('scroll', outside, true);
      window.removeEventListener('resize', resize);
    };
  }, [pos]);
  const set = (list: string[]) =>
    onChange(options.map((o) => o.value).filter((v) => list.includes(v)));
  const toggle = (v: string, on: boolean) => set(on ? [...value, v] : value.filter((x) => x !== v));
  const all = (on: boolean) => {
    const ids = shown.map((o) => o.value);
    set(on ? [...new Set([...value, ...ids])] : value.filter((v) => !ids.includes(v)));
  };
  const first = value[0];
  const label =
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
        <span className="td-ddl__label">{label}</span>
        <Icon name="ChevronDown" size={15} className="td-ddl__chev" />
      </button>
      {pos && (
        <Portal>
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
            <PopSearch
              value={q}
              onChange={setQ}
              label={searchPlaceholder ?? 'Search'}
              placeholder={searchPlaceholder ?? 'Search…'}
              autoFocus={false}
            />
            <div className="td-msel__list">
              {shown.length > 0 && (
                <MixedCheck
                  className="td-msel__all"
                  checked={shownOn === shown.length}
                  mixed={shownOn > 0}
                  onChange={all}
                >
                  <b>Select all</b>
                </MixedCheck>
              )}
              {shown.map((o) => (
                <MixedCheck
                  key={o.value}
                  checked={chosen.has(o.value)}
                  onChange={(on) => toggle(o.value, on)}
                >
                  <span className="td-msel__label" title={o.label}>
                    {o.label}
                  </span>
                </MixedCheck>
              ))}
              {!shown.length && <span className="td-msel__none">No results found</span>}
            </div>
            <div className="td-msel__foot">
              <span>{value.length} selected</span>
              <button type="button" className="td-btn td-btn--primary" onClick={() => close(true)}>
                Done
              </button>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

/** The "+ Add" link beside a field label (original `qh`). */
export function AddLink({
  name,
  onAdd,
  onOpen,
  parents,
}: {
  name: string;
  onAdd?: (value: string, parent?: string) => Promise<void>;
  onOpen?: () => void;
  parents?: { value: string; label: string; depth?: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [parent, setParent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const add = async () => {
    const v = text.trim();
    if (!v || !onAdd) return;
    setBusy(true);
    setError(null);
    try {
      await onAdd(v, (parents && parent) || undefined);
      setOpen(false);
      setText('');
      setParent('');
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="td-addlink">
      <button
        type="button"
        onClick={() => (onAdd ? setOpen((o) => !o) : onOpen?.())}
        aria-expanded={onAdd ? open : undefined}
      >
        + Add
      </button>
      {open && (
        <span className="td-addlink__pop" role="dialog" aria-label={`Add ${name}`}>
          <input
            autoFocus
            value={text}
            placeholder={`New ${name.toLowerCase()}`}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void add();
              }
              if (e.key === 'Escape') {
                e.stopPropagation();
                setOpen(false);
              }
            }}
          />
          {parents && (
            <label className="td-addlink__under">
              <span>Under</span>
              <Dropdown
                value={parent}
                onChange={setParent}
                aria-label={`Parent ${name.toLowerCase()}`}
                options={[
                  { value: '', label: 'Top level' },
                  ...parents.map((p) => ({
                    value: p.value,
                    label: `${'   '.repeat(p.depth ?? 0)}${p.label}`,
                  })),
                ]}
              />
            </label>
          )}
          <button
            type="button"
            className="td-btn td-btn--primary"
            onClick={() => void add()}
            disabled={busy || !text.trim()}
          >
            {busy ? '…' : 'Add'}
          </button>
          {error && <FieldError>{error}</FieldError>}
        </span>
      )}
    </span>
  );
}

/**
 * An attached file. Saved in core.documents: `id` is the saved row; a newly picked file carries its
 * bytes as `content` (Postgres bytea hex, "\x…") until it is saved.
 */
export interface FileRef {
  name: string;
  size?: number;
  type?: string;
  id?: string;
  content?: string;
}
/** A picked file with its bytes, ready for core.documents. */
export async function readFile(f: File): Promise<FileRef> {
  const bytes = new Uint8Array(await f.arrayBuffer());
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return { name: f.name, size: f.size, type: f.type, content: `\\x${hex}` };
}
const DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const IMAGE_TYPES = ['image/jpeg', 'image/png'];

/** Several files (original `$9`, class `td-files`). */
export function Files({
  id,
  value,
  onChange,
  disabled,
  maxMb = 20,
  images,
}: {
  id?: string;
  value: FileRef[];
  onChange: (v: FileRef[]) => void;
  disabled?: boolean;
  maxMb?: number;
  images?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const types = images ? IMAGE_TYPES : DOC_TYPES;
  const kinds = images ? 'JPG or PNG' : 'PDF, JPG or PNG';
  const pick = (list: FileList | null) => {
    const ok: File[] = [];
    const bad: File[] = [];
    [...(list ?? [])].forEach((f) =>
      (types.includes(f.type) && f.size <= maxMb * 1024 * 1024 ? ok : bad).push(f),
    );
    setError(
      bad.length ? `${bad.map((f) => f.name).join(', ')}: only ${kinds} up to ${maxMb} MB` : null,
    );
    if (ok.length)
      void Promise.all(ok.map(readFile)).then((files) => onChange([...value, ...files]));
  };
  return (
    <div className="td-files">
      <button
        type="button"
        className="td-files__btn"
        onClick={() => input.current?.click()}
        disabled={disabled}
      >
        <Icon name="CloudUpload" size={16} />
        {images ? 'Attach Photos' : 'Attach Files'}
      </button>
      <input
        ref={input}
        id={id}
        type="file"
        multiple
        accept={images ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'}
        hidden
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />
      <small className="td-files__hint">
        {kinds} · up to {maxMb} MB per file
      </small>
      {error && <FieldError>{error}</FieldError>}
      <div className="td-files__box">
        {value.length ? (
          <ul>
            {value.map((f, i) => (
              <li key={`${f.name}${i}`}>
                <Icon name={images ? 'Camera' : 'FileText'} size={14} />
                <span title={f.name}>{f.name}</span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  aria-label={`Remove ${f.name}`}
                >
                  <Icon name="X" size={13} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <span>{images ? 'No photos attached yet' : 'No files attached yet'}</span>
        )}
      </div>
    </div>
  );
}

/** One file (original `eB`). */
export function FileInput({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: FileRef | null;
  onChange: (v: FileRef | null) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="td-files">
      <button
        type="button"
        className={`td-files__btn is-plain ${value ? 'has-file' : ''}`}
        onClick={() => input.current?.click()}
        disabled={disabled}
      >
        <Icon name="CloudUpload" size={16} />
        <span>{value?.name || 'Choose File'}</span>
      </button>
      <input
        ref={input}
        id={id}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void readFile(f).then(onChange);
          e.target.value = '';
        }}
      />
      {value && (
        <button type="button" className="td-link td-files__clear" onClick={() => onChange(null)}>
          Remove
        </button>
      )}
    </div>
  );
}

export interface TreeOption {
  id: string;
  label: string;
  parent?: string;
}

/** Group picker as a tree (original `tB`). */
export function Tree({
  id,
  options,
  value,
  onChange,
  disabled,
  label = 'Group',
  empty = 'No groups yet',
}: {
  id?: string;
  options: TreeOption[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label?: string;
  empty?: string;
}) {
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const byParent = new Map<string, TreeOption[]>();
  options.forEach((o) => {
    const p = o.parent || '';
    byParent.set(p, [...(byParent.get(p) ?? []), o]);
  });
  const toggle = (k: string) =>
    setClosed((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const level = (parent: string, depth: number): ReactNode =>
    (byParent.get(parent) ?? []).map((o) => {
      const kids = byParent.has(o.id);
      const open = !closed.has(o.id);
      return (
        <li key={o.id}>
          <div
            className={`td-tree__row ${value === o.id ? 'is-selected' : ''}`}
            style={{ paddingLeft: 6 + depth * 14 }}
          >
            <button
              type="button"
              className="td-tree__chev"
              onClick={() => toggle(o.id)}
              disabled={!kids}
              aria-label={open ? 'Collapse' : 'Expand'}
            >
              {kids && <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={13} />}
            </button>
            <button
              type="button"
              className="td-tree__label"
              role="radio"
              aria-checked={value === o.id}
              disabled={disabled}
              onClick={() => onChange(value === o.id ? '' : o.id)}
            >
              {o.label}
            </button>
          </div>
          {kids && open && <ul>{level(o.id, depth + 1)}</ul>}
        </li>
      );
    });
  return (
    <div className="td-tree" id={id}>
      <ul role="radiogroup" aria-label={label}>
        {level('', 0)}
      </ul>
      {!options.length && <span className="td-tree__empty">{empty}</span>}
    </div>
  );
}

/** Tree options flattened in name order with their depth (for "Under" pickers). */
export function treeOrder(
  options: TreeOption[],
): { value: string; label: string; depth: number }[] {
  const ids = new Set(options.map((o) => o.id));
  const out: { value: string; label: string; depth: number }[] = [];
  const walk = (parent: string | undefined, depth: number) =>
    options
      .filter((o) => (o.parent && ids.has(o.parent) ? o.parent : undefined) === parent)
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
      .forEach((o) => {
        out.push({ value: o.id, label: o.label, depth });
        if (depth < 20) walk(o.id, depth + 1);
      });
  walk(undefined, 0);
  return out;
}

/** Disables a whole block of a form (original `KM`). */
export function Fieldset({ disabled, children }: { disabled: boolean; children: ReactNode }) {
  return disabled ? (
    <fieldset disabled className="gp-fieldset">
      {children}
    </fieldset>
  ) : (
    <>{children}</>
  );
}

/** The section steps above a long form (original `nB`). */
export function Stepper({
  sections,
  body,
}: {
  sections: { id: string; label: string }[];
  body: RefObject<HTMLDivElement | null>;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? '');
  useEffect(() => {
    const el = body.current;
    if (!el || !sections.length) return;
    const onScroll = () => {
      const top = el.getBoundingClientRect().top;
      let at = sections[0]!.id;
      el.querySelectorAll<HTMLElement>('[data-step]').forEach((s) => {
        if (s.getBoundingClientRect().top - top < 80) at = s.dataset.step!;
      });
      setActive(at);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [body, sections]);
  const go = (id: string) => {
    const el = body.current;
    const target = el?.querySelector<HTMLElement>(`[data-step="${id}"]`);
    if (el && target) el.scrollTo({ top: target.offsetTop - 12, behavior: 'smooth' });
    setActive(id);
  };
  return (
    <nav className="td-stepper" aria-label="Form sections">
      {sections.map((s, i) => (
        <span key={s.id} className="td-stepper__item">
          {i > 0 && <Icon name="ChevronRight" size={13} className="td-stepper__sep" />}
          <button
            type="button"
            className={active === s.id ? 'is-active' : ''}
            aria-current={active === s.id ? 'step' : undefined}
            onClick={() => go(s.id)}
          >
            {s.label}
            {active === s.id && <Icon name="ChevronDown" size={13} />}
          </button>
        </span>
      ))}
    </nav>
  );
}

/** Keyboard helper for menus: arrows / Home / End move between items. */
export function menuKeys(e: ReactKeyboardEvent, root: HTMLElement | null, selector: string) {
  const items = [...(root?.querySelectorAll<HTMLElement>(`${selector}:not(:disabled)`) ?? [])];
  const at = items.indexOf(document.activeElement as HTMLElement);
  const to =
    e.key === 'ArrowDown'
      ? at + 1
      : e.key === 'ArrowUp'
        ? at - 1
        : e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? items.length - 1
            : null;
  if (to === null || !items.length) return;
  e.preventDefault();
  items[(to + items.length) % items.length]?.focus();
}
