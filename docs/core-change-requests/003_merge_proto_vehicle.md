# Core change request 003: merge proto_vehicle into core and delete it

- **What:** GPS Vehicle Tracking's own schema `proto_vehicle` becomes part of `core`. Its 16
  tables move to `core` with the same names, data, keys, checks, indexes and links:
  `alert_configs`, `asset_groups`, `device_details`, `geofences`, `operators`, `sim_details`,
  `tickets`, `ticket_events`, `ticket_settings`, `ticket_attachments`,
  `ticket_notification_reads`, `user_profiles`, `vehicle_details`, `vehicle_geofences`,
  `vehicle_io`, `vehicle_lookups`. Then the empty `proto_vehicle` schema is deleted.
- **Why:** the admin / core owner decided Vehicle Tracking's tables are core business data and
  the separate prototype schema is no longer needed (IT-0039, 25 Nov 2026). It also follows core
  change request 002, which already put the Manage form fields in core.
- **Main:** `main` never had `proto_vehicle`, and it already had core `004_solution_tables` (branch `admin/core-telemetry-schema`, 23 Nov) with its own, empty `core.geofences` and `core.vehicle_details`. The admin chose to **fit into that design**: those two keep main's table, extended with Vehicle Tracking's columns (`zone_type`, `active`, `speed_limit_kmh`, `height_limit_m`, `time_intervals`, shape `Freeform`; `operator_id`, widened ownership and tracking types), and the demo rows are copied in. The other 14 tables moved as they are. On `main` the vehicle migrations `001`–`011` ran first (invented demo data, the admin's choice). `proto/vehicle` got main's extra geofence columns (`kind`, `site_id`, `zone_id`, `status`), so both branches have the same shape.
- **Overlap left for later:** main's design also has `alert_rules`, `alert_recipients`, `alerts`, `alert_tickets` and `geofence_assignments`, which cover the same ground as Vehicle Tracking's `alert_configs`, `notification_recipients`, `tickets` and `vehicle_geofences`. Both exist side by side for now; unifying them is a separate decision. `core.geofences` has both `status` (main) and `active` (Vehicle Tracking).
- **Effect:**
  - No data is lost; the tables are moved, not copied.
  - Rows in `core.documents`, `core.notification_recipients` and `core.rule_settings` that name
    their owner as `proto_vehicle.<table>` are renamed to `core.<table>`.
  - The app's generated types and three saved owner names in the Manage code change at the same
    time (`pnpm db:types`).
  - Prototypes keep read/write rights on the moved tables (same grants as other core tables).
- **Affects:** GPS Vehicle Tracking (all screens), its AIS 140 edition, the Partner Portal's
  vehicle summary. Every developer branch gets the tables when it is refreshed from `main`.
- **Rule change:** the admin then removed the prototype-schema rule for everyone (25 Nov 2026):
  there are no `proto_<name>` schemas any more; every table goes in `core` or `telemetry`
  (CORE_RULES rule 3, TABLE_CREATION).
- **Migration:** `db/migrations/core/007_merge_proto_vehicle.sql`, run as the project owner in one transaction. On `main`: `db/migrations/vehicle/001`–`011` first. Numbered 007 because `main` already has core 004 and 005.
- **Status:** decided by the core owner (Rafiq) and applied on 25 Nov 2026: to `proto/vehicle` (all 16 tables moved, row counts checked before and after, `proto_vehicle` deleted) and to `main` (logged in `public.merge_log`). The vehicle migrations in `db/migrations/vehicle/` are kept as history: they build `proto_vehicle`, which 007 then merges.
