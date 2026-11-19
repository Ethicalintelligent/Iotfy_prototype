import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../cx';
import { Chip, EmptyState, Icon } from './basics';
import type { IconName } from '../icons';

/** Calls `onEscape` when Esc is pressed while `active`. */
export function useEscape(active: boolean, onEscape: () => void) {
  const cb = useRef(onEscape);
  cb.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && cb.current();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [active]);
}

const portal = (node: ReactNode) =>
  typeof document === 'undefined' ? null : createPortal(node, document.body);

// ---------------------------------------------------------------- Modal
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Small chip beside the title, e.g. the record ID. */
  badge?: ReactNode;
  /** Footer row. Put Cancel / Save on the right; a Delete on the left. */
  footer?: ReactNode;
  /** Left part of the footer (e.g. Delete). */
  footerStart?: ReactNode;
  maxWidth?: number;
  children?: ReactNode;
}
export function Modal({
  open,
  onClose,
  title,
  badge,
  footer,
  footerStart,
  maxWidth,
  children,
}: ModalProps) {
  const box = useRef<HTMLDivElement>(null);
  useEscape(open, onClose);
  useEffect(() => {
    if (!open) return;
    const first = box.current?.querySelector<HTMLElement>(
      'input, select, textarea, button:not([data-skipfocus])',
    );
    first?.focus();
  }, [open]);
  if (!open) return null;
  return portal(
    <div className="ui-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={box}
        className="ui-modal"
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        style={{ maxWidth }}
      >
        <div className="ui-modal__head">
          <h2 className="ui-modal__title">{title}</h2>
          {badge != null && <Chip>{badge}</Chip>}
        </div>
        {children}
        {(footer || footerStart) && (
          <div className="ui-modal__foot">
            <div>{footerStart}</div>
            <div>{footer}</div>
          </div>
        )}
      </div>
    </div>,
  );
}

// ---------------------------------------------------------------- Toast
const ToastContext = createContext<(message: string) => void>(() => {});

/** Wrap the app once; then call `useToast()` anywhere. Messages show for 3.5 s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 3500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg &&
        portal(
          <div className="ui-toast" role="status">
            {msg}
          </div>,
        )}
    </ToastContext.Provider>
  );
}
/** `const toast = useToast(); toast('Saved');` */
export const useToast = () => useContext(ToastContext);

// ---------------------------------------------------------------- Popover
export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** 'top-right' (default): under the header tools. 'rail': beside the rail, at the bottom. */
  placement?: 'top-right' | 'rail';
  label?: string;
  width?: number;
  children: ReactNode;
}
export function Popover({
  open,
  onClose,
  placement = 'top-right',
  label,
  width,
  children,
}: PopoverProps) {
  useEscape(open, onClose);
  if (!open) return null;
  return portal(
    <>
      <div className="ui-scrim" onClick={onClose} />
      <div
        className={`ui-pop ui-pop--${placement}`}
        role="menu"
        aria-label={label}
        style={{ width }}
      >
        {children}
      </div>
    </>,
  );
}
export function PopoverHeader({ label, children }: { label: ReactNode; children?: ReactNode }) {
  return (
    <div className="ui-pophead">
      <span className="ui-pophead__label">{label}</span>
      {children}
    </div>
  );
}
export function PopoverSection({ children }: { children: ReactNode }) {
  return <div className="ui-popsec">{children}</div>;
}
export function PopoverSeparator() {
  return <div className="ui-popsep" />;
}
export interface PopoverItemProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: IconName;
  /** Element shown before the text instead of an icon (e.g. a Dot or Avatar). */
  lead?: ReactNode;
  selected?: boolean;
  danger?: boolean;
  active?: boolean;
  onClick?: () => void;
}
export function PopoverItem({
  title,
  subtitle,
  icon,
  lead,
  selected,
  danger,
  active,
  onClick,
}: PopoverItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cx(
        'ui-popitem',
        selected && 'ui-popitem--on',
        danger && 'ui-popitem--danger',
        active && 'ui-popitem--active',
      )}
      onClick={onClick}
    >
      {lead ?? (icon && <Icon name={icon} size={16} />)}
      <span className="ui-popitem__text">
        <b>{title}</b>
        {subtitle && <small>{subtitle}</small>}
      </span>
      {selected && <Icon name="check" size={16} />}
    </button>
  );
}

