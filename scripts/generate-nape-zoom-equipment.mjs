/**
 * Draws the five oil-and-gas equipment pictures used by the NAPE 2026 Zoom In
 * challenges → public/media/puzzles/nape/zoom/*.svg
 *
 *   node scripts/generate-nape-zoom-equipment.mjs
 *
 * They match the original zoom pictures (600×600 vector art on a pale ground,
 * no text that could give the answer away) and are composed for the existing
 * zoom engine, which magnifies about the point (50%, 42%) = (300, 252) of the
 * image: 7× → 4.2× → 2.4× → 1.35× → full picture. So the middle of every
 * drawing carries a recognisable-but-ambiguous detail (bolted flange, valve
 * body, carbide inserts, brush bristles, dial hub).
 *
 * Vector illustrations, not photographs: free, offline, and exactly as sharp at
 * 7× as at 1×. Free of words — the gauge dial carries numerals only.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "media", "puzzles", "nape", "zoom");
mkdirSync(OUT, { recursive: true });

const INK = "#1c2733";
const GROUND = (cy = 540, rx = 230) => `<ellipse cx="300" cy="${cy}" rx="${rx}" ry="22" fill="#12233b" opacity="0.09"/>`;
const DEFS = `
    <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8b97a6"/><stop offset="0.35" stop-color="#eef2f6"/>
      <stop offset="0.62" stop-color="#b9c3cf"/><stop offset="1" stop-color="#6b7686"/>
    </linearGradient>
    <linearGradient id="steelV" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#707c8c"/><stop offset="0.3" stop-color="#e9eef3"/>
      <stop offset="0.65" stop-color="#b3bdc9"/><stop offset="1" stop-color="#5f6b7b"/>
    </linearGradient>
    <linearGradient id="red" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e8685b"/><stop offset="0.5" stop-color="#c0392b"/><stop offset="1" stop-color="#8a2318"/>
    </linearGradient>
    <linearGradient id="blue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a82bf"/><stop offset="0.5" stop-color="#25598f"/><stop offset="1" stop-color="#173b60"/>
    </linearGradient>
    <linearGradient id="blueV" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#173b60"/><stop offset="0.35" stop-color="#4a82bf"/><stop offset="1" stop-color="#1b4673"/>
    </linearGradient>
    <linearGradient id="orange" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b9631a"/><stop offset="0.4" stop-color="#f3a04b"/><stop offset="1" stop-color="#a8561a"/>
    </linearGradient>
    <radialGradient id="metal" cx="0.38" cy="0.32" r="0.8">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#c3ccd7"/><stop offset="1" stop-color="#6e7a8a"/>
    </radialGradient>`;

const svg = (label, body, extraDefs = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="${label}">
  <defs>${DEFS}${extraDefs}
  </defs>
  <rect width="600" height="600" fill="#f4f7fa"/>
${body}
</svg>
`;

const range = (a, b, step = 1) => { const o = []; for (let v = a; step > 0 ? v <= b + 1e-9 : v >= b - 1e-9; v += step) o.push(+v.toFixed(3)); return o; };
const bolts = (xs, y, r = 4.2) => xs.map((x) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#metal)" stroke="${INK}" stroke-width="1.6"/>`).join("");
const rect = (x, y, w, h, fill, rx = 4, sw = 3.5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
const handwheel = (cx, cy, r, fill = "#c0392b") => `
    <g>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${INK}" stroke-width="${r * 0.2 + 3}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${fill}" stroke-width="${r * 0.2}"/>
      ${[0, 60, 120].map((a) => `<line x1="${cx - r * Math.cos((a * Math.PI) / 180)}" y1="${cy - r * Math.sin((a * Math.PI) / 180)}" x2="${cx + r * Math.cos((a * Math.PI) / 180)}" y2="${cy + r * Math.sin((a * Math.PI) / 180)}" stroke="${INK}" stroke-width="5"/>`).join("")}
      <circle cx="${cx}" cy="${cy}" r="${r * 0.2}" fill="url(#metal)" stroke="${INK}" stroke-width="2.5"/>
    </g>`;

/* ------------------------------------------------------------------ BOP --- */
// A ram-type blowout-preventer stack: annular preventer on top of two ram
// preventers, hydraulic operating cylinders on the bonnets, flanged and bolted
// at every joint, choke and kill lines with gate valves down both sides.
function bop() {
  const ram = (y) => {
    const h = 110;
    const my = y + h / 2; // vertical middle of the body
    const side = (dir) => {
      const x0 = dir < 0 ? 225 : 375; // body edge
      const bx = dir < 0 ? x0 - 55 : x0; // bonnet door
      const cx = dir < 0 ? x0 - 105 : x0 + 55; // cylinder
      return `
    ${rect(bx, my - 35, 55, 70, "url(#red)", 6)}
    ${rect(dir < 0 ? x0 - 11 : x0 - 1, my - 43, 12, 86, "url(#steelV)", 3)}
    ${[my - 30, my, my + 30].map((by) => `<circle cx="${dir < 0 ? x0 - 5 : x0 + 5}" cy="${by}" r="3.6" fill="url(#metal)" stroke="${INK}" stroke-width="1.5"/>`).join("")}
    ${rect(cx, my - 22, 50, 44, "url(#steel)", 5)}
    ${[10, 24, 38].map((o) => `<line x1="${cx + o}" y1="${my - 22}" x2="${cx + o}" y2="${my + 22}" stroke="${INK}" stroke-width="2.4" opacity="0.55"/>`).join("")}
    ${rect(dir < 0 ? cx - 13 : cx + 50, my - 27, 13, 54, "url(#steelV)", 4)}
    <rect x="${dir < 0 ? cx - 22 : cx + 63}" y="${my - 6}" width="9" height="12" rx="2" fill="#9aa6b4" stroke="${INK}" stroke-width="2.5"/>`;
    };
    return `
    ${rect(225, y, 150, h, "url(#red)", 8)}
    ${side(-1)}${side(1)}
    ${rect(262, y + 18, 76, h - 36, "#a82e22", 6, 3)}
    ${bolts([271, 329], y + 27)}${bolts([271, 329], y + h - 27)}
    <line x1="262" y1="${my - 8}" x2="338" y2="${my - 8}" stroke="${INK}" stroke-width="2" opacity="0.5"/>
    <line x1="262" y1="${my + 8}" x2="338" y2="${my + 8}" stroke="${INK}" stroke-width="2" opacity="0.5"/>`;
  };
  const flange = (y) => `${rect(218, y, 164, 12, "url(#steelV)", 3)}${bolts(range(236, 364, 25.6), y + 6, 3.4)}`;
  const valve = (cx, cy) => `
    <line x1="${cx}" y1="${cy - 20}" x2="${cx}" y2="${cy - 52}" stroke="${INK}" stroke-width="7"/>
    ${rect(cx - 17, cy - 22, 34, 44, "url(#blue)", 5)}
    ${rect(cx - 11, cy - 34, 22, 14, "url(#steelV)", 3)}
    ${handwheel(cx, cy - 66, 22)}`;
  const pipeL = (x) => rect(x, 130, 14, 345, "url(#steelV)", 3);
  const body = `
  ${GROUND(522)}
  <!-- choke & kill lines -->
  ${pipeL(62)}${pipeL(524)}
  ${rect(62, 460, 205, 16, "url(#steel)", 3)}${rect(333, 460, 205, 16, "url(#steel)", 3)}
  ${valve(69, 240)}${valve(531, 240)}${valve(69, 380)}${valve(531, 380)}
  <!-- spool and connector -->
  ${rect(252, 442, 96, 30, "url(#steelV)", 4)}
  ${rect(232, 472, 136, 16, "url(#steelV)", 3)}${bolts(range(246, 354, 21.6), 480, 3.6)}
  ${flange(430)}
  ${ram(320)}
  ${flange(308)}
  ${ram(198)}
  ${flange(186)}
  <!-- annular preventer -->
  <path d="M228 186 L228 132 Q228 84 300 84 Q372 84 372 132 L372 186 Z" fill="url(#blue)" stroke="${INK}" stroke-width="4"/>
  <path d="M244 176 L244 134 Q244 100 300 100" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.28" stroke-linecap="round"/>
  ${rect(262, 70, 76, 18, "url(#steelV)", 4)}${bolts([274, 300, 326], 79, 3.6)}
  <circle cx="300" cy="58" r="12" fill="none" stroke="${INK}" stroke-width="9"/><circle cx="300" cy="58" r="12" fill="none" stroke="#9aa6b4" stroke-width="4.5"/>`;
  return svg("A stack of ram and annular blowout preventers with choke and kill lines", body);
}

