"use client";
import { useState, type FormEvent } from "react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { Dialog } from "@/shared/components/ui";
import type { OrderItem } from "@/features/orders/types";
import { MeasurementFields } from "./measurement-fields";

export function PieceMeasurementEditor({
  orderId,
  piece,
  onClose,
}: {
  orderId: string;
  piece: OrderItem;
  onClose: () => void;
}) {
  const { send } = useWorkspace();
  const [snapshot] = useState(piece.measurement!);
  const [values, setValues] = useState(snapshot.values),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await send(
        {
          type: "piece.measurements",
          orderId,
          pieceId: piece.id,
          expectedRevision: snapshot.revision,
          values,
        },
        "Piece measurements confirmed.",
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save measurements.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={`${piece.garment} measurements`}
      subtitle="Applies to this piece only. Its earlier measurements remain in history."
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <div className="dialog-body">
          <MeasurementFields
            fields={snapshot.fields}
            unit={snapshot.unit}
            values={values}
            onChange={setValues}
            required
            disabled={busy}
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="dialog-actions">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Confirm for cutting"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
