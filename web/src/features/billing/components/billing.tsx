"use client";
import Link from "next/link";
import { useState } from "react";

import { ArrowUpRight, Download } from "lucide-react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { EmptyState, PageHeading } from "@/shared/components/ui";
import { balance, paid, money, exportOrders } from "@/shared/workspace";

export function Billing() {
  const { data } = useWorkspace();
  const [filter, setFilter] = useState("pending");
  const orders = data.orders.filter(
    (order) =>
      order.status !== "cancelled" &&
      (filter === "all" ||
        (filter === "pending" ? balance(order) > 0 : balance(order) === 0)),
  );
  const pending = data.orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + balance(order), 0);
  return (
    <>
      <PageHeading
        eyebrow="EVERY RUPEE, ACCOUNTED FOR"
        title="The business side of beautiful."
        description="Advances, balances, and the satisfaction of a settled bill."
      >
        <button
          className="button"
          onClick={() => exportOrders(orders, data.customers)}
        >
          <Download size={16} />
          Export accounts
        </button>
      </PageHeading>
      <div
        className="metric-grid"
        style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
      >
        <div className="metric-card">
          <div className="metric-top">Pending balances</div>
          <strong className="metric-value">{money(pending)}</strong>
          <span className="muted small">Across all unpaid orders</span>
        </div>
        <div className="metric-card">
          <div className="metric-top">Total collected</div>
          <strong className="metric-value">
            {money(data.orders.reduce((sum, order) => sum + paid(order), 0))}
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
                onClick={() => setFilter(value)}
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
                    data.customers.find(
                      (customer) => customer.id === order.customerId,
                    )?.name
                  }
                </strong>
                <p className="muted small" style={{ marginTop: 4 }}>
                  {order.number} · {money(paid(order))} paid
                </p>
              </div>
              <div className="inline-row">
                <strong>{money(balance(order))}</strong>
                <ArrowUpRight size={16} />
              </div>
            </div>
          </Link>
        ))}
        {!orders.length && (
          <EmptyState
            title="All clear here"
            text="No orders in this payment view."
          />
        )}
      </section>
    </>
  );
}
