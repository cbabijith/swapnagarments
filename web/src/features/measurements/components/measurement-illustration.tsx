import { useId } from "react";
import type { MeasurementGuideId } from "../contracts/guide";
import { measurementGuides } from "../domain/guides";

type Mark = {
  path: string;
  start?: [number, number];
  end?: [number, number];
  hidden?: string;
};
const loop = (x: number, y: number, rx: number, ry: number): Mark => ({
  path: `M${x - rx} ${y} A${rx} ${ry} 0 0 0 ${x + rx} ${y}`,
  hidden: `M${x - rx} ${y} A${rx} ${ry} 0 0 1 ${x + rx} ${y}`,
});
const marks: Record<MeasurementGuideId, Mark> = {
  bust: loop(120, 112, 35, 9),
  underbust: loop(120, 132, 31, 8),
  waist: loop(120, 155, 30, 7),
  hip: loop(120, 197, 39, 9),
  "shoulder-width": {
    path: "M73 86 Q120 71 167 86",
    start: [73, 86],
    end: [167, 86],
  },
  "armhole-around": {
    path: "M165 86 C150 90 149 115 160 131 C174 128 181 99 165 86",
    hidden: "M165 86 C177 96 168 115 160 131",
  },
  "armhole-depth": {
    path: "M174 86 L174 131",
    start: [174, 86],
    end: [174, 131],
  },
  "sleeve-length": {
    path: "M168 86 L189 153",
    start: [168, 86],
    end: [189, 153],
  },
  "sleeve-opening": {
    path: "M171 145 Q178 157 193 153",
    hidden: "M171 145 Q183 140 193 153",
  },
  "upper-arm": {
    path: "M163 116 Q172 129 184 124",
    hidden: "M163 116 Q178 110 184 124",
  },
  "wrist-around": {
    path: "M187 182 Q192 192 203 188",
    hidden: "M187 182 Q197 177 203 188",
  },
  "front-neck-depth": {
    path: "M133 74 L120 119",
    start: [133, 74],
    end: [120, 119],
  },
  "back-neck-depth": {
    path: "M133 74 L120 131",
    start: [133, 74],
    end: [120, 131],
  },
  "blouse-length": {
    path: "M107 74 Q99 108 104 123 L104 166",
    start: [107, 74],
    end: [104, 166],
  },
  "front-waist-length": {
    path: "M107 74 Q99 108 104 123 L104 155",
    start: [107, 74],
    end: [104, 155],
  },
  "back-waist-length": {
    path: "M120 73 L120 155",
    start: [120, 73],
    end: [120, 155],
  },
  "top-length": {
    path: "M107 74 Q99 108 104 123 L104 246",
    start: [107, 74],
    end: [104, 246],
  },
  "gown-length": {
    path: "M107 74 Q99 108 104 123 L104 300",
    start: [107, 74],
    end: [104, 300],
  },
  "wearing-waist": loop(120, 176, 33, 8),
  "skirt-length": {
    path: "M153 176 L168 292",
    start: [153, 176],
    end: [168, 292],
  },
  "bottom-length": {
    path: "M153 176 Q163 208 156 237 L152 298",
    start: [153, 176],
    end: [152, 298],
  },
  "ankle-around": loop(142, 282, 11, 5),
};

