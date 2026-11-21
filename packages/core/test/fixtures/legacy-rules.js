// Frozen copy of the legacy prototype's business rules (legacy/src/app.js, removed 20 Nov 2026),
// assembled exactly as the parity tests loaded them. Used only by packages/core/test/legacy.ts to
// check the new rules still match. Do not edit; it is a reference, not code we run in the apps.

var DB = {};
var PRODUCT = '';
const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const has = (v) => String(v ?? '').trim() !== '';
const lc = (v) =>
  String(v ?? '')
    .trim()
    .toLowerCase();
const byId = (t, id) => (has(id) ? DB[t].find((r) => r.ID === id) : undefined);
const where = (t, f) => (DB[t] || []).filter(f);
const TABS = Object.keys(SCHEMA);
const COLS = (t) => SCHEMA[t].fields.map((f) => f[0]);
const FIELD = (t, k) => SCHEMA[t].fields.find((f) => f[0] === k);
const snk = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
const CORE_T = (t) => (t === 'SIM_Cards' ? 'connectivity' : snk(t));
const COLMAP = {
  Features: { Group: 'feature_group' },
  SIM_Cards: { ICCID: 'identifier', Operator: 'provider' },
};
const VIRTUAL = { Nodes: ['Default Device Model'] }; // shown in the app, stored in core.product_devices (priority 1)
const coreCol = (t, c) => COLMAP[t]?.[c] || snk(c);
const toApp = (f, v) =>
  v === null || v === undefined
    ? ''
    : f[1] === 'yesno'
      ? v === true || v === 'true'
        ? 'Yes'
        : v === false || v === 'false'
          ? 'No'
          : String(v)
      : String(v);
const bySort = (a, b) => num(a.Sort) - num(b.Sort) || a.Name.localeCompare(b.Name);
const kids = (id) => DB.Nodes.filter((n) => (n['Parent ID'] || '') === (id || '')).sort(bySort);
const isProd = (n) => n && n.Type === 'Product';
const products = () => DB.Nodes.filter(isProd);
function pathOf(id) {
  const out = [];
  let n = byId('Nodes', id),
    g = 0;
  while (n && g++ < 30) {
    out.unshift(n);
    n = byId('Nodes', n['Parent ID']);
  }
  return out;
}
const groupPath = (id) =>
  pathOf(id)
    .filter((n) => n.Type === 'Group')
    .map((n) => n.Name)
    .join(' › ');
function descendants(id) {
  const out = [];
  const walk = (x) =>
    kids(x).forEach((k) => {
      out.push(k);
      walk(k.ID);
    });
  walk(id);
  return out;
}
const isEdition = (id) => {
  const n = byId('Nodes', id);
  return !!n && n.Kind === 'Edition' && isProd(byId('Nodes', n['Parent ID']));
};
const baseOf = (id) => (isEdition(id) ? byId('Nodes', id)['Parent ID'] : id);
function includesOf(pid, seen = new Set(), ch = {}) {
  if (isEdition(pid)) includesOf(baseOf(pid), seen, ch);
  where('Bundle_Rules', (r) => r['From Product'] === pid && r.Type === 'Includes').forEach((r) => {
    let x = r['To Product'];
    const c = ch[pid];
    if (has(c) && baseOf(c) === x) x = c;
    if (!seen.has(x)) {
      seen.add(x);
      includesOf(x, seen, ch);
    }
  });
  return seen;
}
const editionsOf = (pid) =>
  DB.Nodes.filter((n) => n['Parent ID'] === pid && n.Kind === 'Edition' && isProd(n)).sort(bySort);
const edName = (e) =>
  e.Name +
  (marketsOf(e.ID).length && !marketsOf(e.ID).every((m) => e.Name.includes(m))
    ? ' (' + marketsOf(e.ID).join(', ') + ')'
    : '');
