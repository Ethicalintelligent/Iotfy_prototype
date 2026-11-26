// Unit tests on a small invented catalogue that covers cases the demo data doesn't
// (trial subscriptions, unset "required", discounts, alt groups, missing gateways…).
// Each case states the expected answer AND checks the legacy app agrees.
import { describe, expect, it } from 'vitest';
import { createRules } from '../src';
import { loadLegacy } from './legacy';
import { fromOldShape } from './old-shape';

const T = {
  nodes: [
    { id: 'G1', parent_id: null, type: 'Group', name: 'Tracking', sort: 1 },
    {
      id: 'P1',
      parent_id: 'G1',
      type: 'Product',
      name: 'Vehicle Tracking',
      kind: 'Base',
      status: 'Active',
      sort: 1,
    },
    {
      id: 'E1',
      parent_id: 'P1',
      type: 'Product',
      name: 'Vehicle Tracking India',
      kind: 'Edition',
      status: 'Active',
      sort: 2,
      markets: 'India',
      requires_certification: 'AIS 140',
    },
    {
      id: 'A1',
      parent_id: 'P1',
      type: 'Product',
      name: 'Fuel Monitoring',
      kind: 'Add-on',
      status: 'Active',
      sort: 3,
    },
    {
      id: 'P2',
      parent_id: 'G1',
      type: 'Product',
      name: 'Driver App',
      kind: 'Base',
      status: 'Active',
      sort: 2,
    },
    {
      id: 'P3',
      parent_id: 'G1',
      type: 'Product',
      name: 'Indoor People',
      kind: 'Base',
      status: 'Active',
      sort: 3,
    },
    {
      id: 'K1',
      parent_id: 'G1',
      type: 'Product',
      name: 'Site Safety',
      kind: 'Package',
      status: 'Active',
      sort: 4,
    },
  ],
  bundle_rules: [
    { id: 'B1', from_product: 'P1', type: 'Includes', to_product: 'P2' },
    { id: 'B2', from_product: 'K1', type: 'Includes', to_product: 'P1' },
    { id: 'B3', from_product: 'K1', type: 'Optional', to_product: 'P3' },
    { id: 'B4', from_product: 'P3', type: 'Needs', to_product: 'P2' },
  ],
  features: [
    { id: 'F1', name: 'Live map', is_command: false, type: 'Monitor' },
    { id: 'F2', name: 'Fuel level', is_command: false, type: 'Monitor' },
    { id: 'F3', name: 'Immobilise', is_command: true, type: 'Command' },
    { id: 'F4', name: 'Zone presence', is_command: false, type: 'Monitor' },
    { id: 'F5', name: 'Panic button', is_command: false, type: 'Safety' },
  ],
  product_features: [
    { id: 'PF1', product_id: 'P1', feature_id: 'F1', availability: 'Standard' },
    { id: 'PF2', product_id: 'A1', feature_id: 'F2', availability: 'Standard' },
    { id: 'PF3', product_id: 'P1', feature_id: 'F3', availability: 'Optional' },
    { id: 'PF4', product_id: 'P3', feature_id: 'F4', availability: 'Standard' },
    { id: 'PF5', product_id: 'E1', feature_id: 'F5', availability: 'Standard' },
  ],
  data_points: [
    { id: 'D1', name: 'GPS position' },
    { id: 'D2', name: 'Fuel level' },
    { id: 'D3', name: 'Tank level' },
    { id: 'D4', name: 'Relay output' },
    { id: 'D5', name: 'Zone location' },
    { id: 'D6', name: 'Panic input' },
  ],
  feature_data_points: [
    { id: 'FD1', feature_id: 'F1', data_point_id: 'D1', required: true },
    { id: 'FD2', feature_id: 'F2', data_point_id: 'D2', required: null, alt_group: 'fuel' }, // unset = required
    { id: 'FD3', feature_id: 'F2', data_point_id: 'D3', required: true, alt_group: 'fuel' },
    { id: 'FD4', feature_id: 'F3', data_point_id: 'D4', required: true },
    { id: 'FD5', feature_id: 'F4', data_point_id: 'D5', required: true },
    { id: 'FD6', feature_id: 'F1', data_point_id: 'D6', required: false },
    { id: 'FD7', feature_id: 'F5', data_point_id: 'D6', required: true },
  ],
  interfaces: [{ id: 'I1', name: 'RS485' }],
  device_models: [
    {
      id: 'M1',
      maker: 'Acme',
      model: 'T1',
      status: 'Active',
      own_hardware: true,
      placement: 'On asset',
      certifications: 'AIS 140',
    },
    {
      id: 'M2',
      maker: 'Acme',
      model: 'T2',
      status: 'Active',
      own_hardware: false,
      placement: 'On asset',
    },
    { id: 'M3', maker: 'Acme', model: 'Tag', status: 'Active', placement: 'On asset' },
    {
      id: 'GW',
      maker: 'Acme',
      model: 'Gateway',
      status: 'Active',
      placement: 'Site infrastructure',
    },
  ],
  device_interfaces: [{ id: 'DI1', device_model_id: 'M1', interface_id: 'I1', count: 1 }],
  device_data_points: [
    { id: 'DD1', device_model_id: 'M1', data_point_id: 'D1' },
    { id: 'DD2', device_model_id: 'M1', data_point_id: 'D4' },
    { id: 'DD3', device_model_id: 'M2', data_point_id: 'D1' },
    { id: 'DD4', device_model_id: 'M1', data_point_id: 'D6' },
    { id: 'DD5', device_model_id: 'M3', data_point_id: 'D5' },
    { id: 'DD6', device_model_id: 'GW', data_point_id: 'D5' },
  ],
  sensor_models: [{ id: 'S1', maker: 'Acme', model: 'Fuel probe' }],
  sensor_interfaces: [{ id: 'SI1', sensor_model_id: 'S1', interface_id: 'I1', protocol: 'Modbus' }],
  sensor_data_points: [{ id: 'SD1', sensor_model_id: 'S1', data_point_id: 'D2' }],
  product_devices: [{ id: 'PD1', product_id: 'P1', device_model_id: 'M2', priority: 1 }],
  asset_types: [
    { id: 'AT1', name: 'Truck' },
    { id: 'AT2', name: 'Worker' },
  ],
  product_asset_types: [
    { id: 'PA1', product_id: 'P1', asset_type_id: 'AT1' },
    { id: 'PA2', product_id: 'P3', asset_type_id: 'AT2' },
  ],
  roles: [
    { id: 'R1', name: 'Fleet Manager', permissions: 'view' },
    { id: 'R2', name: 'Fleet Supervisor', permissions: 'view, Commands' },
    { id: 'R3', name: 'Viewer', permissions: '' },
    { id: 'R4', name: 'Custom' },
  ],
  role_features: [
    { id: 'RF1', role_id: 'R4', feature_id: 'F1', access: 'View' },
    { id: 'RF2', role_id: 'R4', feature_id: 'F3', access: 'View' },
  ],
  companies: [
    { id: 'C1', name: 'Demo Haulage', country: 'Saudi Arabia', dealer_id: 'DL1' },
    { id: 'C2', name: 'Demo Builders', country: 'India', dealer_id: 'DL1' },
  ],
  dealers: [{ id: 'DL1', name: 'Demo Dealer' }],
  sites: [{ id: 'SITE1', company_id: 'C2', name: 'Yard' }],
  zones: [
    { id: 'Z1', site_id: 'SITE1', parent_zone_id: null, name: 'Block A' },
    { id: 'Z2', site_id: 'SITE1', parent_zone_id: 'Z1', name: 'Floor 1' },
  ],
  assets: [
    { id: 'AS1', company_id: 'C1', asset_type_id: 'AT1', name: 'Truck 1' },
    { id: 'AS2', company_id: 'C2', asset_type_id: 'AT2', name: 'Worker 1', site_id: 'SITE1' },
    { id: 'AS3', company_id: 'C2', asset_type_id: 'AT2', name: 'Worker 2', site_id: null },
  ],
  device_units: [
    { id: 'U1', device_model_id: 'M1', asset_id: 'AS1', status: 'Installed' },
    { id: 'U2', device_model_id: 'M3', asset_id: 'AS2', status: 'Installed' },
    { id: 'U3', device_model_id: 'M3', asset_id: 'AS3', status: 'Installed' },
    { id: 'U4', device_model_id: 'GW', zone_id: 'Z2', status: 'Installed' },
  ],
  sensor_units: [{ id: 'SU1', sensor_model_id: 'S1', device_unit_id: 'U1' }],
  subscriptions: [
    {
      id: 'S1',
      buyer_id: 'C1',
      seller_id: 'DL1',
      product_id: 'P1',
      asset_id: 'AS1',
      status: 'Trial',
    },
    {
      id: 'S2',
      buyer_id: 'C1',
      seller_id: 'DL1',
      product_id: 'A1',
      asset_id: 'AS1',
      status: 'Ended',
    },
    {
      id: 'S3',
      buyer_id: 'C2',
      seller_id: 'DL1',
      product_id: 'P3',
      package_id: 'K1',
      asset_id: 'AS2',
      status: 'Active',
    },
    { id: 'S4', buyer_id: 'DL1', seller_id: 'PLATFORM', product_id: 'P1', status: 'Active' },
  ],
  price_plans: [
    { id: 'PP1', product_id: 'P1', sold_to: 'Company', base_price: 100, currency: 'SAR' },
    { id: 'PP2', product_id: 'P1', sold_to: 'Dealer', base_price: null, currency: null },
  ],
  price_rules: [
    { id: 'PR1', plan_id: 'PP1', rule_type: 'Tier', condition: 'Pro', effect: 'Add', value: 20 },
    {
      id: 'PR2',
      plan_id: 'PP1',
      rule_type: 'Quantity band',
      condition: '10-49',
      effect: 'Discount %',
      value: 10,
    },
    {
      id: 'PR3',
      plan_id: 'PP1',
      rule_type: 'Quantity band',
      condition: '50+',
      effect: 'Discount %',
      value: 20,
    },
    {
      id: 'PR4',
      plan_id: 'PP1',
      rule_type: 'Asset type',
      condition: 'truck',
      effect: 'Add',
      value: 5,
    },
    {
      id: 'PR5',
      plan_id: 'PP1',
      rule_type: 'Package discount',
      condition: '2-2',
      effect: 'Discount %',
      value: 15,
    },
    {
      id: 'PR6',
      plan_id: 'PP1',
      rule_type: 'Item count band',
      condition: '1-5',
      effect: 'Replace',
      value: 80,
    },
    {
      id: 'PR7',
      plan_id: 'PP1',
      rule_type: 'Feature add-on',
      condition: 'Fuel',
      effect: 'Add',
      value: 12.5,
    },
  ],
  hardware_prices: [],
  quotes: [{ id: 'Q1' }],
  quote_lines: [
    { id: 'QL1', quote_id: 'Q1', kind: 'Product', item_id: 'P1', qty: 3 },
    { id: 'QL2', quote_id: 'Q1', kind: 'Product', item_id: 'A1', qty: 2, item_count: 4 },
    { id: 'QL3', quote_id: 'Q1', kind: 'Product', item_id: 'K1', qty: 1 },
  ],
};
const R = createRules(fromOldShape(T));
const L = loadLegacy(T);
const sorted = (s: Iterable<string>) => [...s].sort();

