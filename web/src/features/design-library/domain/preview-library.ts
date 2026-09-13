import { builtinById } from "./registry";
import type { DesignAsset, LibraryPage, LibraryQuery } from "../contracts";
// Sample-only state. Reloading the sample workspace clears uploads and preferences.
const changes: Record<string, DesignAsset> = {};
const images: Record<string, string> = {};
let version = 0;
const listeners = new Set<() => void>();
export const libraryEvents = {
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  version: () => version,
  refresh: () => {
    version++;
    listeners.forEach((fn) => fn());
  },
};
export const previewAssets = () => ({ ...builtinById, ...changes });
export const previewImage = (id: string) => images[id];
export function savePreviewAsset(asset: DesignAsset, url?: string) {
  changes[asset.id] = asset;
  if (url) images[asset.id] = url;
  libraryEvents.refresh();
}
export function browsePreview(query: LibraryQuery): LibraryPage {
  const ids = query.ids ? new Set(query.ids.split(",")) : null;
  const matches = Object.values(previewAssets()).filter(
    (a) =>
      (!ids || ids.has(a.id)) &&
      (query.kind === "all" || query.kind === a.kind) &&
      (!query.family || query.family === a.family) &&
      (query.source === "archived" ? !a.active : a.active) &&
      (query.source !== "upload" || a.source === "upload") &&
      (query.source !== "favourite" || a.favourite) &&
      `${a.label} ${a.aliases.join(" ")}`
        .toLowerCase()
        .includes(query.q.trim().toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(matches.length / 12)),
    page = Math.min(query.page, pageCount);
  return {
    items: matches.slice((page - 1) * 12, page * 12),
    total: matches.length,
    page,
    pageCount,
  };
}
