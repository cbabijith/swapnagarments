import { z } from "zod";
import { id } from "@/shared/contracts/fields";

export const advancePieceSchema = z.object({
  type: z.literal("piece.advance"),
  orderId: id,
  pieceId: id,
  expectedStation: z.number().int().min(0).max(4),
});
export const reworkPieceSchema = z.object({
  type: z.literal("piece.rework"),
  orderId: id,
  pieceId: id,
  station: z.number().int().min(0).max(4),
  reason: z.string().trim().min(3).max(500),
});
