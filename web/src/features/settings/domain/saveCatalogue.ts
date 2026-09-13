import { validateGarmentDesigns } from "@/features/design-library/domain/designs";
import {
  validateWorkflowSettings,
  workflowForGarment,
} from "@/features/workflow/domain/templates";
import type { MutationContext } from "@/shared/domain/mutation-context";
import { WorkspaceError } from "@/shared/errors";
import { catalogueFor } from "./catalogue";
import { validateValues } from "@/features/measurements/domain/values";

// PostgreSQL JSONB may reorder object keys. Definition revisions depend on values and array order.
function definitionKey(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(definitionKey).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => `${JSON.stringify(key)}:${definitionKey(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export function saveCatalogue({
  data,
  action,
  assets,
}: MutationContext<"settings.save">) {
  const current = catalogueFor(data),
    next = structuredClone(action.catalogue);
  // Older settings clients must not silently remove configured GST.
  if (!next.gst && current.gst) next.gst = structuredClone(current.gst);
  if (next.revision !== current.revision)
    throw new WorkspaceError(
      "Settings changed on another device. Reload settings before saving again.",
      409,
    );
  const unique = (values: string[], label: string) => {
    if (new Set(values).size !== values.length)
      throw new WorkspaceError(`Use different ${label}.`);
  };
  unique(
    next.garments.map((g) => g.id),
    "garment IDs",
  );
  unique(
    next.garments.filter((g) => g.active).map((g) => g.name.toLowerCase()),
    "garment names",
  );
  for (const old of current.garments)
    if (!next.garments.some((g) => g.id === old.id))
      throw new WorkspaceError(
        "Archive existing garments instead of deleting them.",
      );
  if (!next.garments.some((g) => g.active && g.id === next.defaultGarmentId))
    throw new WorkspaceError("Choose an active default garment.");
  validateWorkflowSettings(next, current);
  next.garments = next.garments.map((garment) => {
    const old = current.garments.find((g) => g.id === garment.id);
    validateGarmentDesigns(garment, old, assets);
    unique(
      garment.fields.map((f) => f.id),
      "field IDs",
    );
    unique(
      garment.fields.map((f) => f.label.toLowerCase()),
      "measurement labels within a garment",
    );
    unique(
      garment.presets.map((p) => p.id),
      "size preset IDs",
    );
    unique(
      garment.presets.map((p) => p.name.toLowerCase()),
      "size preset names",
    );
    for (const field of garment.fields) {
      if (field.id.startsWith("custom-"))
        throw new WorkspaceError(
          "Template fields need their own permanent IDs.",
        );
      const previous = old?.fields.find((f) => f.id === field.id);
      if (previous && previous.type !== field.type)
        throw new WorkspaceError(
          `Add a new field to change the type of ${field.label}.`,
        );
      if (field.type === "select" && !field.options.length)
        throw new WorkspaceError(`Add choices for ${field.label}.`);
      unique(field.options, `choices for ${field.label}`);
    }
    if (old && old.unit !== garment.unit && garment.presets.length)
      throw new WorkspaceError(
        "Remove size presets before changing units, then enter converted values as new presets.",
      );
    for (const preset of garment.presets)
      preset.values = validateValues(
        garment.fields,
        preset.values,
        garment.unit,
        false,
      );
    const { revision: _revision, ...definition } = garment;
    void _revision;
    const previous = old ? { ...old, revision: undefined } : null;
    const unchanged =
      previous &&
      definitionKey(definition) === definitionKey(previous) &&
      definitionKey(workflowForGarment(next, garment)) ===
        definitionKey(workflowForGarment(current, old));
    return {
      ...garment,
      revision: old ? old.revision + (unchanged ? 0 : 1) : 1,
    };
  });
  next.revision++;
  data.catalogue = next;
  return { data };
}