// ---------------------------------------------------------------- SearchPalette (Ctrl+K)
/** Calls `onOpen` on Ctrl+K / Cmd+K anywhere on the page. */
export function useCtrlK(onOpen: () => void) {
  const cb = useRef(onOpen);
  cb.current = onOpen;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        cb.current();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
}

/** The wide "Search…  Ctrl K" box in the header. Opens the palette. */
export function SearchTrigger({
  onClick,
  placeholder = 'Search…',
}: {
  onClick: () => void;
  placeholder?: string;
}) {
  return (
    <button
      type="button"
      className="ui-hsearch"
      onClick={onClick}
      title="Search everything (Ctrl+K)"
      aria-label="Search"
    >
      <Icon name="search" size={16} />
      <span>{placeholder}</span>
      <kbd>Ctrl K</kbd>
    </button>
  );
}

export interface SearchResult {
  id: string;
  title: string;
  /** Grey second line, e.g. "Page · Admin console". */
  subtitle?: string;
  icon?: IconName;
  onSelect: () => void;
}
export interface SearchPaletteProps {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  results: SearchResult[];
  placeholder?: string;
}
export function SearchPalette({
  open,
  onClose,
  query,
  onQueryChange,
  results,
  placeholder = 'Search pages, products, assets…',
}: SearchPaletteProps) {
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEscape(open, onClose);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => setActive(0), [query]);
  if (!open) return null;
  const choose = (r: SearchResult | undefined) => {
    if (!r) return;
    r.onSelect();
    onClose();
  };
  return portal(
    <>
      <div className="ui-scrim ui-scrim--dim" onClick={onClose} />
      <div className="ui-palette" role="dialog" aria-label="Search">
        <div className="ui-palette__in">
          <Icon name="search" />
          <input
            ref={input}
            type="search"
            value={query}
            placeholder={placeholder}
            autoComplete="off"
            aria-label="Search"
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter') choose(results[active]);
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="ui-palette__res">
          {results.length ? (
            results.map((r, i) => (
              <PopoverItem
                key={r.id}
                title={r.title}
                subtitle={r.subtitle}
                icon={r.icon ?? 'lookups'}
                active={i === active}
                onClick={() => choose(r)}
              />
            ))
          ) : (
            <EmptyState>
              {query ? 'No results' : 'Type to search. Tip: Ctrl+K opens this from anywhere.'}
            </EmptyState>
          )}
        </div>
      </div>
    </>,
  );
}

// ---------------------------------------------------------------- EditBar
export interface EditBarProps {
  /** Names of the things with unsaved changes. Empty: nothing changed yet. */
  changes: string[];
  /** Neon's exact error text after a failed save. */
  error?: string | null;
  saving?: boolean;
  onCancel: () => void;
  onSave: () => void;
  /** Render in the page flow instead of fixed at the bottom (used by the gallery). */
  inline?: boolean;
}
/** Bottom reminder bar while editing. Save / Cancel also sit on the record card itself. */
export function EditBar({ changes, error, saving, onCancel, onSave, inline }: EditBarProps) {
  const dirty = changes.length > 0;
  return (
    <div
      className={cx('ui-editbar', error && 'ui-editbar--error', inline && 'ui-editbar--inline')}
      role="region"
      aria-label="Editing"
    >
      <div className="ui-editbar__text">
        <b>{error ? 'Not saved' : 'Editing'}</b>
        <span>
          {error ? error : dirty ? `Unsaved changes in ${changes.join(', ')}` : 'No changes yet'}
        </span>
      </div>
      <button type="button" className="ui-btn" onClick={onCancel}>
        {dirty ? 'Cancel' : 'Done'}
      </button>
      {dirty && (
        <button type="button" className="ui-btn ui-btn--primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : error ? 'Try again' : 'Save'}
        </button>
      )}
    </div>
  );
}
