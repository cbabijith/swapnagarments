import type { OrderItem } from "../types";
import { GarmentIllustration } from "@/features/settings/components/garment-illustration";
import { resolveGarmentIllustration } from "@/features/settings/domain/garment-illustrations";

export function PieceIllustration({ item }: { item: OrderItem }) {
  return (
    <GarmentIllustration
      illustrationId={resolveGarmentIllustration({
        name: item.garment,
        illustrationId: item.measurement?.illustrationId,
      })}
      size={44}
    />
  );
}