/* ----------------------------------------------------- CHRISTMAS TREE ---- */
// A production tree on a wellhead: master valves, a flow cross with two wing
// valves and flowlines, a swab valve and tree cap on top.
function tree() {
  const flangeAt = (y, w = 112) => `${rect(300 - w / 2, y, w, 12, "url(#steelV)", 3)}${bolts(range(300 - w / 2 + 14, 300 + w / 2 - 14, (w - 28) / 5), y + 6, 3.4)}`;
  const block = (y, h, fill = "url(#blueV)") => rect(264, y, 72, h, fill, 6);
  const side = (dir, y, h = 40) => {
    const x = dir < 0 ? 188 : 336;
    return `${rect(x, y, 76, h, "url(#blue)", 5)}
    ${rect(dir < 0 ? 176 : 412, y - 6, 12, h + 12, "url(#steelV)", 3)}`;
  };
  const body = `
  ${GROUND(548)}
  <!-- wellhead / tubing head -->
  ${rect(232, 506, 136, 18, "url(#steelV)", 3)}${bolts(range(248, 352, 20.8), 515, 3.6)}
  ${rect(252, 478, 96, 30, "url(#steel)", 4)}
  ${flangeAt(466)}
  <!-- lower master valve + handwheel on its bonnet -->
  ${block(398, 70)}
  ${rect(214, 420, 52, 26, "url(#steel)", 4)}${handwheel(184, 433, 30)}
  ${flangeAt(386)}
  <!-- upper master valve -->
  ${block(330, 58, "url(#blue)")}
  ${rect(334, 346, 52, 26, "url(#steel)", 4)}${handwheel(416, 359, 30)}
  ${flangeAt(318)}
  <!-- flow cross with wing valves and flowlines -->
  ${rect(264, 262, 72, 58, "url(#blueV)", 6)}
  ${side(-1, 276)}${side(1, 276)}
  ${rect(100, 284, 78, 24, "url(#steel)", 4)}${rect(422, 284, 78, 24, "url(#steel)", 4)}
  <line x1="226" y1="276" x2="226" y2="236" stroke="${INK}" stroke-width="7"/>${handwheel(226, 214, 26)}
  <line x1="374" y1="276" x2="374" y2="236" stroke="${INK}" stroke-width="7"/>${handwheel(374, 214, 26)}
  ${flangeAt(250)}
  <!-- swab valve and tree cap -->
  ${rect(266, 186, 68, 66, "url(#blueV)", 6)}
  ${rect(279, 156, 42, 32, "url(#steelV)", 4)}
  <line x1="300" y1="156" x2="300" y2="124" stroke="${INK}" stroke-width="7"/>
  ${handwheel(300, 98, 32)}`;
  return svg("A stack of valves with side flowlines on top of a producing wellhead", body);
}