const marketsOf = (pid) =>
  String(byId('Nodes', pid)?.Markets || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
const marketOk = (pid, mkt) => !has(mkt) || !marketsOf(pid).length || marketsOf(pid).includes(mkt);
const companyMarket = (cid) => byId('Companies', cid)?.Country || '';
function includeChoices(pid, mkt) {
  // includes whose target has editions sold in this market
  return where('Bundle_Rules', (r) => r['From Product'] === pid && r.Type === 'Includes')
    .map((r) => ({
      target: r['To Product'],
      eds: editionsOf(r['To Product'])
        .filter((e) => marketOk(e.ID, mkt))
        .map((e) => e.ID),
    }))
    .filter((x) => x.eds.length);
}
const choicesOf = (rows, key) =>
  Object.fromEntries(
    rows.filter((r) => has(r['Edition Choice'])).map((r) => [r[key], r['Edition Choice']]),
  );
function choiceSelect(t, row, pid, mkt) {
  const ic = includeChoices(pid, mkt);
  if (!ic.length) return '';
  return ic
    .map(
      ({ target, eds }) =>
        `<label class="row" style="gap:6px;font-size:12px;font-weight:400;margin-top:4px;flex-wrap:nowrap"><span class="muted">Includes</span><select data-c="cell" data-t="${t}" data-id="${esc(row.ID)}" data-k="Edition Choice" aria-label="Included edition" style="min-height:28px;font-size:12px">${opts([['', label('Nodes', target)], ...eds.map((e) => [e, label('Nodes', e)])], row['Edition Choice'] || '')}</select></label>`,
    )
    .join('');
}
function needsOf(pid) {
  const s = new Set(
    where('Bundle_Rules', (r) => r['From Product'] === pid && r.Type === 'Needs').map(
      (r) => r['To Product'],
    ),
  );
  const p = byId('Nodes', byId('Nodes', pid)?.['Parent ID']);
  if (isProd(p) && !isEdition(pid)) s.add(p.ID);
  return s;
}
const covers = (pids) => {
  const s = grantedBy(pids);
  [...pids].forEach((p) => {
    if (isEdition(p)) s.add(baseOf(p));
  });
  return s;
};
const optionalOf = (pid) =>
  where('Bundle_Rules', (r) => r['From Product'] === pid && r.Type === 'Optional').map(
    (r) => r['To Product'],
  );
function grantedBy(pids, ch = {}) {
  const s = new Set();
  pids.forEach((p) => {
    s.add(p);
    includesOf(p, new Set(), ch).forEach((x) => s.add(x));
  });
  return s;
}
function withNeeds(pids) {
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
function featuresOf(pid, inherited = true) {
  const out = where('Product_Features', (r) => r['Product ID'] === pid).map((r) => ({
    fid: r['Feature ID'],
    avail: r.Availability,
    src: pid,
    row: r,
  }));
  if (isEdition(pid))
    where('Product_Features', (r) => r['Product ID'] === baseOf(pid)).forEach((r) => {
      if (!out.some((o) => o.fid === r['Feature ID']))
        out.push({
          fid: r['Feature ID'],
          avail: r.Availability,
          src: baseOf(pid),
          row: r,
          base: true,
        });
    });
  if (inherited)
    includesOf(pid).forEach((inc) =>
      where('Product_Features', (r) => r['Product ID'] === inc).forEach((r) => {
        if (!out.some((o) => o.fid === r['Feature ID']))
          out.push({ fid: r['Feature ID'], avail: r.Availability, src: inc, row: r });
      }),
    );
  return out;
}
const featsOfSet = (pids, optionalToo = true) => {
  const m = new Map();
  pids.forEach((p) =>
    featuresOf(p, false).forEach((f) => {
      if ((optionalToo || f.avail !== 'Optional') && !m.has(f.fid)) m.set(f.fid, f);
    }),
  );
  return [...m.values()];
};
const dpsOf = (fid) => where('Feature_Data_Points', (r) => r['Feature ID'] === fid);
function missingDPs(fid, ok) {
  // required data points not satisfied; rows sharing an Alt Group need only one of them
  const groups = {};
  dpsOf(fid)
    .filter((d) => d.Required !== 'No')
    .forEach((d) => {
      const g = has(d['Alt Group']) ? 'g:' + d['Alt Group'] : 'd:' + d.ID;
      (groups[g] ??= []).push(d['Data Point ID']);
    });
  return Object.values(groups)
    .filter((dps) => !dps.some(ok))
    .map((dps) => dps.map((x) => label('Data_Points', x)).join(' or '));
}
const devIfaces = (dm) => {
  const o = {};
  where('Device_Interfaces', (r) => r['Device Model ID'] === dm).forEach(
    (r) => (o[r['Interface ID']] = (o[r['Interface ID']] || 0) + num(r.Count)),
  );
  return o;
};
const devDPs = (dm) =>
  new Set(
    where('Device_Data_Points', (r) => r['Device Model ID'] === dm).map((r) => r['Data Point ID']),
  );
const sensDPs = (sm) =>
  new Set(
    where('Sensor_Data_Points', (r) => r['Sensor Model ID'] === sm).map((r) => r['Data Point ID']),
  );
const sensIfaces = (sm) => where('Sensor_Interfaces', (r) => r['Sensor Model ID'] === sm);
function infraFor(dm) {
  // site infrastructure that works with this device (shares a data point with it, e.g. RFID reader <-> RFID tag)
  if (isInfra(dm)) return [];
  const own = devDPs(dm);
  return DB.Device_Models.filter(
    (m) => isInfra(m.ID) && m.Status !== 'Inactive' && [...devDPs(m.ID)].some((x) => own.has(x)),
  );
}
function dpOnModel(dm, dp) {
  if (devDPs(dm).has(dp)) return { ok: true, how: 'built-in', opts: [] };
  const inf = infraFor(dm).filter((m) => devDPs(m.ID).has(dp));
  if (inf.length)
    return {
      ok: true,
      how: 'via site infrastructure: ' + inf.map((m) => label('Device_Models', m.ID)).join(' or '),
      opts: [],
    };
  const ifs = devIfaces(dm);
  const opts = [];
  where('Sensor_Data_Points', (r) => r['Data Point ID'] === dp).forEach((r) =>
    sensIfaces(r['Sensor Model ID']).forEach((si) => {
      if (ifs[si['Interface ID']] > 0)
        opts.push({ sm: r['Sensor Model ID'], iface: si['Interface ID'], proto: si.Protocol });
    }),
  );
  return {
    ok: opts.length > 0,
    how: opts.length
      ? opts
          .map(
            (o) =>
              `${label('Sensor_Models', o.sm)} on ${label('Interfaces', o.iface)}${o.proto ? ' (' + o.proto + ')' : ''}`,
          )
          .join('; ')
      : '',
    opts,
  };
}
const certsOf = (dm) =>
  String(byId('Device_Models', dm)?.Certifications || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
const reqCerts = (pids) => [
  ...new Set([...pids].map((p) => byId('Nodes', p)?.['Requires Certification']).filter(has)),
];
const certMiss = (dm, pids) => {
  const have = certsOf(dm);
  return reqCerts(pids).filter((c) => !have.includes(c));
};
function evalModel(dm, feats) {
  // feats: [{fid, avail}]
  const zd = ZONE_DP();
  const gps = DB.Data_Points.find((d) => d.Name === 'GPS position')?.ID;
  const zoneOnly = zd && devDPs(dm).has(zd) && !devDPs(dm).has(gps);
  const indoorProduct = feats.some((f) =>
    dpsOf(f.fid).some((x) => x['Data Point ID'] === zd && !has(x['Alt Group'])),
  );
  const res = feats.map((f) => {
    const miss = missingDPs(f.fid, (dp) =>
      zoneOnly && !indoorProduct && dp === zd ? false : dpOnModel(dm, dp).ok,
    );
    return { ...f, ok: !miss.length, miss };
  });
  const req = res.filter((r) => r.avail !== 'Optional');
  return {
    res,
    all: req.every((r) => r.ok),
    opt: res.filter((r) => r.avail === 'Optional' && !r.ok),
  };
}
const isInfra = (dm) => byId('Device_Models', dm)?.Placement === 'Site infrastructure';
const ZONE_DP = () => DB.Data_Points.find((d) => d.Name === 'Zone location')?.ID;
function siteZones(siteId) {
  const out = [];
  const walk = (pid) =>
    DB.Zones.filter(
      (z) => z['Site ID'] === siteId && (z['Parent Zone ID'] || '') === (pid || ''),
    ).forEach((z) => {
      out.push(z);
      walk(z.ID);
    });
  walk('');
  return out;
}
const zonePath = (zid) => {
  const out = [];
  let z = byId('Zones', zid),
    g = 0;
  while (z && g++ < 20) {
    out.unshift(z.Name);
    z = byId('Zones', z['Parent Zone ID']);
  }
  return out.join(' › ');
};
const siteGateways = (siteId) => {
  const zs = new Set(DB.Zones.filter((z) => z['Site ID'] === siteId).map((z) => z.ID));
  return DB.Device_Units.filter(
    (u) => zs.has(u['Zone ID']) && isInfra(u['Device Model ID']) && u.Status === 'Installed',
  );
};
function installedOn(assetId) {
  const unit = DB.Device_Units.find((u) => u['Asset ID'] === assetId && u.Status === 'Installed');
  const sensors = unit ? where('Sensor_Units', (s) => s['Device Unit ID'] === unit.ID) : [];
  const dps = new Set();
  if (unit) {
    devDPs(unit['Device Model ID']).forEach((d) => dps.add(d));
    sensors.forEach((s) => sensDPs(s['Sensor Model ID']).forEach((d) => dps.add(d)));
  }
  let noGateways = false;
  const zd = ZONE_DP();
  const a = byId('Assets', assetId);
  if (zd && dps.has(zd) && !(has(a?.['Site ID']) && siteGateways(a['Site ID']).length)) {
    dps.delete(zd);
    noGateways = true;
  }
  return { unit, sensors, dps, noGateways };
}
function access(roleId, fid) {
  // Hidden | View | Use
  if (!roleId) return 'Use';
  const rows = where('Role_Features', (r) => r['Role ID'] === roleId);
  if (rows.length) return rows.find((r) => r['Feature ID'] === fid)?.Access || 'Hidden';
  const P = perms(roleId);
  return byId('Features', fid)?.['Is Command'] === 'Yes'
    ? P.has('commands')
      ? 'Use'
      : 'Hidden'
    : P.size
      ? 'View'
      : 'Hidden';
}
const perms = (roleId) =>
  new Set(
    String(byId('Roles', roleId)?.Permissions || '')
      .split(',')
      .map((s) => lc(s))
      .filter(Boolean),
  );
const activeSub = (s) => ['Active', 'Trial'].includes(s.Status);
function featureCheck(assetId, roleId) {
  const a = byId('Assets', assetId);
  if (!a) return { rows: [], upsell: [] };
  const hw = installedOn(assetId);
  const aSubs = where('Subscriptions', (s) => s['Asset ID'] === assetId && activeSub(s));
  const paidP = grantedBy(
    [...aSubs.map((s) => s['Product ID']), ...aSubs.map((s) => s['Package ID']).filter(has)],
    choicesOf(aSubs, 'Product ID'),
  );
  const paidF = new Map();
  paidP.forEach((p) => featuresOf(p, false).forEach((f) => paidF.set(f.fid, p)));
  const typeProducts = where(
    'Product_Asset_Types',
    (r) => r['Asset Type ID'] === a['Asset Type ID'],
  ).map((r) => r['Product ID']);
  const cand = new Map();
  [...paidP, ...typeProducts].forEach((p) =>
    featuresOf(p, false).forEach((f) => {
      if (!cand.has(f.fid)) cand.set(f.fid, p);
    }),
  );
  const P = perms(roleId);
  const rows = [...cand.entries()]
    .map(([fid, p]) => {
      const f = byId('Features', fid);
      if (!f) return null;
      const miss = missingDPs(fid, (dp) => hw.dps.has(dp));
      const cmd = f['Is Command'] === 'Yes';
      const acc = roleId ? access(roleId, fid) : null;
      const allowed = roleId ? (cmd ? acc === 'Use' : acc !== 'Hidden') : null;
      return {
        fid,
        name: f.Name,
        cmd,
        type: f.Type,
        product: paidF.get(fid) || p,
        paid: paidF.has(fid),
        possible: !miss.length,
        miss,
        allowed,
        acc,
      };
    })
    .filter(Boolean)
    .sort((x, y) => y.paid - x.paid || x.name.localeCompare(y.name));
  const upsell = [...new Set(rows.filter((r) => !r.paid && r.possible).map((r) => r.product))];
  return { rows, upsell, hw };
}
const planFor = (pid, to) =>
  DB.Price_Plans.find((p) => p['Product ID'] === pid && p['Sold To'] === to);
function inBand(cond, q) {
  const m = String(cond).match(/^\s*(\d+)\s*(?:-\s*(\d+)|\+)\s*$/);
  if (!m) return false;
  const a = +m[1],
    b = m[2] ? +m[2] : Infinity;
  return q >= a && q <= b;
}
function priceLine(pid, to, { tier = '', qty = 1, assetType = '', extras = [], items = 0 } = {}) {
  const plan = planFor(pid, to);
  if (!plan) return { unit: 0, plan: null, applied: ['no price plan'], cur: 'SAR' };
  let unit = num(plan['Base Price']);
  const applied = [has(plan['Base Price']) ? `base ${unit}` : 'base not set'];
  const atName = label('Asset_Types', assetType);
  where('Price_Rules', (r) => r['Plan ID'] === plan.ID && has(r.Value)).forEach((r) => {
    const t = r['Rule Type'],
      c = r.Condition;
    const hit =
      (t === 'Tier' && lc(c) === lc(tier)) ||
      (t === 'Quantity band' && inBand(c, qty)) ||
      (t === 'Asset type' && lc(c) === lc(atName)) ||
      (t === 'Feature add-on' && extras.some((e) => lc(e) === lc(c))) ||
      (t === 'Item count band' && items > 0 && inBand(c, items));
    if (!hit) return;
    const v = num(r.Value);
    if (r.Effect === 'Add') {
      unit += v;
      applied.push(`${t} ${c} +${v}`);
    } else if (r.Effect === 'Discount %') {
      if (t === 'Package discount') return;
      unit = unit * (1 - v / 100);
      applied.push(`${t} ${c} −${v}%`);
    } else {
      unit = v;
      applied.push(`${t} ${c} = ${v}`);
    }
  });
  return { unit, plan, applied, cur: plan.Currency || 'SAR' };
}
const usesItemBands = (pid) => {
  const pl = planFor(pid, 'Company');
  return (
    !!pl &&
    DB.Price_Rules.some((r) => r['Plan ID'] === pl.ID && r['Rule Type'] === 'Item count band')
  );
};
const hwPrice = (kind, model, to, supply) =>
  DB.Hardware_Prices.find(
    (h) =>
      h['Model Kind'] === kind &&
      h['Model ID'] === model &&
      h['Sold To'] === to &&
      h.Supply === supply,
  );
const isPackage = (id) => byId('Nodes', id)?.Kind === 'Package';
function rootOf(p) {
  const n = byId('Nodes', p);
  const par = byId('Nodes', n?.['Parent ID']);
  return n?.Kind === 'Add-on' && isProd(par) ? rootOf(par.ID) : p;
}
function quoteHwGroups(qid) {
  // one hardware suggestion per base product (with its add-ons); packages bring no hardware of their own
  const pl = where(
    'Quote_Lines',
    (l) => l['Quote ID'] === qid && l.Kind === 'Product' && !isPackage(l['Item ID']),
  );
  const groups = {};
  pl.forEach((l) => (groups[rootOf(l['Item ID'])] ??= []).push(l));
  return Object.entries(groups).map(([root, ls]) => {
    const eff = [
      ...grantedBy(
        ls.map((l) => l['Item ID']),
        choicesOf(ls, 'Item ID'),
      ),
    ];
    return {
      root,
      name: label('Nodes', root),
      sug: suggestHardware(eff),
      qty: Math.max(1, ...ls.map((l) => num(l['Item Count']) || num(l.Qty))),
    };
  });
}
function suggestHardware(pids) {
  const feats = featsOfSet(withNeeds(pids), false);
  if (!feats.length) return null;
  const allF = featsOfSet(withNeeds(pids), true);
  const needDP = new Set(allF.flatMap((f) => dpsOf(f.fid).map((x) => x['Data Point ID'])));
  const score = (d) => {
    const ev = evalModel(d.ID, allF);
    return [
      ev.res.filter((r) => r.ok).length,
      -[...devDPs(d.ID)].filter((x) => !needDP.has(x)).length,
      d['Own Hardware'] === 'Yes' ? 1 : 0,
    ];
  };
  const pref = new Set(
    [...pids]
      .map(
        (p) =>
          byId('Nodes', p)?.['Default Device Model'] ||
          byId('Nodes', baseOf(p))?.['Default Device Model'],
      )
      .filter(has),
  );
  const models = DB.Device_Models.filter((d) => d.Status !== 'Inactive' && !isInfra(d.ID))
    .map((d) => [d, score(d)])
    .sort(
      (a, b) =>
        pref.has(b[0].ID) - pref.has(a[0].ID) ||
        b[1][0] - a[1][0] ||
        b[1][1] - a[1][1] ||
        b[1][2] - a[1][2],
    )
    .map((x) => x[0]);
  for (const d of models) {
    const ev = evalModel(d.ID, feats);
    if (!ev.all || certMiss(d.ID, pids).length) continue;
    const need = new Map();
    const ifs = devIfaces(d.ID);
    feats.forEach((f) =>
      dpsOf(f.fid).forEach((x) => {
        const s = dpOnModel(d.ID, x['Data Point ID']);
        if (
          s.how !== 'built-in' &&
          s.opts[0] &&
          ![...need.values()].some((n) => sensDPs(n.sm).has(x['Data Point ID']))
        )
          need.set(x['Data Point ID'], s.opts[0]);
      }),
    );
    const needed = new Set(feats.flatMap((f) => dpsOf(f.fid).map((x) => x['Data Point ID'])));
    const infra = DB.Device_Models.filter(
      (m) =>
        isInfra(m.ID) &&
        m.Status !== 'Inactive' &&
        [...devDPs(m.ID)].some((x) => needed.has(x) && devDPs(d.ID).has(x)),
    ).map((m) => m.ID);
    return { device: d.ID, sensors: [...need.values()], gateways: infra };
  }
  return { device: null, sensors: [] };
}

function acctLabel(v) {
  if (v === 'PLATFORM') return 'Platform (EIT)';
  return byId('Dealers', v)?.Name || byId('Companies', v)?.Name || v || '—';
}
function modelLabel(v) {
  return byId('Device_Models', v)
    ? label('Device_Models', v)
    : byId('Sensor_Models', v)
      ? label('Sensor_Models', v)
      : byId('Nodes', v)
        ? byId('Nodes', v).Name
        : v || '—';
}
function label(t, id) {
  const r = byId(t, id);
  if (!r) return has(id) ? id : '—';
  if (t === 'Device_Models' || t === 'Sensor_Models') return `${r.Maker} ${r.Model}`.trim();
  if (t === 'Quotes') return `${r.ID} · ${acctLabel(r['Company ID'])}`;
  return (
    SCHEMA[t].label
      .map((c) => {
        const f = FIELD(t, c);
        return f && f[1] === 'ref' ? label(f[2], r[c]) : r[c];
      })
      .filter(has)
      .join(' · ') || r.ID
  );
}
function cellText(t, k, v) {
  const f = FIELD(t, k);
  if (!f) return v;
  if (['Account ID', 'Seller ID', 'Buyer ID'].includes(k)) return acctLabel(v);
  if (k === 'Model ID' || k === 'Item ID') return modelLabel(v);
  if (f[1] === 'ref') return has(v) ? label(f[2], v) : '—';
  return v;
}

function companyProducts(co) {
  return grantedBy(
    where('Subscriptions', (s) => s['Buyer ID'] === co && activeSub(s)).flatMap((s) =>
      [s['Product ID'], s['Package ID']].filter(has),
    ),
  );
}
function companyApps(co) {
  const subs = where('Subscriptions', (s) => s['Buyer ID'] === co && activeSub(s));
  const out = new Set(subs.map((s) => s['Product ID']).filter(has));
  subs.forEach((s) =>
    [s['Package ID'], s['Product ID']]
      .filter((p) => has(p) && byId('Nodes', p)?.Kind === 'Package')
      .forEach((p) => grantedBy([p]).forEach((x) => out.add(x))),
  );
  return out;
}
const packageMembers = (p) =>
  where(
    'Bundle_Rules',
    (r) => r['From Product'] === p && ['Includes', 'Optional'].includes(r.Type),
  ).map((r) => r['To Product']);
const ENTRY_KINDS = ['Standalone', 'Base', 'Edition', 'Package'];
const entryProducts = () =>
  DB.Nodes.filter(
    (n) => n.Type === 'Product' && ENTRY_KINDS.includes(n.Kind) && n.Status === 'Active',
  );
const productFamily = () => {
  const core = isPackage(PRODUCT) ? packageMembers(PRODUCT) : [PRODUCT];
  return [
    ...new Set([
      ...core,
      ...core.flatMap((p) =>
        DB.Nodes.filter((n) => n['Parent ID'] === p && n.Kind === 'Add-on').map((n) => n.ID),
      ),
    ]),
  ];
};
const productAssetTypes = () => {
  const ids = isPackage(PRODUCT) ? packageMembers(PRODUCT) : [PRODUCT];
  ids.slice().forEach((p) => {
    if (isEdition(p)) ids.push(baseOf(p));
  });
  return new Set(
    where('Product_Asset_Types', (r) => ids.includes(r['Product ID'])).map(
      (r) => r['Asset Type ID'],
    ),
  );
};
function dealerProducts(dl) {
  if (!dl) return null;
  return grantedBy(
    where(
      'Subscriptions',
      (s) => s['Buyer ID'] === dl && s['Seller ID'] === 'PLATFORM' && activeSub(s),
    ).map((s) => s['Product ID']),
  );
}
function typesFor(p) {
  const n = byId('Nodes', p);
  const src = n?.Kind === 'Add-on' ? n['Parent ID'] : isEdition(p) ? baseOf(p) : p;
  return new Set(
    where('Product_Asset_Types', (r) => r['Product ID'] === src || r['Product ID'] === p).map(
      (r) => r['Asset Type ID'],
    ),
  );
}
function loadDB(data) {
  // readSheet's mapping, without the network call
  const netName = Object.fromEntries((data.networks || []).map((n) => [n.id, n.name]));
  const ddm = {};
  (data.product_devices || [])
    .filter((p) => Number(p.priority) === 1)
    .forEach((p) => (ddm[p.product_id] = p.device_model_id));
  DB = {};
  TABS.forEach((t) => {
    const src = data[CORE_T(t)] || [];
    DB[t] = src.map((r) => {
      const o = {};
      SCHEMA[t].fields.forEach((f) => {
        o[f[0]] = toApp(f, r[coreCol(t, f[0])]);
      });
      return o;
    });
    if (t === 'Device_Models')
      DB[t].forEach((o) => {
        o.Network = netName[o.Network] || o.Network;
      });
    if (t === 'Nodes')
      DB[t].forEach((o) => {
        o['Default Device Model'] = ddm[o.ID] || '';
      });
  });
}
globalThis.L = {
  loadDB,
  setProduct: (p) => {
    PRODUCT = p;
  },
  label,
  kids,
  pathOf,
  groupPath,
  descendants,
  isEdition,
  baseOf,
  editionsOf,
  marketsOf,
  includeChoices,
  needsOf,
  covers,
  optionalOf,
  grantedBy,
  withNeeds,
  includesOf,
  featuresOf,
  featsOfSet,
  missingDPs,
  devIfaces,
  infraFor,
  dpOnModel,
  certMiss,
  evalModel,
  installedOn,
  access,
  featureCheck,
  priceLine,
  usesItemBands,
  hwPrice,
  isPackage,
  rootOf,
  quoteHwGroups,
  suggestHardware,
  siteZones,
  zonePath,
  siteGateways,
  companyProducts,
  companyApps,
  packageMembers,
  entryProducts,
  productFamily,
  productAssetTypes,
  dealerProducts,
  typesFor,
};
