/** Idempotent baseline for databases created before versioned migrations. */
export const baseline = `
CREATE TABLE IF NOT EXISTS sg_owner (id integer PRIMARY KEY CHECK (id = 1), name text NOT NULL, email text NOT NULL, password_hash text NOT NULL, salt text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sg_sessions (token_hash text PRIMARY KEY, owner_id integer NOT NULL REFERENCES sg_owner(id), expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS sg_sessions_expiry ON sg_sessions(expires_at);
CREATE TABLE IF NOT EXISTS sg_workspace (id integer PRIMARY KEY CHECK (id = 1), revision integer NOT NULL DEFAULT 0, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sg_mutations (id uuid PRIMARY KEY, result_id text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sg_auth_limits (bucket text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL);
`;
