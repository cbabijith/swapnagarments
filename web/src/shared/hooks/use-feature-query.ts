"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import type { Workspace } from "@/shared/workspace";

export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Transport only: feature hooks own their query and preview selection rules. */
export function useFeatureQuery<T>(
  url: string | null,
  preview: (workspace: Workspace) => T,
): {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string;
  reload: () => void;
} {
  const {
    mode,
    data: workspace,
    queryVersion,
    onUnauthorized,
  } = useWorkspace();
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{
    url: string;
    key: string;
    data: T | null;
    error: string;
  } | null>(null);
  const key = `${url ?? ""}:${queryVersion}:${refresh}`;
  const reload = useCallback(() => setRefresh((version) => version + 1), []);

  useEffect(() => {
    if (mode === "preview" || !url) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    async function read() {
      try {
        const response = await fetch(url!, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json();
        if (!active) return;
        if (response.status === 401) onUnauthorized();
        if (!response.ok)
          throw new Error(body.error || "Could not load these records.");
        setResult({ url: url!, key, data: body as T, error: "" });
      } catch (error) {
        if (!active) return;
        setResult((previous) => ({
          url: url!,
          key,
          data: previous?.url === url ? previous.data : null,
          error: controller.signal.aborted
            ? "The request timed out. Please try again."
            : error instanceof Error
              ? error.message
              : "Could not load these records.",
        }));
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void read();
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [mode, url, key, onUnauthorized]);

  useEffect(() => {
    if (mode === "preview" || !url) return;
    const visibleRefresh = () => {
      if (document.visibilityState === "visible") reload();
    };
    const timer = window.setInterval(visibleRefresh, 30000);
    window.addEventListener("focus", visibleRefresh);
    document.addEventListener("visibilitychange", visibleRefresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", visibleRefresh);
      document.removeEventListener("visibilitychange", visibleRefresh);
    };
  }, [mode, url, reload]);

  if (!url)
    return {
      data: null,
      isLoading: false,
      isRefreshing: false,
      error: "",
      reload,
    };
  if (mode === "preview")
    return {
      data: preview(workspace),
      isLoading: false,
      isRefreshing: false,
      error: "",
      reload,
    };
  const current = result?.key === key ? result : null;
  const data = result?.url === url ? result.data : null;
  return {
    data,
    isLoading: !data && !current,
    isRefreshing: Boolean(data) && !current,
    error: current?.error ?? "",
    reload,
  };
}
