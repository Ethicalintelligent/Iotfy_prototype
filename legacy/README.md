# Legacy single-file prototype (reference only)

The prototype as of 19 Nov 2026, before the React refactor. **Read it; don't extend it.** It's deleted at the end of the refactor (see `REFACTOR_PLAN.md`, step 14).

| File | What it is |
|---|---|
| `src/app.js` | All logic, about 1,950 lines of global functions |
| `src/template.html` | Page shell and all CSS (the design tokens live here) |
| `src/schema.json` | Table and field definitions the legacy app used (app names ↔ core columns) |
| `src/seed.json` | Offline copy of the demo data |
| `src/build.py` | Builds `index.html` plus the three app variants |
| `build/*.html` | The three published apps; open them in a browser to see the behaviour (offline they show the seed data) |
| `tests/*.js` | jsdom + Postgres behaviour tests; re-express them as Playwright tests |

## Where things are in `src/app.js` (approximate line numbers)
| Topic | Lines |
|---|---|
| Offline seed migration | ~98 |
| Neon connection, read, save statements, save | ~128–200 |
| Bundle rules, features, data points (`grantedBy`, `featuresOf`, `missingDPs`) | ~226–240 |
| Paid / Possible / Allowed (`featureCheck`) | ~288 |
| Roles, apps per role, product mode, `companyApps`, `productFamily` | ~360–420 |
| Sign-in entry list, sign-in scenes (`artVehicle`, `SCENES`, `heroArt`) | ~550–790 |
| Product app specs (`XS`: menus, KPIs, tables per product family) | ~807–990 |
| Product screens (`xPage`, `xDash`, `xMap`) | ~989–1030 |
| Sign-in page, shell, product tree | ~1030–1130 |
| My apps, support, dealer settings | ~1357–1430 |
| Devices & features (`pLive`) | ~1670 |
| Edit bar, record edit, toolsDown, render, actions | ~1719–1960 |
