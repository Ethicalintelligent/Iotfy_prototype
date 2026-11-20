# GPS Dashcam (N008) — rules for this folder

- **Owner:** not assigned yet (ask the core owner)  ·  **Neon branch:** proto/gps_dashcam  ·  **Migrations:** db/migrations/gps_dashcam/
- **Kind:** Base
- **Scope:** only files in this folder (and its migrations folder). Shared changes go through the core owner.
- **UI:** only from `@iotify/ui`; check `packages/ui/CATALOGUE.md` first; missing components go to the library, not here.
- **Data:** only through `@iotify/data` hooks; product tables in `proto_gps_dashcam`, linked to `core`.
- **Rules:** Paid / Possible / Allowed come from `@iotify/core`; never re-implement them here.
- **Public exports** (`index.ts`): `manifest`, `dashcamSpec`.
- **Product notes:** GPS plus AI dashcam: video events, clips, driver behaviour and coaching. Screens use demo activity (labelled on screen) until devices report; ported from the legacy prototype.
