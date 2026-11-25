// IT-0036. The Manage grid's search, column filters, sort and grouping, as in the original page.

export interface GridColumn<R> {
  key: string;
  label: string;
  width: number;
  strong?: boolean;
  sub?: string;
  /** 'number' forces the numeric filter; otherwise it is guessed from the values. */
  filter?: 'number' | 'text';
  /** The quick filter box is hidden when the list is paged on a server (kept for parity). */
  noServerFilter?: boolean;
  value: (row: R) => string;
  sortValue?: (row: R) => string | number;
  render?: (row: R) => React.ReactNode;
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
export interface Sort {
  key: string;
  dir: 'asc' | 'desc';
}
export interface GridLayout {
  hidden: string[];
  frozen: string[];
  groupBy: string[];
  filters: Record<string, string>;
  sort: Sort | null;
  columnFilters: Record<string, ColumnFilter>;
  order?: string[];
}
export const EMPTY_LAYOUT: GridLayout = {
  hidden: [],
  frozen: [],
  groupBy: [],
  filters: {},
  sort: null,
  columnFilters: {},
};
export const PAGE_SIZES = [10, 25, 50, 100];

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
const BLANKS = new Set(['', '-', '—']);
const NUM_RE = /^[-+]?(\d+\.?\d*|\.\d+)$/;
const NUM_IN = /[-+]?(\d+\.?\d*|\.\d+)/;
const isBlank = (s: string) => BLANKS.has(s.trim());
const firstNumber = (s: string) => {
  const m = s.replace(/,/g, '').match(NUM_IN);
  return m ? Number(m[0]) : NaN;
};
const asNumber = (s?: string) => {
  const t = (s ?? '').replace(/,/g, '').trim();
  return NUM_RE.test(t) ? Number(t) : NaN;
};

/** True when the first values of a column look numeric (the numeric filter is offered). */
export function looksNumeric(values: string[], max = 200): boolean {
  let seen = 0;
  let nums = 0;
  for (const v of values) {
    if (seen++ >= max) break;
    const s = v.trim();
    if (isBlank(s)) continue;
    if (!NUM_RE.test(s.replace(/,/g, ''))) return false;
    nums++;
  }
  return nums > 0;
}

export function conditionComplete(c?: Condition): boolean {
  if (!c) return false;
  if (c.op === 'blank' || c.op === 'notBlank') return true;
  if (c.op === 'between') return !Number.isNaN(asNumber(c.value)) && !Number.isNaN(asNumber(c.to));
  if (NUMERIC.has(c.op)) return !Number.isNaN(asNumber(c.value));
  return !!c.value?.trim();
}
function activeConditions(f?: ColumnFilter): Condition[] {
  if (!f || !conditionComplete(f.first)) return [];
  return conditionComplete(f.second) ? [f.first!, f.second!] : [f.first!];
}
export const filterActive = (f?: ColumnFilter) => activeConditions(f).length > 0;

function test(c: Condition, raw: string): boolean {
  const blank = isBlank(raw);
  if (c.op === 'blank') return blank;
  if (c.op === 'notBlank') return !blank;
  if (NUMERIC.has(c.op)) {
    const n = firstNumber(raw);
    if (Number.isNaN(n)) return false;
    const v = asNumber(c.value);
    switch (c.op) {
      case 'eq':
        return n === v;
      case 'ne':
        return n !== v;
      case 'gt':
        return n > v;
      case 'gte':
        return n >= v;
      case 'lt':
        return n < v;
      case 'lte':
        return n <= v;
      default: {
        const to = asNumber(c.to);
        return n >= Math.min(v, to) && n <= Math.max(v, to);
      }
    }
  }
  const s = raw.trim().toLowerCase();
  const v = (c.value ?? '').trim().toLowerCase();
  switch (c.op) {
    case 'contains':
      return s.includes(v);
    case 'notContains':
      return !s.includes(v);
    case 'equals':
      return s === v;
    case 'notEqual':
      return s !== v;
    case 'startsWith':
      return s.startsWith(v);
    default:
      return s.endsWith(v);
  }
}
function tester(f?: ColumnFilter): ((v: string) => boolean) | null {
  const [a, b] = activeConditions(f);
  if (!a) return null;
  if (!b) return (v) => test(a, v);
  return f?.join === 'or' ? (v) => test(a, v) || test(b, v) : (v) => test(a, v) && test(b, v);
}

const OP_LABEL = new Map([...TEXT_OPS, ...NUMBER_OPS].map((o) => [o.value, o.label]));
function describe(c: Condition): string {
  const l = OP_LABEL.get(c.op) ?? c.op;
  if (c.op === 'blank' || c.op === 'notBlank') return l;
  if (c.op === 'between') return `${l} ${c.value?.trim()}–${c.to?.trim()}`;
  if (NUMERIC.has(c.op)) return `${l} ${c.value?.trim()}`;
  return `${l} “${c.value?.trim()}”`;
}
/** The short text shown beside "Filter" in the column menu. */
export const describeFilter = (f?: ColumnFilter) =>
  activeConditions(f)
    .map(describe)
    .join(f?.join === 'or' ? ' or ' : ' and ');
export const activeFilters = (all: Record<string, ColumnFilter> = {}) =>
  Object.fromEntries(Object.entries(all).filter(([, f]) => filterActive(f)));

const compare = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
export const pickColumns = <R>(cols: GridColumn<R>[], keys: string[]) =>
  keys.flatMap((k) => cols.find((c) => c.key === k) ?? []);

/** Search, filter and sort the rows (grouped columns sort first). */
export function applyView<R>(
  rows: R[],
  cols: GridColumn<R>[],
  v: {
    query: string;
    filters: Record<string, string>;
    columnFilters?: Record<string, ColumnFilter>;
    sort: Sort | null;
    groupBy: string[];
  },
): R[] {
  const q = v.query.trim().toLowerCase();
  const quick = Object.entries(v.filters).filter(([, s]) => s.trim());
  const tests = Object.entries(v.columnFilters ?? {}).flatMap(([k, f]) => {
    const col = cols.find((c) => c.key === k);
    const t = col ? tester(f) : null;
    return col && t ? [{ col, t }] : [];
  });
  let out = rows.filter((r) => {
    if (q && !cols.some((c) => c.value(r).toLowerCase().includes(q))) return false;
    if (!tests.every(({ col, t }) => t(col.value(r)))) return false;
    return quick.every(([k, s]) => {
      const col = cols.find((c) => c.key === k);
      return !col || col.value(r).toLowerCase().includes(s.trim().toLowerCase());
    });
  });
  const sortCol = v.sort ? cols.find((c) => c.key === v.sort!.key) : undefined;
  const groups = pickColumns(cols, v.groupBy);
  if (sortCol || groups.length)
    out = [...out].sort((a, b) => {
      for (const g of groups) {
        const d = compare(g.value(a), g.value(b));
        if (d) return d;
      }
      if (!sortCol || !v.sort) return 0;
      const x = sortCol.sortValue ? sortCol.sortValue(a) : sortCol.value(a);
      const y = sortCol.sortValue ? sortCol.sortValue(b) : sortCol.value(b);
      const d =
        typeof x === 'number' && typeof y === 'number' ? x - y : compare(String(x), String(y));
      return v.sort.dir === 'desc' ? -d : d;
    });
  return out;
}

/** Column order after a saved reorder; new columns keep their place. */
export function orderColumns<C extends { key: string }>(cols: C[], order?: string[]): C[] {
  if (!order?.length) return cols;
  const byKey = new Map(cols.map((c) => [c.key, c]));
  const out = order.flatMap((k) => byKey.get(k) ?? []);
  cols.forEach((c, i) => {
    if (!order.includes(c.key)) out.splice(Math.min(i, out.length), 0, c);
  });
  return out;
}
export function moveKey(keys: string[], from: string, to: string, after: boolean): string[] {
  const rest = keys.filter((k) => k !== from);
  const at = rest.indexOf(to);
  if (at < 0 || !keys.includes(from)) return [...keys];
  rest.splice(at + (after ? 1 : 0), 0, from);
  return rest;
}
