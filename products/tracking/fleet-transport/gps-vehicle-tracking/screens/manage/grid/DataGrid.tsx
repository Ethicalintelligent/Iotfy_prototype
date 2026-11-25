// IT-0036. The Manage data grid (original `dv` + `oH`): tool bar (module picker, search, freeze,
// columns, export, bulk upload, add), group-by bar, sortable / draggable / pinnable columns with a
// column menu (sort, filter with two conditions, pin, reset), quick filters, row actions, multi
// select, grouped rows and the pager. Same markup and class names as the original.
import {
  Fragment,
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
import { Dropdown, Icon } from '../../smart-track/kit';
import { FLOAT, Portal, Radios, SearchBox, Toast, inFloat } from '../ui';
import { exportCsv, exportExcel, exportPdf } from './export';
import {
  EMPTY_LAYOUT,
  NUMBER_OPS,
  PAGE_SIZES,
  TEXT_OPS,
  activeFilters,
  applyView,
  conditionComplete,
  describeFilter,
  filterActive,
  looksNumeric,
  moveKey,
  orderColumns,
  pickColumns,
  type ColumnFilter,
  type Condition,
  type GridColumn,
  type GridLayout,
  type Sort,
} from './filters';
import { ColumnsMenu, ExportMenu, FreezeMenu } from './Toolbar';

export type { GridColumn, GridLayout } from './filters';
export { EMPTY_LAYOUT } from './filters';

const ACTIONS_W = 96;
const VIEW_W = 30;
const SELECT_W = 44;
const SORT_PAD = 18;

export interface DataGridProps<R> {
  picker?: ReactNode;
  actions?: ReactNode;
  upload?: ReactNode;
  title?: ReactNode;
  rows: R[];
  rowKey: (r: R) => string;
  rowLabel: (r: R) => string;
  columns: GridColumn<R>[];
  plural: string;
  searchPlaceholder: string;
  addLabel?: string;
  onAdd?: () => void;
  onView?: (r: R) => void;
  viewTitle?: string;
  onEdit?: (r: R) => void;
  onDelete?: (r: R) => void;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyText?: string;
  layout?: GridLayout;
  onLayout?: (l: GridLayout) => void;
  selection?: { selected: Set<string>; onChange: (s: Set<string>) => void };
  /** false = a CSV + Print pair instead of the Export menu. */
  exportMenu?: boolean;
  children?: ReactNode;
}

export function DataGrid<R>(p: DataGridProps<R>) {
  const [query, setQuery] = useState('');
  const [own, setOwn] = useState<GridLayout>(EMPTY_LAYOUT);
  const [exportError, setExportError] = useState<string | null>(null);
  const layout = p.layout ?? own;
  const latest = useRef(layout);
  latest.current = layout;
  const change = (patch: Partial<GridLayout>) => {
    latest.current = { ...latest.current, ...patch };
    (p.onLayout ?? setOwn)(latest.current);
  };
  const { hidden, frozen, groupBy, filters, sort, columnFilters, order } = layout;
  const ordered = orderColumns(p.columns, order);
  const visible = ordered.filter((c) => !hidden.includes(c.key));
  const pinned = visible.filter((c) => frozen.includes(c.key));
  const shownCols = [...pinned, ...visible.filter((c) => !frozen.includes(c.key))];
  const viewRows = useMemo(
    () => applyView(p.rows, visible, { query, filters, columnFilters, sort, groupBy }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.rows, p.columns, hidden, order, query, filters, columnFilters, sort, groupBy],
  );
  const pin = (key: string, on: boolean) => {
    const next = on ? [...frozen, key] : frozen.filter((k) => k !== key);
    if (next.length < visible.length) change({ frozen: next });
  };
  const canExport = viewRows.length > 0;
  const runExport = (fn: typeof exportExcel) => {
    try {
      fn(p.plural, visible, viewRows);
    } catch (e) {
      setExportError(
        `Could not load ${p.plural.toLowerCase()}: ${e instanceof Error ? e.message : 'Request failed.'}`,
      );
      setTimeout(() => setExportError(null), 5000);
    }
  };
  const exportMenu = p.exportMenu ?? true;

  return (
    <div className="td-manage">
      <div className="td-manage__bar">
        {p.picker}
        <SearchBox value={query} onChange={setQuery} placeholder={p.searchPlaceholder} />
        <FreezeMenu columns={shownCols} frozen={frozen} onChange={(f) => change({ frozen: f })} />
        <ColumnsMenu
          columns={ordered}
          hidden={hidden}
          onChange={(h) =>
            change({
              hidden: h,
              frozen: frozen.filter((k) => !h.includes(k)),
              groupBy: groupBy.filter((k) => !h.includes(k)),
              filters: Object.fromEntries(Object.entries(filters).filter(([k]) => !h.includes(k))),
            })
          }
          onResetOrder={order?.length ? () => change({ order: undefined }) : undefined}
        />
        {exportMenu ? (
          <ExportMenu
            busy={false}
            disabled={!canExport}
            onExcel={() => runExport(exportExcel)}
            onPdf={() => runExport(exportPdf)}
          />
        ) : (
          <button
            type="button"
            className="td-manage__icon"
            title="Export CSV"
            aria-label="Export CSV"
            aria-busy={false}
            disabled={!canExport}
            onClick={() => runExport(exportCsv)}
          >
            <Icon name="Download" size={17} />
          </button>
        )}
        {p.upload}
        {!exportMenu && (
          <button
            type="button"
            className="td-manage__icon"
            title="Print"
            aria-label="Print"
            aria-busy={false}
            disabled={!canExport}
            onClick={() => runExport(exportPdf)}
          >
            <Icon name="Printer" size={17} />
          </button>
        )}
        {p.actions}
        {p.onAdd && p.addLabel && (
          <button type="button" className="td-btn td-btn--glow td-manage__add" onClick={p.onAdd}>
            <Icon name="Plus" size={17} />
            {p.addLabel}
          </button>
        )}
      </div>
      <GridTable
        title={p.title}
        columns={shownCols}
        rows={p.rows}
        rowKey={p.rowKey}
        rowLabel={p.rowLabel}
        plural={p.plural}
        addLabel={p.onAdd ? p.addLabel : undefined}
        frozen={pinned.length}
        groupBy={groupBy}
        onGroupBy={(g) => change({ groupBy: g })}
        query={query}
        filters={filters}
        onFilters={(f) => change({ filters: f })}
        sort={sort}
        onSort={(s) => change({ sort: s })}
        columnFilters={columnFilters ?? {}}
        onColumnFilters={(f) => change({ columnFilters: f })}
        onPin={pin}
        onResetColumns={() =>
          change({ hidden: [], frozen: [], sort: null, groupBy: [], order: undefined })
        }
        loading={p.loading}
        error={p.error}
        onRetry={p.onRetry}
        onView={p.onView}
        viewTitle={p.viewTitle}
        onEdit={p.onEdit}
        onDelete={p.onDelete}
        selection={p.selection}
        onMoveColumn={(from, to, after) =>
          change({
            order: moveKey(
              ordered.map((c) => c.key),
              from,
              to,
              after,
            ),
          })
        }
        emptyText={p.emptyText}
      />
      {exportError && <Toast error>{exportError}</Toast>}
      {p.children}
    </div>
  );
}

/* ------------------------------------------------------------------ table */

interface TableProps<R> {
  title?: ReactNode;
  columns: GridColumn<R>[];
  rows: R[];
  rowKey: (r: R) => string;
  rowLabel: (r: R) => string;
  plural: string;
  addLabel?: string;
  frozen: number;
  groupBy: string[];
  onGroupBy: (g: string[]) => void;
  query: string;
  filters: Record<string, string>;
  onFilters: (f: Record<string, string>) => void;
  sort: Sort | null;
  onSort: (s: Sort | null) => void;
  columnFilters: Record<string, ColumnFilter>;
  onColumnFilters: (f: Record<string, ColumnFilter>) => void;
  onPin: (key: string, on: boolean) => void;
  onResetColumns: () => void;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onView?: (r: R) => void;
  viewTitle?: string;
  onEdit?: (r: R) => void;
  onDelete?: (r: R) => void;
  selection?: { selected: Set<string>; onChange: (s: Set<string>) => void };
  onMoveColumn: (from: string, to: string, after: boolean) => void;
  emptyText?: string;
}

type Entry<R> = { row: R; path: string[] } | { collapsed: string[] };
const groupKey = (path: string[]) => path.join('\0');

/** Header cells grow to fit their label (original `sH`). */
function useHeaderWidths(head: RefObject<HTMLTableRowElement | null>, signature: string) {
  const [widths, setWidths] = useState<Record<string, number>>({});
  useLayoutEffect(() => {
    const row = head.current;
    if (!row) return;
    const measure = () => {
      const out: Record<string, number> = {};
      row.querySelectorAll<HTMLElement>('.td-mg__th-sort[data-col]').forEach((b) => {
        const label = b.firstElementChild;
        if (!label) return;
        const range = document.createRange();
        range.selectNodeContents(label);
        const w = range.getBoundingClientRect().width;
        if (!w) return;
        const s = getComputedStyle(b);
        out[b.dataset.col!] =
          Math.ceil(w + parseFloat(s.paddingLeft) + parseFloat(s.paddingRight) + SORT_PAD) + 1;
      });
      setWidths((old) => {
        const k = Object.keys(out);
        return k.length === Object.keys(old).length && k.every((x) => old[x] === out[x])
          ? old
          : out;
      });
    };
    measure();
    let live = true;
    void document.fonts?.ready.then(() => live && measure());
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => {
      live = false;
      ro.disconnect();
    };
  }, [head, signature]);
  return widths;
}

function GridTable<R>(p: TableProps<R>) {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(PAGE_SIZES[0]!);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [overGroupBar, setOverGroupBar] = useState(false);
  const [menu, setMenu] = useState<{
    key: string;
    anchor: HTMLElement;
    view: 'main' | 'filter' | 'pin';
  } | null>(null);
  const dragKey = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ key: string; after: boolean } | null>(null);
  const hasActions = !!(p.onView || p.onEdit || p.onDelete);
  const actionsW = ACTIONS_W + (p.onView ? VIEW_W : 0);
  const sel = p.selection;

  const rows = useMemo(
    () =>
      applyView(p.rows, p.columns, {
        query: p.query,
        filters: p.filters,
        columnFilters: p.columnFilters,
        sort: p.sort,
        groupBy: p.groupBy,
      }),
    [p.rows, p.columns, p.query, p.filters, p.columnFilters, p.sort, p.groupBy],
  );
  const groupCols = useMemo(() => pickColumns(p.columns, p.groupBy), [p.columns, p.groupBy]);
  const menuCol = menu ? p.columns.find((c) => c.key === menu.key) : undefined;
  const menuNumeric = useMemo(
    () =>
      menuCol
        ? menuCol.filter === 'number' ||
          (!menuCol.filter && looksNumeric(p.rows.slice(0, 200).map((r) => menuCol.value(r))))
        : false,
    [menuCol, p.rows],
  );
  useEffect(() => {
    if (menu && !menuCol) setMenu(null);
  }, [menu, menuCol]);

  const { entries, counts } = useMemo(() => {
    const counts = new Map<string, number>();
    if (!groupCols.length)
      return { entries: rows.map((row) => ({ row, path: [] as string[] })) as Entry<R>[], counts };
    const out: Entry<R>[] = [];
    for (const row of rows) {
      const path = groupCols.map((c) => c.value(row) || '(blank)');
      let hidden = false;
      path.forEach((_, i) => {
        const k = groupKey(path.slice(0, i + 1));
        const first = !counts.has(k);
        counts.set(k, (counts.get(k) ?? 0) + 1);
        if (!hidden && collapsed.has(k)) {
          hidden = true;
          if (first) out.push({ collapsed: path.slice(0, i + 1) });
        }
      });
      if (!hidden) out.push({ row, path });
    }
    return { entries: out, counts };
  }, [rows, groupCols, collapsed]);

  const total = entries.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const filterSig = JSON.stringify(p.filters);
  const groupSig = p.groupBy.join('\0');
  useEffect(() => setPage(0), [p.query, filterSig, groupSig, size]);
  const at = Math.min(page, pages - 1);
  const pageEntries = entries.slice(at * size, at * size + size);

  const head = useRef<HTMLTableRowElement>(null);
  const fit = useHeaderWidths(
    head,
    p.columns.map((c) => `${c.key}${c.label}${c.sub ? 1 : 0}`).join('\0'),
  );
  const widthOf = (c: GridColumn<R>) => Math.max(c.width, fit[c.key] ?? 0);
  const selW = sel ? SELECT_W : 0;
  const lefts: number[] = [];
  p.columns.reduce((x, c, i) => ((lefts[i] = x), x + widthOf(c)), selW);
  const stick = (i: number): CSSProperties | undefined =>
    i < p.frozen ? { position: 'sticky', left: lefts[i], zIndex: 2 } : undefined;
  const stickSel: CSSProperties | undefined =
    p.frozen > 0 ? { position: 'sticky', left: 0, zIndex: 2 } : undefined;
  const nFrozen = Math.min(p.frozen, p.columns.length);
  const edge = nFrozen - 1;
  const menuPinned = menuCol ? p.columns.indexOf(menuCol) < nFrozen : false;
  const span = p.columns.length + (hasActions ? 1 : 0) + (sel ? 1 : 0);
  const anyFilter =
    Object.values(p.filters).some((v) => v.trim()) ||
    Object.keys(activeFilters(p.columnFilters)).length > 0;
  const pageKeys = pageEntries.flatMap((e) => ('row' in e ? [p.rowKey(e.row)] : []));
  const pageOn = pageKeys.filter((k) => sel?.selected.has(k)).length;

  const selectOne = (k: string, on: boolean) => {
    const s = new Set(sel!.selected);
    if (on) s.add(k);
    else s.delete(k);
    sel!.onChange(s);
  };
  const selectPage = (on: boolean) => {
    const s = new Set(sel!.selected);
    pageKeys.forEach((k) => (on ? s.add(k) : s.delete(k)));
    sel!.onChange(s);
  };
  const cycleSort = (key: string) =>
    p.onSort(
      p.sort?.key !== key
        ? { key, dir: 'asc' }
        : p.sort.dir === 'asc'
          ? { key, dir: 'desc' }
          : null,
    );
  const toggleMenu = (key: string, anchor: HTMLElement) =>
    setMenu((m) => (m?.key === key && m.anchor === anchor ? null : { key, anchor, view: 'main' }));
  const closeMenu = (focus: boolean) => {
    if (focus && menu?.anchor.isConnected) menu.anchor.focus();
    setMenu(null);
  };
  const setColumnFilter = (key: string, f?: ColumnFilter) => {
    const next = { ...p.columnFilters };
    if (f) next[key] = f;
    else delete next[key];
    p.onColumnFilters(next);
  };
  const toggleGroup = (k: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const regroup = (g: string[]) => {
    p.onGroupBy(g);
    setCollapsed(new Set());
  };
  const onGroupDrop = (e: DragEvent) => {
    e.preventDefault();
    setOverGroupBar(false);
    const k = e.dataTransfer.getData('text/x-gp-column');
    if (k && !p.groupBy.includes(k)) regroup([...p.groupBy, k]);
  };
  const isPinned = (k: string) => p.columns.findIndex((c) => c.key === k) < p.frozen;
  const endDrag = () => {
    dragKey.current = null;
    setDragging(null);
    setDropAt(null);
  };
  const startDrag = (e: DragEvent, c: GridColumn<R>) => {
    e.dataTransfer.setData('text/x-gp-column', c.key);
    e.dataTransfer.effectAllowed = 'move';
    dragGhost(e, c.label);
    dragKey.current = c.key;
    setTimeout(() => dragKey.current === c.key && setDragging(c.key), 0);
  };
  const dragOver = (e: DragEvent<HTMLElement>, key: string) => {
    const from = dragKey.current;
    if (!from || from === key || isPinned(from) !== isPinned(key)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const r = e.currentTarget.getBoundingClientRect();
    const after = e.clientX > r.left + r.width / 2;
    if (dropAt?.key !== key || dropAt.after !== after) setDropAt({ key, after });
  };
  const drop = (e: DragEvent<HTMLElement>, key: string) => {
    const from = dragKey.current;
    if (!from || from === key || isPinned(from) !== isPinned(key)) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    p.onMoveColumn(from, key, e.clientX > r.left + r.width / 2);
    endDrag();
  };

  // Body rows, with group header rows where a group starts.
  const body: ReactNode[] = [];
  const groupRow = (path: string[], open: boolean) => {
    const level = path.length - 1;
    const k = groupKey(path);
    body.push(
      <tr key={`${open ? 'g' : 'c'}:${k}`} className="td-mg__group">
        <td colSpan={span}>
          <button
            type="button"
            onClick={() => toggleGroup(k)}
            aria-expanded={open}
            style={{ '--mg-level': level } as CSSProperties}
          >
            <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={14} />
            <span>
              {groupCols[level]!.label}: <b>{path[level]}</b>
            </span>
            <em>{counts.get(k) ?? 0}</em>
          </button>
        </td>
      </tr>,
    );
  };
  let prev: string[] = [];
  const openGroups = (path: string[], depth: number) => {
    let same = 0;
    while (same < depth && same < prev.length && prev[same] === path[same]) same++;
    for (let i = same; i < depth; i++) groupRow(path.slice(0, i + 1), true);
  };
  for (const e of pageEntries) {
    if ('collapsed' in e) {
      const d = e.collapsed.length - 1;
      openGroups(e.collapsed, d);
      groupRow(e.collapsed, false);
      prev = e.collapsed.slice(0, d);
      continue;
    }
    const { row, path } = e;
    openGroups(path, path.length);
    prev = path;
    const key = p.rowKey(row);
    body.push(
      <tr key={key}>
        {sel && (
          <td className="td-mg__select" style={stickSel}>
            <input
              type="checkbox"
              checked={sel.selected.has(key)}
              aria-label={`Select ${p.rowLabel(row)}`}
              onChange={(ev) => selectOne(key, ev.target.checked)}
            />
          </td>
        )}
        {p.columns.map((c, i) => (
          <td
            key={c.key}
            style={stick(i)}
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
        {hasActions && (
          <td className="td-mg__actions-cell">
            <span className="td-mg__row-actions">
              {p.onView && (
                <button
                  type="button"
                  className="td-mg__act"
                  onClick={() => p.onView!(row)}
                  title={p.viewTitle ?? 'View'}
                  aria-label={`${p.viewTitle ?? 'View'}: ${p.rowLabel(row)}`}
                >
                  <Icon name="RowView" size={15} />
                </button>
              )}
              {p.onEdit && (
                <button
                  type="button"
                  className="td-mg__act"
                  onClick={() => p.onEdit!(row)}
                  title="Edit"
                  aria-label={`Edit ${p.rowLabel(row)}`}
                >
                  <Icon name="RowEdit" size={15} />
                </button>
              )}
              {p.onDelete && (
                <button
                  type="button"
                  className="td-mg__act is-danger"
                  onClick={() => p.onDelete!(row)}
                  title="Delete"
                  aria-label={`Delete ${p.rowLabel(row)}`}
                >
                  <Icon name="RowDelete" size={15} />
                </button>
              )}
            </span>
          </td>
        )}
      </tr>,
    );
  }
  const errorText = p.error instanceof Error ? p.error.message : 'Request failed.';

  return (
    <div className="td-mg">
      {p.title && <div className="td-mg__title">{p.title}</div>}
      <div
        className={`td-mg__groupbar ${overGroupBar ? 'is-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOverGroupBar(true);
        }}
        onDragLeave={() => setOverGroupBar(false)}
        onDrop={onGroupDrop}
      >
        <Icon name="Layers" size={15} />
        {groupCols.length ? (
          <>
            {groupCols.map((c) => (
              <span key={c.key} className="td-mg__chip">
                {c.label}
                <button
                  type="button"
                  onClick={() => regroup(p.groupBy.filter((k) => k !== c.key))}
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
          style={{
            minWidth: p.columns.reduce(
              (x, c) => x + widthOf(c),
              selW + (hasActions ? actionsW : 0),
            ),
          }}
        >
          <colgroup>
            {sel && <col style={{ width: SELECT_W }} />}
            {p.columns.map((c) => (
              <col key={c.key} style={{ width: widthOf(c) }} />
            ))}
            {hasActions && <col style={{ width: actionsW }} />}
          </colgroup>
          <thead>
            <tr className="td-mg__head" ref={head}>
              {sel && (
                <th className="td-mg__select" style={stickSel}>
                  <input
                    type="checkbox"
                    aria-label={`Select the ${p.plural.toLowerCase()} on this page`}
                    disabled={!pageKeys.length}
                    checked={pageKeys.length > 0 && pageOn === pageKeys.length}
                    ref={(el) => {
                      if (el) el.indeterminate = pageOn > 0 && pageOn < pageKeys.length;
                    }}
                    onChange={(e) => selectPage(e.target.checked)}
                  />
                </th>
              )}
              {p.columns.map((c, i) => {
                const filtered = filterActive(p.columnFilters[c.key]);
                return (
                  <th
                    key={c.key}
                    style={stick(i)}
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
                    onDragOver={(e) => dragOver(e, c.key)}
                    onDrop={(e) => drop(e, c.key)}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node))
                        setDropAt((d) => (d?.key === c.key ? null : d));
                    }}
                    aria-sort={
                      p.sort?.key === c.key
                        ? p.sort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button
                      type="button"
                      className="td-mg__th-sort"
                      data-col={c.key}
                      onClick={() => cycleSort(c.key)}
                      title={`Sort by ${c.label} · drag to move or group`}
                    >
                      <span>
                        {c.label}
                        {c.sub && <small className="td-mg__sub">{c.sub}</small>}
                      </span>
                      {p.sort?.key === c.key && (
                        <Icon name={p.sort.dir === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={13} />
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
              {hasActions && (
                <th className="td-mg__actions-cell">
                  <span className="td-mg__th-text">Actions</span>
                </th>
              )}
            </tr>
            <tr className="td-mg__filters">
              {sel && <th className="td-mg__select" style={stickSel} />}
              {p.columns.map((c, i) => (
                <th key={c.key} style={stick(i)} className={i === edge ? 'is-frozen-edge' : ''}>
                  {!c.noServerFilter && (
                    <input
                      type="search"
                      value={p.filters[c.key] ?? ''}
                      aria-label={`Filter ${c.label}`}
                      onChange={(e) => p.onFilters({ ...p.filters, [c.key]: e.target.value })}
                    />
                  )}
                </th>
              ))}
              {hasActions && (
                <th className="td-mg__actions-cell">
                  {anyFilter && (
                    <button
                      type="button"
                      className="td-link"
                      onClick={() => {
                        p.onFilters({});
                        p.onColumnFilters({});
                      }}
                    >
                      <Icon name="RotateCcw" size={12} />
                      Clear
                    </button>
                  )}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {p.error && !p.rows.length ? (
              <tr>
                <td colSpan={span} className="td-mg__empty">
                  Could not load {p.plural.toLowerCase()}: {errorText}{' '}
                  {p.onRetry && (
                    <button type="button" className="td-link" onClick={p.onRetry}>
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ) : p.loading && !p.rows.length ? (
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i} className="td-mg__skeleton">
                  {sel && <td />}
                  {p.columns.map((c) => (
                    <td key={c.key}>
                      <i />
                    </td>
                  ))}
                  {hasActions && <td />}
                </tr>
              ))
            ) : body.length ? (
              body
            ) : (
              <tr>
                <td colSpan={span} className="td-mg__empty">
                  {p.rows.length || anyFilter
                    ? `No ${p.plural.toLowerCase()} match these filters.`
                    : (p.emptyText ??
                      `No ${p.plural.toLowerCase()} yet.${p.addLabel ? ` Use “${p.addLabel}” to create one.` : ''}`)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager
        page={at}
        pages={pages}
        total={rows.length}
        entries={total}
        size={size}
        onPage={setPage}
        onSize={setSize}
      />
      {menu && menuCol && (
        <ColumnMenu
          anchor={menu.anchor}
          view={menu.view}
          onView={(v) => setMenu({ ...menu, view: v })}
          onClose={closeMenu}
          sort={p.sort?.key === menuCol.key ? p.sort.dir : null}
          onSort={(d) => p.onSort(d ? { key: menuCol.key, dir: d } : null)}
          filter={{
            value: p.columnFilters[menuCol.key],
            numeric: menuNumeric,
            onChange: (f) => setColumnFilter(menuCol.key, f),
          }}
          pin={{
            pinned: menuPinned,
            canPin: menuPinned || nFrozen < p.columns.length - 1,
            onChange: (on) => p.onPin(menuCol.key, on),
          }}
          onReset={p.onResetColumns}
        />
      )}
    </div>
  );
}

const GHOST =
  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v20"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="m5 9-3 3 3 3"/><path d="m9 5 3-3 3 3"/></svg>';
/** The drag image while moving a column (original `$U`), placed inside the page scope. */
function dragGhost(e: DragEvent, label: string) {
  if (typeof e.dataTransfer.setDragImage !== 'function') return;
  const host = document.querySelector('.st-manage.st-portal') ?? document.body;
  const ghost = document.createElement('div');
  ghost.className = 'td-mg__ghost';
  ghost.innerHTML = GHOST;
  const span = document.createElement('span');
  span.textContent = label;
  ghost.appendChild(span);
  host.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 16, 17);
  setTimeout(() => ghost.remove(), 0);
}

/* ------------------------------------------------------------------ pager */

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
  const go = (n: number) => onPage(Math.max(0, Math.min(pages - 1, n)));
  const nums = [...new Set([0, page - 1, page, page + 1, pages - 1])]
    .filter((n) => n >= 0 && n < pages)
    .sort((a, b) => a - b);
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
          options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
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
        {nums.map((n, i) => (
          <Fragment key={n}>
            {i > 0 && n - nums[i - 1]! > 1 && <span className="td-mg__gap">…</span>}
            <button
              type="button"
              className={`td-mg__num ${n === page ? 'is-active' : ''}`}
              aria-current={n === page ? 'page' : undefined}
              onClick={() => go(n)}
            >
              {n + 1}
            </button>
          </Fragment>
        ))}
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

/* ------------------------------------------------------------------ column menu */

const MENU_ITEM = '[role^=menuitem]';
const GAP = 8;
const OFFSET = 4;
const MIN_H = 160;

function MenuItem({
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

function MenuBack({ title, onBack }: { title: string; onBack: () => void }) {
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

function ColumnMenu({
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
  view: 'main' | 'filter' | 'pin';
  onView: (v: 'main' | 'filter' | 'pin') => void;
  onClose: (focus: boolean) => void;
  sort: 'asc' | 'desc' | null;
  onSort: (d: 'asc' | 'desc' | null) => void;
  filter: { value?: ColumnFilter; numeric: boolean; onChange: (f?: ColumnFilter) => void };
  pin: { pinned: boolean; canPin: boolean; onChange: (on: boolean) => void };
  onReset: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !anchor.isConnected) return;
    const r = anchor.getBoundingClientRect();
    const h = el.scrollHeight;
    const below = window.innerHeight - r.bottom - OFFSET - GAP;
    const above = r.top - OFFSET - GAP;
    const up = h > below && above > below;
    const max = Math.max(MIN_H, up ? above : below);
    el.style.maxHeight = `${max}px`;
    el.style.top = `${up ? Math.max(GAP, r.top - OFFSET - Math.min(h, max)) : r.bottom + OFFSET}px`;
    el.style.left = `${Math.max(GAP, Math.min(r.left, window.innerWidth - GAP - el.offsetWidth))}px`;
  });
  useEffect(() => {
    const el = box.current;
    const first = ['[data-autofocus]', `${MENU_ITEM}:not(:disabled)`, 'button']
      .map((s) => el?.querySelector<HTMLElement>(s))
      .find(Boolean);
    first?.focus();
  }, [view]);
  useEffect(() => {
    const outside = (t: EventTarget | null) =>
      t instanceof Node && !box.current?.contains(t) && !anchor.contains(t) && !inFloat(t);
    const down = (e: Event) => outside(e.target) && close.current(false);
    const resize = () => close.current(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close.current(true);
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
  const onKey = (e: React.KeyboardEvent) => {
    if (e.defaultPrevented || view === 'filter') return;
    if (e.key === 'Tab') return onClose(false);
    const items = [
      ...(box.current?.querySelectorAll<HTMLElement>(`${MENU_ITEM}:not(:disabled)`) ?? []),
    ];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const to =
      e.key === 'ArrowDown'
        ? i + 1
        : e.key === 'ArrowUp'
          ? i - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? items.length - 1
              : null;
    if (to === null || !items.length) return;
    e.preventDefault();
    items[(to + items.length) % items.length]?.focus();
  };
  const onBlur = (e: React.FocusEvent) => {
    const to = e.relatedTarget;
    if (to && !box.current?.contains(to) && !anchor.contains(to) && !inFloat(to)) onClose(false);
  };
  const act = (f: () => void) => () => {
    f();
    onClose(true);
  };

  let content: ReactNode;
  if (view === 'filter') {
    content = (
      <>
        <MenuBack title="Filter" onBack={() => onView('main')} />
        <FilterForm {...filter} />
      </>
    );
  } else if (view === 'pin') {
    content = (
      <>
        <MenuBack title="Pin Column" onBack={() => onView('main')} />
        <ul className="td-pop__menu td-pop__list" role="menu" aria-label="Pin column">
          <MenuItem
            icon="Pin"
            checked={pin.pinned}
            disabled={!pin.pinned && !pin.canPin}
            onClick={act(() => pin.onChange(true))}
          >
            Pin Left
          </MenuItem>
          <MenuItem icon="PinOff" checked={!pin.pinned} onClick={act(() => pin.onChange(false))}>
            No Pin
          </MenuItem>
        </ul>
      </>
    );
  } else {
    const hint = describeFilter(filter.value);
    content = (
      <ul className="td-pop__menu td-pop__list" role="menu" aria-label="Column menu">
        <MenuItem icon="ArrowUp" active={sort === 'asc'} onClick={act(() => onSort('asc'))}>
          Sort Ascending
        </MenuItem>
        <MenuItem icon="ArrowDown" active={sort === 'desc'} onClick={act(() => onSort('desc'))}>
          Sort Descending
        </MenuItem>
        {sort && (
          <MenuItem icon="ArrowDownUp" onClick={act(() => onSort(null))}>
            Clear Sort
          </MenuItem>
        )}
        <li role="separator" className="td-mg__menu-sep" />
        <MenuItem
          icon="Funnel"
          more
          hint={hint || undefined}
          active={filterActive(filter.value)}
          onClick={() => onView('filter')}
        >
          Filter
        </MenuItem>
        <li role="separator" className="td-mg__menu-sep" />
        <MenuItem
          icon="Pin"
          more
          hint={pin.pinned ? 'Left' : undefined}
          onClick={() => onView('pin')}
        >
          Pin Column
        </MenuItem>
        <li role="separator" className="td-mg__menu-sep" />
        <MenuItem icon="RotateCcw" onClick={act(onReset)}>
          Reset Columns
        </MenuItem>
      </ul>
    );
  }
  return (
    <Portal>
      <div ref={box} className={`${FLOAT} td-mg__menu`} onKeyDown={onKey} onBlur={onBlur}>
        {content}
      </div>
    </Portal>
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
  const ops = numeric ? NUMBER_OPS : TEXT_OPS;
  const norm = (c?: Condition): Condition =>
    c && ops.some((o) => o.value === c.op) ? c : { op: ops[0]!.value };
  const first = norm(value?.first);
  const second = norm(value?.second);
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
            name="td-mg-join"
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
  const input = (k: 'value' | 'to', ph: string, focus?: boolean) => (
    <input
      type="text"
      className="gp-input"
      inputMode={numeric ? 'decimal' : undefined}
      placeholder={ph}
      autoComplete="off"
      aria-label={`${label} ${ph.replace('…', '')}`}
      data-autofocus={focus || undefined}
      value={c[k] ?? ''}
      onChange={(e) => onChange({ ...c, [k]: e.target.value })}
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
