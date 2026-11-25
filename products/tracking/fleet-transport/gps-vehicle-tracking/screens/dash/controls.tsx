// IT-0036. Small pieces of the original Dashboard page (Dashboard.html, removed in IT-0037 (git history)) that the shared
// kit does not have, with the original's exact markup and class names: dropdown with a live-dot
// icon, segmented buttons, pager, checkbox, image with fallback, vehicle thumb, avatar, medal, pill.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon, usePortalRoot } from '../smart-track/kit';

/** The original's number format (`toLocaleString()`), "—" for nothing. */
export const fmt = (v: number | string | null | undefined): string =>
  v == null ? '—' : typeof v === 'number' ? v.toLocaleString() : v;

/* ------------------------------------------------------------------ dropdown (td-ddl) */

export interface DdlOption {
  value: string;
  label: string;
}

const SEARCH_FROM = 6;

/**
 * The original's dropdown. `icon` may be an icon name or any node (the period picker shows a live
 * dot). `alignRight` puts the menu under the button's right edge (the dashboard does this for the
 * pickers in its summary, top and ranking cards).
 */
export function Ddl({
  value,
  onChange,
  options,
  icon,
  id,
  className,
  title,
  block,
  alignRight,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: DdlOption[];
  icon?: ReactNode;
  id?: string;
  className?: string;
  title?: string;
  block?: boolean;
  alignRight?: boolean;
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
  const current = options.find((o) => o.value === value);
  const withSearch = options.length > SEARCH_FROM;
  const shown = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

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
    const b = btn.current;
    if (!pos || !el || !b) return;
    if (alignRight) {
      const r = b.getBoundingClientRect();
      el.style.left = `${Math.max(8, r.right - el.offsetWidth)}px`;
      if (pos.top !== undefined) el.style.top = `${r.bottom + 5}px`;
      return;
    }
    const over = el.getBoundingClientRect().right - (window.innerWidth - 8);
    if (over > 0) el.style.left = `${Math.max(8, pos.left - over)}px`;
  }, [pos, alignRight]);

  useEffect(() => {
    if (!pos) return;
    const onDown = (e: Event) => {
      if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node))
        close();
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

  const cls = ['td-ddl', block && 'td-ddl--block', pos && 'is-open', className]
    .filter(Boolean)
    .join(' ');
  return (
    <>
      <button
        ref={btn}
        type="button"
        id={id}
        className={cls}
        title={title}
        aria-haspopup="listbox"
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
        {typeof icon === 'string' ? <Icon name={icon} size={16} className="td-ddl__icon" /> : icon}
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
                    className={o.value === value ? 'is-active' : ''}
                    onClick={() => pick(o.value)}
                  >
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

/* ------------------------------------------------------------------ segmented buttons (td-seg) */

export interface SegOption {
  id: string;
  label?: string;
  icon?: string;
  title?: string;
}

export function Seg({
  options,
  value,
  onChange,
  size = 'md',
  label,
}: {
  options: SegOption[];
  value: string;
  onChange: (id: string) => void;
  size?: string;
  label?: string;
}) {
  return (
    <div className="td-seg-wrap">
      <div className={`td-seg td-seg--${size}`} role="tablist" aria-label={label}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={on}
              title={o.title}
              aria-label={o.label ? undefined : o.title}
              className={`td-seg__btn ${on ? 'is-active' : ''} ${o.icon && !o.label ? 'is-icon' : ''}`}
              onClick={() => onChange(o.id)}
            >
              {o.icon && <Icon name={o.icon} size={15} />}
              {o.label && <span>{o.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pager (td-pager) */

export function Pager({
  page,
  size,
  total,
  onChange,
}: {
  page: number;
  size: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  const go = (p: number) => onChange(Math.max(0, Math.min(pages - 1, p)));
  const first = Math.max(0, Math.min(page - 2, pages - 5));
  return (
    <div className="td-pager">
      <small>
        Showing {total ? page * size + 1 : 0}-{Math.min(total, page * size + size)} of {fmt(total)}
      </small>
      <span className="td-pager__pages">
        <button type="button" onClick={() => go(page - 1)} aria-label="Previous page">
          <Icon name="ChevronLeft" size={13} />
        </button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => first + i).map((p) => (
          <button
            key={p}
            type="button"
            className={page === p ? 'is-active' : ''}
            aria-current={page === p ? 'page' : undefined}
            onClick={() => go(p)}
          >
            {p + 1}
          </button>
        ))}
        <button type="button" onClick={() => go(page + 1)} aria-label="Next page">
          <Icon name="ChevronRight" size={13} />
        </button>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ checkbox (td-check) */

export function Check({
  checked,
  mixed,
  onChange,
  className = '',
  children,
}: {
  checked: boolean;
  mixed?: boolean;
  onChange: (on: boolean) => void;
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

/* ------------------------------------------------------------------ pictures */

/** Image that shows `fallback` when it has no source or fails to load. */
export function Img({
  src,
  alt,
  width,
  height,
  className = '',
  fallback,
}: {
  src?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return <>{fallback}</>;
  return (
    <img
      className={`td-img ${className}`}
      src={src}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      onError={() => setFailed(src)}
    />
  );
}

export function VehicleThumb({ icon, size = 40 }: { icon: string; size?: number }) {
  return (
    <span className="td-vthumb" style={{ width: size * 1.4, height: size }}>
      <Icon name={icon} size={size * 0.62} strokeWidth={1.6} />
    </span>
  );
}

export function Avatar({
  name,
  tone = 'brand',
  size = 32,
}: {
  name: string;
  tone?: string;
  size?: number;
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <span
      className={`td-avatar tone-${tone}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials || '?'}
    </span>
  );
}

export function Medal({ rank, size = 30 }: { rank: number; size?: number }) {
  return (
    <span
      className={`td-medal ${rank <= 3 ? `is-${rank}` : ''}`}
      style={{ width: size, height: size }}
    >
      {rank}
    </span>
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
