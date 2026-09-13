"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
import { LibraryCache, libraryKey } from "../domain/library-cache";

// A new login has a new owner object. Private metadata is never kept in localStorage
// or shared with another account; WeakMap entries disappear with their session.
const sessions = new WeakMap<object, LibraryCache>();

export function useLibrary(query: LibraryQuery) {
  const { mode, owner, onUnauthorized } = useWorkspace();
  const version = useSyncExternalStore(
    libraryEvents.subscribe,
    libraryEvents.version,
    () => 0,
  );
  const params = libraryKey(query);
  const key = `${mode}:${params}:${version}`;
  const cache = useMemo(() => {
    let current = sessions.get(owner);
    if (!current || current.version !== version) {
      current = new LibraryCache(version);
      sessions.set(owner, current);
    }
    return current;
  }, [owner, version]);
  const currentQuery = useMemo(
    () =>
      Object.fromEntries(
        new URLSearchParams(params),
      ) as unknown as LibraryQuery,
    [params],
  );
  const cached = mode === "preview" ? browsePreview(query) : cache.get(query);
  const [result, setResult] = useState<{
    key: string;
    data?: LibraryPage;
    error?: string;
  }>({ key: "" });
  useEffect(() => {
    if (mode === "preview") return;
    const refresh = () => {
      if (document.visibilityState === "visible") libraryEvents.refresh();
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [mode]);
  useEffect(() => {
    if (mode === "preview" || cache.get(currentQuery)) return;
    const controller = new AbortController();
    const read = async (query: LibraryQuery) => {
      const response = await fetch(`/api/design-library?${libraryKey(query)}`, {
        cache: "no-store",
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(20000),
        ]),
      });
      if (response.status === 401) {
        sessions.delete(owner);
        onUnauthorized();
      }
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Could not load the image library.");
      if (!controller.signal.aborted) cache.put(query, body);
      return body as LibraryPage;
    };
    const run = async () => {
      try {
        const data = await read(currentQuery);
        if (!controller.signal.aborted) setResult({ key, data });
        // Prepare the next mixed/upload page while the current page is being read.
        const next = { ...currentQuery, page: data.page + 1 };
        if (
          data.page < data.pageCount &&
          !controller.signal.aborted &&
          !cache.get(next)
        ) {
          void read(next).catch(() => {});
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setResult({
            key,
            error:
              error instanceof Error ? error.message : "Could not load images.",
          });
      }
    };
    // Built-in filters resolve synchronously; only remote searches wait for typing.
    const timer = window.setTimeout(() => void run(), currentQuery.q ? 180 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, currentQuery, mode, owner, cache, onUnauthorized]);
  const data = cached ?? (result.key === key ? result.data : undefined);
  const error = result.key === key ? result.error : undefined;
  return {
    data: data ?? (error ? undefined : result.data),
    error,
    loading: !data && !error,
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
