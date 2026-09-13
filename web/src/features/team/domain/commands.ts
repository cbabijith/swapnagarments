import { STATIONS, isOpen } from "@/shared/workspace";
import { WorkspaceError } from "@/shared/errors";
import type { MutationContext } from "@/shared/domain/mutation-context";
import { changePiece } from "@/features/workflow/domain/changePiece";
import {
  defaultAssignmentSettings,
  distribute,
  eligible,
  openPieces,
  workOf,
  workloads,
} from "./assignment";

export function teamCommand(
  context: MutationContext<
    | "team.save"
    | "team.settings"
    | "team.distribute"
    | "work.assign"
    | "work.update"
  >,
) {
  const { data, action, timestamp, event } = context;
  if (action.type === "team.save") {
    const previous = action.id
      ? data.staff.find((p) => p.id === action.id)
      : undefined;
    if (action.id && !previous)
      throw new WorkspaceError("Team member not found.", 404);
    if (previous && !previous.worker && /owner/i.test(previous.role))
      throw new WorkspaceError("The owner account is managed separately.", 409);
    if ((previous?.worker?.revision ?? 0) !== action.expectedRevision)
      throw new WorkspaceError(
        "This member changed. Reopen their details and try again.",
        409,
      );
    if (!previous?.worker && !action.password)
      throw new WorkspaceError(
        "Set a password of at least 12 characters for the new account.",
      );
    if (
      data.staff.some(
        (p) => p.id !== previous?.id && p.worker?.email === action.worker.email,
      )
    )
      throw new WorkspaceError(
        "This email already belongs to a team member.",
        409,
      );
    const id = previous?.id ?? crypto.randomUUID();
    const person = {
      id,
      name: action.name,
      role: "Worker",
      station: action.worker.skills.map((s) => STATIONS[s]).join(" · "),
      color: previous?.color ?? "sage",
      worker: { ...action.worker, revision: action.expectedRevision + 1 },
    };
    const affected = openPieces(data).filter(
      ({ item }) =>
        item.work?.assigneeId === id &&
        (!person.worker.active || !person.worker.skills.includes(item.station)),
    );
    if (
      person.worker.active &&
      affected.some(({ item }) => item.work?.status !== "pending")
    )
      throw new WorkspaceError(
        "Finish this member's started or blocked work before removing its skill. You can deactivate the account immediately if needed.",
        409,
      );
    for (const { order, item } of affected) {
      // Deactivation revokes access immediately; the owner can finish existing active work.
      if (item.work?.status !== "pending") continue;
      item.work = { version: workOf(item).version + 1, status: "pending" };
      event(
        order.id,
        "Assignment released",
        `${person.name} is no longer eligible for ${STATIONS[item.station]}.`,
      );
    }
    if (previous) data.staff[data.staff.indexOf(previous)] = person;
    else data.staff.push(person);
    return { data, resultId: id };
  }
  if (action.type === "team.settings") {
    if (action.settings.revision !== (data.assignmentSettings?.revision ?? 0))
      throw new WorkspaceError(
        "Assignment settings changed. Reload and try again.",
        409,
      );
    data.assignmentSettings = {
      ...action.settings,
      revision: action.settings.revision + 1,
    };
    return { data };
  }
  if (action.type === "team.distribute") {
    const count = distribute(data, timestamp, event);
    return { data, resultId: String(count) };
  }
  const order = data.orders.find((o) => o.id === action.orderId);
  const item = order?.items.find((i) => i.id === action.pieceId);
  if (!order || !item) throw new WorkspaceError("Work item not found.", 404);
  const work = workOf(item);
  if (
    !isOpen(order) ||
    item.station >= 5 ||
    item.station !== action.expectedStation ||
    work.version !== action.expectedVersion
  )
    throw new WorkspaceError("This work changed. Refresh and try again.", 409);
  if (action.type === "work.assign") {
    if (work.status !== "pending")
      throw new WorkspaceError(
        "Started or blocked work must be resumed and completed before reassignment.",
        409,
      );
    if (action.assigneeId) {
      const person = data.staff.find((p) => p.id === action.assigneeId);
      if (!person || !eligible(person, item.station))
        throw new WorkspaceError(
          "Choose an active, available worker with this station skill.",
          409,
        );
      if (item.measurement?.confirmed === false)
        throw new WorkspaceError(
          "Confirm measurements before assigning this piece.",
          409,
        );
      const settings = data.assignmentSettings ?? defaultAssignmentSettings();
      const load = workloads(data).get(person.id)?.minutes ?? 0;
      if (
        settings.respectCapacity &&
        work.assigneeId !== person.id &&
        load + settings.stationMinutes[item.station] >
          person.worker!.capacityMinutes
      )
        throw new WorkspaceError(
          "This worker is at capacity. Increase their queue capacity or choose another worker.",
          409,
        );
    }
    item.work = {
      version: work.version + 1,
      status: "pending",
      manual: true,
      ...(action.assigneeId
        ? { assigneeId: action.assigneeId, assignedAt: timestamp }
        : {}),
    };
    event(
      order.id,
      action.assigneeId ? "Work assigned manually" : "Work held for assignment",
      `${order.number} · ${item.garment} · ${STATIONS[item.station]}${action.assigneeId ? ` → ${data.staff.find((p) => p.id === action.assigneeId)!.name}` : ""}`,
    );
    return { data, resultId: item.id };
  }
  if (!work.assigneeId)
    throw new WorkspaceError("Assign a worker before starting this task.", 409);
  if (item.measurement?.confirmed === false)
    throw new WorkspaceError(
      "Confirm measurements before starting this piece.",
      409,
    );
  if (action.operation === "complete") {
    if (work.status !== "in_progress")
      throw new WorkspaceError(
        "Start or resume this task before completing it.",
        409,
      );
    return changePiece({
      ...context,
      action: {
        type: "piece.advance",
        orderId: order.id,
        pieceId: item.id,
        expectedStation: item.station,
      },
    });
  }
  if (action.operation === "start" && work.status !== "pending")
    throw new WorkspaceError("Only pending work can be started.", 409);
  if (action.operation === "resume" && work.status !== "blocked")
    throw new WorkspaceError("Only blocked work can be resumed.", 409);
  if (
    action.operation === "block" &&
    (work.status === "blocked" || !action.reason)
  )
    throw new WorkspaceError("Give a reason for blocking this work.", 409);
  item.work = {
    ...work,
    version: work.version + 1,
    status: action.operation === "block" ? "blocked" : "in_progress",
    ...(action.operation === "block"
      ? { blockedReason: action.reason }
      : { startedAt: work.startedAt ?? timestamp }),
  };
  if (action.operation !== "block") delete item.work.blockedReason;
  if (order.status === "received") order.status = "in_progress";
  event(
    order.id,
    `Work ${action.operation === "start" ? "started" : action.operation === "resume" ? "resumed" : "blocked"}`,
    `${order.number} · ${item.garment} · ${STATIONS[item.station]}${action.reason ? ` · ${action.reason}` : ""}`,
  );
  return { data, resultId: item.id };
}
