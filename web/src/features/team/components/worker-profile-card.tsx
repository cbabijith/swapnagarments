"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import { QueryState } from "@/shared/components/query-state";
import { STATIONS } from "@/shared/workspace";
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
      className={`panel ${styles.identity} ${compact ? styles.compact : ""}`}
      aria-label="Worker profile"
    >
      <Avatar name={profile.name} tone={profile.color} />
      <div className={styles.identityCopy}>
        <p className="eyebrow">
          {compact ? "MY PROFILE" : "SWAPNA GARMENTS TEAM"}
        </p>
        <h2>{profile.name}</h2>
        <p className={styles.role}>
          {profile.role} ·{" "}
          {profile.skills.map((skill) => STATIONS[skill]).join(" · ")}
        </p>
      </div>
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
