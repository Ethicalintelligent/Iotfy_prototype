-- 007_merge_proto_vehicle.sql — core change request 003 (docs/core-change-requests/003_merge_proto_vehicle.md),
-- decided by the admin / core owner (Rafiq), 25 Nov 2026, IT-0039. Applied to proto/vehicle and main.
-- GPS Vehicle Tracking's schema proto_vehicle is merged into core and deleted. Same table names
-- (no clash), same data, keys, checks, indexes and links. Fitted to core 004_solution_tables
-- (branch admin/core-telemetry-schema), which already has core.geofences and core.vehicle_details:
-- those two keep main's table, extended with Vehicle Tracking's columns and values.
--
-- Run as the project owner (neondb_owner), in ONE transaction (all or nothing). proto_vehicle's
-- tables belong to iotify_prototyper and core to iotify_core_admin, so ownership is handed over
-- with a temporary role grant that is revoked at the end.
--
-- On main (no proto_vehicle yet): first run db/migrations/vehicle/001 … 011 as iotify_prototyper
-- (tables + invented demo data for Sample Company A), then this file, then log it:
--   INSERT INTO public.merge_log (prototype, migration) VALUES ('core', '007_merge_proto_vehicle.sql');
-- On a branch where core.geofences / core.vehicle_details do NOT exist yet (proto/vehicle was made
-- before core 004): part B moves them too; part C then gives core.geofences main's columns.

BEGIN;

-- A. Hand the tables over --------------------------------------------------------------------
GRANT iotify_core_admin TO iotify_prototyper;
SET ROLE iotify_prototyper;
GRANT USAGE, CREATE ON SCHEMA proto_vehicle TO iotify_core_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA proto_vehicle TO iotify_core_admin;
-- on proto/vehicle the vehicle_lookups key index was still called lookups_pkey (clashes with core.lookups)
DO $$ BEGIN
  IF to_regclass('proto_vehicle.lookups_pkey') IS NOT NULL THEN
    ALTER INDEX proto_vehicle.lookups_pkey RENAME TO vehicle_lookups_pkey;
  END IF;
END $$;
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'proto_vehicle' LOOP
    EXECUTE format('ALTER TABLE proto_vehicle.%I OWNER TO iotify_core_admin', t.tablename);
  END LOOP;
END $$;

-- B. Move every table whose name is free in core --------------------------------------------
SET ROLE iotify_core_admin;
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'proto_vehicle'
           AND to_regclass('core.' || quote_ident(tablename)) IS NULL LOOP
    EXECUTE format('ALTER TABLE proto_vehicle.%I SET SCHEMA core', t.tablename);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON core.%I TO iotify_prototyper', t.tablename);
  END LOOP;
END $$;

-- C. core.geofences: one shape on every branch (main's columns + Vehicle Tracking's) ----------
ALTER TABLE core.geofences ADD COLUMN IF NOT EXISTS kind text;
ALTER TABLE core.geofences DROP CONSTRAINT IF EXISTS geofences_kind_check;
ALTER TABLE core.geofences ADD CONSTRAINT geofences_kind_check
  CHECK (kind IN ('Work zone', 'Restricted', 'Home site', 'Route', 'Stop', 'Other'));
