# Database schemas: why three, and which table goes where

Decided by the admin on 26 Nov 2026 (IT-0042, migration `db/migrations/core/011_three_schemas.sql`). Applies to Neon `main` and every developer branch `iotfy_<name>`.

The IoTIFY database has **three schemas**. Each one holds a different **kind** of table:

| Schema | Kind of table | In one line | Tables |
|---|---|---|---|
| **`core`** | Top-level records | The main things everything else points to: companies, users, assets, devices, models, products. | 46 |
| **`gps`** | Details and setup | Extra fields for one record, and the settings people configure: vehicle details, personal details, alert setup, geofences, tickets. | 31 |
| **`telemetry`** | Big tables | What devices send and what is computed from it: positions, events, alerts, readings, live states, summaries. | 33 |

There are no other schemas: no `telematics` (removed in IT-0042) and no `proto_<name>` (removed in IT-0039).

---

## Why split by kind of table

- **You can tell where a table is from what it holds.** "Is it a main record, a detail or setting of one, or device data?" decides the schema. The question is never which application or prototype the table came from.
- **Each kind grows and is looked after differently.**
  - `core` is small and stable. Many products and all three applications (Admin Console, Partner Portal, Customer Apps) read it, so changes need the most care.
  - `gps` grows with each company's setup. It holds what people type in and edit on Manage screens.
  - `telemetry` grows all the time, because devices write to it every few seconds. It is the part that later needs time partitioning, retention and archiving, so it is kept apart.
- **Links always point "up".** A `gps` detail row points to a `core` record (for example `gps.vehicle_details.asset_id → core.tracked_asset`). A `telemetry` row points to `core` records (asset, device, company). Nothing in `core` depends on a `gps` or `telemetry` table.

---

## `core`: top-level records

**Put a table here when:** it is a main record in its own right. Other tables point to it, and it would exist even if no detail or device data existed yet.

| Group | Tables | What they hold |
|---|---|---|
| Product tree and features | `nodes`, `features`, `feature_data_points`, `product_features`, `product_devices`, `product_asset_types`, `bundle_rules`, `solution` | The product tree (groups, products, editions, packages, add-ons), features, which devices and asset types each product supports, bundle rules |
| Companies and users | `company`, `branch`, `app_user`, `dealers`, `roles`, `role_features` | Customer companies, their branches, sign-in users, dealers (resellers), roles and what each role may do |
| Assets | `tracked_asset`, `asset_group`, `asset_types`, `zones`, `operators` | Every tracked thing (vehicle, bin, generator, room, person…), groups of assets, asset types, zones inside sites, drivers and operators |
| Devices and models | `device`, `sim_card`, `device_model`, `device_manufacturer`, `device_protocol`, `device_assignments`, `device_interfaces`, `interfaces`, `sensor_models`, `sensor_units`, `sensor_interfaces`, `data_point_mappings` | Device units (IMEI, firmware, warranty), SIM cards, device and sensor models, manufacturers, protocols, which device is fitted to which asset, how each model reports each data point |
| Network and data points | `networks`, `data_points`, `device_data_points`, `sensor_data_points` | Connection types (LoRaWAN, NB-IoT, 4G…), the things that can be measured, and which models report them |
| Prices and sales | `price_plans`, `price_rules`, `hardware_prices`, `quotes`, `quote_lines`, `subscriptions` | Prices, quotes from dealers, what each company has bought |
| Other | `lookups`, `vehicle_lookups`, `documents`, `support_sessions`, `fuel_entries` | Value lists for drop-downs, uploaded files, logged support sessions, fuel typed in by hand |

**Ids:** the tables that came from the admin application (`company`, `app_user`, `tracked_asset`, `device`, `sim_card`, `asset_group`, `branch`, `device_model`…) have number ids that the database gives. The app reserves new ones with `useNextIds`. The old text id is kept in `legacy_id`.

---

## `gps`: details and setup

**Put a table here when:** it adds extra fields to one `core` record (one row per asset or user), or it holds settings that people configure and edit.

| Group | Tables | What they hold |
|---|---|---|
| Asset details (one row per asset) | `vehicle_details`, `person_details`, `bin_details`, `generator_details`, `room_details`, `tank_details`, `atm_details`, `dispenser_details`, `inventory_item_details`, `telecom_site_details`, `movable_asset_details`, `camera_view_details` | The fields only that type of asset needs. For example, a bin has bin type, capacity, route and collection frequency; a generator has kVA rating, fuel tank and service interval; a vehicle has VIN, make, model and driver. |
| Personal details | `user_profiles` | A user's name, address, mobile and other profile fields (the sign-in record itself is `core.app_user`) |
| Other per-asset details | `vehicle_io`, `asset_identifiers`, `certificates` | A vehicle's input/output port setup, extra tags and ids of an asset (RFID, plate history), calibration and inspection certificates |
| Alert setup | `alert_rules`, `alert_rule_templates`, `alert_configs`, `alert_recipients`, `alert_tickets`, `notification_recipients`, `rule_settings` | Which alerts are switched on, their limits, schedules and recipients, and the tickets raised from them. `alert_rules.asset_group` links to `core.asset_group`. |
| Geofences | `geofences`, `geofence_assignments`, `vehicle_geofences` | Zones drawn on the map, and which assets they apply to, on which days, with which enter and leave alerts |
| Tickets | `tickets`, `ticket_events`, `ticket_attachments`, `ticket_settings`, `ticket_notification_reads` | Support tickets, their history and files, service-level settings |

