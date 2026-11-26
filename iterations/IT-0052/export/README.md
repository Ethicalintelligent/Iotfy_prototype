# Vehicle Tracking → Grid View: export (25 Nov 2026)

A complete snapshot of the Grid View module as approved by Heeba (iterations IT-0050 and IT-0052, branch `dev/heeba`), kept so the design can be viewed or restored even if `main` later changes these files. Demo data only (24 invented vehicles).

## What's here

| File / folder | What it is | How to open |
|---|---|---|
| `Vehicle-Grid-View-standalone.html` | The whole module in **one file**: styles, script, demo data and vehicle images built in. Every interaction works: status dropdown, sort, filter panel (Submit / Reset / count), grid/list, card flip, pagination, tooltips. | Double-click it. Works offline (needs internet only for the web font; otherwise a similar system font is used). |
| `Vehicle-Grid-View-design.pdf` | 10-page design snapshot: the page in the app, the main states and card close-ups. | Any PDF viewer. |
| `screenshots/` | The same views as PNG images (`00` = inside the IoTIFY app, `01`–`09` = standalone file). | Any image viewer. |
| `app-files/` | The **exact files as they are in the app** on this date (unchanged): `screens/pages/Vehicle-Grid-View.html`, `vehicle-grid-view.js`, `.css`, `-data.js`, `-tooltip.js`, the four `vgv-*.png` images, and `screens/DesignPage.tsx` (the shell part: Grid View frame and the two header slots). | For restoring (below). |
| `Vehicle-Grid-View-export.zip` | Everything above in one zip, for sharing or keeping outside the project. | Unzip. |

## Standalone file vs the app
- In the app, Status sits in the IoTIFY header next to the title, and Filter, Sort and Grid/List sit after the global search. The standalone file has no IoTIFY header, so the same controls show above the cards (Status left; Filter, Sort, Grid/List right).
- The six card action buttons open other Vehicle Tracking pages in the app. In the standalone file they show a short note instead (those pages are not part of this export). Nothing else differs.

## Restoring the module in the project
Ask Claude Code: "restore the Grid View from iterations/IT-0052/export". It copies `app-files/screens/pages/*` back to `products/tracking/fleet-transport/gps-vehicle-tracking/screens/pages/` and merges `app-files/screens/DesignPage.tsx` with whatever `main` has by then (don't overwrite blindly: `main` may have changed other parts of that file), then checks it in the preview.

The same state is also in git on `dev/heeba`: commits `15e8874` (IT-0050, the Grid View redesign) and `2e4fc2e` (IT-0052, toolbar order). Design decisions and the approved deviations are recorded in the product's `CLAUDE.md`; the prototype, every review round and the screenshots are in `iterations/IT-0050/` and `iterations/IT-0052/`.
