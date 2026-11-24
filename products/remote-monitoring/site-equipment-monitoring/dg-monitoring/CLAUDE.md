# DG Monitoring (N026) — rules for this folder

- **Owner:** not assigned yet (ask the core owner)  ·  **Neon branch:** proto/dg_monitoring  ·  **Migrations:** db/migrations/dg_monitoring/
- **Kind:** Base
- **Scope:** only files in this folder (and its migrations folder). Shared changes go through the core owner.
- **UI:** only from `@iotify/ui`; check `packages/ui/CATALOGUE.md` first; missing components go to the library, not here. Look and tokens follow `docs/DESIGN_SYSTEM.md` (no raw colours, sizes or weights; products pass hue names).
- **Data:** only through `@iotify/data` hooks; product tables in `proto_dg_monitoring`, linked to `core`.
- **Rules:** Paid / Possible / Allowed come from `@iotify/core`; never re-implement them here.
- **Public exports** (`index.ts`): `manifest`, `dgSpec`.
- **Product notes:** Diesel generators: status, run hours, fuel events and maintenance. Screens use demo activity (labelled on screen) until devices report; ported from the legacy prototype.
