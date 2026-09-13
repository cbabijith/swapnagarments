"use client";
import { useEffect, useState } from "react";
import { Star, Eye, Archive, RotateCcw, Upload, Check } from "lucide-react";
import {
  assetKinds,
  kindLabels,
  toAssetRef,
  type AssetKind,
  type AssetRef,
  type DesignAsset,
  type LibraryQuery,
} from "../contracts";
import { useLibrary, useLibraryActions } from "../hooks/use-library";
import { AssetImage } from "./asset-image";
import families from "../domain/families.json";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import styles from "./library.module.css";

export function LibraryBrowser({
  kind,
  selectedIds = [],
  allowedIds,
  onSelect,
  multiple = false,
  onBack,
  allowUpload = true,
}: {
  kind?: AssetKind;
  selectedIds?: string[];
  allowedIds?: string[];
  onSelect?: (asset: AssetRef) => void;
  multiple?: boolean;
  onBack?: () => void;
  allowUpload?: boolean;
}) {
  const [query, setQuery] = useState<LibraryQuery>({
    q: "",
    kind: kind ?? "all",
    family: "",
    source: "all",
    page: 1,
    ids: allowedIds?.join(",") ?? "",
  });
  const [view, setView] = useState<DesignAsset | null>(null),
    [upload, setUpload] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const library = useLibrary({
      ...query,
      kind: kind ?? query.kind,
      ids: allowedIds?.join(",") ?? "",
    }),
    actions = useLibraryActions();
  function filter(next: Partial<LibraryQuery>) {
    setQuery((q) => ({ ...q, ...next, page: 1 }));
    setError("");
  }
  async function update(
    asset: DesignAsset,
    changes: { active?: boolean; favourite?: boolean },
  ) {
    setBusy(true);
    setError("");
    try {
      const saved = await actions.update(asset, changes);
      if (view?.id === saved.id) setView(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update image.");
    } finally {
      setBusy(false);
    }
  }
  if (upload)
    return (
      <UploadImage
        initialKind={kind ?? "garment"}
        fixedKind={Boolean(kind)}
        onBack={() => setUpload(false)}
        onSaved={(asset) => {
          setUpload(false);
          if (onSelect) onSelect(toAssetRef(asset));
          else {
            filter({ source: "upload", kind: asset.kind, family: "" });
            setView(asset);
          }
        }}
      />
    );
  return (
    <div
      className={styles.library}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement)
          e.preventDefault();
      }}
    >
      {view ? (
        <div className={styles.stage}>
          <button
            type="button"
            className={styles.back}
            disabled={busy}
            onClick={() => setView(null)}
          >
            ← Back to image library
          </button>
          <div>
            <h3>{view.label}</h3>
            <p className="muted small">
              {kindLabels[view.kind]} · {view.view} view ·{" "}
              {view.source === "builtin" ? "Library illustration" : "My image"}
            </p>
          </div>
          <AssetImage asset={view} size={440} full decorative={false} />
          <p className={styles.notice}>
            Use this image to discuss the style. Measurements are entered
            separately.
          </p>
          <div className={styles.row}>
            {onSelect && view.active && (
              <button
                type="button"
                className="button primary"
                disabled={busy}
                onClick={() => {
                  onSelect(toAssetRef(view));
                  if (multiple) setView(null);
                }}
              >
                {multiple && selectedIds.includes(view.id)
                  ? "Remove from options"
                  : "Use this image"}
              </button>
            )}
            <button
              type="button"
              className="button"
              disabled={busy}
              aria-pressed={view.favourite}
              onClick={() => void update(view, { favourite: !view.favourite })}
            >
              <Star size={16} />
              {view.favourite ? "Unfavourite" : "Favourite"}
            </button>
            {!onSelect && (
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => void update(view, { active: !view.active })}
              >
                {view.active ? <Archive size={16} /> : <RotateCcw size={16} />}{" "}
                {view.active ? "Archive image" : "Restore image"}
              </button>
            )}
          </div>
          {!onSelect && (
            <p className="muted small">
              Archived images stay visible in saved garments and orders.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className={styles.row}>
            {onBack && (
              <button type="button" className={styles.back} onClick={onBack}>
                ← Back
              </button>
            )}
            <p className="muted small">
              {multiple
                ? `${selectedIds.length} options selected · click an image to toggle`
                : "Find a style by name, category or your favourites."}
            </p>
            {allowUpload && !allowedIds && (
              <button
                type="button"
                className="button"
                onClick={() => setUpload(true)}
              >
                <Upload size={15} />
                Upload image
              </button>
            )}
          </div>
          <div className={styles.toolbar}>
            <label className={`field ${styles.search}`}>
              Search images
              <input
                type="search"
                placeholder="Try princess, mandarin, dori…"
                value={query.q}
                onChange={(e) => filter({ q: e.target.value })}
              />
            </label>
            {!kind && (
              <label className="field">
                Image category
                <select
                  aria-label="Image category"
                  value={query.kind}
                  onChange={(e) =>
                    filter({
                      kind: e.target.value as LibraryQuery["kind"],
                      family: "",
                    })
                  }
                >
                  <option value="all">All categories</option>
                  {assetKinds.map((k) => (
                    <option value={k} key={k}>
                      {kindLabels[k]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(kind === "garment" ||
              query.kind === "garment" ||
              query.kind === "all") && (
              <label className="field">
                Garment family
                <select
                  aria-label="Garment family"
                  value={query.family}
                  onChange={(e) => filter({ family: e.target.value })}
                >
                  <option value="">All families</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                  <option value="my-images">My images</option>
                </select>
              </label>
            )}
            <label className="field">
              Show
              <select
                aria-label="Show"
                value={query.source}
                onChange={(e) =>
                  filter({ source: e.target.value as LibraryQuery["source"] })
                }
              >
                <option value="all">All active images</option>
                <option value="favourite">Favourites</option>
                <option value="upload">My uploads</option>
                {!onSelect && <option value="archived">Archived</option>}
              </select>
            </label>
          </div>
          {library.loading && (
            <p
              role="status"
              className={library.data ? "muted small" : styles.empty}
            >
              {library.data ? "Updating images…" : "Loading images…"}
            </p>
          )}
          {library.error && (
            <p className="form-error" role="alert">
              {library.error}{" "}
              <button
                type="button"
                className="text-link"
                onClick={library.reload}
              >
                Retry
              </button>
            </p>
          )}
          {library.data && (
            <>
              <div
                className={styles.grid}
                aria-label="Image results"
                aria-busy={library.loading}
              >
                {library.data.items.map((a) => (
                  <article
                    key={a.id}
                    className={styles.card}
                    data-selected={selectedIds.includes(a.id)}
                  >
                    <button
                      type="button"
                      className={styles.pick}
                      disabled={busy || library.loading}
                      aria-label={
                        onSelect
                          ? `${multiple && selectedIds.includes(a.id) ? "Remove" : "Choose"} ${a.label}`
                          : `View ${a.label}`
                      }
                      aria-pressed={
                        onSelect ? selectedIds.includes(a.id) : undefined
                      }
                      onClick={() =>
                        onSelect ? onSelect(toAssetRef(a)) : setView(a)
                      }
                    >
                      <AssetImage asset={a} size={88} />
                      <strong>
                        {selectedIds.includes(a.id) && <Check size={12} />}{" "}
                        {a.label}
                      </strong>
                      <small>
                        {a.view} ·{" "}
                        {a.source === "upload"
                          ? "My image"
                          : kindLabels[a.kind]}
                      </small>
                    </button>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        disabled={busy || library.loading}
                        aria-label={`${a.favourite ? "Unfavourite" : "Favourite"} ${a.label}`}
                        aria-pressed={a.favourite}
                        onClick={() =>
                          void update(a, { favourite: !a.favourite })
                        }
                      >
                        <Star
                          size={15}
                          fill={a.favourite ? "currentColor" : "none"}
                        />
                      </button>
                      <button
                        type="button"
                        aria-label={`Enlarge ${a.label}`}
                        onClick={() => setView(a)}
                      >
                        <Eye size={15} />
                      </button>
                      {!onSelect && (
                        <button
                          type="button"
                          disabled={busy || library.loading}
                          aria-label={`${a.active ? "Archive" : "Restore"} ${a.label}`}
                          onClick={() => void update(a, { active: !a.active })}
                        >
                          {a.active ? (
                            <Archive size={15} />
                          ) : (
                            <RotateCcw size={15} />
                          )}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {!library.data.total && (
                <div className={styles.empty}>
                  No matching images. Try another name or filter.
                </div>
              )}
              <div className={styles.footer}>
                <span role="status">
                  {library.data.total} images · page {library.data.page} of{" "}
                  {library.data.pageCount}
                </span>
                <div className={styles.row}>
                  <button
                    type="button"
                    className="button"
                    disabled={library.loading || library.data.page <= 1}
                    onClick={() =>
                      setQuery({ ...query, page: library.data!.page - 1 })
                    }
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="button"
                    disabled={
                      library.loading ||
                      library.data.page >= library.data.pageCount
                    }
                    onClick={() =>
                      setQuery({ ...query, page: library.data!.page + 1 })
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function UploadImage({
  initialKind,
  fixedKind,
  onBack,
  onSaved,
}: {
  initialKind: AssetKind;
  fixedKind: boolean;
  onBack: () => void;
  onSaved: (asset: DesignAsset) => void;
}) {
  const [file, setFile] = useState<File | null>(null),
    [label, setLabel] = useState(""),
    [kind, setKind] = useState(initialKind),
    [view, setView] = useState<AssetRef["view"]>(
      initialKind === "garment"
        ? "front"
        : initialKind === "back"
          ? "back"
          : "detail",
    );
  const [id, setId] = useState(""),
    [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const actions = useLibraryActions(),
    { mode } = useWorkspace();
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  function changed() {
    setId(crypto.randomUUID());
    setError("");
  }
  async function upload() {
    if (!file || !label.trim())
      return setError("Choose a file and give it a name.");
    setBusy(true);
    setError("");
    try {
      onSaved(
        await actions.upload(file, { id, label: label.trim(), kind, view }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className={styles.stage}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement)
          e.preventDefault();
      }}
    >
      <button
        type="button"
        className={styles.back}
        onClick={onBack}
        disabled={busy}
      >
        ← Back to image library
      </button>
      <div>
        <h3>Upload an image</h3>
        <p className="muted small">
          Add your own garment drawing or design reference.
        </p>
      </div>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <div className={styles.stage}>
          <label className="field">
            Image file
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null;
                setFile(next);
                setUrl(next ? URL.createObjectURL(next) : "");
                setLabel(
                  next ? next.name.replace(/\.[^.]+$/, "").slice(0, 100) : "",
                );
                changed();
              }}
            />
            <small>JPG, PNG or WebP · up to 8 MB and 20 megapixels</small>
          </label>
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Upload preview"
              className={styles.uploadPreview}
            />
          )}
          <label className="field">
            Image name
            <input
              value={label}
              maxLength={100}
              onChange={(e) => {
                setLabel(e.target.value);
                changed();
              }}
              placeholder="e.g. My bridal blouse back"
            />
          </label>
          <div className={styles.toolbar}>
            <label className="field">
              Image category
              <select
                aria-label="Image category"
                disabled={fixedKind}
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as AssetKind);
                  changed();
                }}
              >
                {assetKinds.map((k) => (
                  <option key={k} value={k}>
                    {kindLabels[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              View
              <select
                aria-label="View"
                value={view}
                onChange={(e) => {
                  setView(e.target.value as AssetRef["view"]);
                  changed();
                }}
              >
                <option value="front">Front</option>
                <option value="back">Back</option>
                <option value="detail">Detail</option>
                <option value="reference">Reference</option>
              </select>
            </label>
          </div>
        </div>
      </fieldset>
      <p className={styles.notice}>
        {mode === "preview"
          ? "Sample upload: kept only until refresh."
          : "Your image is private to the shop. Location metadata is removed automatically."}{" "}
        Upload your own images or images you have permission to use.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="button primary"
        disabled={busy || !file || !label.trim()}
        onClick={() => void upload()}
      >
        {busy ? "Uploading…" : "Save image"}
      </button>
    </div>
  );
}
