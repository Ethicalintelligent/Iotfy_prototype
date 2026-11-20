# GPS AIS 140 Solution (India) (N009) — rules for this folder

- **Owner:** not assigned yet (ask the core owner)  ·  **Neon branch:** proto/gps_ais_140_solution_india  ·  **Migrations:** db/migrations/gps_ais_140_solution_india/
- **Kind:** Edition of GPS Vehicle Tracking (N004): extends its manifest
- **Scope:** only files in this folder (and its migrations folder). Shared changes go through the core owner.
- **UI:** only from `@iotify/ui`; check `packages/ui/CATALOGUE.md` first; missing components go to the library, not here.
- **Data:** only through `@iotify/data` hooks; product tables in `proto_gps_ais_140_solution_india`, linked to `core`.
- **Rules:** Paid / Possible / Allowed come from `@iotify/core`; never re-implement them here.
- **Public exports** (`index.ts`): `manifest`.
- **Product notes:** Everything GPS Vehicle Tracking has, plus Panic & ERSS (demo table) and Certificates (real data from `core.certificates`, read-only; dealers issue them in the partner portal). Change the base's screens in the base folder, not here. Sign-in check: Company India admin.
