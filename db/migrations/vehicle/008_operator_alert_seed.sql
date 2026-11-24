-- Prototype: vehicle. Demo alert settings for Manage > Alert Configuration (approved GPS Vehicle
-- Tracking design, Desktop/vs/Manage-Alert-Configuration.html, IT-0012): a switched-off
-- No Transmission rule, an SOS rule that also sends SMS and escalates, and a weekday Door Open
-- rule, so the grid shows On / Off, other notification modes and days as in the design.
-- Sample Company A (C1) only; invented values. Adds rows only.
-- Safe to run twice. Run under the prototyper role.
SET ROLE iotify_prototyper;

INSERT INTO proto_vehicle.alert_configs
  (id, company_id, asset_id, alert_type, enabled, severity, threshold, threshold_unit, ignore_seconds,
   interval_value, interval_unit, days, start_time, end_time, notify_push, notify_sms, notify_email,
   escalate_after_min, escalate_to)
VALUES
  ('AC8',  'C1', 'A204', 'No Transmission', false, 'Medium',   30,   'minutes', 0,  NULL, NULL,
   ARRAY['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], '00:00', '23:59', true, false, false, NULL, NULL),
  ('AC9',  'C1', 'A205', 'SOS',             true,  'Critical', NULL, NULL,      30, 10,   'Minutes',
   ARRAY['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], '00:00', '23:59', true, true,  false, 15, 'fleet.lead@sample-a.test'),
  ('AC10', 'C1', 'A207', 'Door Open',       true,  'Medium',   20,   'km/h',    0,  10,   'Minutes',
   ARRAY['Sun','Mon','Tue','Wed','Thu'], '06:00', '20:00', true, false, true, NULL, NULL)
ON CONFLICT DO NOTHING;
