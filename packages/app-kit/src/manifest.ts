// Product manifests (docs/ARCHITECTURE.md, "The product manifest"). Each product folder has a
// manifest.ts: its id (core.nodes.id, which gives the name and kind), sign-in scene and screen
// spec. Editions EXTEND their base's manifest; packages COMPOSE their members' manifests.
// customer-apps finds them all with import.meta.glob, so adding a product means adding a folder.
import type { ProductSpec, TableSpec } from './spec';

/** What an edition or package adds on top of what it extends or composes. */
export interface ManifestAdditions {
  /** Extra menu items, by section heading (new sections are added at the end). */
  menu?: [string, [string, string][]][];
  tables?: Record<string, TableSpec>;
  reports?: [string, string][];
  rules?: [string, string, string][];
  alerts?: string[];
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

function mergeMenu(
  base: ProductSpec['menu'],
  extra: ProductSpec['menu'] = [],
): ProductSpec['menu'] {
  const out = base.map(([h, items]) => [h, [...items]] as [string, [string, string][]]);
  for (const [heading, items] of extra) {
    const sec = out.find(([h]) => h === heading);
    const target = sec ? sec[1] : (out.push([heading, []]), out[out.length - 1]![1]);
    for (const it of items) if (!target.some(([k]) => k === it[0])) target.push(it);
  }
  return out;
}

const uniqBy = <T>(xs: T[], key: (x: T) => string) => [
  ...new Map(xs.map((x) => [key(x), x])).values(),
];

function applyAdditions(spec: ProductSpec, add?: ManifestAdditions): ProductSpec {
  if (!add) return spec;
  return {
    ...spec,
    menu: mergeMenu(spec.menu, add.menu),
    tables: { ...spec.tables, ...add.tables },
    reports: uniqBy([...spec.reports, ...(add.reports ?? [])], (r) => r[0]),
    rules: uniqBy([...(spec.rules ?? []), ...(add.rules ?? [])], (r) => r[0]),
    alerts: [...new Set([...spec.alerts, ...(add.alerts ?? [])])],
  };
}

/**
 * The spec a product app uses: its own; an edition's base spec plus its additions; a package's
 * members' specs combined (menus merged, first member's dashboard) plus its additions.
 */
export function resolveSpec(m: ProductManifest): ProductSpec {
  if (m.spec) return applyAdditions(m.spec, m.add);
  if (m.extends) return applyAdditions(resolveSpec(m.extends), m.add);
  const specs = (m.members ?? []).map(resolveSpec);
  const [first, ...rest] = specs;
  if (!first) throw new Error(`Product ${m.id} has no members.`);
  const combined = rest.reduce<ProductSpec>(
    (acc, s) => ({
      ...acc,
      menu: mergeMenu(acc.menu, s.menu),
      tables: { ...s.tables, ...acc.tables },
      reports: uniqBy([...acc.reports, ...s.reports], (r) => r[0]),
      rules: uniqBy([...(acc.rules ?? []), ...(s.rules ?? [])], (r) => r[0]),
      alerts: [...new Set([...acc.alerts, ...s.alerts])],
    }),
    first,
  );
  return applyAdditions(combined, m.add);
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
