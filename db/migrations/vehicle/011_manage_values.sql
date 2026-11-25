-- Prototype: vehicle. IT-0038 (admin, 25 Nov 2026): the Manage › Vehicle form offers values the
-- vehicle_details checks refused, so they were not saved:
--   ownership:     'Contractor' (the approved design's list: Owned, Leased, Rented, Contractor)
--   tracking_type: 'Tracking + Dashcam', 'Tracking + Waste', 'Dashcam'
-- Widened here, keeping the older values that existing rows may hold ('Hired', 'Trailer').
-- Only proto_vehicle changes (allowed on proto/vehicle). The rest of the unsaved Manage fields go
-- to core through core change request 002 (db/migrations/core/004_manage_form_fields.sql).
-- Safe to run twice. Run under the prototyper role.
SET ROLE iotify_prototyper;

ALTER TABLE proto_vehicle.vehicle_details DROP CONSTRAINT IF EXISTS vehicle_details_ownership_check;
ALTER TABLE proto_vehicle.vehicle_details
  ADD CONSTRAINT vehicle_details_ownership_check
  CHECK (ownership IN ('Owned', 'Leased', 'Rented', 'Contractor', 'Hired'));

ALTER TABLE proto_vehicle.vehicle_details DROP CONSTRAINT IF EXISTS vehicle_details_tracking_type_check;
ALTER TABLE proto_vehicle.vehicle_details
  ADD CONSTRAINT vehicle_details_tracking_type_check
  CHECK (tracking_type IN ('Tracking', 'Tracking + Dashcam', 'Tracking + Waste', 'Dashcam', 'Trailer'));
