import { z } from "zod";

export const workflowStepSchema = z.strictObject({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(80),
  station: z.number().int().min(0).max(4),
});
const workflowStepsSchema = z
  .array(workflowStepSchema)
  .min(1)
  .max(20)
  .refine(
    (steps) => new Set(steps.map((s) => s.id)).size === steps.length,
    "Use different step IDs within a workflow.",
  )
  .refine(
    (steps) =>
      new Set(steps.map((s) => s.name.toLowerCase())).size === steps.length,
    "Use different step names within a workflow.",
  );
export const workflowTemplateSchema = z.strictObject({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(80),
  revision: z.number().int().min(1),
  active: z.boolean(),
  steps: workflowStepsSchema,
});
export const workflowSettingsSchema = z
  .strictObject({
    defaultWorkflowId: z.string().min(1).max(100),
    templates: z.array(workflowTemplateSchema).min(1).max(30),
  })
  .refine(
    (settings) =>
      new Set(settings.templates.map((t) => t.id)).size ===
      settings.templates.length,
    "Use different workflow IDs.",
  )
  .refine((settings) => {
    const names = settings.templates
      .filter((t) => t.active)
      .map((t) => t.name.toLowerCase());
    return new Set(names).size === names.length;
  }, "Use different workflow names.")
  .refine(
    (settings) =>
      settings.templates.some(
        (t) => t.id === settings.defaultWorkflowId && t.active,
      ),
    "Choose an active default workflow.",
  );
export const pieceWorkflowSchema = z
  .strictObject({
    id: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(80),
    revision: z.number().int().min(1),
    steps: workflowStepsSchema,
    position: z.number().int().min(0).max(20),
    version: z.number().int().min(0),
  })
  .refine((v) => v.position <= v.steps.length, "Invalid workflow progress.");
export type WorkflowStep = z.infer<typeof workflowStepSchema>;
export type WorkflowTemplate = z.infer<typeof workflowTemplateSchema>;
export type WorkflowSettings = z.infer<typeof workflowSettingsSchema>;
export type PieceWorkflow = z.infer<typeof pieceWorkflowSchema>;
