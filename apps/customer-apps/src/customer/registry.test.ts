// The real product folders: each is found, and every menu item of every product has a screen.
import { describe, expect, it } from 'vitest';
import { GENERIC_SPEC, resolveSpec } from '@iotify/app-kit';
import { SCENE_NAMES } from '@iotify/illustrations';
import { registry, sceneFor, specFor } from './registry';

const BUILT_IN = new Set(['dash', 'map', 'floor', 'alerts', 'reports', 'rules']);
/** Keys the product app adds itself (Devices & features, Account section). */
const RESERVED = new Set(['live', 'assets', 'sites', 'users', 'subscription']);
const ALL = [
  'N003',
  'N004',
  'N008',
  'N009',
  'N010',
  'N011',
  'N013',
  'N014',
  'N016',
  'N017',
  'N019',
  'N020',
  'N021',
  'N026',
  'N027',
  'N028',
  'N030',
  'N031',
  'N033',
  'N047',
  'N048',
  'N051',
  'N052',
];

describe('product registry', () => {
  it('has one folder per app product in docs/PRODUCT_FOLDERS.md', () => {
    expect(registry.ids().sort()).toEqual(ALL);
  });

  it.each(ALL)('%s: every menu item has a screen, no key twice or reserved', (id) => {
    const spec = resolveSpec(registry.get(id)!);
    const keys = spec.menu.flatMap(([, items]) => items.map(([k]) => k));
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) {
      expect(RESERVED.has(k), `${id}: ${k} is reserved`).toBe(false);
      expect(BUILT_IN.has(k) || !!spec.tables?.[k] || !!spec.screens?.[k], `${id}: ${k}`).toBe(
        true,
      );
    }
  });

  it('GPS Vehicle Tracking has exactly the approved design menu, with its own screens', () => {
    // Approved GPS Vehicle Tracking design (Desktop/vs, IT-0012), plus Ticket Management (IT-0030).
    const s = specFor('N004');
    expect(s.menu.flatMap(([, i]) => i.map(([, label]) => label))).toEqual([
      'Dashboard',
      'Grid View',
      'Map View',
      'Tracking',
      'Centralized Tracking',
      'Alerts',
      'Manage',
      'Reports',
      'Groups',
      'Ticket Management',
    ]);
    expect(s.plainMenu).toBe(true);
    expect(s.ownScreensFirst).toBe(true);
    expect(s.screens?.dash?.title).toBe('Dashboard');
  });

  it('the AIS 140 edition has the base menu plus Panic & ERSS and Certificates', () => {
    const ais = specFor('N009');
    const ops = ais.menu.find(([h]) => h === 'Operations')![1].map(([k]) => k);
    expect(ops).toEqual(['panic', 'certs']);
    expect(ais.menu.find(([h]) => h === 'Monitor')![1]).toEqual(
      specFor('N004').menu.find(([h]) => h === 'Monitor')![1],
    );
    // An edition inherits the base's own screens and plain menu.
    expect(ais.plainMenu).toBe(true);
    expect(ais.ownScreensFirst).toBe(true);
    expect(ais.screens?.certs?.title).toBe('Certificates');
    expect(
      specFor('N004')
        .menu.flatMap(([, i]) => i)
        .some(([k]) => k === 'panic'),
    ).toBe(false);
  });

  it('GPS ATM Tracking extends GPS Asset Tracking with ATM screens and an ATM map', () => {
    const s = specFor('N020');
    expect(s.menu.map(([h]) => h)).toEqual(['Monitor', 'Assets', 'ATMs', 'Reports']);
    expect(s.menu[0]![1]).toContainEqual(['map', 'ATM map']);
    expect(s.menu.find(([h]) => h === 'ATMs')![1].map(([k]) => k)).toEqual([
      'atm_sites',
      'movements',
    ]);
  });

  it('ConstructSafe composes people, vehicle and video and adds Safety with its own dashboard', () => {
    const s = specFor('N051');
    expect(s.menu.map(([h]) => h)).toEqual([
      'Monitor',
      'People',
      'Manage',
      'Administration',
      'Analytics',
      'Safety',
      'Reports',
    ]);
    expect(s.tables?.ppe?.title).toBe('PPE checks');
    expect(s.chart[0]).toBe('Workers on site per day');
    // A package keeps the built-in dashboard and the full menu: it doesn't take a member's
    // own Dashboard or plain menu.
    expect(s.ownScreensFirst).toBeFalsy();
    expect(s.plainMenu).toBeFalsy();
  });

  it('HealthSafe composes people and indoor assets and adds Care with a ward view', () => {
    const s = specFor('N052');
    expect(s.menu.map(([h]) => h)).toEqual(['Monitor', 'People', 'Equipment', 'Care', 'Reports']);
    expect(s.menu[0]![1]).toContainEqual(['floor', 'Ward view']);
    expect(s.chart[0]).toBe('Nurse calls per day');
  });

  it('SK MobiCop reuses the school bus screens', () => {
    expect(specFor('N017').menu).toEqual(specFor('N011').menu);
  });

  it('an edition without its own folder uses its base; anything else the generic spec', () => {
    const tree = { isEdition: (id: string) => id === 'NX', baseOf: () => 'N004' };
    expect(specFor('NX', tree).menu).toEqual(specFor('N004').menu);
    expect(specFor('N999', tree)).toBe(GENERIC_SPEC);
  });
});

describe('sign-in scenes', () => {
  it.each(ALL)('%s names a scene that exists', (id) => {
    expect(SCENE_NAMES).toContain(sceneFor(id));
  });
});

describe('screens per product (legacy parity: 11–17 each, packages more)', () => {
  // The product app adds Devices & features and the four Account screens (Assets, Sites & zones,
  // Users, My subscription) to the spec's own menu, unless the spec asks for a plain menu.
  const count = (id: string) => {
    const s = resolveSpec(registry.get(id)!);
    return s.menu.reduce((n, [, items]) => n + items.length, 0) + (s.plainMenu ? 0 : 5);
  };
  // GPS Vehicle Tracking (N004) and its AIS 140 edition (N009) follow the approved design: 10 menu
  // items with Ticket Management (12 for the edition), with 8 modules inside Manage.
  const DESIGN_MENU = ['N004', 'N009'];

  it.each(DESIGN_MENU)('%s has 10–12 menu items (approved design)', (id) => {
    expect(count(id)).toBeGreaterThanOrEqual(10);
    expect(count(id)).toBeLessThanOrEqual(12);
  });

  it.each(ALL.filter((id) => ![...DESIGN_MENU, 'N051', 'N052'].includes(id)))(
    '%s has 11–17 screens',
    (id) => {
      expect(count(id)).toBeGreaterThanOrEqual(11);
      // 17: the AIS 140 edition (N009) gained Maintenance from its base (IT-0003). Core owner to confirm.
      expect(count(id)).toBeLessThanOrEqual(17);
    },
  );

  it('packages combine their members, so they have more', () => {
    expect(count('N051')).toBeGreaterThan(16);
    expect(count('N052')).toBeGreaterThan(16);
  });
});
