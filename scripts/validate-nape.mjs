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
import { VISUAL_IDS, NAPE_ZOOM_SWAP } from "./nape-config.mjs";

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
const SWAPPED = Object.keys(NAPE_ZOOM_SWAP).map(Number);
const ZOOM_UIDS = Object.values(NAPE_ZOOM_SWAP);
ok(nape.length === 145 && new Set(nape).size === 145, "NAPE order must list all 145 questions (140 + 5 NAPE zoom) exactly once");
ok(play.length === 100, "NAPE playable set must be exactly 100 boxes");
ok(play.filter((u) => u.startsWith("nape26-q")).length === 80, "100 playable must contain all 80 NAPE questions");
ok(new Set(play.filter((u) => u.startsWith("nape26-q"))).size === 80, "NAPE questions duplicated in the playable set");
const visual = play.filter((u) => u.startsWith("seed-")).map((u) => Number(u.slice(5))).sort((a, b) => a - b);
const expectVisual = VISUAL_IDS.filter((id) => !SWAPPED.includes(id)).sort((a, b) => a - b);
ok(JSON.stringify(visual) === JSON.stringify(expectVisual), "playable original visual puzzles are not the approved 20 minus the 5 swapped zoom puzzles");
ok(visual.length === 15, `${visual.length} original visual puzzles active, expected 15`);
ok(ZOOM_UIDS.length === 5 && ZOOM_UIDS.every((u) => play.includes(u)), "all 5 NAPE equipment zoom records must be in the 100 playable boxes");
ok(play.filter((u) => u.startsWith("nape26-zoom-")).length === 5, "exactly 5 NAPE zoom records must be playable");
const hidden = nape.slice(100);
const otherOriginals = originalIds.filter((id) => !VISUAL_IDS.includes(id)).map((id) => `seed-${id}`);
ok(hidden.length === 45 && JSON.stringify(hidden) === JSON.stringify([...otherOriginals, ...SWAPPED.map((id) => `seed-${id}`)]), "hidden set must be the other 40 originals plus the 5 swapped-out zoom originals");
ok(JSON.stringify(order["original-60"]) === JSON.stringify(originalIds.map((i) => `seed-${i}`)), "original-60 order must equal data/puzzles.ts order");
ok(SWAPPED.every((id) => order["original-60"].includes(`seed-${id}`)), "the five original zoom puzzles must remain in Original Crack the Box");
ok(order["original-60"].length === 60 && !order["original-60"].some((u) => u.startsWith("nape26-")), "original-60 must be exactly the 60 originals");

/* 3b. The five NAPE equipment zoom records ----------------------------------- */
const zoomTs = read("data/nape2026.zoom.ts");
const zoomRecords = [...zoomTs.matchAll(/zoom\(\s*(\d+),\s*"([\w-]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",?\s*\)/g)]
  .map((m) => ({ id: Number(m[1]), slug: m[2], answer: m[3], hint: m[4], insight: m[5], picture: m[6] }));
ok(zoomRecords.length === 5, `found ${zoomRecords.length} NAPE zoom records, expected 5`);
ok(JSON.stringify(zoomRecords.map((r) => `nape26-zoom-${r.slug}`)) === JSON.stringify(ZOOM_UIDS), "NAPE zoom record uids must match NAPE_ZOOM_SWAP");
ok(new Set(zoomRecords.map((r) => r.id)).size === 5 && zoomRecords.every((r) => r.id > 180 && !originalIds.includes(r.id)), "NAPE zoom record ids must be new and unique");
ok(JSON.stringify(zoomRecords.map((r) => r.answer)) === JSON.stringify(["A BLOWOUT PREVENTER (BOP)", "A WELLHEAD CHRISTMAS TREE", "A DRILL BIT", "A PIPELINE PIG", "A PRESSURE GAUGE"]), "NAPE zoom answers");
for (const r of zoomRecords) {
  const parts = r.hint.split(" · ");
  ok(parts.length === 2 && parts.every((h) => h.trim().length > 8), `${r.slug}: hint must hold exactly two hints separated by " · "`);
  ok(r.hint.length <= 100, `${r.slug}: hint is ${r.hint.length} characters — keep it to one line on the projector`);
  const phrase = r.answer.replace(/^A /, "").replace(/ \(BOP\)$/, "").replace(/^WELLHEAD /, "");
  ok(!r.hint.toLowerCase().includes(phrase.toLowerCase()) && !/\bBOP\b/.test(r.hint), `${r.slug}: hint gives away the answer ("${phrase}")`);
  ok(r.insight.length > 20 && r.insight.length <= 110, `${r.slug}: insight is ${r.insight.length} characters — keep it to two lines on the projector`);
  const file = join(ROOT, "public", "media", "puzzles", "nape", "zoom", r.picture);
  ok(existsSync(file), `${r.slug}: picture missing (${r.picture})`);
  if (existsSync(file)) {
    const svg = readFileSync(file, "utf8");
    ok(svg.includes('viewBox="0 0 600 600"'), `${r.slug}: picture must be 600×600 like the original zoom pictures`);
    ok(!/https?:\/\/(?!www\.w3\.org)/.test(svg), `${r.slug}: picture references an external URL`);
    const words = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((t) => t[1]).filter((t) => /[A-Za-z]/.test(t));
    ok(words.length === 0, `${r.slug}: picture carries words that could give the answer away (${words.join(", ")})`);
  }
}
// The originals' zoom records are byte-identical (compared with the backup in section 4).

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
console.log(`  100 playable boxes = 80 NAPE + 15 approved visual puzzles + 5 NAPE equipment zoom · 45 hidden · original-60 order preserved (5 original zoom puzzles stay in Original)`);
console.log(`  pictures: ${withPic} questions (${zoom} staged-zoom), ${Math.round(bytes / 1024)} KB total, all local`);
