"use client";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  ScanLine,
  Settings2,
  Users,
  ArrowRight,
  Search,
} from "lucide-react";
import { useDebouncedValue } from "@/shared/hooks/use-feature-query";
import { QueryState, Pagination } from "@/shared/components/query-state";
import { Avatar, EmptyState, PageHeading } from "@/shared/components/ui";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { STATIONS, type Employee } from "@/shared/workspace";
import { useTeam } from "../hooks/use-team";
import { MemberDialog } from "./member-dialog";
import { AssignmentSettingsDialog } from "./assignment-settings";
import { WorkQueue } from "./work-queue";

export function Team() {
  const params = useSearchParams();
  const { send } = useWorkspace();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(
    params.get("view") === "work" ? "work" : "members",
  );
  const [member, setMember] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [edit, setEdit] = useState<Employee | "new" | null>(null);
  const [rules, setRules] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useTeam(page, useDebouncedValue(search));
  const settings = query.data?.settings;
  async function toggleAutomatic() {
    if (!settings) return;
    setBusy(true);
    setError("");
    try {
      await send(
        {
          type: "team.settings",
          settings: { ...settings, automatic: !settings.automatic },
        },
        settings.automatic
          ? "Manual assignment enabled"
          : "Automatic assignment enabled",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not update assignment mode.",
      );
      query.reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="PEOPLE & PRODUCTION"
        title="Team"
        description="The right work, with the right person. Keep every piece moving."
      >
        <Link className="button" href="/scan">
          <ScanLine size={17} />
          Scan a piece
        </Link>
        <button className="button primary" onClick={() => setEdit("new")}>
          <Plus size={17} />
          Add member
        </button>
      </PageHeading>
      {settings && (
        <section
          className="panel assignment-banner"
          aria-label="Assignment controls"
        >
          <div className="assignment-icon">
            <Users size={23} />
          </div>
          <div className="assignment-copy">
            <h2>
              {settings.automatic
                ? "Automatic assignment is on"
                : "You’re in control of assignments"}
            </h2>
            <p>
              {settings.automatic
                ? "New work goes to available workers with matching skills."
                : "Assign pieces yourself, or distribute the waiting queue in one click."}{" "}
              <span>
                {settings.balanceBy === "effort"
                  ? "Balanced by estimated effort."
                  : "Balanced by piece count."}
              </span>
            </p>
          </div>
          <label className="assignment-toggle">
            <input
              type="checkbox"
              role="switch"
              aria-label="Automatic assignment"
              checked={settings.automatic}
              onChange={() => void toggleAutomatic()}
              disabled={busy || query.isRefreshing}
            />
            <span aria-hidden="true" />
            Auto-assign
          </label>
          <button
            className="button"
            onClick={() => setRules(true)}
            disabled={busy}
          >
            <Settings2 size={16} />
            Rules
          </button>
        </section>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="team-tabs" role="tablist" aria-label="Team views">
        <button
          role="tab"
          aria-selected={tab === "members"}
          onClick={() => setTab("members")}
        >
          Team members
        </button>
        <button
          role="tab"
          aria-selected={tab === "work"}
          onClick={() => setTab("work")}
        >
          Work assignments
        </button>
      </div>
      {tab === "members" ? (
        <>
          <div className="toolbar team-toolbar">
            <label className="search-input">
              <Search size={17} />
              <input
                aria-label="Search team members"
                placeholder="Search team members"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <span className="small muted">
              {query.data?.page.total ?? "…"} team members
            </span>
          </div>
          <QueryState
            loading={query.isLoading}
            error={query.error}
            retry={query.reload}
          />
          <div className="team-grid">
            {query.data?.data.staff.map((person) => {
              const load = query.data!.loads[person.id] ?? {
                pieces: 0,
                minutes: 0,
                inProgress: 0,
                blocked: 0,
              };
              const worker = person.worker;
              return (
                <article className="panel member-card" key={person.id}>
                  <div className="member-card-head">
                    <Avatar name={person.name} tone={person.color} />
                    <span
                      className={`member-status ${worker && !worker.active ? "inactive" : ""}`}
                    >
                      {worker
                        ? !worker.active
                          ? "Inactive"
                          : worker.available
                            ? "Available"
                            : "Unavailable"
                        : person.role}
                    </span>
                  </div>
                  <h2>{person.name}</h2>
                  <p className="muted member-email">
                    {worker?.email ?? person.role}
                  </p>
                  <div className="skill-tags">
                    {worker ? (
                      worker.skills.map((s) => (
                        <span key={s}>{STATIONS[s]}</span>
                      ))
                    ) : (
                      <span>{person.station}</span>
                    )}
                  </div>
                  {worker && (
                    <>
                      <div className="member-load">
                        <div>
                          <strong>{load.pieces}</strong>
                          <span>unfinished</span>
                        </div>
                        <div>
                          <strong>{load.inProgress}</strong>
                          <span>in progress</span>
                        </div>
                        <div>
                          <strong
                            className={load.blocked ? "overdue-text" : ""}
                          >
                            {load.blocked}
                          </strong>
                          <span>blocked</span>
                        </div>
                      </div>
                      <div className="capacity-caption">
                        <span>
                          {load.minutes} / {worker.capacityMinutes} min assigned
                        </span>
                        <span>
                          {Math.round(
                            (load.minutes / worker.capacityMinutes) * 100,
                          )}
                          %
                        </span>
                      </div>
                      <progress
                        className="capacity-bar"
                        value={load.minutes}
                        max={worker.capacityMinutes}
                        aria-label={`${person.name} queue capacity`}
                      />
                    </>
                  )}
                  <div className="member-actions">
                    {!/owner/i.test(person.role) && (
                      <button
                        className="button"
                        onClick={() => setEdit(person)}
                      >
                        {worker ? "Edit member" : "Set up account"}
                      </button>
                    )}
                    {worker && (
                      <button
                        className="text-link"
                        onClick={() => {
                          setMember({ id: person.id, name: person.name });
                          setTab("work");
                        }}
                      >
                        View work
                        <ArrowRight size={15} />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {query.data && !query.data.data.staff.length && !query.error && (
            <EmptyState
              title="No team members found"
              text="Add a worker and choose one or more work skills to get started."
            />
          )}
          {query.data && (
            <Pagination page={query.data.page} onPageChange={setPage} />
          )}
        </>
      ) : (
        <WorkQueue
          member={member}
          onClearMember={() => setMember(null)}
          embedded
        />
      )}
      {edit && (
        <MemberDialog
          person={edit === "new" ? undefined : edit}
          onClose={() => setEdit(null)}
        />
      )}
      {rules && settings && (
        <AssignmentSettingsDialog
          settings={settings}
          onClose={() => setRules(false)}
        />
      )}
    </>
  );
}
