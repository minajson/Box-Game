/**
 * Generates the technical SVG diagrams used by the NAPE 2026 picture questions.
 *
 *   node scripts/generate-nape-diagrams.mjs
 *
 * Rules every diagram follows: 16:9, no text, no labels, no ticks, so nothing
 * in the picture can give the answer away; vector, so it stays sharp at 2560×1440
 * and under the staged zoom; hand-drawn palette that sits with the game's look.
 * Randomness is seeded so the output is identical on every run.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "media", "puzzles", "nape", "diagrams");
mkdirSync(OUT, { recursive: true });

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = (n) => Number(n.toFixed(1));
const W = 1600, H = 900;
const svg = (body, defs = "", bg = "#f5f0e3") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">\n<defs>${defs}</defs>\n<rect width="${W}" height="${H}" fill="${bg}"/>\n${body}\n</svg>\n`;
const save = (name, content) => writeFileSync(join(OUT, name), content);
const path = (pts) => "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L");
const grad = (id, a, b, vertical = true) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

/* ============================================================= WELL LOG === */
{
  const r = rng(11);
  // Beds: [thickness, lithology] — shale or sand; one hydrocarbon-bearing sand.
  const beds = [];
  let y = 70;
  const plan = ["sh", "sd", "sh", "sd", "sh", "hc", "sh", "sd", "sh", "sd", "sh"];
  const total = 760;
  const weights = plan.map(() => 0.6 + r());
  const sumW = weights.reduce((a, b) => a + b, 0);
  plan.forEach((lith, i) => {
    const h = (weights[i] / sumW) * total;
    beds.push({ y0: y, y1: y + h, lith });
    y += h;
  });
  const tracks = [160, 520, 880, 1240].map((x) => ({ x, w: 300 }));
  const curve = (valueFor, x0, w, noise = 0.05, seed = 1) => {
    const rr = rng(seed);
    const pts = [];
    for (let yy = 70; yy <= 830; yy += 6) {
      const bed = beds.find((b) => yy >= b.y0 && yy <= b.y1) ?? beds[beds.length - 1];
      const v = Math.max(0.03, Math.min(0.97, valueFor(bed.lith) + (rr() - 0.5) * noise * 2));
      pts.push([x0 + v * w, yy]);
    }
    return pts;
  };
  let body = "";
  // lithology backgrounds + depth grid
  tracks.forEach((t) => {
    body += `<rect x="${t.x}" y="70" width="${t.w}" height="760" fill="#fffdf6" stroke="#6b5d45" stroke-width="3"/>`;
    for (let g = 1; g < 10; g++) body += `<line x1="${t.x}" x2="${t.x + t.w}" y1="${70 + g * 76}" y2="${70 + g * 76}" stroke="#d9cfb8" stroke-width="1.5"/>`;
    for (let g = 1; g < 5; g++) body += `<line y1="70" y2="830" x1="${t.x + (g * t.w) / 5}" x2="${t.x + (g * t.w) / 5}" stroke="#e6dec9" stroke-width="1.5"/>`;
  });
  // track 1: gamma ray, shale = high
  const gr = curve((l) => (l === "sh" ? 0.78 : l === "sd" ? 0.2 : 0.16), tracks[0].x, tracks[0].w, 0.05, 3);
  body += `<path d="${path([[tracks[0].x, 70], ...gr, [tracks[0].x, 830]])}" fill="#b9d8a6" opacity=".75"/>`;
  body += `<path d="${path(gr)}" fill="none" stroke="#2e7d32" stroke-width="5" stroke-linejoin="round"/>`;
  // track 2: resistivity (log-like), hydrocarbon sand = very high
  const rs = curve((l) => (l === "sh" ? 0.18 : l === "sd" ? 0.12 : 0.88), tracks[1].x, tracks[1].w, 0.04, 5);
  body += `<path d="${path(rs)}" fill="none" stroke="#c62828" stroke-width="5" stroke-linejoin="round"/>`;
  const rs2 = curve((l) => (l === "sh" ? 0.1 : l === "sd" ? 0.08 : 0.55), tracks[1].x, tracks[1].w, 0.03, 6);
  body += `<path d="${path(rs2)}" fill="none" stroke="#ef9a9a" stroke-width="4" stroke-dasharray="14 8"/>`;
  // track 3: density (black) & neutron (blue) crossover
  const dn = curve((l) => (l === "sh" ? 0.55 : l === "sd" ? 0.5 : 0.62), tracks[2].x, tracks[2].w, 0.03, 8);
  const nu = curve((l) => (l === "sh" ? 0.6 : l === "sd" ? 0.5 : 0.36), tracks[2].x, tracks[2].w, 0.03, 9);
  body += `<path d="${path(dn)} L${path(nu.slice().reverse()).slice(1)} Z" fill="#ffe082" opacity=".7"/>`;
  body += `<path d="${path(dn)}" fill="none" stroke="#212121" stroke-width="5"/>`;
  body += `<path d="${path(nu)}" fill="none" stroke="#1565c0" stroke-width="5" stroke-dasharray="16 7"/>`;
  // track 4: sonic, slowing slightly with depth
  const so = [];
  { const rr = rng(13); for (let yy = 70; yy <= 830; yy += 6) { const bed = beds.find((b) => yy >= b.y0 && yy <= b.y1) ?? beds[beds.length - 1]; const base = 0.7 - ((yy - 70) / 760) * 0.35; const v = base + (bed.lith === "sh" ? 0.08 : bed.lith === "hc" ? 0.1 : -0.05) + (rr() - 0.5) * 0.05; so.push([tracks[3].x + Math.max(0.04, Math.min(0.96, v)) * tracks[3].w, yy]); } }
  body += `<path d="${path(so)}" fill="none" stroke="#6a1b9a" stroke-width="5"/>`;
  // narrow lithology strip on the far left
  beds.forEach((b) => {
    const fill = b.lith === "sh" ? "#8d8f86" : b.lith === "sd" ? "#f1d58a" : "#e0a526";
    body += `<rect x="92" y="${f(b.y0)}" width="42" height="${f(b.y1 - b.y0)}" fill="${fill}" stroke="#6b5d45" stroke-width="2"/>`;
  });
  save("well-log.svg", svg(body));
}

