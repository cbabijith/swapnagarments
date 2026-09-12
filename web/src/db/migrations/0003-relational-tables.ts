/** Additive DDL only. Shop data cutover is an explicit, reconciled operation. */
export const relationalTables = `
ALTER TABLE sg_workspace ADD COLUMN storage_model text NOT NULL DEFAULT 'json';
ALTER TABLE sg_workspace ADD COLUMN has_day_reports boolean NOT NULL DEFAULT true;
ALTER TABLE sg_workspace ADD CONSTRAINT sg_workspace_storage_model_check CHECK (storage_model IN ('json', 'relational'));

CREATE TABLE sg_customers (
  id text PRIMARY KEY, workspace_id integer NOT NULL DEFAULT 1 REFERENCES sg_workspace(id),
  position integer NOT NULL CHECK (position >= 0), name text NOT NULL, phone text NOT NULL,
  phone_key text NOT NULL, email text NOT NULL, notes text NOT NULL, measurements jsonb NOT NULL,
  has_measurement_history boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX sg_customers_phone_key ON sg_customers(workspace_id, phone_key);
CREATE TABLE sg_measurement_versions (
  customer_id text NOT NULL REFERENCES sg_customers(id), version integer NOT NULL CHECK (version >= 0),
  recorded_at timestamptz NOT NULL, "values" jsonb NOT NULL, PRIMARY KEY(customer_id, version)
);
CREATE TABLE sg_orders (
  id text PRIMARY KEY, workspace_id integer NOT NULL DEFAULT 1 REFERENCES sg_workspace(id), position integer NOT NULL CHECK (position >= 0),
  number text NOT NULL, customer_id text NOT NULL REFERENCES sg_customers(id), priority text NOT NULL,
  due_date date NOT NULL, created_at timestamptz NOT NULL, status text NOT NULL, notes text NOT NULL, delivered_at timestamptz,
  CONSTRAINT sg_orders_shop_number UNIQUE(workspace_id, number),
  CONSTRAINT sg_orders_priority_check CHECK (priority IN ('normal', 'high', 'urgent')),
  CONSTRAINT sg_orders_status_check CHECK (status IN ('received', 'in_progress', 'ready', 'delivered', 'cancelled'))
);
CREATE INDEX sg_orders_customer ON sg_orders(customer_id);
CREATE INDEX sg_orders_status_due ON sg_orders(status, due_date, priority, id);
CREATE TABLE sg_order_items (
  id text PRIMARY KEY, order_id text NOT NULL REFERENCES sg_orders(id), position integer NOT NULL CHECK (position >= 0),
  garment text NOT NULL, material text NOT NULL, station integer NOT NULL CHECK (station BETWEEN 0 AND 5),
  price integer NOT NULL CHECK (price BETWEEN 1 AND 100000000), CONSTRAINT sg_order_items_id_order UNIQUE(id, order_id)
);
CREATE INDEX sg_order_items_order ON sg_order_items(order_id);
CREATE INDEX sg_order_items_station ON sg_order_items(station, order_id);
CREATE TABLE sg_payments (
  id text PRIMARY KEY, order_id text NOT NULL REFERENCES sg_orders(id), position integer NOT NULL CHECK (position >= 0),
  amount integer NOT NULL CHECK (amount BETWEEN 1 AND 100000000), method text NOT NULL, paid_at timestamptz NOT NULL
);
CREATE INDEX sg_payments_order_date ON sg_payments(order_id, paid_at);
CREATE INDEX sg_payments_date ON sg_payments(paid_at);
CREATE TABLE sg_workflow_history (
  id uuid PRIMARY KEY, order_id text NOT NULL, piece_id text NOT NULL, mutation_id uuid REFERENCES sg_mutations(id),
  kind text NOT NULL CHECK (kind IN ('baseline', 'created', 'advance', 'rework')),
  from_station integer, to_station integer NOT NULL, reason text NOT NULL, actor text NOT NULL, occurred_at timestamptz NOT NULL,
  FOREIGN KEY(piece_id, order_id) REFERENCES sg_order_items(id, order_id),
  CONSTRAINT sg_workflow_history_command_piece UNIQUE(mutation_id, piece_id),
  CONSTRAINT sg_workflow_history_station_check CHECK (to_station BETWEEN 0 AND 5 AND (from_station IS NULL OR from_station BETWEEN 0 AND 5))
);
CREATE INDEX sg_workflow_history_piece_time ON sg_workflow_history(piece_id, occurred_at);
CREATE TABLE sg_staff (
  id text PRIMARY KEY, workspace_id integer NOT NULL DEFAULT 1 REFERENCES sg_workspace(id), position integer NOT NULL,
  name text NOT NULL, role text NOT NULL, station text NOT NULL, color text NOT NULL
);
CREATE TABLE sg_closed_days (
  date date PRIMARY KEY, position integer NOT NULL, workspace_id integer NOT NULL DEFAULT 1 REFERENCES sg_workspace(id)
);
CREATE TABLE sg_day_reports (
  date date PRIMARY KEY REFERENCES sg_closed_days(date), position integer NOT NULL, reviewed_by text NOT NULL, reviewed_at timestamptz NOT NULL,
  delivered integer NOT NULL, ready integer NOT NULL, unfinished integer NOT NULL, collected bigint NOT NULL, pending bigint NOT NULL,
  CONSTRAINT sg_day_reports_values_check CHECK (delivered >= 0 AND ready >= 0 AND unfinished >= 0 AND collected BETWEEN 0 AND 9007199254740991 AND pending BETWEEN 0 AND 9007199254740991)
);
CREATE TABLE sg_activity (
  id text PRIMARY KEY, order_id text NOT NULL REFERENCES sg_orders(id), position integer NOT NULL,
  title text NOT NULL, detail text NOT NULL, time timestamptz NOT NULL, actor text
);
CREATE INDEX sg_activity_order_time ON sg_activity(order_id, time);
CREATE TABLE sg_workspace_backups (
  id uuid PRIMARY KEY, workspace_id integer NOT NULL REFERENCES sg_workspace(id), revision integer NOT NULL,
  source_model text NOT NULL, data jsonb NOT NULL, checksum text NOT NULL, backup_reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION sg_guard_legacy_snapshot() RETURNS trigger LANGUAGE plpgsql AS $guard$
BEGIN
  IF OLD.storage_model = 'relational' AND NEW.storage_model = 'relational' AND NEW.data IS DISTINCT FROM OLD.data THEN
    RAISE EXCEPTION 'Legacy snapshot writes are disabled after relational cutover';
  END IF;
  RETURN NEW;
END;
$guard$;
CREATE TRIGGER sg_guard_legacy_snapshot BEFORE UPDATE ON sg_workspace FOR EACH ROW EXECUTE FUNCTION sg_guard_legacy_snapshot();

CREATE FUNCTION sg_protect_workspace_backup() RETURNS trigger LANGUAGE plpgsql AS $guard$
BEGIN
  RAISE EXCEPTION 'Workspace migration backups are immutable';
END;
$guard$;
CREATE TRIGGER sg_protect_workspace_backup BEFORE UPDATE OR DELETE ON sg_workspace_backups FOR EACH ROW EXECUTE FUNCTION sg_protect_workspace_backup();
`;
