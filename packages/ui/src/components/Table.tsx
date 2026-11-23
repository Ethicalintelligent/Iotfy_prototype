import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '../cx';
import { EmptyState } from './basics';

export interface Column<Row> {
  /** Column heading. */
  header: ReactNode;
  /** Cell content. A string key reads that field from the row. */
  cell: keyof Row | ((row: Row) => ReactNode);
  /** 'right' for numbers (Design System: numbers right-aligned, tabular). */
  align?: 'left' | 'right';
  width?: number | string;
}

export interface TableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  /** Unique key per row (default: row.id ?? index). */
  rowKey?: (row: Row, index: number) => string | number;
  /** Makes rows clickable (opens the record). */
  onRowClick?: (row: Row) => void;
  /** Shown when there are no rows. */
  empty?: ReactNode;
  /** Accessible name for the table. */
  label?: string;
  /** Render without the card around it (when it already sits in a Card). */
  bare?: boolean;
  /** Rows per page at first (10 / 25 / 50 / 100, default 25). The pager shows only when there is more than one page. */
  pageSize?: PageSize;
}

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export function Table<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty = 'Nothing here yet.',
  label,
  bare,
  pageSize = 25,
}: TableProps<Row>) {
  const [size, setSize] = useState<PageSize>(pageSize);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  // a filter or search can shrink the list: stay on a page that exists
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const paged = rows.length > PAGE_SIZES[0];
  const shown = paged ? rows.slice((page - 1) * size, page * size) : rows;

  const keyOf = (r: Row, i: number) => rowKey?.(r, i) ?? (r as { id?: string | number }).id ?? i;
  const show = (r: Row, c: Column<Row>): ReactNode => {
    if (typeof c.cell === 'function') return c.cell(r);
    const v = r[c.cell];
    return v == null || v === '' ? '—' : (v as ReactNode);
  };
  const onKey = (e: KeyboardEvent, r: Row) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick?.(r);
    }
  };
  const table = (
    <table className="ui-table" aria-label={label}>
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th key={i} className={cx(c.align === 'right' && 'ui-num')} style={{ width: c.width }}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length}>
              <EmptyState>{empty}</EmptyState>
            </td>
          </tr>
        ) : (
          shown.map((r, i) => (
            <tr
              key={keyOf(r, i)}
              className={cx(onRowClick && 'ui-click')}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => onKey(e, r) : undefined}
            >
              {columns.map((c, j) => (
                <td key={j} className={cx(c.align === 'right' && 'ui-num')}>
                  {show(r, c)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
  const pager = paged && (
    <Pagination
      page={Math.min(page, pageCount)}
      pageCount={pageCount}
      onPage={setPage}
      pageSize={size}
      onPageSize={(s) => {
        setSize(s);
        setPage(1);
      }}
      total={rows.length}
    />
  );
  if (bare)
    return (
      <>
        {table}
        {pager}
      </>
    );
  return (
    <div className="ui-tw">
      {table}
      {pager}
    </div>
  );
}

// ---------------------------------------------------------------- Pagination
export interface PaginationProps {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  pageSize?: PageSize;
  onPageSize?: (size: PageSize) => void;
  /** Total number of rows, for the "1–25 of 240" text. */
  total?: number;
}
/** Pager under a table: rows-per-page 10 / 25 / 50 / 100, page numbers, previous / next. */
export function Pagination({ page, pageCount, onPage, pageSize, onPageSize, total }: PaginationProps) {
  // first, last, and the pages around the current one
  const nums = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);
  const items: (number | 'gap')[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1]! > 1) items.push('gap');
    items.push(n);
  });
  return (
    <nav className="ui-pager" aria-label="Pages">
      <span className="ui-pager__side">
        {onPageSize && pageSize && (
          <>
            Rows per page
            <select
              className="ui-input"
              value={pageSize}
              aria-label="Rows per page"
              onChange={(e) => onPageSize(Number(e.target.value) as PageSize)}
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </>
        )}
        {total != null && pageSize && (
          <span>
            {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
          </span>
        )}
      </span>
      <span className="ui-pager__pages">
        <button
          type="button"
          className="ui-pager__btn"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          ‹
        </button>
        {items.map((n, i) =>
          n === 'gap' ? (
            <span key={`g${i}`}>…</span>
          ) : (
            <button
              key={n}
              type="button"
              className={cx('ui-pager__btn', n === page && 'is-on')}
              aria-current={n === page ? 'page' : undefined}
              onClick={() => onPage(n)}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          className="ui-pager__btn"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          ›
        </button>
      </span>
    </nav>
  );
}
