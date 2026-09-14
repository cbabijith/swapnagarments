import { test } from "node:test";
import assert from "node:assert/strict";
import {
  entryPageAdapter,
  pageRequest,
  pageUrl,
  readInfinitePages,
  recordPage,
  uniqueRecords,
} from "../src/shared/queries/infinite-pages";
import { mergeWorkspacePages } from "../src/shared/queries/workspace-pages";
import { emptyWorkspace } from "../src/shared/workspace";

function fixture(number: number, total = 45, revision = 1) {
  return {
    revision,
    entries: Array.from(
      { length: Math.max(0, Math.min(20, total - (number - 1) * 20)) },
      (_, i) => ({ id: `record-${(number - 1) * 20 + i}` }),
    ),
    page: {
      page: number,
      pageSize: 20,
      total,
      pageCount: Math.ceil(total / 20),
    },
  };
}

test("scrolling requests only the next page and retains earlier records", async () => {
  const requests: number[] = [];
  const read = async (page: number) => {
    requests.push(page);
    return fixture(page);
  };
  const first = await readInfinitePages<ReturnType<typeof fixture>>({
    requestedPage: 1,
    read,
    page: recordPage,
  });
  assert.deepEqual(requests, [1]);
  const next = await readInfinitePages<ReturnType<typeof fixture>>({
    requestedPage: 2,
    cached: first,
    read,
    page: recordPage,
  });
  assert.deepEqual(requests, [1, 2]);
  const merged = entryPageAdapter.merge(next);
  assert.equal(merged.entries.length, 40);
  assert.equal(merged.entries[0].id, "record-0");
  assert.equal(merged.entries[39].id, "record-39");
  assert.equal(merged.page.total, 45);
  assert.equal(
    first.length,
    1,
    "Appending must not mutate the committed cache",
  );
});

test("the last partial page and empty results stop further requests", async () => {
  for (const total of [0, 45]) {
    const requests: number[] = [];
    const pages = await readInfinitePages<ReturnType<typeof fixture>>({
      requestedPage: 100,
      page: recordPage,
      read: async (page) => {
        requests.push(page);
        return fixture(page, total);
      },
    });
    assert.deepEqual(requests, total ? [1, 2, 3] : [1]);
    assert.equal(entryPageAdapter.merge(pages).entries.length, total);
  }
});

test("a changed revision reloads the prefix instead of skipping shifted rows", async () => {
  const requests: number[] = [];
  const pages = await readInfinitePages<ReturnType<typeof fixture>>({
    requestedPage: 2,
    cached: [fixture(1)],
    page: recordPage,
    read: async (page) => {
      requests.push(page);
      return fixture(page, 44, 2);
    },
  });
  assert.deepEqual(requests, [2, 1, 2]);
  assert.ok(pages.every((page) => page.revision === 2));
  assert.equal(entryPageAdapter.merge(pages).entries.length, 40);
});

test("refresh rebuilds loaded pages and removes records that left the filter", async () => {
  const stale = [fixture(1), fixture(2), fixture(3)];
  const pages = await readInfinitePages<ReturnType<typeof fixture>>({
    requestedPage: 3,
    page: recordPage,
    read: async (page) => fixture(page, 12, 2),
  });
  assert.equal(pages.length, 1);
  assert.equal(entryPageAdapter.merge(pages).entries.length, 12);
  assert.equal(entryPageAdapter.merge(stale).entries.length, 45);
});

test("failed appends preserve the cache and can be retried", async () => {
  const cached = [fixture(1)];
  await assert.rejects(
    readInfinitePages<ReturnType<typeof fixture>>({
      requestedPage: 2,
      cached,
      page: recordPage,
      read: async () => {
        throw new Error("Offline");
      },
    }),
    /Offline/,
  );
  assert.equal(cached.length, 1);
  const retried = await readInfinitePages<ReturnType<typeof fixture>>({
    requestedPage: 2,
    cached,
    page: recordPage,
    read: async (page) => fixture(page),
  });
  assert.equal(entryPageAdapter.merge(retried).entries.length, 40);
});

test("continuous changes have bounded retries and invalid page responses fail", async () => {
  let calls = 0;
  await assert.rejects(
    readInfinitePages<ReturnType<typeof fixture>>({
      requestedPage: 2,
      page: recordPage,
      read: async (page) => fixture(page, 45, ++calls),
    }),
    /Records are changing/,
  );
  assert.equal(calls, 6);
  await assert.rejects(
    readInfinitePages<ReturnType<typeof fixture>>({
      requestedPage: 2,
      cached: [fixture(1)],
      page: recordPage,
      read: async () => fixture(1),
    }),
    /next records/,
  );
});

test("query identities isolate filters and preserve encoded search text", () => {
  const first = pageRequest("/api/orders?page=1&pageSize=20&q=A%26B");
  const next = pageRequest("/api/orders?q=A%26B&pageSize=20&page=2");
  assert.equal(first.identity, next.identity);
  assert.equal(next.requestedPage, 2);
  const url = new URL(pageUrl(next.identity, 3), "http://localhost");
  assert.equal(url.searchParams.get("q"), "A&B");
  assert.equal(url.searchParams.get("page"), "3");
  assert.notEqual(
    first.identity,
    pageRequest("/api/orders?q=C&page=1&pageSize=20").identity,
  );
});

test("merging removes duplicates while retaining the latest record and order", () => {
  const rows = uniqueRecords(
    [
      { id: "a", value: 1 },
      { id: "b", value: 2 },
      { id: "a", value: 3 },
    ],
    (row) => row.id,
  );
  assert.deepEqual(rows, [
    { id: "a", value: 3 },
    { id: "b", value: 2 },
  ]);
  const report = (date: string) => ({
    date,
    reviewedBy: "Owner",
    reviewedAt: date,
    delivered: 0,
    ready: 0,
    unfinished: 0,
    collected: 0,
    pending: 0,
  });
  const pages = [1, 2].map((page) => ({
    ...fixture(page),
    data: { ...emptyWorkspace(), dayReports: [report(`2026-09-${page}`)] },
  }));
  assert.equal(mergeWorkspacePages(pages).data.dayReports?.length, 2);
});
