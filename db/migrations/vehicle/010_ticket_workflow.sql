-- Prototype: vehicle. Ticket Management, full support workflow (IT-0034): where a ticket came
-- from (manual or an alert), resolution and reopen, SLA escalation, attachments, per-company
-- settings (SLA hours, escalation, auto-close) and each user's notification read marker.
-- Schema proto_vehicle (as 009). Safe to run twice. Run under the prototyper role.
SET ROLE iotify_prototyper;
SELECT public.new_prototype('vehicle');

-- Workflow fields on a ticket.
ALTER TABLE proto_vehicle.tickets
  ADD COLUMN IF NOT EXISTS reporter_id text REFERENCES core.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'Manual',
  ADD COLUMN IF NOT EXISTS alert_type text,
  ADD COLUMN IF NOT EXISTS alert_at timestamptz,
  ADD COLUMN IF NOT EXISTS alert_location text,
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopen_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  -- The SLA clock restarts on escalation and on reopen (null = from created_at).
  ADD COLUMN IF NOT EXISTS sla_started_at timestamptz;
ALTER TABLE proto_vehicle.tickets DROP CONSTRAINT IF EXISTS tickets_source_check;
ALTER TABLE proto_vehicle.tickets ADD CONSTRAINT tickets_source_check CHECK (source IN ('Manual', 'Alert'));

-- More kinds of history entry.
ALTER TABLE proto_vehicle.ticket_events DROP CONSTRAINT IF EXISTS ticket_events_kind_check;
ALTER TABLE proto_vehicle.ticket_events ADD CONSTRAINT ticket_events_kind_check CHECK (kind IN
  ('Created', 'Comment', 'Status', 'Assigned', 'Edited', 'Resolved', 'Reopened', 'Escalated', 'Closed', 'Attachment'));

-- Files attached to a ticket (prototype: kept in the row, at most 1 MB each).
CREATE TABLE IF NOT EXISTS proto_vehicle.ticket_attachments (
  id text PRIMARY KEY,
  ticket_id text NOT NULL REFERENCES proto_vehicle.tickets(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  mime_type text,
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 0 AND 1048576),
  data_url text NOT NULL,
  uploaded_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_attachments_ticket_idx ON proto_vehicle.ticket_attachments (ticket_id);

-- One row per company: SLA hours per priority, escalation and auto-close.
CREATE TABLE IF NOT EXISTS proto_vehicle.ticket_settings (
  company_id text PRIMARY KEY REFERENCES core.companies(id) ON DELETE CASCADE,
  sla_critical_h numeric NOT NULL DEFAULT 4 CHECK (sla_critical_h > 0),
  sla_high_h numeric NOT NULL DEFAULT 8 CHECK (sla_high_h > 0),
  sla_medium_h numeric NOT NULL DEFAULT 24 CHECK (sla_medium_h > 0),
  sla_low_h numeric NOT NULL DEFAULT 72 CHECK (sla_low_h > 0),
  escalation_enabled boolean NOT NULL DEFAULT true,
  escalate_to text NOT NULL DEFAULT 'Support Desk',
  auto_close_days integer NOT NULL DEFAULT 7 CHECK (auto_close_days BETWEEN 0 AND 90),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- When each user last opened their ticket notifications.
CREATE TABLE IF NOT EXISTS proto_vehicle.ticket_notification_reads (
  user_id text PRIMARY KEY REFERENCES core.users(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Demo data (invented) for Sample Company A.
INSERT INTO proto_vehicle.ticket_settings (company_id) VALUES ('C1') ON CONFLICT (company_id) DO NOTHING;

UPDATE proto_vehicle.tickets SET reporter_id = CASE reporter WHEN 'Admin' THEN 'U4' WHEN 'Fleet Manager' THEN 'U5' ELSE 'U6' END,
  reporter = CASE reporter WHEN 'Admin' THEN 'Company A admin' WHEN 'Fleet Manager' THEN 'Company A fleet manager' ELSE 'Company A fleet supervisor' END
WHERE company_id = 'C1' AND reporter IN ('Admin', 'Fleet Manager', 'Supervisor');

UPDATE proto_vehicle.tickets SET source = 'Alert', alert_type = 'Device Offline', alert_at = created_at - interval '5 minutes', alert_location = '24.82892, 46.64977'
WHERE id IN ('TKT-1054', 'TKT-1044') AND source = 'Manual';
UPDATE proto_vehicle.tickets SET source = 'Alert', alert_type = 'SOS', alert_at = created_at - interval '12 minutes', alert_location = '24.73439, 46.63936'
WHERE id = 'TKT-1051' AND source = 'Manual';

UPDATE proto_vehicle.tickets SET resolved_at = updated_at,
  resolution = CASE id WHEN 'TKT-1048' THEN 'Battery isolator was switched off at night. Driver briefed; no alerts since.'
                       WHEN 'TKT-1046' THEN 'SMS number corrected for the user. Test SMS received.'
                       WHEN 'TKT-1047' THEN 'Export limited to one month per file; finished in 40 s.'
                       ELSE 'GPS drift in the yard confirmed; towed alert sensitivity lowered.' END
WHERE id IN ('TKT-1048', 'TKT-1046', 'TKT-1047', 'TKT-1042') AND resolved_at IS NULL;
UPDATE proto_vehicle.tickets SET closed_at = updated_at WHERE id IN ('TKT-1047', 'TKT-1042') AND closed_at IS NULL;
