import { test } from "node:test";
import assert from "node:assert/strict";
import {
  groupCompletedWork,
  completedWorkTime,
} from "../src/features/team/domain/history-groups";
import type { CompletedWork } from "../src/features/team/types/work-history";

const entry = (id: string, completedAt: string): CompletedWork => ({
  id,
  completedAt,
  orderNumber: "SG-2000",
  pieceId: "piece-1",
  garment: "Blouse",
  station: 0,
  stepName: "Cutting",
});

test("history groups respect shop midnight across the new year and keep every completion", () => {
  const entries = [
    entry("a", "2025-12-31T19:00:00Z"),
    entry("b", "2025-12-31T18:30:00Z"),
    entry("c", "2025-12-31T18:29:59Z"),
    entry("d", "2025-12-29T23:00:00Z"),
  ];
  const groups = groupCompletedWork(entries, "2026-01-01");
  assert.deepEqual(
    groups.map(({ date, label, entries }) => ({
      date,
      label,
      ids: entries.map((item) => item.id),
    })),
    [
      { date: "2026-01-01", label: "Today", ids: ["a", "b"] },
      { date: "2025-12-31", label: "Yesterday", ids: ["c"] },
      { date: "2025-12-30", label: "30 Dec 2025", ids: ["d"] },
    ],
  );
  assert.equal(completedWorkTime(entries[1].completedAt), "12:00 am");
  assert.equal(completedWorkTime(entries[2].completedAt), "11:59 pm");
});

test("history handles leap-day yesterday and empty pages", () => {
  assert.equal(
    groupCompletedWork([entry("a", "2024-02-29T06:00:00Z")], "2024-03-01")[0]
      .label,
    "Yesterday",
  );
  assert.deepEqual(groupCompletedWork([], "2026-09-14"), []);
});
