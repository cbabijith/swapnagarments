import { WorkspaceError } from "@/shared/errors";
import type { Garment } from "@/features/settings/contracts/catalogue";
import { resolveGarmentIllustration } from "@/features/settings/domain/garment-illustrations";
import { builtinAssets, builtinById } from "./registry";
import { matchGarmentAsset } from "./garment-match";
import {
  toAssetRef,
  type AssetRef,
  type DesignAsset,
  type DesignConfig,
  type DesignInput,
  type DesignSnapshot,
  type DetailKind,
} from "../contracts";

export type AssetMap = Record<string, DesignAsset>;
const defaultModels: Record<string, string> = {
  blouse: "basic-saree-blouse",
  churidar: "churidar-set",
  gown: "evening-gown",
  skirt: "a-line-skirt",
  pavada: "pavada-and-davani",
  saree: "saree",
  kurta: "straight-kurta",
  shirt: "shirt",
  trousers: "straight-trousers",
  lehenga: "lehenga",
  alteration: "alteration",
  other: "other-or-service",
};
export function garmentImage(
  garment: Pick<Garment, "name" | "illustrationId" | "image">,
): AssetRef {
  if (garment.image) return garment.image;
  if (garment.illustrationId)
    return toAssetRef(
      builtinById[`garment-${defaultModels[garment.illustrationId]}`],
    );
  return toAssetRef(
    matchGarmentAsset(garment.name) ??
      builtinById[
        `garment-${defaultModels[resolveGarmentIllustration(garment)]}`
      ],
  );
}
export function suggestedDesigns(
  garment: Pick<Garment, "name" | "illustrationId" | "image">,
): DesignConfig {
  const image = garmentImage(garment),
    a = builtinById[image.id];
  const name = `${a?.label ?? image.label}`.toLowerCase();
  let kinds: DetailKind[];
  if (/saree$|dhoti or mundu|alteration|service/.test(name)) kinds = [];
  else if (a?.family === "bottoms" || /trouser/.test(name))
    kinds = ["closure", "hem", "pocket"];
  else if (/skirt|petticoat|^lehenga$/.test(name))
    kinds = ["construction", "closure", "hem", "pocket"];
  else if (
    /shirt|jacket|waistcoat|blazer|sherwani|suit$|coat/.test(name) &&
    !/salwar|sharara/.test(name)
  )
    kinds = ["collar", "sleeve-length", "cuff", "closure", "pocket", "hem"];
  else
    kinds = [
      "front-neck",
      "back",
      "sleeve-shape",
      "sleeve-length",
      "closure",
      "hem",
      "construction",
    ];
  return {
    groups: kinds.map((kind) => ({
      kind,
      assetIds: builtinAssets.filter((a) => a.kind === kind).map((a) => a.id),
    })),
    presets: [],
  };
}
export const designsFor = (garment: Garment) =>
  garment.designConfig ?? suggestedDesigns(garment);
export function requireAsset(
  id: string,
  assets: AssetMap = builtinById,
  kind?: string,
  allowArchived = false,
): DesignAsset {
  const asset = assets[id];
  if (
    !asset ||
    (!asset.active && !allowArchived) ||
    (kind && asset.kind !== kind)
  )
    throw new WorkspaceError(
      "An image is unavailable or belongs to a different design group. Refresh the image library and choose again.",
      409,
    );
  return asset;
}
export function validateChoices(
  config: DesignConfig,
  choices: Record<string, string>,
  assets: AssetMap = builtinById,
  allowArchived = false,
): AssetRef[] {
  if (
    choices["sleeve-length"] === "detail-sleeve-length-sleeveless" &&
    (choices["sleeve-shape"] || choices.cuff)
  )
    throw new WorkspaceError(
      "Remove the sleeve shape and cuff for a sleeveless design.",
    );
  return Object.entries(choices).map(([kind, id]) => {
    if (!config.groups.some((g) => g.kind === kind && g.assetIds.includes(id)))
      throw new WorkspaceError(
        "This design option is not enabled for the garment. Reload the garment settings.",
        409,
      );
    return toAssetRef(requireAsset(id, assets, kind, allowArchived));
  });
}
export function validateGarmentDesigns(
  garment: Garment,
  old: Garment | undefined,
  assets: AssetMap = builtinById,
) {
  if (garment.image)
    garment.image = toAssetRef(
      requireAsset(
        garment.image.id,
        assets,
        "garment",
        old?.image?.id === garment.image.id,
      ),
    );
  if (garment.referenceImages)
    garment.referenceImages = garment.referenceImages.map((a) =>
      toAssetRef(
        requireAsset(
          a.id,
          assets,
          undefined,
          old?.referenceImages?.some((r) => r.id === a.id),
        ),
      ),
    );
  const config = garment.designConfig;
  if (!config) return;
  if (new Set(config.groups.map((g) => g.kind)).size !== config.groups.length)
    throw new WorkspaceError("Use each design group only once.");
  for (const group of config.groups) {
    if (new Set(group.assetIds).size !== group.assetIds.length)
      throw new WorkspaceError("Use each design image only once in a group.");
    for (const id of group.assetIds)
      requireAsset(
        id,
        assets,
        group.kind,
        old?.designConfig?.groups.some(
          (g) => g.kind === group.kind && g.assetIds.includes(id),
        ),
      );
  }
  if (
    new Set(config.presets.map((p) => p.id)).size !== config.presets.length ||
    new Set(config.presets.map((p) => p.name.toLowerCase())).size !==
      config.presets.length
  )
    throw new WorkspaceError(
      "Give each design preset a different name and ID.",
    );
  for (const preset of config.presets)
    validateChoices(config, preset.choices, assets, true);
}
export function snapshotDesign(
  garment: Garment,
  input: DesignInput | undefined,
  assets: AssetMap = builtinById,
): DesignSnapshot {
  return {
    garmentImage: toAssetRef(
      requireAsset(garmentImage(garment).id, assets, "garment", true),
    ),
    garmentReferences: (garment.referenceImages ?? []).map((a) =>
      toAssetRef(requireAsset(a.id, assets, undefined, true)),
    ),
    choices: validateChoices(designsFor(garment), input?.choices ?? {}, assets),
    references: (input?.references ?? []).map((id) =>
      toAssetRef(requireAsset(id, assets)),
    ),
    notes: input?.notes ?? "",
  };
}
