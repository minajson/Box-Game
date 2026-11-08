/** Regenerates data/nape2026.source.json from the supplied document. */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseNapeSource } from "./parse-nape-source.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const qs = parseNapeSource(join(ROOT, "data", "source", "nape-2026-quiz.txt"));
if (qs.length !== 80) throw new Error(`Expected 80 questions, parsed ${qs.length}`);
qs.forEach((q, i) => { if (q.n !== i + 1) throw new Error(`Question ${i + 1} out of sequence (${q.n})`); });
writeFileSync(join(ROOT, "data", "nape2026.source.json"), JSON.stringify(qs, null, 2) + "\n");
console.log(`Wrote ${qs.length} questions (${qs.filter((q) => q.options.length === 2).length} true/false).`);