/* ================================================================ PIGGING === */
{
  const defs =
    grad("pipe", "#c9d2d9", "#7d8a94") + grad("inner", "#e8eef2", "#aeb9c1") +
    `<linearGradient id="pigbody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb74d"/><stop offset="1" stop-color="#e65100"/></linearGradient>`;
  const r = rng(21);
  let body = "";
  body += `<rect x="0" y="230" width="1600" height="440" fill="url(#pipe)"/>`;
  body += `<rect x="0" y="262" width="1600" height="376" fill="url(#inner)"/>`;
  for (const x of [220, 620, 1020, 1420]) body += `<rect x="${x}" y="222" width="26" height="456" rx="6" fill="#68757f"/>`;
  // dirty (wax/scale) lining ahead of the pig, clean behind
  body += `<path d="M1010 262 Q1020 300 1040 300 L1600 300 L1600 262 Z" fill="#8d6e63" opacity=".85"/>`;
  body += `<path d="M1010 638 Q1020 600 1040 600 L1600 600 L1600 638 Z" fill="#8d6e63" opacity=".85"/>`;
  for (let i = 0; i < 70; i++) body += `<circle cx="${f(900 + r() * 700)}" cy="${f(310 + r() * 280)}" r="${f(4 + r() * 10)}" fill="#6d4c41" opacity="${f(0.5 + r() * 0.4)}"/>`;
  // flow chevrons behind pig
  for (const x of [60, 200, 340]) body += `<path d="M${x} 410 L${x + 70} 450 L${x} 490 L${x + 28} 450 Z" fill="#1976d2" opacity=".7"/>`;
  // the pig
  const px = 560;
  body += `<rect x="${px}" y="330" width="380" height="240" rx="38" fill="url(#pigbody)" stroke="#8d3a00" stroke-width="5"/>`;
  for (const dx of [10, 110, 230]) body += `<rect x="${px + dx}" y="302" width="26" height="296" rx="10" fill="#3e2723"/>`;
  body += `<rect x="${px + 360}" y="352" width="80" height="196" rx="30" fill="#9e9e9e" stroke="#424242" stroke-width="4"/>`;
  for (let i = 0; i < 9; i++) body += `<line x1="${px + 372 + i * 6}" x2="${px + 372 + i * 6}" y1="364" y2="536" stroke="#616161" stroke-width="3"/>`;
  body += `<rect x="${px + 50}" y="390" width="250" height="120" rx="20" fill="#fff3e0" opacity=".45"/>`;
  // cutaway edges
  body += `<line x1="0" x2="1600" y1="230" y2="230" stroke="#4a555e" stroke-width="6"/><line x1="0" x2="1600" y1="670" y2="670" stroke="#4a555e" stroke-width="6"/>`;
  save("pigging.svg", svg(body, defs));
}

