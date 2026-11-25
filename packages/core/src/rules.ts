// IoTIFY business rules, ported from the legacy prototype (legacy/src/app.js, "domain logic",
// ~lines 199–347, plus companyApps/productAssetTypes/typesFor). Pure functions over core rows:
// no React, no database. Build once per data snapshot: `const rules = createRules(data)`.
//
// Vocabulary (handover document):
//   Includes  buying A gives B too          Needs     A only works with B
//   Optional  B can be added to A           Edition   a market variant inside its base product
//   Package   a bundle of member products   Add-on    extra features inside its parent product
//   Paid      the subscription covers the feature      Possible  the fitted hardware can do it
//   Allowed   the user's role may see / use it
import type { NodesRow } from '@iotify/data';
import { has, lc, list, num, type CoreData, type CoreDataInput } from './data';

/** Edition picked for an included product: { [buying product or line]: chosen edition }. */
export type EditionChoices = Record<string, string>;

export interface ProductFeature {
  featureId: string;
  availability: 'Standard' | 'Optional' | null | undefined;
  /** Product the feature comes from. */
  source: string;
  /** True when an edition inherits it from its base. */
  fromBase?: boolean;
}

export interface SensorOption {
  sensorModelId: string;
  interfaceId: string;
  protocol: string | null;
}

export interface DataPointSupport {
  ok: boolean;
  how: 'built-in' | 'infrastructure' | 'sensor' | 'none';
  /** Site infrastructure models that supply it (how = 'infrastructure'). */
  infrastructure: string[];
  /** Sensors that could supply it through a free interface (how = 'sensor'). */
  options: SensorOption[];
}

export interface FeatureCheckRow {
  featureId: string;
  name: string;
  isCommand: boolean;
  type: string | null | undefined;
  /** Product that sells the feature (the paid one when paid). */
  product: string;
  paid: boolean;
  possible: boolean;
  /** Missing required data points: each group needs one of its ids. */
  missing: string[][];
  /** The same, as names ("Fuel level or Tank level"). */
  missingText: string[];
  /** null when no role was given. */
  allowed: boolean | null;
  access: Access | null;
}

export type Access = 'Hidden' | 'View' | 'Use';

export interface PriceLineOptions {
  tier?: string;
  qty?: number;
  assetType?: string;
  extras?: string[];
  items?: number;
}

export interface PriceLine {
  unit: number;
  planId: string | null;
  applied: string[];
  currency: string;
}

const ENTRY_KINDS = ['Standalone', 'Base', 'Edition', 'Package'];
const ACTIVE_SUB = ['Active', 'Trial'];

function groupBy<R, K>(rows: R[], key: (r: R) => K): Map<K, R[]> {
  const m = new Map<K, R[]>();
  for (const r of rows) {
    const k = key(r);
    const a = m.get(k);
    if (a) a.push(r);
    else m.set(k, [r]);
  }
  return m;
}
const byIdMap = <R extends { id: string }>(rows: R[]) =>
  new Map(rows.map((r) => [r.id, r] as const));

