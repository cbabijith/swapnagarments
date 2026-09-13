"use client";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { AssetRef } from "../contracts";
import { previewImage } from "../domain/preview-library";
import { garmentImage } from "../domain/designs";
import type { Garment } from "@/features/settings/contracts/catalogue";
import styles from "./library.module.css";
import artwork from "../domain/builtin-artwork.json";

const builtinArtwork: Record<string, string> = artwork;

export function AssetImage({
  asset,
  size = 64,
  full = false,
  decorative = true,
  workCode,
}: {
  asset: AssetRef;
  size?: number;
  full?: boolean;
  decorative?: boolean;
  workCode?: string;
}) {
  const src = asset.id.startsWith("upload-")
    ? (previewImage(asset.id) ??
      `/api/design-library/${encodeURIComponent(asset.id)}/image?size=${full ? "full" : "thumb"}${workCode ? `&work=${encodeURIComponent(workCode)}` : ""}`)
    : (builtinArtwork[asset.id] ??
      `/design-library/v1/${encodeURIComponent(asset.id)}.svg`);
  const [failed, setFailed] = useState("");
  if (failed === src)
    return (
      <span
        className={styles.missing}
        style={{ width: size, height: full ? undefined : size }}
        role="img"
        aria-label={`${asset.label}: image unavailable`}
      >
        <ImageOff size={20} />
        {full && (
          <span>
            Image unavailable.{" "}
            <button
              type="button"
              className="text-link"
              onClick={() => setFailed("")}
            >
              Retry
            </button>
          </span>
        )}
      </span>
    );
  // Files are already resized on upload; private images require the owner's cookie.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={full ? styles.fullImage : styles.image}
      src={src}
      width={size}
      height={full ? undefined : size}
      alt={decorative ? "" : asset.label}
      loading={full || builtinArtwork[asset.id] ? "eager" : "lazy"}
      onError={() => setFailed(src)}
      data-design-asset={asset.id}
    />
  );
}
export function GarmentImage({
  garment,
  size = 48,
}: {
  garment: Pick<Garment, "name" | "illustrationId" | "image">;
  size?: number;
}) {
  return <AssetImage asset={garmentImage(garment)} size={size} />;
}
