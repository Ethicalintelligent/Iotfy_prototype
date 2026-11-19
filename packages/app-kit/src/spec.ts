// What a product tells the generic screens: its menu, dashboard KPIs, chart, alerts, tables,
// reports and alert rules. Ported from the legacy XS specs (legacy/src/app.js ~807); each
// product folder fills one in (Steps 10–11). Cells use the demo prefixes (! ~ + ^).
import type { DemoCell, DemoContext } from './demo';

export interface KpiSpec {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'ok' | 'warn';
}

export interface TableSpec {
  title: string;
  hint: string;
  columns: string[];
  row: (c: DemoContext, i: number) => DemoCell[];
  /** Rows to show; 0 = one per asset. Default 10. */
  rows?: number;
}

export interface ProductSpec {
  /** Menu sections: [heading, [screen key, label][]]. Keys: dash, map, floor, alerts, reports, rules, or a table key. */
  menu: [string, [string, string][]][];
  kpis: (c: DemoContext) => KpiSpec[];
  /** [title, unit, typical daily value] */
  chart: [string, string, number];
  /** Alert texts with a severity prefix: "!Overspeed 94 km/h", "~Harsh braking", "^Ignition on". */
  alerts: string[];
  tables?: Record<string, TableSpec>;
  /** [name, description] */
  reports: [string, string][];
  /** [rule, condition, notify] */
  rules?: [string, string, string][];
}
