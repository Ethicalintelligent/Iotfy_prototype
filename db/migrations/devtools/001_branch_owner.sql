-- devtools 001: the owner label of a developer's Neon branch (Neon Database app, IT-0031).
-- One row per database: the developer name of the branch iotfy_<name>. The dev server compares it
-- with git config iotify.branch (dev/<name>) before showing any data, so a computer pointed at
-- another developer's database stays locked.
-- Run on each developer branch iotfy_<name> (as the database owner), then label it:
--   INSERT INTO devtools.branch_owner (owner) VALUES ('<name>') ON CONFLICT (one_row) DO NOTHING;
-- On main the table stays empty (main belongs to no developer). Safe to run twice.

CREATE SCHEMA IF NOT EXISTS devtools;

CREATE TABLE IF NOT EXISTS devtools.branch_owner (
  one_row boolean PRIMARY KEY DEFAULT true CHECK (one_row),
  owner text NOT NULL CHECK (owner ~ '^[a-z0-9][a-z0-9_-]*$'),
  labelled_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE devtools.branch_owner IS
  'Which developer this Neon branch belongs to (iotfy_<owner>). Set by the admin at setup.';

-- The apps run as iotify_prototyper: they may read the label, never change it.
GRANT USAGE ON SCHEMA devtools TO iotify_prototyper;
GRANT SELECT ON devtools.branch_owner TO iotify_prototyper;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON devtools.branch_owner FROM iotify_prototyper;
