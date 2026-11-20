# ConstructSafe (N051) — rules for this folder

- **Owner:** not assigned yet (ask the core owner)  ·  **Neon branch:** proto/constructsafe  ·  **Migrations:** db/migrations/constructsafe/
- **Kind:** Package of Indoor People Tracking (N014), GPS Vehicle Tracking (N004) and AI Video Analytics (N033): composes their manifests
- **Scope:** only files in this folder (and its migrations folder). Shared changes go through the core owner.
- **UI:** only from `@iotify/ui`; check `packages/ui/CATALOGUE.md` first; missing components go to the library, not here.
- **Data:** only through `@iotify/data` hooks; product tables in `proto_constructsafe`, linked to `core`.
- **Rules:** Paid / Possible / Allowed come from `@iotify/core`; never re-implement them here.
- **Public exports** (`index.ts`): `manifest`.
- **Product notes:** Construction-site safety. The members' menus are merged; this folder adds the Safety section (workers on site, PPE checks, danger zones, gas readings, work permits) and its own dashboard. Change a member's screens in that member's folder. Sign-in check: Al Bina site admin.