/* ------------------------------------------------------------ DRILL BIT -- */
// A tricone roller-cone bit: threaded pin, shank and three cones studded with
// tungsten-carbide inserts.
function bit() {
  const threads = range(26, 84, 8).map((y, i) => `<path d="M${253 - i * 0.5} ${y} L${347 + i * 0.5} ${y + 5}" stroke="${INK}" stroke-width="2.6" opacity="0.7"/>`).join("");
  const insert = (x, y, r = 8) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#metal)" stroke="${INK}" stroke-width="1.8"/>`;
  const cone = (rows) => `
      <path d="M-82 0 L-24 138 Q0 156 24 138 L82 0 Z" fill="url(#steelV)" stroke="${INK}" stroke-width="4"/>
      ${rows.map(([y, n, span]) => range(-span, span, (2 * span) / (n - 1)).map((x) => insert(x, y)).join("")).join("")}
      ${insert(0, 138, 9)}`;
  const rows = [[32, 5, 62], [72, 4, 44], [108, 3, 26]];
  const body = `
  ${GROUND(540, 210)}
  <!-- threaded pin (the API connection) -->
  <path d="M250 16 L350 16 L368 92 L232 92 Z" fill="url(#steelV)" stroke="${INK}" stroke-width="4"/>
  ${threads}
  ${rect(222, 92, 156, 20, "url(#steelV)", 4)}
  <!-- shank -->
  ${rect(212, 112, 176, 56, "url(#steelV)", 5)}
  <rect x="222" y="121" width="156" height="9" rx="4" fill="#ffffff" opacity="0.4"/>
  <path d="M230 146 h140 M230 157 h140" stroke="${INK}" stroke-width="2.4" opacity="0.5"/>
  <!-- legs -->
  <path d="M206 166 Q300 196 394 166 L430 226 Q300 262 170 226 Z" fill="url(#steelV)" stroke="${INK}" stroke-width="4"/>
  <!-- the three cones: left, right, then the front one on top -->
  <g transform="translate(176 214) rotate(34) scale(1.35)">${cone(rows)}</g>
  <g transform="translate(424 214) rotate(-34) scale(1.35)">${cone(rows)}</g>
  <g transform="translate(300 200) scale(1.65)">${cone(rows)}</g>
  <!-- nozzle -->
  <circle cx="300" cy="196" r="10" fill="#22303f" stroke="${INK}" stroke-width="2"/>`;
  return svg("A tricone drill bit with three studded cones and a threaded pin", body);
}

