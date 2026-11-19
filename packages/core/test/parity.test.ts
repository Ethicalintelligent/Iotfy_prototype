// Parity: the TypeScript rules give the same answers as the legacy app on the real demo data
// (test/fixtures/demo-core.json, a snapshot of Neon main). REFACTOR_PLAN Step 4 check.
import { beforeAll, describe, expect, it } from 'vitest';
import fixture from './fixtures/demo-core.json';
import { createRules, type CoreDataInput, type Rules } from '../src';
import { loadLegacy, type Legacy } from './legacy';

const data = fixture as unknown as CoreDataInput & Record<string, { id: string }[]>;
let R: Rules;
let L: Legacy;
beforeAll(() => {
  R = createRules(data);
  L = loadLegacy(fixture);
});

const sorted = (s: Iterable<string>) => [...s].sort();
const ids = (rows: { id?: string; ID?: string }[]) => rows.map((r) => r.id ?? r.ID);
const nodes = data.nodes!;
const productIds = nodes.filter((n) => n.type === 'Product').map((n) => n.id);
const markets = ['', ...new Set(data.companies!.map((c) => c.country).filter(Boolean) as string[])];

describe('demo data is what the parity list expects', () => {
  it('has the demo customers', () => {
    expect(data.companies!.length).toBe(14);
    expect(data.assets!.length).toBe(55);
    expect(data.device_units!.length).toBe(57);
    expect(data.subscriptions!.length).toBe(60);
  });
});

describe('product tree', () => {
  it('children, paths, editions, packages and roots match for every node', () => {
    for (const n of ['', ...nodes.map((x) => x.id)]) {
      expect(ids(R.children(n)), `children ${n}`).toEqual(ids(L.kids(n)));
      if (!n) continue;
      expect(ids(R.pathOf(n)), `pathOf ${n}`).toEqual(ids(L.pathOf(n)));
      expect(R.groupPath(n), `groupPath ${n}`).toBe(L.groupPath(n));
      expect(ids(R.descendants(n)), `descendants ${n}`).toEqual(ids(L.descendants(n)));
      expect(R.isEdition(n), `isEdition ${n}`).toBe(L.isEdition(n));
      expect(R.baseOf(n), `baseOf ${n}`).toBe(L.baseOf(n));
      expect(ids(R.editionsOf(n)), `editionsOf ${n}`).toEqual(ids(L.editionsOf(n)));
      expect(R.marketsOf(n), `marketsOf ${n}`).toEqual(L.marketsOf(n));
      expect(R.isPackage(n), `isPackage ${n}`).toBe(L.isPackage(n));
      expect(R.rootOf(n), `rootOf ${n}`).toBe(L.rootOf(n));
      expect(R.packageMembers(n), `packageMembers ${n}`).toEqual(L.packageMembers(n));
    }
    expect(ids(R.entryProducts())).toEqual(ids(L.entryProducts()));
  });
});

describe('bundle rules', () => {
  it('includes, needs, optional, granted, withNeeds and covers match for every product', () => {
    for (const p of productIds) {
      expect(sorted(R.includesOf(p)), `includesOf ${p}`).toEqual(sorted(L.includesOf(p)));
      expect(sorted(R.needsOf(p)), `needsOf ${p}`).toEqual(sorted(L.needsOf(p)));
      expect(R.optionalOf(p), `optionalOf ${p}`).toEqual(L.optionalOf(p));
      expect(sorted(R.grantedBy([p])), `grantedBy ${p}`).toEqual(sorted(L.grantedBy([p])));
      expect(sorted(R.withNeeds([p])), `withNeeds ${p}`).toEqual(sorted(L.withNeeds([p])));
      expect(sorted(R.covers([p])), `covers ${p}`).toEqual(sorted(L.covers([p])));
      for (const m of markets) {
        const legacy = L.includeChoices(p, m).map((x: { target: string; eds: string[] }) => ({
          target: x.target,
          editions: x.eds,
        }));
        expect(R.includeChoices(p, m), `includeChoices ${p} ${m}`).toEqual(legacy);
      }
    }
  });
  it('edition choices steer what an include grants', () => {
    for (const p of productIds) {
      for (const { target, editions } of R.includeChoices(p, '')) {
        for (const e of editions) {
          expect(
            sorted(R.grantedBy([p], { [p]: e })),
            `grantedBy ${p} choosing ${e} for ${target}`,
          ).toEqual(sorted(L.grantedBy([p], { [p]: e })));
        }
      }
    }
  });
});

