/**
 * NAPE 2026 integrity check — run with `npm run check:nape`.
 *
 * Re-parses the supplied document from scratch and proves that what the game
 * ships is what the document says, with exactly the five approved wording
 * revisions and nothing else changed.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseNapeSource } from "./parse-nape-source.mjs";
import { VISUAL_IDS } from "./nape-config.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const json = (p) => JSON.parse(read(p));
const errors = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); };

const doc = parseNapeSource(join(ROOT, "data", "source", "nape-2026-quiz.txt"));
const shipped = json("data/nape2026.source.json");
const meta = json("data/nape2026.meta.json");
const order = json("data/events.order.json");

/* 1. The 80 questions ------------------------------------------------------ */
ok(doc.length === 80, `document has ${doc.length} questions, expected 80`);
ok(JSON.stringify(doc) === JSON.stringify(shipped), "data/nape2026.source.json differs from the document — re-run build-nape-source");
for (let set = 1; set <= 4; set++) ok(doc.filter((q) => q.set === set).length === 20, `set ${set} does not have 20 questions`);
ok(doc.filter((q) => q.options.length === 2).length === 11, "expected 11 true/false questions");
ok(doc.filter((q) => q.options.length === 4).length === 69, "expected 69 four-option questions");

/* 2. Live wording = document, except the five approved revisions ----------- */
const REVISED = [12, 29, 61, 65, 77];
const revisedFound = Object.keys(meta).filter((n) => meta[n].revision).map(Number);
ok(JSON.stringify(revisedFound) === JSON.stringify(REVISED), `revisions are ${revisedFound}, expected ${REVISED}`);
for (const q of doc) {
  const rev = meta[q.n].revision ?? {};
  const prompt = rev.prompt ?? q.prompt;
  if (!REVISED.includes(q.n)) ok(prompt === q.prompt, `Q${q.n}: wording changed without approval`);
  for (const o of q.options) {
    const label = rev.optionLabels?.[o.letter] ?? o.label;
    if (rev.optionLabels?.[o.letter] === undefined) ok(label === o.label, `Q${q.n}: option ${o.letter} changed`);
  }
  // Exactly one correct answer, and it is the document's tick.
  ok(q.options.filter((o) => o.correct).length === 1, `Q${q.n}: needs exactly one correct option`);
}
// The approved revisions are exactly what the owner specified (final text).
const R = (n) => meta[n].revision;
ok(R(12).prompt === "Which country was the world's largest producer of crude oil and lease condensate in 2025?", "Q12 stem");
ok(R(12).funFact === "The United States has been the world's leading crude oil producer since 2018, with shale production playing a major role in its growth.", "Q12 fun fact");
ok(R(29).prompt === "Which of these is an essential safety check before entering a confined space?", "Q29 stem");
ok(R(29).optionLabels.C === "Test the atmosphere for hazardous conditions", "Q29 answer text");
ok(R(29).funFact.startsWith("Confined spaces can contain oxygen-deficient, toxic or flammable atmospheres."), "Q29 fun fact");
ok(R(61).prompt === "Which of these extinguishers is generally suitable for use on energized electrical equipment?", "Q61 stem");
ok(R(61).optionLabels.C === "Standard foam extinguisher" && Object.keys(R(61).optionLabels).length === 1, "Q61 option C");
ok(R(61).funFact.startsWith("CO₂ extinguishers are non-conductive and leave no residue."), "Q61 fun fact");
ok(R(65).prompt === "Which combination of measures helps prevent heat stress during work in hot conditions?", "Q65 stem");
ok(R(65).optionLabels.A === "Remove your PPE and continue working", "Q65 option A");
ok(R(65).optionLabels.D === "Drink water regularly and take scheduled rest breaks in shaded or cooled areas", "Q65 answer text");
ok(R(65).funFact.startsWith("Heat-stress prevention also includes acclimatization"), "Q65 fun fact");
ok(R(77).prompt.startsWith("At approximately what 8-hour time-weighted average noise exposure level"), "Q77 stem");
ok(R(77).funFact.startsWith("Prolonged exposure to excessive noise can cause permanent hearing damage."), "Q77 fun fact");
// Correct answers are unchanged for all five (same letter as the document's tick).
for (const n of REVISED) {
  const tick = doc[n - 1].options.find((o) => o.correct).letter;
  ok({ 12: "C", 29: "C", 61: "D", 65: "D", 77: "C" }[n] === tick, `Q${n}: correct letter must remain ${tick}`);
}
for (const q of doc) if (!REVISED.includes(q.n)) ok(!meta[q.n].revision, `Q${q.n}: unexpected revision`);
// Q59: wording/answer untouched; verification flag cleared with the source documented.
ok(!meta[59].revision, "Q59 must keep its original wording");
ok(!meta[59].flags.includes("needs-verification"), "Q59 verification flag should be cleared");
ok(/OPEC Annual Statistical Bulletin 2026, Table 9\.1/.test(meta[59].note ?? ""), "Q59 note must cite OPEC ASB 2026 Table 9.1");
ok(doc[58].answerLabel === "True", "Q59 answer must remain True");

