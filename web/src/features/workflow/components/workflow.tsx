"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Check, Scissors, ScanLine } from "lucide-react";
import { useWorkflow } from "@/features/workflow/hooks/use-workflow";
import { useWorkflowColumn } from "@/features/workflow/hooks/use-workflow-column";
import { PageHeading, PriorityBadge } from "@/shared/components/ui";
import { QueryState, Pagination } from "@/shared/components/query-state";
import { STATIONS, formatDate } from "@/shared/workspace";

function WorkflowColumn({ station }: { station: number }) {
  const { advancePiece } = useWorkflow();
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const query = useWorkflowColumn(station, page);
  const column = query.data?.columns.find((entry) => entry.station === station);
  return (
    <section
      className="workflow-column"
      aria-label={`${STATIONS[station]} station`}
    >
      <div className="workflow-column-head">
        <Scissors size={15} />
        <h2>{STATIONS[station]}</h2>
        {column && <small>{column.page.total}</small>}
      </div>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.reload}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {column?.pieces.map(({ order, item, customer }) => {
        const overdue = order.dueDate < query.data!.today;
        const actionLabel = STATIONS[item.station + 1]
          ? `Move to ${STATIONS[item.station + 1]}`
          : "Mark ready";
        return (
          <article className="workflow-card" key={item.id}>
            <div
              className="inline-row"
              style={{ justifyContent: "space-between" }}
            >
              <PriorityBadge priority={order.priority} />
              <Link
                href={`/orders/${order.id}`}
                aria-label={`Open order ${order.number} for ${customer.name}`}
              >
                <ArrowUpRight size={15} />
              </Link>
            </div>
            <h3>{customer.name}</h3>
            <p>
              {order.number} · {item.garment}
            </p>
            <div className="workflow-card-foot">
              <span className={overdue ? "overdue-text" : ""}>
                {overdue ? "Overdue · " : "Due "}
                {order.dueDate === query.data!.today
                  ? "today"
                  : formatDate(order.dueDate)}
              </span>
            </div>
            <button
              className="button subtle small-button"
              aria-label={`${actionLabel} for ${item.garment}, ${order.number}, ${customer.name}`}
              disabled={Boolean(busy) || query.isRefreshing}
              onClick={async () => {
                setBusy(item.id);
                setError("");
                try {
                  await advancePiece(order.id, item.id, item.station);
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : "Could not update the garment.",
                  );
                  query.reload();
                } finally {
                  setBusy("");
                }
              }}
            >
              <Check size={13} />
              {busy === item.id ? "Saving…" : actionLabel}
            </button>
          </article>
        );
      })}
      {column && !column.pieces.length && !query.isLoading && !query.error && (
        <p className="workflow-empty">
          {column.page.total
            ? "No pieces on this page. Use the page controls below."
            : "No pieces at this station."}
        </p>
      )}
      {column && <Pagination page={column.page} onPageChange={setPage} />}
    </section>
  );
}

export function Workflow() {
  const params = useSearchParams();
  const router = useRouter();
  const rawStation = params.get("station") ?? "all";
  const selected = /^[0-4]$/.test(rawStation) ? rawStation : "all";
  return (
    <>
      <PageHeading
        eyebrow="PIECE PROGRESS"
        title="Workflow"
        description="Choose a station and move each piece when its current step is complete."
      >
        <Link className="button primary" href="/scan">
          <ScanLine size={17} />
          Find an order
        </Link>
      </PageHeading>
      <div className="toolbar" style={{ padding: "0 0 22px", border: 0 }}>
        <div className="toolbar-filters">
          <select
            aria-label="Choose a station"
            value={selected}
            onChange={(event) =>
              router.replace(`/workflow?station=${event.target.value}`)
            }
          >
            <option value="all">All stations</option>
            {STATIONS.map((station, index) => (
              <option key={station} value={index}>
                {station}
              </option>
            ))}
          </select>
        </div>
        <span className="small muted">
          Urgent orders first, then earliest due date
        </span>
      </div>
      <div
        className="workflow-board"
        style={
          selected !== "all"
            ? { gridTemplateColumns: "minmax(0, 500px)" }
            : undefined
        }
      >
        {STATIONS.map((_, station) =>
          selected === "all" || Number(selected) === station ? (
            <WorkflowColumn key={station} station={station} />
          ) : null,
        )}
      </div>
    </>
  );
}
