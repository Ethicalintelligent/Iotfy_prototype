-- Prototype: vehicle (Add Vehicle / Add Device forms from the approved GPS Platform design,
-- D:/Project/GPS_Platform/approved_degin 07-01 and 07-02).
-- Branch: proto/vehicle   Schema: proto_vehicle
-- Core keeps what it already has: the vehicle is a core.assets row (name = call sign,
-- plate_serial = plate number, asset_group, site_id, status) and the device a core.device_units
-- row (model, IMEI, status). These side tables only add the extra fields.
-- Safe to run twice. Run under the prototyper role.
SET ROLE iotify_prototyper;
SELECT public.new_prototype('vehicle');

-- Choices behind the "+ Add" links (category, type, colour, make, model, fuel type).
CREATE TABLE IF NOT EXISTS proto_vehicle.vehicle_lookups (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('category', 'vehicle_type', 'color', 'make', 'model', 'fuel_type')),
  value text NOT NULL,
  parent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, value)
);

-- One row per vehicle: General Info, Assignment, Fuel and Tracking fields.
CREATE TABLE IF NOT EXISTS proto_vehicle.vehicle_details (
  asset_id text PRIMARY KEY REFERENCES core.assets(id) ON DELETE CASCADE,
  -- General Info
  category text,
  vehicle_type text,
  operation_code text,
  vin text,
  engine_no text,
  color text,
  make text,
  model text,
  year integer CHECK (year IS NULL OR year BETWEEN 1950 AND 2100),
  odometer_km numeric CHECK (odometer_km IS NULL OR odometer_km >= 0),
  speed_limit_kmh numeric CHECK (speed_limit_kmh IS NULL OR speed_limit_kmh > 0),
  height_cm numeric CHECK (height_cm IS NULL OR height_cm > 0),
  ownership text CHECK (ownership IN ('Owned', 'Leased', 'Rented', 'Hired')),
  branch text,
  registration_date date,
  insurance_expiry date,
  fc_expiry date,
  permit_expiry date,
  photo_name text,
  document_names text[],
  -- Assignment (company, group and site stay on core.assets)
  fleet_manager_id text REFERENCES core.users(id) ON DELETE SET NULL,
  supervisor_id text REFERENCES core.users(id) ON DELETE SET NULL,
  operator_name text,
  -- Fuel
  fuel_type text,
  tank_capacity_l numeric CHECK (tank_capacity_l IS NULL OR tank_capacity_l >= 0),
  mileage_km_l numeric CHECK (mileage_km_l IS NULL OR mileage_km_l >= 0),
  oil_capacity_l numeric CHECK (oil_capacity_l IS NULL OR oil_capacity_l >= 0),
  cost_per_l numeric CHECK (cost_per_l IS NULL OR cost_per_l >= 0),
  max_fuel_level_l numeric CHECK (max_fuel_level_l IS NULL OR max_fuel_level_l >= 0),
  fuel_calibration text,
  -- Tracking
  tracking_type text CHECK (tracking_type IN ('Tracking', 'Trailer')),
  debugging_mode text CHECK (debugging_mode IN ('Off', 'On')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Geofences of a company, and which vehicles use them (Map & Geofence).
CREATE TABLE IF NOT EXISTS proto_vehicle.geofences (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES core.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  shape text NOT NULL CHECK (shape IN ('Circle', 'Freeform')),
  center_lat numeric,
  center_lng numeric,
  radius_m numeric CHECK (radius_m IS NULL OR radius_m > 0),
  points jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS proto_vehicle.vehicle_geofences (
  asset_id text NOT NULL REFERENCES core.assets(id) ON DELETE CASCADE,
  geofence_id text NOT NULL REFERENCES proto_vehicle.geofences(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (asset_id, geofence_id)
);

-- Tracker inputs and outputs (Tracking: Digital I/O, Analog, 1-Wire, Bluetooth, RS232, RS485).
CREATE TABLE IF NOT EXISTS proto_vehicle.vehicle_io (
  id text PRIMARY KEY,
  asset_id text NOT NULL REFERENCES core.assets(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('Digital input', 'Digital output', 'Analog', '1-Wire', 'Bluetooth', 'RS232', 'RS485')),
  port_no integer CHECK (port_no IS NULL OR port_no BETWEEN 1 AND 16),
  signal text,
  analog_type text,
  reverse boolean,
  min_value numeric,
  max_value numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One row per device unit: the Add Device fields core doesn't have.
CREATE TABLE IF NOT EXISTS proto_vehicle.device_details (
  device_unit_id text PRIMARY KEY REFERENCES core.device_units(id) ON DELETE CASCADE,
  device_type text CHECK (device_type IN ('Primary Device', 'Additional Device')),
  primary_unit_id text REFERENCES core.device_units(id) ON DELETE SET NULL,
  device_name text,
  serial_number text,
  purchase_date date,
  warranty_expiry date,
  extended_warranty date,
  expiry_reminder text CHECK (expiry_reminder IN ('7 days before', '15 days before', '30 days before', '60 days before')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
