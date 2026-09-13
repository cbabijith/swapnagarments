import type { Customer } from "@/features/customers/types";
import type { Order } from "@/features/orders/types";
import { STATUS_LABEL, balance, money, paid, total } from "@/shared/workspace";

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
  return (
    <article className="order-bill" aria-label={`Bill ${order.number}`}>
      <header className="bill-header">
        <div>
          <h1>Swapna Garments</h1>
          <p>Customer bill</p>
          {order.gst?.gstin && (
            <p className="bill-gstin">GSTIN: {order.gst.gstin}</p>
          )}
        </div>
        <div className="bill-reference">
          <strong>{order.number}</strong>
          <p>{STATUS_LABEL[order.status]}</p>
        </div>
      </header>
      <div className="bill-details">
        <div>
          <span>Customer</span>
          <strong>{customer?.name ?? "Customer"}</strong>
          {customer?.phone && <p>{customer.phone}</p>}
        </div>
        <dl className="bill-dates">
          <div>
            <dt>Order date</dt>
            <dd>{formatBillDate(order.createdAt)}</dd>
          </div>
          <div>
            <dt>Due date</dt>
            <dd>{formatBillDate(order.dueDate)}</dd>
          </div>
        </dl>
      </div>
      <table className="bill-items">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Garment / details</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={item.id}>
              <td>{index + 1}</td>
              <td>
                <strong>{item.garment}</strong>
                {item.material && <p>{item.material}</p>}
              </td>
              <td>{money(item.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer className="bill-footer">
        <div className="bill-summary">
          <p>
            {order.items.length} {order.items.length === 1 ? "piece" : "pieces"}
          </p>
          <dl className="bill-totals">
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
            <div>
              <dt>Total</dt>
              <dd>{money(total(order))}</dd>
            </div>
            <div>
              <dt>Amount paid</dt>
              <dd>{money(paid(order))}</dd>
            </div>
            <div className="bill-balance">
              <dt>Balance due</dt>
              <dd>{money(balance(order))}</dd>
            </div>
          </dl>
        </div>
        <p className="bill-thanks">Thank you for choosing Swapna Garments.</p>
      </footer>
    </article>
  );
}