**Ids:** `alert_rules` has a number id that the database gives (IT-0045); `alert_recipients.alert_rule_id` and `alert_tickets.alert_id` are numbers too. The app reserves new ids with `useNextIds`.

**Rule for a new asset type:** its extra fields go in a new `gps.<type>_details` table with `asset_id` as primary key, pointing to `core.tracked_asset`. Never add type-specific columns to `core.tracked_asset`.

---

## `telemetry`: big tables only

**Put a table here when:** devices write it, or it is computed from what devices write. It grows all the time and is read by time.

| Group | Tables | What they hold |
|---|---|---|
| Positions (full history) | `vehicle_position`, `asset_positions`, `person_positions` | Every report. `vehicle_position` keeps each device report complete, with its event code and all input/output data (ignition, fuel, temperatures, battery…). |
| Events and alerts | `vehicle_events`, `asset_events`, `person_events`, `iot_events`, `alerts`, `alert_notifications` | Things that happened (overspeed, door open, SOS…), the alerts they raised, and each notification sent |
| Readings | `readings`, `heartbeats`, `iot_live_readings` | Sensor values over time, device health pings, the last value of each data point |
| Live states (one row per asset) | `vehicle_live_states`, `person_live_states`, `asset_live_states`, `iot_live_states` | The current state of each asset, overwritten with the latest values. **Every solution has its own live state table**, because each one shows different fields. |
| Summaries | `vehicle_hourly_summaries`, `vehicle_daily_summaries`, `vehicle_status_segments`, `person_hourly_summaries`, `person_daily_summaries`, `person_status_segments`, `iot_hourly_summaries`, `iot_daily_summaries`, `iot_status_segments`, `asset_daily_summaries`, `reading_hourly_summaries`, `company_daily_kpis` | Totals per hour and day (distance, running time, idle time…) and periods in one status, used by dashboards and reports |
| Activity logs | `rfid_reads`, `attendance_punches`, `dashcam_media`, `dispense_transactions`, `student_boardings` | Each RFID scan, attendance punch, dashcam clip, fuel dispense and student boarding |

**Ids:** `alerts` and `alert_notifications` have number ids that the database gives (IT-0045); `alert_notifications.alert_id` and `dashcam_media.alert_id` are numbers too.

**Positions and live states are not duplicates.** A position table is the history, with every report kept. A live state table holds one row per asset: the latest values, overwritten on each report. Don't merge them.

---

## Choosing the schema for a new table

Ask these questions in order:

1. **Do devices write it, or is it computed from device data, and will it keep growing?** → `telemetry`
2. **Does it add fields to one existing record, or hold settings people configure?** → `gps`
3. **Is it a main record that other tables point to?** → `core`

Examples:

| New table | Schema | Why |
|---|---|---|
| `vehicle_trips` (trips computed from positions) | `telemetry` | Computed from device data, grows every day |
| `boat_details` (hull number, length, engine) | `gps` | Extra fields for one asset |
| `maintenance_schedules` (service plan per vehicle) | `gps` | Setup people configure |
| `insurance_providers` (a list of companies other tables point to) | `core` | A main record of its own |

Before creating any table, Claude asks "core, gps or telemetry?" (`docs/TABLE_CREATION.md`). Every change is a numbered, re-runnable migration file (`docs/CORE_RULES.md`).

## Rules that apply to all three

- **One schema per table.** A table name exists once in the whole database, because the apps find tables by name.
- **Screens never name the schema.** They use `@iotify/data` hooks, which look up each table's schema in the generated types (`pnpm db:types`).
- **Structure changes need an owner role.** The app's own database user (`iotify_dev`) can read and write rows, but can't create or move tables.

## History

| Date | Change |
|---|---|
| 25 Nov 2026 (IT-0039) | `proto_<name>` schemas removed |
| 25 Nov 2026 (IT-0040) | The admin application's tables added as schemas `gps` and `telematics` (sorted by where they came from) |
| 26 Nov 2026 (IT-0042) | Sorted by kind of table instead: `core` / `gps` / `telemetry`. `telematics` removed; 56 tables moved, no data lost |
| 26 Nov 2026 (IT-0045) | Alert ids numbered by the database: `gps.alert_rules`, `telemetry.alerts`, `telemetry.alert_notifications` (migration 012); `alert_rules.asset_group` linked to `core.asset_group` |
