export const gstBilling = `
ALTER TABLE sg_shop_settings ADD COLUMN IF NOT EXISTS gst jsonb;
ALTER TABLE sg_orders ADD COLUMN IF NOT EXISTS gst jsonb;
`;
