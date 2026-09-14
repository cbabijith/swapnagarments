"use client";
import "./team.css";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ScanLine,
  Play,
  Check,
  Pause,
  UserRoundPlus,
  Shuffle,
  X,
  RefreshCw,
} from "lucide-react";
import { useFeatureQuery } from "@/shared/hooks/use-feature-query";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import {
  PageHeading,
  EmptyState,
  PriorityBadge,
  Dialog,
} from "@/shared/components/ui";
import { QueryState, Pagination } from "@/shared/components/query-state";
import { STATIONS, formatDate } from "@/shared/workspace";
import {
  currentStepName,
  nextStepName,
} from "@/features/workflow/domain/templates";
import { previewWork } from "../domain/queries";
import type { WorkRead, WorkPiece, WorkQuery } from "../types/queries";
import { AssignWorkDialog } from "./assign-work-dialog";
import { AssetImage } from "@/features/design-library/components/asset-image";

export function WorkQueue({
  member,
  onClearMember,
  embedded = false,
}: {
  member?: { id: string; name: string } | null;
  onClearMember?: () => void;
  embedded?: boolean;
}) {
  const { owner, send, notify } = useWorkspace();
  const worker = owner.role === "worker";
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("code") ?? undefined;
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<WorkQuery["status"]>("all");
  const [station, setStation] = useState<WorkQuery["station"]>("all");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [assign, setAssign] = useState<WorkPiece | null>(null);
  const [confirm, setConfirm] = useState<{
    piece: WorkPiece;
    operation: "complete" | "block";
  } | null>(null);
  const input: WorkQuery = {
    page,
    pageSize: 20,
    status,
    station,
    member: member?.id,
    code,
  };
  const search = new URLSearchParams({
    page: String(page),
    pageSize: "20",
    status,
    station,
  });
  if (member) search.set("member", member.id);
  if (code) search.set("code", code);
  const query = useFeatureQuery<WorkRead>(`/api/work?${search}`, (data) =>
    previewWork(data, input, worker ? owner.staffId : undefined),
  );
  async function update(
    piece: WorkPiece,
    operation: "start" | "resume" | "block" | "complete",
    reason?: string,
  ) {
    setBusy(piece.item.id);
    setError("");
    try {
      await send(
        {
          type: "work.update",
          orderId: piece.order.id,
          pieceId: piece.item.id,
          expectedStation: piece.item.station,
          expectedVersion: piece.item.work?.version ?? 0,
          operation,
          reason,
        },
        operation === "complete"
          ? `${currentStepName(piece.item)} completed`
          : `Work ${operation === "start" ? "started" : operation === "resume" ? "resumed" : "blocked"}`,
      );
      setConfirm(null);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not update this work.",
      );
      query.reload();
    } finally {
      setBusy("");
    }
  }
  async function distribute() {
    setBusy("distribute");
    setError("");
    try {
      const result = await send(
        { type: "team.distribute" },
        "Distribution complete",
      );
      const count = Number(result.resultId ?? 0);
      notify(
        count
          ? `${count} ${count === 1 ? "piece assigned" : "pieces assigned"}. Existing assignments were kept.`
          : "No new assignments. Check worker skills, availability, capacity, measurements, or manual holds.",
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not distribute work.",
      );
    } finally {
      setBusy("");
    }
  }
  const summary = query.data?.summary;
  return (
    <div className="work-queue">
      {!embedded && (
        <PageHeading
          eyebrow="YOUR PRODUCTION QUEUE"
          title={worker ? `My work` : "Work assignments"}
          description={
            worker
              ? `Hello ${owner.name.split(" ")[0]}. Start with urgent work, then the earliest due date.`
              : "Assign, start, and track every piece at its current station."
          }
        >
          <Link className="button primary" href="/scan">
            <ScanLine size={17} />
            Scan a piece
          </Link>
        </PageHeading>
      )}
      {summary && (
        <div className="work-summary">
          {(
            [
              ["Unfinished", summary.total],
              ["In progress", summary.inProgress],
              ["Blocked", summary.blocked],
              [
                worker ? "Overdue" : "Unassigned",
                worker ? summary.overdue : summary.unassigned,
              ],
            ] as const
          ).map(([label, value]) => (
            <div className="panel" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="toolbar team-toolbar">
        <div className="toolbar-filters">
          <select
            aria-label="Work status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as WorkQuery["status"]);
              setPage(1);
            }}
          >
            <option value="all">All unfinished work</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="blocked">Blocked</option>
            {!worker && <option value="unassigned">Unassigned</option>}
          </select>
          <select
            aria-label="Work station"
            value={station}
            onChange={(e) => {
              setStation(e.target.value as WorkQuery["station"]);
              setPage(1);
            }}
          >
            <option value="all">All stations</option>
            {STATIONS.map((s, i) => (
              <option value={i} key={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="inline-row">
          <button
            className="button"
            aria-label="Refresh work queue"
            onClick={query.reload}
            disabled={Boolean(busy)}
          >
            <RefreshCw size={16} />
          </button>
          {!worker && (
            <button
              className="button primary"
              onClick={() => void distribute()}
              disabled={Boolean(busy) || query.isRefreshing}
            >
              <Shuffle size={16} />
              {busy === "distribute" ? "Assigning…" : "Distribute waiting work"}
            </button>
          )}
        </div>
      </div>
      {member && (
        <p className="work-filter-note">
          Work assigned to <strong>{member.name}</strong>
          <button
            className="text-link"
            onClick={() => {
              onClearMember?.();
              setPage(1);
            }}
          >
            Show everyone
            <X size={14} />
          </button>
        </p>
      )}
      {code && (
        <p className="work-filter-note">
          Showing the scanned label
          <button
            className="text-link"
            onClick={() => {
              setPage(1);
              router.replace(worker ? "/my-work" : "/team?view=work");
            }}
          >
            Show full queue
            <X size={14} />
          </button>
        </p>
      )}
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.reload}
      />
      {error && !confirm && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="work-grid">
        {query.data?.pieces.map((piece) => {
          const { item, order } = piece;
          const work = item.work;
          const taskStatus = work?.status ?? "pending";
          const disabled =
            Boolean(busy) ||
            query.isRefreshing ||
            item.measurement?.confirmed === false;
          const overdue = order.dueDate < query.data!.today;
          return (
            <article
              className={`panel work-card work-${taskStatus}`}
              key={item.id}
            >
              <div className="work-card-top">
                <PriorityBadge priority={order.priority} />
                <span className={`work-state ${taskStatus}`}>
                  {taskStatus === "in_progress"
                    ? "In progress"
                    : taskStatus === "blocked"
                      ? "Blocked"
                      : work?.assigneeId
                        ? "Pending"
                        : "Unassigned"}
                </span>
              </div>
              <p className="work-order">
                {order.number} · Piece {item.id.slice(-6)}
              </p>
              <h2>
                {item.garment}
                <span>{currentStepName(item)}</span>
              </h2>
              <p className="work-material">
                {item.material || "No material notes"}
              </p>
              <div className="work-card-meta">
                <span className={overdue ? "overdue-text" : ""}>
                  {overdue ? "Overdue · " : "Due "}
                  {order.dueDate === query.data!.today
                    ? "today"
                    : formatDate(order.dueDate)}
                </span>
                <span>{piece.assigneeName ?? "No worker assigned"}</span>
              </div>
              {piece.unassignedReason && (
                <p className="note-box">{piece.unassignedReason}</p>
              )}
              {work?.blockedReason && (
                <p className="work-block-reason">
                  <strong>Blocked:</strong> {work.blockedReason}
                </p>
              )}
              <details className="work-details">
                <summary>Piece details & measurements</summary>
                <p className="small muted">Piece code: {item.id}</p>
                {item.design && (
                  <>
                    <p className="small">{item.design.notes}</p>
                    <div className="work-designs">
                      {[
                        ...(item.design.garmentImage
                          ? [item.design.garmentImage]
                          : []),
                        ...item.design.choices,
                        ...item.design.garmentReferences,
                        ...item.design.references,
                      ].map((asset, index) => (
                        <figure key={`${asset.id}-${index}`}>
                          <AssetImage
                            asset={asset}
                            size={92}
                            decorative={false}
                            workCode={
                              worker
                                ? `swapna:${order.id}:${item.id}`
                                : undefined
                            }
                          />
                          <figcaption>{asset.label}</figcaption>
                        </figure>
                      ))}
                    </div>
                  </>
                )}
                {item.measurement ? (
                  <>
                    <p className="small">
                      {item.measurement.confirmed
                        ? "Confirmed measurements"
                        : "Measurements pending"}{" "}
                      · {item.measurement.unit}
                    </p>
                    <dl>
                      {item.measurement.fields
                        .filter((f) => item.measurement!.values[f.id])
                        .map((f) => (
                          <div key={f.id}>
                            <dt>{f.label}</dt>
                            <dd>{item.measurement!.values[f.id]}</dd>
                          </div>
                        ))}
                    </dl>
                  </>
                ) : (
                  <p className="small muted">
                    No measurement snapshot saved for this older piece. Confirm
                    sizes with the owner before starting.
                  </p>
                )}
                {!worker && (
                  <Link className="text-link" href={`/orders/${order.id}`}>
                    Open full order →
                  </Link>
                )}
              </details>
              <div className="work-actions">
                {!worker && taskStatus === "pending" && (
                  <button
                    className="button"
                    disabled={disabled}
                    onClick={() => setAssign(piece)}
                  >
                    <UserRoundPlus size={16} />
                    {work?.assigneeId ? "Reassign" : "Assign"}
                  </button>
                )}
                {work?.assigneeId && taskStatus === "pending" && (
                  <button
                    className="button primary"
                    disabled={disabled}
                    onClick={() => void update(piece, "start")}
                  >
                    <Play size={15} />
                    {busy === item.id ? "Saving…" : "Start work"}
                  </button>
                )}
                {work?.assigneeId && taskStatus === "in_progress" && (
                  <button
                    className="button primary"
                    disabled={disabled}
                    onClick={() => {
                      setError("");
                      setConfirm({ piece, operation: "complete" });
                    }}
                  >
                    <Check size={16} />
                    Complete stage
                  </button>
                )}
                {work?.assigneeId && taskStatus === "blocked" && (
                  <button
                    className="button primary"
                    disabled={disabled}
                    onClick={() => void update(piece, "resume")}
                  >
                    <Play size={15} />
                    Resume work
                  </button>
                )}
                {work?.assigneeId && taskStatus !== "blocked" && (
                  <button
                    className="button"
                    disabled={disabled}
                    onClick={() => {
                      setError("");
                      setConfirm({ piece, operation: "block" });
                    }}
                  >
                    <Pause size={15} />
                    Block
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {query.data && !query.data.pieces.length && !query.error && (
        <EmptyState
          title={
            code ? "No matching work in this queue" : "Your queue is clear"
          }
          text={
            code
              ? "This piece may be completed, reassigned, or outside the selected filters. Clear the filters or ask the owner."
              : worker
                ? "Assigned work will appear here. Your queue refreshes automatically."
                : "Change the filters or add an order to create work."
          }
        />
      )}
      {query.data && (
        <Pagination page={query.data.page} onPageChange={setPage} />
      )}
      {assign && (
        <AssignWorkDialog piece={assign} onClose={() => setAssign(null)} />
      )}
      {confirm && (
        <Dialog
          title={
            confirm.operation === "complete"
              ? `Complete ${currentStepName(confirm.piece.item)}?`
              : "What is blocking this work?"
          }
          subtitle={`${confirm.piece.order.number} · ${confirm.piece.item.garment}`}
          onClose={() => setConfirm(null)}
          busy={Boolean(busy)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void update(
                confirm.piece,
                confirm.operation,
                confirm.operation === "block"
                  ? String(form.get("reason"))
                  : undefined,
              );
            }}
          >
            <div className="dialog-body">
              {confirm.operation === "block" ? (
                <label className="field">
                  Reason
                  <textarea
                    name="reason"
                    minLength={3}
                    maxLength={500}
                    required
                    placeholder="For example: waiting for lining fabric"
                    autoFocus
                  />
                </label>
              ) : (
                <p>
                  This piece will move to{" "}
                  <strong>
                    {nextStepName(confirm.piece.item) ?? "ready for pickup"}
                  </strong>
                  . Confirm the current stage is finished before handing it
                  over.
                </p>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="button"
                disabled={Boolean(busy)}
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                type="submit"
                disabled={Boolean(busy)}
              >
                {busy
                  ? "Saving…"
                  : confirm.operation === "complete"
                    ? "Confirm completion"
                    : "Mark blocked"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
