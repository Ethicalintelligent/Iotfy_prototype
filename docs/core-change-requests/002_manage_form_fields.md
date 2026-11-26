# Core change request 002: Manage form fields saved in core

- **What** (all additive; one CHECK widened):
  1. `core.assets.status` also allows `'Maintenance'`; new `core.assets.attributes jsonb` (default `{}`).
  2. New `core.users.password_hash text`: a one-way hash only (`pbkdf2-sha256$<iterations>$<salt>$<hash>`).
  3. New `core.connectivity.reminders text[]` (default `{}`): every SIM expiry reminder.
  4. New table `core.documents`: files attached to any record (≤ 1 MB, stored in the row).
  5. New table `core.notification_recipients`: who is told about a rule, by which channel, at
     which level (alert rules' first notice and escalation levels 1–5; geofence SMS/e-mail lists).
  6. New table `core.rule_settings`: per-rule settings with no column of their own (alert
     parameters, a time slot per day, custom date range, buzzer, escalation levels and conditions).
- **Why:** the admin wants every field the GPS Vehicle Tracking › Manage forms show to be saved,
  in core (IT-0038, 25 Nov 2026). Today these fields are kept for the browser session only:
  - vehicle category details, trailers, dashcam and fuel monitoring (calibration matrix)
  - uploaded files (only their names are stored)
  - asset status "Maintenance"
  - user passwords
  - more than one SIM reminder
  - alert parameters beyond the threshold, a time slot per day, the custom date range, the buzzer,
    and multi-level escalation with named recipients
  - geofence SMS numbers and e-mail addresses.

  Core has no table for files, recipients or rule settings, and the shared prototype branch
  cannot change core (rule 2).
- **Design notes for the owner:**
  - `documents`, `notification_recipients` and `rule_settings` point to their owning row by
    `owner_table/owner_id` or `source_table/source_id` (text), not by a foreign key, so they can
    serve any product's records, prototype tables included.
  - `attributes` and `settings` are jsonb, so each product keeps its own detail shape without
    more core columns.
  - Ownership "Contractor" and the extra tracking types sit in `proto_vehicle.vehicle_details`,
    not core. They are widened there by `db/migrations/vehicle/011_manage_values.sql`.
- **Effect:** additive only. Existing rows keep their values (`attributes = {}`,
  `reminders = {}`, no password hash). Every app keeps working before and after.
- **Affects:** GPS Vehicle Tracking (Manage: Vehicle, Device, SIM Card, Operator, User, Alert
  Configuration, Geo Association) and its AIS 140 edition. Other apps are unaffected; the new
  columns and tables are available to all.
- **Migration:** `db/migrations/core/006_manage_form_fields.sql` (safe to run twice). Apply to
  `main` as `iotify_core_admin` and log it in `public.merge_log`. Then run it on `proto/vehicle`
  (the branch the apps use for Vehicle Tracking) and `test/e2e`, or reset them from `main`.
  Afterwards: `pnpm db:types`, then the Manage forms are switched to save these fields (IT-0038).
- **Numbering:** first written as `004_manage_form_fields.sql`; renumbered to 006 because `main` already has core 004 (`004_solution_tables`) and 005 (`005_telemetry`) from the branch `admin/core-telemetry-schema` (its `merge_log` row still says 004).
- **Status:** approved by the core owner (Rafiq) and applied to `main` on 25 Nov 2026 (logged in `public.merge_log`), then to `proto/vehicle` together with `vehicle/011_manage_values.sql`. There is no `test/e2e` branch in the project at this time.
