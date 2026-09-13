import { garmentImage } from "@/features/design-library/domain/designs";
import type { Workspace } from "@/shared/workspace";
import type {
  MeasurementInput,
  MeasurementSnapshot,
} from "../contracts/profiles";
import { resolveGarmentIllustration } from "@/features/settings/domain/garment-illustrations";
import type { MutationContext } from "@/shared/domain/mutation-context";
import { WorkspaceError } from "@/shared/errors";
import { catalogueFor } from "@/features/settings/domain/catalogue";
import { profileFor, validateValues } from "./values";
import { fieldsForSnapshot } from "./guides";

export function prepareMeasurement(
  data: Workspace,
  customerId: string,
  garmentId: string,
  garmentRevision: number,
  input: MeasurementInput,
  timestamp: string,
  actor: string,
): MeasurementSnapshot {
  const garment = catalogueFor(data).garments.find(
    (g) => g.id === garmentId && g.active,
  );
  if (!garment)
    throw new WorkspaceError(
      "This garment is no longer available. Choose another garment.",
      409,
    );
  if (garment.revision !== garmentRevision)
    throw new WorkspaceError(
      `${garment.name} settings changed. Reload its fields and review your measurements.`,
      409,
    );
  const customer = data.customers.find((c) => c.id === customerId);
  if (!customer) throw new WorkspaceError("Customer not found.", 404);
  const profile = profileFor(customer, garmentId);
  if (
    (input.saveProfile || input.source === "profile") &&
    (profile?.revision ?? 0) !== input.expectedProfileRevision
  )
    throw new WorkspaceError(
      "Saved measurements changed on another device. Review the latest profile before saving.",
      409,
    );
  for (const field of input.extraFields) {
    if (
      !field.id.startsWith("custom-") ||
      (field.type === "select" && !field.options.length)
    )
      throw new WorkspaceError("Review the extra measurement fields.");
  }
  const fields = [...garment.fields, ...input.extraFields];
  if (
    new Set(fields.map((f) => f.id)).size !== fields.length ||
    new Set(fields.map((f) => f.label.toLowerCase())).size !== fields.length
  )
    throw new WorkspaceError(
      "Each measurement must have a different name and field ID.",
    );
  const values = validateValues(
    fields,
    input.values,
    garment.unit,
    input.confirmed,
  );
  const snapshot: MeasurementSnapshot = {
    garmentId,
    garmentRevision,
    garmentName: garment.name,
    illustrationId: resolveGarmentIllustration(garment),
    image: garmentImage(garment),
    revision: 1,
    fields: fieldsForSnapshot(fields),
    unit: garment.unit,
    values,
    source: input.source,
    confirmed: input.confirmed,
    recordedAt: timestamp,
    recordedBy: actor,
  };
  if (input.saveProfile) {
    if (!input.confirmed)
      throw new WorkspaceError(
        "Confirm measurements before updating the saved customer profile.",
      );
    // One-off piece fields remain in the order; only template fields enter the reusable profile.
    const saved = {
      ...snapshot,
      revision: (profile?.revision ?? 0) + 1,
      fields: fieldsForSnapshot(garment.fields),
      values: Object.fromEntries(
        garment.fields
          .filter((f) => values[f.id])
          .map((f) => [f.id, values[f.id]]),
      ),
    };
    saved.values = validateValues(
      garment.fields,
      saved.values,
      garment.unit,
      true,
    );
    const updated = {
      garmentId,
      revision: (profile?.revision ?? 0) + 1,
      snapshot: saved,
      history: profile ? [...profile.history, profile.snapshot] : [],
    };
    customer.profiles = [
      ...(customer.profiles ?? []).filter((p) => p.garmentId !== garmentId),
      updated,
    ];
  }
  return snapshot;
}
export function saveProfile(context: MutationContext<"measurement.save">) {
  const { data, action, timestamp, actor } = context;
  prepareMeasurement(
    data,
    action.customerId,
    action.garmentId,
    action.garmentRevision,
    { ...action.measurements, confirmed: true, saveProfile: true },
    timestamp,
    actor,
  );
  data.catalogue ??= catalogueFor(data);
  return { data, resultId: action.customerId };
}
export function savePieceMeasurements({
  data,
  action,
  timestamp,
  actor,
  event,
}: MutationContext<"piece.measurements">) {
  const order = data.orders.find((o) => o.id === action.orderId);
  const item = order?.items.find((p) => p.id === action.pieceId);
  if (!order || !item?.measurement)
    throw new WorkspaceError("Piece measurement record not found.", 404);
  if (
    (item.workflow?.position ?? item.station) !== 0 ||
    !["received", "in_progress"].includes(order.status)
  )
    throw new WorkspaceError(
      "Measurements can only be confirmed before this piece leaves its first step.",
      409,
    );
  if (item.measurement.revision !== action.expectedRevision)
    throw new WorkspaceError(
      "This piece's measurements changed. Reload the order.",
      409,
    );
  const values = validateValues(
    item.measurement.fields,
    action.values,
    item.measurement.unit,
    true,
  );
  item.measurementHistory = [
    ...(item.measurementHistory ?? []),
    item.measurement,
  ];
  item.measurement = {
    ...item.measurement,
    values,
    confirmed: true,
    revision: item.measurement.revision + 1,
    recordedAt: timestamp,
    recordedBy: actor,
  };
  event(
    order.id,
    "Measurements confirmed",
    `${order.number} · ${item.garment}`,
  );
  return { data, resultId: order.id };
}
