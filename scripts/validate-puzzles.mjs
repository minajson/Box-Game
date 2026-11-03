/**
 * Validates data/puzzles.ts without a build step.
 *
 *   npm run check:puzzles
 *
 * Catches the mistakes that only surface on stage:
 *  - a scramble whose letters are not a permutation of its answer (the
 *    rearrange animation would be impossible)
 *  - a masked value that does not line up with its answer
 *  - duplicate/missing box numbers, missing hints, unreferenced image files
 *  - a clickable challenge that cannot be answered correctly
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "data", "puzzles.ts"), "utf8");

// Strip the TS-only bits and evaluate the array literal.
const body = src
  .replace(/^import[\s\S]*?;\s*$/m, "")
  .replace(/export const PUZZLES: Puzzle\[\] =/, "const PUZZLES =")
  .replace(/export const TOTAL_BOXES[\s\S]*$/, "")
  .concat("\nreturn PUZZLES;");
const puzzles = new Function(body)();

const TOTAL_BOXES = 60;

// Wild Card was removed by request — it must not come back in through data.
const TYPES = [
  "rebus",
  "scramble",
  "picture-word",
  "picture-combo",
  "emoji",
  "missing-letters",
  "zoom",
  "odd-one-out",
  "connect",
  "myth-fact",
  "clickable",
];

const errors = [];
const letters = (s) => s.toUpperCase().replace(/[^A-Z]/g, "").split("").sort().join("");

const seenBoxes = new Set();
const seenIds = new Set();
const seenAnswers = new Map();
const seenStatements = new Map();
const typeCounts = {};

for (const p of puzzles) {
  const tag = `box ${p.boxNumber} (${p.type})`;

  if (seenBoxes.has(p.boxNumber)) errors.push(`${tag}: duplicate boxNumber`);
  seenBoxes.add(p.boxNumber);
  if (seenIds.has(p.id)) errors.push(`${tag}: duplicate id ${p.id}`);
  seenIds.add(p.id);

  if (!TYPES.includes(p.type)) errors.push(`${tag}: unknown type "${p.type}"`);
  typeCounts[p.type] = (typeCounts[p.type] ?? 0) + 1;

  if (!p.answer?.trim()) errors.push(`${tag}: missing answer`);
  if (!p.hint?.trim()) errors.push(`${tag}: missing hint`);
  if (!p.categoryLabel?.trim()) errors.push(`${tag}: missing categoryLabel`);

  // No puzzle should repeat during a game, and neither should an answer —
  // revealing the same word twice deflates the room. Myth or Fact is the
  // exception: its answer is always one of two words, so its statement is
  // checked for repeats instead.
  const key = p.answer?.trim().toUpperCase();
  if (key && p.type !== "myth-fact") {
    if (seenAnswers.has(key)) {
      errors.push(`${tag}: answer "${p.answer}" already used by box ${seenAnswers.get(key)}`);
    } else {
      seenAnswers.set(key, p.boxNumber);
    }
  }

  if (p.type === "scramble") {
    if (!p.scrambledValue) {
      errors.push(`${tag}: scramble has no scrambledValue`);
    } else if (letters(p.scrambledValue) !== letters(p.answer)) {
      errors.push(
        `${tag}: "${p.scrambledValue}" is not a permutation of "${p.answer}" ` +
          `(${letters(p.scrambledValue)} vs ${letters(p.answer)})`,
      );
    } else if (p.scrambledValue.toUpperCase() === p.answer.toUpperCase()) {
      errors.push(`${tag}: scrambledValue equals the answer`);
    }
  }

  if (p.type === "missing-letters") {
    if (!p.maskedValue) {
      errors.push(`${tag}: missing-letters has no maskedValue`);
    } else {
      const slots = p.maskedValue.replace(/\s+/g, "").split("");
      const ans = p.answer.replace(/\s+/g, "").toUpperCase().split("");
      if (slots.length !== ans.length) {
        errors.push(
          `${tag}: maskedValue has ${slots.length} slots but answer has ${ans.length} letters`,
        );
      } else {
        const blanks = slots.filter((c) => c === "_").length;
        if (blanks === 0) errors.push(`${tag}: maskedValue has no blanks`);
        slots.forEach((c, i) => {
          if (c !== "_" && c !== ans[i]) {
            errors.push(
              `${tag}: maskedValue position ${i + 1} is "${c}" but answer has "${ans[i]}"`,
            );
          }
        });
      }
    }
  }

  if (p.type === "odd-one-out") {
    if (!p.choices || p.choices.length !== 4)
      errors.push(`${tag}: odd-one-out needs exactly 4 choices`);
    if (!p.choices?.some((c) => c.id === p.oddOneOutId))
      errors.push(`${tag}: oddOneOutId "${p.oddOneOutId}" is not one of the choices`);
    const odd = p.choices?.find((c) => c.id === p.oddOneOutId);
    if (odd && odd.label.toUpperCase() !== p.answer.toUpperCase())
      errors.push(
        `${tag}: answer "${p.answer}" does not match the odd choice "${odd.label}"`,
      );
  }

  if (p.type === "connect" && (!p.clues || p.clues.length !== 3))
    errors.push(`${tag}: connect needs exactly 3 clues`);

  if (p.type === "myth-fact") {
    const statement = p.clues?.[0]?.trim().toLowerCase();
    if (p.clues?.length !== 1 || !statement) {
      errors.push(`${tag}: myth-fact needs exactly 1 statement in clues`);
    } else if (seenStatements.has(statement)) {
      errors.push(`${tag}: statement already used by box ${seenStatements.get(statement)}`);
    } else {
      seenStatements.set(statement, p.boxNumber);
    }
    if (p.answer !== "MYTH" && p.answer !== "FACT")
      errors.push(`${tag}: answer must be MYTH or FACT, found "${p.answer}"`);
    if (!p.insight?.trim()) errors.push(`${tag}: myth-fact needs an explanation in insight`);
  }

  if (p.type === "clickable") checkClickable(p, tag);

  if (p.challenge !== undefined)
    errors.push(`${tag}: "challenge" is a removed Wild Card field`);

  if (p.type === "zoom" && p.imageAssets.length === 0)
    errors.push(`${tag}: zoom puzzle has no image asset`);

  for (const asset of p.imageAssets ?? []) {
    if (!existsSync(join(ROOT, "public", asset)))
      errors.push(`${tag}: image asset not found → public${asset}`);
  }

  const usesRows = ["rebus", "picture-word", "picture-combo", "emoji"];
  if (usesRows.includes(p.type) && !p.rows?.length)
    errors.push(`${tag}: ${p.type} has no rows to render`);

  // Every part that points at an image must point at one that exists.
  for (const row of p.rows ?? []) {
    for (const part of row.parts ?? []) {
      if (
        part.assetIndex !== undefined &&
        !p.imageAssets[part.assetIndex]
      ) {
        errors.push(`${tag}: assetIndex ${part.assetIndex} has no imageAsset`);
      }
    }
  }
}

/**
 * Clickable challenges: the clicks decide the score, so the data must make a
 * right answer possible. Mirrors the clickable rules in lib/puzzleValidation.ts.
 */
