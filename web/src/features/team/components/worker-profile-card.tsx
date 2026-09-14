"use client";
import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import { QueryState } from "@/shared/components/query-state";
import { useWorkerProfile } from "../hooks/use-worker-profile";
import type { WorkerProfile } from "../types/worker-profile";
import styles from "./worker-profile.module.css";

export function WorkerIdentity({
  profile,
  compact = false,
}: {
  profile: WorkerProfile;
  compact?: boolean;
}) {
  return (
    <section
      className={`${styles.identity} ${compact ? styles.compact : ""}`}
      aria-label="Worker profile"
    >
      <div className={styles.identityTop}>
        <Avatar name={profile.name} tone={profile.color} />
        <div className={styles.identityCopy}>
          <h2>{profile.name}</h2>
          <p className={styles.role}>{profile.role} · Swapna Garments</p>
        </div>
      </div>
      {!compact && (
        <div className={styles.email}>
          <Mail size={18} aria-hidden="true" />
          <dl>
            <dt>Login email</dt>
            <dd>{profile.email}</dd>
          </dl>
        </div>
      )}
      <div className={styles.identityActions}>
        <span
          className={`${styles.availability} ${profile.available ? "" : styles.unavailable}`}
        >
          <span aria-hidden="true" />
          {profile.available
            ? "Available for work"
            : "Unavailable for new work"}
        </span>
        {compact && (
          <Link className="text-link" href="/my-work/profile">
            View profile <ArrowUpRight size={15} />
          </Link>
        )}
      </div>
      {!compact && !profile.available && (
        <p className={styles.availabilityHelp}>
          You can still resume or finish work already started.
        </p>
      )}
    </section>
  );
}

export function WorkerProfileCard() {
  const query = useWorkerProfile();
  return (
    <>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.reload}
      />
      {query.data?.profile && (
        <WorkerIdentity profile={query.data.profile} compact />
      )}
    </>
  );
}
