# IoTIFY prototypes: core database rules

Every Claude session that works on an IoTIFY prototype database must follow these rules. They apply to the Neon project **iotify-prototypes**.

## The layout
- **Branch `main`** is the single source of truth: the core schema plus every prototype that has been merged. **Nobody builds on `main`.**
- **One branch per prototype**, created from `main` and named `proto/<name>`, for example `proto/indoor-asset-tracking`.
- **One branch per developer**, created from `main` and named `iotfy_<name>`, for example `iotfy_nadim`, keeping only the `neondb` database. The developer and their Claude Code use it and nobody else (`docs/DEVELOPER_BRANCHES.md`).
- **Three schemas** (admin, 26 Nov 2026, IT-0042, migration 011; `telematics` was removed and its tables moved). Each table exists in one schema only; apps read all three through `@iotify/data`.
  - **`core`**: top-level tables. Product tree and features (`nodes`, `features`, `product_*`, `bundle_rules`, `solution`), companies and users (`company`, `branch`, `app_user`, `dealers`, `roles`), assets (`tracked_asset`, `asset_group`, `asset_types`, `zones`, `operators`), devices and models (`device`, `sim_card`, `device_model`, `device_manufacturer`, `device_protocol`, sensors, interfaces), networks and data points, prices, quotes, subscriptions, lookups, documents, support sessions. Tables from the admin application (QA) keep number ids from the database (old text id in `legacy_id`; `useNextIds` reserves a new id).
  - **`gps`**: detail and setup tables. Asset details, one row per asset (`vehicle_details`, `person_details`, `bin_details`, `generator_details`, `room_details`, `tank_details`, `atm_details`…), personal details (`user_profiles`), `vehicle_io`, `asset_identifiers`, `certificates`, alert setup (`alert_rules`, `alert_configs`, `alert_recipients`…), geofences, tickets.
  - **`telemetry`**: big tables only. Positions (`vehicle_position` = every device report with its event and IO data, `asset_positions`, `person_positions`), events, `alerts`, `alert_notifications`, readings, live states (one row per asset with the last values; every solution has its own live state table), hourly / daily summaries, activity logs (`rfid_reads`, `attendance_punches`, `dashcam_media`, `dispense_transactions`, `student_boardings`).
- **No prototype schemas** (admin, 25 Nov 2026, IT-0039): there is no `proto_<name>` area any more. Every table, a prototype's too, lives in `core`, `gps` or `telemetry`. The former `proto_vehicle` was merged into core (core change request 003).

## Rules
1. **Start every SQL session with the right role.** On a developer's own branch `iotfy_<name>`: `SET ROLE iotify_dev;` (full rights, see the exception in rule 2). On every other branch: `SET ROLE iotify_prototyper;`, which applies the lock: core tables can be read and linked, but not altered.
2. **Never change core structure on shared branches.** No `CREATE`, `ALTER` or `DROP` on anything in `core`, and no new columns, on `main`, `staging`, `test/*` or `proto/*`. The database refuses this under the prototyper role, so don't try to work around it.
   **Exception: the developer's own branch.** On `iotfy_<name>`, the developer has full rights (granted at setup, see `docs/DEVELOPER_BRANCHES.md`) and may create, alter or drop anything, core included. When the developer asks for it, Claude Code does it directly, with no core change request needed. Claude Code still writes it as a numbered file in `db/migrations/core/` and tells the developer in one line that core changes stay on their branch: to reach `main` they need a core change request (rule 9).
3. **Ask before every new table which schema it goes in: core or telemetry** (see `docs/TABLE_CREATION.md`). Never create a prototype schema (`proto_<name>`); `public.new_prototype()` is no longer used. On a shared branch a new table is a core change (rule 2): write a core change request (rule 9). On your own branch you may create it directly (rule 2 exception); it reaches `main` through a core change request.
4. **Extend, don't copy.** Use foreign keys to link to core rows, for example `asset_id text REFERENCES core.assets(id)`. Need an extra attribute on a core table? Add a column, or a side table in core such as `core.vehicle_details (asset_id PK → core.assets)`, through a core change request.
5. **Core data on your branch is for testing.** You may add or edit sample rows in core tables on your own branch. They are **not** merged. If the prototype needs core rows to exist, such as a new product or app feature, put them in a seed file for review (see rule 7).
6. **Never connect a prototype to `main`.** Read and write only your own branch. The one exception is the **IoTIFY Admin Console in this repository** (`apps/admin-console`) and the merged development build, which maintain core *data* on `main`: products, features, hardware, prices and so on. They change rows only, never table structure. The old single-file Admin Console on claude.ai (artifact CfVd2sjdpo3KKrpqxADhoP) is **no longer used** (the admin's decision, 25 Nov 2026, IT-0040): it points to tables that no longer exist. Don't use it or update it.
7. **Keep every change as a numbered SQL file** in `db/migrations/core/` or `db/migrations/telemetry/`, for example `008_<what>.sql`. Each file must run cleanly on a fresh copy of `main` and be safe to run twice (`IF NOT EXISTS`). These files are what gets merged, not the branch.
8. **Naming:** tables and columns in `snake_case`; IDs are `text` primary keys like the core (UUIDs in production).
9. **Need a core change on `main`?** Don't make it there yourself (you may try it first on your own branch, see rule 2). Write a short **core change request**: what, why, and which prototypes it affects. Send it to the core owner (EIT). Once approved, it goes to `main` as a core migration, and every branch refreshes.
10. **Business logic follows the handover document.** Examples: Paid / Possible / Allowed; editions and packages; the latency and downlink checks. If a prototype disagrees with the document, raise it; don't fork the rules.

## How an approved core change is made
1. Write it as the next numbered file in `db/migrations/core/`, for example `003_<what>.sql`. It must only add (no drops or renames unless the owner approves a breaking change), be safe to run twice, and run as `iotify_core_admin`.
2. Apply it to `main` and add a row to `public.merge_log`.
3. Branches created before the change don't have it: run the file on them, or reset them from `main`.
4. **Leave `db/setup/01_core_schema.sql` as it is.** To build a fresh database, run `db/setup/01`, `02`, `03`, then every file in `db/migrations/core/` in number order.

Change 002 (18 Nov 2026: white-label resellers, support access, support sessions) is the one exception. It was folded into `01_core_schema.sql` at the owner's request, and the 002 file is kept only as history.

## Why rule 1 matters
The Neon connector runs SQL as the project owner, which can do anything. `SET ROLE iotify_prototyper` drops to the locked role for that session. Branch isolation is the second safety net: even a mistake on your branch never reaches `main`.
