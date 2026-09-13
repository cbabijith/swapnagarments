"use client";
import { useId } from "react";
import type { Garment } from "../contracts/catalogue";
import { garmentIllustrationIds } from "../contracts/garment-illustration";
import {
  garmentIllustrationLabels,
  resolveGarmentIllustration,
} from "../domain/garment-illustrations";
import { GarmentIllustration } from "./garment-illustration";
import styles from "./garment-visuals.module.css";

export function GarmentIllustrationPicker({
  garment,
  onChange,
}: {
  garment: Garment;
  onChange: (illustrationId: Garment["illustrationId"]) => void;
}) {
  const id = useId(),
    illustrationId = resolveGarmentIllustration(garment);
  const automatic = resolveGarmentIllustration({ name: garment.name });
  return (
    <details className={styles.illustrationPicker}>
      <summary className={styles.illustrationSummary}>
        <GarmentIllustration illustrationId={illustrationId} size={56} />
        <span>
          <strong>Garment image</strong>
          <small>
            {garment.illustrationId
              ? garmentIllustrationLabels[illustrationId]
              : `Automatic · ${garmentIllustrationLabels[illustrationId]}`}
          </small>
        </span>
        <span className={styles.changeLabel}>Change image</span>
      </summary>
      <fieldset className={styles.choices}>
        <legend>Choose a garment image</legend>
        <p>
          Use the same image in your catalogue, orders and customer
          measurements.
        </p>
        <div className={styles.imageGrid}>
          {[undefined, ...garmentIllustrationIds].map((value) => (
            <label className={styles.imageChoice} key={value ?? "auto"}>
              <input
                type="radio"
                name={`${id}-image`}
                value={value ?? "auto"}
                checked={garment.illustrationId === value}
                onChange={() => onChange(value)}
              />
              <GarmentIllustration
                illustrationId={value ?? automatic}
                size={64}
              />
              <span>
                {value ? garmentIllustrationLabels[value] : "Automatic"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </details>
  );
}
