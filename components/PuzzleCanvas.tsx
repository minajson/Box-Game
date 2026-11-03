"use client";

import { motion } from "framer-motion";
import ClickableCanvas from "./ClickableCanvas";
import { EMPTY_RESPONSE } from "@/lib/clickable";
import type { Puzzle, PuzzlePart, PuzzleRow } from "@/lib/types";

/**
 * Renders the visual for any puzzle type, in both its unsolved and revealed
 * states. This is the part of the screen that MUST dominate the projector, so
 * everything here is sized in viewport units with generous clamp() ranges —
 * on a 1920×1080 (or larger) display the clue images fill roughly half the
 * usable width, and there is deliberately no small blank margin around tiny art.
 *
 * Reveal animations, by type:
 *   scramble         letters physically travel from the jumble into the answer
 *   missing-letters  the missing letters drop into their empty slots
 *   picture/emoji    the clues slide together and merge
 *   zoom             the image zooms out to full
 *   odd-one-out      the odd one is highlighted, the rest dim away
 *   rebus / connect  the hidden reading fades into view
 *   myth-fact        the right card turns green and the other dims away
 *   clickable        see ClickableCanvas.tsx — answered by clicking, not aloud
 *
 * Images are only ever read from `puzzle.imageAssets` via `assetIndex` — no
 * component in this file knows a file path.
 */

export interface CanvasProps {
  puzzle: Puzzle;
  revealed: boolean;
  /** zoom puzzles only: 0 = tightest crop, 3 = fully zoomed out. */
  zoomLevel?: number;
}

