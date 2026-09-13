import { z } from "zod";
import { id } from "@/shared/contracts/fields";
import { pageQuery } from "@/shared/contracts/query-input";

export const workerSchema = z.strictObject({
  email: z
    .email()
    .max(150)
    .transform((v) => v.toLowerCase()),
  skills: z
    .array(z.number().int().min(0).max(4))
    .min(1)
    .max(5)
    .refine((v) => new Set(v).size === v.length, "Choose each skill once."),
  active: z.boolean(),
  available: z.boolean(),
  capacityMinutes: z.number().int().min(30).max(10080),
  revision: z.number().int().min(1),
});
export const assignmentSettingsSchema = z.strictObject({
  automatic: z.boolean(),
  balanceBy: z.enum(["pieces", "effort"]),
  respectCapacity: z.boolean(),
  stationMinutes: z.tuple([
    z.number().int().min(1).max(1440),
    z.number().int().min(1).max(1440),
    z.number().int().min(1).max(1440),
    z.number().int().min(1).max(1440),
    z.number().int().min(1).max(1440),
  ]),
  revision: z.number().int().min(0),
});
export const pieceWorkSchema = z.strictObject({
  version: z.number().int().min(0),
  assigneeId: id.optional(),
  status: z.enum(["pending", "in_progress", "blocked"]),
  assignedAt: z.iso.datetime().optional(),
  startedAt: z.iso.datetime().optional(),
  blockedReason: z.string().max(500).optional(),
  manual: z.boolean().optional(),
});
export const saveMemberSchema = z.object({
  type: z.literal("team.save"),
  id: id.optional(),
  name: z.string().trim().min(2).max(100),
  worker: workerSchema,
  password: z.string().min(12).max(128).optional(),
  expectedRevision: z.number().int().min(0),
});
export const saveAssignmentSettingsSchema = z.object({
  type: z.literal("team.settings"),
  settings: assignmentSettingsSchema,
});
export const distributeSchema = z.object({
  type: z.literal("team.distribute"),
});
const target = {
  orderId: id,
  pieceId: id,
  expectedStation: z.number().int().min(0).max(4),
  expectedVersion: z.number().int().min(0),
};
export const assignWorkSchema = z.object({
  type: z.literal("work.assign"),
  ...target,
  assigneeId: id.nullable(),
});
export const updateWorkSchema = z.object({
  type: z.literal("work.update"),
  ...target,
  operation: z.enum(["start", "block", "resume", "complete"]),
  reason: z.string().trim().min(3).max(500).optional(),
});
export const teamCommandSchema = z.object({
  mutationId: z.uuid(),
  action: z.discriminatedUnion("type", [
    saveMemberSchema,
    saveAssignmentSettingsSchema,
    distributeSchema,
    assignWorkSchema,
  ]),
});
export const workCommandSchema = z.object({
  mutationId: z.uuid(),
  action: updateWorkSchema,
});
export const workQuery = pageQuery.extend({
  status: z
    .enum(["all", "pending", "in_progress", "blocked", "unassigned"])
    .default("all"),
  station: z.enum(["all", "0", "1", "2", "3", "4"]).default("all"),
  member: id.optional(),
  code: z.string().trim().min(1).max(300).optional(),
});
export type Worker = z.infer<typeof workerSchema>;
export type AssignmentSettings = z.infer<typeof assignmentSettingsSchema>;
export type PieceWork = z.infer<typeof pieceWorkSchema>;
export type WorkQuery = z.infer<typeof workQuery>;
export type SessionUser = {
  name: string;
  email: string;
  role?: "owner" | "worker";
  staffId?: string;
};