/* ================================================================== CASING === */
{
  const defs = grad("sky", "#cfe8f6", "#f5f0e3") + `<pattern id="cem" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#c8c8c2"/><circle cx="3" cy="3" r="1.6" fill="#8e8e86"/><circle cx="10" cy="9" r="1.4" fill="#8e8e86"/></pattern>`;
  let body = `<rect width="1600" height="150" fill="url(#sky)"/>`;
  // strata
  const strata = [["#b99b6b", 150, 330], ["#9c8660", 330, 520], ["#c2a46f", 520, 700], ["#7e6b4d", 700, 900]];
  for (const [c, a, b] of strata) body += `<rect x="0" y="${a}" width="1600" height="${b - a}" fill="${c}"/>`;
  body += `<rect x="0" y="690" width="1600" height="90" fill="#e9c46a" opacity=".55"/>`; // reservoir sand
  const cx = 800;
  // hole sizes: surface (wide) → intermediate → production → open hole
  const holes = [
    { w: 380, y0: 150, y1: 400 },
    { w: 280, y0: 150, y1: 560 },
    { w: 190, y0: 150, y1: 690 },
  ];
  holes.forEach((h) => { body += `<rect x="${cx - h.w / 2 - 34}" y="${h.y0}" width="${h.w + 68}" height="${h.y1 - h.y0}" fill="url(#cem)"/>`; });
  holes.forEach((h) => {
    body += `<rect x="${cx - h.w / 2}" y="${h.y0}" width="${h.w}" height="${h.y1 - h.y0}" fill="#3b4a56"/>`;
    body += `<rect x="${cx - h.w / 2}" y="${h.y0}" width="22" height="${h.y1 - h.y0}" fill="#9fb0bd"/><rect x="${cx + h.w / 2 - 22}" y="${h.y0}" width="22" height="${h.y1 - h.y0}" fill="#9fb0bd"/>`;
    body += `<rect x="${cx - h.w / 2 - 6}" y="${h.y1 - 14}" width="${h.w + 12}" height="14" rx="4" fill="#5a6b78"/>`;
  });
  body += `<rect x="${cx - 95}" y="690" width="190" height="210" fill="#1c262e"/>`; // open hole
  body += `<rect x="${cx - 62}" y="150" width="124" height="540" fill="#1c262e" opacity=".0"/>`;
  body += `<rect x="${cx - 70}" y="116" width="140" height="38" rx="8" fill="#455a64"/><rect x="${cx - 36}" y="70" width="72" height="50" rx="8" fill="#607d8b"/>`; // wellhead
  save("casing.svg", svg(body, defs));
}

/* ======================================================= PETROLEUM SYSTEM === */
function petroleumSystem(withOil) {
  const defs =
    `<pattern id="sand" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#efd28b"/><circle cx="4" cy="4" r="2" fill="#c79a3d"/><circle cx="12" cy="11" r="2" fill="#c79a3d"/></pattern>` +
    grad("sky", "#cfe8f6", "#f5f0e3");
  let body = `<rect width="1600" height="900" fill="#d9c9a3"/>`;
  // Layers (top → bottom): overburden, seal (cap rock), reservoir sand (arch), carrier, source rock
  const arch = (y, amp) => {
    const pts = [];
    for (let x = 0; x <= 1600; x += 40) pts.push([x, y - amp * Math.exp(-Math.pow((x - 800) / 360, 2))]);
    return pts;
  };
  const band = (top, bot) => `${path(top)} L${path(bot.slice().reverse()).slice(1)} Z`;
  const L = [arch(140, 60), arch(280, 120), arch(380, 150), arch(470, 150), arch(640, 100), arch(780, 60), arch(900, 60)];
  const fills = ["#b9a27a", "#4b4f56", "url(#sand)", "#bfa57a", "#5d4037", "#2f2a2a"];
  for (let i = 0; i < 6; i++) body += `<path d="${band(L[i], L[i + 1])}" fill="${fills[i]}"/>`;
  // wavy source rock hint
  body += `<path d="${band(L[4], L[5])}" fill="#3e2a22"/>`;
  body += `<path d="${band(L[5], L[6])}" fill="#2b2220"/>`;
  if (withOil) {
    // pooled hydrocarbons at the crest of the reservoir: gas cap over oil over water
    body += `<path d="M560 ${f(L[2][14][1] + 4)} Q800 ${f(L[2][20][1] - 8)} 1040 ${f(L[2][14][1] + 4)} L1040 ${f(L[2][14][1] + 40)} L560 ${f(L[2][14][1] + 40)} Z" fill="#fff59d" opacity=".95"/>`;
    body += `<path d="M590 ${f(L[2][14][1] + 40)} L1010 ${f(L[2][14][1] + 40)} L1040 ${f(L[2][14][1] + 100)} L560 ${f(L[2][14][1] + 100)} Z" fill="#6d3b0f" opacity=".95"/>`;
    // migration arrows from the source rock up through the carrier bed
    const arrows = [[420, 760], [560, 760], [1120, 760], [1260, 760]];
    for (const [x, y] of arrows) body += `<path d="M${x} ${y} C${x + 40} ${y - 120} ${x + 40} ${y - 220} ${x + 140} ${y - 320}" fill="none" stroke="#ff8f00" stroke-width="9" stroke-dasharray="2 18" stroke-linecap="round"/><path d="M${x + 140} ${y - 320} l-30 6 l14 -30 z" fill="#ff8f00"/>`;
  }
  save(withOil ? "petroleum-system.svg" : "anticline.svg", svg(body, defs));
}
petroleumSystem(true);
petroleumSystem(false);

