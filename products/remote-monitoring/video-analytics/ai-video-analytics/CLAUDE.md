# AI Video Analytics (N033) — rules for this folder

- **Owner:** not assigned yet (ask the core owner)  ·  **Neon branch:** proto/ai_video_analytics  ·  **Migrations:** db/migrations/ai_video_analytics/
- **Kind:** Base
- **Scope:** only files in this folder (and its migrations folder). Shared changes go through the core owner.
- **UI:** only from `@iotify/ui`; check `packages/ui/CATALOGUE.md` first; missing components go to the library, not here.
- **Data:** only through `@iotify/data` hooks; product tables in `proto_ai_video_analytics`, linked to `core`.
- **Rules:** Paid / Possible / Allowed come from `@iotify/core`; never re-implement them here.
- **Public exports** (`index.ts`): `manifest`, `videoSpec` (used by ConstructSafe).
- **Product notes:** Cameras with edge AI: AI events, PPE compliance, intrusion and counts. Ported legacy spec for now (demo activity, labelled); its full screens come in Step 11.
