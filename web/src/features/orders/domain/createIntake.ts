import { snapshotDesign } from "@/features/design-library/domain/designs";
import { snapshotWorkflow } from "@/features/workflow/domain/templates";
import type { MutationContext } from "@/shared/domain/mutation-context";
import { WorkspaceError } from "@/shared/errors";
import { catalogueFor } from "@/features/settings/domain/catalogue";
import { prepareMeasurement } from "@/features/measurements/domain/saveProfile";
import { phoneKey } from "@/features/customers/domain/phone";
import type { Order } from "@/features/orders/types";
import {
  assertGstSettings,
  calculateGst,
  gstSettingsFor,
  totalWithGst,
} from "@/features/billing/domain/gst";

export function createIntake({
  data,
  action,
  timestamp,
  today,
  actor,
  event,
  assets,
}: MutationContext<"order.intake">) {
  if (action.dueDate < today)
    throw new WorkspaceError("The delivery date cannot be in the past.");
  if (action.items.reduce((sum, item) => sum + item.quantity, 0) > 50)
    throw new WorkspaceError("An order can contain up to 50 pieces.");
  const subtotal = action.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const settings = gstSettingsFor(data.catalogue);
  assertGstSettings(settings, action.gstSettings);
  const gst = calculateGst(subtotal, settings);
  const quoted = totalWithGst(subtotal, gst);
  if (!Number.isSafeInteger(quoted) || quoted > 100_000_000)
    throw new WorkspaceError("The order total is too large.");
  if (action.advance > quoted)
    throw new WorkspaceError("The advance cannot exceed the order total.");
  let customerId: string;
  if (action.customer.kind === "new") {
    const contact = action.customer;
    const duplicate = data.customers.find(
      (c) => phoneKey(c.phone) === phoneKey(contact.phone),
    );
    if (duplicate)
      throw new WorkspaceError(
        `This phone number already belongs to ${duplicate.name}. Select the existing customer.`,
        409,
      );
    customerId = crypto.randomUUID();
    data.customers.push({
      id: customerId,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      notes: contact.notes,
      measurements: {},
    });
  } else {
    customerId = action.customer.id;
    if (!data.customers.some((c) => c.id === customerId))
      throw new WorkspaceError("Choose an existing customer.");
  }
  const saved = new Set<string>();
  const items = action.items.flatMap((item) => {
    if (item.measurements.saveProfile && saved.has(item.garmentId))
      throw new WorkspaceError(
        "Choose only one piece per garment to update the saved customer profile.",
      );
    const measurement = prepareMeasurement(
      data,
      customerId,
      item.garmentId,
      item.garmentRevision,
      { ...item.measurements, saveProfile: false },
      timestamp,
      actor,
    );
    const garment = catalogueFor(data).garments.find(
      (g) => g.id === item.garmentId,
    )!;
    const design = snapshotDesign(garment, item.design, assets);
    const workflow = snapshotWorkflow(catalogueFor(data), garment);
    if (item.measurements.saveProfile) saved.add(item.garmentId);
    return Array.from({ length: item.quantity }, () => ({
      id: crypto.randomUUID(),
      garment: measurement.garmentName,
      price: item.price,
      material: item.material,
      station: workflow?.steps[0].station ?? 0,
      ...(workflow ? { workflow: structuredClone(workflow) } : {}),
      measurement: structuredClone(measurement),
      design: structuredClone(design),
    }));
  });
  for (const item of action.items.filter((i) => i.measurements.saveProfile)) {
    prepareMeasurement(
      data,
      customerId,
      item.garmentId,
      item.garmentRevision,
      item.measurements,
      timestamp,
      actor,
    );
  }
  data.catalogue ??= catalogueFor(data);
  const order: Order = {
    ...(gst ? { gst } : {}),
    id: crypto.randomUUID(),
    number: `SG-${Math.max(1000, ...data.orders.map((o) => Number(o.number.replace("SG-", "")) || 0)) + 1}`,
    customerId,
    items,
    priority: action.priority,
    dueDate: action.dueDate,
    notes: action.notes,
    createdAt: timestamp,
    status: "received",
    payments: action.advance
      ? [
          {
            id: crypto.randomUUID(),
            amount: action.advance,
            method: action.method,
            date: timestamp,
          },
        ]
      : [],
  };
  data.orders.unshift(order);
  event(order.id, "Order created", `${order.number} was added to the queue.`);
  return { data, resultId: order.id };
}
