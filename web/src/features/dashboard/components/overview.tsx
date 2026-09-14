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
import { PieceIllustration } from "@/features/orders/components/piece-illustration";
import {
  PageHeading,
  SectionHeading,
  StatusBadge,
  PriorityBadge,
  EmptyState,
} from "@/shared/components/ui";
import {
  STATIONS,
  isOverdue,
  money,
  formatDate,
  shopDate,
} from "@/shared/workspace";

const stationIcons = [Scissors, Ruler, Sparkles, Shirt, Wind];

export function Overview() {
  const { closeDay, mode, notify } = useReports();
  const [view, setView] = useState("opening");
  const [filter, setFilter] = useState("Today & overdue");
  const [closing, setClosing] = useState(false);
  const taskFilter =
    filter === "Ready for pickup"
      ? "ready"
      : filter === "Urgent"
        ? "urgent"
        : "due";
  const overview = useDashboard("due");
  const filtered = useDashboard(taskFilter, taskFilter !== "due");
  const query = taskFilter === "due" ? overview : filtered;
  const data = overview.data?.data;
  const today = overview.data?.today ?? shopDate();
  const summary = overview.data?.summary;
  const completion = summary?.todayTotal
    ? Math.round((summary.todayFinished / summary.todayTotal) * 100)
    : 0;
  const tasks = query.data?.data.orders ?? [];
  const taskCustomers = query.data?.data.customers ?? [];
  return (
    <>
      <PageHeading
        eyebrow="SHOP SUMMARY"
        title="Overview"
        description="Check due orders, track progress, and review today’s payments."
      >
        <Link href="/calendar" className="date-chip" aria-label="Open calendar">
          <CalendarDays size={16} />
          {new Intl.DateTimeFormat("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            timeZone: "Asia/Kolkata",
          }).format(new Date(`${today}T12:00:00+05:30`))}
        </Link>
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
          Today’s orders
        </button>
        <button
          role="tab"
          aria-selected={view === "closing"}
          aria-controls="daily-panel"
          className={view === "closing" ? "active" : ""}
          onClick={() => setView("closing")}
        >
          <Moon size={16} />
          Daily report
        </button>
        <span className="day-tabs-note">
          <span className="tiny-dot" />
          Today’s shop activity
        </span>
      </div>
      <QueryState
        loading={overview.isLoading}
        error={overview.error}
        retry={overview.reload}
      />
      <div
        id="daily-panel"
        role="tabpanel"
        aria-label={view === "opening" ? "Today’s orders" : "Daily report"}
      >
        <div className="metric-grid">
          {summary &&
            [
              {
                label: "Due today",
                value: String(summary.due).padStart(2, "0"),
                detail: `${summary.overdue} overdue orders`,
                tone: "peach",
                icon: CalendarDays,
                href: "/orders?filter=due",
                highlight: true,
              },
              {
                label: "In progress",
                value: String(summary.inProgress).padStart(2, "0"),
                detail: "Orders currently being worked on",
                tone: "lilac",
                icon: Scissors,
                href: "/workflow",
              },
              {
                label: "Ready for pickup",
                value: String(summary.ready).padStart(2, "0"),
                detail: "Orders ready for delivery",
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
        {view === "closing" && summary ? (
          <section className="closing-panel panel">
            <span className="closing-icon">
              <Moon size={28} strokeWidth={1.3} />
            </span>
            <p className="eyebrow">END OF DAY</p>
            <h2>Review today’s totals</h2>
            <p className="muted">
              Check deliveries, payments, and unfinished orders before saving
              the daily report.
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
              disabled={summary.reviewed || closing || overview.isRefreshing}
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
                ? "Report saved"
                : closing
                  ? "Saving…"
                  : "Save daily report"}
            </button>
            <p className="small muted">
              {mode === "preview"
                ? "Sample data only. This report does not affect your shop records."
                : "Saving records today’s totals and your name. View saved reports in Settings."}
            </p>
          </section>
        ) : null}
        <div className="dashboard-columns">
          <div className="dashboard-primary">
            <section className="panel priority-panel">
              <SectionHeading
                title="Priority orders"
                subtitle="Up to five matching orders, sorted by priority and due date."
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
                      {value === "Today & overdue" && summary && (
                        <span>{summary.due + summary.overdue}</span>
                      )}
                    </button>
                  ),
                )}
              </div>
              <div className="priority-table">
                {taskFilter !== "due" && (
                  <QueryState
                    loading={query.isLoading}
                    error={query.error}
                    retry={query.reload}
                  />
                )}
                <div className="priority-table-head">
                  <span>ORDER & CUSTOMER</span>
                  <span>PROGRESS</span>
                  <span>DUE DATE</span>
                  <span />
                </div>
                {tasks.slice(0, 5).map((order) => {
                  const customer = taskCustomers.find(
                    (entry) => entry.id === order.customerId,
                  );
                  return (
                    <Link
                      className="priority-row"
                      key={order.id}
                      href={`/orders/${order.id}`}
                    >
                      <div className="order-identity">
                        <PieceIllustration item={order.items[0]} />
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
                            ? "All pieces complete"
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
                {query.data && !tasks.length && !query.error && (
                  <EmptyState
                    title="No matching orders"
                    text="Choose another filter or open all orders."
                  />
                )}
              </div>
              {summary && (
                <Link href="/orders" className="panel-footer-link">
                  View all orders · {summary.open} active
                  <ArrowRight size={15} />
                </Link>
              )}
            </section>
            {summary && (
              <section className="panel station-panel">
                <SectionHeading
                  title="Workflow by station"
                  subtitle="Open a station to view its pieces and update their progress."
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
            )}
          </div>
          <aside className="dashboard-aside">
            {summary && (
              <>
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
                    Review today’s
                    <br />
                    due orders.
                  </h2>
                  <p>
                    {summary.overdue > 0
                      ? `${summary.overdue} orders are overdue. Open the list to review their progress.`
                      : "No orders are overdue. Check the orders due today."}
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
                  <SectionHeading title="Today’s completion" />
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
                      <strong>Orders due today</strong>
                      <p>
                        {summary.todayFinished} of {summary.todayTotal} due
                        orders
                        <br />
                        ready or delivered
                      </p>
                      <span>
                        <Check size={13} />
                        Ready or delivered = complete
                      </span>
                    </div>
                  </div>
                </section>
                <section className="panel recent-activity">
                  <SectionHeading
                    title="Recent activity"
                    subtitle="The latest recorded order updates."
                  />
                  <div className="activity-list">
                    {data?.activity.slice(0, 3).map((entry, index) => (
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
                      ? "Sample activity"
                      : "Activity recorded by your shop"}
                  </p>
                </section>
              </>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
