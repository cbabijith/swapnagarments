"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Check, Scissors, ScanLine } from "lucide-react";
import { useWorkflow } from "@/features/workflow/hooks/use-workflow";
import { PageHeading, PriorityBadge } from "@/shared/components/ui";
import {
  STATIONS,
  isOpen,
  isOverdue,
  formatDate,
  prioritySort,
} from "@/shared/workspace";

export function Workflow() {
  const { data, today, advancePiece } = useWorkflow();
  const params = useSearchParams();
  const router = useRouter();
  const selected = params.get("station") ?? "all";
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  return (
    <>
      <PageHeading
        eyebrow="FROM FIRST CUT TO FINAL PRESS"
        title="Good things are in the making."
        description="See where every piece is, and help the next step happen."
      >
        <Link className="button primary" href="/scan">
          <ScanLine size={17} />
          Scan a garment
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
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div
        className="workflow-board"
        style={
          selected !== "all"
            ? { gridTemplateColumns: "minmax(0, 500px)" }
            : undefined
        }
      >
        {STATIONS.map((station, index) => {
          if (selected !== "all" && Number(selected) !== index) return null;
          const pieces = data.orders
            .filter(isOpen)
            .sort(prioritySort)
            .flatMap((order) =>
              order.items
                .filter((item) => item.station === index)
                .map((item) => ({ item, order })),
            );
          return (
            <section className="workflow-column" key={station}>
              <div className="workflow-column-head">
                <Scissors size={15} />
                <h2>{station}</h2>
                <small>{pieces.length}</small>
              </div>
              {pieces.map(({ order, item }) => (
                <article className="workflow-card" key={item.id}>
                  <div
                    className="inline-row"
                    style={{ justifyContent: "space-between" }}
                  >
                    <PriorityBadge priority={order.priority} />
                    <Link
                      href={`/orders/${order.id}`}
                      aria-label={`View ${order.number}`}
                    >
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>
                  <h3>
                    {
                      data.customers.find(
                        (customer) => customer.id === order.customerId,
                      )?.name
                    }
                  </h3>
                  <p>
                    {order.number} · {item.garment}
                  </p>
                  <div className="workflow-card-foot">
                    <span
                      className={isOverdue(order, today) ? "overdue-text" : ""}
                    >
                      {isOverdue(order, today) ? "Overdue · " : "Due "}
                      {order.dueDate === today
                        ? "today"
                        : formatDate(order.dueDate)}
                    </span>
                  </div>
                  <button
                    className="button subtle small-button"
                    disabled={busy === item.id}
                    onClick={async () => {
                      setBusy(item.id);
                      setError("");
                      try {
                        await advancePiece(order.id, item.id);
                      } catch (error) {
                        setError(
                          error instanceof Error
                            ? error.message
                            : "Could not update the garment.",
                        );
                      } finally {
                        setBusy("");
                      }
                    }}
                  >
                    <Check size={13} />
                    {busy === item.id ? "Saving…" : "Complete step"}
                  </button>
                </article>
              ))}
              {!pieces.length && (
                <p className="workflow-empty">
                  A little breathing room.
                  <br />
                  No pieces at this station.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
