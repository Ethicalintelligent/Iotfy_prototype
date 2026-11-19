# IoTIFY prototypes: core database rules

Every Claude session that works on an IoTIFY prototype database must follow these rules. They apply to the Neon project **iotify-prototypes**.

## The layout
- **Branch `main`** is the single source of truth: the core schema plus every prototype that has been merged. **Nobody builds on `main`.**
- **One branch per prototype**, created from `main` and named `proto/<name>`, for example `proto/indoor-asset-tracking`.
- **Schema `core`** holds the shared IoTIFY tables: product tree, features, data points, hardware, networks, dealers, companies, assets, sites, subscriptions, quotes, support sessions and so on. Section 11 of the handover document describes them.
- **Schema `proto_<name>`** is each prototype's own area, inside its own branch.

## Rules
1. **Start every SQL session with `SET ROLE iotify_prototyper;`.** That role applies the lock: core tables can be read and linked, but not altered.
2. **Never change core structure.** No `CREATE`, `ALTER` or `DROP` on anything in `core`, and no new columns. The database refuses this under the prototyper role, so don't try to work around it.
3. **New tables go only in your own `proto_<name>` schema.** Create the schema with `SELECT public.new_prototype('<name>');`.
4. **Extend, don't copy.** Use foreign keys to link to core rows, for example `asset_id text REFERENCES core.assets(id)`. Need an extra attribute on a core table? Make a side table, such as `proto_x.asset_extra (asset_id PK → core.assets)`.
5. **Core data on your branch is for testing.** You may add or edit sample rows in core tables on your own branch. They are **not** merged. If the prototype needs core rows to exist, such as a new product or app feature, put them in a seed file for review (see rule 7).
6. **Never connect a prototype to `main`.** Read and write only your own branch. The one exception is the **IoTIFY Admin Console** (https://claude.ai/artifact/CfVd2sjdpo3KKrpqxADhoP) and the merged development build, which maintain core *data* on `main`: products, features, hardware, prices and so on. They change rows only, never table structure.
7. **Keep every change as a numbered SQL file** in `db/migrations/<name>/`, for example `001_tables.sql` and `002_seed.sql`. Each file must run cleanly on a fresh copy of `main` and be safe to run twice (`IF NOT EXISTS`). These files are what gets merged, not the branch.
8. **Naming:** tables and columns in `snake_case`; IDs are `text` primary keys like the core (UUIDs in production).
9. **Need a core change?** Don't make it. Write a short **core change request**: what, why, and which prototypes it affects. Send it to the core owner (EIT). Once approved, it goes to `main` as a core migration, and every branch refreshes.
10. **Business logic follows the handover document.** Examples: Paid / Possible / Allowed; editions and packages; the latency and downlink checks. If a prototype disagrees with the document, raise it; don't fork the rules.

## How an approved core change is made
1. Write it as the next numbered file in `db/migrations/core/`, for example `003_<what>.sql`. It must only add (no drops or renames unless the owner approves a breaking change), be safe to run twice, and run as `iotify_core_admin`.
2. Apply it to `main` and add a row to `public.merge_log`.
3. Branches created before the change don't have it: run the file on them, or reset them from `main`.
4. **Leave `db/setup/01_core_schema.sql` as it is.** To build a fresh database, run `db/setup/01`, `02`, `03`, then every file in `db/migrations/core/` in number order.

Change 002 (18 Nov 2026: white-label resellers, support access, support sessions) is the one exception. It was folded into `01_core_schema.sql` at the owner's request, and the 002 file is kept only as history.

## Why rule 1 matters
The Neon connector runs SQL as the project owner, which can do anything. `SET ROLE iotify_prototyper` drops to the locked role for that session. Branch isolation is the second safety net: even a mistake on your branch never reaches `main`.
