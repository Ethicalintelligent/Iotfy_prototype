# IoTIFY prototype

EIT's IoT SaaS portfolio prototype: one React codebase, three applications (Admin Console, Partner Portal, Customer Apps), every product of the product tree as its own app module, on the shared Neon database.

**Status:** starter kit. The working prototype is still the single-file version in `legacy/`; `REFACTOR_PLAN.md` turns it into the React structure step by step.

| Start here | |
|---|---|
| `SETUP.md` | Install and open in the Claude desktop app (Windows) |
| `CLAUDE.md` | The rules Claude follows in this repository |
| `REFACTOR_PLAN.md` | The step-by-step conversion, with checks |
| `docs/ARCHITECTURE.md` | Stack, folders, dependency rules, data layer, UI library |
| `docs/PRODUCT_FOLDERS.md` | Product tree → folder map |
| `docs/LEGACY_PARITY.md` | Behaviour that must survive the conversion |
| `docs/CORE_RULES.md`, `docs/PROTOTYPE_GUIDE.md`, `docs/NEON_SETUP.md` | Database rules and workflow |

Live legacy links (claude.ai): Admin Console https://claude.ai/artifact/CfVd2sjdpo3KKrpqxADhoP · Partner Portal https://claude.ai/artifact/3xQ4nWvsvFb9npZ8wNXmrL · Customer Apps https://claude.ai/artifact/PZaaepdcvr5s1KiocxUYtm
