import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fieldSchema,
  type MeasurementField,
} from "../src/features/settings/contracts/catalogue";
import { defaultCatalogue } from "../src/features/settings/domain/catalogue";
import {
  resolveGuideId,
  fieldsForSnapshot,
  measurementGuides,
} from "../src/features/measurements/domain/guides";
import { measurementGuideIds } from "../src/features/measurements/contracts/guide";

test("guide matching distinguishes measuring paths, honors custom choices and preserves old fields", () => {
  const field: MeasurementField = {
    id: "size",
    label: "Armhole",
    type: "number",
    required: false,
    help: "",
    options: [],
  };
  assert.equal(resolveGuideId(field), "armhole-around");
  assert.equal(
    resolveGuideId({ ...field, label: "Armhole depth" }),
    "armhole-depth",
  );
  assert.equal(
    resolveGuideId({ ...field, label: "Bottom waist" }),
    "wearing-waist",
  );
  assert.equal(resolveGuideId({ ...field, label: "Waist" }), "waist");
  assert.equal(resolveGuideId({ ...field, label: "Cuff width" }), null);
  assert.equal(
    resolveGuideId({ ...field, label: "Custom hem", guideId: "top-length" }),
    "top-length",
  );
  assert.equal(resolveGuideId({ ...field, guideId: "none" }), null);
  assert.equal(resolveGuideId({ ...field, type: "text" }), null);
  assert.equal(
    resolveGuideId({ ...field, label: "  SLEEVE   LENGTH  " }),
    "sleeve-length",
  );
  assert.deepEqual(
    fieldSchema.parse(field),
    field,
    "old fields remain valid without invented stored properties",
  );
  assert.equal(
    fieldSchema.safeParse({
      ...field,
      guideId: "https://example.test/image.svg",
    }).success,
    false,
  );
  assert.deepEqual(
    fieldsForSnapshot([field]).map((f) => f.guideId),
    ["armhole-around"],
  );
  assert.equal(
    field.guideId,
    undefined,
    "snapshot recording does not mutate the catalogue",
  );
  for (const garment of defaultCatalogue().garments)
    for (const entry of garment.fields)
      assert.ok(
        resolveGuideId(entry),
        `Missing default guide for ${entry.label}`,
      );
  for (const id of measurementGuideIds)
    assert.ok(
      measurementGuides[id].steps.length === 2 && measurementGuides[id].tip,
    );
});
