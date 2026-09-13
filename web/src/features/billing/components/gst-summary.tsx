import type { GstSnapshot } from "../contracts/gst";
import { money } from "@/shared/workspace";

export function GstSummary({ gst }: { gst?: GstSnapshot }) {
  if (!gst) return null;
  return (
    <>
      <div className="summary-line">
        <span>Amount before GST</span>
        <strong>{money(gst.taxableAmount)}</strong>
      </div>
      <div className="summary-line">
        <span>
          GST ({gst.rateBps / 100}%)
          {gst.priceMode === "inclusive" ? " included" : ""}
        </span>
        <strong>{money(gst.amount)}</strong>
      </div>
    </>
  );
}
