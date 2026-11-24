# GPS Asset Tracking (N019) — rules for this folder

- **Owner:** not assigned yet (ask the core owner)  ·  **Neon branch:** proto/gps_asset_tracking  ·  **Migrations:** db/migrations/gps_asset_tracking/
- **Kind:** Base
- **Scope:** only files in this folder (and its migrations folder). Shared changes go through the core owner.
- **UI:** only from `@iotify/ui`; check `packages/ui/CATALOGUE.md` first; missing components go to the library, not here. Look and tokens follow `docs/DESIGN_SYSTEM.md` (no raw colours, sizes or weights; products pass hue names).
- **Data:** only through `@iotify/data` hooks; product tables in `proto_gps_asset_tracking`, linked to `core`.
- **Rules:** Paid / Possible / Allowed come from `@iotify/core`; never re-implement them here.
- **Public exports** (`index.ts`): `manifest`, `assetSpec`.
- **Product notes:** GPS trackers on movable assets: movements, geofences and tracker battery. Its edition GPS ATM Tracking has its own folder inside this one. Screens use demo activity (labelled on screen) until devices report; ported from the legacy prototype.
