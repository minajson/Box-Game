/**
 * Builds the fixed play order for each event preset → data/events.order.json.
 *
 * NAPE 2026: 80 Oil & Gas questions are shuffled (seeded, so the result is the
 * same every build) with no two neighbouring boxes sharing a topic, then the 20
 * approved visual puzzles are dropped in one per block of five boxes, so the
 * wall is evenly mixed (five of the everyday-object zoom puzzles are then swapped
 * for NAPE equipment records, see NAPE_ZOOM_SWAP). The 40 other originals and the
 * five swapped-out zoom originals follow, hidden.
 *
 * Original Crack the Box: the bundled order, untouched.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

import { VISUAL_IDS, NAPE_ZOOM_SWAP } from "./nape-config.mjs";

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
function shuffle(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Original bundled order + types.
const src = readFileSync(join(ROOT, "data", "puzzles.ts"), "utf8");
const original = src.split(/\n  \{\n\s+id:/).slice(1).map((p) => ({
  id: Number(p.match(/^\s*(\d+)/)[1]),
  type: (p.match(/\n    type:\s*"([\w-]+)"/) || [])[1],
}));
if (original.length !== 60) throw new Error(`Expected 60 originals, found ${original.length}`);
const typeOf = new Map(original.map((o) => [o.id, o.type]));
for (const id of VISUAL_IDS) if (!typeOf.has(id)) throw new Error(`Visual id ${id} is not an original puzzle`);
if (new Set(VISUAL_IDS).size !== 20) throw new Error("Visual ids must be 20 distinct ids");

const meta = JSON.parse(readFileSync(join(ROOT, "data", "nape2026.meta.json"), "utf8"));
const rand = rng(2026);

// 1. Jumble the 80, then repair neighbouring same-topic pairs.
let nape = shuffle(Array.from({ length: 80 }, (_, i) => i + 1), rand);
const topic = (n) => meta[n].topic;
for (let pass = 0; pass < 40; pass++) {
  let clean = true;
  for (let i = 1; i < nape.length; i++) {
    if (topic(nape[i]) !== topic(nape[i - 1])) continue;
    clean = false;
    const j = nape.findIndex((n, k) => k > i && topic(n) !== topic(nape[i]) && (k + 1 >= nape.length || topic(nape[k + 1]) !== topic(nape[i])) && topic(nape[k - 1]) !== topic(nape[i]));
    if (j > 0) [nape[i], nape[j]] = [nape[j], nape[i]];
  }
  if (clean) break;
}
// ...and keep picture questions from bunching (no more than 3 in a row).
const hasPic = (n) => Boolean(meta[n].visual);
for (let pass = 0; pass < 40; pass++) {
  let clean = true;
  for (let i = 3; i < nape.length; i++) {
    if (hasPic(nape[i]) && hasPic(nape[i - 1]) && hasPic(nape[i - 2]) && hasPic(nape[i - 3])) {
      clean = false;
      const j = nape.findIndex((n, k) => k > i && !hasPic(n));
      if (j > 0) [nape[i], nape[j]] = [nape[j], nape[i]];
    }
  }
  if (clean) break;
}

// 2. Order the 20 visuals so the same puzzle type never repeats back to back.
let visuals = shuffle(VISUAL_IDS, rand);
for (let i = 1; i < visuals.length; i++) {
  if (typeOf.get(visuals[i]) !== typeOf.get(visuals[i - 1])) continue;
  const j = visuals.findIndex((v, k) => k > i && typeOf.get(v) !== typeOf.get(visuals[i - 1]) && typeOf.get(v) !== typeOf.get(visuals[i + 1] ?? ""));
  if (j > 0) [visuals[i], visuals[j]] = [visuals[j], visuals[i]];
}

// 3. One visual per block of five, in slot 1-3 of the block.
const slots = new Map(Array.from({ length: 20 }, (_, b) => [b * 5 + 1 + Math.floor(rand() * 3), visuals[b]]));
const play = [];
let k = 0;
for (let pos = 0; pos < 100; pos++) {
  play.push(slots.has(pos) ? `seed-${slots.get(pos)}` : `nape26-q${String(nape[k++]).padStart(2, "0")}`);
}
if (k !== 80) throw new Error("NAPE placement mismatch");
// 4. Swap the five everyday-object zoom puzzles for the NAPE equipment records,
// box for box. The originals move to the hidden tail (still in the bank, and
// still Active in Original Crack the Box).
const swapped = Object.keys(NAPE_ZOOM_SWAP).map(Number);
for (const id of swapped) {
  if (typeOf.get(id) !== "zoom") throw new Error(`Swap source ${id} is not an original zoom puzzle`);
  const at = play.indexOf(`seed-${id}`);
  if (at < 0) throw new Error(`seed-${id} is not in the NAPE playable set`);
  play[at] = NAPE_ZOOM_SWAP[id];
}
const hidden = [
  ...original.filter((o) => !VISUAL_IDS.includes(o.id)).map((o) => `seed-${o.id}`),
  ...swapped.map((id) => `seed-${id}`),
];

const order = {
  "nape-2026": [...play, ...hidden],
  "original-60": original.map((o) => `seed-${o.id}`),
};
if (new Set(order["nape-2026"]).size !== 145) throw new Error("NAPE order has duplicates");
writeFileSync(join(ROOT, "data", "events.order.json"), JSON.stringify(order, null, 2) + "\n");

// Report
const isQ = (u) => u.startsWith("nape26-q");
const adj = play.filter((u, i) => i && isQ(u) && isQ(play[i - 1]) && topic(Number(u.slice(-2))) === topic(Number(play[i - 1].slice(-2)))).length;
console.log(`order: 100 playable (80 NAPE + 20 visual), 40 hidden; same-topic neighbours: ${adj}`);
console.log(play.map((u, i) => `${i + 1}:${u.replace("nape26-q", "N").replace("nape26-zoom-", "Z-").replace("seed-", "V")}`).join(" "));
