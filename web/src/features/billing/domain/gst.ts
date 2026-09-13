import type { GstSettings, GstSnapshot } from "../contracts/gst";
import { WorkspaceError } from "@/shared/errors";

export function gstSettingsFor(catalogue?: { gst?: GstSettings }): GstSettings {
  return (
    catalogue?.gst ?? {
      enabled: false,
      rateBps: 0,
      priceMode: "exclusive",
      gstin: "",
    }
  );
}

/** All amounts are integer paise. Round GST once on the combined item amount. */
export function calculateGst(
  subtotal: number,
  settings: GstSettings,
): GstSnapshot | undefined {
  if (!settings.enabled) return undefined;
  const denominator =
    settings.priceMode === "inclusive" ? 10_000 + settings.rateBps : 10_000;
  const amount = Math.round((subtotal * settings.rateBps) / denominator);
  return {
    rateBps: settings.rateBps,
    priceMode: settings.priceMode,
    gstin: settings.gstin,
    amount,
    taxableAmount:
      settings.priceMode === "inclusive" ? subtotal - amount : subtotal,
  };
}

export function totalWithGst(subtotal: number, gst?: GstSnapshot) {
  return subtotal + (gst?.priceMode === "exclusive" ? gst.amount : 0);
}

export function assertGstSettings(
  current: GstSettings,
  expected?: GstSettings,
) {
  if (
    expected &&
    (current.enabled !== expected.enabled ||
      current.rateBps !== expected.rateBps ||
      current.priceMode !== expected.priceMode ||
      current.gstin !== expected.gstin)
  )
    throw new WorkspaceError(
      "GST settings changed. Review the updated total and try again.",
      409,
    );
}
