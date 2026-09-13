"use client";
import { useEffect, useState } from "react";
import type { Garment } from "@/features/settings/contracts/catalogue";
import { AssetImage, GarmentImage } from "./asset-image";
import { LibraryBrowser } from "./library-browser";
import styles from "./library.module.css";
export function GarmentImageSetup({
  garment,
  onChange,
  onEditing,
}: {
  garment: Garment;
  onChange: (garment: Garment) => void;
  onEditing?: (editing: boolean) => void;
}) {
  const [browse, setBrowse] = useState<"main" | "reference" | null>(null);
  useEffect(() => {
    onEditing?.(Boolean(browse));
    return () => onEditing?.(false);
  }, [browse, onEditing]);
  if (browse)
    return (
      <LibraryBrowser
        key={browse}
        kind={browse === "main" ? "garment" : undefined}
        selectedIds={
          browse === "main" && garment.image
            ? [garment.image.id]
            : (garment.referenceImages ?? []).map((a) => a.id)
        }
        onBack={() => setBrowse(null)}
        onSelect={(a) => {
          if (browse === "main") onChange({ ...garment, image: a });
          else
            onChange({
              ...garment,
              referenceImages: [
                ...(garment.referenceImages ?? []).filter((r) => r.id !== a.id),
                a,
              ].slice(0, 4),
            });
          setBrowse(null);
        }}
      />
    );
  return (
    <div className={styles.imageSetup}>
      <div className={styles.row}>
        <GarmentImage garment={garment} size={64} />
        <div>
          <strong>Garment image</strong>
          <small>
            {garment.image?.label ??
              (garment.illustrationId
                ? "Saved garment illustration"
                : "Automatic image for this garment")}
          </small>
        </div>
        <button
          type="button"
          className="button"
          onClick={() => setBrowse("main")}
        >
          Change image
        </button>
      </div>
      {(garment.image || garment.illustrationId) && (
        <button
          type="button"
          className="text-link"
          style={{ textAlign: "left" }}
          onClick={() =>
            onChange({
              ...garment,
              image: undefined,
              illustrationId: undefined,
            })
          }
        >
          Use automatic image
        </button>
      )}
      <details className={styles.details}>
        <summary>
          Back & detail references{" "}
          <small>{garment.referenceImages?.length ?? 0} / 4</small>
        </summary>
        <div>
          {(garment.referenceImages ?? []).map((a) => (
            <div className={styles.reference} key={a.id}>
              <AssetImage asset={a} size={48} />
              <span>{a.label}</span>
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  onChange({
                    ...garment,
                    referenceImages: garment.referenceImages?.filter(
                      (r) => r.id !== a.id,
                    ),
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
          {(garment.referenceImages?.length ?? 0) < 4 && (
            <button
              type="button"
              className="text-link"
              onClick={() => setBrowse("reference")}
            >
              + Add reference image
            </button>
          )}
        </div>
      </details>
    </div>
  );
}
