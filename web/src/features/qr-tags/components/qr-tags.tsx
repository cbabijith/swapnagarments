"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ScanLine, Camera, X } from "lucide-react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { PageHeading } from "@/shared/components/ui";
import { parseWorkCode } from "../domain/code";
import { previewWork } from "@/features/team/domain/queries";

export function Scan() {
  const { data: preview, mode, onUnauthorized, owner } = useWorkspace();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const request = useRef<AbortController | null>(null);
  const lastScan = useRef({ text: "", time: 0 });
  const resolveRef = useRef<(text: string, scanned?: boolean) => Promise<void>>(
    async () => {},
  );
  async function resolve(text: string, scanned = false) {
    const cleaned = text.trim();
    if (!cleaned || inFlight.current) return;
    if (
      scanned &&
      lastScan.current.text === cleaned &&
      Date.now() - lastScan.current.time < 2500
    )
      return;
    if (scanned) lastScan.current = { text: cleaned, time: Date.now() };
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      if (!parseWorkCode(cleaned))
        throw new Error(
          "Scan a Swapna garment label or enter its printed order number.",
        );
      const worker = owner.role === "worker";
      const workResult =
        mode === "preview"
          ? previewWork(
              preview,
              {
                page: 1,
                pageSize: 1,
                status: "all",
                station: "all",
                code: cleaned,
              },
              worker ? owner.staffId : undefined,
            )
          : await (async () => {
              const controller = new AbortController();
              request.current = controller;
              const response = await fetch(
                `/api/work?code=${encodeURIComponent(cleaned)}&pageSize=1`,
                {
                  cache: "no-store",
                  signal: AbortSignal.any([
                    controller.signal,
                    AbortSignal.timeout(15000),
                  ]),
                },
              );
              const result = await response.json();
              if (response.status === 401) onUnauthorized();
              if (!response.ok)
                throw new Error(result.error || "Could not find this piece.");
              return result;
            })();
      if (workResult.pieces.length) {
        if (mounted.current) {
          setCamera(false);
          router.push(
            `${worker ? "/my-work?" : "/team?view=work&"}code=${encodeURIComponent(cleaned)}`,
          );
        }
        return;
      }
      if (worker)
        throw new Error(
          "No unfinished work for this label is assigned to you. The piece may be completed or assigned to another worker.",
        );
      let orderId: string | undefined;
      if (mode === "preview") {
        orderId = preview.orders.find(
          (entry) =>
            entry.number.toLowerCase() === cleaned.toLowerCase() ||
            entry.id === cleaned ||
            (cleaned.startsWith("swapna:") &&
              cleaned.split(":")[1] === entry.id &&
              entry.items.some((i) => i.id === cleaned.split(":")[2])),
        )?.id;
      } else {
        const controller = new AbortController();
        request.current = controller;
        const response = await fetch(
          `/api/lookup?code=${encodeURIComponent(cleaned)}`,
          {
            cache: "no-store",
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(15000),
            ]),
          },
        );
        const result = await response.json();
        if (response.status === 401) onUnauthorized();
        if (!response.ok)
          throw new Error(
            result.error || "Could not find this order. Please try again.",
          );
        orderId = result.orderId;
      }
      if (!orderId)
        throw new Error(
          "Order not found. Check the order number and try again.",
        );
      if (mounted.current) {
        setCamera(false);
        router.push(`/orders/${encodeURIComponent(orderId)}`);
      }
    } catch (error) {
      if (mounted.current)
        setError(
          error instanceof Error
            ? error.message
            : "Could not find this order. Please try again.",
        );
    } finally {
      inFlight.current = false;
      request.current = null;
      if (mounted.current) setBusy(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);
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
              void resolveRef.current(result.getText(), true);
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
        eyebrow="QR SCAN OR PRINTED CODE"
        title="Scan a piece"
        description="Open a piece’s current task, check the details, then choose what to do."
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
            <h2>Scan a garment label</h2>
            <p>
              Point the camera at a garment label. Scanning opens its details;
              you confirm any work update.
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
            void resolve(code);
          }}
        >
          <label className="field">
            Or enter the printed order number
            <input
              value={code}
              required
              onChange={(event) => setCode(event.target.value)}
              placeholder="e.g. SG-1041"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
            />
          </label>
          <button className="button" type="submit" disabled={busy}>
            {busy ? "Finding piece…" : "Find piece"}
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
