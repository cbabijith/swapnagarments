"use client";
import { useId, useState } from "react";
import {
  Check,
  Scissors,
  Database,
  ShieldCheck,
  CircleAlert,
  Shirt,
  SlidersHorizontal,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { CatalogueSettings } from "./catalogue-editor";
import { SettingsTabs } from "./settings-tabs";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { PageHeading } from "@/shared/components/ui";
import { QueryState, Pagination } from "@/shared/components/query-state";
import { useFeatureQuery } from "@/shared/hooks/use-feature-query";
import type { WorkspacePage } from "@/shared/contracts/query";
import { money, formatDate, emptyWorkspace } from "@/shared/workspace";
import styles from "./catalogue.module.css";

type Section = "garments" | "defaults" | "account" | "reports";
export function SettingsPage() {
  const [section, setSection] = useState<Section>("garments");
  const id = useId();
  return (
    <>
      <PageHeading
        eyebrow="YOUR SHOP, YOUR WAY"
        title="Settings"
        description="Set up your garments and the details you use every day."
      >
        <Link className="button" href="/settings/designs">
          Image library · 150 styles
        </Link>
      </PageHeading>
      <SettingsTabs
        id={id}
        label="Settings sections"
        value={section}
        onChange={setSection}
        items={[
          { value: "garments", label: "Garments", icon: <Shirt size={17} /> },
          {
            value: "defaults",
            label: "Order defaults",
            icon: <SlidersHorizontal size={17} />,
          },
          {
            value: "account",
            label: "Account",
            icon: <ShieldCheck size={17} />,
          },
          {
            value: "reports",
            label: "Daily reports",
            icon: <FileText size={17} />,
          },
        ]}
      />
      {(section === "garments" || section === "defaults") && (
        <div
          id={`${id}-panel-${section}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${section}`}
        >
          <CatalogueSettings section={section} />
        </div>
      )}
      {section === "account" && (
        <div
          id={`${id}-panel-account`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-account`}
        >
          <AccountSettings />
        </div>
      )}
      {section === "reports" && (
        <div
          id={`${id}-panel-reports`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-reports`}
        >
          <DailyReports />
        </div>
      )}
    </>
  );
}

function AccountSettings() {
  const { mode, owner, signOut } = useWorkspace();
  return (
    <div className={styles.accountGrid}>
      <section className="panel settings-card">
        <ShieldCheck size={24} strokeWidth={1.5} />
        <h2>Owner account</h2>
        <p>
          {mode === "live"
            ? `Signed in as ${owner.name}.`
            : "You are viewing a sample account."}
        </p>
        {mode === "live" && (
          <>
            <p>{owner.email}</p>
            <button className="button" onClick={() => void signOut()}>
              Sign out
            </button>
          </>
        )}
      </section>
      <section className="panel settings-card">
        <Database size={24} strokeWidth={1.5} />
        <h2>Shop data</h2>
        <p>
          Customers, measurements, orders and payments stay together in your
          shop.
        </p>
        <div className="connection-status">
          {mode === "live" ? <Check size={17} /> : <CircleAlert size={17} />}
          {mode === "live" ? "Live workspace" : "Preview · sample data"}
        </div>
        <p>
          {mode === "live"
            ? "Other devices refresh every 30 seconds and when you return to the app."
            : "Sample changes do not affect your real shop records."}
        </p>
      </section>
    </div>
  );
}

function DailyReports() {
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
    <section className={`panel ${styles.reports}`}>
      <div className={styles.sectionHead}>
        <div>
          <h2>Daily reports</h2>
          <p>Review the days you have closed.</p>
        </div>
        <Link className="button" href="/">
          Open overview
        </Link>
      </div>
      <QueryState
        loading={reports.isLoading}
        error={reports.error}
        retry={reports.reload}
      />
      {reports.data?.data.dayReports?.length
        ? reports.data.data.dayReports.map((report) => (
            <div className="summary-line" key={report.date}>
              <span>
                {formatDate(report.date, true)}
                <small style={{ display: "block" }}>
                  {report.delivered} delivered · reviewed by {report.reviewedBy}
                </small>
              </span>
              <strong>{money(report.collected)}</strong>
            </div>
          ))
        : reports.data &&
          !reports.error && (
            <div className={styles.empty}>
              <Scissors size={28} />
              <h3>
                {reports.data.page.total
                  ? "No reports on this page"
                  : "No saved reports yet"}
              </h3>
              <p>
                {reports.data.page.total
                  ? "Use the page controls to return to your reports."
                  : "Open Overview, choose Daily report, then save your day’s summary."}
              </p>
            </div>
          )}
      {reports.data && (
        <Pagination page={reports.data.page} onPageChange={setPage} />
      )}
    </section>
  );
}
