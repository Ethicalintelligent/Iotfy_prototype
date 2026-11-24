# RFID Inventory Management (N048) — rules for this folder

- **Owner:** not assigned yet (ask the core owner)  ·  **Neon branch:** proto/rfid_inventory_management  ·  **Migrations:** db/migrations/rfid_inventory_management/
- **Kind:** Base
- **Scope:** only files in this folder (and its migrations folder). Shared changes go through the core owner.
- **UI:** only from `@iotify/ui`; check `packages/ui/CATALOGUE.md` first; missing components go to the library, not here. Look and tokens follow `docs/DESIGN_SYSTEM.md` (no raw colours, sizes or weights; products pass hue names).
- **Data:** only through `@iotify/data` hooks; product tables in `proto_rfid_inventory_management`, linked to `core`.
- **Rules:** Paid / Possible / Allowed come from `@iotify/core`; never re-implement them here.
- **Public exports** (`index.ts`): `manifest`, `rfidSpec`.
- **Product notes:** RFID inventory: gate movements, inventory, stock counts and readers. Its add-on RFID Smart Gate (N049) has no folder: its screens go here, shown only when bought. Screens use demo activity (labelled on screen) until devices report; ported from the legacy prototype.
