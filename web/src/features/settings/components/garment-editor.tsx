"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Ruler,
  Layers,
  Eye,
  Info,
} from "lucide-react";
import { Dialog } from "@/shared/components/ui";
import { MeasurementFields } from "@/features/measurements/components/measurement-fields";
import { validateValues } from "@/features/measurements/domain/values";
import {
  garmentSchema,
  fieldSchema,
  type Catalogue,
  type Garment,
  type MeasurementField,
} from "../contracts/catalogue";
import { useSaveCatalogue } from "../hooks/use-save-catalogue";
import { SettingsTabs } from "./settings-tabs";
import styles from "./catalogue.module.css";

type Tab = "details" | "fields" | "presets";
type Preset = Garment["presets"][number];
type Stage =
  | { kind: "main" }
  | { kind: "field"; value: MeasurementField; isNew: boolean; choices: string }
  | { kind: "preset"; value: Preset; isNew: boolean }
  | { kind: "preview"; values: Record<string, string> };

export function GarmentEditor({
  initial,
  base,
  current,
  isNew,
  onClose,
  onRefresh,
}: {
  initial: Garment;
  base: Catalogue;
  current: Catalogue;
  isNew: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(initial));
  const [price, setPrice] = useState(
    initial.price === null ? "" : String(initial.price / 100),
  );
  const [tab, setTab] = useState<Tab>("details"),
    [stage, setStage] = useState<Stage>({ kind: "main" });
  const [discard, setDiscard] = useState(false),
    [removed, setRemoved] = useState<{ before: Garment; label: string } | null>(
      null,
    );
  const write = useSaveCatalogue(),
    id = useId(),
    body = useRef<HTMLDivElement>(null);
  const stale = current.revision !== base.revision;
  const unitChanged = !isNew && draft.unit !== initial.unit;
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(initial) ||
    price !== (initial.price === null ? "" : String(initial.price / 100)) ||
    stage.kind === "field" ||
    stage.kind === "preset";
  function close() {
    if (write.busy) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  function change(next: Garment) {
    setDraft(next);
    setRemoved(null);
    write.setError("");
  }
  function open(next: Stage) {
    setStage(next);
    write.setError("");
    setDiscard(false);
    body.current?.scrollTo(0, 0);
  }
  function changeTab(next: Tab) {
    setTab(next);
    body.current?.scrollTo(0, 0);
  }
  function addField() {
    open({
      kind: "field",
      isNew: true,
      choices: "",
      value: {
        id: crypto.randomUUID(),
        label: "",
        type: "number",
        required: false,
        help: "",
        options: [],
      },
    });
  }
  function remove(kind: "field" | "preset", key: string) {
    const next = structuredClone(draft);
    const label =
      kind === "field"
        ? next.fields.find((f) => f.id === key)!.label
        : next.presets.find((p) => p.id === key)!.name;
    if (kind === "field") {
      next.fields = next.fields.filter((f) => f.id !== key);
      for (const preset of next.presets) delete preset.values[key];
    } else next.presets = next.presets.filter((p) => p.id !== key);
    setRemoved({ before: draft, label });
    setDraft(next);
    write.setError("");
  }
  function moveField(index: number, direction: number) {
    const fields = [...draft.fields],
      target = index + direction;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    change({ ...draft, fields });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (write.busy || discard) return;
    write.setError("");
    if (stage.kind === "field") {
      const field = {
        ...stage.value,
        label: stage.value.label.trim(),
        options:
          stage.value.type === "select"
            ? stage.choices
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
      };
      if (!field.label) return write.setError("Give this measurement a name.");
      if (
        draft.fields.some(
          (f) =>
            f.id !== field.id &&
            f.label.toLowerCase() === field.label.toLowerCase(),
        )
      )
        return write.setError("A field with this name already exists.");
      if (field.type === "select" && !field.options.length)
        return write.setError("Add at least one choice, one per line.");
      if (
        new Set(field.options.map((s) => s.toLowerCase())).size !==
        field.options.length
      )
        return write.setError("Each choice must have a different name.");
      const parsed = fieldSchema.safeParse(field);
      if (!parsed.success)
        return write.setError(parsed.error.issues[0].message);
      // Preserve saved presets when editing a choice list; invalidated values must be reviewed.
      const invalid = draft.presets.find(
        (p) =>
          p.values[field.id] &&
          field.type === "select" &&
          !field.options.includes(p.values[field.id]),
      );
      if (invalid)
        return write.setError(
          `The “${invalid.name}” preset uses a choice you removed. Update that preset first.`,
        );
      change({
        ...draft,
        fields: stage.isNew
          ? [...draft.fields, parsed.data]
          : draft.fields.map((f) => (f.id === field.id ? parsed.data : f)),
      });
      open({ kind: "main" });
      return;
    }
    if (stage.kind === "preset") {
      const preset = { ...stage.value, name: stage.value.name.trim() };
      if (!preset.name) return write.setError("Give this size preset a name.");
      if (
        draft.presets.some(
          (p) =>
            p.id !== preset.id &&
            p.name.toLowerCase() === preset.name.toLowerCase(),
        )
      )
        return write.setError("A size preset with this name already exists.");
      try {
        preset.values = validateValues(
          draft.fields,
          preset.values,
          draft.unit,
          false,
        );
      } catch (error) {
        return write.setError(
          error instanceof Error
            ? error.message
            : "Review the preset measurements.",
        );
      }
      if (!Object.keys(preset.values).length)
        return write.setError("Enter at least one value for this size preset.");
      change({
        ...draft,
        presets: stage.isNew
          ? [...draft.presets, preset]
          : draft.presets.map((p) => (p.id === preset.id ? preset : p)),
      });
      open({ kind: "main" });
      return;
    }
    if (stage.kind !== "main" || stale) return;
    if (!draft.name.trim()) {
      changeTab("details");
      return write.setError("Enter a garment or service name.");
    }
    if (
      price.trim() &&
      (!/^\d+(\.\d{1,2})?$/.test(price.trim()) ||
        Number(price) <= 0 ||
        Number(price) > 1_000_000)
    ) {
      changeTab("details");
      return write.setError(
        "Enter a price from ₹0.01 to ₹10,00,000, with at most two decimal places.",
      );
    }
    const parsed = garmentSchema.safeParse({
      ...draft,
      name: draft.name.trim(),
      price: price.trim() ? Math.round(Number(price) * 100) : null,
    });
    if (!parsed.success) return write.setError(parsed.error.issues[0].message);
    const next = {
      ...base,
      garments: isNew
        ? [...base.garments, parsed.data]
        : base.garments.map((g) => (g.id === draft.id ? parsed.data : g)),
    };
    if (
      await write.save(
        next,
        `${parsed.data.name} ${isNew ? "added" : "updated"}.`,
      )
    )
      onClose();
    else onRefresh();
  }
  const title =
    stage.kind === "field"
      ? `${stage.isNew ? "Add" : "Edit"} measurement field`
      : stage.kind === "preset"
        ? `${stage.isNew ? "Add" : "Edit"} size preset`
        : stage.kind === "preview"
          ? "Preview measurements"
          : isNew
            ? "Add garment or service"
            : `Edit ${initial.name}`;
  const subtitle =
    stage.kind === "main"
      ? "Set up the details once. Use them in every new order."
      : `${draft.name || "New garment"} · ${stage.kind === "preview" ? "Try the form your order will use. Values here are not saved." : "Apply this change, then save your garment."}`;
  return (
    <Dialog
      title={title}
      subtitle={subtitle}
      onClose={close}
      wide
      busy={write.busy}
      className={styles.editorDialog}
    >
      <form
        onSubmit={(e) => void submit(e)}
        onChange={() => write.setError("")}
        noValidate
        className={styles.editorForm}
      >
        {stage.kind === "main" && (
          <div className={styles.editorTabs}>
            <SettingsTabs
              id={id}
              label="Garment setup"
              value={tab}
              onChange={changeTab}
              disabled={write.busy}
              items={[
                { value: "details", label: "Details" },
                {
                  value: "fields",
                  label: "Measurements",
                  count: draft.fields.length,
                },
                {
                  value: "presets",
                  label: "Size presets",
                  count: draft.presets.length,
                },
              ]}
            />
          </div>
        )}
        <div className={styles.editorBody} ref={body}>
          {stale && (
            <p className={styles.notice} role="alert">
              Settings were updated while this editor was open. Close and reopen
              it before saving; your draft is still here for reference.
            </p>
          )}
          {stage.kind !== "main" && (
            <button
              type="button"
              className={styles.backButton}
              disabled={write.busy}
              onClick={() => open({ kind: "main" })}
            >
              <ArrowLeft size={16} />
              Back to{" "}
              {stage.kind === "preset" ? "size presets" : "measurements"}
            </button>
          )}
          <fieldset disabled={write.busy} className={styles.fieldset}>
            {stage.kind === "main" && (
              <div
                id={`${id}-panel-${tab}`}
                role="tabpanel"
                aria-labelledby={`${id}-tab-${tab}`}
              >
                {tab === "details" && (
                  <div className={styles.formStack}>
                    <label className="field">
                      Garment / service name
                      <input
                        autoFocus
                        maxLength={100}
                        value={draft.name}
                        onChange={(e) =>
                          change({ ...draft, name: e.target.value })
                        }
                        placeholder="e.g. Designer blouse or Alteration"
                      />
                    </label>
                    <div className={styles.twoColumns}>
                      <label className="field">
                        Default price (₹)
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0.01"
                          max="1000000"
                          step="0.01"
                          value={price}
                          onChange={(e) => {
                            setPrice(e.target.value);
                            write.setError("");
                          }}
                          placeholder="Enter per order"
                        />
                        <small>
                          Optional. You can change it for each piece.
                        </small>
                      </label>
                      <label className="field">
                        Measurement unit
                        <select
                          value={draft.unit}
                          disabled={draft.presets.length > 0}
                          onChange={(e) =>
                            change({
                              ...draft,
                              unit: e.target.value as "in" | "cm",
                            })
                          }
                        >
                          <option value="in">Inches (in)</option>
                          <option value="cm">Centimetres (cm)</option>
                        </select>
                        <small>
                          {draft.presets.length
                            ? "Remove size presets before changing units, then re-enter their values."
                            : "Used for all numeric measurements."}
                        </small>
                      </label>
                    </div>
                    {isNew && !draft.fields.length && (
                      <label className="field">
                        Start with a measurement template
                        <select
                          value=""
                          onChange={(e) => {
                            const source = base.garments.find(
                              (g) => g.id === e.target.value,
                            );
                            if (source)
                              change({
                                ...draft,
                                unit: source.unit,
                                fields: structuredClone(source.fields),
                                presets: structuredClone(source.presets),
                              });
                          }}
                        >
                          <option value="">Start from scratch</option>
                          {base.garments
                            .filter((g) => g.fields.length)
                            .map((g) => (
                              <option value={g.id} key={g.id}>
                                Copy from {g.name} · {g.fields.length} fields
                              </option>
                            ))}
                        </select>
                        <small>
                          Copy an existing template, or add your own fields in
                          Measurements.
                        </small>
                      </label>
                    )}
                    <label className={styles.statusControl}>
                      <input
                        type="checkbox"
                        checked={draft.active}
                        disabled={draft.id === base.defaultGarmentId}
                        onChange={(e) =>
                          change({ ...draft, active: e.target.checked })
                        }
                      />
                      <span>
                        <strong>Available for new orders</strong>
                        <small>
                          {draft.id === base.defaultGarmentId
                            ? "This is your default garment. Choose another default before archiving it."
                            : "Turn off to archive. Existing orders keep their details."}
                        </small>
                      </span>
                    </label>
                    <div className={styles.nextStep}>
                      <Ruler size={20} />
                      <div>
                        <strong>
                          {draft.fields.length
                            ? `${draft.fields.length} measurement fields ready`
                            : "Does this garment need measurements?"}
                        </strong>
                        <p>
                          {draft.fields.length
                            ? "Review the fields or add sizes your shop uses often."
                            : "Add only what you need. Services can have no measurements."}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => changeTab("fields")}
                      >
                        {draft.fields.length ? "Review" : "Set up"}
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                )}
                {tab === "fields" && (
                  <>
                    <div className={styles.subHead}>
                      <div>
                        <h3>Measurement fields</h3>
                        <p>
                          Ask for the right details, in the order you use them.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="button"
                        disabled={draft.fields.length >= 30}
                        onClick={addField}
                      >
                        <Plus size={16} />
                        Add field
                      </button>
                    </div>
                    {!!draft.fields.length && (
                      <div className={styles.listTools}>
                        <span>
                          {draft.unit === "in" ? "Inches" : "Centimetres"} ·{" "}
                          {draft.fields.length}/30 fields
                        </span>
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => open({ kind: "preview", values: {} })}
                        >
                          <Eye size={15} />
                          Preview form
                        </button>
                      </div>
                    )}
                    <ul className={styles.compactList}>
                      {draft.fields.map((field, index) => (
                        <li key={field.id}>
                          <span className={styles.rowNumber}>
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <button
                            type="button"
                            className={styles.itemName}
                            onClick={() =>
                              open({
                                kind: "field",
                                value: structuredClone(field),
                                choices: field.options.join("\n"),
                                isNew: false,
                              })
                            }
                          >
                            <strong>{field.label}</strong>
                            <small>
                              {field.type === "number"
                                ? `Number · ${draft.unit}`
                                : field.type === "select"
                                  ? `${field.options.length} choices`
                                  : "Text"}
                              {field.required ? " · Required" : " · Optional"}
                            </small>
                          </button>
                          <div className={styles.itemActions}>
                            <button
                              type="button"
                              aria-label={`Move ${field.label} up`}
                              disabled={index === 0}
                              onClick={() => moveField(index, -1)}
                            >
                              <ArrowUp size={15} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Move ${field.label} down`}
                              disabled={index === draft.fields.length - 1}
                              onClick={() => moveField(index, 1)}
                            >
                              <ArrowDown size={15} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Edit ${field.label} field`}
                              onClick={() =>
                                open({
                                  kind: "field",
                                  value: structuredClone(field),
                                  choices: field.options.join("\n"),
                                  isNew: false,
                                })
                              }
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove ${field.label} field`}
                              onClick={() => remove("field", field.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {!draft.fields.length && (
                      <div className={styles.empty}>
                        <Ruler size={28} />
                        <h3>No measurement fields yet</h3>
                        <p>
                          Add numbers, text or choices. Leave this empty for
                          services that do not need measurements.
                        </p>
                        <button
                          type="button"
                          className="text-link"
                          onClick={addField}
                        >
                          Add your first field
                        </button>
                      </div>
                    )}
                  </>
                )}
                {tab === "presets" && (
                  <>
                    {unitChanged && (
                      <p className={styles.notice}>
                        Save the new measurement unit first, then reopen this
                        garment to add size presets in{" "}
                        {draft.unit === "in" ? "inches" : "centimetres"}.
                      </p>
                    )}
                    <div className={styles.subHead}>
                      <div>
                        <h3>Reusable size presets</h3>
                        <p>
                          Save common sizes to fill measurements with one click.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="button"
                        disabled={
                          unitChanged ||
                          !draft.fields.length ||
                          draft.presets.length >= 20
                        }
                        onClick={() =>
                          open({
                            kind: "preset",
                            isNew: true,
                            value: {
                              id: crypto.randomUUID(),
                              name: "",
                              values: {},
                            },
                          })
                        }
                      >
                        <Plus size={16} />
                        Add preset
                      </button>
                    </div>
                    <ul className={styles.compactList}>
                      {draft.presets.map((preset) => (
                        <li key={preset.id}>
                          <span className={styles.tileIcon}>
                            <Layers size={18} />
                          </span>
                          <button
                            type="button"
                            className={styles.itemName}
                            onClick={() =>
                              open({
                                kind: "preset",
                                isNew: false,
                                value: structuredClone(preset),
                              })
                            }
                          >
                            <strong>{preset.name}</strong>
                            <small>
                              {
                                Object.values(preset.values).filter(Boolean)
                                  .length
                              }{" "}
                              of {draft.fields.length} fields filled ·{" "}
                              {draft.unit}
                            </small>
                          </button>
                          <div className={styles.itemActions}>
                            <button
                              type="button"
                              aria-label={`Edit ${preset.name} preset`}
                              onClick={() =>
                                open({
                                  kind: "preset",
                                  isNew: false,
                                  value: structuredClone(preset),
                                })
                              }
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove ${preset.name} preset`}
                              onClick={() => remove("preset", preset.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {!draft.presets.length && !unitChanged && (
                      <div className={styles.empty}>
                        <Layers size={28} />
                        <h3>
                          {draft.fields.length
                            ? "Your common sizes, ready to reuse"
                            : "Add measurement fields first"}
                        </h3>
                        <p>
                          {draft.fields.length
                            ? "Create presets such as Small, Medium or your shop’s standard fit. Each can be adjusted in an order."
                            : "A size preset fills in your measurement fields. Set those up, then return here."}
                        </p>
                        <button
                          type="button"
                          className="text-link"
                          onClick={() =>
                            draft.fields.length
                              ? open({
                                  kind: "preset",
                                  isNew: true,
                                  value: {
                                    id: crypto.randomUUID(),
                                    name: "",
                                    values: {},
                                  },
                                })
                              : changeTab("fields")
                          }
                        >
                          {draft.fields.length
                            ? "Add your first preset"
                            : "Set up measurements"}
                        </button>
                      </div>
                    )}
                    {!!draft.presets.length && (
                      <p className={styles.footnote}>
                        Presets are suggestions. Confirm each customer’s
                        measurements before stitching.
                      </p>
                    )}
                  </>
                )}
                {removed && tab !== "details" && (
                  <p className={styles.undo} role="status">
                    {removed.label} removed from this draft.
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => {
                        setDraft(removed.before);
                        setRemoved(null);
                      }}
                    >
                      Undo
                    </button>
                  </p>
                )}
              </div>
            )}
            {stage.kind === "field" && (
              <div className={styles.formStack}>
                <label className="field">
                  Field name
                  <input
                    autoFocus
                    maxLength={80}
                    value={stage.value.label}
                    onChange={(e) =>
                      setStage({
                        ...stage,
                        value: { ...stage.value, label: e.target.value },
                      })
                    }
                    placeholder="e.g. Sleeve length"
                  />
                </label>
                <label className="field">
                  Answer type
                  <select
                    value={stage.value.type}
                    disabled={
                      !isNew &&
                      initial.fields.some((f) => f.id === stage.value.id)
                    }
                    onChange={(e) =>
                      setStage({
                        ...stage,
                        value: {
                          ...stage.value,
                          type: e.target.value as MeasurementField["type"],
                        },
                      })
                    }
                  >
                    <option value="number">
                      Number — measurement in {draft.unit}
                    </option>
                    <option value="text">Text — notes or a short answer</option>
                    <option value="select">
                      Choice — pick from your options
                    </option>
                  </select>
                  <small>
                    {!isNew &&
                    initial.fields.some((f) => f.id === stage.value.id)
                      ? "Saved fields keep their answer type. Add a new field for a different type."
                      : "Choose the easiest way to enter this detail."}
                  </small>
                </label>
                {stage.value.type === "select" && (
                  <label className="field">
                    Choices
                    <textarea
                      rows={4}
                      value={stage.choices}
                      onChange={(e) =>
                        setStage({ ...stage, choices: e.target.value })
                      }
                      placeholder={"Round neck\nV neck\nBoat neck"}
                    />
                    <small>One choice per line. Up to 30 choices.</small>
                  </label>
                )}
                <label className="field">
                  Helpful hint <span className="muted">(optional)</span>
                  <input
                    maxLength={300}
                    value={stage.value.help}
                    onChange={(e) =>
                      setStage({
                        ...stage,
                        value: { ...stage.value, help: e.target.value },
                      })
                    }
                    placeholder="e.g. Measure from shoulder to cuff"
                  />
                  <small>
                    Shown below this field when taking measurements.
                  </small>
                </label>
                <label className={styles.statusControl}>
                  <input
                    type="checkbox"
                    checked={stage.value.required}
                    onChange={(e) =>
                      setStage({
                        ...stage,
                        value: { ...stage.value, required: e.target.checked },
                      })
                    }
                  />
                  <span>
                    <strong>Required before confirming measurements</strong>
                    <small>
                      You can still create an order with measurements pending.
                    </small>
                  </span>
                </label>
              </div>
            )}
            {stage.kind === "preset" && (
              <div className={styles.formStack}>
                <label className="field">
                  Preset name
                  <input
                    autoFocus
                    maxLength={80}
                    value={stage.value.name}
                    onChange={(e) =>
                      setStage({
                        ...stage,
                        value: { ...stage.value, name: e.target.value },
                      })
                    }
                    placeholder="e.g. Medium or Standard fit"
                  />
                </label>
                <p className={styles.notice}>
                  <Info size={17} />
                  Fill the values you reuse. Leave other fields blank for the
                  customer’s measurements.
                </p>
                <MeasurementFields
                  fields={draft.fields}
                  values={stage.value.values}
                  unit={draft.unit}
                  onChange={(values) =>
                    setStage({ ...stage, value: { ...stage.value, values } })
                  }
                />
              </div>
            )}
            {stage.kind === "preview" && (
              <MeasurementFields
                fields={draft.fields}
                values={stage.values}
                unit={draft.unit}
                onChange={(values) => setStage({ ...stage, values })}
              />
            )}
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
              <small>
                {stage.kind === "main"
                  ? "Existing orders keep their measurements."
                  : stage.kind === "preview"
                    ? "Preview only · nothing is saved"
                    : "Changes stay in your draft until you save."}
              </small>
              <button
                type="button"
                className="button"
                disabled={write.busy}
                onClick={
                  stage.kind === "main" ? close : () => open({ kind: "main" })
                }
              >
                {stage.kind === "preview" ? "Back to editor" : "Cancel"}
              </button>
              {stage.kind !== "preview" && (
                <button
                  type="submit"
                  className="button primary"
                  disabled={write.busy || (stale && stage.kind === "main")}
                >
                  {write.busy
                    ? "Saving…"
                    : stage.kind === "field"
                      ? stage.isNew
                        ? "Add field to draft"
                        : "Apply field"
                      : stage.kind === "preset"
                        ? stage.isNew
                          ? "Add preset to draft"
                          : "Apply preset"
                        : isNew
                          ? "Add garment"
                          : "Save garment"}
                </button>
              )}
            </div>
          )}
        </div>
      </form>
    </Dialog>
  );
}
