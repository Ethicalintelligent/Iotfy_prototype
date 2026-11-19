-- Prototype: sample (worked example: indoor tag reads linked to core assets and zones)
-- Branch: proto/sample   Schema: proto_sample
-- Safe to run twice. Run under the prototyper role.
SET ROLE iotify_prototyper;
SELECT public.new_prototype('sample');

CREATE TABLE IF NOT EXISTS proto_sample.tag_reads (
  id serial PRIMARY KEY,
  asset_id text NOT NULL REFERENCES core.assets(id),
  zone_id text REFERENCES core.zones(id),
  read_at timestamptz NOT NULL DEFAULT now()
);
