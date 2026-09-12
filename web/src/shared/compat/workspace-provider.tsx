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
import { type Workspace, shopDate } from "@/shared/workspace";
import { applyMutation } from "@/shared/compat/workspace-mutations";
import { mutationSchema } from "@/shared/contracts/command";
import { commandEndpoint } from "@/shared/contracts/command-endpoint";
import { AccessScreen } from "@/features/auth/components/access-screen";

type Owner = { name: string; email: string };
type WorkspaceContext = {
  data: Workspace;
  today: string;
  notice: string;
  mode: "preview" | "live";
  owner: Owner;
  notify: (message: string) => void;
  send: (
    action: unknown,
    message: string,
  ) => Promise<{ data: Workspace; resultId?: string }>;
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
    const command = mutationSchema.parse(action);
    const mutationId = crypto.randomUUID();
    // Reuse the command id if a transient network failure makes one retry necessary.
    let response: Response;
    const request = () =>
      fetch(commandEndpoint(command), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutationId, action: command }),
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
        send,
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
