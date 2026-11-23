-- Prototype: sample. A plain test table (title, note, created time), not linked to the core,
-- for trying out how a prototype table is added. Run after 001_tables.sql.
-- Branch: proto/sample   Schema: proto_sample
-- Safe to run twice. Run under the prototyper role.
SET ROLE iotify_prototyper;
SELECT public.new_prototype('sample');

CREATE TABLE IF NOT EXISTS proto_sample.sample_notes (
  id text PRIMARY KEY,
  title text NOT NULL CHECK (btrim(title) <> ''),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
