"use client";

import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
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

export function Pagination({
  page,
  onPageChange,
}: {
  page: PageInfo;
  onPageChange: (page: number) => void;
}) {
  if (page.total === 0 && page.page <= 1) return null;
  const start = (page.page - 1) * page.pageSize + 1;
  const end = Math.min(page.page * page.pageSize, page.total);
  return (
    <nav className="query-pagination" aria-label="Record pages">
      <span>
        {start > page.total
          ? `0 of ${page.total}`
          : `${start}–${end} of ${page.total}`}
      </span>
      <div>
        <button
          type="button"
          className="button small-button"
          disabled={page.page <= 1}
          onClick={() => onPageChange(page.page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <button
          type="button"
          className="button small-button"
          disabled={page.page >= page.pageCount}
          onClick={() => onPageChange(page.page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
