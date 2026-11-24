# Indoor People Tracking (N014) — rules for this folder

- **Owner:** not assigned yet (ask the core owner)  ·  **Neon branch:** proto/indoor_people_tracking  ·  **Migrations:** db/migrations/indoor_people_tracking/
- **Kind:** Base
- **Scope:** only files in this folder (and its migrations folder). Shared changes go through the core owner.
- **UI:** only from `@iotify/ui`; check `packages/ui/CATALOGUE.md` first; missing components go to the library, not here. Look and tokens follow `docs/DESIGN_SYSTEM.md` (no raw colours, sizes or weights; products pass hue names).
- **Data:** only through `@iotify/data` hooks; product tables in `proto_indoor_people_tracking`, linked to `core`.
- **Rules:** Paid / Possible / Allowed come from `@iotify/core`; never re-implement them here.
- **Public exports** (`index.ts`): `manifest`, `peopleSpec` (used by ConstructSafe and HealthSafe).
- **Product notes:** Floor view, presence by zone, visitors, roll call and contact tracing from badges. Ported legacy spec for now (demo activity, labelled); its full screens come in Step 11.
