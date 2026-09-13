"use client";
import { useEffect, useState } from "react";
import type { Garment } from "@/features/settings/contracts/catalogue";
import {
  detailKinds,
  kindLabels,
  type DetailKind,
  type DesignConfig,
  type DesignInput,
} from "../contracts";
import { builtinAssets } from "../domain/registry";
import { designsFor, suggestedDesigns } from "../domain/designs";
import { LibraryBrowser } from "./library-browser";
import { DesignChoices, emptyDesign } from "./design-choices";
import styles from "./library.module.css";
export function GarmentDesignSetup({
  garment,
  onChange,
  onEditing,
}: {
  garment: Garment;
  onChange: (garment: Garment) => void;
  onEditing?: (editing: boolean) => void;
}) {
  const [group, setGroup] = useState<DetailKind | null>(null),
    [preset, setPreset] = useState<{
      id: string;
      name: string;
      design: DesignInput;
    } | null>(null),
    [error, setError] = useState("");
  const config = designsFor(garment);
  const editing = Boolean(group || preset);
  useEffect(() => {
    onEditing?.(editing);
    return () => onEditing?.(false);
  }, [editing, onEditing]);
  function change(next: DesignConfig) {
    onChange({ ...garment, designConfig: next });
    setError("");
  }
  function prune(groups: DesignConfig["groups"]) {
    return {
      groups,
      presets: config.presets.map((p) => ({
        ...p,
        choices: Object.fromEntries(
          Object.entries(p.choices).filter(([kind, id]) =>
            groups.some((g) => g.kind === kind && g.assetIds.includes(id!)),
          ),
        ),
      })),
    };
  }
  if (group)
    return (
      <>
        <div className={styles.row}>
          <strong className="small">{kindLabels[group]}</strong>
          <button
            type="button"
            className="text-link"
            onClick={() =>
              change(
                prune(
                  config.groups.map((g) =>
                    g.kind === group ? { ...g, assetIds: [] } : g,
                  ),
                ),
              )
            }
          >
            Clear group
          </button>
          <button
            type="button"
            className="text-link"
            onClick={() =>
              change(
                prune(
                  config.groups.map((g) =>
                    g.kind === group
                      ? {
                          ...g,
                          assetIds: builtinAssets
                            .filter((a) => a.kind === group)
                            .map((a) => a.id),
                        }
                      : g,
                  ),
                ),
              )
            }
          >
            Select library defaults
          </button>
        </div>
        <LibraryBrowser
          kind={group}
          selectedIds={
            config.groups.find((g) => g.kind === group)?.assetIds ?? []
          }
          multiple
          onBack={() => setGroup(null)}
          onSelect={(asset) => {
            const groups = config.groups.map((g) =>
              g.kind !== group
                ? g
                : {
                    ...g,
                    assetIds: g.assetIds.includes(asset.id)
                      ? g.assetIds.filter((id) => id !== asset.id)
                      : [...g.assetIds, asset.id].slice(0, 40),
                  },
            );
            change(prune(groups));
          }}
        />
      </>
    );
  if (preset)
    return (
      <div className={styles.stage}>
        <button
          type="button"
          className={styles.back}
          onClick={() => setPreset(null)}
        >
          ← Back to design setup
        </button>
        <label className="field">
          Design preset name
          <input
            maxLength={80}
            value={preset.name}
            onChange={(e) => setPreset({ ...preset, name: e.target.value })}
            placeholder="e.g. Everyday blouse"
          />
        </label>
        <DesignChoices
          garment={garment}
          value={preset.design}
          presetMode
          onChange={(design) => setPreset({ ...preset, design })}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="button primary"
          onClick={() => {
            if (
              !preset.name.trim() ||
              !Object.keys(preset.design.choices).length
            )
              return setError(
                "Enter a name and choose at least one design detail.",
              );
            if (
              config.presets.some(
                (p) =>
                  p.id !== preset.id &&
                  p.name.toLowerCase() === preset.name.trim().toLowerCase(),
              )
            )
              return setError("A design preset with that name already exists.");
            change({
              ...config,
              presets: [
                ...config.presets.filter((p) => p.id !== preset.id),
                {
                  id: preset.id,
                  name: preset.name.trim(),
                  choices: preset.design.choices,
                },
              ],
            });
            setPreset(null);
          }}
        >
          Apply design preset
        </button>
      </div>
    );
  return (
    <div>
      <p className={styles.notice}>
        {garment.designConfig
          ? "Your custom design options"
          : "Suggested design groups for this garment"}
        . Enable the details you offer, then choose the images available during
        order creation.
      </p>
      {detailKinds.map((kind) => {
        const enabled = config.groups.find((g) => g.kind === kind);
        return (
          <div className={styles.configRow} key={kind}>
            <label>
              <input
                type="checkbox"
                checked={Boolean(enabled)}
                onChange={(e) =>
                  change(
                    prune(
                      e.target.checked
                        ? [
                            ...config.groups,
                            {
                              kind,
                              assetIds: builtinAssets
                                .filter((a) => a.kind === kind)
                                .map((a) => a.id),
                            },
                          ]
                        : config.groups.filter((g) => g.kind !== kind),
                    ),
                  )
                }
              />
              {kindLabels[kind]}
            </label>
            {enabled && (
              <button
                type="button"
                className="text-link"
                onClick={() => setGroup(kind)}
              >
                Choose images ({enabled.assetIds.length})
              </button>
            )}
          </div>
        );
      })}
      <div className={styles.row} style={{ marginTop: 14 }}>
        <button
          type="button"
          className="text-link"
          onClick={() => change(suggestedDesigns(garment))}
        >
          Reset to suggested groups
        </button>
        <button
          type="button"
          className="text-link"
          onClick={() => change({ groups: [], presets: [] })}
        >
          Disable all design groups
        </button>
      </div>
      <details className={styles.details}>
        <summary>
          Design presets <small>{config.presets.length} saved</small>
        </summary>
        <div>
          <p className="muted small">
            Save a combination of details for quick selection in a new order.
          </p>
          {config.presets.map((p) => (
            <div className={styles.configRow} key={p.id}>
              <span style={{ flex: 1, fontSize: 12 }}>{p.name}</span>
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setPreset({
                    id: p.id,
                    name: p.name,
                    design: { ...emptyDesign(), choices: { ...p.choices } },
                  })
                }
              >
                Edit
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  change({
                    ...config,
                    presets: config.presets.filter((r) => r.id !== p.id),
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
          {config.presets.length < 12 && (
            <button
              type="button"
              className="button"
              style={{ marginTop: 12 }}
              onClick={() =>
                setPreset({
                  id: crypto.randomUUID(),
                  name: "",
                  design: emptyDesign(),
                })
              }
            >
              + Add design preset
            </button>
          )}
        </div>
      </details>
    </div>
  );
}
