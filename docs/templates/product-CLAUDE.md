# <Product name> (<ID>) — rules for this folder

- **Owner:** <name>  ·  **Neon branch:** proto/<slug>  ·  **Migrations:** db/migrations/<slug>/
- **Kind:** <Standalone | Base | Edition of … | Package of …>
- **Scope:** only files in this folder (and its migrations folder). Shared changes go through the core owner.
- **UI:** only from `@iotify/ui`; check `packages/ui/CATALOGUE.md` first; missing components go to the library, not here.
- **Data:** only through `@iotify/data` hooks; product tables in `proto_<slug>`, linked to `core`.
- **Rules:** Paid / Possible / Allowed come from `@iotify/core`; never re-implement them here.
- **Public exports** (`index.ts`): what other products, such as packages, may reuse from this folder.
- **Product notes:** <what this product does, who uses it, key screens, open questions>
