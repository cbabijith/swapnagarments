export const workHistory = `
CREATE TABLE IF NOT EXISTS sg_work_completions (
  id uuid PRIMARY KEY,
  mutation_id uuid NOT NULL REFERENCES sg_mutations(id),
  worker_id text NOT NULL,
  order_id text NOT NULL,
  order_number text NOT NULL,
  piece_id text NOT NULL,
  garment text NOT NULL,
  station integer NOT NULL CHECK (station BETWEEN 0 AND 4),
  step_name text NOT NULL,
  completed_at timestamptz NOT NULL,
  CONSTRAINT sg_work_completions_command_piece UNIQUE (mutation_id, piece_id)
);
CREATE INDEX IF NOT EXISTS sg_work_completions_worker_time
  ON sg_work_completions (worker_id, completed_at DESC, id DESC);

-- Earlier commands stored names in history but bound worker retry fingerprints
-- to immutable staff IDs. Recover only a cryptographically matching completion;
-- names alone must never grant access to another worker's history.
INSERT INTO sg_work_completions
  (id, mutation_id, worker_id, order_id, order_number, piece_id, garment,
   station, step_name, completed_at)
SELECT h.id, h.mutation_id, verified.worker_id, h.order_id, o.number,
  h.piece_id, i.garment, h.from_station,
  coalesce(h.from_step->>'name',
    (ARRAY['Cutting','Sizing','Handloom','Stitching','Ironing'])[h.from_station + 1]),
  h.occurred_at
FROM sg_workflow_history h
JOIN sg_mutations m ON m.id = h.mutation_id
JOIN sg_domain_events e ON e.mutation_id = m.id AND e.type = 'work.update'
JOIN sg_orders o ON o.id = h.order_id
JOIN sg_order_items i ON i.id = h.piece_id AND i.order_id = h.order_id
CROSS JOIN LATERAL (
  SELECT s.id AS worker_id
  FROM sg_staff s
  CROSS JOIN generate_series(0, greatest(coalesce((i.work->>'version')::int, 0) - 1, 0)) v(version)
  WHERE s.worker IS NOT NULL
    AND m.fingerprint = encode(sha256(convert_to(
      '{"action":{"expectedStation":' || h.from_station::text ||
      ',"expectedVersion":' || v.version::text ||
      ',"operation":"complete","orderId":' || to_json(h.order_id)::text ||
      ',"pieceId":' || to_json(h.piece_id)::text ||
      ',"type":"work.update"},"staffId":' || to_json(s.id)::text || '}',
      'UTF8')), 'hex')
  LIMIT 1
) verified
WHERE h.kind = 'advance' AND h.from_station BETWEEN 0 AND 4
ON CONFLICT (mutation_id, piece_id) DO NOTHING;
`;