/* ================================================================ FRACKING === */
{
  const defs = grad("sky", "#cfe8f6", "#f5f0e3");
  let body = `<rect width="1600" height="900" fill="#cdb98d"/><rect width="1600" height="150" fill="url(#sky)"/>`;
  body += `<rect y="150" width="1600" height="150" fill="#c4a674"/><rect y="170" width="1600" height="46" fill="#7fb5d6" opacity=".7"/>`; // aquifer
  body += `<rect y="300" width="1600" height="260" fill="#a89a82"/>`;
  body += `<rect y="560" width="1600" height="180" fill="#6a6f78"/>`; // shale target
  body += `<rect y="740" width="1600" height="160" fill="#8a7a63"/>`;
  // surface pad
  body += `<rect x="640" y="108" width="160" height="42" fill="#546e7a"/><rect x="350" y="100" width="150" height="50" rx="8" fill="#ef6c00"/><rect x="900" y="104" width="190" height="46" rx="8" fill="#8d99a3"/>`;
  body += `<circle cx="380" cy="152" r="14" fill="#263238"/><circle cx="470" cy="152" r="14" fill="#263238"/>`;
  // well: down then bending horizontal
  const wellPath = "M720 150 L720 600 Q720 650 770 650 L1450 650";
  body += `<path d="${wellPath}" fill="none" stroke="#c8c8c2" stroke-width="30" stroke-linecap="round"/>`;
  body += `<path d="${wellPath}" fill="none" stroke="#263238" stroke-width="14" stroke-linecap="round"/>`;
  // fracture clusters
  const r = rng(31);
  for (const cx of [900, 1060, 1220, 1380]) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const len = 40 + r() * 70;
      const dy = Math.sin(a) * len * 1.1;
      const dx = Math.cos(a) * len * 0.45;
      body += `<path d="M${cx} 650 l${f(dx * 0.5)} ${f(dy * 0.5)} l${f(r() * 16 - 8)} ${f(dy * 0.5)}" fill="none" stroke="#fff176" stroke-width="3.5" stroke-linecap="round"/>`;
    }
    body += `<rect x="${cx - 8}" y="632" width="16" height="36" fill="#ff8f00"/>`;
  }
  save("fracking.svg", svg(body, defs));
}

/* ================================================================ POROSITY === */
{
  const r = rng(41);
  let body = `<rect width="1600" height="900" fill="#2b2118"/>`; // pore space shows dark
  const grains = [];
  const cols = 15, rows = 9;
  const colors = ["#e7c27d", "#d8a85a", "#efd8a2", "#c58f48", "#f3e3b8", "#b8793a"];
  for (let j = 0; j < rows + 1; j++)
    for (let i = 0; i < cols + 1; i++) {
      const x = i * 112 + (j % 2 ? 56 : 0) + (r() - 0.5) * 40;
      const y = j * 100 + (r() - 0.5) * 36;
      grains.push({ x, y, r: 36 + r() * 24, c: colors[Math.floor(r() * colors.length)] });
    }
  for (const g of grains) body += `<ellipse cx="${f(g.x)}" cy="${f(g.y)}" rx="${f(g.r)}" ry="${f(g.r * (0.85 + r() * 0.25))}" fill="${g.c}" stroke="#7a5326" stroke-width="3" transform="rotate(${f(r() * 180)} ${f(g.x)} ${f(g.y)})"/>`;
  // a few pores holding oil (amber) and a few holding water (blue)
  for (let i = 0; i < 26; i++) {
    const x = 90 + r() * 1420, y = 70 + r() * 760;
    body += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(10 + r() * 12)}" fill="${r() > 0.5 ? "#e08a1e" : "#4aa3d8"}" opacity=".8"/>`;
  }
  save("porosity.svg", svg(body));
}

/* =========================================================== DISTILLATION === */
{
  const defs = grad("col", "#d9dee2", "#8b969e", false) + grad("fire", "#ff7043", "#ffca28");
  let body = "";
  body += `<rect x="640" y="70" width="240" height="760" rx="70" fill="url(#col)" stroke="#4a555e" stroke-width="6"/>`;
  for (let i = 0; i < 9; i++) body += `<line x1="650" x2="870" y1="${150 + i * 72}" y2="${150 + i * 72}" stroke="#4a555e" stroke-width="5"/>`;
  // furnace + feed
  body += `<rect x="130" y="640" width="210" height="170" rx="18" fill="#b0583c" stroke="#6d2c17" stroke-width="5"/><path d="M185 790 q20 -80 42 -20 q20 -70 44 20 z" fill="url(#fire)"/>`;
  body += `<path d="M340 700 H640" stroke="#4a555e" stroke-width="22" fill="none"/>`;
  // draws to tanks, light (top) → heavy (bottom)
  const draws = [[110, "#fff3b0"], [222, "#ffe082"], [330, "#ffb74d"], [438, "#8d6e63"], [546, "#4e342e"], [654, "#212121"]];
  draws.forEach(([y, c], i) => {
    const ty = y + 10;
    body += `<path d="M880 ${y} H1090" stroke="#4a555e" stroke-width="${f(18 - i * 1.5)}" fill="none"/>`;
    body += `<rect x="1090" y="${ty - 36}" width="${150 - (i === 0 ? 40 : 0)}" height="72" rx="12" fill="${c}" stroke="#4a555e" stroke-width="5"/>`;
  });
  // overhead condenser
  body += `<path d="M760 70 V40 H1240" stroke="#4a555e" stroke-width="18" fill="none"/><rect x="1240" y="14" width="150" height="52" rx="10" fill="#90caf9" stroke="#4a555e" stroke-width="5"/>`;
  save("distillation.svg", svg(body, defs));
}

