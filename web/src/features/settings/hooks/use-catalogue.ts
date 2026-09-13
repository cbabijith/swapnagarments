"use client";
import { useFeatureQuery } from "@/shared/hooks/use-feature-query";
import { catalogueFor } from "../domain/catalogue";
import type { Catalogue } from "../contracts/catalogue";
export function useCatalogue() {
  return useFeatureQuery<{ revision: number; catalogue: Catalogue }>(
    "/api/settings",
    (data) => ({ revision: 0, catalogue: catalogueFor(data) }),
  );
}
