# Behaviour to keep (legacy parity checklist)

Everything below exists in the legacy prototype and was asked for by the product owner. Tick each item when the React version does it. Don't delete `legacy/` until every box is ticked.

## Data and editing
- [x] Live Neon data; nothing cached in the browser except the session.
- [x] Re-read from Neon on every page change, role switch and return to the tab (another role's changes show up).
- [x] Fields read-only until **Edit**; **Save** / **Cancel** in place on the record card; a bottom bar only as a reminder.
- [x] Button actions (Add, Send, Accept, End subscription, Delete-after-confirm, pop-up form Save) save immediately.
- [x] The leave guard: Save / Discard / Stay when leaving with unsaved changes.
- [x] Failed saves show Neon's exact error, with Try again and Cancel.
- [x] Delete only inside Edit mode, always confirmed, refused with the reason when other records still use it.

## Layout
- [x] Rail 56 px, icons only, opens on hover (no click), closes on choosing a page.
- [x] One thin title row (~40 px): title, ⓘ description, breadcrumb on detail pages; top right: a wide search box (Ctrl+K), notifications with badge, avatar with Neon status dot.
- [x] Page actions (search, + Add, Edit) sit next to the content they act on, never in the title row. Product tree: + Group / + Product beside "Search groups and products".
- [x] Popovers anchored top right.

## Applications and sign-in
- [x] Three apps; each admits only its roles; wrong-app sign-in says where to go.
- [x] Customer apps: one sign-in for "My apps" and every product; a single-app company goes straight in; sign-out returns to the entry page used.
- [x] Product sign-in pages for every Standalone, Base, Edition and Package, each with its own animated scene and feature chips.
- [x] A product the company doesn't have: "not in your apps" page, still signed in.
- [x] App access = bought directly or through a package (not "included inside another product").
- [x] White-label resellers: EIT sets the reseller type; the dealer sets brand name, colour and logo; branded sign-in links show only that dealer's customers.
- [ ] Support sessions: customer or dealer grants 7 days; the actor gives a reason; view-only; logged and visible to the target; a one-time cross-app link; 2 h limit. *(All done except "one-time": that needs a core column, `support_sessions.link_opened_at`, waiting for the core owner. See `docs/core-change-requests/001_support_link_once.md`.)*

## Product apps
- [x] Per-product menus (Monitor / Operations / Reports / Account), 11–16 screens each, from the `XS` specs.
- [x] Dashboard: 4 KPIs, a 7-day chart, recent alerts, the company's assets.
- [x] Live map or floor view; alerts table; reports with Run / Schedule; alert rules.
- [x] Devices & features page: per asset, Paid / Possible / Allowed with reasons; add-ons folded into one line.
- [x] Package apps: each asset shows only features of members that fit its asset type.
- [x] Demo activity labelled as demo on every screen.
- [x] Fleet roles see monitoring and operations only.

## Demo data (in Neon)
- [x] 14 companies, 19 users, 55 assets, 57 devices, 60 subscriptions (`db/migrations/demo/001_demo_customers.sql`).
