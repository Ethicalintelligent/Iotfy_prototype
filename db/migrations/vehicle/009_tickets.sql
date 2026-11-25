-- Prototype: vehicle. Ticket Management (IT-0033): support tickets per vehicle, with their
-- comments and status history, saved in Neon instead of the browser.
-- Schema proto_vehicle (the admin's choice, 24 Nov 2026: core is not allowed on the shared
-- branch proto/vehicle, docs/CORE_RULES.md rule 2).
-- Structure first, then invented demo tickets for Sample Company A (C1).
-- Safe to run twice. Run under the prototyper role.
SET ROLE iotify_prototyper;
SELECT public.new_prototype('vehicle');

-- One support ticket. The plate number is read from core.assets (asset_id), not copied.
CREATE TABLE IF NOT EXISTS proto_vehicle.tickets (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES core.companies(id) ON DELETE CASCADE,
  asset_id text REFERENCES core.assets(id) ON DELETE SET NULL,
  subject text NOT NULL,
  category text NOT NULL CHECK (category IN ('Device Offline', 'GPS Not Updating', 'SIM / Connectivity',
    'Hardware Fault', 'Installation', 'Sensor Calibration', 'Application Issue', 'Billing', 'Other')),
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'On Hold', 'Resolved', 'Closed')),
  assignee text,
  reporter text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tickets_company_idx ON proto_vehicle.tickets (company_id);

-- A ticket's activity: created, comments, status and assignment changes, edits.
CREATE TABLE IF NOT EXISTS proto_vehicle.ticket_events (
  id text PRIMARY KEY,
  ticket_id text NOT NULL REFERENCES proto_vehicle.tickets(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('Created', 'Comment', 'Status', 'Assigned', 'Edited')),
  author text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_events_ticket_idx ON proto_vehicle.ticket_events (ticket_id);

-- Demo tickets (invented). Times are relative to when this file runs.
INSERT INTO proto_vehicle.tickets (id, company_id, asset_id, subject, category, priority, status, assignee, reporter, description, created_at, updated_at)
SELECT id, 'C1', asset_id, subject, category, priority, status, assignee, reporter, description,
       now() - make_interval(mins => (hours * 60)::int), now() - make_interval(mins => (hours * 30)::int)
FROM (VALUES
  ('TKT-1054', 'A201', 'Tracker not reporting for 2 hours', 'Device Offline', 'Critical', 'Open', 'Support Desk', 'Admin', 'Vehicle shows "No report for 2 h" on the Alerts page. Ignition was on at the last report.', 1.5),
  ('TKT-1053', 'A205', 'Location frozen near Riyadh depot', 'GPS Not Updating', 'High', 'In Progress', 'Omar Haddad', 'Fleet Manager', 'Position has not moved since this morning although the driver confirms the truck is on route.', 6),
  ('TKT-1052', 'A206', 'SIM data balance exhausted', 'SIM / Connectivity', 'High', 'On Hold', 'Sara Nabil', 'Supervisor', 'Operator reports the data bundle is used up. Waiting for top-up approval.', 20),
  ('TKT-1051', 'A202', 'Panic button pressed by mistake twice', 'Hardware Fault', 'Medium', 'In Progress', 'Field Technician Team', 'Admin', 'SOS alerts raised twice today with no incident. Please check the button wiring.', 10),
  ('TKT-1050', 'A210', 'Install tracker on new bus', 'Installation', 'Medium', 'Open', 'Field Technician Team', 'Fleet Manager', 'New vehicle added in Manage → Vehicle. Needs device, SIM and harness installation.', 3),
  ('TKT-1049', 'A1', 'Fuel sensor shows wrong level', 'Sensor Calibration', 'Low', 'Open', 'Faisal Karim', 'Supervisor', 'Fuel level jumps between 20% and 80% while parked.', 30),
  ('TKT-1048', 'A204', 'Power cut alerts every night', 'Hardware Fault', 'High', 'Resolved', 'Omar Haddad', 'Admin', 'External power disconnected alerts each night at 23:00. Battery isolator found switched off; driver briefed.', 48),
  ('TKT-1047', 'A207', 'Report export takes too long', 'Application Issue', 'Low', 'Closed', 'Lina Youssef', 'Fleet Manager', 'Trip summary export for the month did not finish.', 96),
  ('TKT-1046', 'A203', 'Geofence exit alert not received by SMS', 'Application Issue', 'Medium', 'Resolved', 'Lina Youssef', 'Supervisor', 'App notification arrived but SMS did not. Phone number corrected in Manage → User.', 40),
  ('TKT-1045', 'A208', 'Idle alerts while engine is off', 'Sensor Calibration', 'Medium', 'Open', 'Support Desk', 'Admin', 'Idle alert says engine on, not moving for 24 min, but driver says the engine was off.', 30),
  ('TKT-1044', 'A2', 'Device offline after workshop visit', 'Device Offline', 'Critical', 'In Progress', 'Field Technician Team', 'Fleet Manager', 'Vehicle came back from the workshop and has not reported since.', 2.5),
  ('TKT-1043', 'A209', 'Invoice shows extra SIM line', 'Billing', 'Low', 'On Hold', 'Sara Nabil', 'Supervisor', 'Monthly invoice lists two SIM cards for one vehicle.', 60),
  ('TKT-1042', 'A203', 'Towed alert while vehicle in yard', 'GPS Not Updating', 'Medium', 'Closed', 'Omar Haddad', 'Admin', 'Moved with the ignition off alert raised in the yard; GPS drift confirmed.', 120),
  ('TKT-1041', 'A209', 'Replace damaged antenna', 'Hardware Fault', 'High', 'Open', 'Field Technician Team', 'Fleet Manager', 'Antenna cable cut during loading. Signal weak.', 9)
) AS t (id, asset_id, subject, category, priority, status, assignee, reporter, description, hours)
ON CONFLICT (id) DO NOTHING;

-- Their history: created for every ticket; a comment and the status change for the others.
INSERT INTO proto_vehicle.ticket_events (id, ticket_id, kind, author, body, created_at)
SELECT t.id || '-E1', t.id, 'Created', t.reporter, 'Ticket created', t.created_at
FROM proto_vehicle.tickets t WHERE t.company_id = 'C1' AND t.id BETWEEN 'TKT-1041' AND 'TKT-1054'
ON CONFLICT (id) DO NOTHING;
INSERT INTO proto_vehicle.ticket_events (id, ticket_id, kind, author, body, created_at)
SELECT t.id || '-E2', t.id, 'Comment', t.assignee, 'Looking into this now.', t.created_at + (t.updated_at - t.created_at) / 2
FROM proto_vehicle.tickets t WHERE t.company_id = 'C1' AND t.id BETWEEN 'TKT-1041' AND 'TKT-1054' AND t.status <> 'Open'
ON CONFLICT (id) DO NOTHING;
INSERT INTO proto_vehicle.ticket_events (id, ticket_id, kind, author, body, created_at)
SELECT t.id || '-E3', t.id, 'Status', t.assignee, 'Status changed to ' || t.status, t.updated_at
FROM proto_vehicle.tickets t WHERE t.company_id = 'C1' AND t.id BETWEEN 'TKT-1041' AND 'TKT-1054' AND t.status <> 'Open'
ON CONFLICT (id) DO NOTHING;
