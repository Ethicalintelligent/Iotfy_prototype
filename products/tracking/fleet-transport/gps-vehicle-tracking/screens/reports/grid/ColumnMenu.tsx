// The column menu of the report grid (⋮ in each header): sort, filter conditions, pin, reset.
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Dropdown, Icon, usePortalRoot } from '../../smart-track/kit';
import { Radios, inFloatMenu } from '../ui';
import {
  NUMBER_OPS,
  TEXT_OPS,
  conditionComplete,
  describeFilter,
  filterActive,
  type ColumnFilter,
  type Condition,
} from './model';

const EDGE = 8;
const GAP = 4;
const MIN_HEIGHT = 160;
const ITEM = '[role^=menuitem]';

export type MenuView = 'main' | 'filter' | 'pin';

export function ColumnMenu({
  anchor,
  view,
  onView,
  onClose,
  sort,
  onSort,
  filter,
  pin,
  onReset,
}: {
  anchor: HTMLElement;
  view: MenuView;
  onView: (v: MenuView) => void;
  /** `focus` = give focus back to the ⋮ button. */
  onClose: (focus: boolean) => void;
  sort: 'asc' | 'desc' | null;
  onSort: (dir: 'asc' | 'desc' | null) => void;
  filter?: { value?: ColumnFilter; numeric: boolean; onChange: (f?: ColumnFilter) => void };
  pin?: { pinned: boolean; canPin: boolean; onChange: (pinned: boolean) => void };
  onReset?: () => void;
}) {
  const portal = usePortalRoot();
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });

  // Place under the ⋮ button (or above it when there is more room there).
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !anchor.isConnected) return;
    const r = anchor.getBoundingClientRect();
    const h = el.scrollHeight;
    const below = window.innerHeight - r.bottom - GAP - EDGE;
    const above = r.top - GAP - EDGE;
    const up = h > below && above > below;
    const max = Math.max(MIN_HEIGHT, up ? above : below);
    el.style.maxHeight = `${max}px`;
    el.style.top = `${up ? Math.max(EDGE, r.top - GAP - Math.min(h, max)) : r.bottom + GAP}px`;
    el.style.left = `${Math.max(EDGE, Math.min(r.left, window.innerWidth - EDGE - el.offsetWidth))}px`;
  });

  useEffect(() => {
    const el = box.current;
    const first = ['[data-autofocus]', `${ITEM}:not(:disabled)`, 'button']
      .map((s) => el?.querySelector<HTMLElement>(s))
      .find(Boolean);
    first?.focus();
  }, [view, portal]);

  useEffect(() => {
    const outside = (t: EventTarget | null) =>
      t instanceof Node && !box.current?.contains(t) && !anchor.contains(t) && !inFloatMenu(t);
    const down = (e: Event) => outside(e.target) && close.current(false);
    const resize = () => close.current(false);
    const key = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && close.current(true);
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('scroll', down, true);
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('scroll', down, true);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', key);
    };
  }, [anchor]);

  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || view === 'filter') return;
    if (e.key === 'Tab') return onClose(false);
    const items = [...(box.current?.querySelectorAll<HTMLElement>(`${ITEM}:not(:disabled)`) ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === 'ArrowDown'
        ? at + 1
        : e.key === 'ArrowUp'
          ? at - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? items.length - 1
              : null;
    if (next === null || !items.length) return;
    e.preventDefault();
    items[(next + items.length) % items.length]?.focus();
  };
  const onBlur = (e: React.FocusEvent) => {
    const to = e.relatedTarget;
    if (to && !box.current?.contains(to) && !anchor.contains(to) && !inFloatMenu(to))
      onClose(false);
  };
  const act = (fn: () => void) => () => {
    fn();
    onClose(true);
  };

  let body: ReactNode;
  if (view === 'filter' && filter) {
    body = (
      <>
        <BackButton title="Filter" onBack={() => onView('main')} />
        <FilterForm {...filter} />
      </>
    );
  } else if (view === 'pin' && pin) {
    body = (
      <>
        <BackButton title="Pin Column" onBack={() => onView('main')} />
        <ul className="td-pop__menu td-pop__list" role="menu" aria-label="Pin column">
          <Item
            icon="Pin"
            checked={pin.pinned}
            disabled={!pin.pinned && !pin.canPin}
            onClick={act(() => pin.onChange(true))}
          >
            Pin Left
          </Item>
          <Item icon="PinOff" checked={!pin.pinned} onClick={act(() => pin.onChange(false))}>
            No Pin
          </Item>
        </ul>
      </>
    );
  } else {
    const sections: ReactNode[][] = [
      [
        <Item key="asc" icon="ArrowUp" active={sort === 'asc'} onClick={act(() => onSort('asc'))}>
          Sort Ascending
        </Item>,
        <Item
          key="desc"
          icon="ArrowDown"
          active={sort === 'desc'}
          onClick={act(() => onSort('desc'))}
        >
          Sort Descending
        </Item>,
        sort && (
          <Item key="clear" icon="ArrowDownUp" onClick={act(() => onSort(null))}>
            Clear Sort
          </Item>
        ),
      ],
      [
        filter && (
          <Item
            key="filter"
            icon="Funnel"
            more
            hint={describeFilter(filter.value)}
            active={filterActive(filter.value)}
            onClick={() => onView('filter')}
          >
            Filter
          </Item>
        ),
      ],
      [
        pin && (
          <Item
            key="pin"
            icon="Pin"
            more
            hint={pin.pinned ? 'Left' : undefined}
            onClick={() => onView('pin')}
          >
            Pin Column
          </Item>
        ),
      ],
      [
        onReset && (
          <Item key="reset" icon="RotateCcw" onClick={act(onReset)}>
            Reset Columns
          </Item>
        ),
      ],
    ]
      .map((s) => s.filter(Boolean))
      .filter((s) => s.length);
    body = (
      <ul className="td-pop__menu td-pop__list" role="menu" aria-label="Column menu">
        {sections.flatMap((s, i) =>
          i ? [<li key={`sep${i}`} role="separator" className="td-mg__menu-sep" />, ...s] : s,
        )}
      </ul>
    );
  }

  if (!portal) return null;
  return createPortal(
    <div ref={box} className="td-pop__menu--float td-mg__menu" onKeyDown={onKey} onBlur={onBlur}>
      {body}
    </div>,
    portal,
  );
}

