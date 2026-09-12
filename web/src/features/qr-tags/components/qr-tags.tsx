"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ScanLine, Camera, X } from "lucide-react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { PageHeading } from "@/shared/components/ui";

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
