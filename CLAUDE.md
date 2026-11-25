# IoTIFY prototype: rules for every Claude session

You are working on the IoTIFY prototype: EIT's multi-tenant IoT SaaS portfolio (product tree, dealers, companies, 23+ product apps). The people prompting you are often **not developers** (business analysts, designers, QA). Keep explanations plain, show results in the live preview, and never ask them to run commands themselves.

Read these before your first change in a session:
- `docs/ARCHITECTURE.md`: the target structure and how the pieces depend on each other.
- `docs/CORE_RULES.md`: database rules (Neon). They are binding.
- `docs/DESIGN_SYSTEM.md`: the EIT Smart Track Design System (colours, type, spacing, radii, shadows, layers, component look). Binding for every screen, component and generated HTML page, **except Customer Application UI built from a developer-provided design (§3a)**.
- `REFACTOR_PLAN.md`: while the refactor is in progress, the step you are on.
- The `CLAUDE.md` inside the folder you are changing, if there is one.

## 1. Speed comes first
- The goal is **prompt → visible change in seconds**. Keep the Vite dev server running (`pnpm dev`) and the live preview open. Never replace hot reload with a build-and-publish loop for daily work.
- Make small, focused changes; let the preview show them. Commit only when the person says so (see §9).
- Don't add tooling that slows the inner loop (heavy type-check-on-save, slow plugins, monolithic rebuilds).

