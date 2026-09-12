import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate } from "../src/shared/workspace";

test("display dates use the shop calendar for payments and preserve delivery dates", () => {
  assert.equal(formatDate("2026-01-01T18:29:59.999Z"), "1 Jan");
  assert.equal(formatDate("2026-01-01T18:30:00.000Z"), "2 Jan");
  assert.equal(formatDate("2026-01-01T20:00:00.000Z"), "2 Jan");
  assert.equal(formatDate("2026-01-02T01:30:00+05:30", true), "2 January");
  assert.equal(formatDate("2026-01-02"), "2 Jan");
  assert.equal(formatDate("2026-01-02", true), "2 January");
  assert.throws(() => formatDate("not-a-date"), RangeError);
  assert.throws(() => formatDate(""), RangeError);
});
