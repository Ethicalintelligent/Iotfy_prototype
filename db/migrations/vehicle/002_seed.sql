-- Prototype: vehicle. Demo choices for the "+ Add" lists and two demo geofences. Invented data only.
-- Safe to run twice.
SET ROLE iotify_prototyper;

INSERT INTO proto_vehicle.vehicle_lookups (id, kind, value, parent) VALUES
  ('LK1', 'category', 'Garbage Compactor', NULL),
  ('LK2', 'category', 'Van', NULL),
  ('LK3', 'category', 'Pickup - 1 cabin', NULL),
  ('LK4', 'category', 'Truck', NULL),
  ('LK5', 'category', 'Bus', NULL),
  ('LK6', 'category', 'Car', NULL),
  ('LK7', 'vehicle_type', 'Light', NULL),
  ('LK8', 'vehicle_type', 'Medium', NULL),
  ('LK9', 'vehicle_type', 'Heavy', NULL),
  ('LK10', 'color', 'White', NULL),
  ('LK11', 'color', 'Silver', NULL),
  ('LK12', 'color', 'Black', NULL),
  ('LK13', 'color', 'Blue', NULL),
  ('LK14', 'make', 'Isuzu', NULL),
  ('LK15', 'make', 'Hyundai', NULL),
  ('LK16', 'make', 'Ford', NULL),
  ('LK17', 'make', 'Mitsubishi', NULL),
  ('LK18', 'model', 'D-Max', 'Isuzu'),
  ('LK19', 'model', 'NPR', 'Isuzu'),
  ('LK20', 'model', 'H-1', 'Hyundai'),
  ('LK21', 'model', 'Transit', 'Ford'),
  ('LK22', 'model', 'Canter', 'Mitsubishi'),
  ('LK23', 'fuel_type', 'Diesel', NULL),
  ('LK24', 'fuel_type', 'Petrol', NULL),
  ('LK25', 'fuel_type', 'CNG', NULL),
  ('LK26', 'fuel_type', 'Electric', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO proto_vehicle.geofences (id, company_id, name, shape, center_lat, center_lng, radius_m, points) VALUES
  ('GF1', 'C5', 'Head Office', 'Circle', 24.7136, 46.6753, 400, NULL),
  ('GF2', 'C5', 'North Depot', 'Circle', 24.7743, 46.7386, 600, NULL),
  ('GF3', 'C5', 'Ring Road Zone', 'Freeform', NULL, NULL, NULL,
   '[[24.70,46.64],[24.73,46.66],[24.72,46.70],[24.69,46.69]]'::jsonb)
ON CONFLICT (id) DO NOTHING;