/** Original SVG artwork: no third-party model images, remote requests or customer photographs. */
export function MeasurementIllustration({
  guideId,
  decorative = false,
  mini = false,
}: {
  guideId: MeasurementGuideId;
  decorative?: boolean;
  mini?: boolean;
}) {
  const id = useId(),
    guide = measurementGuides[guideId],
    mark = marks[guideId];
  const full = [
    "gown-length",
    "top-length",
    "skirt-length",
    "bottom-length",
    "ankle-around",
  ].includes(guideId);
  const lower = guideId === "ankle-around";
  return (
    <svg
      viewBox={
        lower ? "64 204 116 110" : full ? "20 8 200 306" : "27 10 186 212"
      }
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-labelledby={decorative ? undefined : `${id}-title ${id}-desc`}
      focusable="false"
      data-guide={guideId}
    >
      {!decorative && (
        <>
          <title id={`${id}-title`}>
            {guide.title}: {guide.view.toLowerCase()} view,{" "}
            {guide.kind.toLowerCase()}
          </title>
          <desc id={`${id}-desc`}>{guide.steps.join(" ")}</desc>
        </>
      )}
      <g
        stroke="#8d9b8b"
        strokeWidth={mini ? 2 : 1.45}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M108 60 L107 72 Q94 77 73 83 Q62 86 58 101 L36 184 Q33 195 41 198 Q49 200 52 190 L77 123 Q79 143 90 154 Q93 166 84 184 Q77 202 83 220 L88 285 Q87 295 82 302 Q92 309 108 303 L116 239 Q117 231 120 228 Q123 231 124 239 L132 303 Q148 309 158 302 Q153 295 152 285 L157 220 Q163 202 156 184 Q147 166 150 154 Q161 143 163 123 L188 190 Q191 200 199 198 Q207 195 204 184 L182 101 Q178 86 167 83 Q146 77 133 72 L132 60"
          fill="#f3eee5"
        />
        <path
          d="M137 37 C137 52 130 64 120 64 C110 64 103 52 103 37 C103 23 110 17 120 17 C130 17 137 23 137 37Z"
          fill="#f3eee5"
        />
        <path
          d={
            guide.view === "Back"
              ? "M107 74 Q120 81 133 74 L162 86 L157 119 Q147 147 151 166 Q120 175 89 166 Q93 147 83 119 L78 86Z"
              : "M107 74 Q120 94 133 74 L162 86 L157 119 Q147 147 151 166 Q120 175 89 166 Q93 147 83 119 L78 86Z"
          }
          fill="#dce6d6"
        />
        <path
          d="M89 166 Q120 175 151 166 Q161 192 155 213 L127 217 L120 205 L113 217 L85 213 Q79 192 89 166Z"
          fill="#dce6d6"
        />
        {guide.view === "Back" ? (
          <path d="M120 84 L120 162" strokeDasharray="3 5" stroke="#a4b29e" />
        ) : (
          <path
            d="M92 115 Q100 120 108 116 M132 116 Q140 120 148 115"
            stroke="#adbaa6"
          />
        )}
        <path d="M73 83 Q84 96 77 123 M167 83 Q156 96 163 123" />
        {(guideId === "skirt-length" || guideId === "gown-length") && (
          <path
            d="M87 176 Q120 184 153 176 L175 298 Q120 310 65 298Z"
            fill="#e3eadcf0"
            strokeDasharray="4 4"
          />
        )}
        {guideId === "top-length" && (
          <path
            d="M89 166 Q120 173 151 166 L160 246 Q120 254 80 246Z"
            fill="#e3eadcf0"
            strokeDasharray="4 4"
          />
        )}
      </g>
      <g stroke="#ad4e2d" strokeLinecap="round" strokeLinejoin="round">
        {mark.hidden && (
          <path
            d={mark.hidden}
            strokeWidth={mini ? 4 : 2.5}
            strokeDasharray="3 4"
          />
        )}
        <path d={mark.path} stroke="#fffaf1" strokeWidth={mini ? 7.5 : 6.5} />
        <path d={mark.path} strokeWidth={mini ? 4.5 : 3.5} />
        {mark.start && (
          <circle
            cx={mark.start[0]}
            cy={mark.start[1]}
            r={mini ? 4 : 3.8}
            fill="#fffaf1"
            strokeWidth="2"
          />
        )}
        {mark.end && (
          <circle
            cx={mark.end[0]}
            cy={mark.end[1]}
            r={mini ? 4 : 3.8}
            fill="#ad4e2d"
            strokeWidth="2"
          />
        )}
      </g>
      {!mini && mark.start && mark.end && (
        <g
          fontSize="10"
          fontFamily="Arial, sans-serif"
          fontWeight="700"
          fill="#81381f"
        >
          <text x={mark.start[0] + 10} y={mark.start[1] - 4}>
            1
          </text>
          <text x={mark.end[0] + 10} y={mark.end[1] + 5}>
            2
          </text>
        </g>
      )}
    </svg>
  );
}
