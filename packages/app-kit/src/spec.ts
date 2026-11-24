// What a product tells the generic screens: its menu, dashboard KPIs, chart, alerts, tables,
// reports and alert rules. Ported from the legacy XS specs (legacy/src/app.js ~807); each
// product folder fills one in (Steps 10–11). Cells use the demo prefixes (! ~ + ^).
import type { ComponentType } from 'react';
import type { IconName } from '@iotify/ui';
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
  /** The product's own screens (real data, not demo tables), by menu key. */
  screens?: Record<string, CustomScreen>;
  /** Rail icons for the product's own menu keys. */
  icons?: Record<string, IconName>;
  /**
   * The product's own `screens` replace the built-in screen with the same key (dash, map,
   * alerts, reports, rules). Editions inherit this; packages don't (they keep their own
   * dashboard), because a combined spec takes it from its first member only.
   */
  ownScreensFirst?: boolean;
  /**
   * Show only this menu: no "Devices & features" and no Account section. Editions inherit it;
   * packages don't.
   */
  plainMenu?: boolean;
  /** Rail look: `grouped` = full-width dividers and a brand-pill active item. Look only. */
  railLook?: 'default' | 'grouped';
  /** Name beside the logo in the open rail; default is the product name. */
  railBrand?: string;
}

/** What a product's own screen gets from the product app. */
export interface ScreenContext {
  product: string;
  productName: string;
  companyId: string;
  companyName: string;
  /** View-only (fleet roles, support sessions). */
  readOnly: boolean;
  /** Fleet roles: only this asset group. */
  assetGroup: string | null;
  onNavigate?: (screen: string) => void;
}

export interface CustomScreen {
  title: string;
  description: string;
  /** Use React.lazy(() => import('./screens/…')) so the code loads only when opened. */
  component: ComponentType<ScreenContext>;
}