/* --------------------------------------------------------- PIPELINE PIG -- */
// A mandrel pig: steel body with polyurethane sealing discs and wire brushes,
// resting on a cradle.
function pig() {
  const cy = 262;
  const disc = (x, r = 112) => `
    <rect x="${x}" y="${cy - r}" width="18" height="${2 * r}" rx="9" fill="url(#orange)" stroke="${INK}" stroke-width="3.5"/>
    <rect x="${x + 3}" y="${cy - r + 8}" width="4" height="${2 * r - 16}" rx="2" fill="#ffffff" opacity="0.35"/>`;
  const brush = (x, w = 30, r = 100) => {
    const strokes = range(cy - r + 3, cy + r - 3, 4).map((y) => {
      const edge = Math.min(Math.abs(y - (cy - r)), Math.abs(y - (cy + r))) < 14;
      return `<line x1="${x - (edge ? 4 : 0)}" y1="${y}" x2="${x + w + (edge ? 4 : 0)}" y2="${y}" stroke="#2a3441" stroke-width="2.2"/>`;
    }).join("");
    return `<rect x="${x}" y="${cy - r}" width="${w}" height="${2 * r}" fill="#46515f" stroke="${INK}" stroke-width="3" rx="3"/>${strokes}`;
  };
  const mand = (x, w, r = 62) => `<rect x="${x}" y="${cy - r}" width="${w}" height="${2 * r}" fill="url(#steel)" stroke="${INK}" stroke-width="4" rx="6"/>`;
  const body = `
  ${GROUND(500, 240)}
  <!-- cradle -->
  <path d="M110 470 L150 410 H450 L490 470 Z" fill="#5d6b7c" stroke="${INK}" stroke-width="4"/>
  <rect x="96" y="470" width="408" height="14" rx="4" fill="#46515f" stroke="${INK}" stroke-width="3.5"/>
  <!-- tail plate -->
  ${mand(470, 54, 52)}${[cy - 28, cy, cy + 28].map((y) => `<circle cx="497" cy="${y}" r="5" fill="url(#metal)" stroke="${INK}" stroke-width="1.8"/>`).join("")}
  <!-- body sections, discs and brushes (back to front) -->
  ${mand(150, 330)}
  ${disc(432)}${brush(398, 30)}
  ${disc(340)}${brush(306, 30)}
  ${disc(248)}${brush(214, 30)}
  ${disc(156)}${brush(122, 30)}
  <!-- nose -->
  <path d="M122 ${cy - 62} Q50 ${cy - 62} 40 ${cy} Q50 ${cy + 62} 122 ${cy + 62} Z" fill="url(#steelV)" stroke="${INK}" stroke-width="4"/>
  <circle cx="76" cy="${cy}" r="10" fill="none" stroke="${INK}" stroke-width="7"/><circle cx="76" cy="${cy}" r="10" fill="none" stroke="#9aa6b4" stroke-width="3"/>
  <!-- bolts along the mandrel -->
  ${[cy - 38, cy, cy + 38].map((y) => bolts([288], y, 5)).join("")}`;
  return svg("A cylindrical cleaning tool with rubber discs and wire brushes resting on a cradle", body);
}

