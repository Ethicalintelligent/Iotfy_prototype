-- 004_manage_form_fields.sql — core change request 002 (docs/core-change-requests/002_manage_form_fields.md),
-- asked for by the admin / core owner (Rafiq), 25 Nov 2026, IT-0038.
-- Lets the GPS Vehicle Tracking › Manage forms save every field they show, in core.
-- Additive only (one CHECK widened, nothing renamed or dropped). Safe to run twice.
-- Run as iotify_core_admin on main; then add a row to public.merge_log; then run on the branches
-- that use it (proto/vehicle, test/e2e) or reset them from main.
SET ROLE iotify_core_admin;

-- 1. Assets: "Maintenance" as an asset status, and product-specific details.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assets_status_check'
             AND conrelid = 'core.assets'::regclass) THEN
    ALTER TABLE core.assets DROP CONSTRAINT assets_status_check;
  END IF;
  ALTER TABLE core.assets
    ADD CONSTRAINT assets_status_check CHECK (status IN ('Active', 'Inactive', 'Maintenance'));
END $$;

ALTER TABLE core.assets
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN core.assets.attributes IS
  'Product-specific details of the asset, by section. Vehicles: categoryDetails, trailers, dashcam, fuelMonitoring (incl. calibration matrix).';

-- 2. Users: a one-way password hash (never the password itself).
ALTER TABLE core.users
  ADD COLUMN IF NOT EXISTS password_hash text;
COMMENT ON COLUMN core.users.password_hash IS
  'One-way hash only: pbkdf2-sha256$<iterations>$<salt base64>$<hash base64>. Never store a password.';

-- 3. Connectivity (SIM cards): every expiry reminder chosen, not only the first.
ALTER TABLE core.connectivity
  ADD COLUMN IF NOT EXISTS reminders text[] NOT NULL DEFAULT '{}';
COMMENT ON COLUMN core.connectivity.reminders IS
  'Expiry reminders, e.g. {"1 week before","1 month before"}.';

-- 4. Documents: files attached to any record (vehicle photo and papers, operator ID and licence
--    proofs, user documents). Small files only, stored in the row, like ticket attachments.
CREATE TABLE IF NOT EXISTS core.documents (
  id text PRIMARY KEY,
  company_id text REFERENCES core.companies(id) ON DELETE CASCADE,
  owner_table text NOT NULL,          -- e.g. 'core.assets', 'proto_vehicle.operators'
  owner_id text NOT NULL,             -- the owning row's id
  kind text NOT NULL,                 -- e.g. 'photo', 'registration', 'id_proof', 'license_proof', 'document'
  file_name text NOT NULL,
  mime_type text,
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 0 AND 1048576),
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_owner_idx ON core.documents (owner_table, owner_id);

-- 5. Notification recipients: who is told about a rule, by which channel, at which level.
--    Alert rules (level 0 = first notice, 1-5 = escalation levels) and geofence associations
--    (their SMS numbers and e-mail addresses).
CREATE TABLE IF NOT EXISTS core.notification_recipients (
  id text PRIMARY KEY,
  company_id text REFERENCES core.companies(id) ON DELETE CASCADE,
  source_table text NOT NULL,         -- e.g. 'proto_vehicle.alert_configs', 'proto_vehicle.vehicle_geofences'
  source_id text NOT NULL,            -- the rule's id (for a two-column key: '<asset_id>|<geofence_id>')
  level integer NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 5),
  user_id text REFERENCES core.users(id) ON DELETE CASCADE,   -- a directory user, or
  name text,                          -- an external contact's name
  channel text NOT NULL CHECK (channel IN ('push', 'sms', 'email')),
  address text,                       -- phone number or e-mail (external contacts, geofence lists)
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR address IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS notification_recipients_source_idx
  ON core.notification_recipients (source_table, source_id);

-- 6. Rule settings: the settings of a rule that have no column of their own (alert type
--    parameters, a time slot per day, custom date range, buzzer, escalation levels and their
--    conditions). One row per rule.
CREATE TABLE IF NOT EXISTS core.rule_settings (
  source_table text NOT NULL,
  source_id text NOT NULL,
  company_id text REFERENCES core.companies(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_table, source_id)
);

-- Same rights as the other core tables: prototypes and apps read and write rows, never structure.
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON core.documents, core.notification_recipients, core.rule_settings
  TO iotify_prototyper;
