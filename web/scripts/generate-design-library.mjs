// Original technical illustrations. Regenerate only into a NEW version when changing published art.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogue = JSON.parse(
  fs.readFileSync(
    path.join(root, "../docs/GARMENT-IMAGE-CATALOGUE.json"),
    "utf8",
  ),
);
const out = path.join(root, "public/design-library/v1");
fs.mkdirSync(out, { recursive: true });
const fabric = "#dce6d6",
  accent = "#dbb19a",
  paper = "#faf6ee",
  ink = "#4e6050",
  stitch = "#a26749";
const p = (d, fill = fabric, color = ink, extra = "") =>
  `<path d="${d}" fill="${fill}" stroke="${color}" ${extra}/>`;
const l = (d, color = ink, extra = "") => p(d, "none", color, extra);
const c = (x, y, r = 2, fill = accent) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const buttons = (x = 64, start = 44, count = 5, gap = 12) =>
  Array.from({ length: count }, (_, i) => c(x, start + i * gap)).join("");
const pleats = (top = 68, bottom = 132, width = 30) =>
  [-2, -1, 0, 1, 2]
    .map((n) =>
      l(`M${64 + n * 6} ${top} L${64 + (n * width) / 2} ${bottom}`, "#99a68e"),
    )
    .join("");
