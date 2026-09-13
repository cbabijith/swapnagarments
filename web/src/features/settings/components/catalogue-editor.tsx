"use client";
import { useState, type FormEvent } from "react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { QueryState } from "@/shared/components/query-state";
import { useCatalogue } from "../hooks/use-catalogue";
import type {
  Catalogue,
  Garment,
  MeasurementField,
} from "../contracts/catalogue";
import { MeasurementFields } from "@/features/measurements/components/measurement-fields";
import styles from "./catalogue.module.css";

export function CatalogueSettings() {
  const read = useCatalogue();
  return (
    <section className="panel padded">
      <h2>Garments, measurements & defaults</h2>
      <p className="muted" style={{ margin: "8px 0 20px" }}>
        Set up what you stitch. Saved changes are available in customer profiles
        and new orders.
      </p>
      <QueryState
        loading={read.isLoading}
        error={read.error}
        retry={read.reload}
      />
      {read.data && <CatalogueEditor current={read.data.catalogue} />}
    </section>
  );
}
function CatalogueEditor({ current }: { current: Catalogue }) {
  const { send } = useWorkspace();
  const [draft, setDraft] = useState(() => structuredClone(current));
  const [selected, setSelected] = useState(current.defaultGarmentId);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [preview, setPreview] = useState<Record<string, string>>({});
  const garment =
    draft.garments.find((g) => g.id === selected) ?? draft.garments[0];
  function update(change: Partial<Garment>) {
    setDraft({
      ...draft,
      garments: draft.garments.map((g) =>
        g.id === garment.id ? { ...g, ...change } : g,
      ),
    });
  }
  function fieldUpdate(id: string, change: Partial<MeasurementField>) {
    update({
      fields: garment.fields.map((f) =>
        f.id === id ? { ...f, ...change } : f,
      ),
    });
  }
  function moveField(index: number, step: number) {
    const next = [...garment.fields];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    update({ fields: next });
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const normalized = {
      ...draft,
      garments: draft.garments.map((g) => ({
        ...g,
        fields: g.fields.map((f) => ({
          ...f,
          options: f.options.map((option) => option.trim()).filter(Boolean),
        })),
      })),
    };
    try {
      await send(
        { type: "settings.save", catalogue: normalized },
        "Shop settings saved.",
      );
      setDraft({ ...normalized, revision: draft.revision + 1 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save}>
      <fieldset disabled={busy} className={styles.fieldset}>
        {current.revision !== draft.revision && (
          <p className="note-box">
            Saved settings have changed. Your edits are still here. Reload
            before making further changes.
          </p>
        )}
        <div className={styles.defaults}>
          <label className="field">
            Default garment
            <select
              value={draft.defaultGarmentId}
              onChange={(e) =>
                setDraft({ ...draft, defaultGarmentId: e.target.value })
              }
            >
              {draft.garments
                .filter((g) => g.active)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            Suggested delivery after (days)
            <input
              type="number"
              min={0}
              max={365}
              required
              value={draft.leadDays}
              onChange={(e) =>
                setDraft({ ...draft, leadDays: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <div className={styles.layout}>
          <nav className={styles.list} aria-label="Garment settings">
            {draft.garments.map((g, index) => (
              <div className={styles.listRow} key={g.id}>
                <button
                  type="button"
                  className={`${styles.garmentButton} ${g.id === garment.id ? styles.active : ""}`}
                  onClick={() => {
                    setSelected(g.id);
                    setPreview({});
                  }}
                >
                  {g.name || "Unnamed garment"}
                  {!g.active && <small>Archived</small>}
                </button>
                <button
                  type="button"
                  aria-label={`Move ${g.name} up`}
                  disabled={!index}
                  onClick={() => {
                    const next = [...draft.garments];
                    [next[index - 1], next[index]] = [
                      next[index],
                      next[index - 1],
                    ];
                    setDraft({ ...draft, garments: next });
                  }}
                >
                  ↑
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button"
              disabled={draft.garments.length >= 50}
              onClick={() => {
                const id = crypto.randomUUID();
                setDraft({
                  ...draft,
                  garments: [
                    ...draft.garments,
                    {
                      id,
                      revision: 1,
                      name: "New garment",
                      active: true,
                      price: null,
                      unit: "in",
                      fields: [],
                      presets: [],
                    },
                  ],
                });
                setSelected(id);
              }}
            >
              + Add garment
            </button>
          </nav>
          <div className={styles.editor}>
            <div className={styles.defaults}>
              <label className="field">
                Garment or service name
                <input
                  required
                  maxLength={100}
                  value={garment.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </label>
              <label className="field">
                Default price (₹, optional)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={1000000}
                  value={garment.price === null ? "" : garment.price / 100}
                  onChange={(e) =>
                    update({
                      price: e.target.value
                        ? Math.round(Number(e.target.value) * 100)
                        : null,
                    })
                  }
                />
              </label>
            </div>
            <div className={styles.actions}>
              <label className="field">
                Measurement unit
                <select
                  value={garment.unit}
                  onChange={(e) => {
                    update({ unit: e.target.value as "in" | "cm" });
                    setPreview({});
                  }}
                >
                  <option value="in">Inches</option>
                  <option value="cm">Centimetres</option>
                </select>
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={garment.active}
                  onChange={(e) => update({ active: e.target.checked })}
                />{" "}
                Available for new orders
              </label>
              <button
                type="button"
                className="button"
                disabled={draft.garments.length >= 50}
                onClick={() => {
                  const copy = {
                    ...structuredClone(garment),
                    id: crypto.randomUUID(),
                    name: `${garment.name} copy`,
                    revision: 1,
                  };
                  setDraft({ ...draft, garments: [...draft.garments, copy] });
                  setSelected(copy.id);
                }}
              >
                Duplicate garment
              </button>
            </div>
            <h3>Measurement fields</h3>
            <p className="muted">
              Add dimensions, text instructions or choices. Empty templates are
              allowed for services without measurements. Mark essential fields
              as required.
            </p>
            {garment.fields.map((field, index) => (
              <div className={styles.fieldRow} key={field.id}>
                <div className={styles.defaults}>
                  <label className="field">
                    Field name
                    <input
                      required
                      maxLength={80}
                      value={field.label}
                      onChange={(e) =>
                        fieldUpdate(field.id, { label: e.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    Type
                    <select
                      value={field.type}
                      disabled={Boolean(
                        current.garments
                          .find((g) => g.id === garment.id)
                          ?.fields.some((f) => f.id === field.id),
                      )}
                      onChange={(e) =>
                        fieldUpdate(field.id, {
                          type: e.target.value as MeasurementField["type"],
                        })
                      }
                    >
                      <option value="number">Measurement</option>
                      <option value="text">Text</option>
                      <option value="select">Choice</option>
                    </select>
                  </label>
                </div>
                <label className="field">
                  How to measure / help (optional)
                  <input
                    maxLength={300}
                    value={field.help}
                    placeholder="e.g. Full body circumference, measured at the fullest point"
                    onChange={(e) =>
                      fieldUpdate(field.id, { help: e.target.value })
                    }
                  />
                </label>
                {field.type === "select" && (
                  <label className="field">
                    Choices (one per line)
                    <textarea
                      value={field.options.join("\n")}
                      onChange={(e) =>
                        fieldUpdate(field.id, {
                          options: e.target.value.split("\n"),
                        })
                      }
                    />
                  </label>
                )}
                <div className={styles.actions}>
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) =>
                        fieldUpdate(field.id, { required: e.target.checked })
                      }
                    />{" "}
                    Required before cutting
                  </label>
                  <button
                    type="button"
                    className="button"
                    disabled={index === 0}
                    aria-label={`Move ${field.label} up`}
                    onClick={() => moveField(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="button"
                    disabled={index === garment.fields.length - 1}
                    aria-label={`Move ${field.label} down`}
                    onClick={() => moveField(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => {
                      const fields = garment.fields.filter(
                        (f) => f.id !== field.id,
                      );
                      update({
                        fields,
                        presets: garment.presets.map((p) => ({
                          ...p,
                          values: Object.fromEntries(
                            Object.entries(p.values).filter(
                              ([key]) => key !== field.id,
                            ),
                          ),
                        })),
                      });
                    }}
                  >
                    Remove field
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="button"
              disabled={garment.fields.length >= 30}
              onClick={() =>
                update({
                  fields: [
                    ...garment.fields,
                    {
                      id: `field-${crypto.randomUUID()}`,
                      label: "New measurement",
                      type: "number",
                      required: false,
                      help: "",
                      options: [],
                    },
                  ],
                })
              }
            >
              + Add measurement field
            </button>
            <details className={styles.section}>
              <summary>Size presets (optional)</summary>
              <p className="muted">
                Use your own size chart. Presets are selected explicitly in an
                order; they never fill a new customer’s sizes automatically.
              </p>
              {garment.presets.map((preset) => (
                <div key={preset.id} className={styles.fieldRow}>
                  <label className="field">
                    Size name
                    <input
                      required
                      maxLength={80}
                      value={preset.name}
                      onChange={(e) =>
                        update({
                          presets: garment.presets.map((p) =>
                            p.id === preset.id
                              ? { ...p, name: e.target.value }
                              : p,
                          ),
                        })
                      }
                    />
                  </label>
                  <MeasurementFields
                    fields={garment.fields}
                    unit={garment.unit}
                    values={preset.values}
                    onChange={(values) =>
                      update({
                        presets: garment.presets.map((p) =>
                          p.id === preset.id ? { ...p, values } : p,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="button"
                    onClick={() =>
                      update({
                        presets: garment.presets.filter(
                          (p) => p.id !== preset.id,
                        ),
                      })
                    }
                  >
                    Remove preset
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="button"
                disabled={garment.presets.length >= 20}
                onClick={() =>
                  update({
                    presets: [
                      ...garment.presets,
                      { id: crypto.randomUUID(), name: "New size", values: {} },
                    ],
                  })
                }
              >
                + Add size preset
              </button>
            </details>
            <details className={styles.section}>
              <summary>Preview the measurement form</summary>
              <MeasurementFields
                fields={garment.fields}
                values={preview}
                unit={garment.unit}
                onChange={setPreview}
              />
              <p className="muted small">Preview values are not saved.</p>
            </details>
          </div>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className={styles.save}>
          <button className="button primary">
            {busy ? "Saving…" : "Save shop settings"}
          </button>
          <button
            className="button"
            type="button"
            onClick={() => {
              setDraft(structuredClone(current));
              setError("");
            }}
          >
            Reload saved settings
          </button>
          <span className="muted">
            Existing orders keep their agreed names, prices and measurements.
          </span>
        </div>
      </fieldset>
    </form>
  );
}