## 2. Where code goes (dependency rules)
| Folder | May import from | Never imports |
|---|---|---|
| `apps/*` | `packages/*`, `products/*` (through each product's `index.ts`) | other apps |
| `products/<group>/…/<product>/` | `packages/*`, another product **only** through its `index.ts` public exports | another product's internal files |
| `packages/*` | other `packages/*` (no cycles) | `apps/*`, `products/*` |

- **One folder per app product**, following the product tree: see `docs/PRODUCT_FOLDERS.md`. Editions live inside their base's folder and **extend** its manifest. Packages (ConstructSafe, HealthSafe) **compose** their members' manifests. Add-ons live in their parent's folder.
- Each product folder has a `manifest.ts` (id, menu, screens, sign-in scene), `screens/`, optional `demo/` (demo activity), `index.ts` (public exports) and `CLAUDE.md` (owner and scope).
- **Only change the folder your task is about.** Changes to `packages/*` (core, data, ui, auth, app-kit) need the core owner's approval: say so in your summary.

## 3. UI: the EIT UI library first, never duplicates
- All UI comes from `@iotify/ui`. It re-exports the **EIT UI library** (its own Git repository, linked as a local workspace package, so changes hot-reload) plus IoTIFY-specific pieces.
- **Before building any UI, look in `packages/ui/CATALOGUE.md`.**
  - The component exists: use it.
  - It's missing or needs a new variant: add it to the library (or `packages/ui` until the EIT UI repository is linked), add its catalogue entry, then use it.
  - **Never** build buttons, inputs, tables, cards, chips, modals and so on inside a product folder.
- **Follow `docs/DESIGN_SYSTEM.md`.** Every colour, font size, font weight, spacing, radius, shadow and z-index is a token from it (code copy: `packages/ui/src/styles/tokens.css`). No raw values, no colour blends or new shades, nothing that is not in the Design System. A new value is added to the Design System first, then to `tokens.css` and `DESIGN_SYSTEM.md` in the same change.
- §3 applies to the Admin Console, the Partner Portal and shared packages. For the **Customer Application UI**, §3a takes precedence.

## 3a. Customer Application UI: the provided design is the single source of truth (strict)
Decided by the admin, 24 Nov 2026. Applies to `apps/customer-apps` and every product's customer screens.
- **Do not use** any predefined design system (including `docs/DESIGN_SYSTEM.md` and the `/ui` gallery), existing design templates or developer assumptions when implementing Customer Application UI.
- Whatever design reference the developer provides (Figma, HTML, screenshots, documents or other UI artifacts), implement it as accurately as possible.

**Mandatory rules**
1. Follow the provided design reference exactly.
2. Do not skip, remove or overlook any UI element, menu, button, field, icon or component.
3. Do not introduce your own design decisions or alternative layouts.
4. Do not replace the provided design with an existing design system or template.
5. Preserve all existing application functionality and business logic.
6. Ensure every interaction, navigation flow and responsive layout works as specified.
7. Compare the completed implementation against the original reference.
8. Verify every screen and interaction to ensure nothing is missing or incorrectly implemented.

**The approved design becomes React code (decided by the admin, 25 Nov 2026, IT-0036/IT-0037).** The developer gives the final approved design in any form: an **HTML page**, a **PDF**, **screenshots**, a **written explanation**, or a mix (e.g. a folder with a design PDF and a standalone HTML). In every case:
1. **Write React code for it** in the product's folder (§2) and set it as the screen in the app's menu. Never show the provided file itself in the app (no iframe, no served HTML page, no image of the design).
2. **Same UI as the approved design**: every element, text, icon, state, pop-up and interaction it shows or describes (mandatory rules above). Where several files are given, read them all; the PDF or screenshots show the approved look, the HTML gives exact sizes, colours and behaviour, and the written explanation decides when they differ.
3. **From HTML**: keep its markup and class names and scope its stylesheet with `node tools/design-import/scope-css.cjs <page.html> <out.css> <scope>` (so it cannot restyle the shell). **From a PDF, screenshots or a written explanation**: build the screens to match them; measure sizes and colours from the images.
4. **Data**: the design's demo data is replaced by real data through `@iotify/data` (§4); activity with no table stays demo and is labelled (§8).
5. **Check** the build against the provided files where the developer gave them (e.g. their Downloads folder), screen by screen, screenshots side by side (final rule below). PDF pages can be saved as images with `node tools/design-import/pdf-images.cjs <design.pdf> <out-folder>`.
6. **Don't keep the design files in the project**: once the React screens match, HTML/PDF/screenshots are not added, or are deleted if they were. Git history keeps earlier copies.
Example: GPS Vehicle Tracking `screens/<menu key>/Screen.tsx` with the shared `screens/smart-track/` kit (from HTML pages), and `screens/grid/` (from a design PDF plus a standalone HTML, IT-0037).

**Final rule:** the developer-provided design is the single source of truth. The implementation must match the reference without missing elements, unintended changes or functionality failures. The task is not complete until it has been checked against the original design, screen by screen and interaction by interaction (screenshots of the reference beside screenshots of the build).
- **Sidebar and top navbar never change (all applications, same style).** The side menu (Rail) and the top navbar (page header with search, notifications and profile) are the shared IoTIFY shell, identical in style in the Admin Console, the Partner Portal and the Customer Application. A provided design applies to the **page content only**: never replace, restyle or add a second sidebar or navbar from a reference, and never give one application or product its own shell look. If a reference brings its own sidebar or navbar, keep the IoTIFY shell and leave the reference's one out (no need to ask). Changes to the shell itself go through the core owner and apply to all applications at once.
- When the developer explicitly asks for a deviation from the reference (for example "use the partner portal's sidebar"), do it, and record it in the product's `CLAUDE.md` so later checks don't flag it.
- §2 (where code goes), §4 (data through `packages/data`), §5 (Neon) and §6 (business rules) still apply.

## 4. Data: only through `packages/data`
- Screens never write SQL and never call a database driver. They use hooks from `@iotify/data` (for example `useAssets(companyId)`, `useSaveRecord()`).
- `packages/data` has swappable connections: `neon-dev` (local: SQL runs in the Vite dev server with the connection string from `.env.local`), `claude-mcp` (demos published on claude.ai) and `api` (future Java backend).
- Use the core table and column names (`snake_case`) through generated TypeScript types. No renaming layers.
- **Editing model:** fields are read-only until **Edit**; **Save** writes, **Cancel** reverts. Button actions (Add, Send, Accept, Delete-after-confirm) save immediately. Show Neon's exact error text when a save fails. Re-read on navigation, so other roles' changes show up.

## 5. Database (Neon)
- Follow `docs/CORE_RULES.md`. **Before creating any table, ask which schema it goes in: core, telemetry, or a new one (and its name).** See `docs/TABLE_CREATION.md`.
- Never change `core` structure on shared branches; on a developer's own database `iotfy_<name>` they have full rights and you may change anything they ask, core included (CORE_RULES rule 2). Prototype tables go in `proto_<name>`; every change is a numbered, re-runnable file in `db/migrations/<name>/`.
- Demo data only. Never put real personal data in this database.
- Never print, commit or paste a connection string. It lives in `.env.local` only (git-ignored).

## 6. Business rules live in `packages/core`
Product tree, bundle rules (Includes / Needs / Optional), editions, packages, add-ons, Paid / Possible / Allowed, app access (bought directly or through a package), pricing. Pure TypeScript with unit tests. Products call these; they never re-implement them.

## 7. Three applications, one codebase
- `apps/admin-console` (EIT staff), `apps/partner-portal` (dealers), `apps/customer-apps` (companies: "My apps" plus every product's own sign-in).
- Each app lets in only its own roles. One sign-in per app; signing out returns to the sign-in page the user came in through.
- Support sessions cross apps through a logged, one-time link (view-only, reason required, max 2 h).

## 8. Honesty in demos
Generated demo activity (trips, alerts, readings) must be labelled as demo on the screen. Invented companies only, never real businesses or people.

## 9. Git
- **Commit only when the person asks** ("commit", "commit this", "save this step"). Never commit or push on your own after a task: finish the change, show it in the preview, and leave it uncommitted until they ask. Then commit with a clear message, only to their own branch (below). Never rewrite published history.
- **Every developer has one branch, `dev/<name>`, and one Neon database, `iotfy_<name>`, shared by the developer and you (their Claude Code).** No shared development branch. Commit and push only to the branch in `git config iotify.branch`; never another one, never `main`, never `--no-verify`. **At the start of every session, follow `docs/DEVELOPER_BRANCHES.md`.** Developers' work reaches `main` only through a reviewed pull request.
- **The admin works directly on `main`** (`git config iotify.role` is `admin`): when the admin says commit, commit and push straight to `main`, with no new branch per task and no pull request. Pull first (`git pull --ff-only`) and never force-push.

## 10. Track every iteration (no exceptions, even a one-line CSS fix)
Every change is measured in `iterations/` (see `iterations/README.md`). You run these yourself; never ask the person to.
1. **Before reading code**: `pnpm iter start --type ui|functional|major --module "<module>" --req "<the request in plain words>"`. Note the ID it prints.
2. **Before editing**: `pnpm iter shot <ID> before <admin|partner|customer> <path> [--as <demo user id>]` for every screen the change affects (functional: each step of the workflow; major: every affected screen). Then `pnpm iter phase <ID> implementing`.
3. When you fix a bug you caused: `pnpm iter phase <ID> fixing` and `pnpm iter bug <ID> "<what broke>"`. When you ask the person something or wait for their feedback: `pnpm iter phase <ID> waiting`, and switch back when they answer.
4. **Test once, at the end, not after every phase or round.** While implementing and correcting, rely on the live preview only. When the person says **commit**: `pnpm iter phase <ID> testing`, run the checks and the same `shot ... after ...` commands for the same screens, all in one go.
5. If the person asks for a correction: `pnpm iter round <ID> "<what they asked>"` and carry on with the same ID (no testing or after shots yet). If they report a bug in a finished iteration: `pnpm iter bug <ID> "<bug>" --later`.
6. Only after the person says **commit** and the test in step 4 passes: commit to their own branch (the iteration folder goes in the same commit), then `pnpm iter finish <ID>` (`--status Failed` or `Pending` if it isn't done) and `pnpm iter report`. Until then the iteration stays open.
7. If something needed a developer by hand, record why: `pnpm iter manual <ID> "<reason>"`. Be honest; the report exists to measure, not to impress.

## 11. When unsure
If a request conflicts with these rules, explain the conflict in one or two plain sentences and suggest the compliant way. Don't silently break a rule.
