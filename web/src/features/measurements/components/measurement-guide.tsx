"use client";
import type { MeasurementField } from "@/features/settings/contracts/catalogue";
import { measurementGuides, resolveGuideId } from "../domain/guides";
import { measurementGuideIds } from "../contracts/guide";
import { MeasurementIllustration } from "./measurement-illustration";
import styles from "./measurement-guide.module.css";

export function MeasurementGuideContent({
  field,
  unit,
}: {
  field: MeasurementField;
  unit: "in" | "cm";
}) {
  const guideId = resolveGuideId(field);
  if (!guideId) return null;
  const guide = measurementGuides[guideId];
  return (
    <div className={styles.guideContent}>
      <figure className={styles.figure}>
        <span>{guide.view} view</span>
        <MeasurementIllustration guideId={guideId} />
        <figcaption>
          {guide.kind === "Full circumference"
            ? "Measure the complete loop"
            : "1 Start · 2 End"}
        </figcaption>
      </figure>
      <div className={styles.instructions}>
        <div className={styles.meta}>
          <span>{guide.kind}</span>
          <span>{unit === "in" ? "Inches (in)" : "Centimetres (cm)"}</span>
        </div>
        <h4>{guide.title}</h4>
        <ol>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className={styles.tip}>{guide.tip}</p>
        {field.help && (
          <p className={styles.shopNote}>
            <strong>Shop instruction</strong>
            <span>{field.help}</span>
          </p>
        )}
        <p className={styles.caption}>
          Illustration shows placement, not a size or body-shape target. Confirm
          the shop’s measuring method.
        </p>
      </div>
    </div>
  );
}

export function MeasurementGuidePicker({
  field,
  unit,
  onChange,
}: {
  field: MeasurementField;
  unit: "in" | "cm";
  onChange: (field: MeasurementField) => void;
}) {
  if (field.type !== "number") return null;
  const automatic = resolveGuideId({ ...field, guideId: undefined });
  return (
    <div className={styles.picker}>
      <label className="field">
        Visual measurement guide
        <select
          aria-label="Visual measurement guide"
          value={field.guideId ?? "auto"}
          onChange={(e) => {
            const next = { ...field };
            if (e.target.value === "auto") delete next.guideId;
            else next.guideId = e.target.value as MeasurementField["guideId"];
            onChange(next);
          }}
        >
          <option value="auto">
            Match field name
            {automatic
              ? ` · ${measurementGuides[automatic].title}`
              : " · no match yet"}
          </option>
          <option value="none">No illustration</option>
          {measurementGuideIds.map((key) => (
            <option key={key} value={key}>
              {measurementGuides[key].title}
            </option>
          ))}
        </select>
        <small>
          Choose the guide that matches how your shop takes this measurement.
        </small>
      </label>
      {resolveGuideId(field) ? (
        <div className={styles.pickerPreview}>
          <MeasurementGuideContent field={field} unit={unit} />
        </div>
      ) : (
        <p className={styles.caption}>
          This field will use your written hint. You can select an illustration
          for custom field names.
        </p>
      )}
    </div>
  );
}
