// Data side of the original's report grid (`td-mg`): column definition, layout, search,
// per-column text/number conditions, sorting and grouping. Same rules as the original.
import type { ReactNode } from 'react';

export type Row = Record<string, unknown> & { __k: string };

export interface Column {
  key: string;
  label: string;
  width: number;
  value: (row: Row) => string;
  sortValue?: (row: Row) => number | string;
  render?: (row: Row) => ReactNode;
  strong?: boolean;
  sub?: string;
}

export interface Sort {
  key: string;
  dir: 'asc' | 'desc';
}

export interface Condition {
  op: string;
  value?: string;
  to?: string;
}
export interface ColumnFilter {
  first?: Condition;
  second?: Condition;
  join?: 'and' | 'or';
}

export interface Layout {
  hidden: string[];
  frozen: string[];
  groupBy: string[];
  filters: Record<string, string>;
  sort: Sort | null;
  columnFilters: Record<string, ColumnFilter>;
  order?: string[];
}

export const EMPTY_LAYOUT: Layout = {
  hidden: [],
  frozen: [],
  groupBy: [],
  filters: {},
  sort: null,
  columnFilters: {},
};

const BLANK_OPS = [
  { value: 'blank', label: 'Blank' },
  { value: 'notBlank', label: 'Not blank' },
];
export const TEXT_OPS = [
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Does not contain' },
  { value: 'equals', label: 'Equals' },
  { value: 'notEqual', label: 'Does not equal' },
  { value: 'startsWith', label: 'Begins with' },
  { value: 'endsWith', label: 'Ends with' },
  ...BLANK_OPS,
];
export const NUMBER_OPS = [
  { value: 'eq', label: 'Equals' },
  { value: 'ne', label: 'Does not equal' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater than or equal to' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less than or equal to' },
  { value: 'between', label: 'Between' },
  ...BLANK_OPS,
];
const NUMERIC = new Set(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between']);
const EMPTY_VALUES = new Set(['', '-', '—']);
const NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)$/;
const FIRST_NUMBER = /[-+]?(\d+\.?\d*|\.\d+)/;
const isEmpty = (v: string) => EMPTY_VALUES.has(v.trim());

function firstNumber(v: string) {
  const m = v.replace(/,/g, '').match(FIRST_NUMBER);
  return m ? Number(m[0]) : NaN;
}
const toNumber = (v?: string) => {
  const t = (v ?? '').replace(/,/g, '').trim();
  return NUMBER.test(t) ? Number(t) : NaN;
};

/** True when the column's first values are numbers (the column menu then offers number conditions). */
export function looksNumeric(values: string[], max = 200) {
  let seen = 0;
  let numbers = 0;
  for (const raw of values) {
    if (seen++ >= max) break;
    const v = raw.trim();
    if (isEmpty(v)) continue;
    if (!NUMBER.test(v.replace(/,/g, ''))) return false;
    numbers++;
  }
  return numbers > 0;
}

function complete(c?: Condition) {
  if (!c) return false;
  if (c.op === 'blank' || c.op === 'notBlank') return true;
  if (c.op === 'between') return !Number.isNaN(toNumber(c.value)) && !Number.isNaN(toNumber(c.to));
  if (NUMERIC.has(c.op)) return !Number.isNaN(toNumber(c.value));
  return !!c.value?.trim();
}
export const conditionComplete = complete;

function activeConditions(f?: ColumnFilter): Condition[] {
  if (!f || !complete(f.first)) return [];
  return complete(f.second) ? [f.first!, f.second!] : [f.first!];
}
export const filterActive = (f?: ColumnFilter) => activeConditions(f).length > 0;

function test(c: Condition, v: string) {
  const empty = isEmpty(v);
  if (c.op === 'blank') return empty;
  if (c.op === 'notBlank') return !empty;
  if (NUMERIC.has(c.op)) {
    const n = firstNumber(v);
    if (Number.isNaN(n)) return false;
    const a = toNumber(c.value);
    switch (c.op) {
      case 'eq':
        return n === a;
      case 'ne':
        return n !== a;
      case 'gt':
        return n > a;
      case 'gte':
        return n >= a;
      case 'lt':
        return n < a;
      case 'lte':
        return n <= a;
      default: {
        const b = toNumber(c.to);
        return n >= Math.min(a, b) && n <= Math.max(a, b);
      }
    }
  }
  const text = v.trim().toLowerCase();
  const q = (c.value ?? '').trim().toLowerCase();
  switch (c.op) {
    case 'contains':
      return text.includes(q);
    case 'notContains':
      return !text.includes(q);
    case 'equals':
      return text === q;
    case 'notEqual':
      return text !== q;
    case 'startsWith':
      return text.startsWith(q);
    default:
      return text.endsWith(q);
  }
}

function predicate(f?: ColumnFilter): ((v: string) => boolean) | null {
  const [a, b] = activeConditions(f);
  if (!a) return null;
  if (!b) return (v) => test(a, v);
  return f?.join === 'or' ? (v) => test(a, v) || test(b, v) : (v) => test(a, v) && test(b, v);
}

