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

  it('the AIS 140 edition has the base menu plus Panic & ERSS and Certificates', () => {
    const ais = specFor('N009');
    const ops = ais.menu.find(([h]) => h === 'Operations')![1].map(([k]) => k);
    expect(ops).toEqual(['trips', 'geofences', 'drivers', 'commands', 'panic', 'certs']);
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
      'Operations',
      'Analytics',
      'Safety',
      'Reports',
    ]);
    expect(s.tables?.ppe?.title).toBe('PPE checks');
    expect(s.chart[0]).toBe('Workers on site per day');
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
