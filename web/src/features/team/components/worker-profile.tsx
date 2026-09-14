"use client";
import "./team.css";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCheck,
  History,
  ListTodo,
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
  return (
    <>
      <PageHeading
        eyebrow="YOUR SPACE"
        title="My profile"
        description="Your team details and the work you are part of."
      >
        <button className="button" onClick={() => void signOut()}>
          <LogOut size={17} /> Sign out
        </button>
      </PageHeading>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.reload}
      />
      {profile && (
        <>
          <WorkerIdentity profile={profile} />
          <div className={styles.layout}>
            <section
              className={`panel ${styles.details}`}
              aria-labelledby="profile-details"
            >
              <h2 id="profile-details">Profile details</h2>
              <dl>
                <div>
                  <dt>Full name</dt>
                  <dd>{profile.name}</dd>
                </div>
                <div>
                  <dt>Login email</dt>
                  <dd>{profile.email}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{profile.role}</dd>
                </div>
                <div>
                  <dt>Work skills</dt>
                  <dd className="skill-tags">
                    {profile.skills.map((skill) => (
                      <span key={skill}>{STATIONS[skill]}</span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt>Queue capacity</dt>
                  <dd>{profile.capacityMinutes} minutes of estimated work</dd>
                </div>
              </dl>
              <p className={styles.help}>
                Your shop owner manages these details, your password, and
                availability. Ask them if anything needs updating.
              </p>
              {!profile.available && (
                <p className="note-box">
                  You are unavailable for new work. You can still resume or
                  finish work already started.
                </p>
              )}
            </section>
            <div className={styles.overview}>
              <section
                className={`panel ${styles.workSection}`}
                aria-labelledby="current-work-heading"
              >
                <div className={styles.sectionHeading}>
                  <h2 id="current-work-heading">
                    <ListTodo size={19} />
                    My current work
                  </h2>
                  <Link className="text-link" href="/my-work">
                    View all <ArrowUpRight size={14} />
                  </Link>
                </div>
                <QueryState
                  loading={work.isLoading}
                  error={work.error}
                  retry={work.reload}
                />
                {work.data && (
                  <>
                    <dl className={styles.stats}>
                      <div>
                        <dt>Assigned</dt>
                        <dd>{work.data.summary.total}</dd>
                      </div>
                      <div>
                        <dt>Pending</dt>
                        <dd>{work.data.summary.pending}</dd>
                      </div>
                      <div>
                        <dt>In progress</dt>
                        <dd>{work.data.summary.inProgress}</dd>
                      </div>
                      <div>
                        <dt>Blocked</dt>
                        <dd>{work.data.summary.blocked}</dd>
                      </div>
                    </dl>
                    {work.data.summary.overdue > 0 && (
                      <p className="overdue-text small">
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
                        key={item.id}
                        href={`/my-work?code=${encodeURIComponent(`swapna:${order.id}:${item.id}`)}`}
                      >
                        <div>
                          <p className="work-order">
                            {order.number} · Piece {item.id.slice(-6)}
                          </p>
                          <h3>{item.garment}</h3>
                          <p>
                            {currentStepName(item)} · Due{" "}
                            {formatDate(order.dueDate)}
                          </p>
                        </div>
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
                      </Link>
                    ))}
                    {!work.data.pieces.length && !work.error && (
                      <p className={styles.empty}>
                        Your queue is clear. New assignments will appear here.
                      </p>
                    )}
                  </>
                )}
              </section>
              <section
                className={`panel ${styles.workSection}`}
                aria-labelledby="completed-work-heading"
              >
                <div className={styles.sectionHeading}>
                  <h2 id="completed-work-heading">
                    <History size={19} />
                    My completed work
                  </h2>
                  <Link className="text-link" href="/my-work/history">
                    View history <ArrowUpRight size={14} />
                  </Link>
                </div>
                <QueryState
                  loading={history.isLoading}
                  error={history.error}
                  retry={history.reload}
                />
                {history.data && (
                  <>
                    <p className={styles.completedCount}>
                      <CheckCheck size={18} />
                      <strong>{history.data.page.total}</strong> completed{" "}
                      {history.data.page.total === 1 ? "stage" : "stages"}
                    </p>
                    {history.data.entries.map((entry) => (
                      <Link
                        className={styles.workRow}
                        key={entry.id}
                        href={`/my-work/history/${entry.id}`}
                      >
                        <div>
                          <p className="work-order">
                            {entry.orderNumber} · Piece{" "}
                            {entry.pieceId.slice(-6)}
                          </p>
                          <h3>{entry.garment}</h3>
                          <p>{entry.stepName} completed</p>
                        </div>
                        <time dateTime={entry.completedAt}>
                          {new Intl.DateTimeFormat("en-IN", {
                            timeZone: "Asia/Kolkata",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(entry.completedAt))}
                        </time>
                      </Link>
                    ))}
                    {!history.data.entries.length && !history.error && (
                      <p className={styles.empty}>
                        No completed work yet. Stages assigned to you appear
                        here once they are marked complete.
                      </p>
                    )}
                  </>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </>
  );
}
