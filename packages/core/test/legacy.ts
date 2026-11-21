// Loads the legacy business rules into a sandbox for the parity tests. The code is a frozen copy
// (fixtures/legacy-rules.js) of what these tests used to read from legacy/src/app.js before
// legacy/ was removed (20 Nov 2026), so the new rules keep being checked against the old ones.
// It fills the legacy in-memory DB from core rows the way the legacy app read Neon (readSheet).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const FIX = path.join(import.meta.dirname, 'fixtures');
const SCRIPT = fs.readFileSync(path.join(FIX, 'legacy-rules.js'), 'utf8');
const SCHEMA = JSON.parse(fs.readFileSync(path.join(FIX, 'legacy-schema.json'), 'utf8'));

/** The legacy functions the parity tests call (the frozen script exports them as globalThis.L). */
export const LEGACY_EXPORTS = [
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyFn = (...args: any[]) => any;
export type Legacy = { [K in (typeof LEGACY_EXPORTS)[number] | 'label']: LegacyFn } & {
  loadDB(data: unknown): void;
  setProduct(p: string): void;
};

export function loadLegacy(data: unknown): Legacy {
  const ctx = vm.createContext({ SCHEMA });
  vm.runInContext(SCRIPT, ctx, { filename: 'fixtures/legacy-rules.js' });
  const L = (ctx as { L: Legacy }).L;
  L.loadDB(data);
  return L;
}