function Item({
  icon,
  children,
  onClick,
  active,
  checked,
  disabled,
  more,
  hint,
}: {
  icon: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  checked?: boolean;
  disabled?: boolean;
  more?: boolean;
  hint?: string;
}) {
  return (
    <li role="none">
      <button
        type="button"
        role={checked === undefined ? 'menuitem' : 'menuitemradio'}
        aria-checked={checked}
        className={active || checked ? 'is-active' : ''}
        disabled={disabled}
        onClick={onClick}
        aria-haspopup={more ? 'menu' : undefined}
      >
        <Icon name={icon} size={16} />
        <span className="td-pop__label">{children}</span>
        {hint && <small title={hint}>{hint}</small>}
        {more && <Icon name="ChevronRight" size={15} className="td-mg__menu-more" />}
        {checked && <Icon name="Check" size={15} className="td-pop__check" />}
      </button>
    </li>
  );
}

function BackButton({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <button
      type="button"
      className="td-mg__menu-back"
      onClick={onBack}
      aria-label={`${title}: back to the column menu`}
    >
      <Icon name="ChevronLeft" size={15} />
      {title}
    </button>
  );
}

function FilterForm({
  value,
  numeric,
  onChange,
}: {
  value?: ColumnFilter;
  numeric: boolean;
  onChange: (f?: ColumnFilter) => void;
}) {
  const name = useId();
  const ops = numeric ? NUMBER_OPS : TEXT_OPS;
  const valid = (c?: Condition): Condition =>
    c && ops.some((o) => o.value === c.op) ? c : { op: ops[0]!.value };
  const first = valid(value?.first);
  const second = valid(value?.second);
  const join = value?.join ?? 'and';
  const set = (patch: Partial<ColumnFilter>) => onChange({ first, second, join, ...patch });
  return (
    <div className="td-mg__filter">
      <ConditionRow
        label="Condition 1"
        c={first}
        ops={ops}
        numeric={numeric}
        autoFocus
        onChange={(c) => set({ first: c })}
      />
      {conditionComplete(first) && (
        <>
          <Radios
            name={name}
            aria-label="Join conditions"
            value={join}
            onChange={(v) => set({ join: v as 'and' | 'or' })}
            options={[
              { value: 'and', label: 'AND' },
              { value: 'or', label: 'OR' },
            ]}
          />
          <ConditionRow
            label="Condition 2"
            c={second}
            ops={ops}
            numeric={numeric}
            onChange={(c) => set({ second: c })}
          />
        </>
      )}
      {filterActive(value) && (
        <div className="td-mg__filter-foot">
          <button type="button" className="td-link" onClick={() => onChange(undefined)}>
            <Icon name="RotateCcw" size={12} />
            Clear Filter
          </button>
        </div>
      )}
    </div>
  );
}

function ConditionRow({
  label,
  c,
  ops,
  numeric,
  autoFocus,
  onChange,
}: {
  label: string;
  c: Condition;
  ops: { value: string; label: string }[];
  numeric: boolean;
  autoFocus?: boolean;
  onChange: (c: Condition) => void;
}) {
  const input = (field: 'value' | 'to', placeholder: string, focus?: boolean) => (
    <input
      type="text"
      className="gp-input"
      inputMode={numeric ? 'decimal' : undefined}
      placeholder={placeholder}
      autoComplete="off"
      aria-label={`${label} ${placeholder.replace('…', '')}`}
      data-autofocus={focus || undefined}
      value={c[field] ?? ''}
      onChange={(e) => onChange({ ...c, [field]: e.target.value })}
    />
  );
  const needsValue = c.op !== 'blank' && c.op !== 'notBlank';
  return (
    <div className="td-mg__cond" role="group" aria-label={label}>
      <Dropdown
        block
        searchable={false}
        aria-label={`${label} type`}
        value={c.op}
        options={ops}
        onChange={(op) => onChange({ ...c, op })}
      />
      {needsValue && input('value', c.op === 'between' ? 'From' : 'Filter…', autoFocus)}
      {c.op === 'between' && input('to', 'To')}
    </div>
  );
}
