-- Prototype: sample. A plain test table in the CORE schema, on the developer's own database only
-- (docs/CORE_RULES.md, rule 2 exception: full rights on iotfy_<name>).
-- Needs those full rights: it is refused on main, staging, test/* and proto/* branches, where the
-- prototyper role can't create in core. It does NOT reach main when the pull request is merged;
-- that needs a core change request (rule 9).
-- Named sample_table, not sample_notes: the generated app types key tables by name alone, so a
-- second sample_notes (next to proto_sample.sample_notes) would clash.
-- Created as iotify_core_admin, the owner of every core table, so the existing default privileges
-- give iotify_prototyper (the role the app runs as) the same row access as any other core table.
-- Safe to run twice.
SET ROLE iotify_dev;
SET ROLE iotify_core_admin;

CREATE TABLE IF NOT EXISTS core.sample_table (
  id text PRIMARY KEY,
  title text NOT NULL CHECK (btrim(title) <> ''),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE core.sample_table IS
  'Test table on the developer database iotfy_irfan only (IT-0021). Not part of the IoTIFY core design and not on main.';
