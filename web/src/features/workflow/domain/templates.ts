import type {
  Catalogue,
  Garment,
} from "@/features/settings/contracts/catalogue";
import type { OrderItem } from "@/features/orders/types";
import { STATIONS } from "@/shared/workspace";
import type { WorkflowSettings, PieceWorkflow } from "../contracts/settings";
import { WorkspaceError } from "@/shared/errors";

export const defaultWorkflowSettings = (): WorkflowSettings => ({
  defaultWorkflowId: "standard-tailoring",
  templates: [
    {
      id: "standard-tailoring",
      name: "Standard tailoring",
      revision: 1,
      active: true,
      steps: STATIONS.map((name, station) => ({
        id: `standard-${station}`,
        name,
        station,
      })),
    },
  ],
});
export const workflowsFor = (catalogue: Catalogue) =>
  catalogue.workflows ?? defaultWorkflowSettings();
export function workflowForGarment(
  catalogue: Catalogue,
  garment?: Pick<Garment, "workflowId">,
) {
  const settings = workflowsFor(catalogue);
  return (
    settings.templates.find((t) => t.active && t.id === garment?.workflowId) ??
    settings.templates.find(
      (t) => t.active && t.id === settings.defaultWorkflowId,
    )!
  );
}
export function snapshotWorkflow(
  catalogue: Catalogue,
  garment?: Pick<Garment, "workflowId">,
): PieceWorkflow | undefined {
  if (!catalogue.workflows) return undefined;
  const { active: _active, ...template } = workflowForGarment(
    catalogue,
    garment,
  );
  void _active;
  return { ...structuredClone(template), position: 0, version: 0 };
}
export const pieceSteps = (piece: Pick<OrderItem, "workflow">) =>
  piece.workflow?.steps ?? defaultWorkflowSettings().templates[0].steps;
export const piecePosition = (piece: Pick<OrderItem, "workflow" | "station">) =>
  piece.workflow?.position ?? piece.station;
export const currentStepName = (
  piece: Pick<OrderItem, "workflow" | "station">,
) => pieceSteps(piece)[piecePosition(piece)]?.name ?? "Ready";
export const nextStepName = (piece: Pick<OrderItem, "workflow" | "station">) =>
  pieceSteps(piece)[piecePosition(piece) + 1]?.name;
export function workflowHistoryStep(piece: Pick<OrderItem, "workflow">) {
  const workflow = piece.workflow;
  if (!workflow) return null;
  const step = workflow.steps[workflow.position];
  return {
    id: step?.id ?? "ready",
    name: step?.name ?? "Ready",
    position: workflow.position,
  };
}

export function validateWorkflowSettings(next: Catalogue, current: Catalogue) {
  if (!next.workflows) {
    if (current.workflows)
      throw new WorkspaceError("Reload settings before saving workflows.", 409);
    if (next.garments.some((g) => g.workflowId))
      throw new WorkspaceError(
        "Save the workflow before selecting it for a garment.",
      );
    return;
  }
  const settings = next.workflows,
    old = workflowsFor(current);
  const unique = (values: string[], label: string) => {
    if (new Set(values).size !== values.length)
      throw new WorkspaceError(`Use different ${label}.`);
  };
  unique(
    settings.templates.map((t) => t.id),
    "workflow IDs",
  );
  unique(
    settings.templates.filter((t) => t.active).map((t) => t.name.toLowerCase()),
    "workflow names",
  );
  for (const previous of old.templates) {
    if (!settings.templates.some((t) => t.id === previous.id))
      throw new WorkspaceError(
        "Archive existing workflows instead of deleting them.",
      );
  }
  if (
    !settings.templates.some(
      (t) => t.active && t.id === settings.defaultWorkflowId,
    )
  )
    throw new WorkspaceError("Choose an active default workflow.");
  settings.templates = settings.templates.map((template) => {
    unique(
      template.steps.map((s) => s.id),
      "step IDs within a workflow",
    );
    unique(
      template.steps.map((s) => s.name.toLowerCase()),
      "step names within a workflow",
    );
    const previous = old.templates.find((t) => t.id === template.id);
    const definition = (t: typeof template) =>
      JSON.stringify([
        t.name,
        t.active,
        t.steps.map((s) => [s.id, s.name, s.station]),
      ]);
    return {
      ...template,
      revision: previous
        ? previous.revision +
          Number(definition(previous) !== definition(template))
        : 1,
    };
  });
  for (const garment of next.garments) {
    if (
      garment.workflowId &&
      !settings.templates.some((t) => t.id === garment.workflowId && t.active)
    )
      throw new WorkspaceError(
        `Choose an active workflow for ${garment.name}, or use the shop default.`,
      );
  }
}