/* ================================================================ WATERFLOOD === */
{
  const defs = grad("sky", "#cfe8f6", "#f5f0e3");
  let body = `<rect width="1600" height="900" fill="#b99b6b"/><rect width="1600" height="190" fill="url(#sky)"/>`;
  body += `<rect y="380" width="1600" height="110" fill="#8e7b59"/><rect y="490" width="1600" height="190" fill="#e8c46a"/><rect y="680" width="1600" height="220" fill="#6f6a61"/>`;
  // oil in the reservoir (right), swept water zone (left)
  body += `<path d="M0 490 H820 Q870 585 820 680 H0 Z" fill="#4aa3d8" opacity=".75"/>`;
  body += `<path d="M830 490 H1600 V680 H830 Q880 585 830 490 Z" fill="#7a3f12" opacity=".78"/>`;
  // wells
  body += `<path d="M380 190 V640" stroke="#263238" stroke-width="18"/><path d="M1240 190 V640" stroke="#263238" stroke-width="18"/>`;
  // injector arrows (water) and producer arrows (oil)
  for (const y of [520, 585, 650]) body += `<path d="M410 ${y} H760" stroke="#0d47a1" stroke-width="9" stroke-linecap="round"/><path d="M760 ${y} l-22 -16 v32 z" fill="#0d47a1"/>`;
  for (const y of [520, 585, 650]) body += `<path d="M1000 ${y} H1210" stroke="#ffcc80" stroke-width="9" stroke-linecap="round"/><path d="M1210 ${y} l-22 -16 v32 z" fill="#ffcc80"/>`;
  // surface equipment: water tank + pump (left), pumpjack (right)
  body += `<rect x="150" y="100" width="150" height="90" rx="14" fill="#64b5f6" stroke="#37474f" stroke-width="5"/><rect x="300" y="150" width="80" height="40" fill="#78909c"/>`;
  body += `<path d="M1130 190 L1190 110 H1330 L1370 190" fill="none" stroke="#37474f" stroke-width="12" stroke-linejoin="round"/><path d="M1130 120 L1330 98" stroke="#f57c00" stroke-width="22" stroke-linecap="round"/><circle cx="1130" cy="120" r="30" fill="#f57c00"/><rect x="1220" y="190" width="40" height="10" fill="#37474f"/>`;
  save("waterflood.svg", svg(body, defs));
}

/* ============================================================== DIRECTIONAL === */
{
  const defs = grad("sea", "#8ecbe9", "#2a7fb0") + grad("sky", "#d9eefa", "#f5f0e3");
  let body = `<rect width="1600" height="900" fill="#8d7a5c"/><rect width="1600" height="150" fill="url(#sky)"/>`;
  body += `<rect y="150" width="1600" height="150" fill="url(#sea)"/>`;
  body += `<rect y="300" width="1600" height="60" fill="#a89870"/>`;
  body += `<rect y="600" width="1600" height="300" fill="#6c5f49" opacity=".55"/>`;
  // platform
  body += `<rect x="226" y="86" width="180" height="40" fill="#455a64"/><rect x="250" y="40" width="40" height="46" fill="#ef6c00"/><rect x="330" y="56" width="60" height="30" fill="#90a4ae"/>`;
  for (const x of [240, 392]) body += `<path d="M${x} 126 L${x - 14} 300 M${x} 126 L${x + 14} 300" stroke="#37474f" stroke-width="10"/>`;
  // targets (reservoir pockets)
  const targets = [[300, 690, 70], [680, 560, 60], [1000, 660, 74], [1330, 520, 64], [880, 800, 60], [140, 560, 55]];
  targets.forEach(([x, y, r]) => { body += `<ellipse cx="${x}" cy="${y}" rx="${r * 1.3}" ry="${r * 0.7}" fill="#8a4b12" opacity=".9"/>`; });
  const colors = ["#e53935", "#1e88e5", "#43a047", "#8e24aa", "#fb8c00", "#00897b"];
  // wells: vertical, slant, S-curve, horizontal, extended reach...
  const wells = [
    "M316 300 L316 640",
    "M316 300 Q320 460 520 540 L610 548",
    "M316 300 Q330 520 700 660 Q860 700 960 662",
    "M316 300 Q420 380 690 520 Q1100 590 1280 522",
    "M316 300 Q360 600 560 760 L830 800",
    "M316 300 Q250 440 160 540",
  ];
  wells.forEach((d, i) => { body += `<path d="${d}" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${colors[i]}" stroke-width="8" stroke-linecap="round"/>`; });
  save("directional.svg", svg(body, defs));
}

