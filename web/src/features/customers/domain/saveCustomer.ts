import { type Workspace, type Customer } from "@/shared/workspace";
import { WorkspaceError } from "@/shared/errors";
import { phoneKey } from "./phone";
import type { MutationContext } from "@/shared/domain/mutation-context";

export function saveCustomer({
  data,
  action,
  timestamp,
}: MutationContext<"customer.save">): { data: Workspace; resultId?: string } {
  const existing = data.customers.find(
    (entry) => entry.id === action.customer.id,
  );
  const duplicate = data.customers.find(
    (entry) =>
      entry.id !== action.customer.id &&
      phoneKey(entry.phone) === phoneKey(action.customer.phone),
  );
  if (duplicate)
    throw new WorkspaceError(
      `This phone number already belongs to ${duplicate.name}.`,
    );
  const updated: Customer = {
    ...action.customer,
    ...(existing?.profiles ? { profiles: existing.profiles } : {}),
    measurementHistory: existing?.measurementHistory ?? [],
  };
  if (
    existing &&
    JSON.stringify(existing.measurements) !==
      JSON.stringify(updated.measurements) &&
    Object.keys(existing.measurements).length
  )
    updated.measurementHistory = [
      ...(existing.measurementHistory ?? []),
      { date: timestamp, values: existing.measurements },
    ];
  if (existing)
    data.customers = data.customers.map((entry) =>
      entry.id === updated.id ? updated : entry,
    );
  else data.customers.push(updated);
  return { data, resultId: updated.id };
}