function checkClickable(p, tag) {
  const assets = p.imageAssets ?? [];
  const inRange = (i) => Number.isInteger(i) && i >= 0 && i < assets.length;
  if (!["choice", "hotspot", "sequence"].includes(p.interaction)) {
    errors.push(`${tag}: interaction must be choice, hotspot or sequence`);
    return;
  }
  if (!p.insight?.trim()) errors.push(`${tag}: clickable needs an explanation in insight`);
  const needsScene = p.interaction === "hotspot" || (p.interaction === "choice" && p.sceneZoom);
  if (p.sceneAsset !== undefined && !inRange(p.sceneAsset))
    errors.push(`${tag}: sceneAsset ${p.sceneAsset} has no imageAsset`);
  if (needsScene && !inRange(p.sceneAsset ?? 0)) errors.push(`${tag}: needs a scene photo`);

  if (p.interaction === "hotspot") {
    const spots = p.hotspots ?? [];
    if (!spots.length) errors.push(`${tag}: hotspot challenge has no hotspots`);
    const ids = new Set();
    for (const h of spots) {
      if (!h.id || ids.has(h.id)) errors.push(`${tag}: hotspot ids must be unique and non-empty`);
      ids.add(h.id);
      if (!h.label?.trim()) errors.push(`${tag}: hotspot "${h.id}" has no label`);
      if (!h.areas?.length) errors.push(`${tag}: hotspot "${h.id}" has no areas`);
      if (h.labelArea !== undefined && !(h.labelArea >= 0 && h.labelArea < (h.areas?.length ?? 0)))
        errors.push(`${tag}: hotspot "${h.id}" labelArea ${h.labelArea} has no area`);
      if (h.labelSide !== undefined && !["below", "above", "left", "right"].includes(h.labelSide))
        errors.push(`${tag}: hotspot "${h.id}" labelSide must be below, above, left or right`);
      for (const a of h.areas ?? []) {
        if (!(a.x >= 0 && a.y >= 0 && a.w > 0 && a.h > 0 && a.x + a.w <= 100.5 && a.y + a.h <= 100.5))
          errors.push(`${tag}: hotspot "${h.id}" has an area outside the photo`);
      }
    }
    const need = p.selectCount ?? spots.length;
    if (!(need >= 1 && need <= spots.length))
      errors.push(`${tag}: selectCount ${need} must be between 1 and ${spots.length}`);
    return;
  }

  const options = p.options ?? [];
  if (options.length < 2 || options.length > 6) errors.push(`${tag}: needs 2 to 6 options`);
  const ids = new Set();
  for (const o of options) {
    if (!o.id || ids.has(o.id)) errors.push(`${tag}: option ids must be unique and non-empty`);
    ids.add(o.id);
    if (!o.label?.trim()) errors.push(`${tag}: option "${o.id}" has no label`);
    if (o.assetIndex !== undefined && !inRange(o.assetIndex))
      errors.push(`${tag}: option "${o.id}" assetIndex ${o.assetIndex} has no imageAsset`);
  }
  if (p.interaction === "choice") {
    const correct = options.filter((o) => o.correct).length;
    const need = p.selectCount ?? 1;
    if (correct < need) errors.push(`${tag}: ${need} pick(s) needed but ${correct} option(s) marked correct`);
  }
}

for (let n = 1; n <= TOTAL_BOXES; n++) {
  if (!seenBoxes.has(n)) errors.push(`no puzzle assigned to box ${n}`);
}
for (const t of TYPES) {
  if (!typeCounts[t]) errors.push(`no puzzle uses type "${t}"`);
}
if (puzzles.length !== TOTAL_BOXES) {
  errors.push(
    `expected exactly ${TOTAL_BOXES} puzzles, found ${puzzles.length}`,
  );
}

console.log(`Checked ${puzzles.length} puzzles across ${Object.keys(typeCounts).length} types`);
console.log(
  Object.entries(typeCounts)
    .map(([t, c]) => `  ${t.padEnd(16)} ${c}`)
    .join("\n"),
);

if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("\n✓ All puzzles valid.");
