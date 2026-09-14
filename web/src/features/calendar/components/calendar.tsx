"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import {
  calendarDate,
  calendarKinds,
} from "@/features/calendar/contracts/query";
import type { CalendarDayQuery } from "@/features/calendar/contracts/query";
import { calendarLabels } from "@/features/calendar/domain/calendar";
import {
  useCalendarDay,
  useCalendarMonth,
} from "@/features/calendar/hooks/use-calendar";
import { PageHeading, EmptyState, StatusBadge } from "@/shared/components/ui";
import { ScrollPagination, QueryState } from "@/shared/components/query-state";
import { money, shopDate } from "@/shared/workspace";
import styles from "./calendar.module.css";
import { CalendarMonthPanel, dateLabel } from "./calendar-month-panel";

export function Calendar() {
  const [selection, setSelection] = useState(() => ({
    date: shopDate(),
    page: 1,
    kind: "all" as CalendarDayQuery["kind"],
  }));
  const month = selection.date.slice(0, 7);
  const monthQuery = useCalendarMonth(month);
  const dayQuery = useCalendarDay({ ...selection, pageSize: 20 });
  const today = monthQuery.data?.today ?? shopDate();
  const summary = dayQuery.data?.summary;
  const selectDate = (date: string) => {
    if (calendarDate.safeParse(date).success)
      setSelection((current) => ({ ...current, date, page: 1 }));
  };
  const refreshing = monthQuery.isRefreshing || dayQuery.isRefreshing;
  const reload = () => {
    monthQuery.reload();
    dayQuery.reload();
  };

  return (
    <>
      <PageHeading
        eyebrow="YOUR SHOP, DAY BY DAY"
        title="Calendar"
        description="Choose a date to see orders, deliveries, payments, and shop activity."
      >
        <button
          type="button"
          className="button"
          onClick={reload}
          disabled={refreshing}
          aria-label="Refresh calendar"
        >
          <RefreshCw size={16} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </PageHeading>
      <div className={styles.layout}>
        <CalendarMonthPanel
          month={month}
          selectedDate={selection.date}
          today={today}
          selectDate={selectDate}
          label="Shop calendar"
          kinds={calendarKinds}
          labels={calendarLabels}
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
              All times are in India Standard Time. Order statuses show their
              current state.
            </p>
          </div>
          <div className={styles.stats}>
            <div>
              <span>Orders due</span>
              <strong>{summary?.counts.due ?? "—"}</strong>
            </div>
            <div>
              <span>New orders</span>
              <strong>{summary?.counts.created ?? "—"}</strong>
            </div>
            <div>
              <span>Delivered</span>
              <strong>{summary?.counts.delivered ?? "—"}</strong>
            </div>
            <div>
              <span>Collected</span>
              <strong>{summary ? money(summary.collected) : "—"}</strong>
            </div>
          </div>
          <div
            className={styles.filters}
            role="group"
            aria-label="Filter day records"
          >
            {(["all", ...calendarKinds] as const).map((kind) => (
              <button
                type="button"
                key={kind}
                aria-pressed={selection.kind === kind}
                className={selection.kind === kind ? styles.activeFilter : ""}
                onClick={() =>
                  setSelection((current) => ({ ...current, kind, page: 1 }))
                }
              >
                {kind === "all" ? "All records" : calendarLabels[kind]}
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
                  selection.kind === "all"
                    ? "No records on this date"
                    : `No ${calendarLabels[selection.kind].toLowerCase()} on this date`
                }
                text="Choose another date or view a different category."
              />
            )}
          {Boolean(dayQuery.data?.entries.length) && (
            <ul className={styles.entries}>
              {dayQuery.data?.entries.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={`/orders/${encodeURIComponent(entry.orderId)}`}
                    className={styles.entry}
                  >
                    <span
                      className={`${styles.eventMarker} ${styles[entry.kind]}`}
                      aria-hidden="true"
                    />
                    <span className={styles.entryBody}>
                      <span className={styles.entryTop}>
                        <span className={styles.category}>
                          {calendarLabels[entry.kind]}
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
                        {entry.customerName}
                        <span>{entry.orderNumber}</span>
                      </strong>
                      <span className={styles.description}>
                        {entry.title}
                        {entry.detail ? ` · ${entry.detail}` : ""}
                      </span>
                      <span className={styles.entryBottom}>
                        <StatusBadge status={entry.status} />
                        {entry.amount !== null && (
                          <strong>{money(entry.amount)}</strong>
                        )}
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
              page={dayQuery.data.page}
              loading={dayQuery.isRefreshing}
              error={dayQuery.error}
              retry={dayQuery.reload}
              disabled={dayQuery.isLoading}
              onPageChange={(page) =>
                setSelection((current) => ({ ...current, page }))
              }
            />
          )}
          <p className={styles.note}>
            An order can appear in multiple categories. Activity includes the
            updates recorded against orders.
          </p>
        </section>
      </div>
    </>
  );
}
