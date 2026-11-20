# IoTIFY prototype: target architecture

Decided by Rafiq (EIT), 19 Nov 2026. The prototype is a **React** codebase in **one repository** that builds **three applications**. It talks to the Neon database directly in development (no backend, no security layer yet). The same structure later gets a Java backend, row-level security and SSL for staging and production, which are hosted in Saudi Arabia.

## Stack
| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript | Safer refactors; Claude and people read types as documentation |
| UI | React 18 | Matches production; screens carry over |
| Dev server / build | Vite | Hot reload in under a second: prompt → visible change |
| Monorepo | pnpm workspaces | Shared packages, linked locally, instant updates |
| Routing | React Router | Real URLs per app and product |
| Data fetching | TanStack Query | Caching, refetch on navigation, loading and error states |
| Database (dev) | Neon via `@neondatabase/serverless`, called from a Vite dev-server endpoint | Credentials stay out of the browser, even in development |
| Tests | Vitest (rules), Playwright (flows) | Fast unit tests; the same flow tests later run against production |
| Code rules | ESLint with `eslint-plugin-boundaries`, Prettier | Enforce the dependency rules automatically |

## Folders
```
iotify-prototype/
├─ apps/
│  ├─ admin-console/         EIT staff: catalogue, hardware, pricing, dealers
│  ├─ partner-portal/        dealers: customers, quotes, stock, installation, support
│  └─ customer-apps/         companies: sign-in, "My apps", product routes
├─ packages/
│  ├─ core/                  business rules (pure TS, unit-tested)
│  ├─ data/                  connections (neon-dev | claude-mcp | api), generated types, repositories, hooks
│  ├─ ui/                    @iotify/ui: re-exports the EIT UI library + IoTIFY pieces; CATALOGUE.md
│  ├─ auth/                  demo sign-in, sessions, roles, support sessions, white-label branding
│  ├─ app-kit/               shared screens: AppShell, Dashboard, Alerts, Reports, Rules, Assets, Users, Subscription
│  └─ illustrations/         sign-in scenes (SVG React components)
├─ products/                 one folder per app product, following the tree (docs/PRODUCT_FOLDERS.md)
│  ├─ tracking/fleet-transport/gps-vehicle-tracking/
│  │  ├─ manifest.ts · index.ts · CLAUDE.md · screens/ · demo/
│  │  └─ gps-ais-140-solution-india/        (edition: extends the base manifest)
│  ├─ tracking/… · remote-monitoring/…
│  └─ solutions/constructsafe/ · solutions/healthsafe/   (packages: compose member manifests)
├─ db/
│  ├─ setup/                 01_core_schema, 02_roles_and_rules, 03_core_data
│  └─ migrations/            core/ · demo/ · <prototype>/
├─ docs/                     this file, CORE_RULES, PROTOTYPE_GUIDE, PRODUCT_FOLDERS, LEGACY_PARITY
├─ legacy/                   the single-file prototype being replaced (read-only reference)
├─ CLAUDE.md · REFACTOR_PLAN.md · SETUP.md
```

## Dependency rules
Apps → products and packages. Products → packages, and other products only through their `index.ts`. Packages → packages (no cycles), never products or apps. ESLint blocks violations.

## The product manifest
```ts
// products/tracking/fleet-transport/gps-vehicle-tracking/manifest.ts
export const manifest = defineProduct({
  id: 'N004',                    // core.nodes.id: the name and kind come from the database
  scene: 'vehicle',              // sign-in illustration
  menu: [
    { section: 'Monitor', items: [
      { key: 'dash',   label: 'Dashboard', screen: () => import('./screens/Dashboard') },
      { key: 'map',    label: 'Live map',  screen: () => import('./screens/LiveMap'), feature: 'F003' },
      { key: 'alerts', label: 'Alerts',    screen: appKit.Alerts },
    ]},
    // …
  ],
});
// Edition: defineProduct({ id: 'N009', extends: vehicle.manifest, add: [...] })
// Package: defineProduct({ id: 'N051', members: [people, vehicle, video], add: [...] })
```
- `customer-apps` finds every manifest with `import.meta.glob('/products/**/manifest.ts')`. Adding a product means adding a folder; no shared file changes.
- A menu item with `feature` shows only when that App Feature is **Paid** (the company's subscription covers it) and **Allowed** (the role doesn't hide it). **Possible** (hardware) is shown per asset inside screens.
- Screens are lazy-loaded, so each product's code loads only when it's opened.

## Data layer
```
screens → hooks (useAssets, useSubscriptions, useSaveRecord…) → repositories → connection
                                                                         ├─ neon-dev   (Vite endpoint /__sql, .env.local)
                                                                         ├─ claude-mcp (window.claude.use('mcp'), published demos)
                                                                         └─ api        (Java backend, later)
```
- The connection is chosen by `VITE_DATA_MODE`. Published demos (one HTML file per app, claude-mcp): see `docs/PUBLISHING_DEMOS.md`.
- Saves run as one transaction per Save, upserting changed rows only and returning Neon's error text unchanged.
- Types come from the database: `pnpm db:types` reads `information_schema` and writes `packages/data/src/schema.gen.ts`.

## UI library
- The EIT UI library keeps its own Git repository. During development it's cloned beside this repo and linked into the workspace, so edits hot-reload everywhere. When it's published as a package later, only the link changes.
- `@iotify/ui` is the only UI import allowed in products. It re-exports the library and fills gaps until they're moved into the library.
- `packages/ui/CATALOGUE.md` lists every component (name, purpose, key props, example). Claude checks it before building any UI.

## Applications and routes
| App | Routes | Roles |
|---|---|---|
| admin-console | `/` sign-in · `/tree`, `/features`, `/hardware`, `/pricing`, `/dealers`, … | platform |
| partner-portal | `/` sign-in · `/companies`, `/quotes`, `/stock`, `/settings`, … | dealer |
| customer-apps | `/` sign-in + "My apps" · `/app/:product/*` · white-label `/d/:dealer/app/:product/*` · `/support/:sessionId` | company, fleet |

## Environments
| Environment | Database | Data | Where |
|---|---|---|---|
| Each prototype (person) | Neon branch `proto/<name>` | Demo | Laptop, Vite dev server |
| Development (merged) | Neon `main` | Demo | Laptop / shared dev host |
| Staging, production | Separate PostgreSQL, same migration files | Real (production) | Saudi Arabia, Java backend, RLS, SSL |
