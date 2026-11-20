// The product registry: every products/**/manifest.ts, found at build time (docs/ARCHITECTURE.md).
// Adding a product means adding its folder; nothing here changes.
import {
  GENERIC_SPEC,
  createRegistry,
  resolveScene,
  resolveSpec,
  type ProductSpec,
} from '@iotify/app-kit';

export const registry = createRegistry(
  import.meta.glob('../../../../products/**/manifest.ts', { eager: true }),
);

interface Tree {
  isEdition(id: string): boolean;
  baseOf(id: string): string;
}

/** The product's manifest; an edition without its own folder uses its base product's. */
export function manifestFor(id: string, tree?: Tree | null) {
  return registry.get(id) ?? (tree?.isEdition(id) ? registry.get(tree.baseOf(id)) : undefined);
}

/** The spec a product app shows: from its manifest, else the generic one. */
export function specFor(id: string, tree?: Tree | null): ProductSpec {
  const m = manifestFor(id, tree);
  return m ? resolveSpec(m) : GENERIC_SPEC;
}

export function sceneFor(id: string, tree?: Tree | null): string | undefined {
  const m = manifestFor(id, tree);
  return m ? resolveScene(m) : undefined;
}
