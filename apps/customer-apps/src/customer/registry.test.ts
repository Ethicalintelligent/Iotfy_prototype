// The real product folders: each is found, and every menu item of every product has a screen.
import { describe, expect, it } from 'vitest';
import { GENERIC_SPEC, resolveSpec } from '@iotify/app-kit';
import { registry, specFor } from './registry';

const BUILT_IN = new Set(['dash', 'map', 'floor', 'alerts', 'reports', 'rules']);

describe('product registry', () => {
  it('finds the reference products', () => {
    expect(registry.ids().sort()).toEqual(['N004', 'N009', 'N014', 'N033', 'N051']);
  });

  it.each(['N004', 'N009', 'N014', 'N033', 'N051'])('%s: every menu item has a screen', (id) => {
    const spec = resolveSpec(registry.get(id)!);
    const keys = spec.menu.flatMap(([, items]) => items.map(([k]) => k));
    expect(new Set(keys).size).toBe(keys.length); // no key twice
    for (const k of keys)
      expect(BUILT_IN.has(k) || !!spec.tables?.[k] || !!spec.screens?.[k], `${id}: ${k}`).toBe(
        true,
      );
  });

  it('the AIS 140 edition has the base menu plus Panic & ERSS and Certificates', () => {
    const base = specFor('N004');
    const ais = specFor('N009');
    const ops = ais.menu.find(([h]) => h === 'Operations')![1].map(([k]) => k);
    expect(ops).toEqual(['trips', 'geofences', 'drivers', 'commands', 'panic', 'certs']);
    expect(ais.screens?.certs?.title).toBe('Certificates');
    expect(base.menu.flatMap(([, i]) => i).some(([k]) => k === 'panic')).toBe(false);
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
    expect(s.menu.find(([h]) => h === 'Safety')![1].map(([k]) => k)).toEqual([
      'workers',
      'ppe',
      'zones',
      'gas',
      'permits',
    ]);
    expect(s.tables?.ppe?.title).toBe('PPE checks'); // the package's own, not video's
    expect(s.chart[0]).toBe('Workers on site per day');
  });

  it('an edition without its own folder uses its base; anything else the generic spec', () => {
    const tree = { isEdition: (id: string) => id === 'NX', baseOf: () => 'N004' };
    expect(specFor('NX', tree).menu).toEqual(specFor('N004').menu);
    expect(specFor('N999', tree)).toBe(GENERIC_SPEC);
  });
});
