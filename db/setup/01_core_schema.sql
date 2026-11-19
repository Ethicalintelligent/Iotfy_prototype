-- IoTIFY platform: CORE schema (target design) for Neon. All core tables live in schema `core`.
-- Generated from the architecture handover. Tables match section 11 of the handover doc.
-- IDs are text in the sample data (N001, F01...); production should use UUIDs.
-- Foreign keys are DEFERRABLE INITIALLY DEFERRED so sample data loads in one transaction.
-- Includes core change 002 (18 Nov 2026): white-label resellers, support access, support sessions.
-- From now on, approved core changes go in migrations/core/NNN_*.sql and run after 01-03 (see CORE_RULES.md).

BEGIN;
CREATE SCHEMA IF NOT EXISTS core;
SET search_path = core;

-- Lookups (Catalogue)
CREATE TABLE lookups (
  id text PRIMARY KEY,
  list text,
  value text,
  sort numeric,
  active boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list, value)
);

-- Product Tree (Catalogue)
--   kind: value from lookups where list = 'Product Kind'
--   requires_certification: value from lookups where list = 'Certification'
CREATE TABLE nodes (
  id text PRIMARY KEY,
  parent_id text,
  type text CHECK (type IN ('Group', 'Product')),
  name text,
  code text,
  kind text,
  status text CHECK (status IN ('Active', 'Deferred', 'Inactive')),
  sort numeric,
  requires_certification text,
  markets text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bundle Rules (Catalogue)
CREATE TABLE bundle_rules (
  id text PRIMARY KEY,
  from_product text,
  type text CHECK (type IN ('Includes', 'Needs', 'Optional')),
  to_product text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_product, type, to_product)
);

