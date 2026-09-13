import type { MeasurementField } from "@/features/settings/contracts/catalogue";
import type { MeasurementGuideId } from "../contracts/guide";

type Guide = {
  title: string;
  view: "Front" | "Back";
  kind: "Full circumference" | "Point to point" | "Design length";
  steps: [string, string];
  tip: string;
};
// Original concise instructions. Sources and convention decisions: docs/MEASUREMENT-GUIDES-RESEARCH.md.
export const measurementGuides: Record<MeasurementGuideId, Guide> = {
  bust: {
    title: "Bust",
    view: "Front",
    kind: "Full circumference",
    steps: [
      "Wrap the tape around the fullest bust and across the back.",
      "Keep it level, with arms relaxed. Read the complete loop.",
    ],
    tip: "Wear the undergarment intended for the outfit. Keep the tape snug, without squeezing.",
  },
  underbust: {
    title: "Underbust",
    view: "Front",
    kind: "Full circumference",
    steps: [
      "Place the tape directly below the bust.",
      "Keep it horizontal around the ribcage and read the full loop.",
    ],
    tip: "This is below the bust, not across its fullest point.",
  },
  waist: {
    title: "Natural waist",
    view: "Front",
    kind: "Full circumference",
    steps: [
      "Find the natural waist where the torso bends sideways.",
      "Wrap the tape level around that line without pulling tight.",
    ],
    tip: "A skirt or trouser waistband may sit elsewhere. Use Wearing waist for that measurement.",
  },
  hip: {
    title: "Hip",
    view: "Front",
    kind: "Full circumference",
    steps: [
      "Stand comfortably with feet together.",
      "Wrap the tape around the fullest hips and seat, level all the way around.",
    ],
    tip: "Measure the full circumference, not the width across the front.",
  },
  "shoulder-width": {
    title: "Shoulder width",
    view: "Back",
    kind: "Point to point",
    steps: [
      "Find the outer shoulder points where the arms meet the shoulders.",
      "Measure across the upper back from one shoulder point to the other.",
    ],
    tip: "Ask a helper to keep the tape in place. Record the full shoulder width.",
  },
  "armhole-around": {
    title: "Armhole circumference",
    view: "Front",
    kind: "Full circumference",
    steps: [
      "Start at the outer shoulder point and pass the tape under the armpit.",
      "Bring it back to the starting point to complete the armhole loop.",
    ],
    tip: "This goes around the shoulder joint. Armhole depth and upper-arm circumference are different measurements.",
  },
  "armhole-depth": {
    title: "Armhole depth",
    view: "Front",
    kind: "Point to point",
    steps: [
      "Locate the outer shoulder point and the level of the armpit.",
      "Measure vertically between these two levels.",
    ],
    tip: "Record a depth, not a loop around the armhole.",
  },
  "sleeve-length": {
    title: "Sleeve length",
    view: "Front",
    kind: "Design length",
    steps: [
      "Start at the outer shoulder point.",
      "Measure down the arm to the chosen sleeve end.",
    ],
    tip: "The marked end is an example. Use the length agreed for this sleeve style.",
  },
  "sleeve-opening": {
    title: "Sleeve opening",
    view: "Front",
    kind: "Full circumference",
    steps: [
      "Mark where the sleeve will end on the arm.",
      "Measure all the way around the arm at that level.",
    ],
    tip: "The pictured sleeve end is an example. Any extra room for the finished opening is a separate fitting decision.",
  },
  "upper-arm": {
    title: "Upper arm",
    view: "Front",
    kind: "Full circumference",
    steps: [
      "Let the arm hang naturally.",
      "Measure around its fullest upper section without tightening the tape.",
    ],
    tip: "Measure around the arm itself, not around the shoulder joint.",
  },
  "wrist-around": {
    title: "Wrist",
    view: "Front",
    kind: "Full circumference",
    steps: [
      "Place the tape around the wrist at the wrist bone.",
      "Read the full loop without squeezing.",
    ],
    tip: "This is the body measurement. A finished cuff may need extra room.",
  },
  "front-neck-depth": {
    title: "Front neck depth",
    view: "Front",
    kind: "Design length",
    steps: [
      "Start where the neck joins the shoulder.",
      "Measure diagonally to the chosen lowest point of the front neckline.",
    ],
    tip: "Agree on the neckline first. This guide starts at the neck–shoulder joint, not the centre neck.",
  },
  "back-neck-depth": {
    title: "Back neck depth",
    view: "Back",
    kind: "Design length",
    steps: [
      "Start at the neck–shoulder joint on the back.",
      "Measure to the chosen lowest point at the centre of the back neckline.",
    ],
    tip: "Ask a helper to hold the tape. Use the agreed back-neck design.",
  },
  "blouse-length": {
    title: "Blouse length",
    view: "Front",
    kind: "Design length",
    steps: [
      "Start at the shoulder beside the base of the neck.",
      "Bring the tape over the bust to the chosen blouse hem.",
    ],
    tip: "The hem shown is illustrative. Confirm where this blouse should end.",
  },
  "front-waist-length": {
    title: "Front waist length",
    view: "Front",
    kind: "Point to point",
    steps: [
      "Start at the shoulder beside the base of the neck.",
      "Measure over the bust down to the natural waist.",
    ],
    tip: "Mark the natural waist first. Front and back waist lengths use different paths.",
  },
  "back-waist-length": {
    title: "Back waist length",
    view: "Back",
    kind: "Point to point",
    steps: [
      "Start at the base of the neck in the centre back.",
      "Measure down the spine to the natural waist.",
    ],
    tip: "Use a helper and a waist marker to keep the endpoints consistent.",
  },
  "top-length": {
    title: "Top / kurta length",
    view: "Front",
    kind: "Design length",
    steps: [
      "Place the tape at the shoulder beside the neck.",
      "Follow the front over the bust to the agreed top or kurta hem.",
    ],
    tip: "The illustrated hem is a guide to placement, not a standard length.",
  },
  "gown-length": {
    title: "Gown length",
    view: "Front",
    kind: "Design length",
    steps: [
      "Start at the shoulder beside the neck.",
      "Measure over the bust to the chosen gown hem.",
    ],
    tip: "Agree on the hem and intended footwear before measuring.",
  },
  "wearing-waist": {
    title: "Wearing waist",
    view: "Front",
    kind: "Full circumference",
    steps: [
      "Mark the level where the skirt or trousers will sit.",
      "Measure a level loop around the body at that position.",
    ],
    tip: "Use this same starting level when measuring the garment’s length.",
  },
  "skirt-length": {
    title: "Skirt / pavada length",
    view: "Front",
    kind: "Design length",
    steps: [
      "Start at the agreed waistband position on the side.",
      "Measure down to the chosen skirt or pavada hem.",
    ],
    tip: "For floor-length styles, use the intended footwear when agreeing the hem.",
  },
  "bottom-length": {
    title: "Trouser / bottom length",
    view: "Front",
    kind: "Design length",
    steps: [
      "Start at the agreed waistband position on the side.",
      "Measure along the outside of the leg to the chosen trouser hem.",
    ],
    tip: "This is the outside length. An inside-leg measurement starts at the crotch.",
  },
  "ankle-around": {
    title: "Ankle",
    view: "Front",
    kind: "Full circumference",
    steps: [
      "Wrap the tape around the ankle at the ankle-bone level.",
      "Read the full loop without pulling it tight.",
    ],
    tip: "A finished trouser opening may need extra room to pass over the heel.",
  },
};

