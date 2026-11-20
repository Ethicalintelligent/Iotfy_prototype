# Refactor plan: single-file prototype → React monorepo

**How to use this file (for Claude):** do one step at a time, on a branch named `refactor/<step>`. At the end of each step, run its check, show the result in the live preview, commit, merge into `main`, then tick the box here and commit that too. Don't start the next step until the current one passes its check. Tell the user in two or three plain lines what changed and what to look at.

The legacy prototype in `legacy/` is the **reference for behaviour and content**. Port behaviour faithfully (see `docs/LEGACY_PARITY.md`); don't copy its code style. It's one file of global functions; the new code is typed, modular React.

---

## Step 0: Snapshot
- [x] `git init`, commit everything as it is: "Starter kit: legacy prototype + plan".
- **Check:** `git log` shows one commit.

## Step 1: Workspace skeleton
- [x] pnpm workspace with `apps/admin-console`, `apps/partner-portal`, `apps/customer-apps` (Vite + React + TS) and empty `packages/{core,data,ui,auth,app-kit,illustrations}`.
- [x] Shared `tsconfig`, ESLint (with `eslint-plugin-boundaries` encoding the rules in CLAUDE.md §2), Prettier.
- [x] Root scripts: `pnpm dev` (all three apps at once, ports 5173/5174/5175), `pnpm dev:customer` and so on, `pnpm test`, `pnpm lint`.
- **Check:** `pnpm dev` shows three "hello" pages; a deliberate wrong import is flagged by lint.

## Step 2: Design system → `packages/ui`
- [x] Port the design tokens and base components from `legacy/src/template.html` (CSS) and the markup patterns in `legacy/src/app.js`: Button, IconButton, Card, Chip, Table, Field (text, select, checkbox, date, colour, file), Modal, Toast, Popover, PageHeader (one line, ⓘ for descriptions), KPI tile, BarChart, EmptyState, Rail (56 px, opens on hover), SearchPalette (Ctrl+K), EditBar.
- [x] Write `packages/ui/CATALOGUE.md` (name, purpose, key props, example).
- [x] Leave a clear place to link the **EIT UI library** later: `@iotify/ui` re-exports it first, then local pieces.
- **Check:** a `/ui` gallery route in customer-apps shows every component.

## Step 3: Data layer → `packages/data`
- [x] `pnpm db:types` generates `schema.gen.ts` from Neon (`core` schema).
- [x] Connections: `neon-dev` (a Vite dev-server endpoint runs SQL with `DATABASE_URL` from `.env.local`) and `claude-mcp` (port of `neonCall` and `readSheet` from legacy lines ~128–180).
- [x] Repositories and hooks for every core table; `useSaveRecord`/`useSaveBatch` (one transaction, Neon's error text kept).
- [x] Re-read on navigation and on returning to the tab.
- **Check:** a debug page lists row counts for every core table from Neon.

## Step 4: Business rules → `packages/core`
- [x] Port and unit-test: product tree helpers, `grantedBy`, includes/needs/optional, editions, packages and members, add-ons, `featuresOf`, `missingDPs`, Paid / Possible / Allowed (`featureCheck`), `companyApps` (bought directly or through a package), `productAssetTypes`, `typesFor`, pricing rules (legacy ~226–400).
- **Check:** `pnpm test` passes; results match the legacy app for the demo companies.

## Step 5: Sign-in, sessions, roles → `packages/auth`
- [x] Demo sign-in (email or pick a demo account), one session per app, sign-out back to the entry page used.
- [x] Roles per app, the role switcher (demo only), white-label branding (reseller type, brand name, colour, logo).
- [x] Support sessions: request, reason, view-only, a one-time cross-app link (`/support/:id`), 2 h limit, logged.
- **Check:** the legacy tests `tsession`, `tsignout`, `t3apps`, `tsaas` re-expressed as Playwright tests pass.

## Step 6: Shared screens → `packages/app-kit`
- [x] AppShell (rail, page header, top-right search, notifications and avatar), Edit → Save / Cancel with the leave guard, record-level Edit/Delete, actions beside content (no buttons in the title line).
- [x] Generic screens: Dashboard, Map/Floor view, Alerts, Reports, Rules, Assets, Sites, Users, My subscription, Devices & features (legacy `xPage`, `xDash`, `xMap`, `pLive`).
- **Check:** the gallery shows each screen with demo data.

## Step 7: Admin console
- [x] Port the platform pages: product tree (with + Group / + Product beside the search), app features, data points, interfaces, networks, hardware, pricing, roles, dealers (reseller type, support), lookups, data source.
- **Check:** Playwright `tedit`/`trec`/`tcross` equivalents pass against a Neon branch.

## Step 8: Partner portal
- [x] Dealer pages: companies (+ customer support), quotes, subscriptions, stock, assets & installation, sites, certificates, users, compatibility, settings (brand, branded sign-in links, EIT support access).

## Step 9: Customer apps shell
- [ ] Common sign-in with the product entry list, "My apps", the not-in-your-apps page, the app switcher, white-label routes, the support route.
- [ ] Product registry via `import.meta.glob`.

## Step 10: Reference products
- [ ] `products/tracking/fleet-transport/gps-vehicle-tracking/` (port the `vehicle` spec in `XS`, legacy ~807).
- [ ] Its edition `gps-ais-140-solution-india/` (extends: Panic & ERSS, certificates).
- [ ] `products/solutions/constructsafe/` (package: composes indoor people + vehicle + video, adds workers, PPE, zones, gas, permits).
- [ ] A `CLAUDE.md` in each product folder, from `docs/templates/product-CLAUDE.md`.
- **Check:** sign in as Al Bina site admin and Company India admin; every menu screen renders.

## Step 11: Remaining products
- [ ] One folder per row of `docs/PRODUCT_FOLDERS.md`, porting each family from `XS` and the scenes from `SCENES`.
- **Check:** the `tallapps` equivalent passes: every product, every screen, for its demo customer.

## Step 12: Illustrations
- [ ] Port `artVehicle`, `artConstruct` and `SCENES` into `packages/illustrations` as React components (`<SignInScene name="vehicle" />`); respect reduced motion.

## Step 13: Demo publishing (optional)
- [ ] `pnpm build:demo` builds each app as a single HTML file (`vite-plugin-singlefile`, `VITE_DATA_MODE=claude-mcp`) so it can be published as a claude.ai link.

## Step 14: GitHub
- [ ] Push to the private repository; protect `main`; add `CODEOWNERS` (`packages/**` and `db/migrations/core/**` → core owner); CI runs lint, unit tests and the build on every pull request.
- [ ] Delete `legacy/` once `docs/LEGACY_PARITY.md` is fully ticked.
