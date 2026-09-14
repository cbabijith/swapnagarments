"use client";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { calendarMonth } from "../contracts/query";
import { monthGrid, shiftMonth } from "../domain/calendar";
import { QueryState } from "@/shared/components/query-state";
import styles from "./calendar.module.css";
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${date}T12:00:00+05:30`));

type DaySummary = {
  total: number;
  overdue: number;
  counts: Record<string, number>;
};
export function CalendarMonthPanel({
  month,
  selectedDate,
  today,
  selectDate,
  label,
  kinds,
  labels,
  monthQuery,
}: {
  month: string;
  selectedDate: string;
  today: string;
  selectDate: (date: string) => void;
  label: string;
  kinds: readonly string[];
  labels: Record<string, string>;
  monthQuery: {
    data: { days: Record<string, DaySummary>; summary: DaySummary } | null;
    isLoading: boolean;
    error: string;
    reload: () => void;
  };
}) {
  const changeMonth = (value: string) => {
    if (calendarMonth.safeParse(value).success) selectDate(`${value}-01`);
  };
  return (
    <section className={styles.monthPanel} aria-label={label}>
      <div className={styles.monthHeader}>
        <div>
          <p className="eyebrow">{label.toUpperCase()} · IST</p>
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
          value={selectedDate}
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
          if (!date) return <span key={`blank-${index}`} aria-hidden="true" />;
          const day = monthQuery.data?.days[date];
          const selected = date === selectedDate;
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
              <span className={styles.dayNumber}>{Number(date.slice(8))}</span>
              <span className={styles.dots} aria-hidden="true">
                {kinds
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
        {kinds.map((kind) => (
          <span key={kind}>
            <i className={styles[kind]} />
            {labels[kind]}
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
  );
}