describe('bundles', () => {
  it('an edition inherits its base; includes are followed all the way', () => {
    expect(sorted(R.includesOf('E1'))).toEqual(['P2']);
    expect(sorted(R.grantedBy(['K1']))).toEqual(['K1', 'P1', 'P2']);
    expect(sorted(R.grantedBy(['K1']))).toEqual(sorted(L.grantedBy(['K1'])));
  });
  it('an add-on needs its parent; an edition does not', () => {
    expect(sorted(R.needsOf('A1'))).toEqual(['P1']);
    expect(sorted(R.needsOf('E1'))).toEqual([]);
    expect(sorted(R.withNeeds(['P3']))).toEqual(['P2', 'P3']);
    expect(sorted(R.withNeeds(['A1']))).toEqual(sorted(L.withNeeds(['A1'])));
  });
  it('an edition choice replaces the included base', () => {
    const bundle_rules = [
      T.bundle_rules[0]!,
      { id: 'X', from_product: 'K1', type: 'Includes', to_product: 'P1' },
    ];
    const rules = createRules(fromOldShape({ ...T, bundle_rules }));
    // K1 includes P1; choosing edition E1 gives E1 instead, and E1 still brings its base's includes (P2).
    expect(sorted(rules.grantedBy(['K1'], { K1: 'E1' }))).toEqual(['E1', 'K1', 'P2']);
    expect(sorted(loadLegacy({ ...T, bundle_rules }).grantedBy(['K1'], { K1: 'E1' }))).toEqual([
      'E1',
      'K1',
      'P2',
    ]);
    expect(rules.includeChoices('K1', 'India')).toEqual([{ target: 'P1', editions: ['E1'] }]);
    expect(rules.includeChoices('K1', 'Saudi Arabia')).toEqual([]);
  });
  it('covers adds the base of an edition', () => {
    expect(sorted(R.covers(['E1']))).toEqual(['E1', 'P1', 'P2']);
  });
});

