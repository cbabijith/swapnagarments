"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import {
  browsePreview,
  libraryEvents,
  savePreviewAsset,
} from "../domain/preview-library";
import type {
  DesignAsset,
  LibraryPage,
  LibraryQuery,
  AssetKind,
  AssetRef,
} from "../contracts";

export function useLibrary(query: LibraryQuery) {
  const { mode, onUnauthorized } = useWorkspace();
  const version = useSyncExternalStore(
    libraryEvents.subscribe,
    libraryEvents.version,
    () => 0,
  );
  const params = new URLSearchParams(
    Object.entries(query).map(([k, v]) => [k, String(v)]),
  ).toString();
  const key = `${mode}:${params}:${version}`;
  const [result, setResult] = useState<{
    key: string;
    data?: LibraryPage;
    error?: string;
  }>({ key: "" });
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        let data: LibraryPage;
        if (mode === "preview")
          data = browsePreview(
            Object.fromEntries(
              new URLSearchParams(params),
            ) as unknown as LibraryQuery,
          );
        else {
          const response = await fetch(`/api/design-library?${params}`, {
            cache: "no-store",
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(20000),
            ]),
          });
          if (response.status === 401) onUnauthorized();
          const body = await response.json();
          if (!response.ok)
            throw new Error(body.error || "Could not load the image library.");
          data = body;
        }
        if (!controller.signal.aborted) setResult({ key, data });
      } catch (error) {
        if (!controller.signal.aborted)
          setResult({
            key,
            error:
              error instanceof Error ? error.message : "Could not load images.",
          });
      }
    };
    void Promise.resolve().then(run);
    return () => controller.abort();
  }, [key, params, mode, onUnauthorized]);
  return {
    data: result.key === key ? result.data : undefined,
    error: result.key === key ? result.error : undefined,
    loading: result.key !== key,
    reload: libraryEvents.refresh,
  };
}
export function useLibraryActions() {
  const { mode, onUnauthorized } = useWorkspace();
  async function request(url: string, options: RequestInit) {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(45000),
    });
    if (response.status === 401) onUnauthorized();
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error || "The image could not be saved.");
    libraryEvents.refresh();
    return body.asset as DesignAsset;
  }
  return {
    async update(
      asset: DesignAsset,
      values: { active?: boolean; favourite?: boolean },
    ) {
      if (mode === "preview") {
        const next = { ...asset, ...values, revision: asset.revision + 1 };
        savePreviewAsset(next);
        return next;
      }
      return request("/api/design-library", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: asset.id,
          revision: asset.revision,
          ...values,
        }),
      });
    },
    async upload(
      file: File,
      meta: {
        id: string;
        label: string;
        kind: AssetKind;
        view: AssetRef["view"];
      },
    ) {
      if (!file.size || file.size > 8 * 1024 * 1024)
        throw new Error("Choose an image smaller than 8 MB.");
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error("Choose a JPG, PNG or WebP image.");
      if (mode === "preview") {
        const bitmap = await createImageBitmap(file);
        try {
          if (bitmap.width * bitmap.height > 20_000_000)
            throw new Error("Choose an image up to 20 megapixels.");
          const scale = Math.min(1, 1200 / bitmap.width, 1500 / bitmap.height),
            canvas = document.createElement("canvas");
          canvas.width = Math.round(bitmap.width * scale);
          canvas.height = Math.round(bitmap.height * scale);
          canvas
            .getContext("2d")!
            .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (b) =>
                b ? resolve(b) : reject(new Error("Could not prepare image.")),
              "image/webp",
              0.88,
            ),
          );
          const asset: DesignAsset = {
            ...meta,
            id: `upload-${meta.id}`,
            source: "upload",
            family: "my-images",
            aliases: [],
            active: true,
            favourite: false,
            revision: 1,
          };
          savePreviewAsset(asset, URL.createObjectURL(blob));
          return asset;
        } finally {
          bitmap.close();
        }
      }
      const body = new FormData();
      body.set("file", file);
      for (const [key, value] of Object.entries(meta)) body.set(key, value);
      return request("/api/design-library/upload", { method: "POST", body });
    },
  };
}
