"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  calendarDate,
  calendarKinds,
  calendarMonth,
} from "@/features/calendar/contracts/query";
import type { CalendarDayQuery } from "@/features/calendar/contracts/query";
import {
  calendarLabels,
  monthGrid,
  shiftMonth,
} from "@/features/calendar/domain/calendar";
import {
  useCalendarDay,
  useCalendarMonth,
} from "@/features/calendar/hooks/use-calendar";
import { PageHeading, EmptyState, StatusBadge } from "@/shared/components/ui";
import { Pagination, QueryState } from "@/shared/components/query-state";
import { money, shopDate } from "@/shared/workspace";
import styles from "./calendar.module.css";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${date}T12:00:00+05:30`));

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
  const changeMonth = (value: string) => {
    if (calendarMonth.safeParse(value).success) selectDate(`${value}-01`);
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
        <section className={styles.monthPanel} aria-label="Shop calendar">
          <div className={styles.monthHeader}>
            <div>
              <p className="eyebrow">SHOP CALENDAR · IST</p>
              <h2>
                {new Intl.DateTimeFormat("en-IN", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(new Date(`${month}-01T12:00:00Z`))}
              </h2>
            </div>
            <div className={styles.monthActions}>
              <button
                type="button"
                className="icon-button"
                aria-label="Previous month"
                disabled={month === "0001-01"}
                onClick={() => changeMonth(shiftMonth(month, -1))}
              >
                <ChevronLeft size={19} />
              </button>
              <button
                type="button"
                className="button small-button"
                onClick={() => selectDate(today)}
              >
                Today
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Next month"
                disabled={month === "9998-12"}
                onClick={() => changeMonth(shiftMonth(month, 1))}
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
          <label className={styles.jump}>
            Jump to date
            <input
              type="date"
              aria-label="Jump to date"
              min="0001-01-01"
              max="9998-12-31"
              value={selection.date}
              onChange={(event) => selectDate(event.target.value)}
            />
          </label>
          <QueryState
            loading={monthQuery.isLoading}
            error={monthQuery.error}
            retry={monthQuery.reload}
          />
          <div
            className={styles.grid}
            role="group"
            aria-label="Calendar dates"
            aria-busy={monthQuery.isLoading}
          >
            {weekdays.map((day) => (
              <span className={styles.weekday} key={day} aria-hidden="true">
                {day}
              </span>
            ))}
            {monthGrid(month).map((date, index) => {
              if (!date)
                return <span key={`blank-${index}`} aria-hidden="true" />;
              const day = monthQuery.data?.days[date];
              const selected = date === selection.date;
              const countLabel = monthQuery.error
                ? "records unavailable"
                : !monthQuery.data
                  ? "loading records"
                  : `${day?.total ?? 0} records`;
              return (
                <button
                  type="button"
                  key={date}
                  data-calendar-date={date}
                  className={`${styles.day} ${selected ? styles.selected : ""} ${date === today ? styles.today : ""}`}
                  aria-label={`${dateLabel(date)}, ${countLabel}${day?.overdue ? `, ${day.overdue} overdue` : ""}`}
                  aria-pressed={selected}
                  aria-current={date === today ? "date" : undefined}
                  onClick={() => selectDate(date)}
                >
                  <span className={styles.dayNumber}>
                    {Number(date.slice(8))}
                  </span>
                  <span className={styles.dots} aria-hidden="true">
                    {calendarKinds
                      .filter((kind) => day?.counts[kind])
                      .map((kind) => (
                        <i key={kind} className={styles[kind]} />
                      ))}
                  </span>
                  <span className={styles.dayCount} aria-hidden="true">
                    {day?.total ? day.total : ""}
                  </span>
                  {Boolean(day?.overdue) && (
                    <span className={styles.overdueDot} aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
          <div className={styles.legend}>
            {calendarKinds.map((kind) => (
              <span key={kind}>
                <i className={styles[kind]} />
                {calendarLabels[kind]}
              </span>
            ))}
            <span>
              <i className={styles.overdueColor} />
              Overdue
            </span>
          </div>
          <div className={styles.monthFooter}>
            <CalendarDays size={17} />
            <span>
              {monthQuery.data
                ? `${monthQuery.data.summary.total} records this month`
                : "Month summary"}
              {Boolean(monthQuery.data?.summary.overdue) && (
                <strong> · {monthQuery.data?.summary.overdue} overdue</strong>
              )}
            </span>
          </div>
        </section>
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
            <Pagination
              page={dayQuery.data.page}
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
