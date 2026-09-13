"use client";

import { useState } from "react";
import type { Order } from "@/features/orders/types";
import { useCatalogue } from "@/features/settings/hooks/use-catalogue";
import { Dialog } from "@/shared/components/ui";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { balance, isOpen, money, paid } from "@/shared/workspace";
import type { GstSettings } from "../contracts/gst";
import { calculateGst, gstSettingsFor, totalWithGst } from "../domain/gst";
import { GstSummary } from "./gst-summary";

export function ApplyOrderGst({
  order,
  disabled,
}: {
  order: Order;
  disabled: boolean;
}) {
  const read = useCatalogue();
  const { send } = useWorkspace();
  const [settings, setSettings] = useState<GstSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = gstSettingsFor(read.data?.catalogue);
  const applicable = !order.gst && isOpen(order) && balance(order) > 0;
  const settingsChanged =
    settings &&
    (current.enabled !== settings.enabled ||
      current.rateBps !== settings.rateBps ||
      current.priceMode !== settings.priceMode ||
      current.gstin !== settings.gstin);
  if (!settings && (!applicable || !current.enabled)) return null;
  const subtotal = order.items.reduce((sum, item) => sum + item.price, 0);
  const gst = settings ? calculateGst(subtotal, settings) : undefined;
  const revisedTotal = totalWithGst(subtotal, gst);
  return (
    <>
      <button
        type="button"
        className="button subtle no-print"
        style={{ marginTop: 9 }}
        disabled={disabled || busy || read.isRefreshing || Boolean(read.error)}
        onClick={() => {
          setSettings(structuredClone(current));
          setError("");
        }}
      >
        Apply GST
      </button>
      {settings && (
        <Dialog
          title="Apply GST to this bill"
          subtitle={order.number}
          onClose={() => setSettings(null)}
          busy={busy}
        >
          <div className="dialog-body">
            {(settingsChanged || !applicable) && (
              <p className="form-error" role="alert">
                The bill or GST settings changed. Close and reopen this dialog
                to review the current amounts.
              </p>
            )}
            <GstSummary gst={gst} />
            <div className="summary-line">
              <span>New bill total</span>
              <strong>{money(revisedTotal)}</strong>
            </div>
            <div className="summary-line">
              <span>Amount paid</span>
              <strong>{money(paid(order))}</strong>
            </div>
            <div className="summary-line total">
              <span>New balance</span>
              <strong>{money(revisedTotal - paid(order))}</strong>
            </div>
            {settings.gstin && (
              <p className="small muted">GSTIN: {settings.gstin}</p>
            )}
            <p className="small muted">
              This saves the GST rate and amount on this order.
            </p>
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
              onClick={() => setSettings(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button primary"
              disabled={
                busy || disabled || !applicable || Boolean(settingsChanged)
              }
              onClick={async () => {
                if (busy) return;
                setBusy(true);
                setError("");
                try {
                  await send(
                    { type: "billing.apply-gst", orderId: order.id, settings },
                    "GST applied to the bill.",
                  );
                  setSettings(null);
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : "Could not apply GST. Please try again.",
                  );
                  read.reload();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : "Save GST on bill"}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
