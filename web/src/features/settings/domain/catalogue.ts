import type {
  Catalogue,
  Garment,
  MeasurementField,
} from "../contracts/catalogue";
import type { Workspace } from "@/shared/workspace";

const fields = (labels: string[]): MeasurementField[] =>
  labels.map((label) => ({
    id: `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    label,
    type: "number",
    required: false,
    help: "",
    options: [],
  }));
export function defaultCatalogue(): Catalogue {
  const definitions: [string, string, string[]][] = [
    [
      "blouse",
      "Blouse",
      [
        "Bust",
        "Waist",
        "Shoulder",
        "Armhole",
        "Sleeve length",
        "Sleeve opening",
        "Blouse length",
        "Front neck depth",
        "Back neck depth",
      ],
    ],
    [
      "churidar",
      "Churidar",
      [
        "Bust",
        "Waist",
        "Hip",
        "Shoulder",
        "Sleeve length",
        "Top length",
        "Bottom waist",
        "Bottom length",
        "Ankle",
      ],
    ],
    [
      "gown",
      "Gown",
      [
        "Bust",
        "Waist",
        "Hip",
        "Shoulder",
        "Armhole",
        "Sleeve length",
        "Waist length",
        "Gown length",
      ],
    ],
    ["skirt", "Skirt", ["Waist", "Hip", "Skirt length"]],
    [
      "pavada",
      "Pavada & davani",
      ["Waist", "Hip", "Pavada length", "Top length"],
    ],
    ["other", "Other", []],
  ];
  return {
    revision: 0,
    defaultGarmentId: "garment-blouse",
    leadDays: 7,
    garments: definitions.map(([key, name, labels]): Garment => ({
      id: `garment-${key}`,
      revision: 1,
      name,
      active: true,
      price: null,
      unit: "in",
      fields: fields(labels),
      presets: [],
    })),
  };
}
export const catalogueFor = (data: Pick<Workspace, "catalogue">) =>
  data.catalogue ?? defaultCatalogue();
