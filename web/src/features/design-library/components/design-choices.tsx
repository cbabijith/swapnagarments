"use client";
import { useState } from "react";
import { Palette, Plus, X } from "lucide-react";
import type { Garment } from "@/features/settings/contracts/catalogue";
import { useLibrary } from "../hooks/use-library";
import { libraryQuerySchema } from "../contracts";
import { designsFor } from "../domain/designs";
import { builtinById } from "../domain/registry";
import { previewAssets } from "../domain/preview-library";
import {
  kindLabels,
  type AssetRef,
  type DesignInput,
  type DetailKind,
} from "../contracts";
import { AssetImage } from "./asset-image";
import { LibraryBrowser } from "./library-browser";
import styles from "./library.module.css";

export const emptyDesign = (): DesignInput => ({
  choices: {},
  references: [],
  notes: "",
});
export function DesignChoices({
  garment,
  value,
  onChange,
  presetMode = false,
}: {
  garment: Garment;
  value: DesignInput;
  onChange: (value: DesignInput) => void;
  presetMode?: boolean;
}) {
  const [browse, setBrowse] = useState<DetailKind | "reference" | null>(null);
  const [known, setKnown] = useState<Record<string, AssetRef>>({});
  const selectedCustom = [
    ...Object.values(value.choices),
    ...value.references,
  ].filter((id): id is string => Boolean(id?.startsWith("upload-")));
  const custom = useLibrary(
    libraryQuerySchema.parse({
      ids: selectedCustom.join(",") || "upload-no-selection",
    }),
  );
  const config = designsFor(garment),
    count = Object.keys(value.choices).length + value.references.length;
  function asset(id: string, kind: DetailKind | "reference"): AssetRef {
    return (
      known[id] ??
      custom.data?.items.find((a) => a.id === id) ??
      previewAssets()[id] ??
      builtinById[id] ?? {
        id,
        kind,
        label: "Custom image",
        view: kind === "back" ? "back" : "detail",
      }
    );
  }
  const content = (
    <div>
      {browse ? (
        <>
          {browse !== "reference" && value.choices[browse] && (
            <div className={styles.row}>
              <p className="small">
                Selected: {asset(value.choices[browse]!, browse).label}
              </p>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  const choices = { ...value.choices };
                  delete choices[browse];
                  onChange({ ...value, choices });
                }}
              >
                Clear choice
              </button>
            </div>
          )}
          <LibraryBrowser
            key={browse}
            kind={browse}
            selectedIds={
              browse === "reference"
                ? value.references
                : value.choices[browse]
                  ? [value.choices[browse]!]
                  : []
            }
            allowedIds={
              browse === "reference"
                ? undefined
                : config.groups.find((g) => g.kind === browse)?.assetIds
            }
            onBack={() => setBrowse(null)}
            onSelect={(a) => {
              setKnown({ ...known, [a.id]: a });
              if (browse === "reference")
                onChange({
                  ...value,
                  references: [...new Set([...value.references, a.id])].slice(
                    0,
                    4,
                  ),
                });
              else {
                const choices = { ...value.choices, [browse]: a.id };
                if (a.id === "detail-sleeve-length-sleeveless") {
                  delete choices["sleeve-shape"];
                  delete choices.cuff;
                }
                onChange({ ...value, choices });
              }
              setBrowse(null);
            }}
          />
        </>
      ) : (
        <>
          {!presetMode && config.presets.length > 0 && (
            <label className="field">
              Use a design preset
              <select
                aria-label="Use a design preset"
                value=""
                onChange={(e) => {
                  const preset = config.presets.find(
                    (p) => p.id === e.target.value,
                  );
                  if (preset)
                    onChange({ ...value, choices: { ...preset.choices } });
                }}
              >
                <option value="">Choose a saved style…</option>
                {config.presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className={styles.choiceGrid}>
            {config.groups
              .filter((g) => g.assetIds.length > 0)
              .filter(
                (g) =>
                  value.choices["sleeve-length"] !==
                    "detail-sleeve-length-sleeveless" ||
                  !["sleeve-shape", "cuff"].includes(g.kind),
              )
              .map((group) => {
                const selected = value.choices[group.kind];
                return (
                  <button
                    type="button"
                    className={styles.choice}
                    data-selected={Boolean(selected)}
                    key={group.kind}
                    onClick={() => setBrowse(group.kind)}
                  >
                    {selected ? (
                      <AssetImage
                        asset={asset(selected, group.kind)}
                        size={48}
                      />
                    ) : (
                      <Palette size={22} strokeWidth={1.5} />
                    )}
                    <span>
                      <strong>{kindLabels[group.kind]}</strong>
                      <small>
                        {selected
                          ? asset(selected, group.kind).label
                          : `Choose · ${group.assetIds.length} options`}
                      </small>
                    </span>
                  </button>
                );
              })}
          </div>
          {!config.groups.some((g) => g.assetIds.length) && (
            <p className="muted small">
              No design groups enabled for this garment. You can add a reference
              and notes.
            </p>
          )}
          {!presetMode && (
            <>
              {value.references.length > 0 && (
                <div className={styles.row}>
                  {value.references.map((id) => (
                    <div className={styles.reference} key={id}>
                      <AssetImage asset={asset(id, "reference")} size={48} />
                      <span>{asset(id, "reference").label}</span>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remove reference ${asset(id, "reference").label}`}
                        onClick={() =>
                          onChange({
                            ...value,
                            references: value.references.filter(
                              (a) => a !== id,
                            ),
                          })
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {value.references.length < 4 && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setBrowse("reference")}
                >
                  <Plus size={14} /> Add reference photo
                </button>
              )}
              <label className="field" style={{ marginTop: 12 }}>
                Design notes (optional)
                <textarea
                  value={value.notes}
                  maxLength={1000}
                  placeholder="Details to discuss with the tailor…"
                  onChange={(e) =>
                    onChange({ ...value, notes: e.target.value })
                  }
                />
              </label>
            </>
          )}
          {!!count && (
            <button
              type="button"
              className="text-link"
              onClick={() => onChange(emptyDesign())}
            >
              Clear design choices
            </button>
          )}
        </>
      )}
    </div>
  );
  if (presetMode) return content;
  return (
    <details className={styles.details}>
      <summary>
        Design & reference images{" "}
        <small>{count ? `${count} selected` : "Optional"}</small>
      </summary>
      <div>
        <p className="muted small">
          Choose a style for this order. Saved customer sizes stay separate.
        </p>
        {content}
      </div>
    </details>
  );
}