describe('features and data points', () => {
  const asLegacy = (f: {
    featureId: string;
    availability: unknown;
    source: string;
    fromBase?: boolean;
  }) => ({
    fid: f.featureId,
    avail: f.availability ?? '',
    src: f.source,
    ...(f.fromBase ? { base: true } : {}),
  });
  it('featuresOf (own and inherited) matches for every product', () => {
    for (const p of productIds) {
      for (const inherited of [true, false]) {
        const legacy = L.featuresOf(p, inherited).map(
          ({ fid, avail, src, base }: Record<string, unknown>) => ({
            fid,
            avail,
            src,
            ...(base ? { base } : {}),
          }),
        );
        expect(R.featuresOf(p, inherited).map(asLegacy), `featuresOf ${p} ${inherited}`).toEqual(
          legacy,
        );
      }
    }
  });
  it('missing data points match for every feature', () => {
    const dps = data.data_points!.map((x) => x.id);
    const half = new Set(dps.filter((_, i) => i % 2 === 0));
    for (const f of data.features!) {
      for (const ok of [() => false, (dp: string) => half.has(dp), () => true]) {
        expect(R.missingText(R.missingDataPoints(f.id, ok)), `missingDataPoints ${f.id}`).toEqual(
          L.missingDPs(f.id, ok),
        );
      }
    }
  });
});

describe('hardware', () => {
  it('data point support matches for every device model and data point', () => {
    for (const m of data.device_models!) {
      expect(R.deviceInterfaces(m.id), `ifaces ${m.id}`).toEqual(L.devIfaces(m.id));
      expect(ids(R.infrastructureFor(m.id)), `infra ${m.id}`).toEqual(ids(L.infraFor(m.id)));
      for (const dp of data.data_points!) {
        const legacy = L.dpOnModel(m.id, dp.id);
        const mine = R.dataPointOnModel(m.id, dp.id);
        expect(mine.ok, `dpOnModel ${m.id} ${dp.id}`).toBe(legacy.ok);
        expect(
          mine.options.map((o) => ({
            sm: o.sensorModelId,
            iface: o.interfaceId,
            proto: o.protocol ?? '',
          })),
          `options ${m.id} ${dp.id}`,
        ).toEqual(legacy.opts);
      }
    }
  });
  it('model evaluation, certifications and hardware suggestions match for every product', () => {
    for (const p of productIds) {
      const feats = R.featuresOf(p);
      const legacyFeats = L.featuresOf(p);
      for (const m of data.device_models!) {
        const mine = R.evalModel(m.id, feats);
        const legacy = L.evalModel(m.id, legacyFeats);
        expect(mine.all, `evalModel ${m.id} for ${p}`).toBe(legacy.all);
        expect(
          mine.results.map((r) => r.ok),
          `evalModel results ${m.id} for ${p}`,
        ).toEqual(legacy.res.map((r: { ok: boolean }) => r.ok));
        expect(R.missingCertifications(m.id, [p]), `certMiss ${m.id} ${p}`).toEqual(
          L.certMiss(m.id, [p]),
        );
      }
      const legacy = L.suggestHardware([p]);
      const mine = R.suggestHardware([p]);
      if (!legacy) expect(mine, `suggestHardware ${p}`).toBeNull();
      else {
        expect(mine?.device ?? null, `suggestHardware device ${p}`).toBe(legacy.device);
        expect(
          mine?.sensors.map((o) => ({
            sm: o.sensorModelId,
            iface: o.interfaceId,
            proto: o.protocol ?? '',
          })),
          `suggestHardware sensors ${p}`,
        ).toEqual(legacy.sensors);
        expect(mine?.gateways, `suggestHardware gateways ${p}`).toEqual(legacy.gateways ?? []);
      }
    }
  });
});

describe('sites and assets', () => {
  it('zones, gateways and installed hardware match for every site and asset', () => {
    for (const s of new Set(data.zones!.map((z) => z.site_id ?? ''))) {
      expect(ids(R.siteZones(s)), `siteZones ${s}`).toEqual(ids(L.siteZones(s)));
      expect(ids(R.siteGateways(s)), `siteGateways ${s}`).toEqual(ids(L.siteGateways(s)));
    }
    for (const z of data.zones!) expect(R.zonePath(z.id)).toBe(L.zonePath(z.id));
    for (const a of data.assets!) {
      const mine = R.installedOn(a.id);
      const legacy = L.installedOn(a.id);
      expect(mine.unit?.id, `unit ${a.id}`).toBe(legacy.unit?.ID);
      expect(ids(mine.sensors), `sensors ${a.id}`).toEqual(ids(legacy.sensors));
      expect(sorted(mine.dataPoints), `data points ${a.id}`).toEqual(sorted(legacy.dps));
      expect(mine.noGateways, `noGateways ${a.id}`).toBe(legacy.noGateways);
    }
  });
});

