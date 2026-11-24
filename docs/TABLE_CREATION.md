# Creating a table: ask for the schema first

Binding for every Claude session. It works together with `docs/CORE_RULES.md`.

## The rule
Before you write any `CREATE TABLE` (in SQL, in a migration file, or through the Neon connector), **ask the person which schema the table goes in.** Never pick one yourself, and never fall back to `public`.

Ask it in one plain question, with these three choices:

| Choice | Use it for | Schema name |
|---|---|---|
| **Core** | Shared IoTIFY business tables used by many products: products, companies, dealers, assets, sites, subscriptions and so on. | `core` |
| **Telemetry** | Data that devices send: readings, positions, events, alarms, raw messages. Usually large and time-based. | `telemetry` |
| **Other (new schema)** | Anything that belongs to one prototype or product only. | Ask: "What should the new schema be called?" |

Example question:
> Which schema should the table `vehicle_trips` go in? **Core** (shared business data), **Telemetry** (data devices send), or **Other**: if so, what should the new schema be called?

If the person already named the schema in their request, don't ask again.

## After the answer
- **Core**: allowed only on the developer's own branch `iotfy_<name>` (CORE_RULES rule 2). Tell the person in one line that it reaches `main` only through a core change request. Migration file goes in `db/migrations/core/`.
- **Telemetry**: same branch rule as core. Create the schema with `CREATE SCHEMA IF NOT EXISTS telemetry;` if it doesn't exist yet. Migration file goes in `db/migrations/telemetry/`.
- **Other**: the name is `snake_case`. For a prototype use `proto_<name>` and create it with `SELECT public.new_prototype('<name>');` (CORE_RULES rule 3). If the person gives a name without `proto_`, show the full name you will use and wait for an OK. Migration file goes in `db/migrations/<name>/`.

## Every time
- Always write the schema in the table name: `telemetry.vehicle_positions`, never just `vehicle_positions`.
- Every change is a numbered, re-runnable file (`CREATE SCHEMA IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`). CORE_RULES rule 7.
- Tables and columns in `snake_case`, `text` primary keys, foreign keys to `core` rows instead of copies (CORE_RULES rules 4 and 8).
- Demo data only.
