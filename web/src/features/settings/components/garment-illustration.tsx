import type { ReactNode } from "react";
import type { GarmentIllustrationId } from "../contracts/garment-illustration";
import { garmentIllustrationLabels } from "../domain/garment-illustrations";

const fabric = "#dce6d6",
  accent = "#dcb49e",
  light = "#f8f3e9";
const drawings: Record<GarmentIllustrationId, ReactNode> = {
  blouse: (
    <>
      <path
        d="M34 27 L23 31 Q16 35 11 52 L24 59 L30 47 L32 62 L28 81 Q48 87 68 81 L64 62 L66 47 L72 59 L85 52 Q80 35 73 31 L62 27 Q61 44 48 47 Q35 44 34 27Z"
        fill={fabric}
      />
      <path d="M34 27 Q35 44 48 47 Q61 44 62 27 M30 47 Q28 37 23 31 M66 47 Q68 37 73 31 M31 75 Q48 80 65 75" />
      <path d="M34 60 L39 72 M62 60 L57 72" stroke="#9ba78e" />
      <path d="M31 79 Q48 84 65 79" stroke="#ad6848" />
    </>
  ),
  churidar: (
    <>
      <path
        d="M32 60 L64 60 L60 96 L51 96 L48 76 L45 96 L36 96Z"
        fill={accent}
      />
      <path
        d="M36 16 L25 22 L14 55 L23 59 L32 38 L32 48 L26 76 Q48 82 70 76 L64 48 L64 38 L73 59 L82 55 L71 22 L60 16 Q48 29 36 16Z"
        fill={fabric}
      />
      <path d="M36 16 Q48 36 60 16 M48 26 L48 41 M29 69 Q48 75 67 69 M37 88 L44 89 M52 89 L59 88 M37 92 L44 93 M52 93 L59 92" />
      <path
        d="M31 19 Q34 40 62 32 L68 21 L72 83 L64 86 L60 40 Q35 47 28 25Z"
        fill={light}
      />
      <path d="M65 43 L68 78" stroke="#ad6848" />
    </>
  ),
  gown: (
    <>
      <path
        d="M35 15 L28 21 L34 38 L36 45 Q28 66 13 93 Q48 102 83 93 Q68 66 60 45 L62 38 L68 21 L61 15 Q48 30 35 15Z"
        fill={fabric}
      />
      <path d="M36 44 L60 44 L61 50 L35 50Z" fill={accent} />
      <path d="M35 15 Q48 36 61 15 M40 56 L29 90 M48 57 L48 95 M56 56 L67 90 M18 88 Q48 97 78 88" />
    </>
  ),
  skirt: (
    <>
      <path
        d="M32 28 Q48 31 64 28 L67 38 L80 90 Q48 101 16 90 L29 38Z"
        fill={fabric}
      />
      <path d="M32 28 Q48 31 64 28 L66 37 Q48 41 30 37Z" fill={accent} />
      <path d="M37 43 L31 88 M48 44 L48 92 M59 43 L65 88 M20 84 Q48 94 76 84" />
    </>
  ),
  pavada: (
    <>
      <path
        d="M35 15 L24 21 L18 35 L29 40 L33 31 L33 45 Q48 50 63 45 L63 31 L67 40 L78 35 L72 21 L61 15 Q48 29 35 15Z"
        fill={accent}
      />
      <path d="M32 52 Q48 56 64 52 L80 94 Q48 103 16 94Z" fill={fabric} />
      <path d="M34 53 L28 88 M47 56 L44 92 M59 56 L64 91 M20 86 Q48 95 76 86" />
      <path
        d="M30 18 L38 17 Q44 37 65 48 L69 68 L60 73 Q51 55 30 49Z"
        fill={light}
      />
      <path d="M34 23 Q38 43 61 54 L64 66" stroke="#ad6848" />
    </>
  ),
  saree: (
    <>
      <path
        d="M34 15 L23 21 L16 35 L29 40 L32 32 L33 44 Q48 51 63 44 L64 32 L67 40 L80 35 L73 21 L62 15 Q48 28 34 15Z"
        fill={accent}
      />
      <path d="M33 50 Q48 56 63 50 L72 96 Q48 102 24 96Z" fill={fabric} />
      <path d="M31 85 L66 62 M30 75 L64 53 M41 71 L37 96 M47 70 L45 98 M52 68 L54 98" />
      <path
        d="M32 17 L42 18 Q41 41 65 52 L68 66 Q46 60 31 40 L22 72 L14 69Z"
        fill={light}
      />
      <path d="M36 23 Q35 43 64 59 M25 44 L19 64" stroke="#ad6848" />
    </>
  ),
  kurta: (
    <>
      <path
        d="M36 16 L24 21 L12 59 L23 63 L32 38 L31 64 L26 93 Q48 99 70 93 L65 64 L64 38 L73 63 L84 59 L72 21 L60 16 Q48 24 36 16Z"
        fill={fabric}
      />
      <path d="M36 16 Q38 31 48 31 Q58 31 60 16 M48 31 L48 49 M31 74 L30 92 M65 74 L66 92 M28 86 Q48 92 68 86" />
      <path
        d="M46 35 L50 35 M46 40 L50 40 M46 45 L50 45 M15 53 L25 57 M71 57 L81 53"
        stroke="#ad6848"
      />
    </>
  ),
  shirt: (
    <>
      <path
        d="M36 21 L23 26 L9 47 L23 56 L31 43 L29 88 Q38 94 48 89 Q58 94 67 88 L65 43 L73 56 L87 47 L73 26 L60 21Z"
        fill={fabric}
      />
      <path
        d="M36 21 L48 27 L41 40 L33 27Z M60 21 L48 27 L55 40 L63 27Z"
        fill={light}
      />
      <path d="M48 28 L48 89 M54 47 L63 47 L62 58 L58 61 L54 58Z M30 83 Q39 88 46 84 M50 84 Q57 88 66 83" />
      <path
        d="M48 46 L48 47 M48 57 L48 58 M48 68 L48 69 M48 79 L48 80"
        stroke="#ad6848"
        strokeWidth="3"
      />
    </>
  ),
  trousers: (
    <>
      <path
        d="M29 21 L67 21 L71 47 L65 96 L51 96 L48 57 L45 96 L31 96 L25 47Z"
        fill={fabric}
      />
      <path d="M29 21 L67 21 L68 30 L28 30Z" fill={accent} />
      <path d="M36 31 Q36 43 27 46 M60 31 Q60 43 69 46 M48 31 L48 49 L53 45 L53 31 M38 51 L37 88 M58 51 L59 88 M31 90 L45 90 M51 90 L65 90" />
    </>
  ),
  lehenga: (
    <>
      <path
        d="M36 14 L28 18 L22 31 L32 36 L34 29 L33 42 Q48 46 63 42 L62 29 L64 36 L74 31 L68 18 L60 14 Q48 29 36 14Z"
        fill={accent}
      />
      <path
        d="M33 50 Q48 54 63 50 Q70 69 86 93 Q48 105 10 93 Q26 69 33 50Z"
        fill={fabric}
      />
      <path d="M35 56 L23 87 M43 57 L39 93 M53 57 L57 93 M61 56 L73 87 M15 86 Q48 99 81 86" />
      <path
        d="M21 81 L24 77 L27 83 M38 87 L41 82 L44 88 M54 88 L57 82 L60 87 M69 83 L72 77 L75 81"
        stroke="#ad6848"
      />
      <path d="M27 17 L33 19 L22 63 L14 61Z" fill={light} />
    </>
  ),
  alteration: (
    <>
      <path
        d="M68 22 Q81 22 81 33 Q81 43 68 43 L56 43 L56 86 L40 86 L40 32 Q40 22 53 22Z"
        fill={fabric}
      />
      <ellipse cx="64" cy="32" rx="10" ry="5" fill={light} />
      <path d="M42 48 L49 48 M42 58 L46 58 M42 68 L49 68 M42 78 L46 78" />
      <g stroke="#ad6848" strokeWidth="2.2">
        <path
          d="M25 69 L65 48 Q67 48 63 53 L36 75 M33 76 L53 94 Q55 96 55 93 L35 67"
          fill={light}
        />
        <circle cx="24" cy="70" r="8" fill={accent} />
        <circle cx="26" cy="85" r="8" fill={accent} />
        <circle cx="24" cy="70" r="3" fill={light} />
        <circle cx="26" cy="85" r="3" fill={light} />
        <circle cx="35" cy="75" r="1.5" fill="#ad6848" />
      </g>
    </>
  ),
  other: (
    <>
      <path
        d="M41 33 Q41 22 51 23 Q60 24 56 32 L48 40 L48 49"
        fill="none"
        strokeWidth="2.5"
      />
      <path
        d="M48 49 L15 70 Q11 75 18 77 L78 77 Q85 75 81 70Z"
        fill={fabric}
        strokeWidth="2"
      />
      <path d="M61 62 L74 64 L76 82 L64 85 L59 72Z" fill={accent} />
      <circle cx="66" cy="68" r="1.5" fill={light} />
    </>
  ),
};

/** Original vector garment artwork, paired with a visible name wherever it is selectable. */
export function GarmentIllustration({
  illustrationId,
  size = 48,
  decorative = true,
}: {
  illustrationId: GarmentIllustrationId;
  size?: number;
  decorative?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 112 112"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={
        decorative ? undefined : garmentIllustrationLabels[illustrationId]
      }
      focusable="false"
      data-garment-illustration={illustrationId}
      style={{ flexShrink: 0 }}
    >
      {!decorative && (
        <title>{garmentIllustrationLabels[illustrationId]}</title>
      )}
      <rect x="1" y="1" width="110" height="110" rx="18" fill="#f3f5ee" />
      <g
        transform="translate(8 0)"
        stroke="#667b61"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <ellipse
          cx="48"
          cy="102"
          rx="27"
          ry="2.5"
          fill="#e7ecdf"
          stroke="none"
        />
        {drawings[illustrationId]}
      </g>
    </svg>
  );
}
