"use client";
import { useListPage } from "@/shared/hooks/use-list-page";

import "./team.css";
import Link from "next/link";
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ChevronRight,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { STATIONS } from "@/shared/workspace";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { useDebouncedValue } from "@/shared/hooks/use-feature-query";
import { EmptyState, PageHeading } from "@/shared/components/ui";
import { ScrollPagination, QueryState } from "@/shared/components/query-state";
import { useWorkHistory } from "../hooks/use-work-history";
import type { WorkHistoryQuery } from "../contracts/work-history";
import {
  historyFilters,
  historyFilterQuery,
  completedWorkDate,
} from "../domain/history-navigation";
import {
  completedWorkTime,
  groupCompletedWork,
} from "../domain/history-groups";
import styles from "./work-history.module.css";

export function WorkHistory() {
  const filters = historyFilters(useSearchParams());
  const { today } = useWorkspace();
  const searchInput = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState(filters.q);
  const [station, setStation] = useState<WorkHistoryQuery["station"]>(
    filters.station,
  );
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useListPage(
    JSON.stringify([debouncedSearch, station]),
    filters.page,
  );
  const query = useWorkHistory({
    page,
    pageSize: 20,
    q: debouncedSearch,
    station,
  });
  const filtered = Boolean(search.trim()) || station !== "all";
  const updating = query.isRefreshing || search !== debouncedSearch;
  const groups = groupCompletedWork(query.data?.entries ?? [], today);
  const changeFilters = (changes: Partial<WorkHistoryQuery>) => {
    const next = { page, pageSize: 20, q: search, station, ...changes };
    setSearch(next.q);
    setStation(next.station);
    setPage(next.page);
    window.history.replaceState(null, "", `?${historyFilterQuery(next)}`);
  };
  const clearFilters = () => {
    changeFilters({ q: "", station: "all", page: 1 });
    searchInput.current?.focus();
  };

  return (
    <div className={styles.history}>
      <PageHeading
        eyebrow="MY COMPLETED WORK"
        title="Work history"
        description="Find a finished stage and view its details."
      />
      <div
        className={styles.controls}
        role="search"
        aria-label="Completed work"
      >
        <div className={styles.search}>
          <Search size={19} aria-hidden="true" />
          <input
            ref={searchInput}
            aria-label="Search work history"
            placeholder="Customer, phone, order…"
            autoComplete="off"
            spellCheck={false}
            value={search}
            onChange={(event) => {
              changeFilters({ q: event.target.value, page: 1 });
            }}
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              className={styles.clearSearch}
              onClick={() => {
                changeFilters({ q: "", page: 1 });
                searchInput.current?.focus();
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className={styles.filterRow}>
          <select
            aria-label="Filter completed station"
            value={station}
            onChange={(event) => {
              changeFilters({
                station: event.target.value as WorkHistoryQuery["station"],
                page: 1,
              });
            }}
          >
            <option value="all">All stations</option>
            {STATIONS.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.refresh}
            aria-label="Refresh work history"
            title="Refresh work history"
            disabled={query.isLoading || query.isRefreshing}
            onClick={query.reload}
          >
            <RefreshCw
              size={18}
              className={query.isRefreshing ? styles.spinning : undefined}
            />
          </button>
        </div>
      </div>
      <div
        ref={results}
        className={styles.results}
        tabIndex={-1}
        aria-label="Completed work results"
      >
        <div className={styles.resultBar}>
          <p role="status">
            {query.data ? (
              <>
                {query.data.page.total} completed{" "}
                {query.data.page.total === 1 ? "stage" : "stages"}
                {updating ? " · Updating…" : ""}
              </>
            ) : (
              "Completed stages"
            )}
          </p>
          {filtered ? (
            <button type="button" onClick={clearFilters}>
              Clear filters
            </button>
          ) : (
            <span>Newest first</span>
          )}
        </div>
        <QueryState
          loading={query.isLoading}
          error={query.error}
          retry={query.reload}
        />
        {query.isLoading && !query.error && (
          <div className={styles.skeleton} aria-hidden="true">
            {[0, 1, 2].map((row) => (
              <div key={row}>
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        )}
        <div className={styles.groups}>
          {groups.map((group) => (
            <section key={group.date} aria-labelledby={`history-${group.date}`}>
              <div className={styles.groupHeading}>
                <h2 id={`history-${group.date}`}>{group.label}</h2>
                {group.label !== group.dateLabel && (
                  <time dateTime={group.date}>{group.dateLabel}</time>
                )}
              </div>
              <ul className={styles.entries}>
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      className={styles.entry}
                      data-history-entry
                      href={`/my-work/history/${entry.id}?${historyFilterQuery({ page, pageSize: 20, q: search, station })}`}
                    >
                      <div className={styles.entryCopy}>
                        <p className={styles.order}>
                          {entry.orderNumber}
                          <span>Piece {entry.pieceId.slice(-6)}</span>
                        </p>
                        <h3>{entry.garment}</h3>
                        <div className={styles.customer}>
                          <UserRound size={14} aria-hidden="true" />
                          {entry.customer ? (
                            <p>
                              <span className={styles.customerName}>
                                {entry.customer.name}
                              </span>
                              {entry.customer.phone && (
                                <span>{entry.customer.phone}</span>
                              )}
                            </p>
                          ) : (
                            <p>Customer details unavailable</p>
                          )}
                        </div>
                        <div className={styles.entryMeta}>
                          <span className={styles.stage}>
                            <Check size={14} aria-hidden="true" />
                            <span>
                              {entry.stepName}
                              <span className={styles.srOnly}> completed</span>
                            </span>
                          </span>
                          <time
                            dateTime={entry.completedAt}
                            title={completedWorkDate(entry.completedAt)}
                            aria-label={completedWorkDate(entry.completedAt)}
                          >
                            {completedWorkTime(entry.completedAt)}
                          </time>
                        </div>
                      </div>
                      <ChevronRight
                        size={19}
                        className={styles.open}
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        {query.data && !query.data.entries.length && !query.error && (
          <EmptyState
            title={
              filtered ? "No matching completed work" : "No completed work yet"
            }
            text={
              filtered
                ? "Try a customer, phone number, order, garment or stage, or clear your filters."
                : "Your finished stages will appear here, ready to look back on."
            }
          >
            {filtered ? (
              <button className="button" onClick={clearFilters}>
                Show all completed work
              </button>
            ) : (
              <Link className="button" href="/my-work">
                Go to my work
              </Link>
            )}
          </EmptyState>
        )}
        {query.data && (
          <ScrollPagination
            page={query.data.page}
            loading={query.isRefreshing}
            error={query.error}
            retry={query.reload}
            onPageChange={(nextPage) => {
              changeFilters({ page: nextPage });
            }}
          />
        )}
      </div>
    </div>
  );
}
