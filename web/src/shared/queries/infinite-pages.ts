import type { PageInfo } from "@/shared/contracts/query";

export type PageAdapter<T> = {
  page: (data: T) => PageInfo;
  merge: (pages: T[]) => T;
};

export function recordPage<T extends { page: PageInfo }>(data: T) {
  return data.page;
}

/** Keep stable ordering, with the most recent copy of each record. */
export function uniqueRecords<T>(rows: T[], key: (row: T) => string): T[] {
  return [...new Map(rows.map((row) => [key(row), row])).values()];
}

export function mergeEntryPages<T extends { entries: { id: string }[] }>(
  pages: T[],
): T {
  return {
    ...pages[pages.length - 1],
    entries: uniqueRecords(
      pages.flatMap((page) => page.entries),
      (entry) => entry.id,
    ),
  };
}

export const entryPageAdapter = { page: recordPage, merge: mergeEntryPages };

export function pageRequest(url: string) {
  const [path, search = ""] = url.split("?");
  const params = new URLSearchParams(search);
  const requestedPage = Math.max(1, Number(params.get("page")) || 1);
  params.delete("page");
  params.sort();
  return { identity: `${path}?${params}`, requestedPage };
}

export function pageUrl(identity: string, page: number) {
  return `${identity}&page=${page}`;
}

/** Append one bounded page. Refresh the loaded prefix if offset boundaries moved. */
export async function readInfinitePages<T extends { revision: number }>({
  requestedPage,
  cached = [],
  read,
  page,
}: {
  requestedPage: number;
  cached?: T[];
  read: (page: number) => Promise<T>;
  page: (data: T) => PageInfo;
}): Promise<T[]> {
  let pages = cached.slice(0, requestedPage);
  let restarts = 0;
  while (pages.length < requestedPage) {
    if (pages.length && pages.length >= page(pages[pages.length - 1]).pageCount)
      break;
    const next = await read(pages.length + 1);
    if (page(next).page !== pages.length + 1)
      throw new Error("Could not load the next records. Please try again.");
    if (pages.length && next.revision !== pages[0].revision) {
      // Do not join slices from different revisions: inserts/removals could skip records.
      if (++restarts > 2)
        throw new Error("Records are changing. Please try again.");
      pages = [];
      continue;
    }
    pages.push(next);
  }
  return pages;
}