export function createRules(input: CoreDataInput) {
  const src: CoreData = {
    nodes: [],
    bundle_rules: [],
    features: [],
    product_features: [],
    data_points: [],
    feature_data_points: [],
    device_model: [],
    device_manufacturer: [],
    device_interfaces: [],
    device_data_points: [],
    sensor_interfaces: [],
    sensor_models: [],
    sensor_data_points: [],
    product_devices: [],
    asset_types: [],
    product_asset_types: [],
    price_plans: [],
    price_rules: [],
    hardware_prices: [],
    roles: [],
    role_features: [],
    company: [],
    zones: [],
    asset_group: [],
    tracked_asset: [],
    device: [],
    sensor_units: [],
    subscriptions: [],
    quote_lines: [],
    ...input,
  };
  // The rules work on text ids. gps rows (device models, devices, assets) have number ids: they are
  // turned into text here, once. Sensor models are known by their text id; sensor_data_points and
  // hardware_prices point to them by number (sensor_type_id), which is turned back into the text id.
  const s = (v: unknown) => (v == null ? '' : String(v));
  const sOrNull = (v: unknown) => (v == null ? null : String(v));
  const sensorById = new Map(src.sensor_models.map((m) => [s(m.sensor_type_id), m.id] as const));
  const sensorText = (v: unknown) => sensorById.get(s(v)) ?? s(v);
  const makerName = new Map(src.device_manufacturer.map((m) => [m.id, m.name] as const));
  const groupName = new Map(src.asset_group.map((g) => [g.id, g.name] as const));
  const d = {
    ...src,
    // Screens read rules.data: a model also carries its maker and model name, a vehicle its plate
    // and group name (the old core columns), from gps.device_manufacturer and gps.asset_group.
    device_models: src.device_model.map((m) => {
      const old = m as typeof m & { maker?: string | null; model?: string | null; type?: string | null };
      return {
        ...m,
        id: s(m.id),
        maker: makerName.get(m.manufacturer_id) ?? old.maker ?? '',
        model: m.name ?? old.model ?? '',
        type: m.device_type ?? old.type ?? null,
      };
    }),
    device_interfaces: src.device_interfaces.map((r) => ({ ...r, device_model_id: s(r.device_model_id) })),
    device_data_points: src.device_data_points.map((r) => ({
      ...r,
      device_model_id: s(r.device_model_id),
    })),
    sensor_data_points: src.sensor_data_points.map((r) => ({
      ...r,
      sensor_model_id: sensorText(r.sensor_model_id),
    })),
    product_devices: src.product_devices.map((r) => ({ ...r, device_model_id: s(r.device_model_id) })),
    hardware_prices: src.hardware_prices.map((h) => ({
      ...h,
      model_id: h.model_kind === 'Sensor' ? sensorText(h.model_id) : s(h.model_id),
    })),
    zones: src.zones.map((z) => ({ ...z, site_id: sOrNull(z.site_id) })),
    assets: src.tracked_asset.map((a) => {
      const old = a as typeof a & { plate_serial?: string | null; asset_group?: string | null };
      return {
        ...a,
        id: s(a.id),
        company_id: s(a.company_id),
        site_id: sOrNull(a.site_id),
        plate_serial: a.code ?? old.plate_serial ?? null,
        asset_group: (a.group_id != null ? groupName.get(a.group_id) : old.asset_group) ?? null,
      };
    }),
    device_units: src.device.map((u) => ({
      ...u,
      id: s(u.id),
      asset_id: sOrNull(u.asset_id),
      device_model_id: sOrNull(u.model_id),
    })),
    sensor_units: src.sensor_units.map((u) => ({ ...u, device_unit_id: sOrNull(u.device_unit_id) })),
    subscriptions: src.subscriptions.map((x) => ({ ...x, asset_id: sOrNull(x.asset_id) })),
  };

  // ------------------------------------------------------------------ indexes
  const nodeById = byIdMap(d.nodes);
  const featureById = byIdMap(d.features);
  const dataPointById = byIdMap(d.data_points);
  const deviceModelById = byIdMap(d.device_models);
  const assetById = byIdMap(d.assets);
  const zoneById = byIdMap(d.zones);
  const roleById = byIdMap(d.roles);
  const assetTypeById = byIdMap(d.asset_types);
  const rulesFrom = groupBy(d.bundle_rules, (r) => r.from_product ?? '');
  const featuresByProduct = groupBy(d.product_features, (r) => r.product_id ?? '');
  const dpsByFeature = groupBy(d.feature_data_points, (r) => r.feature_id ?? '');
  const devDpRows = groupBy(d.device_data_points, (r) => r.device_model_id ?? '');
  const devIfaceRows = groupBy(d.device_interfaces, (r) => r.device_model_id ?? '');
  const sensDpRows = groupBy(d.sensor_data_points, (r) => r.sensor_model_id ?? '');
  const sensIfaceRows = groupBy(d.sensor_interfaces, (r) => r.sensor_model_id ?? '');
  const sensorsWithDp = groupBy(d.sensor_data_points, (r) => r.data_point_id ?? '');
  const roleFeatureRows = groupBy(d.role_features, (r) => r.role_id ?? '');
  const typesByProduct = groupBy(d.product_asset_types, (r) => r.product_id ?? '');
  const childrenOf = groupBy(d.nodes, (n) => n.parent_id || '');
  const defaultModel = new Map(
    d.product_devices
      .filter((p) => num(p.priority) === 1)
      .map((p) => [p.product_id ?? '', p.device_model_id ?? ''] as const),
  );

  const node = (id: string | null | undefined) => (has(id) ? nodeById.get(id!) : undefined);
  const nameOf = (n: NodesRow) => n.name ?? '';
  const bySort = (a: NodesRow, b: NodesRow) =>
    num(a.sort) - num(b.sort) || nameOf(a).localeCompare(nameOf(b));
  const ruleTargets = (pid: string, type: 'Includes' | 'Needs' | 'Optional') =>
    (rulesFrom.get(pid) ?? []).filter((r) => r.type === type).map((r) => r.to_product ?? '');

  // ------------------------------------------------------------------ product tree
  const isProduct = (n: NodesRow | undefined): n is NodesRow => !!n && n.type === 'Product';
  /** Children of a node (or the top level), in tree order. */
  const children = (id: string | null | undefined) =>
    [...(childrenOf.get(id || '') ?? [])].sort(bySort);
  const products = () => d.nodes.filter(isProduct);
  /** The node and its ancestors, from the top down. */
  function pathOf(id: string): NodesRow[] {
    const out: NodesRow[] = [];
    let n = node(id);
    let guard = 0;
    while (n && guard++ < 30) {
      out.unshift(n);
      n = node(n.parent_id);
    }
    return out;
  }
  const groupPath = (id: string) =>
    pathOf(id)
      .filter((n) => n.type === 'Group')
      .map(nameOf)
      .join(' › ');
  function descendants(id: string): NodesRow[] {
    const out: NodesRow[] = [];
    const walk = (x: string) =>
      children(x).forEach((k) => {
        out.push(k);
        walk(k.id);
      });
    walk(id);
    return out;
  }
  /** An Edition whose parent is a product (its base). */
  const isEdition = (id: string) => {
    const n = node(id);
    return !!n && n.kind === 'Edition' && isProduct(node(n.parent_id));
  };
  const baseOf = (id: string) => (isEdition(id) ? node(id)!.parent_id! : id);
  const editionsOf = (pid: string) =>
    d.nodes.filter((n) => n.parent_id === pid && n.kind === 'Edition' && isProduct(n)).sort(bySort);
  const marketsOf = (pid: string) => list(node(pid)?.markets);
  /** Sold in this market (no market given, or the product has no market limits). */
  const marketOk = (pid: string, market?: string | null) =>
    !has(market) || !marketsOf(pid).length || marketsOf(pid).includes(market!);
  const isPackage = (id: string) => node(id)?.kind === 'Package';
  /** Add-ons belong to their parent product: the root product that brings the hardware. */
  function rootOf(p: string): string {
    const n = node(p);
    const parent = node(n?.parent_id);
    return n?.kind === 'Add-on' && isProduct(parent) ? rootOf(parent.id) : p;
  }
  /** Products with their own app and sign-in page: active Standalone, Base, Edition and Package. */
  const entryProducts = () =>
    d.nodes.filter(
      (n) => n.type === 'Product' && ENTRY_KINDS.includes(n.kind ?? '') && n.status === 'Active',
    );
  /** Members of a package (Includes and Optional rules). */
  const packageMembers = (p: string) =>
    (rulesFrom.get(p) ?? [])
      .filter((r) => r.type === 'Includes' || r.type === 'Optional')
      .map((r) => r.to_product ?? '');
  /** Default device model of a product (product_devices, priority 1). */
  const defaultDeviceModel = (pid: string) => defaultModel.get(pid) || '';

  // ------------------------------------------------------------------ bundles
  /** Everything a product includes, all the way down. An edition first gets its base's includes. */
  function includesOf(
    pid: string,
    seen = new Set<string>(),
    choices: EditionChoices = {},
  ): Set<string> {
    if (isEdition(pid)) includesOf(baseOf(pid), seen, choices);
    for (let x of ruleTargets(pid, 'Includes')) {
      const c = choices[pid];
      if (has(c) && baseOf(c!) === x) x = c!;
      if (!seen.has(x)) {
        seen.add(x);
        includesOf(x, seen, choices);
      }
    }
    return seen;
  }
  /** Includes whose target has editions sold in this market (so the buyer picks one). */
  const includeChoices = (pid: string, market?: string | null) =>
    ruleTargets(pid, 'Includes')
      .map((target) => ({
        target,
        editions: editionsOf(target)
          .filter((e) => marketOk(e.id, market))
          .map((e) => e.id),
      }))
      .filter((x) => x.editions.length);
  /** Edition choices of subscription or quote rows: { [row[key]]: edition_choice }. */
  const choicesOf = <R extends { edition_choice?: string | null }>(
    rows: R[],
    key: keyof R,
  ): EditionChoices =>
    Object.fromEntries(
      rows.filter((r) => has(r.edition_choice)).map((r) => [String(r[key]), r.edition_choice!]),
    );
  /** What a product needs. An add-on (not an edition) also needs its parent product. */
  function needsOf(pid: string): Set<string> {
    const s = new Set(ruleTargets(pid, 'Needs'));
    const parent = node(node(pid)?.parent_id);
    if (isProduct(parent) && !isEdition(pid)) s.add(parent.id);
    return s;
  }
  const optionalOf = (pid: string) => ruleTargets(pid, 'Optional');
  /** The products themselves plus everything they include. */
  function grantedBy(pids: Iterable<string>, choices: EditionChoices = {}): Set<string> {
    const s = new Set<string>();
    for (const p of pids) {
      s.add(p);
      includesOf(p, new Set(), choices).forEach((x) => s.add(x));
    }
    return s;
  }
  /** Adds everything needed (repeatedly), then what all of that includes. */
  function withNeeds(pids: Iterable<string>): Set<string> {
    const s = new Set(pids);
    let grew = true;
    while (grew) {
      grew = false;
      [...s].forEach((p) =>
        needsOf(p).forEach((x) => {
          if (!s.has(x)) {
            s.add(x);
            grew = true;
          }
        }),
      );
    }
    return grantedBy(s);
  }
  /** What a set of products covers: granted products, plus the base of every edition. */
  function covers(pids: Iterable<string>): Set<string> {
    const arr = [...pids];
    const s = grantedBy(arr);
    arr.forEach((p) => {
      if (isEdition(p)) s.add(baseOf(p));
    });
    return s;
  }

  // ------------------------------------------------------------------ features and data points
  /** A product's features: its own, an edition's base's, and (inherited) its includes'. First one wins. */
  function featuresOf(pid: string, inherited = true): ProductFeature[] {
    const out: ProductFeature[] = (featuresByProduct.get(pid) ?? []).map((r) => ({
      featureId: r.feature_id ?? '',
      availability: r.availability,
      source: pid,
    }));
    const add = (rows: typeof d.product_features, source: string, fromBase?: boolean) =>
      rows.forEach((r) => {
        if (!out.some((o) => o.featureId === r.feature_id))
          out.push({
            featureId: r.feature_id ?? '',
            availability: r.availability,
            source,
            ...(fromBase ? { fromBase } : {}),
          });
      });
    if (isEdition(pid)) add(featuresByProduct.get(baseOf(pid)) ?? [], baseOf(pid), true);
    if (inherited) includesOf(pid).forEach((inc) => add(featuresByProduct.get(inc) ?? [], inc));
    return out;
  }
  /** Own features of several products (no inheritance), first one wins. */
  function featuresOfSet(pids: Iterable<string>, optionalToo = true): ProductFeature[] {
    const m = new Map<string, ProductFeature>();
    for (const p of pids)
      featuresOf(p, false).forEach((f) => {
        if ((optionalToo || f.availability !== 'Optional') && !m.has(f.featureId))
          m.set(f.featureId, f);
      });
    return [...m.values()];
  }
  const dataPointsOf = (fid: string) => dpsByFeature.get(fid) ?? [];
  /**
   * Required data points a feature still lacks. Rows sharing an alt_group need only one of them.
   * Returns one list of data point ids per unmet requirement.
   */
  function missingDataPoints(fid: string, ok: (dataPointId: string) => boolean): string[][] {
    const groups = new Map<string, string[]>();
    dataPointsOf(fid)
      .filter((x) => x.required !== false)
      .forEach((x) => {
        const g = has(x.alt_group) ? 'g:' + x.alt_group : 'd:' + x.id;
        const a = groups.get(g);
        if (a) a.push(x.data_point_id ?? '');
        else groups.set(g, [x.data_point_id ?? '']);
      });
    return [...groups.values()].filter((dps) => !dps.some(ok));
  }
  const dataPointName = (id: string) => (has(id) ? dataPointById.get(id)?.name || id : '—');
  const missingText = (groups: string[][]) => groups.map((g) => g.map(dataPointName).join(' or '));

  // ------------------------------------------------------------------ hardware
  const deviceDataPoints = (dm: string) =>
    new Set((devDpRows.get(dm) ?? []).map((r) => r.data_point_id ?? ''));
  const sensorDataPoints = (sm: string) =>
    new Set((sensDpRows.get(sm) ?? []).map((r) => r.data_point_id ?? ''));
  /** Interface id → how many the device model has. */
  function deviceInterfaces(dm: string): Record<string, number> {
    const o: Record<string, number> = {};
    (devIfaceRows.get(dm) ?? []).forEach((r) => {
      const k = r.interface_id ?? '';
      o[k] = (o[k] || 0) + num(r.count);
    });
    return o;
  }
  const isInfrastructure = (dm: string) =>
    deviceModelById.get(dm)?.placement === 'Site infrastructure';
  /** Site infrastructure that works with this device (shares a data point, e.g. RFID reader ↔ tag). */
  function infrastructureFor(dm: string) {
    if (isInfrastructure(dm)) return [];
    const own = deviceDataPoints(dm);
    return d.device_models.filter(
      (m) =>
        isInfrastructure(m.id) &&
        m.status !== 'Inactive' &&
        [...deviceDataPoints(m.id)].some((x) => own.has(x)),
    );
  }
  /** Can a device model supply a data point: built in, through site infrastructure, or with a sensor? */
  function dataPointOnModel(dm: string, dp: string): DataPointSupport {
    if (deviceDataPoints(dm).has(dp))
      return { ok: true, how: 'built-in', infrastructure: [], options: [] };
    const infra = infrastructureFor(dm).filter((m) => deviceDataPoints(m.id).has(dp));
    if (infra.length)
      return {
        ok: true,
        how: 'infrastructure',
        infrastructure: infra.map((m) => m.id),
        options: [],
      };
    const ifs = deviceInterfaces(dm);
    const options: SensorOption[] = [];
    (sensorsWithDp.get(dp) ?? []).forEach((r) =>
      (sensIfaceRows.get(r.sensor_model_id ?? '') ?? []).forEach((si) => {
        if ((ifs[si.interface_id ?? ''] ?? 0) > 0)
          options.push({
            sensorModelId: r.sensor_model_id ?? '',
            interfaceId: si.interface_id ?? '',
            protocol: si.protocol ?? null,
          });
      }),
    );
    return {
      ok: options.length > 0,
      how: options.length ? 'sensor' : 'none',
      infrastructure: [],
      options,
    };
  }
  const certificationsOf = (dm: string) => list(deviceModelById.get(dm)?.certifications);
  const requiredCertifications = (pids: Iterable<string>) => [
    ...new Set([...pids].map((p) => node(p)?.requires_certification).filter(has) as string[]),
  ];
  const missingCertifications = (dm: string, pids: Iterable<string>) => {
    const haveCerts = certificationsOf(dm);
    return requiredCertifications(pids).filter((c) => !haveCerts.includes(c));
  };
  const zoneDataPoint = () => d.data_points.find((x) => x.name === 'Zone location')?.id;
  const gpsDataPoint = () => d.data_points.find((x) => x.name === 'GPS position')?.id;
  /** How well a device model serves a list of features. */
  function evalModel(dm: string, feats: { featureId: string; availability?: string | null }[]) {
    const zd = zoneDataPoint();
    const gps = gpsDataPoint();
    const own = deviceDataPoints(dm);
    const zoneOnly = !!zd && own.has(zd) && !own.has(gps ?? '');
    const indoorProduct = feats.some((f) =>
      dataPointsOf(f.featureId).some((x) => x.data_point_id === zd && !has(x.alt_group)),
    );
    const res = feats.map((f) => {
      const miss = missingDataPoints(f.featureId, (dp) =>
        zoneOnly && !indoorProduct && dp === zd ? false : dataPointOnModel(dm, dp).ok,
      );
      return { ...f, ok: !miss.length, missing: miss };
    });
    const required = res.filter((r) => r.availability !== 'Optional');
    return {
      results: res,
      all: required.every((r) => r.ok),
      optionalMissing: res.filter((r) => r.availability === 'Optional' && !r.ok),
    };
  }
  /**
   * Best device for a set of products: the default model first, then the one serving most
   * features with fewest extra data points, preferring own hardware. Adds the sensors and site
   * infrastructure it needs. null when the products have no standard features.
   */
  function suggestHardware(pids: Iterable<string>) {
    const arr = [...pids];
    const needAll = withNeeds(arr);
    const feats = featuresOfSet(needAll, false);
    if (!feats.length) return null;
    const allF = featuresOfSet(needAll, true);
    const needDP = new Set(
      allF.flatMap((f) => dataPointsOf(f.featureId).map((x) => x.data_point_id ?? '')),
    );
    const score = (m: (typeof d.device_models)[number]) => {
      const ev = evalModel(m.id, allF);
      return [
        ev.results.filter((r) => r.ok).length,
        -[...deviceDataPoints(m.id)].filter((x) => !needDP.has(x)).length,
        m.own_hardware === true ? 1 : 0,
      ] as const;
    };
    const preferred = new Set(
      arr.map((p) => defaultDeviceModel(p) || defaultDeviceModel(baseOf(p))).filter(has),
    );
    const models = d.device_models
      .filter((m) => m.status !== 'Inactive' && !isInfrastructure(m.id))
      .map((m) => [m, score(m)] as const)
      .sort(
        (a, b) =>
          Number(preferred.has(b[0].id)) - Number(preferred.has(a[0].id)) ||
          b[1][0] - a[1][0] ||
          b[1][1] - a[1][1] ||
          b[1][2] - a[1][2],
      )
      .map((x) => x[0]);
    for (const m of models) {
      const ev = evalModel(m.id, feats);
      if (!ev.all || missingCertifications(m.id, arr).length) continue;
      const need = new Map<string, SensorOption>();
      feats.forEach((f) =>
        dataPointsOf(f.featureId).forEach((x) => {
          const dp = x.data_point_id ?? '';
          const s = dataPointOnModel(m.id, dp);
          if (
            s.how !== 'built-in' &&
            s.options[0] &&
            ![...need.values()].some((n) => sensorDataPoints(n.sensorModelId).has(dp))
          )
            need.set(dp, s.options[0]);
        }),
      );
      const needed = new Set(
        feats.flatMap((f) => dataPointsOf(f.featureId).map((x) => x.data_point_id ?? '')),
      );
      const own = deviceDataPoints(m.id);
      const gateways = d.device_models
        .filter(
          (g) =>
            isInfrastructure(g.id) &&
            g.status !== 'Inactive' &&
            [...deviceDataPoints(g.id)].some((x) => needed.has(x) && own.has(x)),
        )
        .map((g) => g.id);
      return { device: m.id as string | null, sensors: [...need.values()], gateways };
    }
    return {
      device: null as string | null,
      sensors: [] as SensorOption[],
      gateways: [] as string[],
    };
  }

  // ------------------------------------------------------------------ sites and assets
  /** Zones of a site, parents before children. */
  function siteZones(siteId: string) {
    const out: typeof d.zones = [];
    const walk = (pid: string) =>
      d.zones
        .filter((z) => z.site_id === siteId && (z.parent_zone_id || '') === pid)
        .forEach((z) => {
          out.push(z);
          walk(z.id);
        });
    walk('');
    return out;
  }
  const zonePath = (zid: string) => {
    const out: string[] = [];
    let z = zoneById.get(zid);
    let guard = 0;
    while (z && guard++ < 20) {
      out.unshift(z.name ?? '');
      z = zoneById.get(z.parent_zone_id ?? '');
    }
    return out.join(' › ');
  };
  /** Installed site infrastructure (gateways) in a site's zones. */
  const siteGateways = (siteId: string) => {
    const zs = new Set(d.zones.filter((z) => z.site_id === siteId).map((z) => z.id));
    return d.device_units.filter(
      (u) =>
        zs.has(u.zone_id ?? '') &&
        isInfrastructure(u.device_model_id ?? '') &&
        u.status === 'ACTIVE',
    );
  };
  /**
   * The hardware fitted to an asset and the data points it supplies. Zone location only counts
   * when the asset's site has installed gateways (otherwise noGateways is true).
   */
  function installedOn(assetId: string) {
    const unit = d.device_units.find((u) => u.asset_id === assetId && u.status === 'ACTIVE');
    const sensors = unit ? d.sensor_units.filter((s) => s.device_unit_id === unit.id) : [];
    const dataPoints = new Set<string>();
    if (unit) {
      deviceDataPoints(unit.device_model_id ?? '').forEach((x) => dataPoints.add(x));
      sensors.forEach((s) =>
        sensorDataPoints(s.sensor_model_id ?? '').forEach((x) => dataPoints.add(x)),
      );
    }
    let noGateways = false;
    const zd = zoneDataPoint();
    const a = assetById.get(assetId);
    if (zd && dataPoints.has(zd) && !(has(a?.site_id) && siteGateways(a!.site_id!).length)) {
      dataPoints.delete(zd);
      noGateways = true;
    }
    return { unit, sensors, dataPoints, noGateways };
  }

  // ------------------------------------------------------------------ roles: Allowed
  const permissions = (roleId: string) => new Set(list(roleById.get(roleId)?.permissions).map(lc));
  /** Hidden | View | Use. With role_features rows, those decide; otherwise the role's permissions. */
  function access(roleId: string | null | undefined, fid: string): Access {
    if (!roleId) return 'Use';
    const rows = roleFeatureRows.get(roleId) ?? [];
    if (rows.length) return rows.find((r) => r.feature_id === fid)?.access || 'Hidden';
    const P = permissions(roleId);
    return featureById.get(fid)?.is_command === true
      ? P.has('commands')
        ? 'Use'
        : 'Hidden'
      : P.size
        ? 'View'
        : 'Hidden';
  }
  const isActiveSubscription = (s: { status?: string | null }) =>
    ACTIVE_SUB.includes(s.status ?? '');

  /**
   * Paid / Possible / Allowed for every feature relevant to an asset: features its subscriptions
   * pay for, plus features of products made for its asset type. Paid first, then by name.
   * `upsell`: products whose features the hardware could already do but aren't paid for.
   */
  function featureCheck(assetId: string, roleId?: string | null) {
    const a = assetById.get(assetId);
    if (!a) return { rows: [] as FeatureCheckRow[], upsell: [] as string[], hardware: undefined };
    const hardware = installedOn(assetId);
    const subs = d.subscriptions.filter((s) => s.asset_id === assetId && isActiveSubscription(s));
    const paidProducts = grantedBy(
      [
        ...subs.map((s) => s.product_id ?? ''),
        ...subs.map((s) => s.package_id).filter(has),
      ] as string[],
      choicesOf(subs, 'product_id'),
    );
    const paidFeature = new Map<string, string>();
    paidProducts.forEach((p) =>
      featuresOf(p, false).forEach((f) => paidFeature.set(f.featureId, p)),
    );
    const typeProducts = (
      d.product_asset_types.filter((r) => r.asset_type_id === a.asset_type_id) ?? []
    ).map((r) => r.product_id ?? '');
    const candidates = new Map<string, string>();
    [...paidProducts, ...typeProducts].forEach((p) =>
      featuresOf(p, false).forEach((f) => {
        if (!candidates.has(f.featureId)) candidates.set(f.featureId, p);
      }),
    );
    const rows = [...candidates.entries()]
      .map(([fid, p]): FeatureCheckRow | null => {
        const f = featureById.get(fid);
        if (!f) return null;
        const miss = missingDataPoints(fid, (dp) => hardware.dataPoints.has(dp));
        const cmd = f.is_command === true;
        const acc = roleId ? access(roleId, fid) : null;
        return {
          featureId: fid,
          name: f.name ?? '',
          isCommand: cmd,
          type: f.type,
          product: paidFeature.get(fid) || p,
          paid: paidFeature.has(fid),
          possible: !miss.length,
          missing: miss,
          missingText: missingText(miss),
          allowed: roleId ? (cmd ? acc === 'Use' : acc !== 'Hidden') : null,
          access: acc,
        };
      })
      .filter((r): r is FeatureCheckRow => !!r)
      .sort((x, y) => Number(y.paid) - Number(x.paid) || x.name.localeCompare(y.name));
    const upsell = [...new Set(rows.filter((r) => !r.paid && r.possible).map((r) => r.product))];
    return { rows, upsell, hardware };
  }

  // ------------------------------------------------------------------ companies and apps
  /** Every product a company's active subscriptions grant (with includes). */
  const companyProducts = (companyId: string) =>
    grantedBy(
      d.subscriptions
        .filter((s) => s.buyer_id === companyId && isActiveSubscription(s))
        .flatMap((s) => [s.product_id, s.package_id].filter(has) as string[]),
    );
  /**
   * App access: products bought directly, or through a package (with what the package grants).
   * A product that only comes included inside another product is not an app of its own.
   */
  function companyApps(companyId: string): Set<string> {
    const subs = d.subscriptions.filter((s) => s.buyer_id === companyId && isActiveSubscription(s));
    const out = new Set(subs.map((s) => s.product_id).filter(has) as string[]);
    subs.forEach((s) =>
      (
        [s.package_id, s.product_id].filter(
          (p) => has(p) && node(p)?.kind === 'Package',
        ) as string[]
      ).forEach((p) => grantedBy([p]).forEach((x) => out.add(x))),
    );
    return out;
  }
  /** Entry products (with an app) the company has. */
  const myApps = (companyId: string) => {
    const ids = companyApps(companyId);
    return entryProducts().filter((n) => ids.has(n.id));
  };
  /** Products a dealer buys from the platform. null when no dealer. */
  const dealerProducts = (dealerId: string | null | undefined) =>
    dealerId
      ? grantedBy(
          d.subscriptions
            .filter(
              (s) =>
                s.buyer_id === dealerId && s.seller_id === 'PLATFORM' && isActiveSubscription(s),
            )
            .map((s) => s.product_id ?? ''),
        )
      : null;
  /** A product app's products: package members (or the product) plus their add-ons. */
  function productFamily(pid: string) {
    const coreIds = isPackage(pid) ? packageMembers(pid) : [pid];
    return [
      ...new Set([
        ...coreIds,
        ...coreIds.flatMap((p) =>
          d.nodes.filter((n) => n.parent_id === p && n.kind === 'Add-on').map((n) => n.id),
        ),
      ]),
    ];
  }
  /** Asset types a product app works with (package members; editions also use their base's). */
  function productAssetTypes(pid: string) {
    const ids = isPackage(pid) ? packageMembers(pid) : [pid];
    ids.slice().forEach((p) => {
      if (isEdition(p)) ids.push(baseOf(p));
    });
    return new Set(
      d.product_asset_types
        .filter((r) => ids.includes(r.product_id ?? ''))
        .map((r) => r.asset_type_id ?? ''),
    );
  }
  /** Asset types a single product applies to (an add-on uses its parent's, an edition its base's). */
  function typesFor(p: string) {
    const n = node(p);
    const src = n?.kind === 'Add-on' ? (n.parent_id ?? '') : isEdition(p) ? baseOf(p) : p;
    return new Set(
      [...(typesByProduct.get(src) ?? []), ...(src === p ? [] : (typesByProduct.get(p) ?? []))].map(
        (r) => r.asset_type_id ?? '',
      ),
    );
  }

  // ------------------------------------------------------------------ pricing
  const planFor = (pid: string, soldTo: 'Dealer' | 'Company') =>
    d.price_plans.find((p) => p.product_id === pid && p.sold_to === soldTo);
  /** "1-10" or "50+" contains q. */
  function inBand(condition: string | null | undefined, q: number) {
    const m = String(condition ?? '').match(/^\s*(\d+)\s*(?:-\s*(\d+)|\+)\s*$/);
    if (!m) return false;
    const lo = +m[1]!;
    const hi = m[2] ? +m[2] : Infinity;
    return q >= lo && q <= hi;
  }
  const assetTypeName = (id: string) => {
    if (!has(id)) return '—';
    const t = assetTypeById.get(id);
    return t ? t.name || t.id : id;
  };
  /**
   * Unit price of a product for a buyer type. Starts at the plan's base price, then applies its
   * rules in order: Tier, Quantity band, Asset type, Feature add-on, Item count band.
   * Effects: Add (+), Discount % (−%), Replace (=). Package discount rules are not applied here.
   */
  function priceLine(
    pid: string,
    soldTo: 'Dealer' | 'Company',
    opts: PriceLineOptions = {},
  ): PriceLine {
    const { tier = '', qty = 1, assetType = '', extras = [], items = 0 } = opts;
    const plan = planFor(pid, soldTo);
    if (!plan) return { unit: 0, planId: null, applied: ['no price plan'], currency: 'SAR' };
    let unit = num(plan.base_price);
    const applied = [has(plan.base_price) ? `base ${unit}` : 'base not set'];
    const atName = assetTypeName(assetType);
    d.price_rules
      .filter((r) => r.plan_id === plan.id && has(r.value))
      .forEach((r) => {
        const t = r.rule_type;
        const c = r.condition ?? '';
        const hit =
          (t === 'Tier' && lc(c) === lc(tier)) ||
          (t === 'Quantity band' && inBand(c, qty)) ||
          (t === 'Asset type' && lc(c) === lc(atName)) ||
          (t === 'Feature add-on' && extras.some((e) => lc(e) === lc(c))) ||
          (t === 'Item count band' && items > 0 && inBand(c, items));
        if (!hit) return;
        const v = num(r.value);
        if (r.effect === 'Add') {
          unit += v;
          applied.push(`${t} ${c} +${v}`);
        } else if (r.effect === 'Discount %') {
          // ('Package discount' rules never match above: they are applied to whole packages.)
          unit = unit * (1 - v / 100);
          applied.push(`${t} ${c} −${v}%`);
        } else {
          unit = v;
          applied.push(`${t} ${c} = ${v}`);
        }
      });
    return { unit, planId: plan.id, applied, currency: plan.currency || 'SAR' };
  }
  /** The company plan prices by number of items (Item count band rules). */
  const usesItemBands = (pid: string) => {
    const pl = planFor(pid, 'Company');
    return (
      !!pl && d.price_rules.some((r) => r.plan_id === pl.id && r.rule_type === 'Item count band')
    );
  };
  const hardwarePrice = (
    kind: 'Device' | 'Sensor',
    modelId: string,
    soldTo: 'Dealer' | 'Company',
    supply: string,
  ) =>
    d.hardware_prices.find(
      (h) =>
        h.model_kind === kind &&
        h.model_id === modelId &&
        h.sold_to === soldTo &&
        h.supply === supply,
    );
  /**
   * One hardware suggestion per base product on a quote (with its add-ons). Packages bring no
   * hardware of their own.
   */
  function quoteHardwareGroups(quoteId: string) {
    const lines = d.quote_lines.filter(
      (l) => l.quote_id === quoteId && l.kind === 'Product' && !isPackage(l.item_id ?? ''),
    );
    const groups = new Map<string, typeof lines>();
    lines.forEach((l) => {
      const r = rootOf(l.item_id ?? '');
      const a = groups.get(r);
      if (a) a.push(l);
      else groups.set(r, [l]);
    });
    return [...groups.entries()].map(([root, ls]) => {
      const effective = [
        ...grantedBy(
          ls.map((l) => l.item_id ?? ''),
          choicesOf(ls, 'item_id'),
        ),
      ];
      return {
        root,
        name: node(root)?.name || root,
        suggestion: suggestHardware(effective),
        qty: Math.max(1, ...ls.map((l) => num(l.item_count) || num(l.qty))),
      };
    });
  }

  return {
    data: d,
    // tree
    node,
    children,
    products,
    pathOf,
    groupPath,
    descendants,
    isProduct,
    isEdition,
    baseOf,
    editionsOf,
    marketsOf,
    marketOk,
    isPackage,
    rootOf,
    entryProducts,
    packageMembers,
    defaultDeviceModel,
    // bundles
    includesOf,
    includeChoices,
    choicesOf,
    needsOf,
    optionalOf,
    grantedBy,
    withNeeds,
    covers,
    // features
    featuresOf,
    featuresOfSet,
    dataPointsOf,
    missingDataPoints,
    missingText,
    dataPointName,
    // hardware
    deviceDataPoints,
    sensorDataPoints,
    deviceInterfaces,
    isInfrastructure,
    infrastructureFor,
    dataPointOnModel,
    certificationsOf,
    requiredCertifications,
    missingCertifications,
    evalModel,
    suggestHardware,
    // sites and assets
    siteZones,
    zonePath,
    siteGateways,
    installedOn,
    // roles
    permissions,
    access,
    isActiveSubscription,
    featureCheck,
    // companies and apps
    companyProducts,
    companyApps,
    myApps,
    dealerProducts,
    productFamily,
    productAssetTypes,
    typesFor,
    // pricing
    planFor,
    inBand,
    priceLine,
    usesItemBands,
    hardwarePrice,
    quoteHardwareGroups,
  };
}

export type Rules = ReturnType<typeof createRules>;
