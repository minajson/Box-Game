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

const TOTAL_BOXES = 50;

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
];

const errors = [];
const letters = (s) => s.toUpperCase().replace(/[^A-Z]/g, "").split("").sort().join("");

const seenBoxes = new Set();
const seenIds = new Set();
const seenAnswers = new Map();
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
  // revealing the same word twice deflates the room.
  const key = p.answer?.trim().toUpperCase();
  if (key) {
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
