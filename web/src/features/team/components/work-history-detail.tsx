"use client";
import "./team.css";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Clock3, ImageIcon, Ruler } from "lucide-react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import {
  PageHeading,
  EmptyState,
  PriorityBadge,
  Dialog,
} from "@/shared/components/ui";
import { QueryState } from "@/shared/components/query-state";
import { STATIONS, formatDate } from "@/shared/workspace";
import { AssetImage } from "@/features/design-library/components/asset-image";
import type { AssetRef } from "@/features/design-library/contracts";
import { useWorkHistoryDetail } from "../hooks/use-work-history-detail";
import {
  completedWorkDate,
  historyFilters,
  historyFilterQuery,
} from "../domain/history-navigation";
import styles from "./work-history-detail.module.css";

export function WorkHistoryDetail({ id }: { id: string }) {
  const { owner } = useWorkspace();
  return owner.role === "worker" ? (
    <CompletedWorkDetail id={id} />
  ) : (
    <EmptyState
      title="Worker history details"
      text="Sign in with a worker account to view your completed work."
    >
      <Link className="button" href="/team">
        Go to team
      </Link>
    </EmptyState>
  );
}

function CompletedWorkDetail({ id }: { id: string }) {
  const query = useWorkHistoryDetail(id);
  const params = useSearchParams();
  const [enlarged, setEnlarged] = useState<AssetRef | null>(null);
  const entry = query.data?.entry;
  const snapshot = entry?.snapshot;
  const measurement = snapshot?.measurement;
  const design = snapshot?.design;
  const images = [
    ...new Map(
      [
        ...(design?.garmentImage ? [design.garmentImage] : []),
        ...(measurement?.image ? [measurement.image] : []),
        ...(design?.choices ?? []),
        ...(design?.garmentReferences ?? []),
        ...(design?.references ?? []),
      ].map((asset) => [asset.id, asset]),
    ).values(),
  ];
  const back = `/my-work/history?${historyFilterQuery(historyFilters(params))}`;
  return (
    <>
      <PageHeading
        eyebrow="MY COMPLETED WORK"
        title="Work details"
        description="The record of a stage you completed."
      >
        <Link className="button" href={back}>
          <ArrowLeft size={16} />
          Back to history
        </Link>
      </PageHeading>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.reload}
      />
      {entry && (
        <>
          <section
            className={`panel ${styles.hero}`}
            aria-label="Completed stage"
          >
            <div className="work-history-icon" aria-hidden="true">
              <Check size={22} />
            </div>
            <div className={styles.heroCopy}>
              <p className="work-order">
                {entry.orderNumber} · Piece {entry.pieceId.slice(-6)}
              </p>
              <h2>{entry.garment}</h2>
              <p>{entry.stepName}</p>
            </div>
            <span className={styles.completeBadge}>
              <Check size={14} />
              Completed
            </span>
          </section>
          <div className={styles.layout}>
            <section
              className={`panel ${styles.section}`}
              aria-labelledby="completion-heading"
            >
              <h2 id="completion-heading">
                <Clock3 size={18} />
                Completion details
              </h2>
              <dl className={styles.details}>
                <div>
                  <dt>Order number</dt>
                  <dd>{entry.orderNumber}</dd>
                </div>
                <div>
                  <dt>Piece code</dt>
                  <dd>{entry.pieceId}</dd>
                </div>
                <div>
                  <dt>Completed stage</dt>
                  <dd>{entry.stepName}</dd>
                </div>
                <div>
                  <dt>Workstation</dt>
                  <dd>{STATIONS[entry.station]}</dd>
                </div>
                <div>
                  <dt>Completed on</dt>
                  <dd>
                    <time dateTime={entry.completedAt}>
                      {completedWorkDate(entry.completedAt)}
                    </time>
                  </dd>
                </div>
                {snapshot?.assignedAt && (
                  <div>
                    <dt>Assigned on</dt>
                    <dd>
                      <time dateTime={snapshot.assignedAt}>
                        {completedWorkDate(snapshot.assignedAt)}
                      </time>
                    </dd>
                  </div>
                )}
                {snapshot?.startedAt && (
                  <div>
                    <dt>Started on</dt>
                    <dd>
                      <time dateTime={snapshot.startedAt}>
                        {completedWorkDate(snapshot.startedAt)}
                      </time>
                    </dd>
                  </div>
                )}
                {snapshot && (
                  <>
                    <div>
                      <dt>Due date at completion</dt>
                      <dd>{formatDate(snapshot.dueDate)}</dd>
                    </div>
                    <div>
                      <dt>Priority at completion</dt>
                      <dd>
                        <PriorityBadge priority={snapshot.priority} />
                      </dd>
                    </div>
                  </>
                )}
              </dl>
              <p className={styles.hint}>
                Times are shown in India Standard Time.
              </p>
            </section>
            <div className={styles.stack}>
              {!snapshot ? (
                <section className={`panel ${styles.section}`}>
                  <h2>Earlier completion</h2>
                  <p className={styles.note}>
                    This entry was saved before detailed work snapshots were
                    available. Its completed stage and date are preserved;
                    material notes, measurements, and design references were not
                    saved with this entry.
                  </p>
                </section>
              ) : (
                <>
                  <section
                    className={`panel ${styles.section}`}
                    aria-labelledby="garment-details-heading"
                  >
                    <h2 id="garment-details-heading">Garment details</h2>
                    <p className={styles.hint}>
                      Saved when this stage was completed.
                    </p>
                    <dl className={styles.details}>
                      <div>
                        <dt>Garment</dt>
                        <dd>{entry.garment}</dd>
                      </div>
                      <div>
                        <dt>Material notes</dt>
                        <dd className={styles.notes}>
                          {snapshot.material || "No material notes saved."}
                        </dd>
                      </div>
                      <div>
                        <dt>Design notes</dt>
                        <dd className={styles.notes}>
                          {design?.notes || "No design notes saved."}
                        </dd>
                      </div>
                    </dl>
                  </section>
                  <section
                    className={`panel ${styles.section}`}
                    aria-labelledby="saved-measurements-heading"
                  >
                    <h2 id="saved-measurements-heading">
                      <Ruler size={18} />
                      Saved measurements
                    </h2>
                    {measurement ? (
                      <>
                        <p className={styles.hint}>
                          {measurement.confirmed
                            ? "Confirmed measurements"
                            : "Measurements were unconfirmed"}{" "}
                          ·{" "}
                          {measurement.unit === "in"
                            ? "inches (in)"
                            : "centimetres (cm)"}
                        </p>
                        <dl
                          className={`${styles.details} ${styles.measurements}`}
                        >
                          {measurement.fields
                            .filter(
                              (field) =>
                                measurement.values[field.id] !== undefined &&
                                measurement.values[field.id] !== "",
                            )
                            .map((field) => (
                              <div key={field.id}>
                                <dt>{field.label}</dt>
                                <dd>
                                  {measurement.values[field.id]}
                                  {field.type === "number"
                                    ? ` ${measurement.unit}`
                                    : ""}
                                </dd>
                              </div>
                            ))}
                        </dl>
                        {!measurement.fields.some(
                          (field) =>
                            measurement.values[field.id] !== undefined &&
                            measurement.values[field.id] !== "",
                        ) && (
                          <p className={styles.note}>
                            No measurement values were saved.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className={styles.note}>
                        No measurement snapshot was saved for this piece.
                      </p>
                    )}
                  </section>
                  <section
                    className={`panel ${styles.section}`}
                    aria-labelledby="saved-references-heading"
                  >
                    <h2 id="saved-references-heading">
                      <ImageIcon size={18} />
                      Design references
                    </h2>
                    {images.length ? (
                      <div className={styles.gallery}>
                        {images.map((asset) => (
                          <button
                            type="button"
                            className={styles.imageButton}
                            key={asset.id}
                            onClick={() => setEnlarged(asset)}
                            aria-label={`View ${asset.label}`}
                          >
                            <AssetImage
                              asset={asset}
                              size={108}
                              workCode={`history:${entry.id}`}
                            />
                            <span>{asset.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.note}>
                        No design reference images were saved.
                      </p>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </>
      )}
      {!entry && !query.isLoading && !query.error && (
        <EmptyState
          title="Completed work not found"
          text="Choose an entry from your work history to view its details."
        />
      )}
      {enlarged && entry && (
        <Dialog
          title={enlarged.label}
          subtitle="Saved reference for this completed stage"
          onClose={() => setEnlarged(null)}
        >
          <div className={`dialog-body ${styles.imagePreview}`}>
            <AssetImage
              asset={enlarged}
              size={480}
              full
              decorative={false}
              workCode={`history:${entry.id}`}
            />
          </div>
        </Dialog>
      )}
    </>
  );
}
