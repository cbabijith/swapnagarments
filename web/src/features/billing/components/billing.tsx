"use client";
import Link from "next/link";
import { useState } from "react";

import { ArrowUpRight, Download } from "lucide-react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { useBillingQuery } from "@/features/billing/hooks/use-billing-query";
import { QueryState, Pagination } from "@/shared/components/query-state";
import { EmptyState, PageHeading } from "@/shared/components/ui";
import { balance, paid, money, exportOrders } from "@/shared/workspace";

export function Billing() {
  const { data: preview, mode } = useWorkspace();
  const [filter, setFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const query = useBillingQuery(filter, page);
  const orders = query.data?.data.orders ?? [];
  const customers = query.data?.data.customers ?? [];
  return (
    <>
      <PageHeading
        eyebrow="PAYMENT RECORDS"
        title="Billing & payments"
        description="Check outstanding balances. Open an order to record a payment."
      >
        {mode === "preview" ? (
          <button
            className="button"
            onClick={() =>
              exportOrders(
                preview.orders.filter(
                  (order) =>
                    order.status !== "cancelled" &&
                    (filter === "all" ||
                      (filter === "pending"
                        ? balance(order) > 0
                        : balance(order) === 0)),
                ),
                preview.customers,
              )
            }
          >
            <Download size={16} />
            Export CSV
          </button>
        ) : (
          <a
            className="button"
            href={`/api/orders/export?scope=billing&billingFilter=${filter}`}
            download
          >
            <Download size={16} />
            Export CSV
          </a>
        )}
      </PageHeading>
      <div
        className="metric-grid"
        style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
      >
        <div className="metric-card">
          <div className="metric-top">Pending balances</div>
          <strong className="metric-value">
            {query.data ? money(query.data.totals.pending) : "—"}
          </strong>
          <span className="muted small">Across all unpaid orders</span>
        </div>
        <div className="metric-card">
          <div className="metric-top">Total collected</div>
          <strong className="metric-value">
            {query.data ? money(query.data.totals.collected) : "—"}
          </strong>
          <span className="muted small">
            Recorded advances & balance payments
          </span>
        </div>
      </div>
      <section className="panel">
        <div className="toolbar">
          <div className="filter-tabs" style={{ padding: 0 }}>
            {["pending", "settled", "all"].map((value) => (
              <button
                key={value}
                aria-pressed={filter === value}
                className={filter === value ? "active" : ""}
                onClick={() => {
                  setFilter(value);
                  setPage(1);
                }}
              >
                {value === "pending"
                  ? "Pending balances"
                  : value === "settled"
                    ? "Fully paid"
                    : "All orders"}
              </button>
            ))}
          </div>
        </div>
        <QueryState
          loading={query.isLoading}
          error={query.error}
          retry={query.reload}
        />
        {orders.map((order) => (
          <Link
            className="mobile-order-card"
            style={{ display: "block" }}
            href={`/orders/${order.id}`}
            key={order.id}
          >
            <div
              className="inline-row"
              style={{ justifyContent: "space-between" }}
            >
              <div>
                <strong>
                  {
                    customers.find(
                      (customer) => customer.id === order.customerId,
                    )?.name
                  }
                </strong>
                <p className="muted small" style={{ marginTop: 4 }}>
                  {order.number} · {money(paid(order))} paid
                </p>
              </div>
              <div className="inline-row">
                <strong>{money(balance(order))} due</strong>
                <ArrowUpRight size={16} />
              </div>
            </div>
          </Link>
        ))}
        {query.data && !orders.length && !query.isLoading && !query.error && (
          <EmptyState
            title="No matching orders"
            text={
              query.data.page.total
                ? "No orders on this page. Use the page controls below."
                : "No orders in this payment view."
            }
          />
        )}
        {query.data && (
          <Pagination page={query.data.page} onPageChange={setPage} />
        )}
      </section>
    </>
  );
}
