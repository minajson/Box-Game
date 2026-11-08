/**
 * Parses data/source/nape-2026-quiz.txt (the supplied, authoritative document)
 * into the exact structure the game imports. Shared by the generator and the
 * validator so there is one definition of "what the document says".
 *
 * Cross-checks as it goes: every question has exactly one ✓ option (or one per
 * answer key row), and the ✓ option matches the host answer key.
 */
import { readFileSync } from "node:fs";

export function parseNapeSource(path) {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const keyAt = text.indexOf("Answer Key (hosts only)");
  if (keyAt < 0) throw new Error("No answer key found");
  const qLines = text.slice(0, keyAt).split("\n");
  const kLines = text.slice(keyAt).split("\n");

  const questions = [];
  let set = 0;
  let cur = null;
  for (const raw of qLines) {
    const line = raw.replace(/\s+$/, "");
    const setM = line.match(/^Set (\d)$/);
    if (setM) { set = Number(setM[1]); continue; }
    const qM = line.match(/^(\d{1,2})\.\s+(.+)$/);
    if (qM && set) {
      cur = { n: Number(qM[1]), set, prompt: qM[2].trim(), options: [] };
      questions.push(cur);
      continue;
    }
    const oM = line.match(/^(✓\s+)?([A-D])\)\s+(.+)$/);
    if (oM && cur) {
      cur.options.push({ letter: oM[2], label: oM[3].trim(), correct: Boolean(oM[1]) });
    }
  }

  // Answer key: tokens are  <n>  <"X) answer">  <fun fact>, grouped by set.
  const skip = new Set(["#", "Answer", "Fun fact"]);
  const tokens = kLines.map((l) => l.trim()).filter((l) => l && !skip.has(l) && !/^Set \d$/.test(l) && !l.startsWith("Answer Key"));
  const key = new Map();
  for (let i = 0; i < tokens.length; ) {
    if (!/^\d{1,2}$/.test(tokens[i])) throw new Error(`Answer key: expected a number at token ${i}: ${tokens[i]}`);
    key.set(Number(tokens[i]), { answer: tokens[i + 1], funFact: tokens[i + 2] });
    i += 3;
  }

  for (const q of questions) {
    const k = key.get(q.n);
    if (!k) throw new Error(`Q${q.n}: missing from answer key`);
    const ticked = q.options.filter((o) => o.correct);
    if (ticked.length !== 1) throw new Error(`Q${q.n}: ${ticked.length} ticked options`);
    const expected = `${ticked[0].letter}) ${ticked[0].label}`;
    if (k.answer !== expected) throw new Error(`Q${q.n}: tick says "${expected}" but key says "${k.answer}"`);
    q.answerLabel = ticked[0].label;
    q.funFact = k.funFact;
  }
  return questions;
}
