// The data grid of the approved GPS Vehicle Tracking design (Manage, Reports, Alerts; Desktop/vs):
// mint header with a ⋮ menu per column (sort, group by, hide), a filter box under each header, a
// "Drag a column header here to group rows" bar, optional row checkboxes, a sticky actions column,
// frozen first column, and paging ("Page 1 of 3 · 24 total", rows per page, First/Back/Next/Last).
// Companions: ColumnChooser (the "Columns 8/10" button) and downloadCsv().
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { cx } from '../cx';
import { Icon } from './basics';
import { Dropdown, DropdownItem } from './menus';

export interface GridColumn<R> {
  key: string;
  header: string;
  /** The value for filtering, sorting, grouping and CSV. */
  value: (row: R) => string | number | boolean | null | undefined;
  /** How the cell looks (default: the value as text, "—" when empty). */
  cell?: (row: R) => ReactNode;
  width?: number;
  align?: 'left' | 'right' | 'center';
  /** Filter box under the header (default true). */
  filter?: boolean;
}

export interface DataGridProps<R> {
  /** Accessible name. */
  label: string;
  rows: R[];
  columns: GridColumn<R>[];
  rowKey: (row: R) => string;
  /** Text from a search box beside the grid: rows containing it in any visible column. */
  search?: string;
  /** Column keys to hide (see ColumnChooser). */
  hidden?: string[];
  /** Keep the first column in place when scrolling sideways. */
  freeze?: boolean;
  /** Checkbox per row. */
  selected?: Set<string>;
  onSelectedChange?: (keys: Set<string>) => void;
  /** Buttons at the end of each row (sticky on the right), e.g. edit and delete. */
  actions?: (row: R) => ReactNode;
  onRowClick?: (row: R) => void;
  /** Rows per page to start with (default 10). */
  pageSize?: number;
  /** Shown when there are no rows. */
  empty?: ReactNode;
  /** The highlighted row (e.g. the one shown beside the grid). */
  current?: string | null;
  /** Row tint by row (e.g. alert colour). */
  rowHue?: (row: R) => string | undefined;
  /** Hide the "group rows" bar. */
  noGrouping?: boolean;
}

const text = (v: unknown) => (v == null || v === '' ? '' : String(v));
const PAGE_SIZES = [10, 25, 50, 100]; // Design System

