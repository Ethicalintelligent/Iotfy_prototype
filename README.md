# IoTIFY prototype

EIT's IoT SaaS portfolio prototype: one React codebase, three applications (Admin Console, Partner Portal, Customer Apps), every product of the product tree as its own app module, on the shared Neon database.

**Status:** the React structure has replaced the single-file prototype (Steps 0–14 of `REFACTOR_PLAN.md`; `legacy/` removed 20 Nov 2026, kept in Git history). Staging server: `docs/STAGING.md` (Vercel). Open item: protecting `main` (needs GitHub Pro).

| Start here | |
|---|---|
| `SETUP.md` | Install and open in the Claude desktop app (Windows) |
| `CLAUDE.md` | The rules Claude follows in this repository |
| `REFACTOR_PLAN.md` | The step-by-step conversion, with checks |
| `docs/ARCHITECTURE.md` | Stack, folders, dependency rules, data layer, UI library |
| `docs/PRODUCT_FOLDERS.md` | Product tree → folder map |
| `docs/LEGACY_PARITY.md` | Behaviour that must survive the conversion |
| `docs/CORE_RULES.md`, `docs/PROTOTYPE_GUIDE.md`, `docs/NEON_SETUP.md` | Database rules and workflow |

Old single-file prototype links (claude.ai, for reference only: no longer used since IT-0040, they point to tables that were replaced by gps / telematics; use the apps in this repository): Admin Console https://claude.ai/artifact/CfVd2sjdpo3KKrpqxADhoP · Partner Portal https://claude.ai/artifact/3xQ4nWvsvFb9npZ8wNXmrL · Customer Apps https://claude.ai/artifact/PZaaepdcvr5s1KiocxUYtm
