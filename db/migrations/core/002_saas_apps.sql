-- 002_saas_apps.sql — core change approved by the core owner (Rafiq), 18 Nov 2026.
-- Every product is its own SaaS app. Adds: white-label resellers, customer-granted support access, support session log.
-- Additive only: no column or table is dropped or renamed.
-- Already applied to main (18 Nov 2026) and folded into setup/01_core_schema.sql. Kept as history; safe to run twice.
SET ROLE iotify_core_admin;

ALTER TABLE core.dealers
  ADD COLUMN IF NOT EXISTS reseller_type text NOT NULL DEFAULT 'Reseller'
    CHECK (reseller_type IN ('Reseller', 'White-label reseller')),   -- set by platform admin only
  ADD COLUMN IF NOT EXISTS brand_name text,                           -- white-label only
  ADD COLUMN IF NOT EXISTS brand_logo text,                           -- small image as data URI
  ADD COLUMN IF NOT EXISTS brand_color text,                          -- #RRGGBB
  ADD COLUMN IF NOT EXISTS support_access_until date;                 -- dealer lets EIT open its console until this date

ALTER TABLE core.companies
  ADD COLUMN IF NOT EXISTS support_access_until date;                 -- company lets its dealer open its apps until this date

CREATE TABLE IF NOT EXISTS core.support_sessions (
  id                text PRIMARY KEY,
  actor_user_id     text REFERENCES core.users(id),
  target_level      text CHECK (target_level IN ('Dealer', 'Company')),
  target_account_id text NOT NULL,
  product_id        text REFERENCES core.nodes(id),
  reason            text NOT NULL,
  started_at        timestamptz NOT NULL DEFAULT now(),
  ended_at          timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON core.support_sessions TO iotify_prototyper;
RESET ROLE;
