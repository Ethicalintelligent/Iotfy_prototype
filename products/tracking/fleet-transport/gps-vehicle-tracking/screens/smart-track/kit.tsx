// IT-0036. The EIT Smart Track pages' own components, rebuilt in React from the owner's HTML
// pages (removed after conversion in IT-0037; in git history). Same markup and class names as the originals, so the
// original stylesheet (smart-track.css, scoped under .st-scope) gives the same look.
// Root CLAUDE.md §3a: customer screens follow the provided design, not @iotify/ui.
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ICONS, type IconNode } from './icons';
import './shell-fit.css';

/* ------------------------------------------------------------------ page frame */

/**
 * The page area of the original (`td-app › td-main › td-content`), inside the IoTIFY shell.
 * The shell's sidebar and header replace the page's own (root CLAUDE.md §3a), so only the
 * content is rendered. Fills the shell's content area edge to edge, like the original page.
 */
/** Each page has its own copy of the original stylesheet, scoped under its own class (e.g. `st-alerts`). */
const Scope = createContext('st-groups');
export const useScope = () => useContext(Scope);
/**
 * IT-0045: renders part of one page with another page's stylesheet scope (its pop-ups go to that
 * page's portal root), so a page can reuse another page's dialog with its own look
 * (Centralized Tracking's Live Monitor opens Map View's Nearby Vehicles dialog).
 */
export function ScopeAs({ scope, children }: { scope: string; children: ReactNode }) {
  return <Scope.Provider value={scope}>{children}</Scope.Provider>;
}

/** Window width from which the original pages show their desktop layout (their `--bp-desktop`). */
const DESKTOP = 1280;

/**
 * Page height (the admin's rule, IT-0037): every page fits the screen exactly (no window
 * scroll; long lists scroll inside their own card), except Dashboard and Grid View, which
 * scroll as one page (`scroll`) with a single scrollbar.
 */
