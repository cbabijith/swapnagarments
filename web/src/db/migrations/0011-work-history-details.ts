// Older completion receipts intentionally retain a null snapshot: current piece
// details cannot establish the measurements/design that existed at completion.
export const workHistoryDetails = `
ALTER TABLE sg_work_completions ADD COLUMN IF NOT EXISTS snapshot jsonb;
`;