describe('features and data points', () => {
  it('an unset "required" counts as required; alt groups need only one', () => {
    expect(R.missingText(R.missingDataPoints('F2', () => false))).toEqual([
      'Fuel level or Tank level',
    ]);
    expect(R.missingDataPoints('F2', (dp) => dp === 'D3')).toEqual([]);
    expect(R.missingText(R.missingDataPoints('F2', () => false))).toEqual(
      L.missingDPs('F2', () => false),
    );
  });
  it('optional data points are never missing', () => {
    expect(R.missingDataPoints('F1', (dp) => dp === 'D1')).toEqual([]);
  });
  it('a sensor on a free interface supplies a data point', () => {
    expect(R.dataPointOnModel('M1', 'D2')).toEqual({
      ok: true,
      how: 'sensor',
      infrastructure: [],
      options: [{ sensorModelId: 'S1', interfaceId: 'I1', protocol: 'Modbus' }],
    });
    expect(R.dataPointOnModel('M2', 'D2').ok).toBe(false);
    expect(R.dataPointOnModel('M3', 'D5')).toMatchObject({ ok: true, how: 'built-in' });
  });
  it('an edition gets its own and its base features', () => {
    expect(R.featuresOf('E1').map((f) => [f.featureId, f.source, !!f.fromBase])).toEqual([
      ['F5', 'E1', false],
      ['F1', 'P1', true],
      ['F3', 'P1', true],
    ]);
  });
});

