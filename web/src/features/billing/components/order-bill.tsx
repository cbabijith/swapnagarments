import type { Customer } from "@/features/customers/types";
import type { Order } from "@/features/orders/types";
import { Check, Scissors } from "lucide-react";
import { STATUS_LABEL, balance, money, paid, total } from "@/shared/workspace";
import styles from "./order-bill.module.css";

const billDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function formatBillDate(value: string) {
  return billDate.format(
    new Date(
      /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+05:30` : value,
    ),
  );
}

export function OrderBill({
  order,
  customer,
}: {
  order: Order;
  customer?: Customer;
}) {
  const amountPaid = paid(order);
  const amountDue = balance(order);
  const cancelled = order.status === "cancelled";
  const settled = amountDue <= 0;
  const paymentStatus = cancelled
    ? "Cancelled"
    : settled
      ? "Fully paid"
      : amountPaid > 0
        ? "Partially paid"
        : "Unpaid";
  return (
    <article
      className={`order-bill ${styles.bill}`}
      aria-label={`Bill ${order.number}`}
    >
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <Scissors size={27} strokeWidth={1.4} />
          </span>
          <div>
            <h2>
              Swapna <span>Garments</span>
            </h2>
            <p>Made with care. Tailored for you.</p>
          </div>
        </div>
        <div className={styles.reference}>
          <p className={styles.label}>Customer bill</p>
          <strong>{order.number}</strong>
          <span
            className={`${styles.status} ${cancelled ? styles.cancelled : settled ? styles.settled : styles.pending}`}
          >
            {settled && !cancelled && <Check size={12} aria-hidden="true" />}
            {paymentStatus}
          </span>
        </div>
      </header>
      {order.gst?.gstin && (
        <p className={styles.gstin}>
          GSTIN <strong>{order.gst.gstin}</strong>
        </p>
      )}
      <div className={styles.details}>
        <div className={styles.customer}>
          <p className={styles.label}>Billed to</p>
          <strong>{customer?.name ?? "Customer"}</strong>
          {customer?.phone && <p>{customer.phone}</p>}
        </div>
        <dl className={styles.dates}>
          <div>
            <dt>Order date</dt>
            <dd>{formatBillDate(order.createdAt)}</dd>
          </div>
          <div>
            <dt>Delivery due</dt>
            <dd>{formatBillDate(order.dueDate)}</dd>
          </div>
          <div>
            <dt>Order status</dt>
            <dd>{STATUS_LABEL[order.status]}</dd>
          </div>
        </dl>
      </div>
      <div className={styles.sectionHeading}>
        <h3>Order details</h3>
        <span>
          {order.items.length} {order.items.length === 1 ? "piece" : "pieces"}
        </span>
      </div>
      <table className={styles.items}>
        <caption className={styles.srOnly}>
          Garments and charges for {order.number}
        </caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Description</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={item.id}>
              <td>{String(index + 1).padStart(2, "0")}</td>
              <td>
                <strong>{item.garment}</strong>
                {item.material && <p>{item.material}</p>}
              </td>
              <td>{money(item.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        className={`${styles.summary} ${order.payments.length > 4 ? styles.expandedSummary : ""}`}
      >
        <section className={styles.payments} aria-label="Payment record">
          <h3>Payment record</h3>
          {order.payments.length ? (
            <ul>
              {order.payments.map((payment) => (
                <li key={payment.id}>
                  <div>
                    <strong>{payment.method}</strong>
                    <span>{formatBillDate(payment.date)}</span>
                  </div>
                  <b>{money(payment.amount)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyPayments}>No payments recorded.</p>
          )}
        </section>
        <div className={styles.totalsBlock}>
          <dl className={styles.totals}>
            {order.gst && (
              <>
                <div>
                  <dt>Amount before GST</dt>
                  <dd>{money(order.gst.taxableAmount)}</dd>
                </div>
                <div>
                  <dt>
                    GST ({order.gst.rateBps / 100}%)
                    {order.gst.priceMode === "inclusive" ? " included" : ""}
                  </dt>
                  <dd>{money(order.gst.amount)}</dd>
                </div>
              </>
            )}
            <div className={styles.grandTotal}>
              <dt>Bill total</dt>
              <dd>{money(total(order))}</dd>
            </div>
            <div>
              <dt>Amount paid</dt>
              <dd>{money(amountPaid)}</dd>
            </div>
          </dl>
          <div className={styles.balance}>
            <span>{cancelled ? "Recorded balance" : "Balance due"}</span>
            <strong>{money(amountDue)}</strong>
            <small>
              {cancelled
                ? "This order has been cancelled."
                : settled
                  ? "Thank you. Your bill is fully settled."
                  : "Payable at collection"}
            </small>
          </div>
        </div>
      </div>
      <footer className={styles.footer}>
        <p>
          Thank you for choosing <strong>Swapna Garments.</strong>
        </p>
        <span>
          {cancelled || order.status === "delivered"
            ? "Please retain this bill for your records."
            : "Please keep this bill for collection."}
        </span>
      </footer>
    </article>
  );
}
