-- Prototype: vehicle. Manage SIM Card from the approved GPS Platform design 07-03
-- (D:/Project/GPS_Platform/approved_degin): list, Add SIM, Edit SIM Card, delete.
-- Core keeps what it already has: the SIM is a core.connectivity row
--   identifier (identifier_type ICCID) = Serial Number, number = SIM Card No,
--   provider = Provider, device_unit_id = the device it is in (its IMEI is shown in the list).
-- This side table only adds the extra fields. Provider and plan choices behind "+ Add"
-- go in proto_vehicle.vehicle_lookups (new kinds sim_provider, sim_plan).
-- Safe to run twice. Run under the prototyper role.
SET ROLE iotify_prototyper;
SELECT public.new_prototype('vehicle');

CREATE TABLE IF NOT EXISTS proto_vehicle.sim_details (
  connectivity_id text PRIMARY KEY REFERENCES core.connectivity(id) ON DELETE CASCADE,
  pin_code text CHECK (pin_code IS NULL OR pin_code ~ '^[0-9]{4,8}$'),
  puk_code text CHECK (puk_code IS NULL OR puk_code ~ '^[0-9]{4,16}$'),
  support_number text,
  plan text,
  purchase_date date,
  subscription_date date,
  expiry_reminder text CHECK (expiry_reminder IN ('1 week before', '2 weeks before', '1 month before', '2 months before')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Allow the two new lookup kinds (re-runnable: drop and re-add the same check). The kind check
-- is named vehicle_lookups_kind_check on a fresh copy and lookups_kind_check on older branches.
ALTER TABLE proto_vehicle.vehicle_lookups DROP CONSTRAINT IF EXISTS lookups_kind_check;
ALTER TABLE proto_vehicle.vehicle_lookups DROP CONSTRAINT IF EXISTS vehicle_lookups_kind_check;
ALTER TABLE proto_vehicle.vehicle_lookups ADD CONSTRAINT vehicle_lookups_kind_check
  CHECK (kind IN ('category', 'vehicle_type', 'color', 'make', 'model', 'fuel_type', 'sim_provider', 'sim_plan'));

-- Demo choices (plan.parent = its provider). Invented plan names.
INSERT INTO proto_vehicle.vehicle_lookups (id, kind, value, parent) VALUES
  ('LK40', 'sim_provider', 'STC', NULL),
  ('LK41', 'sim_provider', 'Mobily', NULL),
  ('LK42', 'sim_provider', 'Zain', NULL),
  ('LK43', 'sim_plan', 'IoT Data 1 GB', NULL),
  ('LK44', 'sim_plan', 'IoT Data 5 GB', NULL),
  ('LK45', 'sim_plan', 'Fleet M2M Unlimited', NULL)
ON CONFLICT (id) DO NOTHING;