export function SmartTrackPage({
  scope,
  scroll = false,
  children,
}: {
  scope: string;
  scroll?: boolean;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    height: 0,
    width: 0,
    zoom: 1,
  });
  useLayoutEffect(() => {
    const measure = () => {
      const el = box.current;
      const parent = el?.parentElement;
      if (!el || !parent) return;
      const s = getComputedStyle(parent);
      const top = parseFloat(s.paddingTop) || 0;
      const bottom = parseFloat(s.paddingBottom) || 0;
      // The originals lay out for the whole window; here they get only the space beside the
      // IoTIFY sidebar. When the window is wide enough for their desktop layout but that space
      // is not (e.g. a 1280px window), lay the page out 1280px wide and shrink it slightly to
      // fit, as the original looks on its own (same rule as the former iframe, IT-0029).
      const space = parent.clientWidth;
      const width = window.innerWidth >= DESKTOP && space < DESKTOP ? DESKTOP : space;
      const zoom = space / width;
      // The page starts at the top of the shell's content area (its top padding is cancelled)
      // and ends at the window's bottom edge (its bottom padding is cancelled too).
      // (measured from this box, below the header: its own negative top margin taken out)
      const pageTop =
        el.getBoundingClientRect().top +
        window.scrollY -
        (parseFloat(getComputedStyle(el).marginTop) || 0) -
        top;
      setFit({
        left: parseFloat(s.paddingLeft) || 0,
        right: parseFloat(s.paddingRight) || 0,
        top,
        bottom,
        height: Math.max(320, window.innerHeight - pageTop),
        width,
        zoom,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return (
    <div
      ref={box}
      style={{
        marginLeft: -fit.left,
        marginRight: -fit.right,
        marginTop: -fit.top,
        marginBottom: -fit.bottom,
        overflowX: 'clip',
        // fit: exactly the window height below the header, never taller
        height: !scroll && fit.height ? fit.height : undefined,
      }}
    >
      <div
        className={scope}
        data-st=""
        data-fit={scroll ? undefined : ''}
        data-theme="light"
        style={{
          width: fit.width || undefined,
          minHeight: fit.height / fit.zoom,
          height: !scroll && fit.height ? fit.height / fit.zoom : undefined,
          zoom: fit.zoom < 1 ? fit.zoom : undefined,
          // Leaflet maps cancel the zoom (shell-fit.css): Leaflet does not support CSS zoom.
          ['--st-unzoom' as string]: fit.zoom < 1 ? 1 / fit.zoom : 1,
        }}
      >
        <Scope.Provider value={scope}>
          <div className="td-app">
            <div className="td-main">
              <main className="td-content">{children}</main>
            </div>
          </div>
        </Scope.Provider>
      </div>
    </div>
  );
}

/** Pop-up menus are placed on the page body (as in the original), inside the style scope. */
export function usePortalRoot(): HTMLElement | null {
  const scope = useScope();
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    let root = document.getElementById(`${scope}-portal`);
    if (!root) {
      root = document.createElement('div');
      root.id = `${scope}-portal`;
      root.className = `${scope} st-portal`;
      root.dataset.st = '';
      root.dataset.theme = 'light';
      document.body.appendChild(root);
    }
    setEl(root);
  }, [scope]);
  return el;
}

/* ------------------------------------------------------------------ icon */

const EXTRA: Record<string, IconNode> = {};
/** A page adds the icons only it uses (the original pages register theirs the same way). */
export function registerIcons(icons: Record<string, IconNode>) {
  Object.assign(EXTRA, icons);
}

export function Icon({
  name,
  size = 16,
  strokeWidth = 2,
  className,
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const nodes = ICONS[name] ?? EXTRA[name] ?? ICONS.CircleDot ?? [];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `lucide ${className}` : 'lucide'}
      aria-hidden="true"
    >
      {nodes.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

/* ------------------------------------------------------------------ card */

export function Card({
  title,
  subtitle,
  icon,
  tone = 'brand',
  meta,
  actions,
  className = '',
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: string;
  tone?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={`td-card ${className}`}>
      <header className="td-card__head">
        {icon && (
          <span className={`td-badge td-badge--solid tone-${tone}`}>
            <Icon name={icon} size={16} />
          </span>
        )}
        <div className="td-card__titles">
          <h2 className="td-card__title ">{title}</h2>
          {subtitle && <p className="td-card__sub">{subtitle}</p>}
        </div>
        {(meta || actions) && (
          <div className="td-card__right">
            {meta && <span className="td-card__meta">{meta}</span>}
            {actions}
          </div>
        )}
      </header>
      <div className="td-card__body">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ table */

export interface Column<R> {
  key: string;
  header: ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  render: (row: R) => ReactNode;
}

const alignClass = (a?: string) => (a === 'right' ? 'num' : a === 'center' ? 'center' : undefined);

export function Table<R>({
  columns,
  rows,
  rowKey,
  empty = 'No rows.',
  onRowClick,
}: {
  columns: Column<R>[];
  rows: R[];
  rowKey: (row: R) => string;
  empty?: ReactNode;
  onRowClick?: (row: R) => void;
}) {
  return (
    <div className="td-table-wrap">
      <table className="td-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={alignClass(c.align)}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="td-empty" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr
                key={rowKey(r)}
                className={onRowClick ? 'gp-row-click' : undefined}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={alignClass(c.align)}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ modal */

export function Modal({
  title,
  onClose,
  footer,
  width = 560,
  children,
}: {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  width?: number;
  children?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="td-modal">
      <div className="td-modal__scrim" onClick={onClose} />
      <div
        className="td-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width: `min(${width}px, 100%)` }}
      >
        <header className="gp-modal__head">
          <strong className="gp-modal__title">{title}</strong>
          <button
            type="button"
            className="td-icon-btn td-icon-btn--sm td-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="X" size={15} />
          </button>
        </header>
        <div className="td-modal__body">{children}</div>
        {footer && <footer className="gp-modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ form */

export function Field({
  label,
  error,
  required,
  children,
}: {
  label: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`gp-field ${error ? 'has-error' : ''}`}>
      <span>
        {label}
        {required && <em aria-hidden="true"> *</em>}
      </span>
      {children}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="gp-input" {...props} />;
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="gp-form-grid">{children}</div>;
}

/* ------------------------------------------------------------------ dropdown */

export interface Option {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

/** Above this many options the menu gets a search box (as in the original). */
const SEARCH_FROM = 6;
const matches = (label: string, q: string) => label.toLowerCase().includes(q.trim().toLowerCase());

export function Dropdown({
  value,
  onChange,
  options,
  placeholder,
  icon,
  id,
  disabled,
  block,
  className,
  title,
  searchable,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  icon?: string;
  id?: string;
  disabled?: boolean;
  block?: boolean;
  className?: string;
  title?: string;
  searchable?: boolean;
  'aria-label'?: string;
}) {
  const portal = usePortalRoot();
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    minWidth: number;
    maxHeight: number;
  } | null>(null);
  const [query, setQuery] = useState('');
  const all =
    placeholder !== undefined
      ? [{ value: '', label: placeholder || 'Select…' }, ...options]
      : options;
  const current = all.find((o) => o.value === value);
  const isPlaceholder = value === '' && placeholder !== undefined;
  const withSearch = searchable ?? options.length > SEARCH_FROM;
  const shown = query.trim() ? options.filter((o) => matches(o.label, query)) : all;

  const open = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 240 && above > below;
    setPos({
      ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
      left: r.left,
      minWidth: r.width,
      maxHeight: Math.max(120, Math.min(320, (up ? above : below) - 6)),
    });
    setQuery('');
  };
  const close = (focus = false) => {
    setPos(null);
    if (focus) btn.current?.focus();
  };

  useLayoutEffect(() => {
    const el = menu.current;
    if (!pos || !el) return;
    const over = el.getBoundingClientRect().right - (window.innerWidth - 8);
    if (over > 0) el.style.left = `${Math.max(8, pos.left - over)}px`;
  }, [pos]);

  useEffect(() => {
    if (!pos) return;
    const outside = (e: Event) =>
      !menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node);
    const onDown = (e: Event) => {
      if (outside(e)) close();
    };
    const onResize = () => close();
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('scroll', onDown, true);
    window.addEventListener('resize', onResize);
    const search = menu.current?.querySelector<HTMLInputElement>('input[type=search]');
    if (search) search.focus();
    else
      (
        menu.current?.querySelector<HTMLButtonElement>('[aria-selected=true]:not(:disabled)') ??
        menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')
      )?.focus();
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('scroll', onDown, true);
      window.removeEventListener('resize', onResize);
    };
  }, [pos]);

  const pick = (v: string) => {
    close(true);
    if (v !== value) onChange(v);
  };
  const onButtonKey = (e: KeyboardEvent) => {
    if (!pos && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      open();
    }
  };
  const onMenuKey = (e: KeyboardEvent) => {
    const items = [
      ...(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []),
    ];
    const inInput = (e.target as HTMLElement).tagName === 'INPUT';
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const go = (i: number) => {
      e.preventDefault();
      items[(i + items.length) % items.length]?.focus();
    };
    if (inInput && e.key === 'Enter') {
      e.preventDefault();
      items[0]?.click();
    } else if (e.key === 'ArrowDown') go(inInput ? 0 : at + 1);
    else if (e.key === 'ArrowUp') {
      if (!inInput && at === 0 && withSearch) {
        e.preventDefault();
        menu.current?.querySelector<HTMLInputElement>('input[type=search]')?.focus();
      } else if (!inInput) go(at - 1);
    } else if (!inInput && e.key === 'Home') go(0);
    else if (!inInput && e.key === 'End') go(items.length - 1);
    else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === 'Tab') close(true);
  };

  const cls = [
    'td-ddl',
    block && 'td-ddl--block',
    isPlaceholder && 'is-placeholder',
    pos && 'is-open',
    className,
  ]
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
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={pos !== null}
        onClick={() => (pos ? close() : open())}
        onKeyDown={onButtonKey}
      >
        {icon && <Icon name={icon} size={16} className="td-ddl__icon" />}
        <span className="td-ddl__label">{current?.label ?? value}</span>
        <Icon name="ChevronDown" size={15} className="td-ddl__chev" />
      </button>
      {pos &&
        portal &&
        createPortal(
          <div
            ref={menu}
            className={`td-pop__menu td-pop__menu--float ${withSearch ? 'has-search' : ''}`}
            style={{
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              minWidth: Math.max(pos.minWidth, 220),
              maxHeight: pos.maxHeight,
            }}
            onKeyDown={onMenuKey}
          >
            {withSearch && (
              <label className="td-pop__search">
                <Icon name="Search" size={14} />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  aria-label={`Search ${ariaLabel ?? 'options'}`}
                  autoComplete="off"
                />
              </label>
            )}
            <ul className="td-pop__list" role="listbox" aria-label={ariaLabel}>
              {shown.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    disabled={o.disabled}
                    className={o.value === value ? 'is-active' : ''}
                    onClick={() => pick(o.value)}
                  >
                    {o.icon && <Icon name={o.icon} size={16} />}
                    <span className="td-pop__label">{o.label}</span>
                    {o.value === value && <Icon name="Check" size={15} className="td-pop__check" />}
                  </button>
                </li>
              ))}
              {!shown.length && (
                <li className="td-pop__none" role="presentation">
                  No results found
                </li>
              )}
            </ul>
          </div>,
          portal,
        )}
    </>
  );
}

/* ------------------------------------------------------------------ states */

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="gp-state" role="status">
      <Icon name="Loader" size={18} className="gp-spin" /> {label}
    </p>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="gp-state is-error" role="alert">
      <Icon name="CircleAlert" size={18} />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="td-link" onClick={onRetry}>
          <Icon name="RotateCcw" size={13} />
          Retry
        </button>
      )}
    </div>
  );
}
