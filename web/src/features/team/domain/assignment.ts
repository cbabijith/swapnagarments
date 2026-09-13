import {
  isOpen,
  prioritySort,
  STATIONS,
  type Workspace,
  type OrderItem,
  type Order,
} from "@/shared/workspace";
import type { AssignmentSettings, PieceWork } from "../contracts/team";
import type { Employee } from "../types";

export const defaultAssignmentSettings = (): AssignmentSettings => ({
  automatic: false,
  balanceBy: "effort",
  respectCapacity: true,
  stationMinutes: [30, 15, 60, 90, 15],
  revision: 0,
});
export const workOf = (item: OrderItem): PieceWork =>
  item.work ?? { version: 0, status: "pending" };
export const eligible = (person: Employee, station: number) =>
  Boolean(
    person.worker?.active &&
    person.worker.available &&
    person.worker.skills.includes(station),
  );
export const openPieces = (data: Workspace) =>
  data.orders
    .filter(isOpen)
    .sort(prioritySort)
    .flatMap((order) =>
      order.items
        .filter((item) => item.station < 5)
        .map((item) => ({ order, item })),
    );
export function workloads(data: Workspace) {
  const settings = data.assignmentSettings ?? defaultAssignmentSettings();
  const loads = new Map<
    string,
    { pieces: number; minutes: number; inProgress: number; blocked: number }
  >();
  for (const { item } of openPieces(data)) {
    if (!item.work?.assigneeId) continue;
    const load = loads.get(item.work.assigneeId) ?? {
      pieces: 0,
      minutes: 0,
      inProgress: 0,
      blocked: 0,
    };
    load.pieces++;
    load.minutes += settings.stationMinutes[item.station];
    if (item.work.status === "in_progress") load.inProgress++;
    if (item.work.status === "blocked") load.blocked++;
    loads.set(item.work.assigneeId, load);
  }
  return loads;
}
export function unassignedReason(data: Workspace, item: OrderItem) {
  if (item.measurement?.confirmed === false)
    return "Measurements need confirmation";
  if (item.work?.manual && !item.work.assigneeId)
    return "Held for manual assignment";
  const people = data.staff.filter((p) => eligible(p, item.station));
  if (!people.length)
    return `No available worker for ${STATIONS[item.station]}`;
  const settings = data.assignmentSettings ?? defaultAssignmentSettings();
  const loads = workloads(data);
  if (
    settings.respectCapacity &&
    people.every(
      (p) =>
        (loads.get(p.id)?.minutes ?? 0) +
          settings.stationMinutes[item.station] >
        p.worker!.capacityMinutes,
    )
  )
    return "Eligible workers are at capacity";
  return settings.automatic
    ? "Ready for distribution"
    : "Choose a worker or distribute work";
}
/** Runs under the workspace lock. Never reshuffles an existing assignment. */
export function distribute(
  data: Workspace,
  timestamp: string,
  event: (orderId: string, title: string, detail: string) => void,
) {
  const settings = data.assignmentSettings ?? defaultAssignmentSettings();
  const loads = workloads(data);
  let assigned = 0;
  for (const { order, item } of openPieces(data)) {
    const work = workOf(item);
    if (
      work.assigneeId ||
      work.manual ||
      work.status !== "pending" ||
      item.measurement?.confirmed === false
    )
      continue;
    const minutes = settings.stationMinutes[item.station];
    const people = data.staff.filter(
      (p) =>
        eligible(p, item.station) &&
        (!settings.respectCapacity ||
          (loads.get(p.id)?.minutes ?? 0) + minutes <=
            p.worker!.capacityMinutes),
    );
    const score = (p: Employee) =>
      settings.balanceBy === "pieces"
        ? (loads.get(p.id)?.pieces ?? 0)
        : (loads.get(p.id)?.minutes ?? 0) / p.worker!.capacityMinutes;
    people.sort(
      (a, b) =>
        score(a) - score(b) ||
        a.worker!.skills.length - b.worker!.skills.length ||
        a.id.localeCompare(b.id),
    );
    const person = people[0];
    if (!person) continue;
    item.work = {
      version: work.version + 1,
      status: "pending",
      assigneeId: person.id,
      assignedAt: timestamp,
    };
    const load = loads.get(person.id) ?? {
      pieces: 0,
      minutes: 0,
      inProgress: 0,
      blocked: 0,
    };
    load.pieces++;
    load.minutes += minutes;
    loads.set(person.id, load);
    assigned++;
    event(
      order.id,
      "Work assigned",
      `${order.number} · ${item.garment} · ${STATIONS[item.station]} → ${person.name}`,
    );
  }
  return assigned;
}
export function safeWorkPiece(order: Order, item: OrderItem) {
  return {
    order: {
      id: order.id,
      number: order.number,
      priority: order.priority,
      dueDate: order.dueDate,
    },
    item: {
      id: item.id,
      garment: item.garment,
      material: item.material,
      station: item.station,
      workflow: item.workflow,
      work: item.work,
      measurement: item.measurement,
      design: item.design,
    },
  };
}
