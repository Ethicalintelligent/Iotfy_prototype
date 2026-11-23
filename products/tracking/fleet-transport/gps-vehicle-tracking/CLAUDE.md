# GPS Vehicle Tracking (N004) — rules for this folder

- **Owner:** not assigned yet (ask the core owner)  ·  **Neon branch:** proto/gps_vehicle_tracking  ·  **Migrations:** db/migrations/gps_vehicle_tracking/
- **Kind:** Base
- **Scope:** only files in this folder (and its migrations folder). Shared changes go through the core owner.
- **UI:** only from `@iotify/ui`; check `packages/ui/CATALOGUE.md` first; missing components go to the library, not here.
- **Data:** only through `@iotify/data` hooks; product tables in `proto_gps_vehicle_tracking`, linked to `core`.
- **Rules:** Paid / Possible / Allowed come from `@iotify/core`; never re-implement them here.
- **Public exports** (`index.ts`): `manifest`, `vehicleSpec` (used by the AIS 140 edition and ConstructSafe).
- **Approved design (IT-0012, Nov 2026):** the menu and screens follow the approved GPS Vehicle Tracking design (17 HTML files, `C:\Users\EIT\Desktop\vs`): Dashboard, Grid View, Map View, Tracking, Centralized Tracking, Alerts, Manage (8 modules), Reports, Groups, exactly as in `spec.ts` (`plainMenu`, `ownScreensFirst`). Built step by step: `screens/dashboard/` is done; the others show `screens/NextStep.tsx` until built. Drivers, Maintenance, Trips, Geofences and Commands stay in the code (reachable by URL) but are not in the menu.
- **Folders:** `shared/` (vehicle statuses and alert types, `useFleet`, formats), `demo/fleet.ts` (demo positions, statuses, day timelines and alerts, generated from the real vehicles; labelled on screen), `screens/<screen>/`.
- **Data in use:** vehicles are `core.assets` + `proto_vehicle.vehicle_details`; geofences `proto_vehicle.geofences` (with `zone_type`) and `vehicle_geofences`. These tables live in schema `proto_vehicle`, migrations in `db/migrations/vehicle/` (not `gps_vehicle_tracking/`). Demo fleet: Sample Company A (sign in as "Company A admin").
- **Product notes:** Live map, trips, geofences, drivers and commands for vehicle fleets. Screens use demo activity (labelled) until devices report. `manifest.ts` holds the id and scene, `spec.ts` the menu, dashboard, tables, reports and alert rules. Add-ons (Fuel N005, Temperature N006, Weight N007, AC N044, Seat belt N045) have no folders: their screens go here, shown only when bought (Step 11). The edition `gps-ais-140-solution-india/` has its own folder and CLAUDE.md.
