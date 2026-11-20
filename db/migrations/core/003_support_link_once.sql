-- 003_support_link_once.sql — core change request 001, approved by the core owner (Rafiq), applied to main 20 Nov 2026 (docs/core-change-requests/001_support_link_once.md).
-- Support links work once: record when a session's link was first opened.
-- Additive only. Safe to run twice. Run as iotify_core_admin; then add a row to public.merge_log.
SET ROLE iotify_core_admin;

ALTER TABLE core.support_sessions
  ADD COLUMN IF NOT EXISTS link_opened_at timestamptz;   -- set once, when the cross-app link is opened

COMMENT ON COLUMN core.support_sessions.link_opened_at IS
  'When the support link was opened. A link works once: a second opening is refused.';
