# GPS Workforce Tracking (N013) — rules for this folder

- **Owner:** not assigned yet (ask the core owner)  ·  **Neon branch:** proto/gps_workforce_tracking  ·  **Migrations:** db/migrations/gps_workforce_tracking/
- **Kind:** Base
- **Scope:** only files in this folder (and its migrations folder). Shared changes go through the core owner.
- **UI:** only from `@iotify/ui`; check `packages/ui/CATALOGUE.md` first; missing components go to the library, not here.
- **Data:** only through `@iotify/data` hooks; product tables in `proto_gps_workforce_tracking`, linked to `core`.
- **Rules:** Paid / Possible / Allowed come from `@iotify/core`; never re-implement them here.
- **Public exports** (`index.ts`): `manifest`, `workforceSpec`.
- **Product notes:** Field staff with GPS: attendance, site visits, tasks and timesheets. Screens use demo activity (labelled on screen) until devices report; ported from the legacy prototype.
