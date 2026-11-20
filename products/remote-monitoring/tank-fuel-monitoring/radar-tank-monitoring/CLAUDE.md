# Radar Tank Monitoring (N030) — rules for this folder

- **Owner:** not assigned yet (ask the core owner)  ·  **Neon branch:** proto/radar_tank_monitoring  ·  **Migrations:** db/migrations/radar_tank_monitoring/
- **Kind:** Base
- **Scope:** only files in this folder (and its migrations folder). Shared changes go through the core owner.
- **UI:** only from `@iotify/ui`; check `packages/ui/CATALOGUE.md` first; missing components go to the library, not here.
- **Data:** only through `@iotify/data` hooks; product tables in `proto_radar_tank_monitoring`, linked to `core`.
- **Rules:** Paid / Possible / Allowed come from `@iotify/core`; never re-implement them here.
- **Public exports** (`index.ts`): `manifest`, `tankSpec`.
- **Product notes:** Radar level sensors on tanks: levels, deliveries, reconciliation and re-order forecast. Screens use demo activity (labelled on screen) until devices report; ported from the legacy prototype.
