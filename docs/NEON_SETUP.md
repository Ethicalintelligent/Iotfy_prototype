# IoTIFY prototypes on Neon: setup record

Set up 17 Nov 2026. This is the single source of truth for all IoTIFY prototypes and the development build.

| Item | Value |
|---|---|
| Neon project | **iotify-prototypes** (id `empty-sea-69531006`), AWS US East 2 (Ohio), free plan, PostgreSQL 18 |
| Database | `neondb` |
| Main branch | `main` (id `br-polished-moon-bdwryps8`): core + merged prototypes. Individual prototypes don't build here. |
| Example prototype | `proto/sample` (id `br-quiet-feather-bd0xkiqx`), schema `proto_sample` |

Demo data only. Staging and production run separately, in Saudi Arabia.

## What is on main
- **Schema `core`:** 38 tables (the IoTIFY target design, including HealthSafe, white-label resellers and support sessions). It matches `db/setup/01_core_schema.sql`, plus `db/setup/03_core_data.sql` and `db/migrations/demo/001_demo_customers.sql` for data.
- **Demo customers:** 14 companies, 19 users, 55 assets, 57 devices, 60 subscriptions, so every product's sign-in has a working demo account.
- **Roles:**
  - `iotify_core_admin` owns the core.
  - `iotify_prototyper` can read, link to and add rows to the core, and can create only in its own `proto_` schemas.
- **Function `public.new_prototype(name)`** creates `proto_<name>`.
- **Table `public.merge_log`** records merges.

## Tested on Neon (17 Nov 2026)
- As `iotify_prototyper`, on `proto/sample`: created `proto_sample`, added a table linked to `core.assets` and `core.zones`, inserted rows and joined them to core data.
- The same role was **refused** when it tried to alter, create or drop core tables.

## Connection strings
Get them from the Neon console: **Connect** → pick the branch → pick the role → copy the connection string. Put it in `.env.local` only (never in Git, never in chat, never in docs).

## Free plan limits to watch
- **10 branches per project.** Main plus up to 9 prototypes at a time. Delete a branch once it's merged. A team of 10 needs a paid plan.
- **1 GB storage per project.**
- **Monthly compute hours.** Computes sleep when idle.