export default function PuzzleCanvas(props: CanvasProps) {
  switch (props.puzzle.type) {
    case "scramble":
      return <Scramble {...props} />;
    case "missing-letters":
      return <MissingLetters {...props} />;
    case "zoom":
      return <Zoom {...props} />;
    case "odd-one-out":
      return <OddOneOut {...props} />;
    case "connect":
      return <Connect {...props} />;
    case "myth-fact":
      return <MythFact {...props} />;
    case "clickable":
      // Interactive callers render ClickableCanvas themselves, with a response
      // to draw. Here it is the read-only view.
      return (
        <ClickableCanvas
          puzzle={props.puzzle}
          response={EMPTY_RESPONSE}
          phase={props.revealed ? "revealed" : "solving"}
          zoomLevel={props.zoomLevel}
        />
      );
    case "rebus":
    case "picture-word":
    case "picture-combo":
    case "emoji":
      return <Rows {...props} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------- SCRAMBLE

/**
 * Pair every tile in the jumble with the position it belongs to in the answer.
 * Greedy first-match is enough because the validator guarantees the scramble is
 * an exact permutation of the answer.
 */
function solveOrder(scrambled: string, answer: string) {
  const tiles = scrambled
    .toUpperCase()
    .split("")
    .map((ch, i) => ({ id: i, ch }));

  const pool = [...tiles];
  const solved: typeof tiles = [];
  for (const ch of answer.toUpperCase()) {
    const at = pool.findIndex((t) => t.ch === ch);
    if (at === -1) continue; // Should be unreachable — validator catches this.
    solved.push(pool[at]);
    pool.splice(at, 1);
  }
  return { tiles, solved };
}

function Scramble({ puzzle, revealed }: CanvasProps) {
  const { tiles, solved } = solveOrder(puzzle.scrambledValue ?? "", puzzle.answer);
  const order = revealed ? solved : tiles;

  return (
    <div className="flex flex-wrap items-center justify-center gap-[clamp(0.5rem,1.3vw,1.2rem)]">
      {order.map((tile) => (
        <motion.div
          key={tile.id}
          layout
          layoutId={`tile-${puzzle.id}-${tile.id}`}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className={`flex items-center justify-center rounded-2xl border-b-[8px] font-black uppercase shadow-panel transition-colors duration-500 ${
            revealed
              ? "border-ren-green-deep bg-ren-green text-white"
              : "border-ink/15 bg-white text-ink"
          }`}
          style={{
            width: "clamp(3.6rem, 8vw, 11rem)",
            height: "clamp(4.4rem, 10vw, 13.5rem)",
            fontSize: "clamp(2rem, 5.4vw, 7.5rem)",
          }}
        >
          {tile.ch}
        </motion.div>
      ))}
    </div>
  );
}

// --------------------------------------------------------- MISSING LETTERS

function MissingLetters({ puzzle, revealed }: CanvasProps) {
  const slots = (puzzle.maskedValue ?? "").replace(/\s+/g, "").split("");
  const answer = puzzle.answer.replace(/\s+/g, "").toUpperCase().split("");

  return (
    <div className="flex flex-wrap items-center justify-center gap-[clamp(0.35rem,0.9vw,0.9rem)]">
      {slots.map((slot, i) => {
        const blank = slot === "_";
        const letter = blank ? answer[i] : slot.toUpperCase();
        return (
          <div
            key={i}
            className={`relative flex items-center justify-center rounded-2xl border-b-[8px] font-black uppercase shadow-panel ${
              blank
                ? revealed
                  ? "border-ren-green-deep bg-ren-green text-white"
                  : "border-ink/15 border-dashed bg-ink/[0.04] text-transparent"
                : "border-ink/15 bg-white text-ink"
            }`}
            style={{
              width: "clamp(2.9rem, 6.6vw, 9.4rem)",
              height: "clamp(3.8rem, 8.6vw, 11.5rem)",
              fontSize: "clamp(1.7rem, 4.6vw, 6.5rem)",
            }}
          >
            {blank && !revealed ? (
              <span className="text-ink/25">_</span>
            ) : blank ? (
              // The missing letter drops into its slot.
              <motion.span
                initial={{ y: -70, opacity: 0, scale: 0.6 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 320,
                  damping: 18,
                  delay: 0.08 * i,
                }}
              >
                {letter}
              </motion.span>
            ) : (
              letter
            )}
          </div>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------------------- ZOOM

const ZOOM_SCALES = [7, 4.2, 2.4, 1.35];

function Zoom({ puzzle, revealed, zoomLevel = 0 }: CanvasProps) {
  const src = puzzle.imageAssets[0];
  const scale = revealed ? 1 : ZOOM_SCALES[Math.min(zoomLevel, 3)];

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className="relative overflow-hidden rounded-[2.5rem] border-[10px] border-white bg-white shadow-lift"
        style={{
          width: "clamp(18rem, 54vh, 56rem)",
          height: "clamp(18rem, 54vh, 56rem)",
          maxWidth: "80vw",
        }}
      >
        <motion.img
          src={src}
          alt={revealed ? puzzle.answer : "A heavily zoomed-in image"}
          className="h-full w-full object-contain"
          animate={{ scale }}
          transition={{ type: "spring", stiffness: 90, damping: 20 }}
          style={{ transformOrigin: "50% 42%" }}
        />
      </div>

      {/* How far out we are — reads at the back of the room */}
      <div className="flex items-center gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-3 rounded-full transition-all duration-300 ${
              revealed || i <= zoomLevel
                ? "w-12 bg-ren-green"
                : "w-6 bg-ink/15"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ ODD ONE OUT

function OddOneOut({ puzzle, revealed }: CanvasProps) {
  return (
    <div className="grid w-full max-w-[min(1600px,94vw)] grid-cols-2 gap-[clamp(0.7rem,1.8vw,2rem)] lg:grid-cols-4">
      {(puzzle.choices ?? []).map((choice, i) => {
        const isOdd = choice.id === puzzle.oddOneOutId;
        const asset =
          choice.assetIndex !== undefined
            ? puzzle.imageAssets[choice.assetIndex]
            : undefined;

        return (
          <motion.div
            key={choice.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{
              opacity: revealed && !isOdd ? 0.3 : 1,
              y: 0,
              scale: revealed && isOdd ? 1.06 : 1,
            }}
            transition={{ delay: revealed ? 0 : i * 0.08, duration: 0.4 }}
            className={`flex flex-col items-center justify-center gap-4 rounded-[1.75rem] border-4 bg-white p-[clamp(1rem,2.6vw,2.6rem)] text-center shadow-panel transition-colors duration-500 ${
              revealed && isOdd
                ? "border-ren-green shadow-lift ring-8 ring-ren-green/20"
                : "border-ink/8"
            }`}
          >
            {asset ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset}
                alt=""
                className="w-auto object-contain"
                style={{ height: "clamp(4rem, 16vh, 14rem)" }}
              />
            ) : (
              <span
                aria-hidden
                style={{ fontSize: "clamp(3rem, 10vh, 9rem)" }}
              >
                {choice.emoji}
              </span>
            )}
            <span
              className={`font-black uppercase leading-tight tracking-tight ${
                revealed && isOdd ? "text-ren-green-deep" : "text-ink"
              }`}
              style={{ fontSize: "clamp(1rem, 1.9vw, 2rem)" }}
            >
              {choice.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------- CONNECT

function Connect({ puzzle, revealed }: CanvasProps) {
  return (
    <div className="flex flex-col items-center gap-[clamp(1.2rem,3vh,2.5rem)]">
      <div className="flex flex-wrap items-stretch justify-center gap-[clamp(0.7rem,1.8vw,1.8rem)]">
        {(puzzle.clues ?? []).map((clue, i) => (
          <motion.div
            key={clue}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: i * 0.14, type: "spring", stiffness: 220, damping: 20 }}
            className="flex min-w-[clamp(13rem,26vw,24rem)] items-center justify-center rounded-[1.75rem] border-4 border-ink/8 bg-white px-[clamp(1.2rem,2.8vw,2.8rem)] py-[clamp(1.6rem,4.5vh,3.4rem)] text-center shadow-panel"
          >
            <span
              className="font-black uppercase leading-tight tracking-tight text-ink"
              style={{ fontSize: "clamp(1.3rem, 3vw, 3rem)" }}
            >
              {clue}
            </span>
          </motion.div>
        ))}
      </div>

      {/* The link between them fades in on reveal */}
      <motion.div
        className="flex items-center gap-3"
        animate={{ opacity: revealed ? 1 : 0.35 }}
        transition={{ duration: 0.5 }}
      >
        <span className="h-[3px] w-[clamp(3rem,10vw,10rem)] rounded-full bg-ren-green/40" />
        <span
          className="font-black uppercase tracking-[0.2em] text-ren-green-deep"
          style={{ fontSize: "clamp(0.8rem, 1.5vw, 1.35rem)" }}
        >
          {revealed ? "all of them are" : "what connects them?"}
        </span>
        <span className="h-[3px] w-[clamp(3rem,10vw,10rem)] rounded-full bg-ren-green/40" />
      </motion.div>
    </div>
  );
}

// --------------------------------------------------------------- MYTH / FACT

/** Same gradients as the violet and sky boxes, so the cards belong to the wall. */
const MYTH_FACT_CARDS = [
  { label: "MYTH", from: "#c084fc", to: "#7c3aed", rim: "#6d28d9" },
  { label: "FACT", from: "#60b8fb", to: "#2563eb", rim: "#1d4ed8" },
] as const;

/*
 * The min(vw, vh) sizes below keep the statement and explanation filling a very
 * large display without overflowing a short 1366×768 one. Their upper limits sit
 * well above the rest of the canvas because these are the words the room reads.
 */
const STATEMENT_SIZE = "clamp(1.5rem, min(3.5vw, 6.2vh), 7.5rem)";
const CARD_LABEL_SIZE = "clamp(2.2rem, min(5.6vw, 9.5vh), 11rem)";
const EXPLANATION_SIZE = "clamp(1.05rem, min(2.05vw, 3.7vh), 4.5rem)";

function MythFact({ puzzle, revealed }: CanvasProps) {
  const correct = puzzle.answer.trim().toUpperCase();

  return (
    <div className="flex w-full flex-col items-center gap-[clamp(0.75rem,3vh,3.5rem)]">
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
        className="max-w-full text-balance text-center font-black leading-[1.12] tracking-tight text-ink"
        style={{ fontSize: STATEMENT_SIZE }}
      >
        {puzzle.clues?.[0]}
      </motion.p>

      <div className="grid w-[min(100%,70vw)] grid-cols-2 gap-[clamp(0.7rem,2vw,3rem)]">
        {MYTH_FACT_CARDS.map((card, i) => {
          const isCorrect = card.label === correct;
          return (
            <motion.div
              key={card.label}
              data-myth-fact-card={card.label}
              data-correct={revealed && isCorrect ? "true" : undefined}
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{
                opacity: revealed && !isCorrect ? 0.22 : 1,
                y: 0,
                scale: revealed ? (isCorrect ? 1.04 : 0.96) : 1,
              }}
              transition={{
                delay: revealed ? 0 : 0.15 + i * 0.1,
                type: "spring",
                stiffness: 260,
                damping: 18,
              }}
              className={`relative flex items-center justify-center overflow-hidden rounded-[clamp(1rem,2vw,2.5rem)] py-[clamp(0.7rem,3.2vh,3.5rem)] shadow-lift ${
                revealed && isCorrect ? "ring-[clamp(5px,0.7vw,18px)] ring-ren-green/30" : ""
              }`}
              style={{ background: `linear-gradient(160deg, ${card.from} 0%, ${card.to} 100%)` }}
            >
              {/* The green fades in over the card's own colour on the reveal. */}
              <motion.span
                aria-hidden
                className="absolute inset-0"
                style={{ background: "linear-gradient(160deg, #34d399 0%, #059669 100%)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: revealed && isCorrect ? 1 : 0 }}
                transition={{ duration: 0.4 }}
              />
              <span
                className="relative font-black leading-none tracking-tight text-white"
                style={{
                  fontSize: CARD_LABEL_SIZE,
                  textShadow: `0 4px 0 ${revealed && isCorrect ? "#047857" : card.rim}, 0 10px 22px rgb(18 35 59 / 0.35)`,
                }}
              >
                {revealed && isCorrect && <span aria-hidden>✓ </span>}
                {card.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** The Myth or Fact explanation. It takes the place of the usual answer block. */
export function MythFactExplanation({ puzzle }: { puzzle: Puzzle }) {
  return (
    <>
      <p className="sr-only">The answer is {puzzle.answer}.</p>
      <p
        data-myth-fact-explanation
        className="mx-auto max-w-[62ch] text-balance rounded-[clamp(1rem,1.6vw,2rem)] border-2 border-ren-green/30 bg-ren-green-soft px-[clamp(1rem,2vw,3rem)] py-[clamp(0.5rem,1.4vh,1.6rem)] text-center font-bold leading-snug text-ink shadow-panel"
        style={{ fontSize: EXPLANATION_SIZE }}
      >
        {puzzle.insight}
      </p>
    </>
  );
}

// ------------------------------------- ROWS (rebus / picture / emoji types)

function Rows({ puzzle, revealed }: CanvasProps) {
  const rows = puzzle.rows ?? [];
  // On reveal the clues slide together — the "combine" gesture.
  const combining = revealed && puzzle.revealAnimation === "combine";

  return (
    <div className="flex flex-col items-center gap-[clamp(0.7rem,1.8vh,1.6rem)]">
      {rows.map((row, i) =>
        row.divider ? (
          <motion.div
            key={`d-${i}`}
            className="h-[8px] rounded-full bg-ink"
            initial={{ width: 0 }}
            animate={{ width: "clamp(14rem, 34vw, 34rem)" }}
            transition={{ delay: 0.2, duration: 0.5 }}
          />
        ) : (
          <motion.div
            key={`r-${i}`}
            className="flex flex-wrap items-center justify-center"
            animate={{ gap: combining ? "0.2rem" : "clamp(0.8rem, 2.4vw, 2.8rem)" }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
          >
            {(row.parts ?? []).map((part, j) => (
              <Part
                key={j}
                part={part}
                puzzle={puzzle}
                index={j}
                combining={combining}
                revealed={revealed}
              />
            ))}
          </motion.div>
        ),
      )}
    </div>
  );
}

/**
 * Text sizing for word fragments inside a rebus / picture-word puzzle. Emoji
 * clues are sized separately (much larger — see EMOJI_SIZES) so that a "BRIDGE"
 * and a "BUILDING" picture read from the back of the hall.
 */
const TEXT_SIZES: Record<NonNullable<PuzzlePart["size"]>, string> = {
  sm: "clamp(1.3rem, 2.8vw, 3.2rem)",
  md: "clamp(1.9rem, 4vw, 4.6rem)",
  lg: "clamp(2.6rem, 5.2vw, 6.2rem)",
  xl: "clamp(3.2rem, 7vw, 9rem)",
};

/** Emoji / picture clues are the focus of the screen, so they run large. */
const EMOJI_SIZES: Record<NonNullable<PuzzlePart["size"]>, string> = {
  sm: "clamp(2.4rem, 6vw, 6rem)",
  md: "clamp(3.6rem, 9vw, 10rem)",
  lg: "clamp(5rem, 13vw, 15rem)",
  xl: "clamp(6.5rem, 17vw, 20rem)",
};

/** The "+" between two clues — deliberately big and balanced. */
const PLUS_SIZE = "clamp(2.75rem, 5vw, 5.6rem)";

function Part({
  part,
  puzzle,
  index,
  combining,
  revealed,
}: {
  part: PuzzlePart;
  puzzle: Puzzle;
  index: number;
  combining: boolean;
  revealed: boolean;
}) {
  const size = part.size ?? "lg";
  const isEmoji = Boolean(part.emoji) && !part.text;
  const isConnector = part.muted && part.text === "+";
  const asset =
    part.assetIndex !== undefined ? puzzle.imageAssets[part.assetIndex] : undefined;

  const fontSize = isConnector
    ? PLUS_SIZE
    : isEmoji || asset
      ? EMOJI_SIZES[size]
      : TEXT_SIZES[size];

  // An empty outlined box — the literal "box" in THINK OUTSIDE THE BOX.
  if (part.boxed) {
    return (
      <motion.span
        className="inline-block rounded-2xl border-[7px] border-dashed border-ink/40"
        style={{
          width: "clamp(6rem, 13vw, 13rem)",
          height: "clamp(4.6rem, 10vw, 10rem)",
        }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 * index, type: "spring", stiffness: 220 }}
      />
    );
  }

  return (
    <motion.span
      className="inline-flex flex-col items-center"
      initial={{ opacity: 0, y: 18, scale: 0.9 }}
      animate={{
        opacity: part.muted ? (combining ? 0 : 0.4) : 1,
        y: 0,
        scale: 1,
        width: combining && part.muted ? 0 : "auto",
      }}
      transition={{ delay: 0.12 * index, type: "spring", stiffness: 240, damping: 20 }}
    >
      <span
        className={`inline-flex items-center justify-center font-black uppercase leading-none tracking-tight text-ink ${
          part.strike ? "relative" : ""
        }`}
        style={{
          fontSize,
          transform: [
            part.flip ? "scaleX(-1)" : "",
            part.rotate ? `rotate(${part.rotate}deg)` : "",
          ]
            .filter(Boolean)
            .join(" "),
        }}
      >
        {asset ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset}
            alt={revealed ? (part.caption ?? "") : "Picture clue"}
            className="object-contain"
            style={{
              width: "clamp(180px, 18vw, 520px)",
              height: "clamp(180px, 30vh, 560px)",
              maxWidth: "40vw",
            }}
          />
        ) : (
          <>
            {part.emoji && (
              <span aria-hidden className="not-italic leading-none">
                {part.emoji}
              </span>
            )}
            {part.text}
          </>
        )}

        {part.strike && (
          <motion.span
            aria-hidden
            className="absolute left-[-8%] top-1/2 rounded-full"
            style={{ height: "clamp(6px, 0.7vw, 11px)", background: "#e0362c" }}
            initial={{ width: 0 }}
            animate={{ width: "116%" }}
            transition={{ delay: 0.4, duration: 0.35 }}
          />
        )}
      </span>

      {/* The caption names what the picture stands for — i.e. a piece of the
          answer — so it must stay hidden until the facilitator reveals. */}
      {part.caption && revealed && (
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * index }}
          className="mt-2 font-black uppercase tracking-[0.14em] text-ink-soft"
          style={{ fontSize: "clamp(18px, 1.5vw, 38px)" }}
        >
          {part.caption}
        </motion.span>
      )}
    </motion.span>
  );
}

export type { PuzzleRow };
