"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Scissors,
  Download,
  ScanLine,
  Camera,
  X,
  Database,
  ShieldCheck,
  CircleAlert,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { Avatar, EmptyState, PageHeading, PriorityBadge } from "./ui";
import {
  STATIONS,
  balance,
  paid,
  money,
  isOpen,
  isOverdue,
  formatDate,
  exportOrders,
  prioritySort,
} from "@/lib/workspace";

export function Workflow() {
  const { data, today, advancePiece } = useWorkspace();
  const params = useSearchParams();
  const router = useRouter();
  const selected = params.get("station") ?? "all";
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  return (
    <>
      <PageHeading
        eyebrow="FROM FIRST CUT TO FINAL PRESS"
        title="Good things are in the making."
        description="See where every piece is, and help the next step happen."
      >
        <Link className="button primary" href="/scan">
          <ScanLine size={17} />
          Scan a garment
        </Link>
      </PageHeading>
      <div className="toolbar" style={{ padding: "0 0 22px", border: 0 }}>
        <div className="toolbar-filters">
          <select
            aria-label="Choose a station"
            value={selected}
            onChange={(event) =>
              router.replace(`/workflow?station=${event.target.value}`)
            }
          >
            <option value="all">All stations</option>
            {STATIONS.map((station, index) => (
              <option key={station} value={index}>
                {station}
              </option>
            ))}
          </select>
        </div>
        <span className="small muted">
          Urgent orders first, then earliest due date
        </span>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div
        className="workflow-board"
        style={
          selected !== "all"
            ? { gridTemplateColumns: "minmax(0, 500px)" }
            : undefined
        }
      >
        {STATIONS.map((station, index) => {
          if (selected !== "all" && Number(selected) !== index) return null;
          const pieces = data.orders
            .filter(isOpen)
            .sort(prioritySort)
            .flatMap((order) =>
              order.items
                .filter((item) => item.station === index)
                .map((item) => ({ item, order })),
            );
          return (
            <section className="workflow-column" key={station}>
              <div className="workflow-column-head">
                <Scissors size={15} />
                <h2>{station}</h2>
                <small>{pieces.length}</small>
              </div>
              {pieces.map(({ order, item }) => (
                <article className="workflow-card" key={item.id}>
                  <div
                    className="inline-row"
                    style={{ justifyContent: "space-between" }}
                  >
                    <PriorityBadge priority={order.priority} />
                    <Link
                      href={`/orders/${order.id}`}
                      aria-label={`View ${order.number}`}
                    >
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>
                  <h3>
                    {
                      data.customers.find(
                        (customer) => customer.id === order.customerId,
                      )?.name
                    }
                  </h3>
                  <p>
                    {order.number} · {item.garment}
                  </p>
                  <div className="workflow-card-foot">
                    <span
                      className={isOverdue(order, today) ? "overdue-text" : ""}
                    >
                      {isOverdue(order, today) ? "Overdue · " : "Due "}
                      {order.dueDate === today
                        ? "today"
                        : formatDate(order.dueDate)}
                    </span>
                  </div>
                  <button
                    className="button subtle small-button"
                    disabled={busy === item.id}
                    onClick={async () => {
                      setBusy(item.id);
                      setError("");
                      try {
                        await advancePiece(order.id, item.id);
                      } catch (error) {
                        setError(
                          error instanceof Error
                            ? error.message
                            : "Could not update the garment.",
                        );
                      } finally {
                        setBusy("");
                      }
                    }}
                  >
                    <Check size={13} />
                    {busy === item.id ? "Saving…" : "Complete step"}
                  </button>
                </article>
              ))}
              {!pieces.length && (
                <p className="workflow-empty">
                  A little breathing room.
                  <br />
                  No pieces at this station.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

export function Billing() {
  const { data } = useWorkspace();
  const [filter, setFilter] = useState("pending");
  const orders = data.orders.filter(
    (order) =>
      order.status !== "cancelled" &&
      (filter === "all" ||
        (filter === "pending" ? balance(order) > 0 : balance(order) === 0)),
  );
  const pending = data.orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + balance(order), 0);
  return (
    <>
      <PageHeading
        eyebrow="EVERY RUPEE, ACCOUNTED FOR"
        title="The business side of beautiful."
        description="Advances, balances, and the satisfaction of a settled bill."
      >
        <button
          className="button"
          onClick={() => exportOrders(orders, data.customers)}
        >
          <Download size={16} />
          Export accounts
        </button>
      </PageHeading>
      <div
        className="metric-grid"
        style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
      >
        <div className="metric-card">
          <div className="metric-top">Pending balances</div>
          <strong className="metric-value">{money(pending)}</strong>
          <span className="muted small">Across all unpaid orders</span>
        </div>
        <div className="metric-card">
          <div className="metric-top">Total collected</div>
          <strong className="metric-value">
            {money(data.orders.reduce((sum, order) => sum + paid(order), 0))}
          </strong>
          <span className="muted small">
            Recorded advances & balance payments
          </span>
        </div>
      </div>
      <section className="panel">
        <div className="toolbar">
          <div className="filter-tabs" style={{ padding: 0 }}>
            {["pending", "settled", "all"].map((value) => (
              <button
                key={value}
                aria-pressed={filter === value}
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
              >
                {value === "pending"
                  ? "Pending balances"
                  : value === "settled"
                    ? "Fully paid"
                    : "All orders"}
              </button>
            ))}
          </div>
        </div>
        {orders.map((order) => (
          <Link
            className="mobile-order-card"
            style={{ display: "block" }}
            href={`/orders/${order.id}`}
            key={order.id}
          >
            <div
              className="inline-row"
              style={{ justifyContent: "space-between" }}
            >
              <div>
                <strong>
                  {
                    data.customers.find(
                      (customer) => customer.id === order.customerId,
                    )?.name
                  }
                </strong>
                <p className="muted small" style={{ marginTop: 4 }}>
                  {order.number} · {money(paid(order))} paid
                </p>
              </div>
              <div className="inline-row">
                <strong>{money(balance(order))}</strong>
                <ArrowUpRight size={16} />
              </div>
            </div>
          </Link>
        ))}
        {!orders.length && (
          <EmptyState
            title="All clear here"
            text="No orders in this payment view."
          />
        )}
      </section>
    </>
  );
}

export function Team() {
  const { data } = useWorkspace();
  return (
    <>
      <PageHeading
        eyebrow="THE HANDS BEHIND EVERY STITCH"
        title="Your lovely little team."
        description="The people who turn a piece of fabric into something special."
      />
      <div className="team-grid">
        {data.staff.map((person) => (
          <article className="panel team-card" key={person.id}>
            <Avatar name={person.name} tone={person.color} />
            <h2>{person.name}</h2>
            <p>{person.role}</p>
            <span className="team-station">{person.station}</span>
          </article>
        ))}
      </div>
      {!data.staff.length && (
        <EmptyState
          title="Your team starts here"
          text="Your owner profile will appear after setup."
        />
      )}
    </>
  );
}

export function Scan() {
  const { data } = useWorkspace();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [camera, setCamera] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const resolveRef = useRef<(text: string) => void>(() => {});
  function resolve(text: string) {
    const cleaned = text.trim();
    const order = data.orders.find(
      (entry) =>
        entry.number.toLowerCase() === cleaned.toLowerCase() ||
        entry.id === cleaned ||
        (cleaned.startsWith("swapna:") && cleaned.split(":")[1] === entry.id),
    );
    if (!order) {
      setError(
        "We couldn’t find that garment. Check the order number and try again.",
      );
      return;
    }
    setCamera(false);
    router.push(`/orders/${order.id}`);
  }
  useEffect(() => {
    resolveRef.current = resolve;
  });
  useEffect(() => {
    if (!camera) return;
    let disposed = false;
    let stop: (() => void) | undefined;
    void import("@zxing/browser")
      .then(async ({ BrowserQRCodeReader }) => {
        if (disposed || !video.current) return;
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" }, audio: false },
          video.current,
          (result) => {
            if (result && !disposed) {
              resolveRef.current(result.getText());
            }
          },
        );
        if (disposed) controls.stop();
        else stop = () => controls.stop();
      })
      .catch(() => {
        if (!disposed) {
          setError(
            "Camera access is unavailable. Allow camera access, or enter the printed order number below.",
          );
          setCamera(false);
        }
      });
    return () => {
      disposed = true;
      stop?.();
    };
  }, [camera]);
  return (
    <>
      <PageHeading
        eyebrow="ONE LITTLE SCAN. THE WHOLE STORY."
        title="Find the piece in front of you."
        description="Scan a garment’s QR label or enter its order number."
      />
      <section className="panel scan-panel">
        {camera ? (
          <div>
            <video
              ref={video}
              style={{ width: "100%", borderRadius: 9 }}
              autoPlay
              muted
              playsInline
            />
            <button className="button" onClick={() => setCamera(false)}>
              <X size={17} />
              Stop camera
            </button>
          </div>
        ) : (
          <>
            <div className="scan-target">
              <ScanLine size={64} strokeWidth={1} />
            </div>
            <h2>Every piece has a place.</h2>
            <p>
              Point your camera at the QR label to see the order and its next
              step.
            </p>
            <button
              className="button primary"
              onClick={() => {
                setError("");
                setCamera(true);
              }}
            >
              <Camera size={17} />
              Open camera
            </button>
          </>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            resolve(code);
          }}
        >
          <label className="field">
            Or enter the order number
            <input
              value={code}
              required
              onChange={(event) => setCode(event.target.value)}
              placeholder="e.g. SG-1041"
              autoCapitalize="characters"
            />
          </label>
          <button className="button" type="submit">
            Find garment
            <ArrowRight size={16} />
          </button>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </>
  );
}

export function SettingsPage() {
  const { mode, owner, signOut, data } = useWorkspace();
  return (
    <>
      <PageHeading
        eyebrow="A PLACE FOR THE PRACTICAL THINGS"
        title="Make yourself at home."
        description="Your shop’s workspace and connection details."
      />
      <div className="settings-grid">
        <section className="panel settings-card">
          <Database size={26} strokeWidth={1.5} />
          <h2>Railway PostgreSQL</h2>
          <p>
            Your database keeps customers, measurements, orders, and payments
            together.
          </p>
          <div className="connection-status">
            {mode === "live" ? <Check size={17} /> : <CircleAlert size={17} />}
            {mode === "live"
              ? "Connected · your shop data is saved"
              : "Preview · Railway connection pending"}
          </div>
          <p>
            {mode === "live"
              ? "Changes are saved in PostgreSQL. Other devices refresh every 30 seconds and when you return to the website."
              : "This workspace is showing sample data. Changes here do not reach your Railway database."}
          </p>
        </section>
        <section className="panel settings-card">
          <ShieldCheck size={26} strokeWidth={1.5} />
          <h2>Your workspace access</h2>
          <p>
            {mode === "live"
              ? `Signed in as ${owner.name} (${owner.email}).`
              : "Sign-in will be required when the Railway connection is enabled."}
          </p>
          <p style={{ marginTop: 16 }}>
            Database access stays on the website’s server. Customer messaging is
            not enabled yet.
          </p>
          {mode === "live" && (
            <button className="button" onClick={() => void signOut()}>
              Sign out
            </button>
          )}
        </section>
        <section className="panel settings-card">
          <Scissors size={26} strokeWidth={1.5} />
          <h2>The days, remembered</h2>
          {data.dayReports?.length ? (
            data.dayReports
              .slice()
              .reverse()
              .map((report) => (
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
          ) : (
            <p>
              Your saved closing reports appear here after you review the day
              from the overview.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
