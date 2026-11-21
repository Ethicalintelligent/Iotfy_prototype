# IoTIFY prototype: rules for every Claude session

You are working on the IoTIFY prototype: EIT's multi-tenant IoT SaaS portfolio (product tree, dealers, companies, 23+ product apps). The people prompting you are often **not developers** (business analysts, designers, QA). Keep explanations plain, show results in the live preview, and never ask them to run commands themselves.

Read these before your first change in a session:
- `docs/ARCHITECTURE.md`: the target structure and how the pieces depend on each other.
- `docs/CORE_RULES.md`: database rules (Neon). They are binding.
- `REFACTOR_PLAN.md`: while the refactor is in progress, the step you are on.
- The `CLAUDE.md` inside the folder you are changing, if there is one.

## 1. Speed comes first
- The goal is **prompt → visible change in seconds**. Keep the Vite dev server running (`pnpm dev`) and the live preview open. Never replace hot reload with a build-and-publish loop for daily work.
- Make small, focused changes; let the preview show them; commit when a step works.
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
- Follow the design tokens (colours, type, spacing, radii). No hard-coded colours in products.

## 4. Data: only through `packages/data`
- Screens never write SQL and never call a database driver. They use hooks from `@iotify/data` (for example `useAssets(companyId)`, `useSaveRecord()`).
- `packages/data` has swappable connections: `neon-dev` (local: SQL runs in the Vite dev server with the connection string from `.env.local`), `claude-mcp` (demos published on claude.ai) and `api` (future Java backend).
- Use the core table and column names (`snake_case`) through generated TypeScript types. No renaming layers.
- **Editing model:** fields are read-only until **Edit**; **Save** writes, **Cancel** reverts. Button actions (Add, Send, Accept, Delete-after-confirm) save immediately. Show Neon's exact error text when a save fails. Re-read on navigation, so other roles' changes show up.

## 5. Database (Neon)
- Follow `docs/CORE_RULES.md`. Never change `core` structure; prototype tables go in `proto_<name>`; every change is a numbered, re-runnable file in `db/migrations/<name>/`.
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
- Commit after each working step with a clear message. Never rewrite published history.
- **Every developer has one branch, `dev/<name>`, and one Neon database, `iotfy_<name>`, shared by the developer and you (their Claude Code).** No shared development branch. Commit and push only to the branch in `git config iotify.branch`; never another one, never `main`, never `--no-verify`. **At the start of every session, follow `docs/DEVELOPER_BRANCHES.md`.** `main` changes only through a reviewed pull request.

## 10. Track every iteration (no exceptions, even a one-line CSS fix)
Every change is measured in `iterations/` (see `iterations/README.md`). You run these yourself; never ask the person to.
1. **Before reading code**: `pnpm iter start --type ui|functional|major --module "<module>" --req "<the request in plain words>"`. Note the ID it prints.
2. **Before editing**: `pnpm iter shot <ID> before <admin|partner|customer> <path> [--as <demo user id>]` for every screen the change affects (functional: each step of the workflow; major: every affected screen). Then `pnpm iter phase <ID> implementing`.
3. When you fix a bug you caused: `pnpm iter phase <ID> fixing` and `pnpm iter bug <ID> "<what broke>"`. When you ask the person something or wait for their feedback: `pnpm iter phase <ID> waiting`, and switch back when they answer.
4. **When checking it works**: `pnpm iter phase <ID> testing`, then the same `shot ... after ...` commands for the same screens.
5. If the person asks for a correction: `pnpm iter round <ID> "<what they asked>"` and carry on with the same ID. If they report a bug in a finished iteration: `pnpm iter bug <ID> "<bug>" --later`.
6. Commit (the iteration folder goes in the same commit), then `pnpm iter finish <ID>` (`--status Failed` or `Pending` if it isn't done) and `pnpm iter report`.
7. If something needed a developer by hand, record why: `pnpm iter manual <ID> "<reason>"`. Be honest; the report exists to measure, not to impress.

## 11. When unsure
If a request conflicts with these rules, explain the conflict in one or two plain sentences and suggest the compliant way. Don't silently break a rule.
