"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Dialog } from "@/shared/components/ui";
import { QueryState } from "@/shared/components/query-state";
import { money } from "@/shared/workspace";
import {
  calculateGst,
  gstSettingsFor,
  totalWithGst,
} from "@/features/billing/domain/gst";
import type { GstSettings } from "@/features/billing/contracts/gst";
import { useCatalogue } from "../hooks/use-catalogue";
import { useSaveCatalogue } from "../hooks/use-save-catalogue";
import type { Catalogue } from "../contracts/catalogue";
import styles from "./catalogue.module.css";

export function GstSettingsPage() {
  const read = useCatalogue();
  const [base, setBase] = useState<Catalogue | null>(null);
  const catalogue = read.data?.catalogue;
  const gst = gstSettingsFor(catalogue);
  return (
    <>
      <QueryState
        loading={read.isLoading}
        error={read.error}
        retry={read.reload}
      />
      {catalogue && (
        <section className={`panel ${styles.defaultsPanel}`}>
          <div className={styles.sectionHead}>
            <div>
              <h2>GST on customer bills</h2>
              <p>Set the GST rate and how it applies to your garment prices.</p>
            </div>
            <button
              className="button primary"
              disabled={read.isRefreshing}
              onClick={() => setBase(structuredClone(catalogue))}
            >
              <Pencil size={15} /> Edit GST
            </button>
          </div>
          <div className={styles.defaultCards}>
            <div>
              <small>GST</small>
              <h3>
                {gst.enabled ? `${gst.rateBps / 100}% enabled` : "Disabled"}
              </h3>
              <p>
                {gst.priceMode === "exclusive"
                  ? "Added to garment prices"
                  : "Included in garment prices"}
              </p>
            </div>
            <div>
              <small>SHOP GSTIN</small>
              <h3>{gst.gstin || "Not entered"}</h3>
              <p>Printed on bills when GST is enabled.</p>
            </div>
          </div>
          <p className={styles.footnote}>
            New orders use these settings. For an existing unpaid order, use
            Apply GST under Payment details. Saved GST stays with that order
            when you change these settings.
          </p>
        </section>
      )}
      {base && catalogue && (
        <GstEditor
          base={base}
          current={catalogue}
          onClose={() => setBase(null)}
          onRefresh={read.reload}
        />
      )}
    </>
  );
}

function GstEditor({
  base,
  current,
  onClose,
  onRefresh,
}: {
  base: Catalogue;
  current: Catalogue;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const initial = gstSettingsFor(base);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [rate, setRate] = useState(String(initial.rateBps / 100));
  const [priceMode, setPriceMode] = useState(initial.priceMode);
  const [gstin, setGstin] = useState(initial.gstin);
  const write = useSaveCatalogue();
  const stale = current.revision !== base.revision;
  const validRate = /^\d{1,3}(\.\d{1,2})?$/.test(rate) && Number(rate) <= 100;
  const settings: GstSettings = {
    enabled,
    rateBps: Math.round(Number(rate) * 100),
    priceMode,
    gstin,
  };
  const example = validRate ? calculateGst(100_000, settings) : undefined;
  return (
    <Dialog
      title="GST settings"
      subtitle="Choose the rate used on new bills."
      onClose={onClose}
      busy={write.busy}
      className={styles.editorDialog}
    >
      <form
        className={styles.editorForm}
        onChange={() => write.setError("")}
        onSubmit={async (event) => {
          event.preventDefault();
          if (stale || write.busy) return;
          if (!validRate)
            return write.setError(
              "Enter a GST percentage from 0 to 100, with up to two decimal places.",
            );
          if (
            await write.save({ ...base, gst: settings }, "GST settings saved.")
          )
            onClose();
          else onRefresh();
        }}
      >
        <div className={styles.editorBody}>
          {stale && (
            <p className={styles.notice} role="alert">
              Settings changed while you were editing. Close and reopen this
              form to use the latest settings.
            </p>
          )}
          <fieldset
            className={`${styles.fieldset} ${styles.formStack}`}
            disabled={write.busy}
          >
            <label className="inline-row">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              Enable GST on new orders
            </label>
            <label className="field">
              GST percentage (%)
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.01"
                required
                value={rate}
                onChange={(event) => setRate(event.target.value)}
              />
              <small>Enter the GST rate used by your shop.</small>
            </label>
            <label className="field">
              Garment prices
              <select
                value={priceMode}
                onChange={(event) =>
                  setPriceMode(event.target.value as GstSettings["priceMode"])
                }
              >
                <option value="exclusive">Add GST to prices</option>
                <option value="inclusive">Prices already include GST</option>
              </select>
            </label>
            <label className="field">
              Shop GSTIN (optional)
              <input
                value={gstin}
                maxLength={15}
                autoCapitalize="characters"
                spellCheck={false}
                onChange={(event) => setGstin(event.target.value.toUpperCase())}
              />
            </label>
            {validRate && (
              <p className="note-box">
                For {money(100_000)} in garment prices: GST{" "}
                {money(example?.amount ?? 0)}
                {enabled && priceMode === "inclusive" ? " included" : ""}, bill
                total {money(totalWithGst(100_000, example))}.
              </p>
            )}
          </fieldset>
        </div>
        <div className={styles.editorFooter}>
          {write.error && (
            <p className="form-error" role="alert">
              {write.error}
            </p>
          )}
          <div className={styles.footerRow}>
            <button
              type="button"
              className="button"
              disabled={write.busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="button primary" disabled={write.busy || stale}>
              {write.busy ? "Saving…" : "Save GST settings"}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
