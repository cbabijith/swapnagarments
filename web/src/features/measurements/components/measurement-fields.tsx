"use client";
import { useId, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { MeasurementField } from "@/features/settings/contracts/catalogue";
import type { MeasurementSnapshot } from "../contracts/profiles";
import styles from "./measurements.module.css";
import guideStyles from "./measurement-guide.module.css";
import { resolveGuideId } from "../domain/guides";
import { MeasurementIllustration } from "./measurement-illustration";
import {
  MeasurementGuideContent,
  MeasurementGuidePicker,
} from "./measurement-guide";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panel = useRef<HTMLElement>(null);
  const guidedFields = fields.filter((field) => resolveGuideId(field));
  const selected = selectedId
    ? (guidedFields.find((field) => field.id === selectedId) ?? guidedFields[0])
    : null;
  const index = selected
    ? guidedFields.findIndex((field) => field.id === selected.id)
    : -1;
  function showGuide(fieldId: string) {
    setSelectedId(fieldId);
    requestAnimationFrame(() =>
      panel.current?.scrollIntoView({ block: "start", behavior: "instant" }),
    );
  }
  function closeGuide(focusToggle = false) {
    setSelectedId(null);
    if (focusToggle) document.getElementById(`${prefix}-guide-toggle`)?.focus();
  }
  return (
    <>
      {!!guidedFields.length && (
        <div className={guideStyles.toolbar}>
          <button
            id={`${prefix}-guide-toggle`}
            type="button"
            className={guideStyles.toggle}
            aria-expanded={Boolean(selected)}
            aria-controls={`${prefix}-guide-panel`}
            onClick={() =>
              selected ? closeGuide() : showGuide(guidedFields[0].id)
            }
          >
            <BookOpen size={15} />
            {selected ? "Hide measuring guide" : "How to measure"}
          </button>
          <span>Tap a body diagram for guidance</span>
        </div>
      )}
      {selected && (
        <section
          id={`${prefix}-guide-panel`}
          ref={panel}
          className={guideStyles.panel}
          aria-label={`Measuring guide for ${selected.label}`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              closeGuide(true);
            }
          }}
        >
          <div className={guideStyles.panelHead}>
            <h3>How to measure: {selected.label}</h3>
            <button
              type="button"
              aria-label="Close measuring guide"
              onClick={() => closeGuide(true)}
            >
              <X size={17} />
            </button>
          </div>
          <MeasurementGuideContent field={selected} unit={unit} />
          <div className={guideStyles.panelFoot}>
            <span>
              Guide {index + 1} of {guidedFields.length}
            </span>
            <button
              type="button"
              aria-label="Previous measurement guide"
              disabled={index <= 0}
              onClick={() => setSelectedId(guidedFields[index - 1].id)}
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <button
              type="button"
              aria-label="Next measurement guide"
              disabled={index === guidedFields.length - 1}
              onClick={() => setSelectedId(guidedFields[index + 1].id)}
            >
              Next
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                const fieldId = selected.id;
                closeGuide();
                requestAnimationFrame(() =>
                  document.getElementById(`${prefix}-${fieldId}`)?.focus(),
                );
              }}
            >
              Enter value
            </button>
          </div>
        </section>
      )}
      <div className={styles.grid}>
        {fields.map((field) => {
          const guideId = resolveGuideId(field);
          return (
            <div className={guideStyles.fieldCell} key={field.id}>
              {guideId && (
                <button
                  type="button"
                  className={guideStyles.thumbnail}
                  aria-label={`How to measure ${field.label}`}
                  aria-expanded={selected?.id === field.id}
                  aria-controls={`${prefix}-guide-panel`}
                  onClick={() => showGuide(field.id)}
                >
                  <MeasurementIllustration guideId={guideId} decorative mini />
                </button>
              )}
              <label className="field" htmlFor={`${prefix}-${field.id}`}>
                <span>
                  {field.label}
                  {field.type === "number" ? ` (${unit})` : ""}
                  {field.required ? " *" : ""}
                </span>
                {field.type === "select" ? (
                  <select
                    id={`${prefix}-${field.id}`}
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
                    id={`${prefix}-${field.id}`}
                    onFocus={() => {
                      if (selected && guideId) setSelectedId(field.id);
                    }}
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
            </div>
          );
        })}
      </div>
    </>
  );
}
export function AddMeasurementField({
  onAdd,
  existingLabels,
  unit,
}: {
  onAdd: (field: MeasurementField) => void;
  existingLabels: string[];
  unit: "in" | "cm";
}) {
  const [adding, setAdding] = useState(false),
    [label, setLabel] = useState(""),
    [guideId, setGuideId] = useState<MeasurementField["guideId"]>(undefined);
  const duplicate = existingLabels.some(
    (l) => l.toLowerCase() === label.trim().toLowerCase(),
  );
  return (
    <div className={styles.extra}>
      {adding ? (
        <div className={styles.extraEditor}>
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
                  ...(guideId ? { guideId } : {}),
                });
                setLabel("");
                setGuideId(undefined);
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
          <MeasurementGuidePicker
            field={{
              id: "extra-preview",
              label,
              type: "number",
              required: false,
              options: [],
              help: "",
              guideId,
            }}
            unit={unit}
            onChange={(field) => setGuideId(field.guideId)}
          />
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
