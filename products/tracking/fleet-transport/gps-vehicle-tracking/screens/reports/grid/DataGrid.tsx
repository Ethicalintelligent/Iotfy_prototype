// The original's report grid (`td-mg`): group bar (drag a header to group), sortable and movable
// headers with a column menu, a filter row, frozen columns, skeleton/empty/error rows and paging.
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { Dropdown, Icon, useScope } from '../../smart-track/kit';
import { ColumnMenu, type MenuView } from './ColumnMenu';
import {
  activeColumnFilters,
  applyView,
  columnsByKeys,
  filterActive,
  looksNumeric,
  type Column,
  type ColumnFilter,
  type Row,
  type Sort,
} from './model';

export const PAGE_SIZES = [10, 25, 50, 100];
const LABEL_PAD = 18;
const DRAG_TYPE = 'text/x-gp-column';
const GHOST_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v20"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="m5 9-3 3 3 3"/><path d="m9 5 3-3 3 3"/></svg>';

const groupPath = (cols: Column[], row: Row) => cols.map((c) => c.value(row) || '(blank)');
const pathKey = (p: string[]) => p.join('\0');

/** Measured header label widths, so no header label is ever cut. */
function useLabelWidths(head: RefObject<HTMLTableRowElement>, dep: string) {
  const [widths, setWidths] = useState<Record<string, number>>({});
  useLayoutEffect(() => {
    const el = head.current;
    if (!el || typeof document.createRange !== 'function') return;
    const measure = () => {
      const out: Record<string, number> = {};
      el.querySelectorAll<HTMLElement>('.td-mg__th-sort[data-col]').forEach((btn) => {
        const label = btn.firstElementChild;
        if (!label) return;
        const range = document.createRange();
        range.selectNodeContents(label);
        const w = range.getBoundingClientRect().width;
        if (!w) return;
        const s = getComputedStyle(btn);
        out[btn.dataset.col!] =
          Math.ceil(w + parseFloat(s.paddingLeft) + parseFloat(s.paddingRight) + LABEL_PAD) + 1;
      });
      setWidths((prev) => {
        const keys = Object.keys(out);
        return keys.length === Object.keys(prev).length && keys.every((k) => prev[k] === out[k])
          ? prev
          : out;
      });
    };
    measure();
    let alive = true;
    void document.fonts?.ready.then(() => alive && measure());
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => {
      alive = false;
      ro?.disconnect();
    };
  }, [head, dep]);
  return widths;
}

type Entry = { row: Row; path: string[] } | { collapsed: string[] };

