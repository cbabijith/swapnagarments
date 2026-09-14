"use client";

import { Printer } from "lucide-react";
import type { Customer } from "@/features/customers/types";
import type { Order } from "@/features/orders/types";
import { Dialog } from "@/shared/components/ui";
import { OrderBill } from "./order-bill";
import styles from "./order-bill.module.css";

export function BillPreview({
  order,
  customer,
  onClose,
  onPrint,
}: {
  order: Order;
  customer?: Customer;
  onClose: () => void;
  onPrint: () => void;
}) {
  return (
    <Dialog
      title="Bill preview"
      subtitle="Ready to print or save as PDF."
      onClose={onClose}
      wide
      className={`bill-preview ${styles.preview}`}
    >
      <div className={styles.previewSurface}>
        <OrderBill order={order} customer={customer} />
      </div>
      <div className={`dialog-actions ${styles.previewActions}`}>
        <span>A5 · Customer copy</span>
        <button type="button" className="button" onClick={onClose}>
          Close
        </button>
        <button type="button" className="button primary" onClick={onPrint}>
          <Printer size={16} aria-hidden="true" />
          Print / Save PDF
        </button>
      </div>
    </Dialog>
  );
}
