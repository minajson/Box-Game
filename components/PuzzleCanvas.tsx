"use client";

import { motion } from "framer-motion";
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
            width: "clamp(3.6rem, 8vw, 8.5rem)",
            height: "clamp(4.4rem, 10vw, 10.5rem)",
            fontSize: "clamp(2rem, 5.4vw, 6rem)",
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
              width: "clamp(2.9rem, 6.6vw, 7.2rem)",
              height: "clamp(3.8rem, 8.6vw, 9rem)",
              fontSize: "clamp(1.7rem, 4.6vw, 5rem)",
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
          width: "clamp(18rem, 54vh, 46rem)",
          height: "clamp(18rem, 54vh, 46rem)",
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
                style={{ height: "clamp(4rem, 12vh, 9rem)" }}
              />
            ) : (
              <span
                aria-hidden
                style={{ fontSize: "clamp(3rem, 7vh, 6rem)" }}
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
  sm: "clamp(1.3rem, 2.8vw, 2.6rem)",
  md: "clamp(1.9rem, 4vw, 3.8rem)",
  lg: "clamp(2.6rem, 5.2vw, 5rem)",
  xl: "clamp(3.2rem, 7vw, 7.5rem)",
};

/** Emoji / picture clues are the focus of the screen, so they run large. */
const EMOJI_SIZES: Record<NonNullable<PuzzlePart["size"]>, string> = {
  sm: "clamp(2.4rem, 6vw, 5rem)",
  md: "clamp(3.6rem, 9vw, 8rem)",
  lg: "clamp(5rem, 13vw, 12rem)",
  xl: "clamp(6.5rem, 17vw, 16rem)",
};

/** The "+" between two clues — deliberately big and balanced. */
const PLUS_SIZE = "clamp(2.75rem, 5vw, 5.6rem)";

function Part({
  part,
  puzzle,
  index,
  combining,
}: {
  part: PuzzlePart;
  puzzle: Puzzle;
  index: number;
  combining: boolean;
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
            alt={part.caption ?? ""}
            className="object-contain"
            style={{
              width: "clamp(180px, 18vw, 360px)",
              height: "clamp(180px, 30vh, 380px)",
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

      {part.caption && (
        <span
          className="mt-2 font-black uppercase tracking-[0.14em] text-ink-soft"
          style={{ fontSize: "clamp(18px, 1.5vw, 30px)" }}
        >
          {part.caption}
        </span>
      )}
    </motion.span>
  );
}

export type { PuzzleRow };
