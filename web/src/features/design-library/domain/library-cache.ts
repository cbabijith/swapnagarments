import type { DesignAsset, LibraryPage, LibraryQuery } from "../contracts";
import { builtinAssets } from "./registry";

const lifetime = 60_000;
export function libraryKey(query: LibraryQuery) {
  return new URLSearchParams(
    Object.entries(query)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, String(value)]),
  ).toString();
}

/** Bounded metadata cache. Its owner is the current in-memory login session. */
export class LibraryCache {
  private pages = new Map<string, { data: LibraryPage; time: number }>();
  private builtins?: {
    items: DesignAsset[];
    uploadTotal: number;
    time: number;
  };
  constructor(readonly version: number) {}

  put(query: LibraryQuery, data: LibraryPage, now = Date.now()) {
    const key = libraryKey(query);
    this.pages.delete(key);
    this.pages.set(key, { data, time: now });
    if (this.pages.size > 32)
      this.pages.delete(this.pages.keys().next().value!);
    if (data.builtinOverrides && data.uploadTotal !== undefined) {
      const overrides = new Map(
        data.builtinOverrides.map((asset) => [asset.id, asset]),
      );
      this.builtins = {
        items: builtinAssets.map((asset) => overrides.get(asset.id) ?? asset),
        uploadTotal: data.uploadTotal,
        time: now,
      };
    }
  }

  get(query: LibraryQuery, now = Date.now()): LibraryPage | undefined {
    const cached = this.pages.get(libraryKey(query));
    if (cached && now - cached.time < lifetime) return cached.data;
    const state = this.builtins;
    if (!state || now - state.time >= lifetime) return undefined;
    const ids = query.ids ? new Set(query.ids.split(",")) : undefined;
    const excludesUploads =
      state.uploadTotal === 0 ||
      Boolean(query.family && query.family !== "my-images") ||
      Boolean(ids && [...ids].every((id) => !id.startsWith("upload-")));
    if (!excludesUploads) return undefined;
    const q = query.q.trim().toLowerCase();
    const matches = state.items.filter(
      (a) =>
        (!ids || ids.has(a.id)) &&
        (query.kind === "all" || a.kind === query.kind) &&
        (!query.family || a.family === query.family) &&
        (query.source === "archived" ? !a.active : a.active) &&
        query.source !== "upload" &&
        (query.source !== "favourite" || a.favourite) &&
        (!q || `${a.label} ${a.aliases.join(" ")}`.toLowerCase().includes(q)),
    );
    const pageCount = Math.max(1, Math.ceil(matches.length / 12));
    const page = Math.min(query.page, pageCount);
    return {
      items: matches.slice((page - 1) * 12, page * 12),
      total: matches.length,
      page,
      pageCount,
    };
  }
}
