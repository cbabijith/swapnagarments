"use client";

import { useState } from "react";
import { useFeatureQuery } from "@/shared/hooks/use-feature-query";
import { QueryState, Pagination } from "@/shared/components/query-state";
import type { WorkspacePage } from "@/shared/contracts/query";
import { emptyWorkspace } from "@/shared/workspace";
import { Avatar, EmptyState, PageHeading } from "@/shared/components/ui";

export function Team() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const query = useFeatureQuery<WorkspacePage>(
    `/api/team?page=${page}&pageSize=${pageSize}`,
    (workspace) => ({
      revision: 0,
      page: {
        page,
        pageSize,
        total: workspace.staff.length,
        pageCount: Math.max(1, Math.ceil(workspace.staff.length / pageSize)),
      },
      data: {
        ...emptyWorkspace(),
        staff: workspace.staff.slice((page - 1) * pageSize, page * pageSize),
      },
    }),
  );
  return (
    <>
      <PageHeading
        eyebrow="THE HANDS BEHIND EVERY STITCH"
        title="Your lovely little team."
        description="The people who turn a piece of fabric into something special."
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.reload}
      />
      <div className="team-grid">
        {query.data?.data.staff.map((person) => (
          <article className="panel team-card" key={person.id}>
            <Avatar name={person.name} tone={person.color} />
            <h2>{person.name}</h2>
            <p>{person.role}</p>
            <span className="team-station">{person.station}</span>
          </article>
        ))}
      </div>
      {query.data &&
        !query.data.data.staff.length &&
        !query.isLoading &&
        !query.error && (
          <EmptyState
            title="Your team starts here"
            text={
              query.data.page.total
                ? "No team members on this page. Use the page controls below."
                : "Your owner profile will appear after setup."
            }
          />
        )}
      {query.data && (
        <Pagination page={query.data.page} onPageChange={setPage} />
      )}
    </>
  );
}
