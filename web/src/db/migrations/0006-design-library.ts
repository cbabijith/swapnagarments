export const designLibrary = `
ALTER TABLE sg_garments ADD COLUMN IF NOT EXISTS image jsonb;
ALTER TABLE sg_garments ADD COLUMN IF NOT EXISTS reference_images jsonb;
ALTER TABLE sg_garments ADD COLUMN IF NOT EXISTS design_config jsonb;
ALTER TABLE sg_order_items ADD COLUMN IF NOT EXISTS design jsonb;
CREATE TABLE IF NOT EXISTS sg_design_assets (
 id text PRIMARY KEY, workspace_id integer NOT NULL DEFAULT 1 REFERENCES sg_workspace(id),
 source text NOT NULL CHECK (source IN ('builtin','upload')), label text NOT NULL,
 kind text NOT NULL, view text NOT NULL CHECK (view IN ('front','back','detail','reference')),
 active boolean NOT NULL DEFAULT true, favourite boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1), storage_key text, thumbnail_key text, checksum text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (source = 'builtin' OR (storage_key IS NOT NULL AND thumbnail_key IS NOT NULL AND checksum IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS sg_design_assets_browse ON sg_design_assets(workspace_id,source,active,kind);
`;
