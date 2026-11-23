// Anchored menus: Dropdown (a panel under the button that opened it) and MenuSelect (the
// design's labelled picker, "Manage Module ▾ Vehicle" / "Select Report ▾", with search and
// sections). From the approved GPS Vehicle Tracking design (Desktop/vs).
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../cx';
import type { IconName } from '../icons';
import { Icon } from './basics';
import { useEscape } from './overlays';

/** A panel under (or above, near the bottom) the element `anchor`, closed by Esc or a click outside. */
export function Dropdown({
  anchor,
  open,
  onClose,
  align = 'left',
  width,
  label,
  children,
}: {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
  width?: number;
  label?: string;
  children: ReactNode;
}) {
  useEscape(open, onClose);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const w = width ?? Math.max(r.width, 200);
      const left = align === 'right' ? r.right - w : r.left;
      const up = r.bottom + 320 > window.innerHeight && r.top > 340;
      setPos({
        top: up ? r.top - 4 : r.bottom + 4,
        left: Math.max(8, Math.min(left, window.innerWidth - w - 8)),
        up,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchor, align, width]);
  if (!open || !pos) return null;
  return createPortal(
    <>
      <div className="ui-scrim" onClick={onClose} />
      <div
        className="ui-dropdown"
        role="menu"
        aria-label={label}
        style={{
          top: pos.top,
          left: pos.left,
          width: width ?? Math.max(anchor?.getBoundingClientRect().width ?? 0, 200),
          transform: pos.up ? 'translateY(-100%)' : undefined,
        }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

/** A row in a Dropdown. */
export function DropdownItem({
  icon,
  children,
  selected,
  danger,
  onClick,
}: {
  icon?: IconName;
  children: ReactNode;
  selected?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cx('ui-dropdown__item', selected && 'is-on', danger && 'is-danger')}
      onClick={onClick}
    >
      {icon && <Icon name={icon} size={15} />}
      <span>{children}</span>
      {selected && <Icon name="check" size={14} />}
    </button>
  );
}

export interface MenuOption<V extends string> {
  value: V;
  label: string;
  icon?: IconName;
  /** Section heading the option belongs to (options with the same section are listed together). */
  section?: string;
  /** Shown greyed out with this reason. */
  disabledReason?: string;
}

/**
 * The design's labelled picker: "Manage Module ▾ Vehicle". A button with the label and the current
 * choice; opens a list with a search box and section headings.
 */
export function MenuSelect<V extends string>({
  label,
  value,
  options,
  onChange,
  searchPlaceholder = 'Search…',
  width = 280,
}: {
  label: string;
  value: V;
  options: MenuOption<V>[];
  onChange: (v: V) => void;
  searchPlaceholder?: string;
  width?: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const cur = options.find((o) => o.value === value);
  const list = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));
  const sections = [...new Set(list.map((o) => o.section ?? ''))];
  return (
    <span className="ui-menuselect">
      <b>{label}</b>
      <button
        ref={ref}
        type="button"
        className="ui-menuselect__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ${cur?.label ?? ''}`}
        onClick={() => setOpen(!open)}
      >
        {cur?.icon && <Icon name={cur.icon} size={15} />}
        <span>{cur?.label}</span>
        <Icon name="down" size={14} />
      </button>
      <Dropdown
        anchor={ref.current}
        open={open}
        onClose={() => setOpen(false)}
        width={width}
        label={label}
      >
        {options.length > 10 && (
          <div className="ui-dropdown__search">
            <Icon name="search" size={14} />
            <input
              autoFocus
              value={q}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        )}
        <div className="ui-dropdown__list">
          {sections.map((s) => (
            <div key={s}>
              {s && <div className="ui-dropdown__section">{s}</div>}
              {list
                .filter((o) => (o.section ?? '') === s)
                .map((o) => (
                  <DropdownItem
                    key={o.value}
                    icon={o.icon}
                    selected={o.value === value}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      setQ('');
                    }}
                  >
                    {o.label}
                    {o.disabledReason && (
                      <small className="ui-dropdown__why">{o.disabledReason}</small>
                    )}
                  </DropdownItem>
                ))}
            </div>
          ))}
          {!list.length && <div className="ui-dropdown__none">Nothing matches.</div>}
        </div>
      </Dropdown>
    </span>
  );
}
