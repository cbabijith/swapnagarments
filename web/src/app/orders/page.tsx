import { Suspense } from "react";
import { OrdersList } from "@/components/orders";
export default function Page() {
  return (
    <Suspense fallback={<p className="muted">Loading orders…</p>}>
      <OrdersList />
    </Suspense>
  );
}
