"use client";
import "./team.css";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock3,
  ImageIcon,
  Phone,
  Ruler,
  UserRound,
} from "lucide-react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { EmptyState, PriorityBadge, Dialog } from "@/shared/components/ui";
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
    <CompletedWorkDetail key={id} id={id} />
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
  const [tab, setTab] = useState("overview");
  const [enlarged, setEnlarged] = useState<AssetRef | null>(null);
  const tabId = useId();
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const imageTrigger = useRef<HTMLButtonElement | null>(null);
  const entry = query.data?.entry;
  const snapshot = entry?.snapshot;
  const measurement = snapshot?.measurement;
  const design = snapshot?.design;
  const fields =
    measurement?.fields.filter(
      (field) =>
        measurement.values[field.id] !== undefined &&
        measurement.values[field.id] !== "",
    ) ?? [];
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
  const tabs = [
    { id: "overview", label: "Overview", count: 0 },
    { id: "measurements", label: "Measurements", count: fields.length },
    { id: "designs", label: "Designs", count: images.length },
  ];
  const back = `/my-work/history?${historyFilterQuery(historyFilters(params))}`;
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <Link className={styles.back} href={back} aria-label="Back to history">
          <ArrowLeft size={17} aria-hidden="true" />
          History
        </Link>
        <h1>Work details</h1>
      </header>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.reload}
      />
      {entry && (
        <>
          <section className={styles.summary} aria-label="Completed stage">
            <div className={styles.summaryTop}>
              <div className={styles.identity}>
                <p className={styles.order}>
                  {entry.orderNumber}
                  <span>Piece {entry.pieceId.slice(-6)}</span>
                </p>
                <h2>{entry.garment}</h2>
              </div>
              <span className={styles.completeBadge}>
                <Check size={13} aria-hidden="true" />
                Completed
              </span>
            </div>
            <p className={styles.completion}>
              <strong>{entry.stepName}</strong>
              <time dateTime={entry.completedAt}>
                {completedWorkDate(entry.completedAt)} IST
              </time>
            </p>
            <section className={styles.customer} aria-label="Customer details">
              <UserRound size={18} aria-hidden="true" />
              {entry.customer ? (
                <>
                  <div className={styles.customerCopy}>
                    <span>Customer</span>
                    <strong>{entry.customer.name}</strong>
                  </div>
                  {entry.customer.phone ? (
                    <a
                      className={styles.customerPhone}
                      href={`tel:${entry.customer.phone.replace(/[^\d+]/g, "")}`}
                    >
                      <Phone size={14} aria-hidden="true" />
                      {entry.customer.phone}
                    </a>
                  ) : (
                    <span className={styles.muted}>Phone not provided</span>
                  )}
                </>
              ) : (
                <p className={styles.muted}>
                  Customer details are no longer available for this order.
                </p>
              )}
            </section>
          </section>
          <div className={styles.content}>
            <div
              className={styles.tabs}
              role="tablist"
              aria-label="Work information"
            >
              {tabs.map((item, index) => (
                <button
                  key={item.id}
                  ref={(button) => {
                    tabButtons.current[index] = button;
                  }}
                  type="button"
                  role="tab"
                  id={`${tabId}-${item.id}-tab`}
                  aria-controls={`${tabId}-${item.id}-panel`}
                  aria-selected={tab === item.id}
                  tabIndex={tab === item.id ? 0 : -1}
                  onClick={() => setTab(item.id)}
                  onKeyDown={(event) => {
                    let next: number;
                    if (event.key === "ArrowRight")
                      next = (index + 1) % tabs.length;
                    else if (event.key === "ArrowLeft")
                      next = (index + tabs.length - 1) % tabs.length;
                    else if (event.key === "Home") next = 0;
                    else if (event.key === "End") next = tabs.length - 1;
                    else return;
                    event.preventDefault();
                    setTab(tabs[next].id);
                    tabButtons.current[next]?.focus();
                  }}
                >
                  {item.label}
                  {item.count > 0 && (
                    <span className={styles.count}>{item.count}</span>
                  )}
                </button>
              ))}
            </div>
            <section
              className={styles.tabPanel}
              role="tabpanel"
              id={`${tabId}-overview-panel`}
              aria-labelledby={`${tabId}-overview-tab`}
              hidden={tab !== "overview"}
              tabIndex={0}
            >
              <dl className={styles.facts}>
                <div>
                  <dt>Workstation</dt>
                  <dd>{STATIONS[entry.station]}</dd>
                </div>
                {snapshot && (
                  <>
                    <div>
                      <dt>Delivery due</dt>
                      <dd>{formatDate(snapshot.dueDate, true)}</dd>
                    </div>
                    <div>
                      <dt>Priority</dt>
                      <dd>
                        <PriorityBadge priority={snapshot.priority} />
                      </dd>
                    </div>
                  </>
                )}
              </dl>
              {snapshot ? (
                <div className={styles.notesGrid}>
                  <section>
                    <h3>Material notes</h3>
                    <p className={styles.notes}>
                      {snapshot.material || "No material notes saved."}
                    </p>
                  </section>
                  <section>
                    <h3>Design notes</h3>
                    <p className={styles.notes}>
                      {design?.notes || "No design notes saved."}
                    </p>
                  </section>
                </div>
              ) : (
                <div className={styles.earlier}>
                  <h3>Earlier completion</h3>
                  <p>
                    Material notes, measurements and design references were not
                    saved with this entry.
                  </p>
                </div>
              )}
              <details className={styles.record}>
                <summary>
                  <Clock3 size={15} aria-hidden="true" />
                  Full work record
                  <ChevronDown size={16} aria-hidden="true" />
                </summary>
                <dl className={styles.recordGrid}>
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
                </dl>
                <p className={styles.hint}>
                  Times in IST. Work details are saved at completion; customer
                  contact details are current.
                </p>
              </details>
            </section>
            <section
              className={styles.tabPanel}
              role="tabpanel"
              id={`${tabId}-measurements-panel`}
              aria-labelledby={`${tabId}-measurements-tab`}
              hidden={tab !== "measurements"}
              tabIndex={0}
            >
              <div className={styles.panelHeading}>
                <h3>
                  <Ruler size={17} aria-hidden="true" />
                  Saved measurements
                </h3>
                {measurement && (
                  <span
                    className={
                      measurement.confirmed
                        ? styles.confirmed
                        : styles.unconfirmed
                    }
                  >
                    {measurement.confirmed ? "Confirmed" : "Unconfirmed"}
                  </span>
                )}
              </div>
              {measurement && (
                <p className={styles.hint}>
                  {measurement.unit === "in"
                    ? "Inches (in)"
                    : "Centimetres (cm)"}{" "}
                  · Saved at completion
                </p>
              )}
              {fields.length > 0 && measurement ? (
                <dl className={styles.measurements}>
                  {fields.map((field) => (
                    <div key={field.id}>
                      <dt>{field.label}</dt>
                      <dd>
                        {measurement.values[field.id]}
                        {field.type === "number" && (
                          <small> {measurement.unit}</small>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className={styles.empty}>
                  {measurement
                    ? "No measurement values were saved."
                    : "No measurement snapshot was saved for this piece."}
                </p>
              )}
            </section>
            <section
              className={styles.tabPanel}
              role="tabpanel"
              id={`${tabId}-designs-panel`}
              aria-labelledby={`${tabId}-designs-tab`}
              hidden={tab !== "designs"}
              tabIndex={0}
            >
              <div className={styles.panelHeading}>
                <h3>
                  <ImageIcon size={17} aria-hidden="true" />
                  Design references
                </h3>
              </div>
              {images.length > 0 ? (
                <>
                  <p className={styles.hint}>
                    Saved at completion · Tap an image to enlarge
                  </p>
                  {tab === "designs" && (
                    <div className={styles.gallery}>
                      {images.map((asset) => (
                        <button
                          type="button"
                          className={styles.imageButton}
                          key={asset.id}
                          onClick={(event) => {
                            imageTrigger.current = event.currentTarget;
                            setEnlarged(asset);
                          }}
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
                  )}
                </>
              ) : (
                <p className={styles.empty}>
                  No design reference images were saved.
                </p>
              )}
            </section>
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
          onClose={() => {
            flushSync(() => setEnlarged(null));
            imageTrigger.current?.focus();
          }}
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
    </div>
  );
}
