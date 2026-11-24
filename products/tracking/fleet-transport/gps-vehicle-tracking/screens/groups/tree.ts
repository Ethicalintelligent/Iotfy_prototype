// Groups as a tree (proto_vehicle.asset_groups: name and parent): tree order with depth, the
// sub-groups below a group, which parents a group may move under, and what a group limited user
// may see. Pure functions, unit-tested in tree.test.ts.

export interface GroupNode {
  id: string;
  name: string;
  parent_id?: string | null;
}

/** Ids of every group below `id` (children, their children…). */
export function descendants<G extends GroupNode>(groups: G[], id: string): Set<string> {
  const out = new Set<string>();
  const walk = (pid: string) => {
    for (const g of groups)
      if (g.parent_id === pid && !out.has(g.id)) {
        out.add(g.id);
        walk(g.id);
      }
  };
  walk(id);
  return out;
}

/** Whether `parentId` can be `id`'s parent (not itself, not one of its sub-groups). */
export const canMoveUnder = <G extends GroupNode>(
  groups: G[],
  id: string,
  parentId: string | null,
) => parentId == null || (parentId !== id && !descendants(groups, id).has(parentId));

/**
 * Groups in tree order (each parent followed by its sub-groups, by name), with their depth.
 * A group whose parent isn't in the list starts its own branch.
 */
export function treeOrder<G extends GroupNode>(groups: G[]): { group: G; depth: number }[] {
  const ids = new Set(groups.map((g) => g.id));
  const byName = (a: G, b: G) => a.name.localeCompare(b.name, 'en', { numeric: true });
  const out: { group: G; depth: number }[] = [];
  const seen = new Set<string>();
  const add = (g: G, depth: number) => {
    if (seen.has(g.id)) return; // a loop in the data: list it once
    seen.add(g.id);
    out.push({ group: g, depth });
    groups
      .filter((c) => c.parent_id === g.id)
      .sort(byName)
      .forEach((c) => add(c, depth + 1));
  };
  groups
    .filter((g) => !g.parent_id || !ids.has(g.parent_id))
    .sort(byName)
    .forEach((g) => add(g, 0));
  // Anything left is part of a loop: list it at the top.
  groups
    .filter((g) => !seen.has(g.id))
    .sort(byName)
    .forEach((g) => add(g, 0));
  return out;
}

/** The groups a user limited to `assetGroup` sees: that group and its sub-groups (all when null). */
export function visibleGroups<G extends GroupNode>(groups: G[], assetGroup: string | null): G[] {
  if (!assetGroup) return groups;
  const own = groups.find((g) => g.name === assetGroup);
  if (!own) return [];
  const below = descendants(groups, own.id);
  return groups.filter((g) => g.id === own.id || below.has(g.id));
}

/** Why a group name can't be saved, or null. */
export function nameProblem<G extends GroupNode>(
  groups: G[],
  name: string,
  id: string | null,
): string | null {
  const n = name.trim();
  if (!n) return 'Enter a name.';
  const twin = groups.find((g) => g.id !== id && g.name.trim().toLowerCase() === n.toLowerCase());
  return twin ? `There is already a group called ${twin.name}.` : null;
}