const OP_LABEL = new Map([...TEXT_OPS, ...NUMBER_OPS].map((o) => [o.value, o.label]));
function describe(c: Condition) {
  const label = OP_LABEL.get(c.op) ?? c.op;
  if (c.op === 'blank' || c.op === 'notBlank') return label;
  if (c.op === 'between') return `${label} ${c.value?.trim()}–${c.to?.trim()}`;
  if (NUMERIC.has(c.op)) return `${label} ${c.value?.trim()}`;
  return `${label} “${c.value?.trim()}”`;
}
/** Short text of a column filter, shown in the column menu. */
export const describeFilter = (f?: ColumnFilter) =>
  activeConditions(f)
    .map(describe)
    .join(f?.join === 'or' ? ' or ' : ' and ');

export const activeColumnFilters = (f?: Record<string, ColumnFilter>) =>
  Object.fromEntries(Object.entries(f ?? {}).filter(([, v]) => filterActive(v)));

export const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

export function columnsByKeys(columns: Column[], keys: string[]) {
  return keys.flatMap((k) => columns.find((c) => c.key === k) ?? []);
}

/** Search, filter, then sort (group columns first) — as the original grid. */
export function applyView(
  rows: Row[],
  columns: Column[],
  opts: {
    query: string;
    filters: Record<string, string>;
    columnFilters?: Record<string, ColumnFilter>;
    sort: Sort | null;
    groupBy: string[];
  },
): Row[] {
  const q = opts.query.trim().toLowerCase();
  const text = Object.entries(opts.filters).filter(([, v]) => v.trim());
  const conds = Object.entries(opts.columnFilters ?? {}).flatMap(([key, f]) => {
    const col = columns.find((c) => c.key === key);
    const fn = col ? predicate(f) : null;
    return col && fn ? [{ col, fn }] : [];
  });
  let out = rows.filter((r) => {
    if (q && !columns.some((c) => c.value(r).toLowerCase().includes(q))) return false;
    if (!conds.every(({ col, fn }) => fn(col.value(r)))) return false;
    return text.every(([key, v]) => {
      const col = columns.find((c) => c.key === key);
      return !col || col.value(r).toLowerCase().includes(v.trim().toLowerCase());
    });
  });
  const sortCol = opts.sort ? columns.find((c) => c.key === opts.sort!.key) : undefined;
  const groups = columnsByKeys(columns, opts.groupBy);
  if (sortCol || groups.length) {
    out = [...out].sort((a, b) => {
      for (const g of groups) {
        const d = naturalCompare(g.value(a), g.value(b));
        if (d) return d;
      }
      if (!sortCol || !opts.sort) return 0;
      const x = sortCol.sortValue ? sortCol.sortValue(a) : sortCol.value(a);
      const y = sortCol.sortValue ? sortCol.sortValue(b) : sortCol.value(b);
      const d =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : naturalCompare(String(x), String(y));
      return opts.sort.dir === 'desc' ? -d : d;
    });
  }
  return out;
}

/** Saved column order with any new columns put back at their own place. */
export function ordered(columns: Column[], order?: string[]) {
  if (!order?.length) return columns;
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const out = order.flatMap((k) => byKey.get(k) ?? []);
  columns.forEach((c, i) => {
    if (!order.includes(c.key)) out.splice(Math.min(i, out.length), 0, c);
  });
  return out;
}

export function moveKey(keys: string[], moved: string, target: string, after: boolean) {
  const rest = keys.filter((k) => k !== moved);
  const at = rest.indexOf(target);
  if (at < 0 || !keys.includes(moved)) return [...keys];
  rest.splice(at + (after ? 1 : 0), 0, moved);
  return rest;
}

/* ---------------------------------------------------------------- widths */

let canvas: CanvasRenderingContext2D | null | undefined;
function labelWidth(text: string, scope: Element | null) {
  if (canvas === undefined) {
    try {
      canvas = document.createElement('canvas').getContext('2d');
    } catch {
      canvas = null;
    }
  }
  const s = scope ? getComputedStyle(scope) : null;
  const size = parseFloat(s?.getPropertyValue('--fs-lg') ?? '') || 14;
  const tracking = parseFloat(s?.getPropertyValue('--tracking-label') ?? '') || 0.05;
  if (!canvas) return text.length * size * (0.62 + tracking);
  canvas.font = `600 ${size}px ${s?.getPropertyValue('--font').trim() || 'sans-serif'}`;
  return canvas.measureText(text).width + text.length * size * tracking;
}

/** Widens columns whose header label would not fit (as the original). */
export function fitLabels(columns: Column[], scope: Element | null): Column[] {
  const cellX =
    parseFloat(
      (scope ? getComputedStyle(scope) : null)?.getPropertyValue('--table-cell-x') ?? '',
    ) || 14;
  return columns.map((c) => {
    const w = Math.ceil(labelWidth(c.label, scope) + 2 * cellX + 18 + 4);
    return w > c.width ? { ...c, width: w } : c;
  });
}
