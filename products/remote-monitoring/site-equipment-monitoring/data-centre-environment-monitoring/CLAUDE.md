# Data Centre Environment Monitoring (N027) — rules for this folder

- **Owner:** not assigned yet (ask the core owner)  ·  **Neon branch:** proto/data_centre_environment_monitoring  ·  **Migrations:** db/migrations/data_centre_environment_monitoring/
- **Kind:** Base
- **Scope:** only files in this folder (and its migrations folder). Shared changes go through the core owner.
- **UI:** only from `@iotify/ui`; check `packages/ui/CATALOGUE.md` first; missing components go to the library, not here.
- **Data:** only through `@iotify/data` hooks; product tables in `proto_data_centre_environment_monitoring`, linked to `core`.
- **Rules:** Paid / Possible / Allowed come from `@iotify/core`; never re-implement them here.
- **Public exports** (`index.ts`): `manifest`, `dataCentreSpec`.
- **Product notes:** Data centre environment: sensor readings, rack temperatures, leaks, smoke, doors and power. Screens use demo activity (labelled on screen) until devices report; ported from the legacy prototype.