describe('Paid / Possible / Allowed', () => {
  it('access matches for every role and feature', () => {
    for (const r of [...data.roles!.map((x) => x.id), '']) {
      for (const f of data.features!)
        expect(R.access(r, f.id), `access ${r} ${f.id}`).toBe(L.access(r, f.id));
    }
  });
  it('featureCheck matches for every demo asset, with no role and with every role', () => {
    let compared = 0;
    for (const a of data.assets!) {
      for (const role of ['', ...data.roles!.map((x) => x.id)]) {
        const mine = R.featureCheck(a.id, role || null);
        const legacy = L.featureCheck(a.id, role);
        const legacyRows = legacy.rows.map((r: Record<string, unknown>) => ({
          fid: r.fid,
          name: r.name,
          cmd: r.cmd,
          type: r.type,
          product: r.product,
          paid: r.paid,
          possible: r.possible,
          miss: r.miss,
          allowed: r.allowed,
          acc: r.acc,
        }));
        const myRows = mine.rows.map((r) => ({
          fid: r.featureId,
          name: r.name,
          cmd: r.isCommand,
          type: r.type ?? '',
          product: r.product,
          paid: r.paid,
          possible: r.possible,
          miss: r.missingText,
          allowed: r.allowed,
          acc: r.access,
        }));
        expect(myRows, `featureCheck ${a.id} role ${role || '(none)'}`).toEqual(legacyRows);
        expect(mine.upsell, `upsell ${a.id}`).toEqual(legacy.upsell);
        compared += myRows.length;
      }
    }
    expect(compared).toBeGreaterThan(1000);
  });
});

describe('companies and apps', () => {
  it('products and app access match for every demo company', () => {
    for (const c of data.companies!) {
      expect(sorted(R.companyProducts(c.id)), `companyProducts ${c.name}`).toEqual(
        sorted(L.companyProducts(c.id)),
      );
      expect(sorted(R.companyApps(c.id)), `companyApps ${c.name}`).toEqual(
        sorted(L.companyApps(c.id)),
      );
    }
    for (const dl of [...data.dealers!.map((x) => x.id), '']) {
      const legacy = L.dealerProducts(dl);
      const mine = R.dealerProducts(dl);
      expect(mine && sorted(mine), `dealerProducts ${dl}`).toEqual(legacy && sorted(legacy));
    }
  });
  it('app families and asset types match for every product', () => {
    for (const p of productIds) {
      L.setProduct(p);
      expect(R.productFamily(p), `productFamily ${p}`).toEqual(L.productFamily());
      expect(sorted(R.productAssetTypes(p)), `productAssetTypes ${p}`).toEqual(
        sorted(L.productAssetTypes()),
      );
      expect(sorted(R.typesFor(p)), `typesFor ${p}`).toEqual(sorted(L.typesFor(p)));
    }
    L.setProduct('');
  });
});

describe('pricing', () => {
  it('price lines match for every plan, hitting every rule', () => {
    const atName = (name: string) =>
      data.asset_types!.find((t) => (t as { name?: string }).name === name)?.id ?? '';
    for (const plan of data.price_plans!) {
      const p = plan.product_id!;
      const rules = data.price_rules!.filter((r) => r.plan_id === plan.id);
      const optionSets = [
        {},
        ...rules.map((r) => {
          const c = r.condition ?? '';
          const low = Number(c.match(/\d+/)?.[0] ?? 1);
          return { tier: c, qty: low, assetType: atName(c), extras: [c], items: low };
        }),
        { qty: 1000, items: 1000 },
      ];
      for (const soldTo of ['Company', 'Dealer'] as const) {
        for (const o of optionSets) {
          const mine = R.priceLine(p, soldTo, o);
          const legacy = L.priceLine(p, soldTo, o);
          const what = `priceLine ${p} ${soldTo} ${JSON.stringify(o)}`;
          expect(mine.unit, what).toBeCloseTo(legacy.unit, 9);
          expect(mine.applied, what).toEqual(legacy.applied);
          expect(mine.currency, what).toBe(legacy.cur);
          expect(mine.planId, what).toBe(legacy.plan?.ID ?? null);
        }
      }
      expect(R.usesItemBands(p)).toBe(L.usesItemBands(p));
    }
    for (const h of data.hardware_prices!) {
      expect(R.hardwarePrice(h.model_kind!, h.model_id!, h.sold_to!, h.supply!)?.id).toBe(
        L.hwPrice(h.model_kind, h.model_id, h.sold_to, h.supply)?.ID,
      );
    }
  });
  it('quote hardware suggestions match for every demo quote', () => {
    for (const q of data.quotes!) {
      const legacy = L.quoteHwGroups(q.id).map(
        (g: {
          root: string;
          name: string;
          sug: { device: string | null } | null;
          qty: number;
        }) => ({
          root: g.root,
          name: g.name,
          device: g.sug?.device ?? null,
          qty: g.qty,
        }),
      );
      const mine = R.quoteHardwareGroups(q.id).map((g) => ({
        root: g.root,
        name: g.name,
        device: g.suggestion?.device ?? null,
        qty: g.qty,
      }));
      expect(mine, `quote ${q.id}`).toEqual(legacy);
    }
  });
});