describe('Paid / Possible / Allowed', () => {
  it('trial subscriptions count; ended ones do not', () => {
    const rows = R.featureCheck('AS1', 'R1').rows;
    const row = (fid: string) => rows.find((r) => r.featureId === fid)!;
    expect(row('F1')).toMatchObject({ paid: true, possible: true, allowed: true, access: 'View' });
    expect(row('F3')).toMatchObject({
      paid: true,
      possible: true,
      isCommand: true,
      allowed: false,
      access: 'Hidden',
    });
    expect(rows.find((r) => r.featureId === 'F2')).toBeUndefined(); // add-on subscription ended
  });
  it('commands need the Commands permission; role_features rows override permissions', () => {
    expect(R.access('R2', 'F3')).toBe('Use');
    expect(R.access('R3', 'F1')).toBe('Hidden');
    expect(R.access('R4', 'F3')).toBe('View');
    expect(R.access('R4', 'F2')).toBe('Hidden');
    expect(R.access(null, 'F3')).toBe('Use');
    for (const r of ['R1', 'R2', 'R3', 'R4'])
      for (const f of ['F1', 'F2', 'F3']) expect(R.access(r, f)).toBe(L.access(r, f));
  });
  it("zone location needs installed gateways at the asset's site", () => {
    expect(R.installedOn('AS2')).toMatchObject({ noGateways: false });
    expect([...R.installedOn('AS2').dataPoints]).toEqual(['D5']);
    expect(R.installedOn('AS3')).toMatchObject({ noGateways: true });
    const f4 = (asset: string) => R.featureCheck(asset).rows.find((r) => r.featureId === 'F4');
    expect(f4('AS2')).toMatchObject({ paid: true, possible: true }); // package K1 pays; gateway at the site
    expect(f4('AS3')).toMatchObject({
      paid: false,
      possible: false,
      missingText: ['Zone location'],
    }); // no site
    // K1 also includes P1, so the worker's package pays for Live map and Immobilise too.
    expect(
      R.featureCheck('AS2')
        .rows.filter((r) => r.paid)
        .map((r) => r.featureId),
    ).toEqual(['F3', 'F1', 'F4']);
  });
  it('every asset and role matches the legacy app', () => {
    for (const a of ['AS1', 'AS2', 'AS3']) {
      for (const role of ['', 'R1', 'R2', 'R3', 'R4']) {
        const mine = R.featureCheck(a, role || null);
        const legacy = L.featureCheck(a, role);
        expect(
          mine.rows.map((r) => [r.featureId, r.paid, r.possible, r.allowed, r.missingText]),
        ).toEqual(
          legacy.rows.map((r: Record<string, unknown>) => [
            r.fid,
            r.paid,
            r.possible,
            r.allowed,
            r.miss,
          ]),
        );
        expect(mine.upsell).toEqual(legacy.upsell);
      }
    }
  });
});

