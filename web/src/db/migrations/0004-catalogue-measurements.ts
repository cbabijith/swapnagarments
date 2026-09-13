export const catalogueMeasurements = `
CREATE TABLE sg_shop_settings (
  workspace_id integer PRIMARY KEY REFERENCES sg_workspace(id),
  revision integer NOT NULL CHECK (revision >= 0),
  default_garment_id text NOT NULL,
  lead_days integer NOT NULL CHECK (lead_days BETWEEN 0 AND 365)
);
CREATE TABLE sg_garments (
  id text PRIMARY KEY, workspace_id integer NOT NULL DEFAULT 1 REFERENCES sg_workspace(id),
  position integer NOT NULL CHECK (position >= 0), name text NOT NULL,
  revision integer NOT NULL CHECK (revision >= 1), active boolean NOT NULL,
  price integer CHECK (price BETWEEN 1 AND 100000000),
  unit text NOT NULL CHECK (unit IN ('in', 'cm')), fields jsonb NOT NULL, presets jsonb NOT NULL
);
CREATE INDEX sg_garments_shop_position ON sg_garments(workspace_id, position);
CREATE TABLE sg_measurement_profiles (
  position integer NOT NULL CHECK (position >= 0),
  customer_id text NOT NULL REFERENCES sg_customers(id), garment_id text NOT NULL REFERENCES sg_garments(id),
  profile jsonb NOT NULL, PRIMARY KEY (customer_id, garment_id)
);
ALTER TABLE sg_order_items ADD COLUMN measurement jsonb;
ALTER TABLE sg_order_items ADD COLUMN measurement_history jsonb;
ALTER TABLE sg_customers ADD COLUMN has_profiles boolean NOT NULL DEFAULT false;
CREATE TABLE sg_domain_events (
  id text PRIMARY KEY, mutation_id uuid NOT NULL REFERENCES sg_mutations(id),
  type text NOT NULL, result_id text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mutation_id, type)
);
`;
