import { describe, expect, it } from 'vitest';
import { createRegistry, defineProduct, resolveScene, resolveSpec } from './manifest';
import type { ProductSpec } from './spec';

const spec = (name: string, menu: ProductSpec['menu']): ProductSpec => ({
  menu,
  kpis: () => [],
  chart: [name, 'x', 1],
  alerts: [`!${name} alert`],
  reports: [[`${name} report`, '']],
  rules: [[`${name} rule`, '', '']],
});

const vehicle = defineProduct({
  id: 'N004',
  scene: 'vehicle',
  spec: spec('Vehicle', [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['map', 'Live map'],
      ],
    ],
    ['Operations', [['trips', 'Trips']]],
  ]),
});
const people = defineProduct({
  id: 'N014',
  scene: 'people',
  spec: spec('People', [
    [
      'Monitor',
      [
        ['dash', 'Dashboard'],
        ['floor', 'Floor view'],
      ],
    ],
  ]),
});

describe('manifests', () => {
  it('an edition extends its base and adds its own screens', () => {
    const ais = defineProduct({
      id: 'N009',
      extends: vehicle,
      add: {
        menu: [
          ['Operations', [['panic', 'Panic & ERSS']]],
          ['Compliance', [['certs', 'Certificates']]],
        ],
      },
    });
    const s = resolveSpec(ais);
    expect(s.menu).toEqual([
      [
        'Monitor',
        [
          ['dash', 'Dashboard'],
          ['map', 'Live map'],
        ],
      ],
      [
        'Operations',
        [
          ['trips', 'Trips'],
          ['panic', 'Panic & ERSS'],
        ],
      ],
      ['Compliance', [['certs', 'Certificates']]],
    ]);
    expect(s.chart[0]).toBe('Vehicle');
    expect(resolveScene(ais)).toBe('vehicle');
    // the base is unchanged
    expect(resolveSpec(vehicle).menu[1]![1]).toEqual([['trips', 'Trips']]);
  });

  it('a package composes its members (menus merged once) and adds its own', () => {
    const pkg = defineProduct({
      id: 'N051',
      members: [people, vehicle],
      add: { menu: [['Safety', [['ppe', 'PPE']]]], reports: [['Safety summary', '']] },
    });
    const s = resolveSpec(pkg);
    expect(s.menu).toEqual([
      [
        'Monitor',
        [
          ['dash', 'Dashboard'],
          ['floor', 'Floor view'],
          ['map', 'Live map'],
        ],
      ],
      ['Operations', [['trips', 'Trips']]],
      ['Safety', [['ppe', 'PPE']]],
    ]);
    expect(s.reports.map((r) => r[0])).toEqual([
      'People report',
      'Vehicle report',
      'Safety summary',
    ]);
    expect(s.alerts).toEqual(['!People alert', '!Vehicle alert']);
    expect(resolveScene(pkg)).toBe('people');
  });

  it('a manifest needs a spec, extends or members', () => {
    expect(() => defineProduct({ id: 'X' })).toThrow(/spec, extends or members/);
  });

  it('the registry finds manifests and refuses two folders for one product', () => {
    const r = createRegistry({
      '/products/a/manifest.ts': { manifest: vehicle },
      '/products/b/manifest.ts': { manifest: people },
    });
    expect(r.ids().sort()).toEqual(['N004', 'N014']);
    expect(r.get('N004')).toBe(vehicle);
    expect(r.get('N999')).toBeUndefined();
    expect(() =>
      createRegistry({
        '/a/manifest.ts': { manifest: vehicle },
        '/b/manifest.ts': { manifest: vehicle },
      }),
    ).toThrow(/two folders/);
    expect(() => createRegistry({ '/a/manifest.ts': {} })).toThrow(/must export/);
  });
});
