# @iotify/core

IoTIFY business rules: pure TypeScript, no React, no database. Products call these and never re-implement them (CLAUDE.md §6).

```ts
import { createRules } from '@iotify/core';

const rules = createRules({ nodes, bundle_rules, product_features, subscriptions /* …core rows */ });
rules.companyApps('C1'); // app access: bought directly or through a package
rules.featureCheck('A4', 'R3').rows; // Paid / Possible / Allowed per feature, with reasons
rules.priceLine('N004', 'Company', { tier: 'Pro', qty: 12 }); // unit price and the rules applied
```

Pass only the tables a rule needs (missing tables count as empty). Rows come straight from `@iotify/data` hooks, with the database's own column names.

| Area | Functions |
|---|---|
| Product tree | `children`, `pathOf`, `groupPath`, `descendants`, `isEdition`, `baseOf`, `editionsOf`, `marketsOf`, `marketOk`, `isPackage`, `rootOf`, `entryProducts`, `packageMembers`, `defaultDeviceModel` |
| Bundles | `includesOf`, `includeChoices`, `choicesOf`, `needsOf`, `optionalOf`, `grantedBy`, `withNeeds`, `covers` |
| Features | `featuresOf`, `featuresOfSet`, `dataPointsOf`, `missingDataPoints`, `missingText` |
| Hardware | `dataPointOnModel`, `infrastructureFor`, `evalModel`, `suggestHardware`, `missingCertifications` |
| Sites and assets | `siteZones`, `zonePath`, `siteGateways`, `installedOn` |
| Paid / Possible / Allowed | `access`, `permissions`, `featureCheck` |
| Companies and apps | `companyProducts`, `companyApps`, `myApps`, `dealerProducts`, `productFamily`, `productAssetTypes`, `typesFor` |
| Pricing | `planFor`, `inBand`, `priceLine`, `usesItemBands`, `hardwarePrice`, `quoteHardwareGroups` |

## Tests

- `test/rules.test.ts`: each rule on a small invented catalogue, including cases the demo data lacks (trial subscriptions, unset "required", discounts, alt groups, sites without gateways).
- `test/parity.test.ts`: every rule against the **legacy app** on the real demo data, for every node, product, feature, device model, asset × role, company, dealer, price plan and quote. The legacy code is loaded unchanged from `legacy/src/app.js` (`test/legacy.ts`); delete these with `legacy/`.
- `test/fixtures/demo-core.json`: snapshot of the demo data on Neon `main`. Refresh with `pnpm --filter @iotify/core snapshot` after the demo data changes.

Live check: http://localhost:5175/debug/rules shows each demo company's apps from live Neon data.
