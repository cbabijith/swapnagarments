"use client";
import { DesignSummary } from "@/features/design-library/components/design-summary";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Plus,
  Search,
  Download,
  Printer,
  Check,
  RotateCcw,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useOrders } from "@/features/orders/hooks/use-orders";
import {
  useOrderDirectory,
  useOrderDetail,
  orderSearchParams,
  selectPreviewOrders,
} from "@/features/orders/hooks/use-order-reads";
import { useDebouncedValue } from "@/shared/hooks/use-feature-query";
import { QueryState, Pagination } from "@/shared/components/query-state";
import { useWorkflow } from "@/features/workflow/hooks/use-workflow";
import { useBilling } from "@/features/billing/hooks/use-billing";
import { MeasurementSummary } from "@/features/measurements/components/measurement-fields";
import { PieceMeasurementEditor } from "@/features/measurements/components/piece-measurements";
import { PieceIllustration } from "./piece-illustration";
import {
  Avatar,
  Dialog,
  EmptyState,
  PageHeading,
  SectionHeading,
  StatusBadge,
  PriorityBadge,
} from "@/shared/components/ui";
import {
  STATIONS,
  STATUS_LABEL,
  type OrderItem,
  isOpen,
  isOverdue,
  formatDate,
  money,
  total,
  paid,
  balance,
  exportOrders,
} from "@/shared/workspace";