-- App Features (Catalogue)
--   feature_group: value from lookups where list = 'Feature Group'
--   type: value from lookups where list = 'Feature Type'
--   latency_need: value from lookups where list = 'Latency'
CREATE TABLE features (
  id text PRIMARY KEY,
  feature_group text,
  name text,
  is_command boolean,
  status text CHECK (status IN ('Active', 'Deferred', 'Inactive')),
  type text,
  latency_need text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Product App Features (Catalogue)
CREATE TABLE product_features (
  id text PRIMARY KEY,
  product_id text,
  feature_id text,
  availability text CHECK (availability IN ('Standard', 'Optional')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, feature_id)
);

-- Data Points (Catalogue)
CREATE TABLE data_points (
  id text PRIMARY KEY,
  name text,
  unit text,
  direction text CHECK (direction IN ('In', 'Out')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- App Feature Data Points (Catalogue)
CREATE TABLE feature_data_points (
  id text PRIMARY KEY,
  feature_id text,
  data_point_id text,
  required boolean,
  alt_group text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feature_id, data_point_id)
);

-- Interfaces (Catalogue)
CREATE TABLE interfaces (
  id text PRIMARY KEY,
  name text,
  direction text CHECK (direction IN ('In', 'Out', 'Both')),
  medium text CHECK (medium IN ('Wired', 'Wireless')),
  description text,
  bus boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Networks (Catalogue)
CREATE TABLE networks (
  id text PRIMARY KEY,
  name text,
  category text CHECK (category IN ('Cellular', 'Cellular LPWA', 'LPWAN', 'Satellite', 'Short range', 'Local', 'Wired', 'Via host')),
  needs text CHECK (needs IN ('Operator coverage', 'Own gateway', 'Site network', 'Host device', 'Sky view', 'None')),
  downlink text CHECK (downlink IN ('Full', 'Limited', 'Very limited', 'None')),
  real_time boolean,
  typical_interval_seconds numeric,
  markets text,
  connectivity_fee boolean,
  identifier_type text CHECK (identifier_type IN ('ICCID', 'DevEUI', 'Sigfox ID', 'Terminal ID', 'None')),
  notes text,
  status text CHECK (status IN ('Active', 'Deferred', 'Inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Device Models (Catalogue)
--   type: value from lookups where list = 'Device Type'
CREATE TABLE device_models (
  id text PRIMARY KEY,
  maker text,
  model text,
  type text,
  network text,
  own_hardware boolean,
  status text CHECK (status IN ('Active', 'Deferred', 'Inactive')),
  certifications text,
  placement text CHECK (placement IN ('On asset', 'Site infrastructure')),
  server_configured boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Device Interfaces (Catalogue)
CREATE TABLE device_interfaces (
  id text PRIMARY KEY,
  device_model_id text,
  interface_id text,
  count numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_model_id, interface_id)
);

-- Device Built-in Data Points (Catalogue)
CREATE TABLE device_data_points (
  id text PRIMARY KEY,
  device_model_id text,
  data_point_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_model_id, data_point_id)
);

-- Sensor Models (Catalogue)
CREATE TABLE sensor_models (
  id text PRIMARY KEY,
  maker text,
  model text,
  status text CHECK (status IN ('Active', 'Deferred', 'Inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sensor Interfaces (Catalogue)
CREATE TABLE sensor_interfaces (
  id text PRIMARY KEY,
  sensor_model_id text,
  interface_id text,
  protocol text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sensor_model_id, interface_id)
);

-- Sensor Data Points (Catalogue)
CREATE TABLE sensor_data_points (
  id text PRIMARY KEY,
  sensor_model_id text,
  data_point_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sensor_model_id, data_point_id)
);

-- Data Point Mappings (Catalogue)
--   model_id: device or sensor model ID, by model kind
CREATE TABLE data_point_mappings (
  id text PRIMARY KEY,
  model_kind text CHECK (model_kind IN ('Device', 'Sensor')),
  model_id text,
  data_point_id text,
  protocol text CHECK (protocol IN ('Modbus RTU', 'Teltonika AVL', 'LoRaWAN payload', 'Sigfox payload', 'BLE')),
  address text,
  function_code numeric,
  data_type text CHECK (data_type IN ('uint16', 'int16', 'uint32', 'int32', 'float32', 'bool', 'bytes')),
  scale numeric,
  value_offset numeric,
  access text CHECK (access IN ('Read', 'Write')),
  poll_seconds numeric,
  decoder text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Product Preferred Devices (Catalogue)
CREATE TABLE product_devices (
  id text PRIMARY KEY,
  product_id text,
  device_model_id text,
  priority numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, priority)
);

-- Asset Types (Catalogue)
CREATE TABLE asset_types (
  id text PRIMARY KEY,
  name text,
  category text CHECK (category IN ('Movable', 'Person', 'Fixed site', 'Inventory item', 'Camera view')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Product Asset Types (Catalogue)
CREATE TABLE product_asset_types (
  id text PRIMARY KEY,
  product_id text,
  asset_type_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, asset_type_id)
);

-- Price Plans (Catalogue)
CREATE TABLE price_plans (
  id text PRIMARY KEY,
  product_id text,
  sold_to text CHECK (sold_to IN ('Dealer', 'Company')),
  base_price numeric,
  period text CHECK (period IN ('Month', 'Year')),
  currency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, sold_to)
);

-- Price Rules (Catalogue)
CREATE TABLE price_rules (
  id text PRIMARY KEY,
  plan_id text,
  rule_type text CHECK (rule_type IN ('Tier', 'Quantity band', 'Asset type', 'Feature add-on', 'Item count band', 'Package discount')),
  condition text,
  effect text CHECK (effect IN ('Replace', 'Add', 'Discount %')),
  value numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Hardware Prices (Catalogue)
--   model_id: device or sensor model ID, by model kind
CREATE TABLE hardware_prices (
  id text PRIMARY KEY,
  model_kind text CHECK (model_kind IN ('Device', 'Sensor')),
  model_id text,
  sold_to text CHECK (sold_to IN ('Dealer', 'Company')),
  supply text CHECK (supply IN ('Sold', 'Rented', 'Free with minimum term', 'Customer provided')),
  price numeric,
  min_term_months numeric,
  currency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Roles & Permissions (Catalogue)
CREATE TABLE roles (
  id text PRIMARY KEY,
  level text CHECK (level IN ('Platform', 'Dealer', 'Company', 'User')),
  name text,
  permissions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Role Feature Access (Catalogue)
CREATE TABLE role_features (
  id text PRIMARY KEY,
  role_id text,
  feature_id text,
  access text CHECK (access IN ('Hidden', 'View', 'Use')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, feature_id)
);

-- Dealers (Business)
CREATE TABLE dealers (
  id text PRIMARY KEY,
  name text,
  country text,
  contact text,
  status text CHECK (status IN ('Active', 'Suspended')),
  reseller_type text NOT NULL DEFAULT 'Reseller' CHECK (reseller_type IN ('Reseller', 'White-label reseller')),  -- set by platform admin only
  brand_name text,             -- white-label only
  brand_logo text,             -- small image as data URI
  brand_color text,            -- #RRGGBB
  support_access_until date,   -- dealer lets EIT open its console until this date
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Companies (Business)
--   country: value from lookups where list = 'Market'
CREATE TABLE companies (
  id text PRIMARY KEY,
  dealer_id text,
  name text,
  contact text,
  status text CHECK (status IN ('Active', 'Suspended')),
  country text,
  support_access_until date,   -- company lets its dealer open its apps until this date
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Users (Business)
--   account_id: dealer or company ID, by user level
CREATE TABLE users (
  id text PRIMARY KEY,
  name text,
  email text,
  level text CHECK (level IN ('Platform', 'Dealer', 'Company')),
  account_id text,
  role_id text,
  asset_group text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sites (Business)
CREATE TABLE sites (
  id text PRIMARY KEY,
  company_id text,
  name text,
  address text,
  status text CHECK (status IN ('Active', 'Inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Zones (Business)
CREATE TABLE zones (
  id text PRIMARY KEY,
  site_id text,
  parent_zone_id text,
  name text,
  level text CHECK (level IN ('Building', 'Floor', 'Room', 'Area')),
  restricted boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Assets (Business)
CREATE TABLE assets (
  id text PRIMARY KEY,
  company_id text,
  asset_type_id text,
  name text,
  plate_serial text,
  asset_group text,
  status text CHECK (status IN ('Active', 'Inactive')),
  site_id text,
  carried_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Device Units (Business)
CREATE TABLE device_units (
  id text PRIMARY KEY,
  device_model_id text,
  imei text,
  owner_dealer_id text,
  company_id text,
  asset_id text,
  status text CHECK (status IN ('In stock', 'Installed', 'Returned')),
  zone_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Connectivity (Business)
CREATE TABLE connectivity (
  id text PRIMARY KEY,
  network_id text,
  identifier_type text CHECK (identifier_type IN ('ICCID', 'DevEUI', 'Sigfox ID', 'Terminal ID', 'None')),
  identifier text,
  number text,
  provider text,
  owner_dealer_id text,
  device_unit_id text,
  billing text CHECK (billing IN ('Bundled', 'Separate line')),
  status text CHECK (status IN ('In stock', 'Active', 'Suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sensor Units (Business)
CREATE TABLE sensor_units (
  id text PRIMARY KEY,
  sensor_model_id text,
  serial text,
  owner_dealer_id text,
  device_unit_id text,
  interface_id text,
  slot text,
  calibration text,
  slave_address numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Vehicle Certificates (Business)
--   certification: value from lookups where list = 'Certification'
CREATE TABLE certificates (
  id text PRIMARY KEY,
  asset_id text,
  device_unit_id text,
  certification text,
  certificate_no text,
  issued_by text,
  issued_on date,
  valid_until date,
  status text CHECK (status IN ('Pending', 'Issued', 'Expired', 'Rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Subscriptions (Business)
--   seller_id: 'PLATFORM' or a dealer ID
--   buyer_id: dealer or company ID
--   tier: value from lookups where list = 'Tier'
CREATE TABLE subscriptions (
  id text PRIMARY KEY,
  seller_id text,
  buyer_id text,
  product_id text,
  plan_id text,
  asset_id text,
  qty numeric,
  tier text,
  start date,
  min_term_months numeric,
  status text CHECK (status IN ('Trial', 'Active', 'Pending activation', 'Suspended', 'Ended')),
  edition_choice text,
  item_count numeric,
  package_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Quotes (Business)
CREATE TABLE quotes (
  id text PRIMARY KEY,
  dealer_id text,
  company_id text,
  crm_id text,
  version numeric,
  valid_until date,
  status text CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Lost')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Quote Lines (Business)
--   item_id: product (nodes) ID or device/sensor model ID, by kind
--   tier: value from lookups where list = 'Tier'
CREATE TABLE quote_lines (
  id text PRIMARY KEY,
  quote_id text,
  kind text CHECK (kind IN ('Product', 'Hardware')),
  item_id text,
  heading text,
  tier text,
  asset_type_id text,
  supply text CHECK (supply IN ('Sold', 'Rented', 'Free with minimum term', 'Customer provided')),
  min_term_months numeric,
  qty numeric,
  unit_price numeric,
  rules_applied text,
  edition_choice text,
  item_count numeric,
  package_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Support Sessions (Business): every support visit (EIT -> dealer console, dealer -> customer app). View-only, reason required.
CREATE TABLE support_sessions (
  id text PRIMARY KEY,
  actor_user_id text,
  target_level text CHECK (target_level IN ('Dealer', 'Company')),
  target_account_id text NOT NULL,
  product_id text,
  reason text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sensor slave addresses are unique per device bus port
CREATE UNIQUE INDEX ON sensor_units (device_unit_id, interface_id, slave_address) WHERE slave_address IS NOT NULL;

-- Links
ALTER TABLE nodes ADD FOREIGN KEY (parent_id) REFERENCES nodes(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE bundle_rules ADD FOREIGN KEY (from_product) REFERENCES nodes(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE bundle_rules ADD FOREIGN KEY (to_product) REFERENCES nodes(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE product_features ADD FOREIGN KEY (product_id) REFERENCES nodes(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE product_features ADD FOREIGN KEY (feature_id) REFERENCES features(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE feature_data_points ADD FOREIGN KEY (feature_id) REFERENCES features(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE feature_data_points ADD FOREIGN KEY (data_point_id) REFERENCES data_points(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE device_models ADD FOREIGN KEY (network) REFERENCES networks(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE device_interfaces ADD FOREIGN KEY (device_model_id) REFERENCES device_models(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE device_interfaces ADD FOREIGN KEY (interface_id) REFERENCES interfaces(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE device_data_points ADD FOREIGN KEY (device_model_id) REFERENCES device_models(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE device_data_points ADD FOREIGN KEY (data_point_id) REFERENCES data_points(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE sensor_interfaces ADD FOREIGN KEY (sensor_model_id) REFERENCES sensor_models(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE sensor_interfaces ADD FOREIGN KEY (interface_id) REFERENCES interfaces(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE sensor_data_points ADD FOREIGN KEY (sensor_model_id) REFERENCES sensor_models(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE sensor_data_points ADD FOREIGN KEY (data_point_id) REFERENCES data_points(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE data_point_mappings ADD FOREIGN KEY (data_point_id) REFERENCES data_points(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE product_devices ADD FOREIGN KEY (product_id) REFERENCES nodes(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE product_devices ADD FOREIGN KEY (device_model_id) REFERENCES device_models(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE product_asset_types ADD FOREIGN KEY (product_id) REFERENCES nodes(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE product_asset_types ADD FOREIGN KEY (asset_type_id) REFERENCES asset_types(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE price_plans ADD FOREIGN KEY (product_id) REFERENCES nodes(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE price_rules ADD FOREIGN KEY (plan_id) REFERENCES price_plans(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE role_features ADD FOREIGN KEY (role_id) REFERENCES roles(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE role_features ADD FOREIGN KEY (feature_id) REFERENCES features(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE companies ADD FOREIGN KEY (dealer_id) REFERENCES dealers(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE users ADD FOREIGN KEY (role_id) REFERENCES roles(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE sites ADD FOREIGN KEY (company_id) REFERENCES companies(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE zones ADD FOREIGN KEY (site_id) REFERENCES sites(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE zones ADD FOREIGN KEY (parent_zone_id) REFERENCES zones(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE assets ADD FOREIGN KEY (company_id) REFERENCES companies(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE assets ADD FOREIGN KEY (asset_type_id) REFERENCES asset_types(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE assets ADD FOREIGN KEY (site_id) REFERENCES sites(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE assets ADD FOREIGN KEY (carried_by) REFERENCES assets(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE device_units ADD FOREIGN KEY (device_model_id) REFERENCES device_models(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE device_units ADD FOREIGN KEY (owner_dealer_id) REFERENCES dealers(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE device_units ADD FOREIGN KEY (company_id) REFERENCES companies(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE device_units ADD FOREIGN KEY (asset_id) REFERENCES assets(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE device_units ADD FOREIGN KEY (zone_id) REFERENCES zones(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE connectivity ADD FOREIGN KEY (network_id) REFERENCES networks(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE connectivity ADD FOREIGN KEY (owner_dealer_id) REFERENCES dealers(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE connectivity ADD FOREIGN KEY (device_unit_id) REFERENCES device_units(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE sensor_units ADD FOREIGN KEY (sensor_model_id) REFERENCES sensor_models(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE sensor_units ADD FOREIGN KEY (owner_dealer_id) REFERENCES dealers(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE sensor_units ADD FOREIGN KEY (device_unit_id) REFERENCES device_units(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE sensor_units ADD FOREIGN KEY (interface_id) REFERENCES interfaces(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE certificates ADD FOREIGN KEY (asset_id) REFERENCES assets(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE certificates ADD FOREIGN KEY (device_unit_id) REFERENCES device_units(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE subscriptions ADD FOREIGN KEY (product_id) REFERENCES nodes(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE subscriptions ADD FOREIGN KEY (plan_id) REFERENCES price_plans(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE subscriptions ADD FOREIGN KEY (asset_id) REFERENCES assets(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE subscriptions ADD FOREIGN KEY (edition_choice) REFERENCES nodes(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE subscriptions ADD FOREIGN KEY (package_id) REFERENCES nodes(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE quotes ADD FOREIGN KEY (dealer_id) REFERENCES dealers(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE quotes ADD FOREIGN KEY (company_id) REFERENCES companies(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE quote_lines ADD FOREIGN KEY (quote_id) REFERENCES quotes(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE quote_lines ADD FOREIGN KEY (asset_type_id) REFERENCES asset_types(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE quote_lines ADD FOREIGN KEY (edition_choice) REFERENCES nodes(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE quote_lines ADD FOREIGN KEY (package_id) REFERENCES nodes(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE support_sessions ADD FOREIGN KEY (actor_user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE support_sessions ADD FOREIGN KEY (product_id) REFERENCES nodes(id) DEFERRABLE INITIALLY DEFERRED;

-- Indexes on links
CREATE INDEX ON nodes (parent_id);
CREATE INDEX ON bundle_rules (from_product);
CREATE INDEX ON bundle_rules (to_product);
CREATE INDEX ON product_features (product_id);
CREATE INDEX ON product_features (feature_id);
CREATE INDEX ON feature_data_points (feature_id);
CREATE INDEX ON feature_data_points (data_point_id);
CREATE INDEX ON device_models (network);
CREATE INDEX ON device_interfaces (device_model_id);
CREATE INDEX ON device_interfaces (interface_id);
CREATE INDEX ON device_data_points (device_model_id);
CREATE INDEX ON device_data_points (data_point_id);
CREATE INDEX ON sensor_interfaces (sensor_model_id);
CREATE INDEX ON sensor_interfaces (interface_id);
CREATE INDEX ON sensor_data_points (sensor_model_id);
CREATE INDEX ON sensor_data_points (data_point_id);
CREATE INDEX ON data_point_mappings (data_point_id);
CREATE INDEX ON product_devices (product_id);
CREATE INDEX ON product_devices (device_model_id);
CREATE INDEX ON product_asset_types (product_id);
CREATE INDEX ON product_asset_types (asset_type_id);
CREATE INDEX ON price_plans (product_id);
CREATE INDEX ON price_rules (plan_id);
CREATE INDEX ON role_features (role_id);
CREATE INDEX ON role_features (feature_id);
CREATE INDEX ON companies (dealer_id);
CREATE INDEX ON users (role_id);
CREATE INDEX ON sites (company_id);
CREATE INDEX ON zones (site_id);
CREATE INDEX ON zones (parent_zone_id);
CREATE INDEX ON assets (company_id);
CREATE INDEX ON assets (asset_type_id);
CREATE INDEX ON assets (site_id);
CREATE INDEX ON assets (carried_by);
CREATE INDEX ON device_units (device_model_id);
CREATE INDEX ON device_units (owner_dealer_id);
CREATE INDEX ON device_units (company_id);
CREATE INDEX ON device_units (asset_id);
CREATE INDEX ON device_units (zone_id);
CREATE INDEX ON connectivity (network_id);
CREATE INDEX ON connectivity (owner_dealer_id);
CREATE INDEX ON connectivity (device_unit_id);
CREATE INDEX ON sensor_units (sensor_model_id);
CREATE INDEX ON sensor_units (owner_dealer_id);
CREATE INDEX ON sensor_units (device_unit_id);
CREATE INDEX ON sensor_units (interface_id);
CREATE INDEX ON certificates (asset_id);
CREATE INDEX ON certificates (device_unit_id);
CREATE INDEX ON subscriptions (product_id);
CREATE INDEX ON subscriptions (plan_id);
CREATE INDEX ON subscriptions (asset_id);
CREATE INDEX ON subscriptions (edition_choice);
CREATE INDEX ON subscriptions (package_id);
CREATE INDEX ON quotes (dealer_id);
CREATE INDEX ON quotes (company_id);
CREATE INDEX ON quote_lines (quote_id);
CREATE INDEX ON quote_lines (asset_type_id);
CREATE INDEX ON quote_lines (edition_choice);
CREATE INDEX ON quote_lines (package_id);
CREATE INDEX ON support_sessions (actor_user_id);
CREATE INDEX ON support_sessions (product_id);
CREATE INDEX ON support_sessions (target_account_id);

COMMIT;
