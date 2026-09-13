"use client";
import { useId, useState } from "react";
import type { MeasurementField } from "@/features/settings/contracts/catalogue";
import type { MeasurementSnapshot } from "../contracts/profiles";
import styles from "./measurements.module.css";

export function MeasurementFields({
  fields,
  values,
  unit,
  onChange,
  required = false,
  disabled = false,
}: {
  fields: MeasurementField[];
  values: Record<string, string>;
  unit: "in" | "cm";
  onChange: (values: Record<string, string>) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const prefix = useId();
  return (
    <div className={styles.grid}>
      {fields.map((field) => (
        <label className="field" key={field.id}>
          <span>
            {field.label}
            {field.type === "number" ? ` (${unit})` : ""}
            {field.required ? " *" : ""}
          </span>
          {field.type === "select" ? (
            <select
              aria-label={`${field.label}${field.required ? " *" : ""}`}
              aria-describedby={
                field.help ? `${prefix}-${field.id}-help` : undefined
              }
              disabled={disabled}
              value={values[field.id] ?? ""}
              required={required && field.required}
              onChange={(e) =>
                onChange({ ...values, [field.id]: e.target.value })
              }
            >
              <option value="">Choose…</option>
              {field.options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input
              aria-label={`${field.label}${field.type === "number" ? ` (${unit})` : ""}${field.required ? " *" : ""}`}
              aria-describedby={
                field.help ? `${prefix}-${field.id}-help` : undefined
              }
              disabled={disabled}
              type={field.type === "number" ? "number" : "text"}
              inputMode={field.type === "number" ? "decimal" : "text"}
              step="any"
              min={field.type === "number" ? "0.01" : undefined}
              max={
                field.type === "number"
                  ? unit === "in"
                    ? 150
                    : 381
                  : undefined
              }
              maxLength={500}
              value={values[field.id] ?? ""}
              required={required && field.required}
              onChange={(e) =>
                onChange({ ...values, [field.id]: e.target.value })
              }
            />
          )}
          {field.help && (
            <small id={`${prefix}-${field.id}-help`}>{field.help}</small>
          )}
        </label>
      ))}
    </div>
  );
}
export function AddMeasurementField({
  onAdd,
  existingLabels,
}: {
  onAdd: (field: MeasurementField) => void;
  existingLabels: string[];
}) {
  const [adding, setAdding] = useState(false),
    [label, setLabel] = useState("");
  const duplicate = existingLabels.some(
    (l) => l.toLowerCase() === label.trim().toLowerCase(),
  );
  return (
    <div className={styles.extra}>
      {adding ? (
        <div className={styles.row}>
          <label className="field">
            Extra measurement name
            <input
              autoFocus
              value={label}
              maxLength={80}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="e.g. Cuff width"
            />
          </label>
          <button
            type="button"
            className="button"
            disabled={!label.trim() || duplicate}
            onClick={() => {
              onAdd({
                id: `custom-${crypto.randomUUID()}`,
                label: label.trim(),
                type: "number",
                required: false,
                options: [],
                help: "",
              });
              setLabel("");
              setAdding(false);
            }}
          >
            Add to this piece
          </button>
          <button
            type="button"
            className="button subtle"
            onClick={() => setAdding(false)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="text-link"
          onClick={() => setAdding(true)}
        >
          + Add a measurement for this piece
        </button>
      )}
    </div>
  );
}
export function MeasurementSummary({
  snapshot,
}: {
  snapshot?: MeasurementSnapshot;
}) {
  if (!snapshot)
    return (
      <p className={styles.legacy}>
        Original measurements were not recorded for this older piece.
      </p>
    );
  return (
    <section className={styles.summary} aria-label="Piece measurements">
      <p>
        <strong>
          {snapshot.confirmed
            ? "Confirmed measurements"
            : "Measurements pending"}
        </strong>{" "}
        · {snapshot.unit === "in" ? "Inches" : "Centimetres"}
      </p>
      <dl className={styles.values}>
        {snapshot.fields.map((field) => (
          <div key={field.id}>
            <dt>{field.label}</dt>
            <dd>
              {snapshot.values[field.id] || "—"}
              {snapshot.values[field.id] && field.type === "number"
                ? ` ${snapshot.unit}`
                : ""}
            </dd>
          </div>
        ))}
      </dl>
      <p className="muted small">
        Recorded {new Date(snapshot.recordedAt).toLocaleDateString("en-IN")} ·{" "}
        {snapshot.recordedBy}
        {snapshot.source === "legacy"
          ? " · Copied from legacy profile and reviewed"
          : ""}
      </p>
    </section>
  );
}
