import type { OrderItem } from "../types";
import { GarmentImage } from "@/features/design-library/components/asset-image";
import { GarmentIllustration } from "@/features/settings/components/garment-illustration";
import { resolveGarmentIllustration } from "@/features/settings/domain/garment-illustrations";

export function PieceIllustration({ item }: { item: OrderItem }) {
  if (!item.design?.garmentImage && !item.measurement?.image)
    return (
      <GarmentIllustration
        illustrationId={resolveGarmentIllustration({
          name: item.garment,
          illustrationId: item.measurement?.illustrationId,
        })}
        size={44}
      />
    );
  return (
    <GarmentImage
      garment={{
        name: item.garment,
        illustrationId: item.measurement?.illustrationId,
        image: item.design?.garmentImage ?? item.measurement?.image,
      }}
      size={44}
    />
  );
}
