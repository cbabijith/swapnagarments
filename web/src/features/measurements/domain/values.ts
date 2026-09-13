import type {
  MeasurementField,
  Garment,
} from "@/features/settings/contracts/catalogue";
import type { Customer } from "@/features/customers/types";
import { WorkspaceError } from "@/shared/errors";
import { resolveGuideId } from "./guides";

export function validateValues(
  fields: MeasurementField[],
  values: Record<string, string>,
  unit: "in" | "cm",
  confirmed: boolean,
) {
  const result: Record<string, string> = {};
  const allowed = new Map(fields.map((field) => [field.id, field]));
  for (const key of Object.keys(values))
    if (!allowed.has(key))
      throw new WorkspaceError(
        "A measurement field has changed. Review the template.",
      );
  for (const field of fields) {
    const value = (values[field.id] ?? "").trim();
    if (!value) {
      if (confirmed && field.required)
        throw new WorkspaceError(
          `Enter ${field.label} before confirming measurements.`,
        );
      continue;
    }
    if (
      field.type === "number" &&
      (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) ||
        Number(value) <= 0 ||
        Number(value) > (unit === "in" ? 150 : 381))
    )
      throw new WorkspaceError(
        `${field.label} must be a positive measurement up to ${unit === "in" ? 150 : 381} ${unit}.`,
      );
    if (field.type === "select" && !field.options.includes(value))
      throw new WorkspaceError(`Choose a valid option for ${field.label}.`);
    result[field.id] = value;
  }
  if (
    confirmed &&
    fields.some((f) => f.type === "number") &&
    !fields.some((f) => f.type === "number" && result[f.id])
  )
    throw new WorkspaceError(
      "Enter measurements or leave this piece marked Measurements pending.",
    );
  return result;
}
export function profileFor(
  customer: Customer | null | undefined,
  garmentId: string,
) {
  return customer?.profiles?.find((p) => p.garmentId === garmentId);
}
export function compatibleValues(
  garment: Garment,
  customer: Customer | null | undefined,
) {
  const profile = profileFor(customer, garment.id);
  if (!profile || profile.snapshot.unit !== garment.unit) return {};
  return Object.fromEntries(
    garment.fields
      .filter((field) => {
        const old = profile.snapshot.fields.find((f) => f.id === field.id);
        return (
          old &&
          old.type === field.type &&
          old.help === field.help &&
          resolveGuideId(old) === resolveGuideId(field) &&
          (field.type !== "select" ||
            field.options.includes(profile.snapshot.values[field.id]))
        );
      })
      .map((f) => [f.id, profile.snapshot.values[f.id] ?? ""]),
  );
}
export function legacyValues(garment: Garment, customer: Customer) {
  if (garment.id !== "garment-blouse" || garment.unit !== "in") return {};
  return Object.fromEntries(
    garment.fields
      .filter((f) => customer.measurements[f.label])
      .map((f) => [f.id, customer.measurements[f.label]]),
  );
}
