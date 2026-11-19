// Loads the legacy business rules, unchanged, from legacy/src/app.js into a sandbox and fills
// its in-memory DB from core rows the way the legacy app read Neon (readSheet, ~line 130).
// Used only by the parity tests. Delete with legacy/ (REFACTOR_PLAN Step 14).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const SRC = fs
  .readFileSync(path.join(ROOT, 'legacy', 'src', 'app.js'), 'utf8')
  .replace(/\r\n/g, '\n');
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'legacy', 'src', 'schema.json'), 'utf8'));
const LINES = SRC.split('\n');

/** Lines between two "// ===… <title>" banners. */
function section(from: string, to: string) {
  const a = LINES.findIndex((l) => l.startsWith('// ===') && l.includes(from));
  const b = LINES.findIndex((l, i) => i > a && l.startsWith('// ===') && l.includes(to));
  if (a < 0 || b < 0) throw new Error(`legacy section not found: ${from} → ${to}`);
  return LINES.slice(a + 1, b).join('\n');
}
/** A top-level `function name(` / `const name =` definition and its continuation lines. */
function defn(name: string) {
  const start = LINES.findIndex(
    (l) => l.startsWith(`function ${name}(`) || l.startsWith(`const ${name} =`),
  );
  if (start < 0) throw new Error(`legacy definition not found: ${name}`);
  let end = start + 1;
  while (
    end < LINES.length &&
    !/^(function |const |let |var |\/\/|window\.|document\.|Object\.|[A-Z_]+\.|if |$)/.test(
      LINES[end]!,
    )
  )
    end++;
  return LINES.slice(start, end).join('\n');
}

const HELPERS = [
  'num',
  'has',
  'lc',
  'byId',
  'where',
  'TABS',
  'COLS',
  'FIELD',
  'snk',
  'CORE_T',
  'COLMAP',
  'VIRTUAL',
  'coreCol',
  'toApp',
];
const APP_FNS = [
  'companyProducts',
  'companyApps',
  'packageMembers',
  'ENTRY_KINDS',
  'entryProducts',
  'productFamily',
  'productAssetTypes',
  'dealerProducts',
  'typesFor',
];
const EXPORTS = [
  'kids',
  'pathOf',
  'groupPath',
  'descendants',
  'isEdition',
  'baseOf',
  'editionsOf',
  'marketsOf',
  'includeChoices',
  'needsOf',
  'covers',
  'optionalOf',
  'grantedBy',
  'withNeeds',
  'includesOf',
  'featuresOf',
  'featsOfSet',
  'missingDPs',
  'devIfaces',
  'infraFor',
  'dpOnModel',
  'certMiss',
  'evalModel',
  'installedOn',
  'access',
  'featureCheck',
  'priceLine',
  'usesItemBands',
  'hwPrice',
  'isPackage',
  'rootOf',
  'quoteHwGroups',
  'suggestHardware',
  'siteZones',
  'zonePath',
  'siteGateways',
  'companyProducts',
  'companyApps',
  'packageMembers',
  'entryProducts',
  'productFamily',
  'productAssetTypes',
  'dealerProducts',
  'typesFor',
] as const;

const SCRIPT = `
var DB = {}; var PRODUCT = '';
${HELPERS.map(defn).join('\n')}
${section('domain logic', 'labels')}
${section('labels', 'UI state')}
${APP_FNS.map(defn).join('\n')}
function loadDB(data) {            // readSheet's mapping, without the network call
  const netName = Object.fromEntries((data.networks || []).map((n) => [n.id, n.name]));
  const ddm = {}; (data.product_devices || []).filter((p) => Number(p.priority) === 1).forEach((p) => (ddm[p.product_id] = p.device_model_id));
  DB = {};
  TABS.forEach((t) => {
    const src = data[CORE_T(t)] || [];
    DB[t] = src.map((r) => { const o = {}; SCHEMA[t].fields.forEach((f) => { o[f[0]] = toApp(f, r[coreCol(t, f[0])]); }); return o; });
    if (t === 'Device_Models') DB[t].forEach((o) => { o.Network = netName[o.Network] || o.Network; });
    if (t === 'Nodes') DB[t].forEach((o) => { o['Default Device Model'] = ddm[o.ID] || ''; });
  });
}
globalThis.L = { loadDB, setProduct: (p) => { PRODUCT = p; }, label, ${EXPORTS.join(', ')} };
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyFn = (...args: any[]) => any;
export type Legacy = { [K in (typeof EXPORTS)[number] | 'label']: LegacyFn } & {
  loadDB(data: unknown): void;
  setProduct(p: string): void;
};

export function loadLegacy(data: unknown): Legacy {
  const ctx = vm.createContext({ SCHEMA });
  vm.runInContext(SCRIPT, ctx, { filename: 'legacy/src/app.js (rules)' });
  const L = (ctx as { L: Legacy }).L;
  L.loadDB(data);
  return L;
}
