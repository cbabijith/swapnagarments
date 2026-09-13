export const teamWork = `
ALTER TABLE sg_staff ADD COLUMN IF NOT EXISTS worker jsonb;
ALTER TABLE sg_order_items ADD COLUMN IF NOT EXISTS work jsonb;
CREATE TABLE IF NOT EXISTS sg_assignment_settings (
  workspace_id integer PRIMARY KEY REFERENCES sg_workspace(id), settings jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS sg_worker_accounts (
  staff_id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
  password_hash text NOT NULL, salt text NOT NULL, active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS sg_worker_sessions (
  token_hash text PRIMARY KEY, staff_id text NOT NULL REFERENCES sg_worker_accounts(staff_id),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sg_worker_sessions_expiry ON sg_worker_sessions(expires_at);
CREATE INDEX IF NOT EXISTS sg_items_assignee_station ON sg_order_items ((work->>'assigneeId'), station, order_id);
`;