ALTER TABLE core.geofences ADD COLUMN IF NOT EXISTS site_id text
  REFERENCES core.sites(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE core.geofences ADD COLUMN IF NOT EXISTS zone_id text
  REFERENCES core.zones(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE core.geofences ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Active';
ALTER TABLE core.geofences DROP CONSTRAINT IF EXISTS geofences_status_check;
ALTER TABLE core.geofences ADD CONSTRAINT geofences_status_check CHECK (status IN ('Active', 'Inactive'));
ALTER TABLE core.geofences DROP CONSTRAINT IF EXISTS geofences_shape_check;
ALTER TABLE core.geofences ADD CONSTRAINT geofences_shape_check CHECK (shape IN ('Circle', 'Polygon', 'Freeform'));
ALTER TABLE core.geofences DROP CONSTRAINT IF EXISTS geofences_check;
ALTER TABLE core.geofences ADD CONSTRAINT geofences_check
  CHECK ((shape = 'Circle' AND radius_m IS NOT NULL) OR (shape IN ('Polygon', 'Freeform') AND points IS NOT NULL));
ALTER TABLE core.geofences ADD COLUMN IF NOT EXISTS zone_type text NOT NULL DEFAULT 'General';
ALTER TABLE core.geofences DROP CONSTRAINT IF EXISTS geofences_zone_type_check;
ALTER TABLE core.geofences ADD CONSTRAINT geofences_zone_type_check CHECK (zone_type IN ('General', 'Preferred', 'Restricted'));
ALTER TABLE core.geofences ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE core.geofences ADD COLUMN IF NOT EXISTS speed_limit_kmh numeric CHECK (speed_limit_kmh IS NULL OR speed_limit_kmh > 0);
ALTER TABLE core.geofences ADD COLUMN IF NOT EXISTS height_limit_m numeric CHECK (height_limit_m IS NULL OR height_limit_m > 0);
ALTER TABLE core.geofences ADD COLUMN IF NOT EXISTS time_intervals jsonb;

-- D. core.vehicle_details: operator link and the Manage form's values --------------------------
ALTER TABLE core.vehicle_details ADD COLUMN IF NOT EXISTS operator_id text REFERENCES core.operators(id) ON DELETE SET NULL;
ALTER TABLE core.vehicle_details DROP CONSTRAINT IF EXISTS vehicle_details_ownership_check;
ALTER TABLE core.vehicle_details ADD CONSTRAINT vehicle_details_ownership_check
  CHECK (ownership IN ('Owned', 'Leased', 'Rented', 'Contractor', 'Hired'));
ALTER TABLE core.vehicle_details DROP CONSTRAINT IF EXISTS vehicle_details_tracking_type_check;
ALTER TABLE core.vehicle_details ADD CONSTRAINT vehicle_details_tracking_type_check
  CHECK (tracking_type IN ('Tracking', 'Tracking + Dashcam', 'Tracking + Waste', 'Dashcam', 'Trailer'));

-- E. Where core already had geofences / vehicle_details (main): copy the rows, relink, drop -----
DO $$ BEGIN
  IF to_regclass('proto_vehicle.geofences') IS NOT NULL THEN
    INSERT INTO core.geofences (id, company_id, name, shape, center_lat, center_lng, radius_m, points,
      zone_type, active, speed_limit_kmh, height_limit_m, time_intervals, created_at, updated_at)
    SELECT id, company_id, name, shape, center_lat, center_lng, radius_m, points,
      zone_type, active, speed_limit_kmh, height_limit_m, time_intervals, created_at, updated_at
    FROM proto_vehicle.geofences ON CONFLICT (id) DO NOTHING;
    ALTER TABLE core.vehicle_geofences DROP CONSTRAINT IF EXISTS vehicle_geofences_geofence_id_fkey;
    ALTER TABLE core.vehicle_geofences ADD CONSTRAINT vehicle_geofences_geofence_id_fkey
      FOREIGN KEY (geofence_id) REFERENCES core.geofences(id) ON DELETE CASCADE;
    DROP TABLE proto_vehicle.geofences;
  END IF;
  IF to_regclass('proto_vehicle.vehicle_details') IS NOT NULL THEN
    INSERT INTO core.vehicle_details SELECT * FROM proto_vehicle.vehicle_details ON CONFLICT (asset_id) DO NOTHING;
    DROP TABLE proto_vehicle.vehicle_details;
  END IF;
END $$;

-- F. Rows that name their owner table as text follow the move (core change request 002) ------
UPDATE core.documents SET owner_table = replace(owner_table, 'proto_vehicle.', 'core.') WHERE owner_table LIKE 'proto_vehicle.%';
UPDATE core.notification_recipients SET source_table = replace(source_table, 'proto_vehicle.', 'core.') WHERE source_table LIKE 'proto_vehicle.%';
UPDATE core.rule_settings SET source_table = replace(source_table, 'proto_vehicle.', 'core.') WHERE source_table LIKE 'proto_vehicle.%';

-- G. Delete the empty schema and take the temporary grant back --------------------------------
SET ROLE iotify_prototyper;
DROP SCHEMA proto_vehicle RESTRICT;   -- refuses (and rolls back) if anything is left
RESET ROLE;
REVOKE iotify_core_admin FROM iotify_prototyper;

COMMIT;