/* =================================================================== SEISMIC === */
{
  const defs = grad("sea", "#8ecbe9", "#2a7fb0") + grad("sky", "#d9eefa", "#f5f0e3");
  let body = `<rect width="1600" height="900" fill="#8d7a5c"/><rect width="1600" height="110" fill="url(#sky)"/><rect y="110" width="1600" height="220" fill="url(#sea)"/>`;
  const layer = (y, amp, c) => {
    const pts = [];
    for (let x = 0; x <= 1600; x += 40) pts.push([x, y - amp * Math.exp(-Math.pow((x - 900) / 330, 2))]);
    return { pts, c };
  };
  const ls = [layer(330, 0, "#b8a47a"), layer(470, 70, "#9a8760"), layer(600, 110, "#c4a974"), layer(730, 120, "#76684f"), layer(900, 120, "#5a4f3d")];
  for (let i = 0; i < ls.length - 1; i++) {
    const top = ls[i].pts, bot = ls[i + 1].pts;
    body += `<path d="${path(top)} L${path(bot.slice().reverse()).slice(1)} Z" fill="${ls[i].c}"/>`;
  }
  // ship + streamer
  body += `<path d="M180 118 H430 L400 158 H215 Z" fill="#37474f"/><rect x="260" y="82" width="90" height="36" fill="#eceff1"/><rect x="290" y="56" width="26" height="30" fill="#ef6c00"/>`;
  body += `<path d="M215 140 H1010" stroke="#222" stroke-width="6" stroke-dasharray="40 8"/>`;
  for (let i = 0; i < 9; i++) body += `<rect x="${300 + i * 85}" y="${132 + (i % 2) * 2}" width="14" height="22" fill="#ffca28"/>`;
  // outgoing waves and reflections off two interfaces
  for (let i = 1; i <= 5; i++) body += `<path d="M${215 - i * 6} ${150} A${i * 52} ${i * 52} 0 0 0 ${215 + i * 52} ${150 + i * 28}" fill="none" stroke="#fff" stroke-opacity="${f(0.9 - i * 0.12)}" stroke-width="4"/>`;
  const refl = (sx, hx, y, c) => `<path d="M${sx} 150 L${(sx + hx) / 2} ${y} L${hx} 150" fill="none" stroke="${c}" stroke-width="5" stroke-dasharray="14 10"/>`;
  body += refl(260, 560, 468, "#fff");
  body += refl(260, 760, 596, "#ffeb3b");
  body += refl(260, 980, 724, "#ff7043");
  save("seismic.svg", svg(body, defs));
}


/* ===================================================== BLOWOUT PREVENTER === */
{
  const defs = grad("steel", "#e3e8ec", "#8d99a3", false) + grad("red", "#e53935", "#8e1b18", false) + grad("blue", "#42a5f5", "#1565c0", false) + grad("floor", "#b9b2a3", "#7d7667");
  let b = "";
  b += `<rect y="0" width="1600" height="100" fill="#4a555e"/>`;
  for (let x = 40; x < 1600; x += 200) b += `<rect x="${x}" y="100" width="150" height="16" fill="#37424a"/>`;
  b += `<rect y="790" width="1600" height="110" fill="url(#floor)"/><rect y="784" width="1600" height="10" fill="#6a645a"/>`;
  const cx = 800;
  // wellhead base + spool
  b += `<rect x="${cx - 130}" y="700" width="260" height="84" rx="10" fill="url(#steel)" stroke="#4a555e" stroke-width="5"/>`;
  b += `<rect x="${cx - 95}" y="640" width="190" height="64" fill="url(#steel)" stroke="#4a555e" stroke-width="5"/>`;
  // side outlets with gate valves (choke and kill lines)
  for (const [dir, y] of [[1, 668], [-1, 668]]) {
    const x0 = cx + dir * 95, x1 = cx + dir * 420;
    b += `<rect x="${Math.min(x0, x1)}" y="${y - 20}" width="325" height="40" fill="url(#steel)" stroke="#4a555e" stroke-width="5"/>`;
    b += `<rect x="${x1 - dir * 90 - 28}" y="${y - 54}" width="56" height="108" rx="8" fill="url(#blue)" stroke="#0d3b78" stroke-width="5"/>`;
    b += `<line x1="${x1 - dir * 90}" x2="${x1 - dir * 90}" y1="${y - 54}" y2="${y - 120}" stroke="#4a555e" stroke-width="10"/><circle cx="${x1 - dir * 90}" cy="${y - 130}" r="34" fill="none" stroke="#c62828" stroke-width="12"/>`;
  }
  // two ram preventers
  for (const y of [470, 300]) {
    b += `<rect x="${cx - 170}" y="${y}" width="340" height="150" rx="12" fill="url(#red)" stroke="#5c0f0d" stroke-width="6"/>`;
    for (const dir of [-1, 1]) {
      const x = cx + dir * 170;
      b += `<rect x="${dir > 0 ? x : x - 190}" y="${y + 28}" width="190" height="94" rx="10" fill="url(#blue)" stroke="#0d3b78" stroke-width="6"/>`;
      b += `<rect x="${dir > 0 ? x + 190 : x - 190 - 70}" y="${y + 46}" width="70" height="58" rx="8" fill="url(#steel)" stroke="#4a555e" stroke-width="5"/>`;
      b += `<rect x="${dir > 0 ? x + 260 : x - 190 - 70 - 90}" y="${y + 70}" width="90" height="10" fill="#9aa5ae"/>`;
    }
    b += `<rect x="${cx - 190}" y="${y - 12}" width="380" height="16" rx="5" fill="#9aa5ae" stroke="#4a555e" stroke-width="4"/>`;
  }
  // annular preventer on top
  b += `<path d="M${cx - 150} 290 V210 Q${cx - 150} 130 ${cx} 130 Q${cx + 150} 130 ${cx + 150} 210 V290 Z" fill="url(#red)" stroke="#5c0f0d" stroke-width="6"/>`;
  b += `<rect x="${cx - 60}" y="104" width="120" height="30" fill="url(#steel)" stroke="#4a555e" stroke-width="5"/>`;
  b += `<ellipse cx="${cx - 60}" cy="200" rx="36" ry="52" fill="#fff" opacity=".18"/>`;
  // hydraulic lines
  for (const [dir, c] of [[-1, "#ffca28"], [1, "#ffca28"]]) {
    b += `<path d="M${cx + dir * 330} 560 C${cx + dir * 470} 560 ${cx + dir * 470} 760 ${cx + dir * 560} 790" fill="none" stroke="${c}" stroke-width="10"/>`;
    b += `<path d="M${cx + dir * 330} 390 C${cx + dir * 500} 390 ${cx + dir * 520} 700 ${cx + dir * 620} 790" fill="none" stroke="#43a047" stroke-width="10"/>`;
  }
  save("bop.svg", svg(b, defs, "#e9e4d6"));
}

