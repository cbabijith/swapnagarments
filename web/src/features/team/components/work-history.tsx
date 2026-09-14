"use client";
import "./team.css";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Clock3, Search } from "lucide-react";
import { STATIONS } from "@/shared/workspace";
import { useDebouncedValue } from "@/shared/hooks/use-feature-query";
import { EmptyState, PageHeading } from "@/shared/components/ui";
import { Pagination, QueryState } from "@/shared/components/query-state";
import { useWorkHistory } from "../hooks/use-work-history";
import type { WorkHistoryQuery } from "../contracts/work-history";

const completedDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export function WorkHistory() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [station, setStation] = useState<WorkHistoryQuery["station"]>("all");
  const query = useWorkHistory({
    page,
    pageSize: 20,
    q: useDebouncedValue(search),
    station,
  });
  const filtered = Boolean(search.trim()) || station !== "all";
  return (
    <>
      <PageHeading
        eyebrow="MY COMPLETED WORK"
        title="Work history"
        description="Your completed stages stay here as each garment moves on."
      >
        <Link className="button" href="/my-work">
          <ArrowLeft size={16} />
          My work
        </Link>
      </PageHeading>
      <div className="toolbar team-toolbar">
        <label className="search-input">
          <Search size={17} />
          <input
            aria-label="Search work history"
            placeholder="Search order, garment or stage"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <div className="toolbar-filters">
          <select
            aria-label="Filter completed station"
            value={station}
            onChange={(event) => {
              setStation(event.target.value as WorkHistoryQuery["station"]);
              setPage(1);
            }}
          >
            <option value="all">All stations</option>
            {STATIONS.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.reload}
      />
      {query.data && (
        <p className="small muted work-history-count" role="status">
          {query.data.page.total} completed{" "}
          {query.data.page.total === 1 ? "stage" : "stages"}
          {query.isRefreshing ? " · Refreshing…" : ""}
        </p>
      )}
      <div className="work-history-list">
        {query.data?.entries.map((entry) => (
          <article className="panel work-history-card" key={entry.id}>
            <div className="work-history-icon" aria-hidden="true">
              <Check size={20} />
            </div>
            <div className="work-history-piece">
              <p className="work-order">
                {entry.orderNumber} · Piece {entry.pieceId.slice(-6)}
              </p>
              <h2>{entry.garment}</h2>
              <p>
                {entry.stepName} <span className="muted">completed</span>
              </p>
            </div>
            <div className="work-history-date">
              <Clock3 size={15} aria-hidden="true" />
              <time dateTime={entry.completedAt}>
                {completedDate(entry.completedAt)}
              </time>
            </div>
          </article>
        ))}
      </div>
      {query.data && !query.data.entries.length && !query.error && (
        <EmptyState
          title={
            filtered ? "No matching completed work" : "No completed work yet"
          }
          text={
            filtered
              ? "Try another search or choose all stations."
              : "When a stage assigned to you is marked complete, it appears here."
          }
        >
          {filtered ? (
            <button
              className="button"
              onClick={() => {
                setSearch("");
                setStation("all");
                setPage(1);
              }}
            >
              Clear filters
            </button>
          ) : (
            <Link className="button" href="/my-work">
              Go to my work
            </Link>
          )}
        </EmptyState>
      )}
      {query.data && (
        <Pagination page={query.data.page} onPageChange={setPage} />
      )}
    </>
  );
}
