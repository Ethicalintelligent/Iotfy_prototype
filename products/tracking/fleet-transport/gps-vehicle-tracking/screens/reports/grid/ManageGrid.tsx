// The original's toolbar + grid frame (`td-manage`): report picker slot, search, Freeze Columns,
// Columns (show/hide, reset order), Export CSV and Print, and the grid below.
import { useRef, useState, type ReactNode } from 'react';
import { Icon } from '../../smart-track/kit';
import { CheckRow, PopSearch, SEARCH_FROM, SearchBox, matches, usePop } from '../ui';
import { DataGrid } from './DataGrid';
import {
  EMPTY_LAYOUT,
  applyView,
  moveKey,
  ordered,
  type Column,
  type Layout,
  type Row,
} from './model';

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');
const today = () => new Date().toISOString().slice(0, 10);

function exportCsv(name: string, cols: Column[], rows: Row[]) {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [
    cols.map((c) => cell(c.label)).join(','),
    ...rows.map((r) => cols.map((c) => cell(c.value(r))).join(',')),
  ];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${slug(name)}-${today()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function printTable(name: string, cols: Column[], rows: Row[]) {
  const w = window.open('', '_blank', 'width=1100,height=800');
  if (!w) return;
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title>
    <style>body{font:600 12px 'Instrument Sans',system-ui,sans-serif;margin:24px;color:#011D32}h1{font-size:16px;font-weight:700;margin:0 0 4px}p{color:#748093;margin:0 0 16px}
    table{border-collapse:collapse;width:100%}th,td{border:1px solid #E9ECEF;padding:6px 8px;text-align:left}th{background:#E9F7F0;font-weight:700}</style></head>
    <body><h1>${esc(name)}</h1><p>${rows.length} records · printed ${esc(new Date().toLocaleString())}</p>
    <table><thead><tr>${cols.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(c.value(r))}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export function ManageGrid({
  picker,
  title,
  rows,
  columns,
  plural,
  searchPlaceholder,
  loading,
  error,
  onRetry,
  emptyText,
  layout,
  onLayout,
  children,
}: {
  picker: ReactNode;
  title: ReactNode;
  rows: Row[];
  columns: Column[];
  plural: string;
  searchPlaceholder: string;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  emptyText: string;
  layout?: Layout;
  onLayout: (l: Layout) => void;
  children?: ReactNode;
}) {
  const [query, setQuery] = useState('');
  const current = layout ?? EMPTY_LAYOUT;
  const latest = useRef(current);
  latest.current = current;
  const update = (patch: Partial<Layout>) => {
    latest.current = { ...latest.current, ...patch };
    onLayout(latest.current);
  };
  const { hidden, frozen, groupBy, filters, sort, columnFilters, order } = current;
  const all = ordered(columns, order);
  const visible = all.filter((c) => !hidden.includes(c.key));
  const frozenCols = visible.filter((c) => frozen.includes(c.key));
  const shownCols = [...frozenCols, ...visible.filter((c) => !frozen.includes(c.key))];
  const shownRows = applyView(rows, visible, { query, filters, columnFilters, sort, groupBy });
  const canExport = shownRows.length > 0;
  const pin = (key: string, on: boolean) => {
    const next = on ? [...frozen, key] : frozen.filter((k) => k !== key);
    if (next.length < visible.length) update({ frozen: next });
  };

  return (
    <div className="td-manage">
      <div className="td-manage__bar">
        {picker}
        <SearchBox value={query} onChange={setQuery} placeholder={searchPlaceholder} />
        <FreezeMenu columns={shownCols} frozen={frozen} onChange={(f) => update({ frozen: f })} />
        <ColumnsMenu
          columns={all}
          hidden={hidden}
          onChange={(h) =>
            update({
              hidden: h,
              frozen: frozen.filter((k) => !h.includes(k)),
              groupBy: groupBy.filter((k) => !h.includes(k)),
              filters: Object.fromEntries(Object.entries(filters).filter(([k]) => !h.includes(k))),
            })
          }
          onResetOrder={order?.length ? () => update({ order: undefined }) : undefined}
        />
        <button
          type="button"
          className="td-manage__icon"
          title="Export CSV"
          aria-label="Export CSV"
          aria-busy={false}
          disabled={!canExport}
          onClick={() => exportCsv(plural, visible, shownRows)}
        >
          <Icon name="Download" size={17} />
        </button>
        <button
          type="button"
          className="td-manage__icon"
          title="Print"
          aria-label="Print"
          aria-busy={false}
          disabled={!canExport}
          onClick={() => printTable(plural, visible, shownRows)}
        >
          <Icon name="Printer" size={17} />
        </button>
      </div>
      <DataGrid
        title={title}
        columns={shownCols}
        rows={rows}
        rowKey={(r) => r.__k}
        plural={plural}
        frozen={frozenCols.length}
        groupBy={groupBy}
        onGroupBy={(g) => update({ groupBy: g })}
        query={query}
        filters={filters}
        onFilters={(f) => update({ filters: f })}
        sort={sort}
        onSort={(s) => update({ sort: s })}
        columnFilters={columnFilters ?? {}}
        onColumnFilters={(f) => update({ columnFilters: f })}
        onPin={pin}
        onResetColumns={() =>
          update({ hidden: [], frozen: [], sort: null, groupBy: [], order: undefined })
        }
        onMoveColumn={(moved, target, after) =>
          update({
            order: moveKey(
              all.map((c) => c.key),
              moved,
              target,
              after,
            ),
          })
        }
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyText={emptyText}
      />
      {children}
    </div>
  );
}

function FreezeMenu({
  columns,
  frozen,
  onChange,
}: {
  columns: Column[];
  frozen: string[];
  onChange: (keys: string[]) => void;
}) {
  const { open, setOpen, ref } = usePop();
  const count = columns.filter((c) => frozen.includes(c.key)).length;
  const max = Math.max(0, columns.length - 1);
  const set = (n: number) =>
    onChange(columns.slice(0, Math.max(0, Math.min(max, n))).map((c) => c.key));
  return (
    <div className="td-pop" ref={ref}>
      <button
        type="button"
        className={`td-manage__tool ${count ? 'is-on' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <Icon name="PanelLeft" size={16} />
        <span>{count ? `Freeze ${count} Col${count > 1 ? 's' : ''}` : 'Freeze Columns'}</span>
      </button>
      {open && (
        <div className="td-pop__menu td-pop__menu--freeze" role="group" aria-label="Freeze columns">
          <span className="td-freeze__k">Freeze columns</span>
          <div className="td-freeze__row">
            <span>Columns frozen from left</span>
            <span className="td-freeze__stepper">
              <button
                type="button"
                className="td-freeze__step"
                aria-label="Freeze one column less"
                disabled={count === 0}
                onClick={() => set(count - 1)}
              >
                –
              </button>
              <output className="td-freeze__n" aria-live="polite">
                {count}
              </output>
              <button
                type="button"
                className="td-freeze__step"
                aria-label="Freeze one more column"
                disabled={count >= max}
                onClick={() => set(count + 1)}
              >
                +
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ColumnsMenu({
  columns,
  hidden,
  onChange,
  onResetOrder,
}: {
  columns: Column[];
  hidden: string[];
  onChange: (hidden: string[]) => void;
  onResetOrder?: () => void;
}) {
  const { open, setOpen, ref } = usePop();
  const [q, setQ] = useState('');
  const toggle = (key: string) => {
    const next = hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key];
    if (next.length < columns.length) onChange(next);
  };
  const list = columns.filter((c) => matches(c.label, q));
  return (
    <div className="td-pop" ref={ref}>
      <button
        type="button"
        className={`td-manage__tool ${hidden.length ? 'is-on' : ''}`}
        onClick={() => {
          setQ('');
          setOpen((o) => !o);
        }}
        aria-expanded={open}
      >
        <Icon name="SlidersVertical" size={16} />
        <span>Columns</span>
        {hidden.length > 0 && (
          <em>
            {columns.length - hidden.length}/{columns.length}
          </em>
        )}
      </button>
      {open && (
        <div
          className="td-pop__menu td-pop__menu--checks"
          role="group"
          aria-label="Visible columns"
        >
          {columns.length > SEARCH_FROM && (
            <PopSearch value={q} onChange={setQ} label="Search columns" />
          )}
          {!list.length && <span className="td-pop__none">No results found</span>}
          {list.map((c) => (
            <CheckRow
              key={c.key}
              checked={!hidden.includes(c.key)}
              onChange={() => toggle(c.key)}
              disabled={!hidden.includes(c.key) && hidden.length === columns.length - 1}
            >
              {c.label}
            </CheckRow>
          ))}
          {hidden.length > 0 && (
            <button type="button" className="td-link" onClick={() => onChange([])}>
              <Icon name="RotateCcw" size={12} />
              Show all
            </button>
          )}
          {onResetOrder && (
            <button type="button" className="td-link" onClick={onResetOrder}>
              <Icon name="RotateCcw" size={12} />
              Reset column order
            </button>
          )}
        </div>
      )}
    </div>
  );
}
