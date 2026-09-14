"use client";
import "./team.css";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock3,
  History,
  Info,
  ListTodo,
  LoaderCircle,
  LogOut,
} from "lucide-react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { useFeatureQuery } from "@/shared/hooks/use-feature-query";
import { EmptyState, PageHeading, PriorityBadge } from "@/shared/components/ui";
import { QueryState } from "@/shared/components/query-state";
import { STATIONS, formatDate } from "@/shared/workspace";
import { currentStepName } from "@/features/workflow/domain/templates";
import { previewWork } from "../domain/queries";
import { useWorkerProfile } from "../hooks/use-worker-profile";
import { useWorkHistory } from "../hooks/use-work-history";
import { completedWorkDate } from "../domain/history-navigation";
import type { WorkRead } from "../types/queries";
import { WorkerIdentity } from "./worker-profile-card";
import styles from "./worker-profile.module.css";

export function WorkerProfilePage() {
  const { owner } = useWorkspace();
  return owner.role === "worker" ? (
    <WorkerProfile />
  ) : (
    <EmptyState
      title="Worker profile"
      text="Sign in with a worker account to see your profile and personal work overview."
    >
      <Link className="button" href="/team">
        Go to team
      </Link>
    </EmptyState>
  );
}

function WorkerProfile() {
  const { owner, signOut } = useWorkspace();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const query = useWorkerProfile();
  const work = useFeatureQuery<WorkRead>(
    "/api/work?page=1&pageSize=3",
    (data) =>
      previewWork(
        data,
        { page: 1, pageSize: 3, station: "all", status: "all" },
        owner.staffId,
      ),
  );
  const history = useWorkHistory({
    page: 1,
    pageSize: 3,
    q: "",
    station: "all",
  });
  const profile = query.data?.profile;
  const hours = profile ? Math.floor(profile.capacityMinutes / 60) : 0;
  const minutes = profile ? profile.capacityMinutes % 60 : 0;
  const capacity =
    [
      hours ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "",
      minutes ? `${minutes} min` : "",
    ]
      .filter(Boolean)
      .join(" ") || "0 min";
  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      await signOut();
    } catch {
      setSignOutError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }
  return (
    <div className={styles.profile}>
      <PageHeading
        eyebrow="YOUR SPACE"
        title="My profile"
        description="Your details, skills and work overview."
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.reload}
      />
      {query.isLoading && !query.error && (
        <div className={styles.skeleton} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
      {query.data && !profile && !query.error && (
        <EmptyState
          title="Profile unavailable"
          text="Your profile could not be found. Ask your shop owner to check your worker account."
        >
          <button className="button" onClick={query.reload}>
            Try again
          </button>
        </EmptyState>
      )}
      {profile && (
        <>
          <WorkerIdentity profile={profile} />
          <nav className={styles.quickLinks} aria-label="Work overview">
            <Link className={styles.quickLink} href="/my-work">
              <span className={styles.metricLabel}>
                <ListTodo size={18} aria-hidden="true" /> Assigned now
              </span>
              <strong>{work.data ? work.data.summary.total : "—"}</strong>
              <span className={styles.metricAction}>
                {work.error ? "View work queue" : "Open my work"}
                <ChevronRight size={16} aria-hidden="true" />
              </span>
            </Link>
            <Link
              className={`${styles.quickLink} ${styles.completedLink}`}
              href="/my-work/history"
            >
              <span className={styles.metricLabel}>
                <CheckCheck size={18} aria-hidden="true" /> Completed stages
              </span>
              <strong>{history.data ? history.data.page.total : "—"}</strong>
              <span className={styles.metricAction}>
                Open history
                <ChevronRight size={16} aria-hidden="true" />
              </span>
            </Link>
          </nav>
          <QueryState loading={false} error={work.error} retry={work.reload} />
          <QueryState
            loading={false}
            error={history.error}
            retry={history.reload}
          />
          <div className={styles.layout}>
            <section
              className={styles.details}
              aria-labelledby="profile-details"
            >
              <h2 id="profile-details">Profile details</h2>
              <dl>
                <div>
                  <dt>Work skills</dt>
                  <dd>
                    {profile.skills.length ? (
                      <ul className={styles.skills}>
                        {profile.skills.map((skill) => (
                          <li key={skill}>{STATIONS[skill]}</li>
                        ))}
                      </ul>
                    ) : (
                      "No skills added yet"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>
                    <Clock3 size={15} aria-hidden="true" />
                    Queue capacity
                  </dt>
                  <dd className={styles.capacity}>{capacity}</dd>
                  <dd className={styles.capacityHelp}>
                    Estimated work that can be assigned at once.
                  </dd>
                </div>
              </dl>
              <div className={styles.help}>
                <Info size={17} aria-hidden="true" />
                <p>
                  Your shop owner manages your details, password and
                  availability. Ask them for any changes.
                </p>
              </div>
            </section>
            <div className={styles.overview}>
              <details className={styles.preview} data-profile-current>
                <summary>
                  <ListTodo size={20} aria-hidden="true" />
                  <div>
                    <h2>My current work</h2>
                    <p>Assignments and progress</p>
                  </div>
                  <ChevronDown
                    size={19}
                    className={styles.expand}
                    aria-hidden="true"
                  />
                </summary>
                <div className={styles.previewBody}>
                  <QueryState
                    loading={work.isLoading}
                    error=""
                    retry={work.reload}
                  />
                  {work.data && (
                    <>
                      <dl className={styles.stats}>
                        <div>
                          <dt>To do</dt>
                          <dd>{work.data.summary.pending}</dd>
                        </div>
                        <div>
                          <dt>Active</dt>
                          <dd>{work.data.summary.inProgress}</dd>
                        </div>
                        <div>
                          <dt>Blocked</dt>
                          <dd>{work.data.summary.blocked}</dd>
                        </div>
                      </dl>
                      {work.data.summary.overdue > 0 && (
                        <p className={styles.overdue}>
                          {work.data.summary.overdue} assigned{" "}
                          {work.data.summary.overdue === 1
                            ? "piece is"
                            : "pieces are"}{" "}
                          overdue.
                        </p>
                      )}
                      {work.data.pieces.map(({ order, item }) => (
                        <Link
                          className={styles.workRow}
                          data-profile-work-entry
                          key={item.id}
                          href={`/my-work?code=${encodeURIComponent(`swapna:${order.id}:${item.id}`)}`}
                        >
                          <div className={styles.rowCopy}>
                            <p className={styles.order}>
                              {order.number} · Piece {item.id.slice(-6)}
                            </p>
                            <h3>{item.garment}</h3>
                            <p>
                              {currentStepName(item)} · Due{" "}
                              {formatDate(order.dueDate)}
                            </p>
                            <div className={styles.rowBadges}>
                              <PriorityBadge priority={order.priority} />
                              <span
                                className={`work-state ${item.work?.status ?? "pending"}`}
                              >
                                {item.work?.status === "in_progress"
                                  ? "In progress"
                                  : item.work?.status === "blocked"
                                    ? "Blocked"
                                    : "Pending"}
                              </span>
                            </div>
                          </div>
                          <ChevronRight
                            size={18}
                            className={styles.rowArrow}
                            aria-hidden="true"
                          />
                        </Link>
                      ))}
                      {!work.data.pieces.length && !work.error && (
                        <p className={styles.empty}>
                          Your queue is clear. New assignments will appear here.
                        </p>
                      )}
                    </>
                  )}
                  <Link className={styles.viewAll} href="/my-work">
                    View all work <ArrowUpRight size={16} />
                  </Link>
                </div>
              </details>
              <details className={styles.preview} data-profile-history>
                <summary>
                  <History size={20} aria-hidden="true" />
                  <div>
                    <h2>My completed work</h2>
                    <p>Your latest finished stages</p>
                  </div>
                  <ChevronDown
                    size={19}
                    className={styles.expand}
                    aria-hidden="true"
                  />
                </summary>
                <div className={styles.previewBody}>
                  <QueryState
                    loading={history.isLoading}
                    error=""
                    retry={history.reload}
                  />
                  {history.data && (
                    <>
                      {history.data.entries.map((entry) => (
                        <Link
                          className={styles.workRow}
                          data-profile-history-entry
                          key={entry.id}
                          href={`/my-work/history/${entry.id}`}
                        >
                          <div className={styles.rowCopy}>
                            <p className={styles.order}>
                              {entry.orderNumber} · Piece{" "}
                              {entry.pieceId.slice(-6)}
                            </p>
                            <h3>{entry.garment}</h3>
                            <p>{entry.stepName} completed</p>
                            <time dateTime={entry.completedAt}>
                              {completedWorkDate(entry.completedAt)}
                            </time>
                          </div>
                          <ChevronRight
                            size={18}
                            className={styles.rowArrow}
                            aria-hidden="true"
                          />
                        </Link>
                      ))}
                      {!history.data.entries.length && !history.error && (
                        <p className={styles.empty}>
                          No completed work yet. Your finished stages will
                          appear here.
                        </p>
                      )}
                    </>
                  )}
                  <Link className={styles.viewAll} href="/my-work/history">
                    View history <ArrowUpRight size={16} />
                  </Link>
                </div>
              </details>
            </div>
          </div>
        </>
      )}
      <div className={styles.accountActions}>
        <button
          type="button"
          className={styles.signOut}
          disabled={signingOut}
          onClick={() => void handleSignOut()}
        >
          {signingOut ? (
            <LoaderCircle size={18} aria-hidden="true" />
          ) : (
            <LogOut size={18} aria-hidden="true" />
          )}
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
        {signOutError && (
          <p className={styles.signOutError} role="alert">
            {signOutError}
          </p>
        )}
      </div>
    </div>
  );
}