export function OrdersList() {
  const { data: previewWorkspace, today, mode } = useOrders();
  const params = useSearchParams();
  const router = useRouter();
  const filter = params.get("filter") ?? "all";
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query);
  const [priority, setPriority] = useState("all");
  const filterKey = JSON.stringify([search, filter, priority]);
  const [pagination, setPagination] = useState({ key: filterKey, page: 1 });
  const page = pagination.key === filterKey ? pagination.page : 1;
  const filters = { q: search, filter, priority };
  const read = useOrderDirectory({ ...filters, page });
  const data = read.data?.data;
  const orders = data?.orders ?? [];
  return (
    <>
      <PageHeading
        eyebrow="ORDER MANAGEMENT"
        title="Orders"
        description="Find orders, check progress, and manage delivery."
      >
        {mode === "preview" ? (
          <button
            className="button"
            onClick={() =>
              exportOrders(
                selectPreviewOrders(previewWorkspace, filters),
                previewWorkspace.customers,
              )
            }
          >
            <Download size={16} />
            Export
          </button>
        ) : (
          <a
            className="button"
            href={`/api/orders/export?${orderSearchParams(filters)}`}
            download
          >
            <Download size={16} />
            Export
          </a>
        )}
        <Link className="button primary" href="/orders/new">
          <Plus size={17} />
          New order
        </Link>
      </PageHeading>
      <section className="panel">
        <div className="toolbar">
          <label className="search-input">
            <Search size={17} />
            <input
              placeholder="Search orders or customers"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={160}
              aria-label="Search orders"
            />
          </label>
          <div className="toolbar-filters">
            <select
              aria-label="Filter orders"
              value={filter}
              onChange={(event) =>
                router.replace(`/orders?filter=${event.target.value}`)
              }
            >
              <option value="all">All orders</option>
              <option value="active">Active orders</option>
              <option value="due">Due today</option>
              <option value="overdue">Overdue</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
            </select>
          </div>
        </div>
        <QueryState
          loading={read.isLoading}
          error={read.error}
          retry={read.reload}
        />
        <div className="table-scroll orders-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>ORDER</th>
                <th>CUSTOMER</th>
                <th>STATUS</th>
                <th>DUE DATE</th>
                <th>PRIORITY</th>
                <th>BALANCE</th>
                <th>
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const customer = data?.customers.find(
                  (entry) => entry.id === order.customerId,
                );
                return (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/orders/${order.id}`}>
                        <strong>{order.number}</strong>
                        <span className="muted">
                          {order.items.length}{" "}
                          {order.items.length === 1 ? "piece" : "pieces"} ·{" "}
                          {order.items[0].garment}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <div className="inline-row">
                        <Avatar name={customer?.name ?? "Customer"} small />
                        <Link href={`/customers/${customer?.id}`}>
                          {customer?.name}
                        </Link>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td
                      className={isOverdue(order, today) ? "overdue-text" : ""}
                    >
                      {order.dueDate === today
                        ? "Today"
                        : formatDate(order.dueDate)}
                      {isOverdue(order, today) && (
                        <span className="muted overdue-text">Overdue</span>
                      )}
                    </td>
                    <td>
                      <PriorityBadge priority={order.priority} />
                    </td>
                    <td>{money(balance(order))}</td>
                    <td>
                      <Link
                        href={`/orders/${order.id}`}
                        className="icon-button"
                        aria-label={`Open ${order.number}`}
                      >
                        <ArrowUpRight size={17} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mobile-order-cards">
          {orders.map((order) => (
            <Link
              className="mobile-order-card"
              key={order.id}
              href={`/orders/${order.id}`}
            >
              <div className="mobile-order-card-top">
                <div className="order-identity">
                  <PieceIllustration item={order.items[0]} />
                  <div>
                    <strong>
                      {
                        data?.customers.find(
                          (customer) => customer.id === order.customerId,
                        )?.name
                      }
                    </strong>
                    <span>
                      {order.number} · {order.items[0].garment}
                    </span>
                  </div>
                </div>
                <ArrowUpRight size={16} />
              </div>
              <div className="mobile-order-card-bottom">
                <StatusBadge status={order.status} />
                <span className={isOverdue(order, today) ? "overdue-text" : ""}>
                  {isOverdue(order, today) ? "Overdue · " : "Due "}
                  {order.dueDate === today
                    ? "today"
                    : formatDate(order.dueDate)}
                </span>
                <PriorityBadge priority={order.priority} />
              </div>
            </Link>
          ))}
        </div>
        {!read.isLoading && !read.error && orders.length === 0 && (
          <EmptyState
            title="No orders match"
            text="Try a different search or filter."
          />
        )}
        {read.data && (
          <Pagination
            page={read.data.page}
            onPageChange={(nextPage) =>
              setPagination({ key: filterKey, page: nextPage })
            }
          />
        )}
      </section>
    </>
  );
}

export function OrderDetail({ id }: { id: string }) {
  const { deliver } = useOrders();
  const [activityPage, setActivityPage] = useState(1);
  const read = useOrderDetail(id, activityPage);
  const data = read.data?.data;
  const { advancePiece, rework } = useWorkflow();
  const { recordPayment } = useBilling();
  const [dialog, setDialog] = useState<
    "payment" | "qr" | "deliver" | "rework" | "measurements" | null
  >(null);
  const [piece, setPiece] = useState<OrderItem | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mutationBlocked = busy || read.isRefreshing;
  const order = data?.orders.find((entry) => entry.id === id);
  if (!order && (read.isLoading || read.error))
    return (
      <QueryState
        loading={read.isLoading}
        error={read.error}
        retry={read.reload}
      />
    );
  if (!order)
    return (
      <EmptyState
        title="Order not found"
        text="This order may not be in the current workspace."
      >
        <Link className="button" href="/orders">
          Back to orders
        </Link>
      </EmptyState>
    );
  const customer = data?.customers.find(
    (entry) => entry.id === order.customerId,
  );
  async function mutate(work: () => void | Promise<unknown>) {
    if (mutationBlocked) return;
    setBusy(true);
    setError("");
    try {
      await work();
      setDialog(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The update could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  const paymentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void mutate(() =>
      recordPayment(
        id,
        Math.round(Number(form.get("amount")) * 100),
        String(form.get("method")),
      ),
    );
  };
  return (
    <>
      <Link className="back-link" href="/orders">
        <ArrowLeft size={14} />
        Back to orders
      </Link>
      <PageHeading
        eyebrow={`ORDER ${order.number}`}
        title={customer?.name ?? "Order details"}
        description={`${order.items.length} ${order.items.length === 1 ? "piece" : "pieces"} · Due ${formatDate(order.dueDate, true)}`}
      >
        <button className="button" onClick={() => setDialog("qr")}>
          <QrCode size={16} />
          QR labels
        </button>
        <button className="button" onClick={() => window.print()}>
          <Printer size={16} />
          Print order
        </button>
      </PageHeading>
      <QueryState
        loading={read.isLoading}
        error={read.error}
        retry={read.reload}
      />
      <div className="inline-row" style={{ marginBottom: 23 }}>
        <StatusBadge status={order.status} />
        <PriorityBadge priority={order.priority} />
        {read.isRefreshing && (
          <span className="muted small" role="status">
            Refreshing order…
          </span>
        )}
      </div>
      {error && !dialog && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="detail-columns">
        <div className="stack">
          <section className="panel">
            <SectionHeading
              title="Every piece, every step"
              subtitle="Follow each garment through the studio."
            />
            {order.items.map((item) => (
              <div key={item.id} className="detail-item">
                <div className="detail-item-top">
                  <div className="inline-row">
                    <PieceIllustration item={item} />
                    <div>
                      <h3>{item.garment}</h3>
                      <p>{item.material || "No fabric notes"}</p>
                    </div>
                  </div>
                  <strong>{money(item.price)}</strong>
                </div>
                <MeasurementSummary snapshot={item.measurement} />
                <DesignSummary design={item.design} />
                {item.measurementHistory?.length ? (
                  <details className="no-print">
                    <summary>Earlier measurements for this piece</summary>
                    {item.measurementHistory.map((snapshot) => (
                      <MeasurementSummary
                        key={snapshot.revision}
                        snapshot={snapshot}
                      />
                    ))}
                  </details>
                ) : null}
                <div className="progress-steps">
                  {STATIONS.map((station, index) => (
                    <div
                      key={station}
                      className={`progress-step ${item.station > index ? "done" : item.station === index ? "current" : ""}`}
                    >
                      <span />
                      {station}
                    </div>
                  ))}
                </div>
                {isOpen(order) && (
                  <div className="detail-item-actions">
                    {item.measurement && item.station === 0 && (
                      <button
                        type="button"
                        className="button"
                        disabled={mutationBlocked}
                        onClick={() => {
                          setPiece(item);
                          setDialog("measurements");
                        }}
                      >
                        {item.measurement.confirmed
                          ? "Edit piece measurements"
                          : "Add / confirm measurements"}
                      </button>
                    )}
                    {item.station < 5 && (
                      <button
                        disabled={
                          mutationBlocked ||
                          item.measurement?.confirmed === false
                        }
                        className="button primary small-button"
                        onClick={() =>
                          void mutate(() =>
                            advancePiece(id, item.id, item.station),
                          )
                        }
                      >
                        <Check size={14} />
                        {item.station === 4
                          ? "Mark ready"
                          : `Move to ${STATIONS[item.station + 1]}`}
                      </button>
                    )}
                    <button
                      className="button small-button"
                      disabled={mutationBlocked}
                      onClick={() => {
                        setPiece(item);
                        setDialog("rework");
                      }}
                    >
                      <RotateCcw size={14} />
                      Request correction
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>
          <section className="panel padded">
            <SectionHeading title="A note for the team" />
            <p className="note-box">
              {order.notes || "No special instructions for this order."}
            </p>
          </section>
          <section className="panel">
            <SectionHeading title="Order activity" />
            {data?.activity.filter((entry) => entry.orderId === order.id)
              .length ? (
              <div className="activity-list">
                {data?.activity
                  .filter((entry) => entry.orderId === order.id)
                  .map((entry) => (
                    <div className="activity-item" key={entry.id}>
                      <span className="activity-dot">
                        <Check size={13} />
                      </span>
                      <div>
                        <strong>{entry.title}</strong>
                        <p>{entry.detail}</p>
                        <time>
                          {new Date(entry.time).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </time>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="padded muted small">
                The next update will appear here.
              </p>
            )}
            {read.data && (
              <Pagination
                page={read.data.page}
                onPageChange={setActivityPage}
              />
            )}
          </section>
        </div>
        <aside className="stack">
          <section className="panel padded">
            <div className="customer-summary">
              <Avatar name={customer?.name ?? "Customer"} />
              <div>
                <h3>Customer details</h3>
                <p>{customer?.name}</p>
              </div>
            </div>
            <div className="summary-line">
              <span>Phone</span>
              <strong>{customer?.phone}</strong>
            </div>
            <Link
              className="text-link"
              style={{ marginTop: 18 }}
              href={`/customers/${customer?.id}`}
            >
              View measurements & profile
              <ArrowUpRight size={14} />
            </Link>
          </section>
          <section className="panel order-summary">
            <h2>Payment details</h2>
            <div className="summary-line">
              <span>Order total</span>
              <strong>{money(total(order))}</strong>
            </div>
            <div className="summary-line">
              <span>Amount paid</span>
              <strong>{money(paid(order))}</strong>
            </div>
            <div className="summary-line total">
              <span>Balance</span>
              <strong>{money(balance(order))}</strong>
            </div>
            {balance(order) > 0 && isOpen(order) && (
              <button
                className="button primary no-print"
                disabled={mutationBlocked}
                onClick={() => setDialog("payment")}
              >
                <Plus size={16} />
                Record payment
              </button>
            )}
            {order.status === "ready" && (
              <button
                className="button subtle no-print"
                style={{ marginTop: 9 }}
                disabled={mutationBlocked || balance(order) > 0}
                onClick={() => setDialog("deliver")}
              >
                <Check size={16} />
                Mark delivered
              </button>
            )}
            {order.status === "ready" && balance(order) > 0 && (
              <p className="small muted">
                Settle the balance before marking this order delivered.
              </p>
            )}
            <div style={{ marginTop: 20 }}>
              {order.payments.map((payment) => (
                <div className="summary-line" key={payment.id}>
                  <span>
                    {payment.method}
                    <small className="muted" style={{ display: "block" }}>
                      {formatDate(payment.date)}
                    </small>
                  </span>
                  <strong>{money(payment.amount)}</strong>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
      {dialog === "payment" && (
        <Dialog
          title="Record a payment"
          busy={busy}
          subtitle={`Balance remaining: ${money(balance(order))}`}
          onClose={() => setDialog(null)}
        >
          <form onSubmit={paymentSubmit}>
            <div className="dialog-body form-grid">
              <label className="field">
                Amount (₹)
                <input
                  autoFocus
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  required
                  min="0.01"
                  max={balance(order) / 100}
                  step="0.01"
                  defaultValue={balance(order) / 100}
                />
              </label>
              <label className="field">
                Method
                <select name="method">
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Bank transfer</option>
                </select>
              </label>
              {error && (
                <p className="form-error full-width" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="button"
                onClick={() => setDialog(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="button primary" disabled={mutationBlocked}>
                {busy ? "Saving…" : "Save payment"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {dialog === "deliver" && (
        <Dialog
          title="Confirm delivery"
          busy={busy}
          subtitle="Confirm the garments and remaining fabric have been returned to the customer."
          onClose={() => setDialog(null)}
        >
          <div className="dialog-actions">
            <button
              className="button"
              disabled={busy}
              onClick={() => setDialog(null)}
            >
              Cancel
            </button>
            <button
              disabled={mutationBlocked}
              className="button primary"
              onClick={() => void mutate(() => deliver(id))}
            >
              {busy ? "Saving…" : "Confirm delivery"}
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </Dialog>
      )}
      {dialog === "rework" && piece && (
        <Dialog
          title="Request a correction"
          busy={busy}
          subtitle={`Send the ${piece.garment.toLowerCase()} back for a correction.`}
          onClose={() => setDialog(null)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void mutate(() =>
                rework(
                  id,
                  piece.id,
                  Number(form.get("station")),
                  String(form.get("reason")),
                ),
              );
            }}
          >
            <div className="dialog-body form-grid">
              <label className="field full-width">
                Return to station
                <select name="station">
                  {STATIONS.map((station, index) => (
                    <option key={station} value={index}>
                      {station}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field full-width">
                What needs adjusting?
                <textarea
                  required
                  name="reason"
                  minLength={3}
                  maxLength={500}
                  placeholder="Please describe the correction for the team."
                />
              </label>
              {error && (
                <p className="form-error full-width" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="dialog-actions">
              <button className="button primary" disabled={mutationBlocked}>
                {busy ? "Saving…" : "Request correction"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {dialog === "measurements" && piece && (
        <PieceMeasurementEditor
          orderId={id}
          piece={piece}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "qr" && (
        <Dialog
          title="Garment QR labels"
          subtitle={`${order.number} · ${customer?.name}`}
          onClose={() => setDialog(null)}
          wide
        >
          <div className="qr-grid">
            {order.items.map((item, index) => (
              <div className="qr-label" key={item.id}>
                <QRCodeSVG
                  value={`swapna:${order.id}:${item.id}`}
                  size={120}
                  marginSize={2}
                />
                <strong>
                  {order.number} · Piece {index + 1}
                </strong>
                <small>
                  {item.garment} · Due {formatDate(order.dueDate)}
                </small>
              </div>
            ))}
          </div>
          <div className="dialog-actions">
            <button className="button primary" onClick={() => window.print()}>
              <Printer size={16} />
              Print labels
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