function top({
  length = 92,
  flare = 0,
  sleeves = 26,
  neck = "round",
  closure = "",
  seam = "",
  hem = "",
  collar = false,
} = {}) {
  const left = 40 - flare,
    right = 88 + flare,
    sy = 30 + sleeves;
  let svg = p(
    `M49 24 L33 30 L${33 - Math.min(16, sleeves / 2)} ${sy} L${43 - Math.min(16, sleeves / 2)} ${sy + 5} L42 49 L42 62 L${left} ${length} Q64 ${length + 6} ${right} ${length} L86 62 L86 49 L${85 + Math.min(16, sleeves / 2)} ${sy + 5} L${95 + Math.min(16, sleeves / 2)} ${sy} L95 30 L79 24 ${neck === "v" ? "L64 46" : "Q64 43 49 24"} Z`,
  );
  if (neck === "v") svg += l("M49 24 L64 46 L79 24", stitch);
  if (collar)
    svg += p("M49 24 L47 35 L57 42 L64 33 L71 42 L81 35 L79 24 L64 33Z", paper);
  if (closure === "buttons")
    svg +=
      l(`M64 36 L64 ${length}`) +
      buttons(64, 46, Math.floor((length - 43) / 12));
  if (closure === "wrap")
    svg +=
      l(`M49 25 L83 76 L83 ${length}`) +
      p("M42 72 L86 72 L86 78 L42 78Z", accent) +
      l("M80 76 Q104 66 96 84 Q83 89 81 76 M83 77 L98 101", stitch);
  if (seam === "princess")
    svg += l(`M44 44 Q57 63 50 ${length} M84 44 Q71 63 78 ${length}`, stitch);
  if (seam === "dart")
    svg += l("M49 61 L55 77 L51 89 M79 61 L73 77 L77 89", stitch);
  if (seam === "panel") svg += pleats(52, length - 4, 30 + flare);
  if (hem === "band")
    svg += l(
      `M${left + 1} ${length - 6} Q64 ${length} ${right - 1} ${length - 6}`,
      stitch,
    );
  return svg;
}
function skirt({
  width = 32,
  length = 136,
  topY = 55,
  pleated = false,
  wrap = false,
  band = false,
  straight = false,
} = {}) {
  const w = straight ? 24 : width;
  return (
    p(
      `M44 ${topY} L84 ${topY} L${64 + w} ${length} Q64 ${length + 9} ${64 - w} ${length} Z`,
    ) +
    p(`M44 ${topY} L84 ${topY} L85 ${topY + 7} L43 ${topY + 7}Z`, accent) +
    (pleated ? pleats(topY + 10, length - 3, w) : "") +
    (wrap ? l(`M76 ${topY + 7} L${48 - w / 2} ${length - 1}`, stitch) : "") +
    (band
      ? l(
          `M${65 - w} ${length - 8} Q64 ${length + 1} ${63 + w} ${length - 8}`,
          stitch,
        )
      : "")
  );
}
function pants({
  wide = 0,
  length = 139,
  baggy = false,
  churidar = false,
  shorts = false,
  pleated = false,
} = {}) {
  const y = shorts ? 99 : length;
  let svg =
    p(
      `M40 29 L88 29 Q${98 + (baggy ? 14 : 0)} 62 ${91 + wide} ${y} L${70 + wide / 3} ${y} L64 68 L${58 - wide / 3} ${y} L${37 - wide} ${y} Q${30 - (baggy ? 14 : 0)} 62 40 29Z`,
    ) +
    p("M40 29 L88 29 L89 37 L39 37Z", accent) +
    l("M64 38 L64 60 L69 57 M43 40 L39 52 M85 40 L89 52");
  if (pleated)
    svg += l(
      `M47 40 Q36 66 47 ${y - 7} M52 40 Q43 65 52 ${y - 7} M81 40 Q92 66 81 ${y - 7} M76 40 Q85 65 76 ${y - 7}`,
      stitch,
    );
  if (churidar)
    svg += l(
      "M38 120 L55 121 M38 126 L55 127 M37 132 L56 133 M73 121 L90 120 M73 127 L90 126 M72 133 L91 132",
      stitch,
    );
  return svg;
}
const transform = (svg, t) => `<g transform="${t}">${svg}</g>`;
function dress({
  wide = 40,
  length = 138,
  sleeves = 14,
  waist = 68,
  kind = "round",
  gathered = false,
} = {}) {
  return (
    skirt({ width: wide, length, topY: waist, pleated: gathered }) +
    top({ length: waist, sleeves, neck: kind }) +
    p(
      `M41 ${waist - 3} L87 ${waist - 3} L88 ${waist + 3} L40 ${waist + 3}Z`,
      accent,
    )
  );
}
function jacket({
  length = 104,
  sleeves = 61,
  lapel = true,
  double = false,
} = {}) {
  return (
    top({ length, sleeves, neck: "v" }) +
    (lapel
      ? p(
          `M49 25 L42 47 L50 49 L46 59 L64 91 L82 59 L78 49 L86 47 L79 25 L64 57Z`,
          paper,
        )
      : p("M49 24 L49 33 Q64 40 79 33 L79 24", accent)) +
    l(`M64 ${lapel ? 57 : 36} L64 ${length}`) +
    buttons(64, lapel ? 91 : 48, lapel ? 1 : 4) +
    l(
      `M43 ${length - 22} L53 ${length - 22} M75 ${length - 22} L85 ${length - 22}`,
    ) +
    (double ? buttons(75, 54, 4) : "")
  );
}
function garment(a) {
  const id = a.id.replace("garment-", "");
  switch (id) {
    case "basic-saree-blouse":
      return top({ length: 86, sleeves: 22, hem: "band" });
    case "princess-seam-blouse":
      return top({ length: 86, sleeves: 22, seam: "princess", hem: "band" });
    case "darted-blouse":
      return top({ length: 86, sleeves: 22, seam: "dart" });
    case "katori-blouse":
      return (
        top({ length: 86, sleeves: 22 }) +
        p("M43 58 Q52 45 63 61 Q61 78 44 72Z", accent) +
        p("M85 58 Q76 45 65 61 Q67 78 84 72Z", accent) +
        l("M64 61 L64 88")
      );
    case "long-blouse":
      return top({ length: 111, sleeves: 38, seam: "dart", hem: "band" });
    case "peplum-blouse":
      return (
        top({ length: 77, sleeves: 15 }) +
        skirt({ topY: 75, length: 99, width: 37, pleated: true })
      );
    case "choli":
      return (
        top({ length: 70, sleeves: 15, neck: "v" }) +
        l("M42 64 Q64 84 86 64", stitch)
      );
    case "pavada-and-davani":
      return (
        dress({ wide: 43, waist: 62, gathered: true }) +
        p("M80 25 L88 29 L55 113 L34 102 L41 88Z", accent) +
        l("M82 34 L46 99", paper)
      );
    case "pattu-pavadai":
      return (
        dress({ wide: 44, waist: 61, gathered: true }) +
        p("M22 129 Q64 142 106 129 L108 138 Q64 147 20 138Z", accent) +
        l("M42 51 Q64 58 86 51", stitch)
      );
    case "saree":
      return (
        p("M47 27 L81 27 L80 62 L98 140 Q65 148 33 140 L43 63Z") +
        p("M46 18 L59 18 L88 87 L77 141 L63 141 L73 89 L40 35Z", accent) +
        pleats(88, 139, 22) +
        l("M46 27 L81 116 M42 35 L77 125", paper)
      );
    case "straight-kurta":
      return (
        top({ length: 130, sleeves: 58, closure: "buttons", hem: "band" }) +
        l("M41 106 L41 130 M87 106 L87 130", stitch)
      );
    case "a-line-kurta":
      return top({
        length: 131,
        sleeves: 40,
        flare: 16,
        neck: "v",
        hem: "band",
      });
    case "anarkali":
      return dress({ wide: 47, sleeves: 56, waist: 61, gathered: true });
    case "angrakha-kurta":
      return top({
        length: 134,
        flare: 20,
        sleeves: 45,
        neck: "v",
        closure: "wrap",
      });
    case "panelled-kurta":
      return top({ length: 132, flare: 16, sleeves: 35, seam: "panel" });
    case "short-kurti":
      return (
        top({ length: 93, sleeves: 38, neck: "v", hem: "band" }) +
        l("M41 81 L41 93 M87 81 L87 93", stitch)
      );
    case "high-low-kurta":
      return (
        p("M40 92 L88 92 L90 138 Q64 148 38 138Z", accent) +
        top({ length: 114, flare: 7, sleeves: 40 }) +
        l("M34 114 Q64 99 94 114", stitch)
      );
    case "salwar-suit":
      return (
        transform(pants({ baggy: true }), "translate(18 68) scale(.72 .53)") +
        top({ length: 109, sleeves: 43, neck: "v" }) +
        p("M34 28 L40 29 L33 120 L24 116Z", accent)
      );
    case "churidar-set":
      return (
        transform(
          pants({ churidar: true }),
          "translate(18 55) scale(.72 .62)",
        ) + top({ length: 111, sleeves: 56, hem: "band" })
      );
    case "sharara-suit":
      return (
        transform(pants({ wide: 23 }), "translate(4 68) scale(.94 .54)") +
        top({ length: 85, sleeves: 32, seam: "dart" })
      );
    case "straight-trousers":
      return pants();
    case "churidar-bottoms":
      return pants({ churidar: true, baggy: true });
    case "salwar-bottoms":
      return (
        pants({ baggy: true }) +
        l("M41 42 Q17 80 39 129 M87 42 Q111 80 89 129", stitch) +
        l("M37 132 L57 132 M71 132 L91 132", stitch)
      );
    case "patiala-bottoms":
      return pants({ baggy: true, pleated: true });
    case "palazzo":
      return pants({ wide: 21 });
    case "sharara-bottoms":
      return (
        pants({ wide: 25 }) +
        l(
          "M41 46 L22 132 M48 47 L36 136 M87 46 L106 132 M80 47 L92 136",
          stitch,
        )
      );
    case "gharara-bottoms":
      return (
        pants() +
        p("M38 91 L59 91 L59 139 L18 139Z", accent) +
        p("M69 91 L90 91 L110 139 L69 139Z", accent) +
        l("M43 96 L30 135 M80 96 L97 135", stitch)
      );
    case "dhoti-pants":
      return (
        pants({ baggy: true }) +
        p("M41 37 L87 37 Q97 64 59 106 Q36 93 38 72Z", paper) +
        l("M46 42 Q79 66 59 103 M55 40 Q88 68 67 93", stitch)
      );
    case "leggings":
      return (
        p(
          "M44 27 L84 27 Q91 55 83 141 L71 141 L64 66 L57 141 L45 141 Q37 55 44 27Z",
        ) +
        p("M44 27 L84 27 L85 35 L43 35Z", accent) +
        l("M64 35 L64 66")
      );
    case "shorts":
      return pants({ shorts: true }) + l("M36 92 L58 92 M70 92 L92 92", stitch);
    case "straight-skirt":
      return skirt({ straight: true, topY: 28 });
    case "a-line-skirt":
      return skirt({ width: 38, topY: 28 });
    case "circular-skirt":
      return skirt({ width: 53, topY: 30, length: 125, pleated: true });
    case "pleated-skirt":
      return (
        skirt({ width: 34, topY: 28, pleated: true }) +
        [-3, -2, -1, 0, 1, 2, 3]
          .map((n) => l(`M${64 + n * 5} 37 L${64 + n * 10} 135`, stitch))
          .join("")
      );
    case "wrap-skirt":
      return (
        skirt({ topY: 28, wrap: true }) +
        l("M76 35 Q102 27 97 43 Q86 49 77 36 M79 39 L98 69", stitch)
      );
    case "saree-petticoat":
      return (
        skirt({ topY: 26, width: 31, pleated: true, band: true }) +
        l(
          "M59 30 Q47 21 48 34 Q55 39 64 31 Q78 22 78 33 Q72 38 64 31 M64 32 L66 48",
          stitch,
        )
      );
    case "lehenga":
      return (
        skirt({ topY: 32, width: 50, pleated: true, band: true }) +
        l("M21 121 Q64 134 107 121", stitch) +
        [-3, -2, -1, 0, 1, 2, 3]
          .map((n) => p(`M${64 + n * 11} 112 l3 4 -3 4 -3 -4Z`, accent))
          .join("")
      );
    case "a-line-dress":
      return dress({ waist: 67, wide: 37, sleeves: 12 });
    case "shift-dress":
      return (
        top({ length: 134, flare: 3, sleeves: 14 }) +
        l("M46 50 L54 59 M82 50 L74 59", stitch)
      );
    case "maxi-dress":
      return dress({
        waist: 66,
        wide: 34,
        sleeves: 0,
        kind: "v",
        gathered: true,
      });
    case "evening-gown":
      return (
        dress({ waist: 59, wide: 49, sleeves: 0, kind: "v", gathered: true }) +
        p("M43 54 L85 54 L87 62 L41 62Z", accent) +
        c(64, 58, 3, paper)
      );
    case "jumpsuit":
      return (
        transform(pants({ wide: 12 }), "translate(8 55) scale(.88 .64)") +
        top({ length: 75, sleeves: 12, neck: "v", closure: "buttons" })
      );
    case "shirt":
      return (
        top({ length: 108, sleeves: 60, collar: true, closure: "buttons" }) +
        p("M73 51 L84 51 L84 65 L78 69 L73 65Z", paper) +
        l("M12 85 L24 90 M104 90 L116 85", stitch)
      );
    case "t-shirt":
      return (
        top({ length: 111, sleeves: 23 }) + l("M49 29 Q64 46 79 29", stitch)
      );
    case "polo-shirt":
      return (
        top({ length: 109, sleeves: 25, collar: true }) +
        l("M64 35 L64 58") +
        buttons(64, 43, 2, 9)
      );
    case "kurta-pyjama-set":
      return (
        transform(pants(), "translate(20 53) scale(.69 .63)") +
        top({ length: 110, sleeves: 58, closure: "buttons", hem: "band" })
      );
    case "sherwani":
      return (
        jacket({ length: 135, lapel: false }) +
        l("M41 126 Q64 132 87 126", stitch) +
        p("M71 47 L84 47 L84 50 L71 50Z", accent)
      );
    case "nehru-jacket":
      return jacket({ length: 105, sleeves: 0, lapel: false });
    case "waistcoat":
      return (
        jacket({ length: 93, sleeves: 0, lapel: false }) +
        p("M49 25 L64 67 L79 25 L64 35Z", paper) +
        l("M40 90 L53 103 L64 92 L75 103 L88 90", stitch)
      );
    case "blazer":
      return jacket();
    case "dhoti-or-mundu":
      return (
        p("M35 31 L92 31 L100 139 Q66 146 29 139Z", paper) +
        p("M87 31 L93 31 L100 139 L94 141Z", accent) +
        l("M55 33 L55 138 M60 34 L60 141 M65 34 L65 141 M70 34 L70 141") +
        p("M30 131 L99 131 L100 139 Q66 146 29 139Z", accent)
      );
    case "suit":
      return (
        transform(pants(), "translate(19 58) scale(.7 .59)") +
        jacket({ length: 94, sleeves: 54 }) +
        p("M62 38 L66 38 L69 65 L64 71 L59 65Z", accent)
      );
    case "abaya":
      return (
        top({ length: 140, flare: 16, sleeves: 71, closure: "buttons" }) +
        l("M47 57 L39 135 M81 57 L89 135", stitch)
      );
    case "kaftan":
      return (
        p(
          "M49 22 L24 34 L10 109 L29 112 L25 140 Q64 148 103 140 L99 112 L118 109 L104 34 L79 22 L64 45Z",
        ) +
        p("M49 22 L64 45 L79 22 L75 39 L64 54 L53 39Z", accent) +
        l("M38 56 L32 126 M90 56 L96 126", stitch)
      );
    case "nightdress":
      return (
        dress({ waist: 52, wide: 32, sleeves: 14, gathered: true }) +
        l("M48 40 Q64 49 80 40", stitch) +
        buttons(64, 41, 2, 7)
      );
    case "pyjama-set":
      return (
        transform(pants({ wide: 4 }), "translate(16 60) scale(.75 .6)") +
        top({ length: 91, sleeves: 55, collar: true, closure: "buttons" }) +
        p("M72 52 L84 52 L84 65 L72 65Z", paper)
      );
    case "robe":
      return (
        top({
          length: 138,
          flare: 7,
          sleeves: 62,
          neck: "v",
          closure: "wrap",
        }) + p("M49 25 L76 72 L84 76 L54 22Z", paper)
      );
    case "maternity-dress":
      return (
        dress({ waist: 52, wide: 45, sleeves: 22, gathered: true }) +
        l("M49 73 Q39 97 44 117 M79 73 Q89 97 84 117", stitch)
      );
    case "frock":
      return (
        transform(
          dress({
            waist: 62,
            wide: 46,
            sleeves: 16,
            length: 125,
            gathered: true,
          }),
          "translate(10 13) scale(.84)",
        ) + p("M57 64 L51 59 L49 67 L57 65 L64 62 L65 69 L58 66Z", accent)
      );
    case "pinafore-dress":
      return (
        p(
          "M45 29 L53 29 L53 47 L75 47 L75 29 L83 29 L84 71 L104 130 Q64 141 24 130 L44 71Z",
        ) +
        p("M51 55 L77 55 L77 74 Q64 80 51 74Z", accent) +
        buttons(49, 45, 1) +
        buttons(79, 45, 1) +
        pleats(81, 127, 32)
      );
    case "romper":
      return (
        top({ length: 80, sleeves: 18 }) +
        p("M40 78 L88 78 L92 116 L70 116 L64 96 L58 116 L36 116Z") +
        l("M64 42 L64 79") +
        buttons(64, 47, 3, 10) +
        buttons(64, 92, 2, 7)
      );
    case "kids-kurta-set":
      return transform(
        transform(pants(), "translate(19 55) scale(.71 .61)") +
          top({ length: 108, sleeves: 48, closure: "buttons" }),
        "translate(13 16) scale(.8)",
      );
    case "kids-lehenga-set":
      return transform(
        dress({ waist: 62, wide: 46, sleeves: 12, gathered: true }) +
          p("M79 24 L87 30 L45 115 L35 107Z", accent),
        "translate(13 14) scale(.8)",
      );
    case "uniform-shirt":
      return (
        top({ length: 108, sleeves: 24, collar: true, closure: "buttons" }) +
        p("M44 51 L56 51 L56 65 L50 68 L44 65Z", paper) +
        p("M72 51 L84 51 L84 65 L78 68 L72 65Z", paper) +
        l("M32 33 L44 29 M84 29 L96 33", stitch)
      );
    case "uniform-trousers":
      return (
        pants() +
        l("M46 43 L46 134 M82 43 L82 134", stitch) +
        p("M42 29 L47 29 L47 39 L42 39Z", paper) +
        p("M81 29 L86 29 L86 39 L81 39Z", paper)
      );
    case "scrub-set":
      return (
        transform(pants(), "translate(18 64) scale(.72 .58)") +
        top({ length: 91, sleeves: 23, neck: "v" }) +
        p("M43 66 L56 66 L56 81 L43 81Z", paper) +
        p("M73 46 L84 46 L84 59 L73 59Z", paper)
      );
    case "lab-coat":
      return (
        jacket({ length: 136 }) +
        p("M44 97 L55 97 L55 115 L44 115Z", paper) +
        p("M73 97 L84 97 L84 115 L73 115Z", paper)
      );
    case "chef-coat":
      return (
        top({ length: 115, sleeves: 59, closure: "buttons", collar: true }) +
        l("M78 38 L78 115") +
        buttons(78, 46, 5) +
        l("M11 84 L24 89 M104 89 L117 84", stitch)
      );
    case "alteration":
      return (
        p("M28 30 L74 30 L94 126 L41 137Z", paper) +
        l("M35 36 L51 127 M62 36 L82 124", stitch, 'stroke-dasharray="4 4"') +
        `<g transform="rotate(-22 67 86)">${c(52, 98, 10, accent)}${c(77, 98, 10, accent)}${l("M53 90 L78 48 M75 90 L51 48", ink, 'stroke-width="4"')}${c(64, 74, 3, paper)}</g>`
      );
    case "other-or-service":
      return (
        p("M26 53 L65 23 L104 53 L94 130 L35 130Z", paper) +
        c(65, 43, 5, accent) +
        l("M46 73 L84 73 M46 87 L77 87 M46 101 L69 101", stitch) +
        l("M65 38 Q98 7 112 25")
      );
    default:
      throw new Error(`Missing model: ${id}`);
  }
}
function detail(a) {
  const id = a.id.replace(`detail-${a.kind}-`, "");
  const body = p(
    "M44 28 L23 40 L15 72 L34 78 L39 59 L39 134 L89 134 L89 59 L94 78 L113 72 L105 40 L84 28 L75 24 Q64 36 53 24Z",
    "#e8eddf",
    "#9aa68f",
  );
  const hi = (d, fill = "none") => p(d, fill, stitch, 'stroke-width="2.6"');
  if (a.kind === "front-neck" || a.kind === "back") {
    const shape = id.replace(/-back$/, "");
    const necks = {
      round: "M44 28 Q64 73 84 28",
      "u-neck": "M44 28 L44 56 Q64 80 84 56 L84 28",
      u: "M44 28 L44 76 Q64 97 84 76 L84 28",
      "v-neck": "M44 28 L64 75 L84 28",
      v: "M44 28 L64 96 L84 28",
      boat: "M35 34 Q64 54 93 34",
      square: "M44 28 L44 68 L84 68 L84 28",
      sweetheart: "M44 28 Q41 72 64 55 Q87 72 84 28",
      pentagon: "M44 28 L44 57 L64 76 L84 57 L84 28",
      leaf: "M44 28 Q43 60 64 76 Q85 60 84 28",
      scalloped:
        "M44 28 Q40 39 48 43 Q41 54 53 55 Q53 68 64 60 Q75 68 75 55 Q87 54 80 43 Q88 39 84 28",
      keyhole:
        "M47 27 Q64 49 81 27 M64 48 C42 64 44 88 64 90 C84 88 86 64 64 48Z",
      teardrop:
        "M47 27 Q64 43 81 27 M64 47 C34 78 47 102 64 102 C81 102 94 78 64 47Z",
      halter: "M52 25 Q64 31 76 25 L83 40 L95 63 M52 25 L45 40 L33 63",
      asymmetric: "M36 36 Q64 85 89 58",
      racerback: "M48 28 Q68 48 58 68 L46 100 M80 28 Q60 48 70 68 L82 100",
      "cross-strap": "M46 28 L82 105 M82 28 L46 105",
      open: "M44 28 Q32 119 64 119 Q96 119 84 28",
    };
    if (shape === "halter")
      return (
        body +
        hi("M52 25 Q64 31 76 25 L83 40 L95 63 M52 25 L45 40 L33 63", paper)
      );
    if (!necks[shape]) throw new Error(a.id);
    return (
      body +
      hi(
        necks[shape],
        a.kind === "back" &&
          !["racerback", "cross-strap", "boat"].includes(shape)
          ? paper
          : "none",
      ) +
      (a.kind === "back"
        ? l("M64 122 L64 134", "#9aa68f", 'stroke-dasharray="3 3"')
        : "")
    );
  }
  if (a.kind === "sleeve-shape") {
    const shapes = {
      "straight-sleeve": "M48 29 Q75 23 86 45 L103 117 L80 122 L60 56Z",
      "puff-sleeve": "M48 29 Q84 9 102 41 Q118 69 92 82 L69 69 Q80 46 48 29Z",
      "bell-sleeve": "M48 29 Q75 23 86 45 L117 117 Q95 134 70 121 L66 61Z",
      "cap-sleeve": "M48 29 Q79 22 91 46 L75 64 Q68 43 48 29Z",
      "petal-sleeve":
        "M48 29 Q82 13 98 52 Q83 76 64 61 Q80 43 48 29Z M49 30 Q70 22 82 58",
      "flutter-sleeve":
        "M48 29 Q75 20 87 40 L111 69 Q100 62 98 78 Q86 64 81 76 Q68 61 66 68 L60 52Z",
      "bishop-sleeve":
        "M48 29 Q82 20 91 51 Q94 70 109 106 Q114 124 91 130 L78 118 Q78 77 60 53Z M78 118 L91 130 L96 140 L79 144 L73 128Z",
      "lantern-sleeve":
        "M48 29 Q82 20 94 55 L101 84 Q122 106 101 128 L81 128 Q62 110 76 86 L60 54Z M76 86 L101 84",
      "raglan-sleeve": "M39 23 Q74 20 87 43 L108 120 L84 126 L62 64 L39 23Z",
      "batwing-sleeve": "M38 25 L83 32 L115 109 L96 122 Q65 94 36 112 L40 81Z",
      "ruffle-sleeve":
        "M48 29 Q77 20 88 46 L94 67 L105 72 L115 89 Q104 83 100 99 Q86 84 80 95 L73 81 L72 69 L60 52Z",
      "layered-sleeve":
        "M48 29 Q75 20 87 42 L95 60 L67 68 L60 51Z M70 66 L96 59 L107 79 L73 91Z M76 89 L105 80 L114 101 L80 113Z",
    };
    return (
      p(
        "M35 29 L47 28 Q65 44 60 60 L57 134 L20 134 L24 43Z",
        "#e8eddf",
        "#9aa68f",
      ) + hi(shapes[id], accent)
    );
  }
  if (a.kind === "sleeve-length") {
    if (id === "sleeveless")
      return (
        p(
          "M35 28 L48 28 Q69 45 61 70 L58 136 L22 136 L25 44Z",
          "#e8eddf",
          "#9aa68f",
        ) +
        p("M50 29 Q78 26 87 51 L107 139 L88 145 L63 65Z", paper, "#b5b9a9") +
        hi("M48 28 Q68 43 61 70")
      );
    const end = {
      sleeveless: 28,
      short: 55,
      elbow: 81,
      "three-quarter": 108,
      full: 136,
    }[id];
    return (
      p("M49 28 Q76 20 86 46 L107 139 L88 145 L63 65Z", paper, "#b5b9a9") +
      hi(
        `M49 28 Q73 22 85 43 L${79 + (end - 28) * 0.25} ${end} L${62 + (end - 28) * 0.25} ${end + 5} L61 52Z`,
        accent,
      ) +
      hi(
        `M${59 + (end - 28) * 0.25} ${end + 8} L${82 + (end - 28) * 0.25} ${end + 2}`,
      )
    );
  }
  if (a.kind === "collar") {
    const s = {
      "no-collar": "M47 27 Q64 55 81 27",
      "shirt-collar":
        "M47 26 L41 47 L55 58 L64 42 L73 58 L87 47 L81 26 L64 38Z",
      "mandarin-collar":
        "M47 25 L47 39 Q58 48 62 43 L62 30 M66 30 L66 43 Q70 48 81 39 L81 25",
      "peter-pan-collar":
        "M47 26 Q29 46 48 59 Q64 65 64 39 Q64 65 80 59 Q99 46 81 26 L64 38Z",
      "shawl-collar":
        "M47 25 Q20 62 61 103 L65 96 Q43 57 59 35 M81 25 Q106 62 65 103 L61 96 Q85 57 69 35",
      "notched-lapel":
        "M47 25 L35 50 L48 49 L38 64 L64 106 L90 64 L80 49 L93 50 L81 25 L64 57Z",
      "sailor-collar":
        "M47 25 L30 39 L49 67 L64 79 L79 67 L98 39 L81 25 L64 57Z M35 39 L52 63 L64 73 L76 63 L93 39",
      "tie-neck":
        "M47 26 Q64 44 81 26 L81 33 L66 45 L78 78 L65 73 L62 48 L49 80 L43 68 L59 43 L47 33Z",
    };
    return (
      body +
      hi(s[id], id === "no-collar" ? "none" : accent) +
      l("M64 82 L64 130", "#9aa68f")
    );
  }
  if (a.kind === "closure") {
    if (/buttons/.test(id))
      return (
        body +
        hi("M59 36 L59 132 M69 36 L69 132") +
        buttons(64, 46, 6, 14) +
        (id === "back-buttons"
          ? hi("M45 28 Q64 48 83 28")
          : hi("M47 28 L64 53 L81 28"))
      );
    if (/zip/.test(id)) {
      const x = id === "side-zip" ? 88 : 64;
      return (
        body +
        hi(`M${x} 50 L${x} 122`) +
        Array.from({ length: 12 }, (_, i) =>
          hi(`M${x - 3} ${54 + i * 5} L${x + 3} ${54 + i * 5}`),
        ).join("") +
        p(`M${x - 2} 46 h4 v8 h-4Z`, accent)
      );
    }
    if (id === "hooks-and-eyes")
      return (
        body +
        hi("M59 37 L59 130 M69 37 L69 130") +
        [48, 70, 92, 114]
          .map((y) =>
            hi(
              `M54 ${y} L64 ${y} Q72 ${y + 4} 64 ${y + 8} M70 ${y} Q80 ${y + 4} 70 ${y + 8}`,
            ),
          )
          .join("")
      );
    if (id === "dori-tie")
      return (
        body +
        hi("M45 28 L45 96 Q64 122 83 96 L83 28", paper) +
        hi(
          "M43 72 L64 85 L85 72 M64 85 Q45 68 46 86 Q49 96 64 85 Q84 68 83 87 Q80 97 64 85 M64 86 L57 122 M64 86 L74 123",
        )
      );
    if (id === "wrap-tie")
      return (
        body +
        hi(
          "M47 27 L87 89 L87 131 M39 86 L87 86 M84 87 Q105 69 104 86 Q99 99 85 88 M86 91 L108 123 M85 90 L91 124",
        )
      );
    return (
      body +
      hi("M47 27 Q64 61 81 27") +
      hi("M64 112 L64 75 M54 85 L64 75 L74 85")
    );
  }
  if (a.kind === "hem") {
    const lines = {
      "straight-hem": "M27 116 L101 116",
      "curved-hem": "M27 106 Q64 145 101 106",
      "high-low-hem": "M27 100 Q64 96 101 122 M27 115 Q64 145 101 122",
      "asymmetric-hem": "M27 98 L101 135",
      "slit-hem": "M27 126 L78 126 L81 96 L85 126 L101 126",
      "scalloped-hem":
        "M27 114 Q33 133 39 114 Q45 133 51 114 Q57 133 63 114 Q69 133 75 114 Q81 133 87 114 Q94 133 101 114",
      "ruffled-hem":
        "M27 105 Q64 116 101 105 L109 127 Q100 119 94 133 Q85 121 80 135 Q71 123 65 138 Q57 124 51 136 Q42 123 37 133 Q27 119 20 127Z",
      "banded-hem": "M27 110 L101 110 L103 124 L25 124Z",
    };
    const bottom = {
      "straight-hem": "L101 116 L27 116",
      "curved-hem": "L101 106 Q64 145 27 106",
      "high-low-hem": "L101 122 Q64 145 27 115 L27 100 Q64 96 101 122",
      "asymmetric-hem": "L101 135 L27 98",
      "slit-hem": "L101 126 L85 126 L81 96 L78 126 L27 126",
      "scalloped-hem":
        "L101 114 Q94 133 87 114 Q81 133 75 114 Q69 133 63 114 Q57 133 51 114 Q45 133 39 114 Q33 133 27 114",
      "ruffled-hem": "L101 105 Q64 116 27 105",
      "banded-hem": "L101 110 L27 110",
    };
    return (
      p(`M43 30 L85 30 ${bottom[id]}Z`, "#e8eddf", "#9aa68f") +
      hi(lines[id], /ruffled|banded/.test(id) ? accent : "none")
    );
  }
  if (a.kind === "construction") {
    const base = top({
      length: 134,
      flare: id === "a-line-cut" ? 20 : 4,
      sleeves: 0,
    });
    const lines = {
      "straight-cut": "M42 54 L40 134 M86 54 L88 134",
      "a-line-cut": "M42 54 L20 134 M86 54 L108 134",
      "princess-seams":
        "M44 42 Q58 60 51 89 L48 134 M84 42 Q70 60 77 89 L80 134",
      "waist-darts":
        "M52 57 L48 84 L52 108 L56 84Z M76 57 L72 84 L76 108 L80 84Z",
      panelled: "M49 45 L42 134 M64 37 L64 137 M79 45 L86 134",
      "gathered-waist":
        "M42 71 L86 71 M46 73 L43 97 M52 73 L49 96 M58 73 L56 97 M64 73 L64 97 M70 73 L72 97 M76 73 L79 97 M82 73 L85 97",
      "pleated-waist":
        "M42 70 L86 70 M49 71 L47 133 L56 133 L55 71 M73 71 L72 133 L81 133 L79 71",
      "wrap-cut": "M49 25 L85 83 L44 134 M42 83 L85 83",
    };
    return base + hi(lines[id]);
  }
  if (a.kind === "pocket") {
    const base = p("M25 28 L103 28 L107 137 L21 137Z", "#e8eddf", "#9aa68f");
    const lines = {
      "no-pocket": "M41 85 L87 85",
      "patch-pocket": "M39 63 L89 63 L89 102 Q64 130 39 102Z M40 70 L88 70",
      "side-seam-pocket": "M78 29 L78 57 Q48 78 78 103 L78 137 M78 57 L78 103",
      "welt-pocket": "M34 69 L94 69 L94 81 L34 81Z M35 75 L93 75",
      "flap-pocket":
        "M38 73 L90 73 L90 110 L38 110Z M34 64 L94 64 L94 83 L64 94 L34 83Z",
      "kangaroo-pocket":
        "M40 60 L88 60 Q87 83 103 92 L100 117 L28 117 L25 92 Q41 83 40 60Z",
    };
    return base + hi(lines[id], id === "no-pocket" ? "none" : accent);
  }
  if (a.kind === "cuff") {
    return (
      p("M37 24 L91 24 L85 97 L43 97Z", "#e8eddf", "#9aa68f") +
      (id === "french-cuff"
        ? hi("M38 90 L90 90 L93 125 L35 125Z M37 111 L91 111", accent) +
          c(89, 108, 4, stitch)
        : hi("M41 91 L87 91 L89 124 L39 124Z", accent) +
          (id === "button-cuff"
            ? hi("M75 92 L75 124") + c(81, 108, 3, stitch)
            : ""))
    );
  }
  throw new Error(`Missing detail: ${a.id}`);
}
const aliases = {
  "garment-basic-saree-blouse": ["blouse", "sari blouse"],
  "garment-pavada-and-davani": ["pavada & davani", "half saree", "langa voni"],
  "garment-pattu-pavadai": ["pattu pavada", "pavadai sattai"],
  "garment-churidar-set": ["churidar", "chudidar", "salwar kameez"],
  "garment-straight-kurta": ["kurta", "kameez"],
  "garment-short-kurti": ["kurti"],
  "garment-saree": ["sari"],
  "garment-straight-trousers": ["pants", "trousers", "pant"],
  "garment-evening-gown": ["gown"],
  "garment-frock": ["kids dress", "child dress"],
  "garment-dhoti-or-mundu": ["veshti", "mundu", "dhoti"],
  "garment-saree-petticoat": ["underskirt", "in-skirt"],
  "detail-closure-dori-tie": ["tie back", "dori"],
  "detail-front-neck-round": ["round neck", "crew neck"],
  "detail-sleeve-length-three-quarter": ["3/4 sleeve", "three quarter"],
};
const metadata = [];
for (const a of catalogue.entries) {
  const drawing = a.kind === "garment" ? garment(a) : detail(a);
  const title = a.label.replace(/&/g, "&amp;");
  fs.writeFileSync(
    path.join(out, `${a.id}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 160" width="128" height="160"><title>${title}</title><rect x="1" y="1" width="126" height="158" rx="16" fill="${paper}"/><path d="M17 146H111" stroke="#e5dfd2"/><g stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${drawing}</g></svg>\n`,
  );
  metadata.push({
    id: a.id,
    label: a.label,
    kind: a.kind,
    family: a.family,
    view:
      a.kind === "garment"
        ? "front"
        : a.kind === "back" ||
            a.id.includes("back-buttons") ||
            a.id.includes("back-zip") ||
            a.id.includes("dori-tie")
          ? "back"
          : "detail",
    aliases: aliases[a.id] ?? [],
    source: "builtin",
    active: true,
    favourite: false,
    revision: 0,
  });
}
fs.mkdirSync(path.join(root, "src/features/design-library/domain"), {
  recursive: true,
});
fs.writeFileSync(
  path.join(root, "src/features/design-library/domain/builtins.json"),
  JSON.stringify(metadata, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(root, "src/features/design-library/domain/families.json"),
  JSON.stringify(
    catalogue.garmentFamilies.map(({ id, label }) => ({ id, label })),
    null,
    2,
  ) + "\n",
);
console.log(`Generated ${metadata.length} original SVGs in ${out}`);
