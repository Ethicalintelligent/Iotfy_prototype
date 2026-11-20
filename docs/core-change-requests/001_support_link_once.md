# Core change request 001: support links work once

- **What:** add one nullable column, `core.support_sessions.link_opened_at timestamptz`.
- **Why:** the legacy parity checklist asks for "a one-time cross-app link". Today a support link
  can be opened as often as anyone likes for 2 hours. To make it work once, the app must record
  when it was first opened, and there's nowhere in `core` to put that (rule 2: no new columns
  without approval; a `proto_*` side table would live only on one prototype branch, but support
  sessions are used by all three apps on `main`).
- **Effect:** additive only, nothing renamed or dropped. Existing rows keep `NULL` (never opened).
  The apps keep working before and after the change.
- **Affects:** the three apps (admin console, partner portal, customer apps); no prototypes.
- **How it's used:** opening `/support/<id>` sets `link_opened_at = now()` only if it is still
  empty (one statement, so two tabs can't both win). A link whose session already has
  `link_opened_at` is refused: "This support link has already been used. Start a new session."
  Refreshing the page after opening keeps the session (it's remembered in the tab), so a refresh
  is not a second use.
- **Migration:** `db/migrations/core/003_support_link_once.sql` (safe to run twice). Apply to
  `main` as `iotify_core_admin`, log it in `public.merge_log`, and run it on `test/e2e` too.
- **Status:** waiting for the core owner's approval.
