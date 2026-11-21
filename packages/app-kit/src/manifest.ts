// Product manifests (docs/ARCHITECTURE.md, "The product manifest"). Each product folder has a
// manifest.ts: its id (core.nodes.id, which gives the name and kind), sign-in scene and screen
// spec. Editions EXTEND their base's manifest; packages COMPOSE their members' manifests.
// customer-apps finds them all with import.meta.glob, so adding a product means adding a folder.
import type { IconName } from '@iotify/ui';
import type { CustomScreen, KpiSpec, ProductSpec, TableSpec } from './spec';
import type { DemoContext } from './demo';

/** What an edition or package adds on top of what it extends or composes. */
export interface ManifestAdditions {
  /**
   * Extra menu items, by section heading. A new section goes before "Reports". An item whose key
   * is already in the menu moves here (the addition's place and label win).
   */
  menu?: [string, [string, string][]][];
  tables?: Record<string, TableSpec>;
  screens?: Record<string, CustomScreen>;
  icons?: Record<string, IconName>;
  reports?: [string, string][];
  rules?: [string, string, string][];
  alerts?: string[];
  /** Its own dashboard (a package usually has one). */
  kpis?: (c: DemoContext) => KpiSpec[];
  chart?: [string, string, number];
}

export interface ProductManifest {
  /** core.nodes.id, e.g. 'N004'. */
  id: string;
  /** Sign-in illustration ('vehicle', 'construct'…; Step 12). */
  scene?: string;
  /** The product's own spec (standalone and base products). */
  spec?: ProductSpec;
  /** Edition: the base product's manifest it extends. */
  extends?: ProductManifest;
  /** Package: the member products' manifests it composes. */
  members?: ProductManifest[];
  /** Edition or package: what it adds. */
  add?: ManifestAdditions;
}

/** Declares a product (used in each products/…/manifest.ts). */
export function defineProduct(m: ProductManifest): ProductManifest {
  if (!m.spec && !m.extends && !m.members?.length)
    throw new Error(`Product ${m.id}: give a spec, extends or members.`);
  return m;
}

type Menu = ProductSpec['menu'];

/** Adds `extra` to `base`. `override`: items already in the menu move to their new place. */
function mergeMenu(base: Menu, extra: Menu = [], override = false): Menu {
  let out: Menu = base.map(([h, items]) => [h, [...items]]);
  for (const [heading, items] of extra) {
    if (override) {
      const keys = new Set(items.map(([k]) => k));
      out = out.map(([h, its]) => [h, its.filter(([k]) => !keys.has(k))]);
    }
    let sec = out.find(([h]) => h === heading);
    if (!sec) {
      sec = [heading, []];
      const reports = out.findIndex(([h]) => h === 'Reports');
      if (reports >= 0) out.splice(reports, 0, sec);
      else out.push(sec);
    }
    for (const it of items)
      if (!out.some(([, its]) => its.some(([k]) => k === it[0]))) sec[1].push(it);
  }
  return out.filter(([, its]) => its.length);
}

const uniqBy = <T>(xs: T[], key: (x: T) => string) => [
  ...new Map(xs.map((x) => [key(x), x])).values(),
];

/** Combines two specs; `a` keeps its dashboard and wins on clashes unless `override`. */
function combine(a: ProductSpec, b: Partial<ProductSpec>, override: boolean): ProductSpec {
  const [first, second] = override ? [a, b] : [b, a];
  return {
    ...a,
    menu: mergeMenu(a.menu, b.menu, override),
    tables: { ...first.tables, ...second.tables },
    screens: { ...first.screens, ...second.screens },
    icons: { ...first.icons, ...second.icons },
    reports: uniqBy([...a.reports, ...(b.reports ?? [])], (r) => r[0]),
    rules: uniqBy([...(a.rules ?? []), ...(b.rules ?? [])], (r) => r[0]),
    alerts: [...new Set([...a.alerts, ...(b.alerts ?? [])])],
  };
}

function applyAdditions(spec: ProductSpec, add?: ManifestAdditions): ProductSpec {
  if (!add) return spec;
  const out = combine(spec, add, true);
  if (add.kpis) out.kpis = add.kpis;
  if (add.chart) out.chart = add.chart;
  return out;
}

/**
 * The spec a product app uses: its own; an edition's base spec plus its additions; a package's
 * members' specs combined (menus merged, first member's dashboard) plus its additions.
 */
export function resolveSpec(m: ProductManifest): ProductSpec {
  if (m.spec) return applyAdditions(m.spec, m.add);
  if (m.extends) return applyAdditions(resolveSpec(m.extends), m.add);
  const [first, ...rest] = (m.members ?? []).map(resolveSpec);
  if (!first) throw new Error(`Product ${m.id} has no members.`);
  return applyAdditions(
    rest.reduce((acc, s) => combine(acc, s, false), first),
    m.add,
  );
}

/** The sign-in scene: its own, else what it extends, else its first member's. */
export function resolveScene(m: ProductManifest): string | undefined {
  return (
    m.scene ??
    (m.extends ? resolveScene(m.extends) : m.members?.[0] ? resolveScene(m.members[0]) : undefined)
  );
}

export interface ProductRegistry {
  /** Manifest of a product, if its folder exists. */
  get(id: string): ProductManifest | undefined;
  ids(): string[];
}

/**
 * Builds the registry from import.meta.glob results ({ path: module }). Each module exports
 * `manifest`. Two folders claiming one id is an error (one folder per product).
 */
export function createRegistry(modules: Record<string, unknown>): ProductRegistry {
  const map = new Map<string, ProductManifest>();
  for (const [path, mod] of Object.entries(modules)) {
    const m = (mod as { manifest?: ProductManifest }).manifest;
    if (!m) throw new Error(`${path} must export \`manifest\` (defineProduct(...)).`);
    if (map.has(m.id)) throw new Error(`Product ${m.id} has two folders (${path}).`);
    map.set(m.id, m);
  }
  return { get: (id) => map.get(id), ids: () => [...map.keys()] };
}