const aliases: Record<string, MeasurementGuideId> = {
  bust: "bust",
  "full bust": "bust",
  underbust: "underbust",
  "under bust": "underbust",
  waist: "waist",
  "natural waist": "waist",
  hip: "hip",
  hips: "hip",
  "hip circumference": "hip",
  shoulder: "shoulder-width",
  shoulders: "shoulder-width",
  "shoulder width": "shoulder-width",
  armhole: "armhole-around",
  "arm hole": "armhole-around",
  "armhole circumference": "armhole-around",
  "armhole depth": "armhole-depth",
  "sleeve length": "sleeve-length",
  "sleeve opening": "sleeve-opening",
  "upper arm": "upper-arm",
  "bicep circumference": "upper-arm",
  wrist: "wrist-around",
  "wrist circumference": "wrist-around",
  "front neck depth": "front-neck-depth",
  "back neck depth": "back-neck-depth",
  "blouse length": "blouse-length",
  "waist length": "front-waist-length",
  "front waist length": "front-waist-length",
  "back waist length": "back-waist-length",
  "top length": "top-length",
  "kurta length": "top-length",
  "kameez length": "top-length",
  "gown length": "gown-length",
  "bottom waist": "wearing-waist",
  "wearing waist": "wearing-waist",
  "skirt length": "skirt-length",
  "pavada length": "skirt-length",
  "bottom length": "bottom-length",
  "trouser length": "bottom-length",
  ankle: "ankle-around",
  "ankle circumference": "ankle-around",
};

export function resolveGuideId(
  field: Pick<MeasurementField, "type" | "label" | "guideId">,
): MeasurementGuideId | null {
  if (field.type !== "number" || field.guideId === "none") return null;
  if (field.guideId) return field.guideId;
  // Exact known names only. Never infer e.g. "Cuff width" as a circumference.
  return aliases[field.label.toLowerCase().trim().replace(/\s+/g, " ")] ?? null;
}

/** Freeze the measuring method on new pieces/profiles, including an explicit lack of a guide. */
export function fieldsForSnapshot(
  fields: MeasurementField[],
): MeasurementField[] {
  return fields.map((field) => ({
    ...structuredClone(field),
    guideId: resolveGuideId(field) ?? "none",
  }));
}