/** A data grid with filters, sorting, grouping, row selection and paging. */
export function DataGrid<R>({
  label,
  rows,
  columns,
  rowKey,
  search = '',
  hidden = [],
  freeze,
  selected,
  onSelectedChange,
  actions,
  onRowClick,
  pageSize = 10,
  empty = 'Nothing here yet.',
  current,
  rowHue,
  noGrouping,
}: DataGridProps<R>) {
  const cols = columns.filter((c) => !hidden.includes(c.key));
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ key: string; el: HTMLElement } | null>(null);
  const [size, setSize] = useState(pageSize);
  const [page, setPage] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter(
      (r) =>
        (!q || cols.some((c) => text(c.value(r)).toLowerCase().includes(q))) &&
        cols.every((c) => {
          const f = filters[c.key]?.trim().toLowerCase();
          return !f || text(c.value(r)).toLowerCase().includes(f);
        }),
    );
    const sortCol = sort && columns.find((c) => c.key === sort.key);
    const groupCol = groupBy ? columns.find((c) => c.key === groupBy) : undefined;
    if (sortCol || groupCol)
      out = [...out].sort((a, b) => {
        if (groupCol) {
          const g = text(groupCol.value(a)).localeCompare(text(groupCol.value(b)), 'en', {
            numeric: true,
          });
          if (g) return g;
        }
        if (!sortCol) return 0;
        const va = sortCol.value(a);
        const vb = sortCol.value(b);
        const d =
          typeof va === 'number' && typeof vb === 'number'
            ? va - vb
            : text(va).localeCompare(text(vb), 'en', { numeric: true });
        return d * sort!.dir;
      });
    return out;
  }, [rows, cols, columns, filters, sort, groupBy, search]);

  const pages = Math.max(1, Math.ceil(shown.length / size));
  const p = Math.min(page, pages - 1);
  const pageRows = shown.slice(p * size, p * size + size);
  const groupCol = groupBy ? columns.find((c) => c.key === groupBy) : undefined;
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected?.has(rowKey(r)));
  const span = cols.length + (selected ? 1 : 0) + (actions ? 1 : 0);

  const toggleAll = () => {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    for (const r of pageRows) {
      if (allOnPage) next.delete(rowKey(r));
      else next.add(rowKey(r));
    }
    onSelectedChange(next);
  };
  const toggle = (k: string) => {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onSelectedChange(next);
  };

  const pageButtons = (() => {
    const nums = new Set([0, pages - 1, p - 1, p, p + 1].filter((n) => n >= 0 && n < pages));
    const list = [...nums].sort((a, b) => a - b);
    const out: (number | '…')[] = [];
    list.forEach((n, i) => {
      if (i && n - list[i - 1]! > 1) out.push('…');
      out.push(n);
    });
    return out;
  })();

  let lastGroup: string | null = null;
  return (
    <div className="ui-grid" role="region" aria-label={label}>
      {!noGrouping && (
        <div
          className={cx('ui-grid__groupbar', dragOver && 'is-over')}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const k = e.dataTransfer.getData('text/x-grid-column');
            if (k) {
              setGroupBy(k);
              setPage(0);
            }
          }}
        >
          <Icon name="layers" size={14} />
          {groupCol ? (
            <span className="ui-grid__groupchip">
              Grouped by {groupCol.header}
              <button type="button" aria-label="Stop grouping" onClick={() => setGroupBy(null)}>
                <Icon name="close" size={12} />
              </button>
            </span>
          ) : (
            <span>Drag a column header here to group rows</span>
          )}
        </div>
      )}
      <div className="ui-grid__scroll">
        <table className={cx('ui-grid__table', freeze && 'is-frozen')}>
          <thead>
            <tr>
              {selected && (
                <th className="ui-grid__check">
                  <input
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={allOnPage}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {cols.map((c) => (
                <th
                  key={c.key}
                  style={{ minWidth: c.width, textAlign: c.align }}
                  draggable={!noGrouping}
                  onDragStart={(e) => e.dataTransfer.setData('text/x-grid-column', c.key)}
                  aria-sort={
                    sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined
                  }
                >
                  <span className="ui-grid__th">
                    <button
                      type="button"
                      className="ui-grid__sort"
                      onClick={() =>
                        setSort(
                          sort?.key === c.key
                            ? sort.dir === 1
                              ? { key: c.key, dir: -1 }
                              : null
                            : { key: c.key, dir: 1 },
                        )
                      }
                    >
                      {c.header}
                      {sort?.key === c.key && (
                        <Icon name={sort.dir === 1 ? 'arrowup' : 'arrowdown'} size={12} />
                      )}
                    </button>
                    <button
                      type="button"
                      className="ui-grid__menu"
                      aria-label={`${c.header} options`}
                      onClick={(e) =>
                        setMenu(menu?.key === c.key ? null : { key: c.key, el: e.currentTarget })
                      }
                    >
                      ⋮
                    </button>
                    <Dropdown
                      anchor={menu?.key === c.key ? menu.el : null}
                      open={menu?.key === c.key}
                      onClose={() => setMenu(null)}
                      align="right"
                      width={200}
                      label={`${c.header} options`}
                    >
                      <DropdownItem
                        icon="arrowup"
                        onClick={() => (setSort({ key: c.key, dir: 1 }), setMenu(null))}
                      >
                        Sort ascending
                      </DropdownItem>
                      <DropdownItem
                        icon="arrowdown"
                        onClick={() => (setSort({ key: c.key, dir: -1 }), setMenu(null))}
                      >
                        Sort descending
                      </DropdownItem>
                      {!noGrouping && (
                        <DropdownItem
                          icon="layers"
                          onClick={() => (setGroupBy(c.key), setPage(0), setMenu(null))}
                        >
                          Group by this column
                        </DropdownItem>
                      )}
                    </Dropdown>
                  </span>
                </th>
              ))}
              {actions && <th className="ui-grid__actions">Actions</th>}
            </tr>
            <tr className="ui-grid__filters">
              {selected && <th className="ui-grid__check" />}
              {cols.map((c) => (
                <th key={c.key}>
                  {c.filter !== false && (
                    <input
                      aria-label={`Filter ${c.header}`}
                      value={filters[c.key] ?? ''}
                      onChange={(e) => {
                        setFilters({ ...filters, [c.key]: e.target.value });
                        setPage(0);
                      }}
                    />
                  )}
                </th>
              ))}
              {actions && <th className="ui-grid__actions" />}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={span} className="ui-grid__empty">
                  {empty}
                </td>
              </tr>
            )}
            {pageRows.map((r) => {
              const k = rowKey(r);
              const g = groupCol ? text(groupCol.value(r)) || '—' : null;
              const header = g != null && g !== lastGroup;
              lastGroup = g;
              const hiddenRow = g != null && collapsed.has(g);
              return (
                <Fragment key={k}>
                  {header && (
                    <tr className="ui-grid__grouprow">
                      <td colSpan={span}>
                        <button
                          type="button"
                          onClick={() => {
                            const next = new Set(collapsed);
                            if (next.has(g!)) next.delete(g!);
                            else next.add(g!);
                            setCollapsed(next);
                          }}
                          aria-expanded={!collapsed.has(g!)}
                        >
                          <Icon name={collapsed.has(g!) ? 'chev' : 'down'} size={13} />
                          {groupCol!.header}: <b>{g}</b> ·{' '}
                          {shown.filter((x) => (text(groupCol!.value(x)) || '—') === g).length}
                        </button>
                      </td>
                    </tr>
                  )}
                  {!hiddenRow && (
                    <tr
                      className={cx(
                        onRowClick && 'ui-click',
                        current === k && 'is-current',
                        rowHue?.(r) && `ui-hue--${rowHue(r)} is-tinted`,
                      )}
                      onClick={onRowClick ? () => onRowClick(r) : undefined}
                      onKeyDown={
                        onRowClick
                          ? (e) => {
                              if (e.key === 'Enter') onRowClick(r);
                            }
                          : undefined
                      }
                      tabIndex={onRowClick ? 0 : undefined}
                    >
                      {selected && (
                        <td className="ui-grid__check" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label="Select row"
                            checked={selected.has(k)}
                            onChange={() => toggle(k)}
                          />
                        </td>
                      )}
                      {cols.map((c) => (
                        <td key={c.key} style={{ textAlign: c.align }}>
                          {c.cell ? c.cell(r) : text(c.value(r)) || '—'}
                        </td>
                      ))}
                      {actions && (
                        <td className="ui-grid__actions" onClick={(e) => e.stopPropagation()}>
                          <span>{actions(r)}</span>
                        </td>
                      )}
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="ui-grid__foot">
        <span>
          Page <b>{p + 1}</b> of {pages} · {shown.length} total
        </span>
        <label className="ui-grid__size">
          Rows per page
          <select
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="ui-grid__pager">
          <button type="button" disabled={p === 0} onClick={() => setPage(0)}>
            « First
          </button>
          <button type="button" disabled={p === 0} onClick={() => setPage(p - 1)}>
            ‹ Back
          </button>
          {pageButtons.map((n, i) =>
            n === '…' ? (
              <span key={'g' + i}>…</span>
            ) : (
              <button
                key={n}
                type="button"
                className={cx(n === p && 'is-on')}
                aria-current={n === p || undefined}
                onClick={() => setPage(n)}
              >
                {n + 1}
              </button>
            ),
          )}
          <button type="button" disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>
            Next ›
          </button>
          <button type="button" disabled={p >= pages - 1} onClick={() => setPage(pages - 1)}>
            Last »
          </button>
        </span>
      </div>
    </div>
  );
}

/** The "Columns 8/10" button: tick which columns the grid shows. */
export function ColumnChooser({
  columns,
  hidden,
  onChange,
}: {
  columns: { key: string; header: string }[];
  hidden: string[];
  onChange: (hidden: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [el, setEl] = useState<HTMLElement | null>(null);
  return (
    <span className="ui-colchooser">
      <button
        type="button"
        className="ui-toolbtn"
        ref={setEl}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <Icon name="sliders" size={15} />
        Columns
        <small>
          {columns.length - hidden.length}/{columns.length}
        </small>
      </button>
      <Dropdown
        anchor={el}
        open={open}
        onClose={() => setOpen(false)}
        align="right"
        width={240}
        label="Columns"
      >
        <div className="ui-dropdown__list">
          {columns.map((c) => (
            <label key={c.key} className="ui-colchooser__item">
              <input
                type="checkbox"
                checked={!hidden.includes(c.key)}
                onChange={() =>
                  onChange(
                    hidden.includes(c.key) ? hidden.filter((h) => h !== c.key) : [...hidden, c.key],
                  )
                }
              />
              {c.header}
            </label>
          ))}
        </div>
      </Dropdown>
    </span>
  );
}

/** A plain toolbar button with an icon (Freeze Columns, Download…); `active` for toggles. */
export function ToolButton({
  icon,
  children,
  onClick,
  active,
  label,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  children?: ReactNode;
  onClick?: () => void;
  active?: boolean;
  /** Accessible name when there is no text. */
  label?: string;
}) {
  return (
    <button
      type="button"
      className={cx('ui-toolbtn', active && 'is-on', !children && 'ui-toolbtn--icon')}
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} size={15} />
      {children}
    </button>
  );
}

/** Saves rows as a CSV file (the grid's download button). */
export function downloadCsv<R>(
  filename: string,
  columns: { header: string; value: (row: R) => unknown }[],
  rows: R[],
) {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    columns.map((c) => esc(c.header)).join(','),
    ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(',')),
  ].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}