/* ------------------------------------------------------- PRESSURE GAUGE -- */
// A Bourdon-tube dial gauge: bezel, numbered dial with a red zone, needle,
// threaded connection stem. Numerals only — no unit or word on the dial.
function gauge() {
  const cx = 300, cy = 252;
  const P = (deg, r) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const at = (v) => 135 + (v / 10) * 270;
  const ticks = range(0, 10, 0.2).map((v) => {
    const major = Math.abs(v - Math.round(v)) < 1e-6;
    const [x1, y1] = P(at(v), 152);
    const [x2, y2] = P(at(v), major ? 128 : 140);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${INK}" stroke-width="${major ? 4.5 : 2}"/>`;
  }).join("");
  const nums = range(0, 10).map((v) => {
    const [x, y] = P(at(v), 104);
    return `<text x="${x.toFixed(1)}" y="${(y + 9).toFixed(1)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="27" fill="${INK}">${v}</text>`;
  }).join("");
  const [rx1, ry1] = P(at(8), 158), [rx2, ry2] = P(at(10), 158);
  const needleAngle = at(6.4);
  const body = `
  ${GROUND(556, 200)}
  <!-- connection stem (bottom) -->
  ${rect(262, 428, 76, 40, "url(#steelV)", 5)}
  ${rect(276, 468, 48, 70, "url(#steelV)", 3)}
  ${range(476, 534, 9).map((y) => `<line x1="276" y1="${y}" x2="324" y2="${y + 4}" stroke="${INK}" stroke-width="2.4" opacity="0.65"/>`).join("")}
  <!-- case and bezel -->
  <circle cx="${cx}" cy="${cy}" r="192" fill="url(#steel)" stroke="${INK}" stroke-width="6"/>
  <circle cx="${cx}" cy="${cy}" r="176" fill="#d7dee6" stroke="${INK}" stroke-width="3.5"/>
  <circle cx="${cx}" cy="${cy}" r="168" fill="#fbfcfd" stroke="${INK}" stroke-width="2.5"/>
  ${range(0, 355, 5).map((d) => { const [a, b] = P(d, 182), [c, e] = P(d, 190); return `<line x1="${a.toFixed(1)}" y1="${b.toFixed(1)}" x2="${c.toFixed(1)}" y2="${e.toFixed(1)}" stroke="${INK}" stroke-width="1.4" opacity="0.35"/>`; }).join("")}
  <!-- red zone -->
  <path d="M${rx1.toFixed(1)} ${ry1.toFixed(1)} A158 158 0 0 1 ${rx2.toFixed(1)} ${ry2.toFixed(1)}" fill="none" stroke="#c0392b" stroke-width="9"/>
  ${ticks}${nums}
  <!-- needle -->
  <g transform="rotate(${needleAngle} ${cx} ${cy})">
    <path d="M${cx - 34} ${cy - 4} L${cx + 142} ${cy - 1.5} L${cx + 142} ${cy + 1.5} L${cx - 34} ${cy + 4} Z" fill="#d6452f" stroke="${INK}" stroke-width="2.4"/>
    <circle cx="${cx - 34}" cy="${cy}" r="7" fill="#d6452f" stroke="${INK}" stroke-width="2.4"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="17" fill="url(#metal)" stroke="${INK}" stroke-width="3.5"/>
  <circle cx="${cx}" cy="${cy}" r="6.5" fill="#46515f" stroke="${INK}" stroke-width="2"/>
  <!-- glass glare -->
  <path d="M150 190 A150 150 0 0 1 300 104 A190 190 0 0 0 150 190 Z" fill="#ffffff" opacity="0.28"/>`;
  return svg("A round dial pressure gauge with a needle, numbered scale and threaded connection", body);
}

const files = { "bop.svg": bop(), "christmas-tree.svg": tree(), "drill-bit.svg": bit(), "pipeline-pig.svg": pig(), "pressure-gauge.svg": gauge() };
for (const [name, content] of Object.entries(files)) writeFileSync(join(OUT, name), content);
console.log(`wrote ${Object.keys(files).length} zoom pictures to public/media/puzzles/nape/zoom/`);