/* ========================================================= CHRISTMAS TREE === */
{
  const defs = grad("steel", "#dfe5ea", "#8b97a1", false) + grad("blue", "#42a5f5", "#1565c0", false) + grad("floor", "#b9b2a3", "#7d7667") + grad("sky", "#cfe8f6", "#f5f0e3");
  let b = `<rect width="1600" height="900" fill="url(#sky)"/><rect y="800" width="1600" height="100" fill="url(#floor)"/>`;
  const cx = 720;
  // wellhead + casing flange at ground
  b += `<rect x="${cx - 200}" y="760" width="400" height="50" rx="8" fill="url(#steel)" stroke="#4a555e" stroke-width="6"/>`;
  b += `<rect x="${cx - 110}" y="690" width="220" height="72" fill="url(#steel)" stroke="#4a555e" stroke-width="6"/>`;
  const flange = (y, w = 250) => `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="22" rx="5" fill="#9aa5ae" stroke="#4a555e" stroke-width="5"/>${[-1, -0.5, 0.5, 1].map((k) => `<circle cx="${cx + k * (w / 2 - 20)}" cy="${y + 11}" r="6" fill="#4a555e"/>`).join("")}`;
  // valve block
  const valve = (y, side) => {
    let v = flange(y + 100) + flange(y - 4);
    v += `<rect x="${cx - 80}" y="${y}" width="160" height="106" rx="14" fill="url(#blue)" stroke="#0d3b78" stroke-width="6"/>`;
    v += `<rect x="${cx + side * 80 - (side > 0 ? 0 : 60)}" y="${y + 30}" width="60" height="46" rx="6" fill="url(#steel)" stroke="#4a555e" stroke-width="5"/>`;
    v += `<line x1="${cx + side * 140}" x2="${cx + side * 190}" y1="${y + 53}" y2="${y + 53}" stroke="#4a555e" stroke-width="12"/>`;
    v += `<circle cx="${cx + side * 215}" cy="${y + 53}" r="40" fill="none" stroke="#c62828" stroke-width="13"/><line x1="${cx + side * 215 - 40}" x2="${cx + side * 215 + 40}" y1="${y + 53}" y2="${y + 53}" stroke="#c62828" stroke-width="8"/><line x1="${cx + side * 215}" x2="${cx + side * 215}" y1="${y + 13}" y2="${y + 93}" stroke="#c62828" stroke-width="8"/>`;
    return v;
  };
  b += valve(578, -1) + valve(446, 1);
  // flow cross with wing valve to the right (production flowline) and kill wing to the left
  b += flange(430);
  b += `<rect x="${cx - 80}" y="326" width="160" height="106" rx="14" fill="url(#steel)" stroke="#4a555e" stroke-width="6"/>`;
  b += `<rect x="${cx + 80}" y="352" width="300" height="54" fill="url(#steel)" stroke="#4a555e" stroke-width="6"/><rect x="${cx + 200}" y="316" width="64" height="126" rx="10" fill="url(#blue)" stroke="#0d3b78" stroke-width="6"/>`;
  b += `<circle cx="${cx + 232}" cy="${290}" r="40" fill="none" stroke="#c62828" stroke-width="13"/><line x1="${cx + 232}" x2="${cx + 232}" y1="316" y2="330" stroke="#4a555e" stroke-width="10"/>`;
  b += `<rect x="${cx + 380}" y="344" width="240" height="70" fill="url(#steel)" stroke="#4a555e" stroke-width="6"/><rect x="${cx + 560}" y="334" width="46" height="90" rx="6" fill="#9aa5ae" stroke="#4a555e" stroke-width="5"/>`;
  b += `<rect x="${cx - 230}" y="352" width="150" height="54" fill="url(#steel)" stroke="#4a555e" stroke-width="6"/><rect x="${cx - 270}" y="340" width="44" height="78" rx="6" fill="#9aa5ae" stroke="#4a555e" stroke-width="5"/>`;
  // swab valve + cap + gauge at the top
  b += flange(318);
  b += `<rect x="${cx - 70}" y="214" width="140" height="106" rx="14" fill="url(#blue)" stroke="#0d3b78" stroke-width="6"/>`;
  b += `<circle cx="${cx}" cy="162" r="44" fill="none" stroke="#c62828" stroke-width="13"/><line x1="${cx}" x2="${cx}" y1="206" y2="218" stroke="#4a555e" stroke-width="10"/>`;
  b += flange(196, 190) + `<path d="M${cx - 80} 196 Q${cx} 120 ${cx + 80} 196 Z" fill="url(#steel)" stroke="#4a555e" stroke-width="6"/>`;
  b += `<circle cx="${cx - 150}" cy="250" r="44" fill="#fff" stroke="#4a555e" stroke-width="8"/><path d="M${cx - 150} 250 L${cx - 124} 226" stroke="#c62828" stroke-width="6" stroke-linecap="round"/><line x1="${cx - 106}" x2="${cx - 70}" y1="262" y2="262" stroke="#4a555e" stroke-width="8"/>`;
  save("christmas-tree.svg", svg(b, defs, "#e9e4d6"));
}

