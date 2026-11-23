-- Prototype: vehicle. GPS Vehicle Tracking dashboard from the approved design (Desktop/vs,
-- Nov 2026, IT-0012).
--  1. Geofences get a zone type (General / Preferred / Restricted): the dashboard's Geofence
--     Monitoring panel and Manage > Geo Configuration group zones by it.
--  2. A demo fleet for Sample Company A (C1), so the dashboard has something to show:
--     10 more vehicles beside its Truck 14 and Truck 15, vehicle details for all 12, and four
--     geofences in Riyadh. Invented plates and names only.
--     The core.assets rows are sample data for testing (docs/CORE_RULES.md rule 5): they are
--     not merged with the branch; this file is here for review.
-- Safe to run twice. Run under the prototyper role.
SET ROLE iotify_prototyper;
SELECT public.new_prototype('vehicle');

ALTER TABLE proto_vehicle.geofences ADD COLUMN IF NOT EXISTS zone_type text NOT NULL DEFAULT 'General';
ALTER TABLE proto_vehicle.geofences DROP CONSTRAINT IF EXISTS geofences_zone_type_check;
ALTER TABLE proto_vehicle.geofences ADD CONSTRAINT geofences_zone_type_check
  CHECK (zone_type IN ('General', 'Preferred', 'Restricted'));

-- Sample core rows (testing only, see above).
INSERT INTO core.assets (id, company_id, asset_type_id, name, plate_serial, asset_group, status) VALUES
  ('A201', 'C1', 'AT1', 'Truck 01', 'KSA 4570', 'North fleet', 'Active'),
  ('A202', 'C1', 'AT1', 'Truck 02', 'KSA 2955', 'North fleet', 'Active'),
  ('A203', 'C1', 'AT1', 'Truck 03', 'KSA 5099', 'North fleet', 'Active'),
  ('A204', 'C1', 'AT1', 'Truck 04', 'KSA 1380', 'North fleet', 'Active'),
  ('A205', 'C1', 'AT1', 'Truck 05', 'KSA 7233', 'South fleet', 'Active'),
  ('A206', 'C1', 'AT1', 'Van 06', 'KSA 2218', 'South fleet', 'Active'),
  ('A207', 'C1', 'AT1', 'Van 07', 'KSA 2831', 'South fleet', 'Active'),
  ('A208', 'C1', 'AT1', 'Pickup 08', 'KSA 4077', 'North fleet', 'Active'),
  ('A209', 'C1', 'AT1', 'Pickup 09', 'KSA 3768', 'South fleet', 'Active'),
  ('A210', 'C1', 'AT1', 'Bus 10', 'KSA 1303', 'North fleet', 'Active')
ON CONFLICT (id) DO NOTHING;

UPDATE core.assets SET plate_serial = 'KSA 8504'
  WHERE id = 'A1' AND company_id = 'C1' AND plate_serial IS NULL;
UPDATE core.assets SET plate_serial = 'KSA 9673'
  WHERE id = 'A2' AND company_id = 'C1' AND plate_serial IS NULL;

INSERT INTO proto_vehicle.vehicle_details
  (asset_id, category, vehicle_type, make, model, year, odometer_km, speed_limit_kmh, ownership, fuel_type, tank_capacity_l, tracking_type)
VALUES
  ('A1',   'Truck',             'Heavy',  'Isuzu',      'NPR',     2021, 118420, 80,  'Owned',  'Diesel', 200, 'Tracking'),
  ('A2',   'Truck',             'Heavy',  'Isuzu',      'NPR',     2022,  96210, 80,  'Owned',  'Diesel', 200, 'Tracking'),
  ('A201', 'Garbage Compactor', 'Heavy',  'Mitsubishi', 'Canter',  2020,  99877, 80,  'Owned',  'Diesel', 180, 'Tracking'),
  ('A202', 'Garbage Compactor', 'Heavy',  'Mitsubishi', 'Canter',  2021,  57542, 80,  'Owned',  'Diesel', 180, 'Tracking'),
  ('A203', 'Garbage Compactor', 'Heavy',  'Mitsubishi', 'Canter',  2019, 119128, 80,  'Leased', 'Diesel', 180, 'Tracking'),
  ('A204', 'Truck',             'Medium', 'Isuzu',      'NPR',     2022,  66290, 80,  'Owned',  'Diesel', 140, 'Tracking'),
  ('A205', 'Truck',             'Medium', 'Isuzu',      'NPR',     2023, 116812, 80,  'Owned',  'Diesel', 140, 'Tracking'),
  ('A206', 'Van',               'Light',  'Ford',       'Transit', 2023, 101272, 100, 'Rented', 'Petrol',  80, 'Tracking'),
  ('A207', 'Van',               'Light',  'Ford',       'Transit', 2022,  43118, 100, 'Owned',  'Petrol',  80, 'Tracking'),
  ('A208', 'Pickup - 1 cabin',  'Light',  'Isuzu',      'D-Max',   2024,  21907, 100, 'Owned',  'Diesel',  76, 'Tracking'),
  ('A209', 'Pickup - 1 cabin',  'Light',  'Isuzu',      'D-Max',   2021,  74560, 100, 'Leased', 'Diesel',  76, 'Tracking'),
  ('A210', 'Bus',               'Heavy',  'Hyundai',    'H-1',     2020,  88315, 90,  'Owned',  'Diesel', 120, 'Tracking')
ON CONFLICT (asset_id) DO NOTHING;

-- Operators on some demo vehicles (invented names), for the dashboard's Top Drivers.
UPDATE proto_vehicle.vehicle_details AS d SET operator_name = o.name
FROM (VALUES
  ('A201', 'Murugan S'),
  ('A202', 'Shiju V'),
  ('A203', 'Prakash P'),
  ('A205', 'Omar Haddad'),
  ('A208', 'Yousef Saleh'),
  ('A210', 'Bilal Rahman')
) AS o(asset_id, name)
WHERE d.asset_id = o.asset_id AND d.operator_name IS NULL;

INSERT INTO proto_vehicle.geofences (id, company_id, name, shape, center_lat, center_lng, radius_m, points, zone_type) VALUES
  ('GF11', 'C1', 'Head Office', 'Circle', 24.7136, 46.6753, 600, NULL, 'Preferred'),
  ('GF12', 'C1', 'North Depot', 'Circle', 24.7743, 46.7386, 800, NULL, 'General'),
  ('GF13', 'C1', 'Industrial Area 2', 'Freeform', NULL, NULL, NULL,
   '[[24.640,46.760],[24.655,46.800],[24.630,46.825],[24.612,46.790]]'::jsonb, 'Restricted'),
  ('GF14', 'C1', 'Customer Zone East', 'Freeform', NULL, NULL, NULL,
   '[[24.700,46.770],[24.722,46.790],[24.708,46.815],[24.688,46.795]]'::jsonb, 'General')
ON CONFLICT (id) DO NOTHING;

INSERT INTO proto_vehicle.vehicle_geofences (asset_id, geofence_id) VALUES
  ('A201', 'GF11'),
  ('A202', 'GF12'),
  ('A203', 'GF13'),
  ('A204', 'GF14'),
  ('A205', 'GF11'),
  ('A209', 'GF13')
ON CONFLICT DO NOTHING;
