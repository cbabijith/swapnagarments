export const customWorkflows = `
ALTER TABLE sg_shop_settings ADD COLUMN IF NOT EXISTS workflows jsonb;
ALTER TABLE sg_garments ADD COLUMN IF NOT EXISTS workflow_id text;
ALTER TABLE sg_order_items ADD COLUMN IF NOT EXISTS workflow jsonb;
ALTER TABLE sg_workflow_history ADD COLUMN IF NOT EXISTS from_step jsonb;
ALTER TABLE sg_workflow_history ADD COLUMN IF NOT EXISTS to_step jsonb;
`;
