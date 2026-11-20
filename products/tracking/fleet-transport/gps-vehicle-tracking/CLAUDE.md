# GPS Vehicle Tracking (N004) — rules for this folder

- **Owner:** not assigned yet (ask the core owner)  ·  **Neon branch:** proto/gps_vehicle_tracking  ·  **Migrations:** db/migrations/gps_vehicle_tracking/
- **Kind:** Base
- **Scope:** only files in this folder (and its migrations folder). Shared changes go through the core owner.
- **UI:** only from `@iotify/ui`; check `packages/ui/CATALOGUE.md` first; missing components go to the library, not here.
- **Data:** only through `@iotify/data` hooks; product tables in `proto_gps_vehicle_tracking`, linked to `core`.
- **Rules:** Paid / Possible / Allowed come from `@iotify/core`; never re-implement them here.
- **Public exports** (`index.ts`): `manifest`, `vehicleSpec` (used by the AIS 140 edition and ConstructSafe).
- **Product notes:** Live map, trips, geofences, drivers and commands for vehicle fleets. Screens use demo activity (labelled) until devices report. `manifest.ts` holds the id and scene, `spec.ts` the menu, dashboard, tables, reports and alert rules. Add-ons (Fuel N005, Temperature N006, Weight N007, AC N044, Seat belt N045) have no folders: their screens go here, shown only when bought (Step 11). The edition `gps-ais-140-solution-india/` has its own folder and CLAUDE.md.
