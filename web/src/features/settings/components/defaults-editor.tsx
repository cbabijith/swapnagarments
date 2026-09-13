"use client";
import { useState } from "react";
import { Dialog } from "@/shared/components/ui";
import type { Catalogue } from "../contracts/catalogue";
import { useSaveCatalogue } from "../hooks/use-save-catalogue";
import { GarmentImage } from "@/features/design-library/components/asset-image";
import visualStyles from "./garment-visuals.module.css";
import styles from "./catalogue.module.css";

export function DefaultsEditor({
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
  const [garmentId, setGarmentId] = useState(base.defaultGarmentId),
    [leadDays, setLeadDays] = useState(String(base.leadDays)),
    [discard, setDiscard] = useState(false);
  const write = useSaveCatalogue(),
    stale = current.revision !== base.revision;
  function close() {
    if (write.busy) return;
    if (
      garmentId !== base.defaultGarmentId ||
      leadDays !== String(base.leadDays)
    )
      setDiscard(true);
    else onClose();
  }
  return (
    <Dialog
      title="Order defaults"
      subtitle="A starting point for each new order."
      onClose={close}
      busy={write.busy}
      className={styles.editorDialog}
    >
      <form
        className={styles.editorForm}
        onChange={() => write.setError("")}
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          if (stale || write.busy || discard) return;
          if (!/^\d+$/.test(leadDays) || Number(leadDays) > 365)
            return write.setError(
              "Choose a whole number of days from 0 to 365.",
            );
          if (
            await write.save(
              {
                ...base,
                defaultGarmentId: garmentId,
                leadDays: Number(leadDays),
              },
              "Order defaults updated.",
            )
          )
            onClose();
          else onRefresh();
        }}
      >
        <div className={styles.editorBody}>
          {stale && (
            <p className={styles.notice} role="alert">
              Settings changed while this editor was open. Close and reopen it
              before saving.
            </p>
          )}
          <fieldset
            disabled={write.busy}
            className={`${styles.fieldset} ${styles.formStack}`}
          >
            <label className="field">
              Default garment
              <span className={visualStyles.selectRow}>
                <GarmentImage
                  garment={
                    base.garments.find(
                      (garment) => garment.id === garmentId,
                    ) ?? { name: "" }
                  }
                  size={44}
                />
                <select
                  autoFocus
                  value={garmentId}
                  onChange={(e) => setGarmentId(e.target.value)}
                >
                  {base.garments
                    .filter((g) => g.active)
                    .map((g) => (
                      <option value={g.id} key={g.id}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </span>
              <small>
                Selected automatically for the first piece in a new order.
              </small>
            </label>
            <label className="field">
              Delivery after (days)
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={365}
                step={1}
                value={leadDays}
                onChange={(e) => setLeadDays(e.target.value)}
              />
              <small>
                0 means same day. You can change the date in each order.
              </small>
            </label>
          </fieldset>
        </div>
        <div className={styles.editorFooter}>
          {write.error && (
            <p className="form-error" role="alert">
              {write.error}
            </p>
          )}
          {discard ? (
            <div className={styles.footerRow}>
              <span role="alert">Discard unsaved changes?</span>
              <button
                type="button"
                className="button"
                onClick={() => setDiscard(false)}
              >
                Keep editing
              </button>
              <button type="button" className="button danger" onClick={onClose}>
                Discard
              </button>
            </div>
          ) : (
            <div className={styles.footerRow}>
              <small>Applies to new orders.</small>
              <button
                type="button"
                className="button"
                disabled={write.busy}
                onClick={close}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={write.busy || stale}
              >
                {write.busy ? "Saving…" : "Save defaults"}
              </button>
            </div>
          )}
        </div>
      </form>
    </Dialog>
  );
}
