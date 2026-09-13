import definitions from "./builtins.json";
import type { DesignAsset } from "../contracts";
export const builtinAssets = definitions as DesignAsset[];
export const builtinById: Record<string, DesignAsset> = Object.fromEntries(
  builtinAssets.map((a) => [a.id, a]),
);
