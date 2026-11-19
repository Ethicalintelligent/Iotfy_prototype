-- IoTIFY: roles that lock the core and give each prototype its own area.
-- Run once on the main branch (branches created afterwards inherit it).

-- 1. Who owns the core: only the core admin may change core table structure.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'iotify_core_admin') THEN CREATE ROLE iotify_core_admin NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'iotify_prototyper') THEN CREATE ROLE iotify_prototyper NOLOGIN; END IF;
END $$;
GRANT iotify_core_admin TO CURRENT_USER;
GRANT iotify_prototyper TO CURRENT_USER;

ALTER SCHEMA core OWNER TO iotify_core_admin;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'core' LOOP
    EXECUTE format('ALTER TABLE core.%I OWNER TO iotify_core_admin', r.tablename);
  END LOOP;
END $$;

-- 2. Prototypes: may read and link to core tables, and add or change sample rows on their own branch,
--    but may NOT create, alter or drop anything in core (they do not own it).
GRANT USAGE ON SCHEMA core TO iotify_prototyper;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON ALL TABLES IN SCHEMA core TO iotify_prototyper;
ALTER DEFAULT PRIVILEGES FOR ROLE iotify_core_admin IN SCHEMA core GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON TABLES TO iotify_prototyper;
REVOKE CREATE ON SCHEMA core FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- 3. Starting a prototype: creates schema proto_<name>, owned by the prototyper role.
CREATE OR REPLACE FUNCTION public.new_prototype(p_name text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE s text := 'proto_' || lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '_', 'g'));
BEGIN
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I AUTHORIZATION iotify_prototyper', s);
  EXECUTE format('COMMENT ON SCHEMA %I IS %L', s, 'Prototype area. Created ' || now()::date);
  RETURN s;
END $$;
REVOKE ALL ON FUNCTION public.new_prototype(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.new_prototype(text) TO iotify_prototyper;

-- 4. A record of what has been merged into main.
CREATE TABLE IF NOT EXISTS public.merge_log (
  id serial PRIMARY KEY, prototype text NOT NULL, migration text NOT NULL,
  merged_by text NOT NULL DEFAULT current_user, merged_at timestamptz NOT NULL DEFAULT now()
);
