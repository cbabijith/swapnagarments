"use client";
import { useState } from "react";
import { Dialog } from "@/shared/components/ui";
import type { AssetRef, DesignSnapshot } from "../contracts";
import { kindLabels } from "../contracts";
import { AssetImage } from "./asset-image";
import styles from "./library.module.css";
export function DesignSummary({ design }: { design?: DesignSnapshot }) {
  const [view, setView] = useState<AssetRef | null>(null);
  if (
    !design ||
    (!design.choices.length &&
      !design.references.length &&
      !design.garmentReferences.length &&
      !design.notes)
  )
    return null;
  return (
    <div className={styles.snapshot}>
      <h4>
        Saved design{" "}
        <span className="muted small no-print">· tap an image to enlarge</span>
      </h4>
      <div className={styles.row}>
        {[
          ...design.choices,
          ...design.garmentReferences,
          ...design.references,
        ].map((a, i) => (
          <div key={`${a.id}-${i}`}>
            <button
              type="button"
              aria-label={`Enlarge saved ${a.label}`}
              onClick={() => setView(a)}
            >
              <AssetImage asset={a} size={56} decorative={false} />
            </button>
            <span>
              <strong>
                {kindLabels[a.kind]} · {a.view}
              </strong>
              <span>{a.label}</span>
            </span>
          </div>
        ))}
      </div>
      {design.notes && <p>{design.notes}</p>}
      {view && (
        <Dialog
          title={view.label}
          subtitle={`${kindLabels[view.kind]} · ${view.view} · saved with this order`}
          onClose={() => setView(null)}
        >
          <div className={styles.panel}>
            <AssetImage asset={view} size={440} full decorative={false} />
          </div>
        </Dialog>
      )}
    </div>
  );
}
