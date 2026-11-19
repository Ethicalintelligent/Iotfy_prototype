import type { KeyboardEvent, ReactNode } from 'react';
import { cx } from '../cx';
import { EmptyState } from './basics';

export interface Column<Row> {
  /** Column heading. */
  header: ReactNode;
  /** Cell content. A string key reads that field from the row. */
  cell: keyof Row | ((row: Row) => ReactNode);
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
}

export function Table<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty = 'Nothing here yet.',
  label,
  bare,
}: TableProps<Row>) {
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
            <th key={i} style={{ width: c.width, textAlign: c.align }}>
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
          rows.map((r, i) => (
            <tr
              key={keyOf(r, i)}
              className={cx(onRowClick && 'ui-click')}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => onKey(e, r) : undefined}
            >
              {columns.map((c, j) => (
                <td key={j} style={{ textAlign: c.align }}>
                  {show(r, c)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
  return bare ? table : <div className="ui-tw">{table}</div>;
}
