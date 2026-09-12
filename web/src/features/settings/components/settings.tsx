"use client";

import { useState } from "react";
import {
  Check,
  Scissors,
  Database,
  ShieldCheck,
  CircleAlert,
} from "lucide-react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { PageHeading } from "@/shared/components/ui";
import { QueryState, Pagination } from "@/shared/components/query-state";
import { useFeatureQuery } from "@/shared/hooks/use-feature-query";
import type { WorkspacePage } from "@/shared/contracts/query";
import { money, formatDate, emptyWorkspace } from "@/shared/workspace";

export function SettingsPage() {
  const { mode, owner, signOut } = useWorkspace();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const reports = useFeatureQuery<WorkspacePage>(
    `/api/reports?page=${page}&pageSize=${pageSize}`,
    (workspace) => {
      const matches = [...(workspace.dayReports ?? [])].sort((a, b) =>
        b.date.localeCompare(a.date),
      );
      return {
        revision: 0,
        page: {
          page,
          pageSize,
          total: matches.length,
          pageCount: Math.max(1, Math.ceil(matches.length / pageSize)),
        },
        data: {
          ...emptyWorkspace(),
          dayReports: matches.slice((page - 1) * pageSize, page * pageSize),
        },
      };
    },
  );
  return (
    <>
      <PageHeading
        eyebrow="SHOP SETTINGS"
        title="Settings"
        description="Check the database connection, view your account, and review saved daily reports."
      />
      <div className="settings-grid">
        <section className="panel settings-card">
          <Database size={26} strokeWidth={1.5} />
          <h2>Database connection</h2>
          <p>
            Your shop’s customers, measurements, orders, and payments are stored
            in Railway PostgreSQL.
          </p>
          <div className="connection-status">
            {mode === "live" ? <Check size={17} /> : <CircleAlert size={17} />}
            {mode === "live"
              ? "Connected · your shop data is saved"
              : "Preview · sample data"}
          </div>
          <p>
            {mode === "live"
              ? "Other devices refresh every 30 seconds and when you return to the website."
              : "Changes to sample data do not affect your shop records."}
          </p>
        </section>
        <section className="panel settings-card">
          <ShieldCheck size={26} strokeWidth={1.5} />
          <h2>Owner account</h2>
          <p>
            {mode === "live"
              ? `Signed in as ${owner.name} (${owner.email}).`
              : "You are viewing a sample account."}
          </p>
          <p style={{ marginTop: 16 }}>
            Customer messaging is not enabled. Order updates are recorded in
            Recent activity.
          </p>
          {mode === "live" && (
            <button className="button" onClick={() => void signOut()}>
              Sign out
            </button>
          )}
        </section>
        <section className="panel settings-card">
          <Scissors size={26} strokeWidth={1.5} />
          <h2>Saved daily reports</h2>
          <QueryState
            loading={reports.isLoading}
            error={reports.error}
            retry={reports.reload}
          />
          {reports.data?.data.dayReports?.length ? (
            reports.data.data.dayReports.map((report) => (
              <div className="summary-line" key={report.date}>
                <span>
                  {formatDate(report.date, true)}
                  <small style={{ display: "block" }}>
                    {report.delivered} delivered · reviewed by{" "}
                    {report.reviewedBy}
                  </small>
                </span>
                <strong>{money(report.collected)}</strong>
              </div>
            ))
          ) : reports.data && !reports.isLoading && !reports.error ? (
            <p>
              {reports.data.page.total
                ? "No reports on this page. Use the page controls below."
                : "To save a report, open Overview, choose Daily report, then Save daily report."}
            </p>
          ) : null}
          {reports.data && (
            <Pagination page={reports.data.page} onPageChange={setPage} />
          )}
        </section>
      </div>
    </>
  );
}