export function DataGrid({
  title,
  columns,
  rows,
  rowKey,
  plural,
  frozen,
  groupBy,
  onGroupBy,
  query,
  filters,
  onFilters,
  sort,
  onSort,
  columnFilters,
  onColumnFilters,
  onPin,
  onResetColumns,
  onMoveColumn,
  loading,
  error,
  onRetry,
  emptyText,
}: {
  title?: ReactNode;
  columns: Column[];
  rows: Row[];
  rowKey: (r: Row) => string;
  plural: string;
  frozen: number;
  groupBy: string[];
  onGroupBy: (keys: string[]) => void;
  query: string;
  filters: Record<string, string>;
  onFilters: (f: Record<string, string>) => void;
  sort: Sort | null;
  onSort: (s: Sort | null) => void;
  columnFilters: Record<string, ColumnFilter>;
  onColumnFilters: (f: Record<string, ColumnFilter>) => void;
  onPin: (key: string, pinned: boolean) => void;
  onResetColumns: () => void;
  onMoveColumn: (moved: string, target: string, after: boolean) => void;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  emptyText: string;
}) {
  const scope = useScope();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [overBar, setOverBar] = useState(false);
  const [menu, setMenu] = useState<{ key: string; anchor: HTMLElement; view: MenuView } | null>(
    null,
  );
  const dragKey = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ key: string; after: boolean } | null>(null);

  const shown = useMemo(
    () => applyView(rows, columns, { query, filters, columnFilters, sort, groupBy }),
    [rows, columns, query, filters, columnFilters, sort, groupBy],
  );
  const groupCols = useMemo(() => columnsByKeys(columns, groupBy), [columns, groupBy]);
  const menuCol = menu ? columns.find((c) => c.key === menu.key) : undefined;
  const menuNumeric = useMemo(
    () => (menuCol ? looksNumeric(rows.slice(0, 200).map((r) => menuCol.value(r))) : false),
    [menuCol, rows],
  );
  useEffect(() => {
    if (menu && !menuCol) setMenu(null);
  }, [menu, menuCol]);

  // Rows with their group path; a collapsed group shows as one line.
  const { entries, groupCounts } = useMemo(() => {
    const counts = new Map<string, number>();
    if (!groupCols.length)
      return { entries: shown.map((row): Entry => ({ row, path: [] })), groupCounts: counts };
    const out: Entry[] = [];
    for (const row of shown) {
      const path = groupPath(groupCols, row);
      let hidden = false;
      path.forEach((_, i) => {
        const key = pathKey(path.slice(0, i + 1));
        const first = !counts.has(key);
        counts.set(key, (counts.get(key) ?? 0) + 1);
        if (!hidden && collapsed.has(key)) {
          hidden = true;
          if (first) out.push({ collapsed: path.slice(0, i + 1) });
        }
      });
      if (!hidden) out.push({ row, path });
    }
    return { entries: out, groupCounts: counts };
  }, [shown, groupCols, collapsed]);

  const total = entries.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const filterSig = JSON.stringify(filters);
  const groupSig = groupBy.join('\0');
  useEffect(() => setPage(0), [query, filterSig, groupSig, size]);
  const current = Math.min(page, pages - 1);
  const visible = entries.slice(current * size, current * size + size);

  const head = useRef<HTMLTableRowElement>(null);
  const labelWidths = useLabelWidths(
    head,
    columns.map((c) => `${c.key}${c.label}${c.sub ? 1 : 0}`).join('\0'),
  );
  const widthOf = (c: Column) => Math.max(c.width, labelWidths[c.key] ?? 0);
  const lefts: number[] = [];
  columns.reduce((x, c, i) => ((lefts[i] = x), x + widthOf(c)), 0 as number);
  const stickyAt = (i: number): CSSProperties | undefined =>
    i < frozen ? { position: 'sticky', left: lefts[i], zIndex: 2 } : undefined;
  const frozenCount = Math.min(frozen, columns.length);
  const edge = frozenCount - 1;
  const menuPinned = menuCol ? columns.indexOf(menuCol) < frozenCount : false;
  const span = columns.length;
  const anyFilter =
    Object.values(filters).some((v) => v.trim()) ||
    Object.keys(activeColumnFilters(columnFilters)).length > 0;

  const toggleSort = (key: string) =>
    onSort(
      sort?.key !== key ? { key, dir: 'asc' } : sort.dir === 'asc' ? { key, dir: 'desc' } : null,
    );
  const toggleMenu = (key: string, anchor: HTMLElement) =>
    setMenu((m) => (m?.key === key && m.anchor === anchor ? null : { key, anchor, view: 'main' }));
  const closeMenu = (focus: boolean) => {
    if (focus && menu?.anchor.isConnected) menu.anchor.focus();
    setMenu(null);
  };
  const setColumnFilter = (key: string, f?: ColumnFilter) => {
    const next = { ...columnFilters };
    if (f) next[key] = f;
    else delete next[key];
    onColumnFilters(next);
  };
  const toggleGroup = (key: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  const regroup = (keys: string[]) => {
    onGroupBy(keys);
    setCollapsed(new Set());
  };
  const dropOnBar = (e: DragEvent) => {
    e.preventDefault();
    setOverBar(false);
    const key = e.dataTransfer.getData(DRAG_TYPE);
    if (key && !groupBy.includes(key)) regroup([...groupBy, key]);
  };
  const isFrozen = (key: string) => columns.findIndex((c) => c.key === key) < frozen;
  const endDrag = () => {
    dragKey.current = null;
    setDragging(null);
    setDropAt(null);
  };
  const startDrag = (e: DragEvent, c: Column) => {
    e.dataTransfer.setData(DRAG_TYPE, c.key);
    e.dataTransfer.effectAllowed = 'move';
    if (typeof e.dataTransfer.setDragImage === 'function') {
      const ghost = document.createElement('div');
      ghost.className = 'td-mg__ghost';
      ghost.innerHTML = GHOST_ICON;
      const label = document.createElement('span');
      label.textContent = c.label;
      ghost.appendChild(label);
      (document.getElementById(`${scope}-portal`) ?? document.body).appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 16, 17);
      setTimeout(() => ghost.remove(), 0);
    }
    dragKey.current = c.key;
    setTimeout(() => dragKey.current === c.key && setDragging(c.key), 0);
  };
  const overHeader = (e: DragEvent<HTMLElement>, key: string) => {
    const from = dragKey.current;
    if (!from || from === key || isFrozen(from) !== isFrozen(key)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const r = e.currentTarget.getBoundingClientRect();
    const after = e.clientX > r.left + r.width / 2;
    if (dropAt?.key !== key || dropAt.after !== after) setDropAt({ key, after });
  };
  const dropOnHeader = (e: DragEvent<HTMLElement>, key: string) => {
    const from = dragKey.current;
    if (!from || from === key || isFrozen(from) !== isFrozen(key)) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    onMoveColumn(from, key, e.clientX > r.left + r.width / 2);
    endDrag();
  };

  // Body rows, with a header row for each group as it starts.
  const body: ReactNode[] = [];
  const groupRow = (path: string[], open: boolean) => {
    const level = path.length - 1;
    const key = pathKey(path);
    body.push(
      <GroupRow
        key={`${open ? 'g' : 'c'}:${key}`}
        level={level}
        label={groupCols[level]?.label ?? ''}
        value={path[level] ?? ''}
        count={groupCounts.get(key) ?? 0}
        open={open}
        onToggle={() => toggleGroup(key)}
        span={span}
      />,
    );
  };
  let last: string[] = [];
  const openGroups = (path: string[], depth: number) => {
    let same = 0;
    while (same < depth && same < last.length && last[same] === path[same]) same++;
    for (let i = same; i < depth; i++) groupRow(path.slice(0, i + 1), true);
  };
  for (const entry of visible) {
    if ('collapsed' in entry) {
      const depth = entry.collapsed.length - 1;
      openGroups(entry.collapsed, depth);
      groupRow(entry.collapsed, false);
      last = entry.collapsed.slice(0, depth);
      continue;
    }
    const { row, path } = entry;
    openGroups(path, path.length);
    last = path;
    body.push(
      <tr key={rowKey(row)}>
        {columns.map((c, i) => (
          <td
            key={c.key}
            style={stickyAt(i)}
            className={`${c.strong ? 'is-strong' : ''} ${i === edge ? 'is-frozen-edge' : ''}`}
          >
            {c.render ? (
              c.render(row)
            ) : (
              <span className="td-mg__text" title={c.value(row)}>
                {c.value(row) || '—'}
              </span>
            )}
          </td>
        ))}
      </tr>,
    );
  }

  return (
    <div className="td-mg">
      {title && <div className="td-mg__title">{title}</div>}
      <div
        className={`td-mg__groupbar ${overBar ? 'is-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOverBar(true);
        }}
        onDragLeave={() => setOverBar(false)}
        onDrop={dropOnBar}
      >
        <Icon name="Layers" size={15} />
        {groupCols.length ? (
          <>
            {groupCols.map((c) => (
              <span key={c.key} className="td-mg__chip">
                {c.label}
                <button
                  type="button"
                  onClick={() => regroup(groupBy.filter((k) => k !== c.key))}
                  aria-label={`Stop grouping by ${c.label}`}
                >
                  <Icon name="X" size={13} />
                </button>
              </span>
            ))}
            <button type="button" className="td-mg__clear" onClick={() => regroup([])}>
              Clear
            </button>
          </>
        ) : (
          <span>Drag a column header here to group rows</span>
        )}
      </div>
      <div className="td-mg__scroll">
        <table
          className="td-mg__table"
          style={{ minWidth: columns.reduce((x, c) => x + widthOf(c), 0) }}
        >
          <colgroup>
            {columns.map((c) => (
              <col key={c.key} style={{ width: widthOf(c) }} />
            ))}
          </colgroup>
          <thead>
            <tr className="td-mg__head" ref={head}>
              {columns.map((c, i) => {
                const filtered = filterActive(columnFilters[c.key]);
                return (
                  <th
                    key={c.key}
                    style={stickyAt(i)}
                    draggable
                    className={[
                      i === edge && 'is-frozen-edge',
                      dragging === c.key && 'is-dragging',
                      dropAt?.key === c.key && (dropAt.after ? 'is-drop-after' : 'is-drop-before'),
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onDragStart={(e) => startDrag(e, c)}
                    onDragEnd={endDrag}
                    onDragOver={(e) => overHeader(e, c.key)}
                    onDrop={(e) => dropOnHeader(e, c.key)}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node))
                        setDropAt((d) => (d?.key === c.key ? null : d));
                    }}
                    aria-sort={
                      sort?.key === c.key
                        ? sort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button
                      type="button"
                      className="td-mg__th-sort"
                      data-col={c.key}
                      onClick={() => toggleSort(c.key)}
                      title={`Sort by ${c.label} · drag to move or group`}
                    >
                      <span>
                        {c.label}
                        {c.sub && <small className="td-mg__sub">{c.sub}</small>}
                      </span>
                      {sort?.key === c.key && (
                        <Icon name={sort.dir === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={13} />
                      )}
                      {filtered && <Icon name="Funnel" size={12} />}
                    </button>
                    <button
                      type="button"
                      className="td-mg__th-menu"
                      title="Column menu"
                      aria-haspopup="menu"
                      aria-expanded={menu?.key === c.key}
                      aria-label={`${c.label} column menu${filtered ? ' (filtered)' : ''}`}
                      onClick={(e) => toggleMenu(c.key, e.currentTarget)}
                    >
                      <Icon name="EllipsisVertical" size={15} />
                    </button>
                  </th>
                );
              })}
            </tr>
            <tr className="td-mg__filters">
              {columns.map((c, i) => (
                <th key={c.key} style={stickyAt(i)} className={i === edge ? 'is-frozen-edge' : ''}>
                  <input
                    type="search"
                    value={filters[c.key] ?? ''}
                    aria-label={`Filter ${c.label}`}
                    onChange={(e) => onFilters({ ...filters, [c.key]: e.target.value })}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {error && !rows.length ? (
              <tr>
                <td colSpan={span} className="td-mg__empty">
                  Could not load {plural.toLowerCase()}: {error.message || 'Request failed.'}{' '}
                  <button type="button" className="td-link" onClick={onRetry}>
                    Retry
                  </button>
                </td>
              </tr>
            ) : loading && !rows.length ? (
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i} className="td-mg__skeleton">
                  {columns.map((c) => (
                    <td key={c.key}>
                      <i />
                    </td>
                  ))}
                </tr>
              ))
            ) : body.length ? (
              body
            ) : (
              <tr>
                <td colSpan={span} className="td-mg__empty">
                  {rows.length || anyFilter
                    ? `No ${plural.toLowerCase()} match these filters.`
                    : emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager
        page={current}
        pages={pages}
        total={shown.length}
        entries={total}
        size={size}
        onPage={setPage}
        onSize={setSize}
      />
      {menu && menuCol && (
        <ColumnMenu
          anchor={menu.anchor}
          view={menu.view}
          onView={(view) => setMenu({ ...menu, view })}
          onClose={closeMenu}
          sort={sort?.key === menuCol.key ? sort.dir : null}
          onSort={(dir) => onSort(dir ? { key: menuCol.key, dir } : null)}
          filter={{
            value: columnFilters[menuCol.key],
            numeric: menuNumeric,
            onChange: (f) => setColumnFilter(menuCol.key, f),
          }}
          pin={{
            pinned: menuPinned,
            canPin: menuPinned || frozenCount < columns.length - 1,
            onChange: (p) => onPin(menuCol.key, p),
          }}
          onReset={onResetColumns}
        />
      )}
    </div>
  );
}

function GroupRow({
  level,
  label,
  value,
  count,
  open,
  onToggle,
  span,
}: {
  level: number;
  label: string;
  value: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  span: number;
}) {
  return (
    <tr className="td-mg__group">
      <td colSpan={span}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          style={{ '--mg-level': level } as CSSProperties}
        >
          <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={14} />
          <span>
            {label}: <b>{value}</b>
          </span>
          <em>{count}</em>
        </button>
      </td>
    </tr>
  );
}

function Pager({
  page,
  pages,
  total,
  entries,
  size,
  onPage,
  onSize,
}: {
  page: number;
  pages: number;
  total: number;
  entries: number;
  size: number;
  onPage: (p: number) => void;
  onSize: (s: number) => void;
}) {
  const go = (p: number) => onPage(Math.max(0, Math.min(pages - 1, p)));
  const nums = [...new Set([0, page - 1, page, page + 1, pages - 1])]
    .filter((p) => p >= 0 && p < pages)
    .sort((a, b) => a - b);
  const buttons: ReactNode[] = [];
  nums.forEach((p, i) => {
    if (i && p - nums[i - 1]! > 1)
      buttons.push(
        <span key={`gap${p}`} className="td-mg__gap">
          …
        </span>,
      );
    buttons.push(
      <button
        key={p}
        type="button"
        className={`td-mg__num ${p === page ? 'is-active' : ''}`}
        aria-current={p === page ? 'page' : undefined}
        onClick={() => go(p)}
      >
        {p + 1}
      </button>,
    );
  });
  return (
    <div className="td-mg__pager">
      <span className="td-mg__pageinfo">
        Page <b>{entries ? page + 1 : 0}</b> of <b>{entries ? pages : 0}</b> ·{' '}
        {total.toLocaleString()} total
      </span>
      <span className="td-mg__size">
        <span>Rows per page</span>
        <Dropdown
          className="td-ddl--sm"
          aria-label="Rows per page"
          value={String(size)}
          onChange={(v) => onSize(Number(v))}
          options={PAGE_SIZES.map((s) => ({ value: String(s), label: String(s) }))}
        />
      </span>
      <span className="td-mg__spacer" />
      <nav className="td-mg__pages" aria-label="Pages">
        <button type="button" className="td-mg__step" onClick={() => go(0)} disabled={page === 0}>
          <Icon name="ChevronsLeft" size={14} />
          <span>First</span>
        </button>
        <button
          type="button"
          className="td-mg__step"
          onClick={() => go(page - 1)}
          disabled={page === 0}
        >
          <Icon name="ChevronLeft" size={14} />
          <span>Back</span>
        </button>
        {buttons}
        <button
          type="button"
          className="td-mg__step"
          onClick={() => go(page + 1)}
          disabled={page >= pages - 1}
        >
          <span>Next</span>
          <Icon name="ChevronRight" size={14} />
        </button>
        <button
          type="button"
          className="td-mg__step"
          onClick={() => go(pages - 1)}
          disabled={page >= pages - 1}
        >
          <span>Last</span>
          <Icon name="ChevronsRight" size={14} />
        </button>
      </nav>
    </div>
  );
}
