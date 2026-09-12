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
  queryVersion: number;
  onUnauthorized: () => void;
  notify: (message: string) => void;
  send: (
    action: unknown,
    message: string,
  ) => Promise<{ data?: Workspace; resultId?: string; revision?: number }>;
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
  const [queryVersion, setQueryVersion] = useState(0);
  const snapshot = useRef(initialData);
  const revision = useRef(-1);
  const sessionRequest = useRef<AbortController | null>(null);
  const notify = useCallback((message: string) => setNotice(message), []);
  const onUnauthorized = useCallback(() => {
    sessionRequest.current?.abort();
    sessionRequest.current = null;
    setAccess("signin");
  }, []);
  const [today, setToday] = useState(() => shopDate());

  useEffect(() => {
    const updateDate = () => setToday(shopDate());
    const timer = window.setInterval(updateDate, 30000);
    window.addEventListener("focus", updateDate);
    document.addEventListener("visibilitychange", updateDate);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateDate);
      document.removeEventListener("visibilitychange", updateDate);
    };
  }, []);

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
    sessionRequest.current?.abort();
    const controller = new AbortController();
    sessionRequest.current = controller;
    try {
      const response = await fetch("/api/session", {
        cache: "no-store",
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(15000),
        ]),
      });
      const result = await response.json();
      if (controller.signal.aborted || sessionRequest.current !== controller)
        return;
      if (response.status === 401) {
        setAccess(result.setupRequired ? "setup" : "signin");
        setSetupAvailable(Boolean(result.setupAvailable));
        return;
      }
      if (!response.ok)
        throw new Error(
          result.error || "The workspace connection is unavailable.",
        );
      setOwner(result.owner);
      setAccess("ready");
    } catch (error) {
      if (controller.signal.aborted || sessionRequest.current !== controller)
        return;
      const message =
        error instanceof Error
          ? error.message
          : "Could not reach your workspace.";
      setConnectionError(message);
      setAccess("error");
    } finally {
      if (sessionRequest.current === controller) sessionRequest.current = null;
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "preview") return;
    const initial = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(initial);
      sessionRequest.current?.abort();
      sessionRequest.current = null;
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
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ mutationId, action: command }),
        signal: AbortSignal.timeout(20000),
      });
    try {
      response = await request();
    } catch {
      response = await request();
    }
    const result = await response.json();
    if (response.status === 401) onUnauthorized();
    if (!response.ok)
      throw new Error(result.error || "The change could not be saved.");
    revision.current = Math.max(revision.current, result.revision);
    setQueryVersion((version) => version + 1);
    notify(message);
    return result as { resultId?: string; revision: number };
  }
  const signOut = async () => {
    sessionRequest.current?.abort();
    sessionRequest.current = null;
    const response = await fetch("/api/auth", { method: "DELETE" });
    if (!response.ok) {
      notify("Could not sign out. Please try again.");
      return;
    }
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
        queryVersion,
        onUnauthorized,
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