describe('apps', () => {
  it('app access: bought directly or through a package', () => {
    expect(sorted(R.companyApps('C1'))).toEqual(['P1']); // trial counts; included P2 is not its own app
    expect(sorted(R.companyApps('C2'))).toEqual(['K1', 'P1', 'P2', 'P3']); // through package K1
    expect(sorted(R.companyApps('C2'))).toEqual(sorted(L.companyApps('C2')));
    expect(R.myApps('C1').map((n) => n.id)).toEqual(['P1']);
  });
  it('dealer products come from platform subscriptions', () => {
    expect(sorted(R.dealerProducts('DL1')!)).toEqual(['P1', 'P2']);
    expect(R.dealerProducts('')).toBeNull();
  });
  it('asset types: packages use members, editions their base, add-ons their parent', () => {
    expect(sorted(R.productAssetTypes('K1'))).toEqual(['AT1', 'AT2']);
    expect(sorted(R.productAssetTypes('E1'))).toEqual(['AT1']);
    expect(sorted(R.typesFor('A1'))).toEqual(['AT1']);
    expect(R.productFamily('P1')).toEqual(['P1', 'A1']);
    expect(R.productFamily('K1')).toEqual(['P1', 'P3', 'A1']);
  });
});

describe('pricing', () => {
  const both = (o: Parameters<typeof R.priceLine>[2], soldTo: 'Company' | 'Dealer' = 'Company') => {
    const mine = R.priceLine('P1', soldTo, o);
    const legacy = L.priceLine('P1', soldTo, o);
    expect(mine.unit).toBeCloseTo(legacy.unit, 9);
    expect(mine.applied).toEqual(legacy.applied);
    return mine;
  };
  it('applies rules in order: add, discount, replace', () => {
    expect(both({}).unit).toBe(100);
    expect(both({ tier: 'pro' }).applied).toEqual([
      'base 100',
      'Tier pro +20'.replace('pro', 'Pro'),
    ]);
    expect(both({ tier: 'Pro', qty: 10 }).unit).toBeCloseTo(108);
    expect(both({ qty: 50 }).unit).toBeCloseTo(80);
    expect(both({ assetType: 'AT1' }).unit).toBe(105); // asset type matched by name, any case
    expect(both({ extras: ['fuel'] }).unit).toBe(112.5);
    expect(both({ items: 3, tier: 'Pro' }).unit).toBe(80); // replace wins (comes later)
    expect(both({ items: 9 }).unit).toBe(100);
  });
  it('package discounts are not applied to a single line', () => {
    expect(both({ qty: 2, items: 0 }).applied).not.toContain('Package discount 2-2 −15%');
  });
  it('a plan without a base price or currency', () => {
    expect(both({}, 'Dealer')).toMatchObject({
      unit: 0,
      applied: ['base not set'],
      currency: 'SAR',
    });
    expect(R.priceLine('P2', 'Company')).toEqual({
      unit: 0,
      planId: null,
      applied: ['no price plan'],
      currency: 'SAR',
    });
  });
  it('quantity bands', () => {
    expect(R.inBand('10-49', 10)).toBe(true);
    expect(R.inBand('10-49', 50)).toBe(false);
    expect(R.inBand('50+', 5000)).toBe(true);
    expect(R.inBand('ten', 10)).toBe(false);
    expect(R.usesItemBands('P1')).toBe(true);
  });
});

describe('hardware suggestions', () => {
  it('prefers the default model, then adds sensors; certification rules out models', () => {
    // P1 + add-on A1: default model M2 can't do fuel or relay, so M1 + fuel probe wins.
    const s = R.suggestHardware(['P1', 'A1'])!;
    expect(s.device).toBe('M1');
    expect(s.sensors).toEqual([{ sensorModelId: 'S1', interfaceId: 'I1', protocol: 'Modbus' }]);
    expect(R.suggestHardware(['P1'])!.device).toBe('M2');
    expect(R.missingCertifications('M2', ['E1'])).toEqual(['AIS 140']);
    expect(R.suggestHardware(['E1'])!.device).toBe('M1');
    expect(R.suggestHardware(['P3'])).toMatchObject({ device: 'M3', gateways: ['GW'] });
    for (const p of [['P1'], ['P1', 'A1'], ['E1'], ['P3'], ['K1']]) {
      const legacy = L.suggestHardware(p);
      expect(R.suggestHardware(p)?.device ?? null).toBe(legacy?.device ?? null);
    }
  });
  it('one hardware group per base product on a quote; packages bring none', () => {
    expect(R.quoteHardwareGroups('Q1').map((g) => [g.root, g.qty, g.suggestion?.device])).toEqual([
      ['P1', 4, 'M1'],
    ]);
    expect(R.quoteHardwareGroups('Q1').map((g) => [g.root, g.qty, g.suggestion?.device])).toEqual(
      L.quoteHwGroups('Q1').map((g: { root: string; qty: number; sug: { device: string } }) => [
        g.root,
        g.qty,
        g.sug?.device,
      ]),
    );
  });
});
