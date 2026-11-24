-- Prototype: vehicle. Tables and fields for the rest of the approved GPS Vehicle Tracking design
-- (Desktop/vs, Nov 2026, IT-0012): Manage > Operator, Alert Configuration, User, Geo
-- Configuration and Geo Association, and Administration > Groups.
-- Structure first, then invented demo rows for Sample Company A (C1). The core.device_units and
-- core.connectivity rows are sample data for testing (docs/CORE_RULES.md rule 5).
-- Safe to run twice. Run under the prototyper role.
SET ROLE iotify_prototyper;
SELECT public.new_prototype('vehicle');

-- Groups: branches or teams, nested. core.assets.asset_group and core.users.asset_group hold the
-- group's name (core keeps a name, not an id).
CREATE TABLE IF NOT EXISTS proto_vehicle.asset_groups (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES core.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id text REFERENCES proto_vehicle.asset_groups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

-- Operators (drivers): Manage > Operator.
CREATE TABLE IF NOT EXISTS proto_vehicle.operators (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES core.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  tag_id text,
  designation text,
  email text,
  contact_no text,
  emergency_contact_no text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  country text,
  postal_code text,
  branch_location text,
  date_of_birth date,
  date_of_joining date,
  date_of_leaving date,
  insurance_number text,
  license_number text,
  license_category text,
  license_expiry date,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  id_proof_name text,
  license_proof_name text,
  document_names text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- A vehicle's operator (Assignment). operator_name stays for vehicles saved before this.
ALTER TABLE proto_vehicle.vehicle_details
  ADD COLUMN IF NOT EXISTS operator_id text REFERENCES proto_vehicle.operators(id) ON DELETE SET NULL;

-- Alert settings per vehicle and alert type: Manage > Alert Configuration.
CREATE TABLE IF NOT EXISTS proto_vehicle.alert_configs (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES core.companies(id) ON DELETE CASCADE,
  asset_id text NOT NULL REFERENCES core.assets(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  severity text NOT NULL DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  threshold numeric,
  threshold_unit text,
  ignore_seconds integer CHECK (ignore_seconds IS NULL OR ignore_seconds >= 0),
  interval_value integer CHECK (interval_value IS NULL OR interval_value > 0),
  interval_unit text CHECK (interval_unit IN ('Minutes', 'Hours')),
  effective_till date,
  days text[] NOT NULL DEFAULT ARRAY['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
  start_time time NOT NULL DEFAULT '00:00',
  end_time time NOT NULL DEFAULT '23:59',
  notify_push boolean NOT NULL DEFAULT true,
  notify_sms boolean NOT NULL DEFAULT false,
  notify_email boolean NOT NULL DEFAULT false,
  escalate_after_min integer CHECK (escalate_after_min IS NULL OR escalate_after_min > 0),
  escalate_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, alert_type)
);

-- Portal user fields core.users doesn't have: Manage > User.
CREATE TABLE IF NOT EXISTS proto_vehicle.user_profiles (
  user_id text PRIMARY KEY REFERENCES core.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  user_name text,
  mobile text,
  postal_code text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  country text,
  active boolean NOT NULL DEFAULT true,
  suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Geo Configuration: status, limits and active time intervals of a zone.
ALTER TABLE proto_vehicle.geofences ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE proto_vehicle.geofences ADD COLUMN IF NOT EXISTS speed_limit_kmh numeric
  CHECK (speed_limit_kmh IS NULL OR speed_limit_kmh > 0);
ALTER TABLE proto_vehicle.geofences ADD COLUMN IF NOT EXISTS height_limit_m numeric
  CHECK (height_limit_m IS NULL OR height_limit_m > 0);
-- [{"from":"08:00","to":"18:00"}]
ALTER TABLE proto_vehicle.geofences ADD COLUMN IF NOT EXISTS time_intervals jsonb;

-- Geo Association: per vehicle and zone, when it applies and what to alert.
ALTER TABLE proto_vehicle.vehicle_geofences ADD COLUMN IF NOT EXISTS valid_till date;
ALTER TABLE proto_vehicle.vehicle_geofences ADD COLUMN IF NOT EXISTS days text[]
  NOT NULL DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri'];
ALTER TABLE proto_vehicle.vehicle_geofences ADD COLUMN IF NOT EXISTS on_enter boolean NOT NULL DEFAULT true;
ALTER TABLE proto_vehicle.vehicle_geofences ADD COLUMN IF NOT EXISTS on_leave boolean NOT NULL DEFAULT true;
ALTER TABLE proto_vehicle.vehicle_geofences ADD COLUMN IF NOT EXISTS notify_push boolean NOT NULL DEFAULT true;
ALTER TABLE proto_vehicle.vehicle_geofences ADD COLUMN IF NOT EXISTS notify_sms boolean NOT NULL DEFAULT false;
ALTER TABLE proto_vehicle.vehicle_geofences ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------- demo rows (invented)
-- Groups from the group names already on assets and users, for every company.
INSERT INTO proto_vehicle.asset_groups (id, company_id, name)
SELECT 'GRP-' || company_id || '-' || md5(asset_group), company_id, asset_group
FROM (
  SELECT DISTINCT company_id, asset_group FROM core.assets
  WHERE asset_group IS NOT NULL AND company_id IS NOT NULL
) g
ON CONFLICT DO NOTHING;

INSERT INTO proto_vehicle.operators
  (id, company_id, name, tag_id, designation, email, contact_no, city, country, license_number, license_category, license_expiry, date_of_joining, status)
VALUES
  ('OP1', 'C1', 'Murugan S',    'TAG-1001', 'Driver',        'murugan.s@sample-a.test',   '+966 50 100 1001', 'Riyadh', 'Saudi Arabia', 'DL-55021', 'Heavy', '2028-03-31', '2022-01-10', 'Active'),
  ('OP2', 'C1', 'Shiju V',      'TAG-1002', 'Driver',        'shiju.v@sample-a.test',     '+966 50 100 1002', 'Riyadh', 'Saudi Arabia', 'DL-55022', 'Heavy', '2027-09-30', '2022-06-01', 'Active'),
  ('OP3', 'C1', 'Prakash P',    'TAG-1003', 'Driver',        'prakash.p@sample-a.test',   '+966 50 100 1003', 'Riyadh', 'Saudi Arabia', 'DL-55023', 'Heavy', '2027-01-31', '2023-02-15', 'Active'),
  ('OP4', 'C1', 'Omar Haddad',  'TAG-1004', 'Senior driver', 'omar.h@sample-a.test',      '+966 50 100 1004', 'Riyadh', 'Saudi Arabia', 'DL-55024', 'Medium', '2028-11-30', '2021-08-20', 'Active'),
  ('OP5', 'C1', 'Yousef Saleh', 'TAG-1005', 'Driver',        'yousef.s@sample-a.test',    '+966 50 100 1005', 'Riyadh', 'Saudi Arabia', 'DL-55025', 'Light', '2026-12-31', '2024-03-01', 'Active'),
  ('OP6', 'C1', 'Bilal Rahman', 'TAG-1006', 'Driver',        'bilal.r@sample-a.test',     '+966 50 100 1006', 'Riyadh', 'Saudi Arabia', 'DL-55026', 'Heavy', '2027-05-31', '2023-07-10', 'Active'),
  ('OP7', 'C1', 'Imran Qadir',  'TAG-1007', 'Relief driver', NULL,                        '+966 50 100 1007', 'Riyadh', 'Saudi Arabia', NULL,       NULL,    NULL,         '2025-01-05', 'Inactive')
ON CONFLICT (id) DO NOTHING;

UPDATE proto_vehicle.vehicle_details AS d SET operator_id = o.id
FROM proto_vehicle.operators o
WHERE o.company_id = 'C1' AND d.operator_name = o.name AND d.operator_id IS NULL;

INSERT INTO proto_vehicle.alert_configs
  (id, company_id, asset_id, alert_type, severity, threshold, threshold_unit, ignore_seconds, interval_value, interval_unit)
VALUES
  ('AC1', 'C1', 'A201', 'Overspeed', 'High',   80, 'km/h', 20, 10, 'Minutes'),
  ('AC2', 'C1', 'A202', 'Overspeed', 'High',   80, 'km/h', 20, 10, 'Minutes'),
  ('AC3', 'C1', 'A203', 'Idle',      'Low',    15, 'min',  NULL, 10, 'Minutes'),
  ('AC4', 'C1', 'A204', 'Stop',      'Medium', 30, 'min',  NULL, 10, 'Minutes'),
  ('AC5', 'C1', 'A205', 'Harsh Braking', 'High', 0.4, 'g', 10, 10, 'Minutes'),
  ('AC6', 'C1', 'A206', 'SOS',       'Critical', NULL, NULL, NULL, 10, 'Minutes'),
  ('AC7', 'C1', 'A208', 'Powercut',  'High',   NULL, NULL, NULL, 10, 'Minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO proto_vehicle.user_profiles (user_id, first_name, last_name, user_name, mobile, city, country)
VALUES
  ('U4', 'Company A', 'admin', 'companya.admin', '+966 50 200 0004', 'Riyadh', 'Saudi Arabia'),
  ('U5', 'Company A', 'fleet manager', 'companya.fm', '+966 50 200 0005', 'Riyadh', 'Saudi Arabia'),
  ('U6', 'Company A', 'fleet supervisor', 'companya.fs', '+966 50 200 0006', 'Riyadh', 'Saudi Arabia')
ON CONFLICT (user_id) DO NOTHING;

UPDATE proto_vehicle.geofences SET speed_limit_kmh = 40, time_intervals = '[{"from":"07:00","to":"19:00"}]'::jsonb
WHERE id = 'GF11' AND speed_limit_kmh IS NULL;
UPDATE proto_vehicle.geofences SET speed_limit_kmh = 30, height_limit_m = 4.5
WHERE id = 'GF13' AND speed_limit_kmh IS NULL;

-- A tracker and a SIM in each demo vehicle (sample core rows; Truck 14 already has one).
INSERT INTO core.device_units (id, device_model_id, imei, owner_dealer_id, company_id, asset_id, status) VALUES
  ('DU201', 'D02', '860163915039504', 'DL1', 'C1', 'A201', 'Installed'),
  ('DU202', 'D02', '866129878529505', 'DL1', 'C1', 'A202', 'Installed'),
  ('DU203', 'D02', '863664686770635', 'DL1', 'C1', 'A203', 'Installed'),
  ('DU204', 'D01', '866195061521197', 'DL1', 'C1', 'A204', 'Installed'),
  ('DU205', 'D01', '860249187083582', 'DL1', 'C1', 'A205', 'Installed'),
  ('DU206', 'D02', '863166921267402', 'DL1', 'C1', 'A206', 'Installed'),
  ('DU207', 'D02', '861399418794629', 'DL1', 'C1', 'A207', 'Installed'),
  ('DU208', 'D01', '861538987361168', 'DL1', 'C1', 'A208', 'Installed'),
  ('DU209', 'D02', '863273649441589', 'DL1', 'C1', 'A209', 'Installed'),
  ('DU210', 'D01', '860612544393558', 'DL1', 'C1', 'A210', 'Installed'),
  ('DU211', 'D02', '867731102948816', 'DL1', 'C1', 'A2',   'Installed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO proto_vehicle.device_details (device_unit_id, device_type, device_name, serial_number, purchase_date, warranty_expiry)
VALUES
  ('DU201', 'Primary Device', 'Tracker Truck 01', 'SN-60201', '2025-01-12', '2027-01-12'),
  ('DU202', 'Primary Device', 'Tracker Truck 02', 'SN-60202', '2025-01-12', '2027-01-12'),
  ('DU203', 'Primary Device', 'Tracker Truck 03', 'SN-60203', '2025-02-03', '2027-02-03'),
  ('DU204', 'Primary Device', 'Tracker Truck 04', 'SN-60204', '2025-02-03', '2027-02-03'),
  ('DU205', 'Primary Device', 'Tracker Truck 05', 'SN-60205', '2025-03-20', '2027-03-20'),
  ('DU206', 'Primary Device', 'Tracker Van 06',   'SN-60206', '2025-03-20', '2027-03-20'),
  ('DU207', 'Primary Device', 'Tracker Van 07',   'SN-60207', '2025-05-08', '2027-05-08'),
  ('DU208', 'Primary Device', 'Tracker Pickup 08','SN-60208', '2025-05-08', '2027-05-08'),
  ('DU209', 'Primary Device', 'Tracker Pickup 09','SN-60209', '2025-06-14', '2027-06-14'),
  ('DU210', 'Primary Device', 'Tracker Bus 10',   'SN-60210', '2025-06-14', '2027-06-14'),
  ('DU211', 'Primary Device', 'Tracker Truck 15', 'SN-60211', '2025-07-01', '2027-07-01')
ON CONFLICT (device_unit_id) DO NOTHING;

INSERT INTO core.connectivity (id, network_id, identifier_type, identifier, number, provider, owner_dealer_id, device_unit_id, status) VALUES
  ('CN201', 'NW01', 'ICCID', '8996685333456049163', '966500201001', 'Mobily', 'DL1', 'DU201', 'Active'),
  ('CN202', 'NW01', 'ICCID', '8996571322197507340', '966500201002', 'Mobily', 'DL1', 'DU202', 'Active'),
  ('CN203', 'NW01', 'ICCID', '8996305151722343230', '966500201003', 'STC',    'DL1', 'DU203', 'Active'),
  ('CN204', 'NW01', 'ICCID', '8996433889120448712', '966500201004', 'STC',    'DL1', 'DU204', 'Active'),
  ('CN205', 'NW01', 'ICCID', '8996096978836205516', '966500201005', 'Zain',   'DL1', 'DU205', 'Active'),
  ('CN206', 'NW01', 'ICCID', '8996113026477810293', '966500201006', 'Mobily', 'DL1', 'DU206', 'Active'),
  ('CN207', 'NW01', 'ICCID', '8996951734001982245', '966500201007', 'Zain',   'DL1', 'DU207', 'Active'),
  ('CN208', 'NW01', 'ICCID', '8996033852660917384', '966500201008', 'STC',    'DL1', 'DU208', 'Active'),
  ('CN209', 'NW01', 'ICCID', '8996929858310274461', '966500201009', 'Mobily', 'DL1', 'DU209', 'Active'),
  ('CN210', 'NW01', 'ICCID', '8996486482775530198', '966500201010', 'STC',    'DL1', 'DU210', 'Active'),
  ('CN211', 'NW01', 'ICCID', '8996775210486630917', '966500201011', 'Zain',   'DL1', 'DU211', 'Active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO proto_vehicle.sim_details (connectivity_id, plan, purchase_date, subscription_date, support_number, active)
VALUES
  ('CN201', 'IoT Data 1 GB', '2025-01-10', '2025-01-12', '1100', true),
  ('CN202', 'IoT Data 1 GB', '2025-01-10', '2025-01-12', '1100', true),
  ('CN203', 'IoT Data 5 GB', '2025-02-01', '2025-02-03', '900',  true),
  ('CN204', 'IoT Data 5 GB', '2025-02-01', '2025-02-03', '900',  true),
  ('CN205', 'Fleet M2M Unlimited', '2025-03-18', '2025-03-20', '959', true),
  ('CN206', 'IoT Data 1 GB', '2025-03-18', '2025-03-20', '1100', true),
  ('CN207', 'Fleet M2M Unlimited', '2025-05-06', '2025-05-08', '959', true),
  ('CN208', 'IoT Data 5 GB', '2025-05-06', '2025-05-08', '900',  true),
  ('CN209', 'IoT Data 1 GB', '2025-06-12', '2025-06-14', '1100', true),
  ('CN210', 'IoT Data 5 GB', '2025-06-12', '2025-06-14', '900',  true),
  ('CN211', 'Fleet M2M Unlimited', '2025-06-30', '2025-07-01', '959', true)
ON CONFLICT (connectivity_id) DO NOTHING;