/* ======================================================= HORIZONTAL SEPARATOR === */
{
  const defs = grad("shell", "#dfe5ea", "#8b97a1") + `<clipPath id="vessel"><rect x="250" y="290" width="1080" height="300" rx="150"/></clipPath><pattern id="mesh" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 0L14 14M14 0L0 14" stroke="#6b7680" stroke-width="2"/></pattern>`;
  let b = `<rect y="790" width="1600" height="110" fill="#b9b2a3"/>`;
  // saddles
  for (const x of [420, 1120]) b += `<path d="M${x - 110} 790 L${x - 80} 560 H${x + 80} L${x + 110} 790 Z" fill="#6f7a84" stroke="#3e464d" stroke-width="5"/>`;
  // vessel cutaway
  b += `<rect x="250" y="290" width="1080" height="300" rx="150" fill="#f4f7f9"/>`;
  b += `<g clip-path="url(#vessel)">`;
  b += `<rect x="250" y="510" width="1080" height="80" fill="#4aa3d8"/>`; // water
  b += `<rect x="250" y="420" width="1080" height="92" fill="#8a4b12"/>`; // oil
  b += `<rect x="250" y="290" width="1080" height="132" fill="#fff8d8"/>`; // gas
  // inlet diverter and a wave at the interface
  b += `<path d="M300 420 Q420 405 540 420 T780 420 T1020 420 T1330 420" fill="none" stroke="#e5b25a" stroke-width="6"/>`;
  // weir plate holding back the oil, demister pad before the gas outlet
  b += `<rect x="1010" y="440" width="14" height="150" fill="#4a555e"/>`;
  b += `<rect x="1080" y="300" width="70" height="120" fill="url(#mesh)" stroke="#4a555e" stroke-width="4"/>`;
  b += `<rect x="640" y="300" width="12" height="90" fill="#4a555e"/><rect x="640" y="540" width="12" height="50" fill="#4a555e"/>`;
  b += `<rect x="330" y="360" width="26" height="130" rx="6" fill="#9aa5ae" stroke="#4a555e" stroke-width="4"/>`;
  b += `</g>`;
  b += `<rect x="250" y="290" width="1080" height="300" rx="150" fill="none" stroke="#4a555e" stroke-width="10"/>`;
  b += `<path d="M260 440 Q290 300 400 296 M1320 440 Q1290 300 1180 296" fill="none" stroke="#fff" stroke-width="10" opacity=".35"/>`;
  // nozzles and piping: inlet (left top), gas (top right), oil (bottom right), water (bottom middle)
  const pipe = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#shell)" stroke="#4a555e" stroke-width="6"/>`;
  b += pipe(330, 190, 40, 106) + pipe(150, 170, 220, 40) + `<circle cx="150" cy="190" r="26" fill="#9aa5ae" stroke="#4a555e" stroke-width="5"/>`;
  b += pipe(1110, 170, 40, 124) + pipe(1110, 130, 250, 40) + `<rect x="1340" y="116" width="40" height="68" rx="5" fill="#9aa5ae" stroke="#4a555e" stroke-width="5"/>`;
  b += pipe(1160, 586, 40, 150) + pipe(1160, 710, 260, 40) + `<circle cx="1330" cy="730" r="28" fill="none" stroke="#c62828" stroke-width="10"/>`;
  b += pipe(760, 586, 40, 150) + pipe(520, 710, 280, 40) + `<circle cx="650" cy="730" r="28" fill="none" stroke="#c62828" stroke-width="10"/>`;
  save("separator.svg", svg(b, defs, "#e9e4d6"));
}

console.log("Wrote 14 diagrams to", OUT);