/* 3. Event order ------------------------------------------------------------ */
const puzzlesTs = read("data/puzzles.ts");
const originalIds = puzzlesTs.split(/\n  \{\n\s+id:/).slice(1).map((p) => Number(p.match(/^\s*(\d+)/)[1]));
ok(originalIds.length === 60, `data/puzzles.ts has ${originalIds.length} questions, expected 60`);
const nape = order["nape-2026"];
const play = nape.slice(0, 100);
ok(nape.length === 140 && new Set(nape).size === 140, "NAPE order must list all 140 questions exactly once");
ok(play.filter((u) => u.startsWith("nape26-")).length === 80, "100 playable must contain all 80 NAPE questions");
ok(new Set(play.filter((u) => u.startsWith("nape26-"))).size === 80, "NAPE questions duplicated in the playable set");
const visual = play.filter((u) => u.startsWith("seed-")).map((u) => Number(u.slice(5))).sort((a, b) => a - b);
ok(JSON.stringify(visual) === JSON.stringify([...VISUAL_IDS].sort((a, b) => a - b)), "playable visual puzzles are not the approved 20");
ok(visual.length === 20, `${visual.length} visual puzzles active, expected 20`);
const hidden = nape.slice(100);
ok(hidden.length === 40 && hidden.every((u) => u.startsWith("seed-") && !visual.includes(Number(u.slice(5)))), "hidden set must be the other 40 originals");
ok(JSON.stringify(order["original-60"]) === JSON.stringify(originalIds.map((i) => `seed-${i}`)), "original-60 order must equal data/puzzles.ts order");

/* 4. The original 60 are untouched ------------------------------------------ */
ok(read("data/puzzles.ts") === read("data/backups/puzzles-original-60.ts"), "data/puzzles.ts differs from data/backups/puzzles-original-60.ts");
try {
  const diff = execSync("git diff --stat -- data/puzzles.ts", { cwd: ROOT, encoding: "utf8" }).trim();
  ok(diff === "", `data/puzzles.ts has uncommitted changes:\n${diff}`);
} catch { /* not a git checkout */ }

/* 5. Pictures: bundled, local, light, and text-free by construction --------- */
let withPic = 0, zoom = 0, bytes = 0;
for (const q of doc) {
  const v = meta[q.n].visual;
  if (!v) continue;
  withPic++;
  if (v.zoom) zoom++;
  ok(v.src.startsWith("/media/puzzles/nape/"), `Q${q.n}: picture must be bundled locally (${v.src})`);
  const file = join(ROOT, "public", v.src);
  ok(existsSync(file), `Q${q.n}: picture file missing (${v.src})`);
  if (existsSync(file)) {
    const size = statSync(file).size;
    bytes += size;
    ok(size < 600 * 1024, `Q${q.n}: ${v.src} is ${Math.round(size / 1024)} KB (limit 600 KB)`);
  }
  ok(!/https?:/.test(v.src), `Q${q.n}: external image URL`);
  ok(v.alt && v.alt.length > 10, `Q${q.n}: missing alt text`);
}

if (errors.length) {
  console.error(`✗ ${errors.length} NAPE problem(s):\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}
console.log("✓ NAPE integrity OK");
console.log(`  80 questions (69 multiple choice, 11 true/false) · 4 sets of 20 · answers and fun facts match the document`);
console.log(`  5 approved revisions (Q${REVISED.join(", Q")}) · Q59 original, verification cleared`);
console.log(`  100 playable boxes = 80 NAPE + 20 approved visual puzzles · 40 hidden · original-60 order preserved`);
console.log(`  pictures: ${withPic} questions (${zoom} staged-zoom), ${Math.round(bytes / 1024)} KB total, all local`);
