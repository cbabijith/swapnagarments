"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import type { Workspace } from "@/shared/workspace";
import {
  pageRequest,
  pageUrl,
  readInfinitePages,
  type PageAdapter,
} from "@/shared/queries/infinite-pages";

/** Bounded requests with accumulated results; feature adapters own record selection. */
export function useInfiniteFeatureQuery<T extends { revision: number }>(
  url: string | null,
  preview: (workspace: Workspace, page: number) => T,
  adapter: PageAdapter<T>,
  { keepPreviousData = false }: { keepPreviousData?: boolean } = {},
) {
  const {
    mode,
    data: workspace,
    queryVersion,
    onUnauthorized,
    owner,
  } = useWorkspace();
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((value) => value + 1), []);
  const { identity, requestedPage } = pageRequest(url ?? "");
  const scope = `${mode}:${owner.email}:${owner.staffId ?? ""}:${identity}`;
  const generation = `${scope}:${queryVersion}:${refresh}`;
  const key = `${generation}:${requestedPage}`;
  const enabled = Boolean(url);
  const { page: getPage, merge } = adapter;
  type Result = {
    scope: string;
    generation: string;
    key: string;
    pages: T[];
    error: string;
  };
  const [result, setResult] = useState<Result | null>(null);
  const cache = useRef<Result | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (mode === "preview" || !enabled) return;
    let active = true;
    inFlight.current = true;
    const controller = new AbortController();
    const previous = cache.current;
    async function load() {
      try {
        const pages = await readInfinitePages({
          requestedPage,
          cached: previous?.generation === generation ? previous.pages : [],
          page: getPage,
          read: async (number) => {
            const response = await fetch(pageUrl(identity, number), {
              cache: "no-store",
              signal: AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(15000),
              ]),
            });
            const body = await response.json();
            if (!active) throw new Error("Request cancelled.");
            if (response.status === 401) onUnauthorized();
            if (!response.ok)
              throw new Error(body.error || "Could not load these records.");
            return body as T;
          },
        });
        if (!active) return;
        const next = { scope, generation, key, pages, error: "" };
        cache.current = next;
        setResult(next);
      } catch (error) {
        if (!active) return;
        // Retain visible records, but never label an incomplete refresh as current cached data.
        setResult({
          scope,
          generation,
          key,
          pages: previous?.scope === scope ? previous.pages : [],
          error:
            error instanceof Error && error.name === "TimeoutError"
              ? "The request timed out. Please try again."
              : error instanceof Error
                ? error.message
                : "Could not load these records.",
        });
      } finally {
        if (active) inFlight.current = false;
      }
    }
    void load();
    return () => {
      active = false;
      inFlight.current = false;
      controller.abort();
    };
  }, [
    mode,
    enabled,
    identity,
    requestedPage,
    scope,
    generation,
    key,
    getPage,
    onUnauthorized,
  ]);

  useEffect(() => {
    if (mode === "preview" || !enabled) return;
    const visibleRefresh = () => {
      if (document.visibilityState === "visible" && !inFlight.current) reload();
    };
    const timer = window.setInterval(visibleRefresh, 30000);
    window.addEventListener("focus", visibleRefresh);
    document.addEventListener("visibilitychange", visibleRefresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", visibleRefresh);
      document.removeEventListener("visibilitychange", visibleRefresh);
    };
  }, [mode, enabled, reload]);

  const current = result?.key === key;
  const liveData = useMemo(
    () => (result?.pages.length ? merge(result.pages) : null),
    [result, merge],
  );
  let data: T | null = null;
  if (enabled && mode === "preview") {
    const pages = [preview(workspace, 1)];
    for (
      let number = 2;
      number <= Math.min(requestedPage, getPage(pages[0]).pageCount);
      number++
    ) {
      pages.push(preview(workspace, number));
    }
    data = merge(pages);
  } else if (
    enabled &&
    result?.pages.length &&
    (result.scope === scope || (keepPreviousData && !current))
  ) {
    data = liveData;
  }
  const pending = enabled && mode !== "preview" && !current;
  return {
    data,
    isLoading: pending && !data,
    isRefreshing: pending && Boolean(data),
    isPreviousData:
      Boolean(data) && mode !== "preview" && result?.scope !== scope,
    error: current ? (result?.error ?? "") : "",
    reload,
  };
}
