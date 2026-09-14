"use client";

import { useCallback, useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";
import type { PageInfo } from "@/shared/contracts/query";

export function QueryState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (error)
    return (
      <div className="query-state" role="alert">
        <p>{error}</p>
        <button type="button" className="button" onClick={retry}>
          Try again
        </button>
      </div>
    );
  if (loading)
    return (
      <div className="query-state" role="status">
        <LoaderCircle size={20} />
        <span>Loading records…</span>
      </div>
    );
  return null;
}

export function ScrollPagination({
  page,
  onPageChange,
  disabled = false,
  loading = false,
  error = "",
  retry,
}: {
  page: PageInfo;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  retry?: () => void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const requested = useRef(false);
  const hasMore = page.page < page.pageCount;
  const loadMore = useCallback(() => {
    if (!hasMore || loading || disabled || error || requested.current) return;
    requested.current = true;
    onPageChange(page.page + 1);
  }, [hasMore, loading, disabled, error, onPageChange, page.page]);
  useEffect(() => {
    requested.current = false;
  }, [page.page, page.total, loading]);
  useEffect(() => {
    const target = sentinel.current;
    if (
      !target ||
      !hasMore ||
      loading ||
      disabled ||
      error ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "0px 0px 200px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, disabled, error, loadMore]);
  if (page.total === 0 && !error) return null;
  const end = Math.min(page.page * page.pageSize, page.total);
  return (
    <div
      ref={sentinel}
      className="query-pagination"
      aria-label="More records"
      aria-busy={loading}
    >
      <span role="status" aria-live="polite">
        {loading
          ? "Loading records…"
          : `${end} of ${page.total} loaded${hasMore ? "" : " · All records loaded"}`}
      </span>
      {error ? (
        <button
          type="button"
          className="button small-button"
          onClick={retry}
          disabled={disabled || loading}
        >
          Try again
        </button>
      ) : hasMore ? (
        <button
          type="button"
          className="button small-button"
          onClick={loadMore}
          disabled={disabled || loading}
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}
