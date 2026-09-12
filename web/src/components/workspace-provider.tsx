"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  type Workspace,
  type Order,
  type Customer,
  type Priority,
  type OrderItem,
  shopDate,
} from "@/lib/workspace";
import {
  applyMutation,
  type WorkspaceMutation,
} from "@/lib/workspace-mutations";
import { AccessScreen } from "./access-screen";

type NewOrder = {
  customerId: string;
  items: Omit<OrderItem, "id" | "station">[];
  priority: Priority;
  dueDate: string;
  notes: string;
  advance: number;
  method: string;
};
type Owner = { name: string; email: string };
type WorkspaceContext = {
  data: Workspace;
  today: string;
  notice: string;
  mode: "preview" | "live";
  owner: Owner;
  notify: (message: string) => void;
  createOrder: (input: NewOrder) => Promise<Order>;
  saveCustomer: (input: Customer) => Promise<void>;
  advancePiece: (orderId: string, pieceId: string) => Promise<void>;
  rework: (
    orderId: string,
    pieceId: string,
    station: number,
    reason: string,
  ) => Promise<void>;
  recordPayment: (
    orderId: string,
    amount: number,
    method: string,
  ) => Promise<void>;
  deliver: (orderId: string) => Promise<void>;
  closeDay: () => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<WorkspaceContext | null>(null);

export function WorkspaceProvider({
  initialData,
  mode,
  children,
}: {
  initialData: Workspace;
  mode: "preview" | "live";
  children: ReactNode;
}) {
  const [data, setData] = useState(initialData);
  const [notice, setNotice] = useState("");
  const [owner, setOwner] = useState<Owner>({ name: "Shop owner", email: "" });
  const [access, setAccess] = useState(
    mode === "preview" ? "ready" : "loading",
  );
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const snapshot = useRef(initialData);
  const revision = useRef(-1);
  const loaded = useRef(false);
  const notify = (message: string) => setNotice(message);
  const today = shopDate();

  const acceptSnapshot = useCallback(
    (updated: Workspace, updatedRevision: number) => {
      if (updatedRevision < revision.current) return;
      revision.current = updatedRevision;
      snapshot.current = updated;
      setData(updated);
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (mode === "preview") return;
    try {
      const response = await fetch("/api/workspace", {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (response.status === 401) {
        setAccess(result.setupRequired ? "setup" : "signin");
        setSetupAvailable(Boolean(result.setupAvailable));
        return;
      }
      if (!response.ok)
        throw new Error(
          result.error || "The workspace connection is unavailable.",
        );
      acceptSnapshot(result.data, result.revision);
      setOwner(result.owner);
      loaded.current = true;
      setAccess("ready");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not reach your workspace.";
      if (loaded.current)
        setNotice(
          "Could not refresh the workspace. Please check your connection.",
        );
      else {
        setConnectionError(message);
        setAccess("error");
      }
    }
  }, [mode, acceptSnapshot]);

  useEffect(() => {
    if (mode === "preview") return;
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener("focus", focus);
    };
  }, [mode, refresh]);

  async function send(action: unknown, message: string) {
    if (mode === "preview") {
      const result = applyMutation(snapshot.current, action, owner.name);
      acceptSnapshot(result.data, revision.current + 1);
      notify(message + " (preview)");
      return result;
    }
    const mutationId = crypto.randomUUID();
    // Reuse the command id if a transient network failure makes one retry necessary.
    let response: Response;
    const request = () =>
      fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutationId, action }),
        signal: AbortSignal.timeout(20000),
      });
    try {
      response = await request();
    } catch {
      response = await request();
    }
    const result = await response.json();
    if (response.status === 401) setAccess("signin");
    if (!response.ok)
      throw new Error(result.error || "The change could not be saved.");
    acceptSnapshot(result.data, result.revision);
    notify(message);
    return result as { data: Workspace; resultId?: string };
  }
  const createOrder = async (input: NewOrder) => {
    const result = await send(
      { type: "order.create", ...input },
      "Order saved.",
    );
    const order = result.data.orders.find(
      (entry) => entry.id === result.resultId,
    );
    if (!order) throw new Error("The new order could not be loaded.");
    return order;
  };
  const saveCustomer = async (customer: Customer) => {
    await send({ type: "customer.save", customer }, "Customer details saved.");
  };
  const advancePiece = async (orderId: string, pieceId: string) => {
    const piece = snapshot.current.orders
      .find((order) => order.id === orderId)
      ?.items.find((item) => item.id === pieceId);
    if (!piece) throw new Error("Garment not found.");
    await send(
      {
        type: "piece.advance",
        orderId,
        pieceId,
        expectedStation: piece.station,
      } satisfies WorkspaceMutation,
      "Garment progress saved.",
    );
  };
  const rework = async (
    orderId: string,
    pieceId: string,
    station: number,
    reason: string,
  ) => {
    await send(
      { type: "piece.rework", orderId, pieceId, station, reason },
      "Correction requested.",
    );
  };
  const recordPayment = async (
    orderId: string,
    amount: number,
    method: string,
  ) => {
    await send(
      { type: "payment.record", orderId, amount, method },
      "Payment saved.",
    );
  };
  const deliver = async (orderId: string) => {
    await send({ type: "order.deliver", orderId }, "Order marked delivered.");
  };
  const closeDay = async () => {
    await send({ type: "day.close", date: today }, "Daily report saved.");
  };
  const signOut = async () => {
    const response = await fetch("/api/auth", { method: "DELETE" });
    if (!response.ok) {
      notify("Could not sign out. Please try again.");
      return;
    }
    loaded.current = false;
    setAccess("signin");
  };

  if (mode === "live" && access !== "ready")
    return (
      <AccessScreen
        state={access}
        setupAvailable={setupAvailable}
        error={connectionError}
        onSuccess={refresh}
      />
    );
  return (
    <Context.Provider
      value={{
        data,
        today,
        notice,
        mode,
        owner,
        notify,
        createOrder,
        saveCustomer,
        advancePiece,
        rework,
        recordPayment,
        deliver,
        closeDay,
        signOut,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const context = useContext(Context);
  if (!context) throw new Error("WorkspaceProvider is required");
  return context;
}
