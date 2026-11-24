import { describe, expect, it } from 'vitest';
import { canMoveUnder, descendants, nameProblem, treeOrder, visibleGroups } from './tree';

const G = [
  { id: 'g1', name: 'Riyadh', parent_id: null },
  { id: 'g2', name: 'Jeddah', parent_id: null },
  { id: 'g3', name: 'Riyadh north', parent_id: 'g1' },
  { id: 'g4', name: 'Depot 2', parent_id: 'g3' },
  { id: 'g5', name: 'Airport', parent_id: 'g1' },
];

describe('groups tree', () => {
  it('finds every sub-group', () => {
    expect([...descendants(G, 'g1')].sort()).toEqual(['g3', 'g4', 'g5']);
    expect(descendants(G, 'g2').size).toBe(0);
  });

  it('lists parents before their sub-groups, by name', () => {
    expect(treeOrder(G).map((x) => `${x.depth}:${x.group.name}`)).toEqual([
      '0:Jeddah',
      '0:Riyadh',
      '1:Airport',
      '1:Riyadh north',
      '2:Depot 2',
    ]);
  });

  it('survives a loop in the data', () => {
    const loop = [
      { id: 'a', name: 'A', parent_id: 'b' },
      { id: 'b', name: 'B', parent_id: 'a' },
    ];
    expect(treeOrder(loop)).toHaveLength(2);
  });

  it('never moves a group under itself or its sub-groups', () => {
    expect(canMoveUnder(G, 'g1', 'g1')).toBe(false);
    expect(canMoveUnder(G, 'g1', 'g4')).toBe(false);
    expect(canMoveUnder(G, 'g3', 'g2')).toBe(true);
    expect(canMoveUnder(G, 'g3', null)).toBe(true);
  });

  it('shows a limited user their group and its sub-groups', () => {
    expect(visibleGroups(G, 'Riyadh north').map((g) => g.id)).toEqual(['g3', 'g4']);
    expect(visibleGroups(G, null)).toHaveLength(5);
    expect(visibleGroups(G, 'Nowhere')).toHaveLength(0);
  });

  it('needs a name no other group has', () => {
    expect(nameProblem(G, '  ', null)).toBe('Enter a name.');
    expect(nameProblem(G, 'jeddah', null)).toBe('There is already a group called Jeddah.');
    expect(nameProblem(G, 'Jeddah', 'g2')).toBeNull();
    expect(nameProblem(G, 'Dammam', null)).toBeNull();
  });
});
