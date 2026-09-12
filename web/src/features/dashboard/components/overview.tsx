"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  Clock3,
  Plus,
  Sun,
  Moon,
  ShoppingBag,
  Wallet,
  Scissors,
  Ruler,
  Sparkles,
  Shirt,
  Wind,
  ArrowRight,
  CircleAlert,
} from "lucide-react";
import { useReports } from "@/features/reports/hooks/use-reports";
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import { QueryState } from "@/shared/components/query-state";
import {
  PageHeading,
  SectionHeading,
  StatusBadge,
  PriorityBadge,
  EmptyState,
} from "@/shared/components/ui";
import { STATIONS, isOverdue, money, formatDate } from "@/shared/workspace";

const stationIcons = [Scissors, Ruler, Sparkles, Shirt, Wind];

export function Overview() {
  const { closeDay, mode, notify } = useReports();
  const [view, setView] = useState("opening");
  const [filter, setFilter] = useState("Today & overdue");
  const [closing, setClosing] = useState(false);
  const query = useDashboard(
    filter === "Ready for pickup"
      ? "ready"
      : filter === "Urgent"
        ? "urgent"
        : "due",
  );
  if (!query.data)
    return (
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.reload}
      />
    );
  const { data, today, summary } = query.data;
  const completion = summary.todayTotal
    ? Math.round((summary.todayFinished / summary.todayTotal) * 100)
    : 0;
  const tasks = data.orders;
  return (
    <>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.reload}
      />
      <PageHeading
        eyebrow="A LITTLE CLARITY FOR YOUR EVERYDAY"
        title="Your shop, at a glance."
        description="Every order, every stitch, every little thing. All in one place."
      >
        <span className="date-chip">
          <CalendarDays size={16} />
          {new Intl.DateTimeFormat("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            timeZone: "Asia/Kolkata",
          }).format(new Date(`${today}T12:00:00+05:30`))}
        </span>
        <Link className="button primary" href="/orders/new">
          <Plus size={18} />
          New order
        </Link>
      </PageHeading>
      <div className="day-tabs" role="tablist" aria-label="Daily overview">
        <button
          role="tab"
          aria-selected={view === "opening"}
          aria-controls="daily-panel"
          className={view === "opening" ? "active" : ""}
          onClick={() => setView("opening")}
        >
          <Sun size={16} />
          Start the day
        </button>
        <button
          role="tab"
          aria-selected={view === "closing"}
          aria-controls="daily-panel"
          className={view === "closing" ? "active" : ""}
          onClick={() => setView("closing")}
        >
          <Moon size={16} />
          Wrap up the day
        </button>
        <span className="day-tabs-note">
          <span className="tiny-dot" />A clear view of what matters
        </span>
      </div>
      <div
        id="daily-panel"
        role="tabpanel"
        aria-label={view === "opening" ? "Start the day" : "Wrap up the day"}
      >
        <div className="metric-grid">
          {[
            {
              label: "Due today",
              value: String(summary.due).padStart(2, "0"),
              detail: `${summary.overdue} overdue need attention`,
              tone: "peach",
              icon: CalendarDays,
              href: "/orders?filter=due",
              highlight: true,
            },
            {
              label: "In the making",
              value: String(summary.inProgress).padStart(2, "0"),
              detail: "Moving through your stations",
              tone: "lilac",
              icon: Scissors,
              href: "/workflow",
            },
            {
              label: "Ready for pickup",
              value: String(summary.ready).padStart(2, "0"),
              detail: "Finished with care, ready to go",
              tone: "sage",
              icon: ShoppingBag,
              href: "/orders?filter=ready",
            },
            {
              label: "Collected today",
              value: money(summary.collectedToday),
              detail: "Advances & final payments",
              tone: "sand",
              icon: Wallet,
              href: "/billing",
            },
          ].map(
            ({ label, value, detail, tone, icon: Icon, href, highlight }) => (
              <Link href={href} className="metric-card" key={label}>
                <div className="metric-top">
                  <span>{label}</span>
                  <span className={`metric-icon ${tone}`}>
                    <Icon size={19} strokeWidth={1.6} />
                  </span>
                </div>
                <strong className="metric-value">{value}</strong>
                <div
                  className={`metric-detail ${highlight ? "attention" : ""}`}
                >
                  {highlight ? (
                    <CircleAlert size={13} />
                  ) : (
                    <span className="tiny-dot" />
                  )}
                  {detail}
                  <ArrowUpRight size={14} />
                </div>
              </Link>
            ),
          )}
        </div>
        {view === "closing" ? (
          <section className="closing-panel panel">
            <span className="closing-icon">
              <Moon size={28} strokeWidth={1.3} />
            </span>
            <p className="eyebrow">A DAY OF GOOD WORK</p>
            <h2>Let’s tie up the loose ends.</h2>
            <p className="muted">
              Review what went out, what came in, and what needs a little more
              time.
            </p>
            <div className="closing-numbers">
              <div>
                <strong>{summary.deliveredToday}</strong>
                <span>Orders delivered today</span>
              </div>
              <div>
                <strong>{money(summary.collectedToday)}</strong>
                <span>Payments collected</span>
              </div>
              <div>
                <strong>{summary.unfinished}</strong>
                <span>Due orders still in progress</span>
              </div>
            </div>
            <button
              className="button primary"
              disabled={summary.reviewed || closing || query.isRefreshing}
              onClick={async () => {
                setClosing(true);
                try {
                  await closeDay();
                } catch (error) {
                  notify(
                    error instanceof Error
                      ? error.message
                      : "Could not save the daily report.",
                  );
                } finally {
                  setClosing(false);
                }
              }}
            >
              <CheckCheck size={18} />
              {summary.reviewed
                ? "Day reviewed"
                : closing
                  ? "Saving…"
                  : "Mark the day reviewed"}
            </button>
            <p className="small muted">
              {mode === "preview"
                ? "Preview only. Connect Railway to save permanent daily reports."
                : "Your daily report is saved with today’s totals and your name."}
            </p>
          </section>
        ) : null}
        <div className="dashboard-columns">
          <div className="dashboard-primary">
            <section className="panel priority-panel">
              <SectionHeading
                title="First things first"
                subtitle="Your priority list. A calmer way to start the day."
                href="/orders"
                action="All orders"
              />
              <div className="filter-tabs" aria-label="Priority list filters">
                {["Today & overdue", "Urgent", "Ready for pickup"].map(
                  (value) => (
                    <button
                      key={value}
                      className={filter === value ? "active" : ""}
                      aria-pressed={filter === value}
                      onClick={() => setFilter(value)}
                    >
                      {value}
                      {value === "Today & overdue" && (
                        <span>{summary.due + summary.overdue}</span>
                      )}
                    </button>
                  ),
                )}
              </div>
              <div className="priority-table">
                <div className="priority-table-head">
                  <span>ORDER & CUSTOMER</span>
                  <span>PROGRESS</span>
                  <span>DUE DATE</span>
                  <span />
                </div>
                {tasks.slice(0, 5).map((order, index) => {
                  const customer = data.customers.find(
                    (entry) => entry.id === order.customerId,
                  );
                  return (
                    <Link
                      className="priority-row"
                      key={order.id}
                      href={`/orders/${order.id}`}
                    >
                      <div className="order-identity">
                        <span
                          className={`garment-icon ${["rose", "sand", "sage", "lilac", "peach"][index % 5]}`}
                        >
                          <Shirt size={23} strokeWidth={1.3} />
                        </span>
                        <div>
                          <strong>{customer?.name}</strong>
                          <span>
                            {order.number} <i>·</i> {order.items[0].garment}
                            {order.items.length > 1
                              ? ` +${order.items.length - 1}`
                              : ""}
                          </span>
                        </div>
                      </div>
                      <div className="row-progress">
                        <StatusBadge status={order.status} />
                        <span className="station-caption">
                          {order.status === "ready"
                            ? "Finishing touches complete"
                            : STATIONS[order.items[0].station]}
                        </span>
                      </div>
                      <div className="row-due">
                        <strong
                          className={
                            isOverdue(order, today) ? "overdue-text" : ""
                          }
                        >
                          {isOverdue(order, today)
                            ? formatDate(order.dueDate)
                            : order.dueDate === today
                              ? "Today"
                              : formatDate(order.dueDate)}
                        </strong>
                        {isOverdue(order, today) ? (
                          <span className="overdue-text">Overdue</span>
                        ) : (
                          <PriorityBadge priority={order.priority} />
                        )}
                      </div>
                      <ArrowUpRight size={16} className="row-arrow" />
                    </Link>
                  );
                })}
                {!tasks.length && (
                  <EmptyState
                    title="All clear here"
                    text="There are no orders in this view."
                  />
                )}
              </div>
              <Link href="/orders" className="panel-footer-link">
                See all {summary.open} active orders
                <ArrowRight size={15} />
              </Link>
            </section>
            <section className="panel station-panel">
              <SectionHeading
                title="On the studio floor"
                subtitle="A little visibility into every step."
                href="/workflow"
                action="View workflow"
              />
              <div className="station-overview">
                {STATIONS.map((station, index) => {
                  const Icon = stationIcons[index];
                  const count = summary.stations[index] ?? 0;
                  return (
                    <Link
                      key={station}
                      href={`/workflow?station=${index}`}
                      className="station-overview-item"
                    >
                      <span className={`station-icon station-${index}`}>
                        <Icon size={21} strokeWidth={1.5} />
                      </span>
                      <strong>{station}</strong>
                      <span>
                        {count} {count === 1 ? "piece" : "pieces"}
                      </span>
                      <div className="station-meter">
                        <span
                          style={{
                            width: `${Math.min((count / Math.max(summary.open, 1)) * 100 + (count ? 14 : 0), 100)}%`,
                          }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
          <aside className="dashboard-aside">
            <section className="focus-card">
              <div className="focus-card-top">
                <span>
                  <Sun size={15} />
                  TODAY’S FOCUS
                </span>
                <span className="sun-decoration">
                  <Sun size={39} strokeWidth={0.8} />
                </span>
              </div>
              <h2>
                Good work starts
                <br />
                with a little focus.
              </h2>
              <p>
                {summary.overdue > 0
                  ? `You have ${summary.overdue} overdue orders. Let’s give them a little extra attention today.`
                  : "Your orders are on track. Give today’s deliveries the finishing touches."}
              </p>
              <Link
                href={
                  summary.overdue
                    ? "/orders?filter=overdue"
                    : "/orders?filter=due"
                }
              >
                {summary.overdue
                  ? "Review overdue orders"
                  : "View today’s orders"}
                <ArrowUpRight size={17} />
              </Link>
              <div className="focus-thread" aria-hidden="true" />
            </section>
            <section className="panel day-progress">
              <SectionHeading title="Little by little" />
              <div className="progress-content">
                <div className="progress-ring">
                  <svg viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="50" r="41" />
                    <circle
                      cx="50"
                      cy="50"
                      r="41"
                      strokeDasharray={`${completion * 2.576} 257.6`}
                    />
                  </svg>
                  <strong>
                    {completion}
                    <small>%</small>
                  </strong>
                </div>
                <div>
                  <strong>Today’s work</strong>
                  <p>
                    {summary.todayFinished} of {summary.todayTotal} due orders
                    <br />
                    ready or delivered
                  </p>
                  <span>
                    <Check size={13} />
                    Every stitch counts.
                  </span>
                </div>
              </div>
            </section>
            <section className="panel recent-activity">
              <SectionHeading
                title="Around the studio"
                subtitle="The latest little updates."
              />
              <div className="activity-list">
                {data.activity.slice(0, 3).map((entry, index) => (
                  <Link
                    key={entry.id}
                    href={`/orders/${entry.orderId}`}
                    className="activity-item"
                  >
                    <span
                      className={`activity-dot ${index === 0 ? "sage" : index === 1 ? "sand" : "lilac"}`}
                    >
                      {index === 0 ? (
                        <Check size={13} />
                      ) : index === 1 ? (
                        <ShoppingBag size={13} />
                      ) : (
                        <Scissors size={13} />
                      )}
                    </span>
                    <div>
                      <strong>{entry.title}</strong>
                      <p>{entry.detail}</p>
                      <time>
                        {new Intl.DateTimeFormat("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: "Asia/Kolkata",
                        }).format(new Date(entry.time))}
                      </time>
                    </div>
                  </Link>
                ))}
              </div>
              <p className="activity-footnote">
                <Clock3 size={12} />
                {mode === "preview"
                  ? "Sample workspace activity"
                  : "Activity recorded by your shop"}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
