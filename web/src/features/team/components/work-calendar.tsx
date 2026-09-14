"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { calendarDate } from "@/features/calendar/contracts/query";
import {
  CalendarMonthPanel,
  dateLabel,
} from "@/features/calendar/components/calendar-month-panel";
import styles from "@/features/calendar/components/calendar.module.css";
import { PageHeading, EmptyState } from "@/shared/components/ui";
import { ScrollPagination, QueryState } from "@/shared/components/query-state";
import { shopDate } from "@/shared/workspace";
import {
  workCalendarKinds,
  type WorkCalendarDayQuery,
} from "../contracts/work-calendar";
import { workCalendarLabels } from "../domain/work-calendar";
import {
  useWorkCalendarDay,
  useWorkCalendarMonth,
} from "../hooks/use-work-calendar";

const statusLabels = {
  pending: "Pending",
  in_progress: "In progress",
  blocked: "Blocked",
  completed: "Completed",
};
export function WorkCalendar() {
  const [selection, setSelection] = useState(() => ({
    date: shopDate(),
    page: 1,
    kind: "all" as WorkCalendarDayQuery["kind"],
  }));
  const month = selection.date.slice(0, 7);
  const monthQuery = useWorkCalendarMonth(month);
  const dayQuery = useWorkCalendarDay({ ...selection, pageSize: 20 });
  const summary = dayQuery.data?.summary;
  const refreshing = monthQuery.isRefreshing || dayQuery.isRefreshing;
  const selectDate = (date: string) => {
    if (calendarDate.safeParse(date).success)
      setSelection((current) => ({ ...current, date, page: 1 }));
  };
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORK, DAY BY DAY"
        title="My calendar"
        description="Choose a date to see your work due and completed stages."
      >
        <button
          type="button"
          className="button"
          aria-label="Refresh calendar"
          disabled={refreshing}
          onClick={() => {
            monthQuery.reload();
            dayQuery.reload();
          }}
        >
          <RefreshCw size={16} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </PageHeading>
      <div className={styles.layout}>
        <CalendarMonthPanel
          month={month}
          selectedDate={selection.date}
          today={monthQuery.data?.today ?? shopDate()}
          selectDate={selectDate}
          label="My work calendar"
          kinds={workCalendarKinds}
          labels={workCalendarLabels}
          monthQuery={monthQuery}
        />
        <section
          className={styles.dayPanel}
          aria-labelledby="selected-calendar-date"
          aria-busy={dayQuery.isLoading}
        >
          <div className={styles.dayHeader}>
            <p className="eyebrow">SELECTED DAY</p>
            <h2 id="selected-calendar-date" aria-live="polite">
              {dateLabel(selection.date)}
            </h2>
            <p>
              Due work uses the order’s delivery date. Completed stages use
              India Standard Time.
            </p>
          </div>
          <div className={styles.stats}>
            <div>
              <span>Work due</span>
              <strong>{summary?.counts.due ?? "—"}</strong>
            </div>
            <div>
              <span>Completed</span>
              <strong>{summary?.counts.completed ?? "—"}</strong>
            </div>
            <div>
              <span>In progress</span>
              <strong>{summary?.inProgress ?? "—"}</strong>
            </div>
            <div>
              <span>Overdue</span>
              <strong>{summary?.overdue ?? "—"}</strong>
            </div>
          </div>
          <div
            className={styles.filters}
            role="group"
            aria-label="Filter day records"
          >
            {(["all", ...workCalendarKinds] as const).map((kind) => (
              <button
                type="button"
                key={kind}
                aria-pressed={selection.kind === kind}
                className={selection.kind === kind ? styles.activeFilter : ""}
                onClick={() =>
                  setSelection((current) => ({ ...current, kind, page: 1 }))
                }
              >
                {kind === "all" ? "All work" : workCalendarLabels[kind]}
                {summary && (
                  <span>
                    {kind === "all" ? summary.total : summary.counts[kind]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <QueryState
            loading={dayQuery.isLoading}
            error={dayQuery.error}
            retry={dayQuery.reload}
          />
          {!dayQuery.isLoading &&
            !dayQuery.error &&
            dayQuery.data?.entries.length === 0 && (
              <EmptyState
                title={
                  selection.kind === "completed"
                    ? "No completed stages on this date"
                    : selection.kind === "due"
                      ? "No work due on this date"
                      : "No work on this date"
                }
                text="Choose another date or view a different category."
              />
            )}
          {Boolean(dayQuery.data?.entries.length) && (
            <ul className={styles.entries}>
              {dayQuery.data?.entries.map((entry) => (
                <li key={entry.id}>
                  <Link
                    className={styles.entry}
                    href={
                      entry.kind === "completed"
                        ? `/my-work/history/${encodeURIComponent(entry.id)}`
                        : `/my-work?code=${encodeURIComponent(`swapna:${entry.orderId}:${entry.pieceId}`)}`
                    }
                  >
                    <span
                      className={`${styles.eventMarker} ${styles[entry.kind]}`}
                      aria-hidden="true"
                    />
                    <span className={styles.entryBody}>
                      <span className={styles.entryTop}>
                        <span className={styles.category}>
                          {workCalendarLabels[entry.kind]}
                        </span>
                        <time dateTime={entry.time ?? entry.date}>
                          {entry.time
                            ? new Intl.DateTimeFormat("en-IN", {
                                hour: "numeric",
                                minute: "2-digit",
                                timeZone: "Asia/Kolkata",
                              }).format(new Date(entry.time))
                            : "Due date"}
                        </time>
                        {entry.overdue && (
                          <span className={styles.overdueBadge}>Overdue</span>
                        )}
                      </span>
                      <strong className={styles.customer}>
                        {entry.garment}
                        <span>{entry.orderNumber}</span>
                      </strong>
                      <span className={styles.description}>
                        {entry.stepName} · {statusLabels[entry.status]}
                      </span>
                      <span className={styles.description}>
                        Piece {entry.pieceId.slice(-6).toUpperCase()} ·{" "}
                        {entry.kind === "completed"
                          ? "View completed stage"
                          : "Open task"}
                      </span>
                    </span>
                    <ArrowUpRight size={17} className={styles.openIcon} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {dayQuery.data && (
            <ScrollPagination
              page={dayQuery.data.page} loading={dayQuery.isRefreshing} error={dayQuery.error} retry={dayQuery.reload}
              disabled={dayQuery.isLoading}
              onPageChange={(page) =>
                setSelection((current) => ({ ...current, page }))
              }
            />
          )}
          <p className={styles.note}>
            Work due shows your current assignments. Completed stages stay in
            your calendar after a piece moves to its next worker.
          </p>
        </section>
      </div>
    </>
  );
}
