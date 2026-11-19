// @iotify/core: IoTIFY business rules. Pure TypeScript with unit tests.
// Products call these; they never re-implement them (CLAUDE.md §6).
//
//   const rules = createRules({ nodes, bundle_rules, product_features, ... }); // core rows
//   rules.companyApps('C1');               // app access: bought directly or through a package
//   rules.featureCheck('A4', 'R3').rows;   // Paid / Possible / Allowed per feature
//   rules.priceLine('N004', 'Company', { tier: 'Pro', qty: 12 });
export { createRules } from './rules';
export type {
  Rules,
  Access,
  EditionChoices,
  ProductFeature,
  SensorOption,
  DataPointSupport,
  FeatureCheckRow,
  PriceLine,
  PriceLineOptions,
} from './rules';
export { has, lc, num, list, type CoreData, type CoreDataInput } from './data';
